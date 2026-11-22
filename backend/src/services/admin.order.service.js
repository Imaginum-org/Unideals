import mongoose from "mongoose";
import Deal from "../models/deal.model.js";
import Conversation from "../models/conversation.model.js";
import User from "../models/User.model.js";
import Product from "../models/Product.model.js";
import Campus from "../models/Campus.model.js";
import { DEAL_STATUS } from "../config/constants.js";
import { buildPagination, escapeRegex, toPositiveInt } from "../utils/adminQuery.js";
import { logAdminAction } from "./auditLog.service.js";
import { campusIn, countScoped, dealScopeStages } from "./campusScope.service.js";

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

export const getAdminOrderStats = async (scope = null) => {
  const stages = dealScopeStages(scope);
  const count = (match) => countScoped(Deal, match, stages);
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
    count({}),
    count({
      status: { $in: [DEAL_STATUS.NEGOTIATING, DEAL_STATUS.OFFER_ACCEPTED] },
    }),
    count({
      status: { $in: [DEAL_STATUS.DEAL_CONFIRMED, DEAL_STATUS.PAYMENT_CONFIRMED] },
    }),
    count({
      status: DEAL_STATUS.PICKUP_SCHEDULED,
    }),
    count({
      status: DEAL_STATUS.COMPLETED,
    }),
    count({
      status: DEAL_STATUS.CANCELLED,
    }),
    count({ createdAt: { $gte: startOfCurrentMonth } }),
    // Same number of days into last month, so early-month numbers compare fairly.
    count({
      createdAt: {
        $gte: startOfPreviousMonth,
        $lt: new Date(Math.min(startOfPreviousMonth.getTime() + (now.getTime() - startOfCurrentMonth.getTime()), startOfCurrentMonth.getTime())),
      },
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

const ORDER_POPULATE = {
  path: "conversation_id",
  populate: [
    { path: "buyer_id", select: "name email avatar mobile campus_id role status" },
    { path: "seller_id", select: "name email avatar mobile campus_id role status" },
    { path: "product_id", select: "title images selling_price category status pickup_address_snapshot" },
  ],
};

const IN_PROGRESS = [DEAL_STATUS.DEAL_CONFIRMED, DEAL_STATUS.PICKUP_SCHEDULED, DEAL_STATUS.PAYMENT_CONFIRMED, DEAL_STATUS.COMPLETED];
const SCHEDULED_OR_LATER = [DEAL_STATUS.PICKUP_SCHEDULED, DEAL_STATUS.PAYMENT_CONFIRMED, DEAL_STATUS.COMPLETED];

// Campus names for the buyers/sellers of these deals only (not the whole directory).
const campusNamesFor = async (deals) => {
  const ids = new Set();
  for (const d of deals) {
    const conv = d.conversation_id || {};
    for (const id of [conv.buyer_id?.campus_id, conv.seller_id?.campus_id]) {
      if (id && ObjectId.isValid(String(id))) ids.add(String(id));
    }
  }
  if (!ids.size) return new Map();
  const rows = await Campus.find({ _id: { $in: [...ids] } }).select("name").lean();
  return new Map(rows.map((c) => [c._id.toString(), c.name]));
};

// One populated deal -> the admin order row (list and detail share it).
const toOrderRow = (d, campusMap) => {
  const conv = d.conversation_id || {};
  const buyer = conv.buyer_id || {};
  const seller = conv.seller_id || {};
  const product = conv.product_id || {};
  const productSnapshot = conv.product_snapshot || {};

  const buyerCampusId = buyer.campus_id ? buyer.campus_id.toString() : "";
  const sellerCampusId = seller.campus_id ? seller.campus_id.toString() : "";
  const campusName = campusMap.get(buyerCampusId) || campusMap.get(sellerCampusId) || null;

  const isPaid = Boolean(d.payment_confirmed?.is_confirmed);
  const productTitle = product.title || productSnapshot.title || "Product";
  const productImages = product.images && product.images.length > 0
    ? product.images.map((img) => (typeof img === "string" ? img : img.url))
    : productSnapshot.image
    ? [productSnapshot.image]
    : [];

  const pickupLoc = d.pickup?.location || product.pickup_address_snapshot || {};
  const deliveryAddress = [pickupLoc.address_line, pickupLoc.city, campusName].filter(Boolean).join(", ") || null;
  const avatarOf = (u) => u.avatar?.url || (typeof u.avatar === "string" ? u.avatar : null);

  return {
    id: d._id.toString(),
    orderId: formatOrderId(d._id),
    buyer: {
      id: buyer._id ? buyer._id.toString() : null,
      name: buyer.name || "Student Buyer",
      email: buyer.email || null,
      avatar: avatarOf(buyer),
      phone: buyer.mobile || null,
      campus: campusName,
    },
    seller: {
      id: seller._id ? seller._id.toString() : null,
      name: seller.name || "Student Seller",
      email: seller.email || null,
      avatar: avatarOf(seller),
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
    payment: { status: isPaid ? "Paid" : "Unpaid", method: null, txnId: null },
    status: mapDealStatusToOrderStage(d.status),
    rawStatus: d.status,
    deliveryAddress,
    pickup: d.pickup || null,
    timeline: [
      { label: "Deal started", date: d.createdAt, completed: true },
      { label: "Deal Confirmed", date: d.deal_confirmed_at, completed: Boolean(d.deal_confirmed_at || IN_PROGRESS.includes(d.status)) },
      { label: "Pickup Scheduled", date: d.pickup?.scheduled_at || d.pickup?.scheduled_date, completed: Boolean(d.pickup?.scheduled_date || SCHEDULED_OR_LATER.includes(d.status)) },
      { label: "Payment Confirmed", date: d.payment_confirmed?.confirmed_at, completed: isPaid || d.status === DEAL_STATUS.COMPLETED },
      { label: "Completed", date: d.completed_at, completed: d.status === DEAL_STATUS.COMPLETED },
    ],
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
    completedAt: d.completed_at,
    cancelledAt: d.cancelled_at,
    cancellationReason: d.cancellation_reason,
  };
};

const STATUS_FILTERS = {
  pending: { $in: [DEAL_STATUS.NEGOTIATING, DEAL_STATUS.OFFER_ACCEPTED] },
  processing: { $in: [DEAL_STATUS.DEAL_CONFIRMED, DEAL_STATUS.PAYMENT_CONFIRMED] },
  scheduled: DEAL_STATUS.PICKUP_SCHEDULED,
  shipped: DEAL_STATUS.PICKUP_SCHEDULED,
  delivered: DEAL_STATUS.COMPLETED,
  completed: DEAL_STATUS.COMPLETED,
  cancelled: DEAL_STATUS.CANCELLED,
};

const ALL_CAMPUSES = new Set(["", "all", "Campus (All)"]);

// Name/email/title search matches at most this many people and listings.
const MAX_SEARCH_MATCHES = 500;

// Conversations (= deals) whose buyer or seller is on one of these campuses,
// the same rule as campusScope.dealScopeStages, via indexed reads.
const conversationsOnCampuses = async (campusIds) => {
  const people = await User.find({ campus_id: campusIn(campusIds) }).select("_id").lean();
  if (!people.length) return [];
  const ids = people.map((u) => u._id);
  const convs = await Conversation.find({ $or: [{ buyer_id: { $in: ids } }, { seller_id: { $in: ids } }] })
    .select("_id")
    .lean();
  return convs.map((c) => c._id);
};

/**
 * Orders list. Filtering, search and pagination all run in MongoDB; only the
 * requested page is loaded and populated. Filters that live on other
 * collections (campus, names, titles) are turned into conversation ids first.
 */
export const getAdminOrders = async (query = {}, scope = null) => {
  const page = toPositiveInt(query.page, 1);
  const limit = toPositiveInt(query.limit, 10, 50);
  const skip = (page - 1) * limit;

  const dealFilter = {};
  const statusKey = typeof query.status === "string" ? query.status.toLowerCase() : "";
  if (STATUS_FILTERS[statusKey]) dealFilter.status = STATUS_FILTERS[statusKey];

  const paymentKey = typeof query.payment === "string" ? query.payment.toLowerCase() : "";
  if (paymentKey === "paid") dealFilter["payment_confirmed.is_confirmed"] = true;
  else if (paymentKey === "pending" || paymentKey === "unpaid") dealFilter["payment_confirmed.is_confirmed"] = { $ne: true };

  const searchText = typeof query.search === "string" ? query.search.trim().slice(0, 100) : "";
  const campusFilter = typeof query.campus === "string" ? query.campus.trim() : "";

  // Campus filter: a campus id (preferred) or a name fragment.
  let filterCampusIds = null;
  if (!ALL_CAMPUSES.has(campusFilter)) {
    if (ObjectId.isValid(campusFilter)) {
      filterCampusIds = [new ObjectId(campusFilter)];
    } else {
      const rows = await Campus.find({ name: { $regex: escapeRegex(campusFilter), $options: "i" } })
        .select("_id")
        .limit(200)
        .lean();
      filterCampusIds = rows.map((c) => c._id);
    }
    if (!filterCampusIds.length) return { data: [], pagination: buildPagination(0, page, limit) };
  }

  // Campus limit / campus filter / search are resolved to conversation ids
  // through indexed lookups (users by campus or name, listings by title,
  // conversations by buyer/seller/listing), then the deals themselves are a
  // plain indexed sort + skip/limit. No per-deal joins.
  const conditions = [dealFilter];
  if (scope) conditions.push({ conversation_id: { $in: await conversationsOnCampuses(scope) } });
  if (filterCampusIds) conditions.push({ conversation_id: { $in: await conversationsOnCampuses(filterCampusIds) } });
  if (searchText) {
    const rx = { $regex: escapeRegex(searchText), $options: "i" };
    const [people, listings] = await Promise.all([
      User.find({ $or: [{ name: rx }, { email: rx }] }).select("_id").limit(MAX_SEARCH_MATCHES).lean(),
      Product.find({ title: rx }).select("_id").limit(MAX_SEARCH_MATCHES).lean(),
    ]);
    const personIds = people.map((u) => u._id);
    const listingIds = listings.map((p) => p._id);
    const convs = await Conversation.find({
      $or: [
        ...(personIds.length ? [{ buyer_id: { $in: personIds } }, { seller_id: { $in: personIds } }] : []),
        ...(listingIds.length ? [{ product_id: { $in: listingIds } }] : []),
        // Listing since deleted: the chat keeps a snapshot of its title.
        { "product_snapshot.title": rx },
      ],
    })
      .select("_id")
      .lean();
    // "#ORD1A2B3C" (as shown in the UI) or any part of the raw id.
    const idText = searchText.replace(/^#?ord/i, "");
    conditions.push({
      $or: [
        { conversation_id: { $in: convs.map((c) => c._id) } },
        ...(idText ? [{ $expr: { $regexMatch: { input: { $toString: "$_id" }, regex: escapeRegex(idText), options: "i" } } }] : []),
      ],
    });
  }

  const filter = conditions.length === 1 ? dealFilter : { $and: conditions };
  const [total, pageDeals] = await Promise.all([
    Deal.countDocuments(filter),
    Deal.find(filter).sort({ createdAt: -1, _id: -1 }).skip(skip).limit(limit).populate(ORDER_POPULATE).lean(),
  ]);

  const campusMap = await campusNamesFor(pageDeals);
  return {
    data: pageDeals.map((d) => toOrderRow(d, campusMap)),
    pagination: buildPagination(total, page, limit),
  };
};

export const getAdminOrderById = async (dealId) => {
  if (!ObjectId.isValid(dealId)) {
    throw new Error("Invalid order ID");
  }
  const d = await Deal.findById(dealId).populate(ORDER_POPULATE).lean();
  if (!d) {
    throw new Error("Order not found");
  }
  return toOrderRow(d, await campusNamesFor([d]));
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
