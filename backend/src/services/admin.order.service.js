import mongoose from "mongoose";
import Deal from "../models/deal.model.js";
import Conversation from "../models/conversation.model.js";
import User from "../models/User.model.js";
import Product from "../models/Product.model.js";
import Campus from "../models/Campus.model.js";
import { DEAL_STATUS } from "../config/constants.js";
import { buildPagination, escapeRegex, toPositiveInt } from "../utils/adminQuery.js";
import { logAdminAction } from "./auditLog.service.js";

const { ObjectId } = mongoose.Types;

const formatOrderId = (dealId) => {
  const str = String(dealId || "");
  const suffix = str.length >= 6 ? str.slice(-6).toUpperCase() : str.toUpperCase();
  return `#ORD${suffix}`;
};

const mapDealStatusToOrderStage = (status) => {
  switch (status) {
    case DEAL_STATUS.NEGOTIATING:
    case DEAL_STATUS.OFFER_ACCEPTED:
      return "pending";
    case DEAL_STATUS.DEAL_CONFIRMED:
      return "processing";
    case DEAL_STATUS.PICKUP_SCHEDULED:
      return "scheduled";
    case DEAL_STATUS.PAYMENT_CONFIRMED:
      return "processing";
    case DEAL_STATUS.COMPLETED:
      return "delivered";
    case DEAL_STATUS.CANCELLED:
      return "cancelled";
    default:
      return "pending";
  }
};

export const getAdminOrderStats = async () => {
  const now = new Date();
  const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfPreviousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const [
    totalOrders,
    pendingOrders,
    processingOrders,
    scheduledOrders,
    deliveredOrders,
    cancelledOrders,
    ordersThisMonth,
    ordersPrevMonth,
  ] = await Promise.all([
    Deal.countDocuments({}),
    Deal.countDocuments({
      status: { $in: [DEAL_STATUS.NEGOTIATING, DEAL_STATUS.OFFER_ACCEPTED] },
    }),
    Deal.countDocuments({
      status: { $in: [DEAL_STATUS.DEAL_CONFIRMED, DEAL_STATUS.PAYMENT_CONFIRMED] },
    }),
    Deal.countDocuments({
      status: DEAL_STATUS.PICKUP_SCHEDULED,
    }),
    Deal.countDocuments({
      status: DEAL_STATUS.COMPLETED,
    }),
    Deal.countDocuments({
      status: DEAL_STATUS.CANCELLED,
    }),
    Deal.countDocuments({ createdAt: { $gte: startOfCurrentMonth } }),
    Deal.countDocuments({
      createdAt: { $gte: startOfPreviousMonth, $lt: startOfCurrentMonth },
    }),
  ]);

  const ordersGrowth =
    ordersPrevMonth > 0
      ? Number((((ordersThisMonth - ordersPrevMonth) / ordersPrevMonth) * 100).toFixed(1))
      : ordersThisMonth > 0
      ? 100
      : 0;

  return {
    totalOrders,
    totalGrowth: ordersGrowth,
    pendingOrders,
    processingOrders,
    scheduledOrders,
    deliveredOrders,
    cancelledOrders,
  };
};

