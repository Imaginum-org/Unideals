import Conversation from "../models/conversation.model.js";
import Deal from "../models/deal.model.js";
import { DEAL_STATUS } from "../config/constants.js";

const ACTIVE_STATUSES = [
  DEAL_STATUS.NEGOTIATING,
  DEAL_STATUS.OFFER_ACCEPTED,
  DEAL_STATUS.DEAL_CONFIRMED,
  DEAL_STATUS.PICKUP_SCHEDULED,
  DEAL_STATUS.PAYMENT_CONFIRMED,
];

/**
 * Unified orders feed, the SAME Deal documents the chat reads.
 * Chat stages and the orders page can never drift because both render
 * `dealStatus` from this source of truth.
 *
 * One row per conversation (1 buyer + 1 seller + 1 product = 1 deal).
 */
export const getUserOrders = async ({
  userId,
  role = "all",
  status = "all",
  page = 1,
  limit = 20,
}) => {
  const me = String(userId);
  const and = [];
  if (role === "buying") {
    and.push({ buyer_id: userId, "deleted_for.buyer": false });
  } else if (role === "selling") {
    and.push({ seller_id: userId, "deleted_for.seller": false });
  } else {
    and.push({
      $or: [
        { buyer_id: userId, "deleted_for.buyer": false },
        { seller_id: userId, "deleted_for.seller": false },
      ],
    });
  }

  let rows = await Conversation.find(and.length ? { $and: and } : {})
    .populate("buyer_id", "name avatar subscription role")
    .populate("seller_id", "name avatar subscription role")
    .populate("product_id", "title selling_price images status")
    .sort({ last_activity_at: -1 })
    .limit(300)
    .lean();

  // Same rule as the chat list: untouched threads are not orders yet.
  rows = rows.filter((r) => String(r.last_message || "").trim() !== "");

  const ids = rows.map((r) => r._id);
  const deals = ids.length
    ? await Deal.find({ conversation_id: { $in: ids } }).lean()
    : [];
  const dealByConv = new Map(deals.map((d) => [String(d.conversation_id), d]));

  let orders = rows.map((r) => {
    const isBuyer = String(r.buyer_id?._id || r.buyer_id) === me;
    const other = isBuyer ? r.seller_id : r.buyer_id;
    const deal = dealByConv.get(String(r._id));
    const dealStatus = deal?.status || DEAL_STATUS.NEGOTIATING;
    return {
      orderId: deal?._id || r._id,
      conversationId: r._id,
      role: isBuyer ? "buying" : "selling",
      product: r.product_id
        ? {
            _id: r.product_id._id,
            title: r.product_id.title || r.product_snapshot?.title,
            selling_price:
              r.product_id.selling_price ??
              r.product_snapshot?.selling_price,
            images: r.product_id.images || [],
            status: r.product_id.status,
          }
        : {
            title: r.product_snapshot?.title,
            selling_price: r.product_snapshot?.selling_price,
            images: r.product_snapshot?.image
              ? [{ url: r.product_snapshot.image }]
              : [],
          },
      otherParty: other
        ? {
            _id: other._id,
            name: other.name,
            avatar: other.avatar,
            subscription: other.subscription || "base_user",
            role: other.role || "user",
          }
        : null,
      dealStatus,
      price: deal?.current_price ?? r.product_snapshot?.selling_price ?? 0,
      originalPrice:
        deal?.original_price ?? r.product_snapshot?.selling_price ?? 0,
      pickup: deal?.pickup?.scheduled_date
        ? {
            date: deal.pickup.scheduled_date,
            location:
              deal.pickup.location?.address_line ||
              deal.pickup.location?.city ||
              "",
            scheduled_at: deal.pickup.scheduled_at,
          }
        : null,
      paymentConfirmed: Boolean(deal?.payment_confirmed?.is_confirmed),
      itemReceived: Boolean(deal?.item_received?.is_confirmed),
      last_message: r.last_message,
      last_activity_at: r.last_activity_at,
      unread: isBuyer
        ? r.unread_count?.buyer || 0
        : r.unread_count?.seller || 0,
      updatedAt: deal?.updatedAt || r.updatedAt,
      createdAt: r.createdAt,
    };
  });

  const counts = {
    All: orders.length,
    Active: orders.filter((o) => ACTIVE_STATUSES.includes(o.dealStatus)).length,
    Completed: orders.filter(
      (o) => o.dealStatus === DEAL_STATUS.COMPLETED,
    ).length,
    Cancelled: orders.filter(
      (o) => o.dealStatus === DEAL_STATUS.CANCELLED,
    ).length,
  };

  if (status === "active") {
    orders = orders.filter((o) => ACTIVE_STATUSES.includes(o.dealStatus));
  } else if (status === "completed") {
    orders = orders.filter((o) => o.dealStatus === DEAL_STATUS.COMPLETED);
  } else if (status === "cancelled") {
    orders = orders.filter((o) => o.dealStatus === DEAL_STATUS.CANCELLED);
  }

  const pg = Math.max(Number(page) || 1, 1);
  const lim = Math.min(Math.max(Number(limit) || 20, 1), 100);
  const total = orders.length;
  const data = orders.slice((pg - 1) * lim, (pg - 1) * lim + lim);

  return { data, counts, pagination: { page: pg, limit: lim, total } };
};