export const getAdminOrders = async (query = {}) => {
  const page = toPositiveInt(query.page, 1);
  const limit = toPositiveInt(query.limit, 10, 50);

  // Fetch all campuses to map campus_id -> campus name
  const allCampuses = await Campus.find({}).select("name is_active").lean();
  const campusMap = new Map(allCampuses.map((c) => [c._id.toString(), c.name]));

  // Build match for Deal status filter
  let dealFilter = {};
  if (query.status && query.status !== "all") {
    const s = query.status.toLowerCase();
    if (s === "pending") {
      dealFilter.status = { $in: [DEAL_STATUS.NEGOTIATING, DEAL_STATUS.OFFER_ACCEPTED] };
    } else if (s === "processing") {
      dealFilter.status = { $in: [DEAL_STATUS.DEAL_CONFIRMED, DEAL_STATUS.PAYMENT_CONFIRMED] };
    } else if (s === "scheduled" || s === "shipped") {
      dealFilter.status = DEAL_STATUS.PICKUP_SCHEDULED;
    } else if (s === "delivered" || s === "completed") {
      dealFilter.status = DEAL_STATUS.COMPLETED;
    } else if (s === "cancelled") {
      dealFilter.status = DEAL_STATUS.CANCELLED;
    }
  }

  if (query.payment && query.payment !== "all") {
    const p = query.payment.toLowerCase();
    if (p === "paid") {
      dealFilter["payment_confirmed.is_confirmed"] = true;
    } else if (p === "pending" || p === "unpaid") {
      dealFilter["payment_confirmed.is_confirmed"] = false;
    }
  }

  // Populate conversation and its buyer, seller, and product
  let deals = await Deal.find(dealFilter)
    .populate({
      path: "conversation_id",
      populate: [
        { path: "buyer_id", select: "name email avatar mobile campus_id role status" },
        { path: "seller_id", select: "name email avatar mobile campus_id role status" },
        { path: "product_id", select: "title images selling_price category status pickup_address_snapshot" },
      ],
    })
    .sort({ createdAt: -1 })
    .lean();

  // Search filter & campus filter
  const searchText = (query.search || "").trim().toLowerCase();
  const campusFilter = (query.campus || "all").trim();

  if (searchText || (campusFilter && campusFilter !== "all" && campusFilter !== "Campus (All)")) {
    deals = deals.filter((d) => {
      const conv = d.conversation_id || {};
      const buyer = conv.buyer_id || {};
      const seller = conv.seller_id || {};
      const product = conv.product_id || conv.product_snapshot || {};
      const orderId = formatOrderId(d._id).toLowerCase();

      const buyerCampusId = buyer.campus_id ? buyer.campus_id.toString() : "";
      const sellerCampusId = seller.campus_id ? seller.campus_id.toString() : "";
      const campusName = campusMap.get(buyerCampusId) || campusMap.get(sellerCampusId) || "VIT Vellore";

      if (campusFilter && campusFilter !== "all" && campusFilter !== "Campus (All)") {
        if (!campusName.toLowerCase().includes(campusFilter.toLowerCase())) {
          return false;
        }
      }

      if (searchText) {
        const matchesId = orderId.includes(searchText) || d._id.toString().toLowerCase().includes(searchText);
        const matchesBuyer = (buyer.name || "").toLowerCase().includes(searchText) || (buyer.email || "").toLowerCase().includes(searchText);
        const matchesSeller = (seller.name || "").toLowerCase().includes(searchText) || (seller.email || "").toLowerCase().includes(searchText);
        const matchesProduct = (product.title || "").toLowerCase().includes(searchText);
        return matchesId || matchesBuyer || matchesSeller || matchesProduct;
      }

      return true;
    });
  }

  const total = deals.length;
  const skip = (page - 1) * limit;
  const pagedDeals = deals.slice(skip, skip + limit);

  const data = pagedDeals.map((d) => {
    const conv = d.conversation_id || {};
    const buyer = conv.buyer_id || {};
    const seller = conv.seller_id || {};
    const product = conv.product_id || {};
    const productSnapshot = conv.product_snapshot || {};

    const buyerCampusId = buyer.campus_id ? buyer.campus_id.toString() : "";
    const sellerCampusId = seller.campus_id ? seller.campus_id.toString() : "";
    const campusName = campusMap.get(buyerCampusId) || campusMap.get(sellerCampusId) || "Campus";

    const isPaid = Boolean(d.payment_confirmed?.is_confirmed);
    const orderStage = mapDealStatusToOrderStage(d.status);

    const productTitle = product.title || productSnapshot.title || "Product";
    const productImages = product.images && product.images.length > 0
      ? product.images.map((img) => (typeof img === "string" ? img : img.url))
      : productSnapshot.image
      ? [productSnapshot.image]
      : [];

    const pickupLoc = d.pickup?.location || product.pickup_address_snapshot || {};
    const deliveryAddress = [pickupLoc.address_line, pickupLoc.city, campusName]
      .filter(Boolean)
      .join(", ") || null;

    return {
      id: d._id.toString(),
      orderId: formatOrderId(d._id),
      buyer: {
        id: buyer._id ? buyer._id.toString() : null,
        name: buyer.name || "Student Buyer",
        email: buyer.email || null,
        avatar: buyer.avatar?.url || (typeof buyer.avatar === "string" ? buyer.avatar : null),
        phone: buyer.mobile || null,
        campus: campusName,
      },
      seller: {
        id: seller._id ? seller._id.toString() : null,
        name: seller.name || "Student Seller",
        email: seller.email || null,
        avatar: seller.avatar?.url || (typeof seller.avatar === "string" ? seller.avatar : null),
        phone: seller.mobile || null,
      },
      product: {
        id: product._id ? product._id.toString() : null,
        title: productTitle,
        category: product.category || "General",
        images: productImages,
        price: d.current_price || product.selling_price || productSnapshot.selling_price || 0,
        quantity: 1,
      },
      campus: campusName,
      amount: d.current_price || d.original_price || 0,
      originalAmount: d.original_price || d.current_price || 0,
      payment: {
        status: isPaid ? "Paid" : d.status === DEAL_STATUS.CANCELLED ? "Refunded" : "Pending",
        method: null,
        txnId: null,
      },
      status: orderStage,
      rawStatus: d.status,
      deliveryAddress,
      pickup: d.pickup || null,
      timeline: [
        { label: "Order Placed", date: d.createdAt, completed: true },
        { label: "Deal Confirmed", date: d.deal_confirmed_at, completed: Boolean(d.deal_confirmed_at || [DEAL_STATUS.DEAL_CONFIRMED, DEAL_STATUS.PICKUP_SCHEDULED, DEAL_STATUS.PAYMENT_CONFIRMED, DEAL_STATUS.COMPLETED].includes(d.status)) },
        { label: "Pickup Scheduled", date: d.pickup?.scheduled_at || d.pickup?.scheduled_date, completed: Boolean(d.pickup?.scheduled_date || [DEAL_STATUS.PICKUP_SCHEDULED, DEAL_STATUS.PAYMENT_CONFIRMED, DEAL_STATUS.COMPLETED].includes(d.status)) },
        { label: "Payment Confirmed", date: d.payment_confirmed?.confirmed_at, completed: isPaid || d.status === DEAL_STATUS.COMPLETED },
        { label: "Delivered", date: d.completed_at, completed: d.status === DEAL_STATUS.COMPLETED },
      ],
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
      completedAt: d.completed_at,
      cancelledAt: d.cancelled_at,
      cancellationReason: d.cancellation_reason,
    };
  });

  return {
    data,
    pagination: buildPagination(total, page, limit),
  };
};

export const getAdminOrderById = async (dealId) => {
  if (!ObjectId.isValid(dealId)) {
    throw new Error("Invalid order ID");
  }

  const allCampuses = await Campus.find({}).select("name").lean();
  const campusMap = new Map(allCampuses.map((c) => [c._id.toString(), c.name]));

  const d = await Deal.findById(dealId)
    .populate({
      path: "conversation_id",
      populate: [
        { path: "buyer_id", select: "name email avatar mobile campus_id role status" },
        { path: "seller_id", select: "name email avatar mobile campus_id role status" },
        { path: "product_id", select: "title images selling_price category status pickup_address_snapshot" },
      ],
    })
    .lean();

  if (!d) {
    throw new Error("Order not found");
  }

  const conv = d.conversation_id || {};
  const buyer = conv.buyer_id || {};
  const seller = conv.seller_id || {};
  const product = conv.product_id || {};
  const productSnapshot = conv.product_snapshot || {};

  const buyerCampusId = buyer.campus_id ? buyer.campus_id.toString() : "";
  const sellerCampusId = seller.campus_id ? seller.campus_id.toString() : "";
  const campusName = campusMap.get(buyerCampusId) || campusMap.get(sellerCampusId) || "Campus";

  const isPaid = Boolean(d.payment_confirmed?.is_confirmed);
  const orderStage = mapDealStatusToOrderStage(d.status);

  const productTitle = product.title || productSnapshot.title || "Product";
  const productImages = product.images && product.images.length > 0
    ? product.images.map((img) => (typeof img === "string" ? img : img.url))
    : productSnapshot.image
    ? [productSnapshot.image]
    : [];

  const pickupLoc = d.pickup?.location || product.pickup_address_snapshot || {};
  const deliveryAddress = [pickupLoc.address_line, pickupLoc.city, campusName]
    .filter(Boolean)
    .join(", ") || null;

  return {
    id: d._id.toString(),
    orderId: formatOrderId(d._id),
    buyer: {
      id: buyer._id ? buyer._id.toString() : null,
      name: buyer.name || "Student Buyer",
      email: buyer.email || null,
      avatar: buyer.avatar?.url || (typeof buyer.avatar === "string" ? buyer.avatar : null),
      phone: buyer.mobile || null,
      campus: campusName,
    },
    seller: {
      id: seller._id ? seller._id.toString() : null,
      name: seller.name || "Student Seller",
      email: seller.email || null,
      avatar: seller.avatar?.url || (typeof seller.avatar === "string" ? seller.avatar : null),
      phone: seller.mobile || null,
    },
    product: {
      id: product._id ? product._id.toString() : null,
      title: productTitle,
      category: product.category || "General",
      images: productImages,
      price: d.current_price || product.selling_price || productSnapshot.selling_price || 0,
      quantity: 1,
    },
    campus: campusName,
    amount: d.current_price || d.original_price || 0,
    originalAmount: d.original_price || d.current_price || 0,
    payment: {
      status: isPaid ? "Paid" : d.status === DEAL_STATUS.CANCELLED ? "Refunded" : "Pending",
      method: null,
      txnId: null,
    },
    status: orderStage,
    rawStatus: d.status,
    deliveryAddress,
    pickup: d.pickup || null,
    timeline: [
      { label: "Order Placed", date: d.createdAt, completed: true },
      { label: "Deal Confirmed", date: d.deal_confirmed_at, completed: Boolean(d.deal_confirmed_at || [DEAL_STATUS.DEAL_CONFIRMED, DEAL_STATUS.PICKUP_SCHEDULED, DEAL_STATUS.PAYMENT_CONFIRMED, DEAL_STATUS.COMPLETED].includes(d.status)) },
      { label: "Pickup Scheduled", date: d.pickup?.scheduled_at || d.pickup?.scheduled_date, completed: Boolean(d.pickup?.scheduled_date || [DEAL_STATUS.PICKUP_SCHEDULED, DEAL_STATUS.PAYMENT_CONFIRMED, DEAL_STATUS.COMPLETED].includes(d.status)) },
      { label: "Payment Confirmed", date: d.payment_confirmed?.confirmed_at, completed: isPaid || d.status === DEAL_STATUS.COMPLETED },
      { label: "Delivered", date: d.completed_at, completed: d.status === DEAL_STATUS.COMPLETED },
    ],
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
    completedAt: d.completed_at,
    cancelledAt: d.cancelled_at,
    cancellationReason: d.cancellation_reason,
  };
};

export const updateAdminOrderStatus = async (dealId, nextStatus, reason = "", adminUser = null) => {
  if (!ObjectId.isValid(dealId)) {
    throw new Error("Invalid order ID");
  }

  const validStatuses = [
    DEAL_STATUS.NEGOTIATING,
    DEAL_STATUS.DEAL_CONFIRMED,
    DEAL_STATUS.PICKUP_SCHEDULED,
    DEAL_STATUS.PAYMENT_CONFIRMED,
    DEAL_STATUS.COMPLETED,
    DEAL_STATUS.CANCELLED,
  ];

  let targetStatus = nextStatus;
  if (nextStatus === "delivered" || nextStatus === "completed") {
    targetStatus = DEAL_STATUS.COMPLETED;
  } else if (nextStatus === "cancelled") {
    targetStatus = DEAL_STATUS.CANCELLED;
  } else if (nextStatus === "processing" || nextStatus === "confirmed") {
    targetStatus = DEAL_STATUS.DEAL_CONFIRMED;
  } else if (nextStatus === "scheduled") {
    targetStatus = DEAL_STATUS.PICKUP_SCHEDULED;
  }

  if (!validStatuses.includes(targetStatus)) {
    throw new Error("Invalid order status transition");
  }

  const updateFields = {
    status: targetStatus,
  };

  if (targetStatus === DEAL_STATUS.COMPLETED) {
    updateFields.completed_at = new Date();
    updateFields["item_received.is_confirmed"] = true;
    updateFields["item_received.confirmed_at"] = new Date();
    updateFields["payment_confirmed.is_confirmed"] = true;
    updateFields["payment_confirmed.confirmed_at"] = new Date();
  } else if (targetStatus === DEAL_STATUS.CANCELLED) {
    updateFields.cancelled_at = new Date();
    updateFields.cancellation_reason = reason || "Cancelled by admin moderator";
  } else if (targetStatus === DEAL_STATUS.DEAL_CONFIRMED) {
    updateFields.deal_confirmed_at = new Date();
  }

  const updatedDeal = await Deal.findByIdAndUpdate(dealId, updateFields, { new: true }).lean();
  if (!updatedDeal) {
    throw new Error("Order not found");
  }

  try {
    await logAdminAction({
      actor: adminUser,
      action: "order.status_update",
      targetType: "order",
      targetId: new ObjectId(dealId),
      metadata: { newStatus: targetStatus, reason },
    });
  } catch {
    // Non-blocking audit log
  }

  return getAdminOrderById(dealId);
};
