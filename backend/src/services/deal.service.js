import mongoose from "mongoose";
import Conversation from "../models/conversation.model.js";
import Message from "../models/message.model.js";
import Deal from "../models/deal.model.js";
import Product from "../models/Product.model.js";
import {
  MESSAGE_TYPE,
  MESSAGE_STATUS,
  DEAL_STATUS,
  OFFER_STATUS,
  PRODUCT_STATUS,
} from "../config/constants.js";
import { AppError } from "../utils/appError.js";
import { emitToConversation, emitToUser } from "../utils/socket.js";

const inr = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

const roleOf = (conversation, userId) => {
  const id = String(userId);
  if (String(conversation.seller_id) === id) return "seller";
  if (String(conversation.buyer_id) === id) return "buyer";
  throw new AppError("You do not have access to this conversation.", 403);
};

const otherPartyOf = (conversation, userId) => {
  const id = String(userId);
  return String(conversation.buyer_id) === id
    ? conversation.seller_id
    : conversation.buyer_id;
};

const loadConversation = async (conversationId) => {
  if (!mongoose.Types.ObjectId.isValid(conversationId)) {
    throw new AppError("Invalid conversation ID", 400);
  }
  const conversation = await Conversation.findById(conversationId);
  if (!conversation || !conversation.is_active) {
    throw new AppError("Conversation not found", 404);
  }
  return conversation;
};

export const ensureDeal = async (conversation) => {
  let deal = await Deal.findOne({ conversation_id: conversation._id });
  if (deal) return deal;
  const price = Number(conversation.product_snapshot?.selling_price || 0);
  deal = await Deal.create({
    conversation_id: conversation._id,
    original_price: price,
    current_price: price,
    offer_history: [],
    offer_status: OFFER_STATUS.PENDING,
    status: DEAL_STATUS.NEGOTIATING,
  });
  return deal;
};

const pushSystemMessage = async ({ conversation, senderId, text, deal }) => {
  const receiverId = otherPartyOf(conversation, senderId);
  const msg = await Message.create({
    conversation_id: conversation._id,
    sender_id: senderId,
    receiver_id: receiverId,
    message_type: MESSAGE_TYPE.SYSTEM,
    text,
    deal_id: deal?._id || null,
    message_status: MESSAGE_STATUS.SENT,
  });
  conversation.last_message = text.slice(0, 500);
  conversation.last_message_type = MESSAGE_TYPE.SYSTEM;
  conversation.last_message_sender = senderId;
  conversation.last_activity_at = new Date();
  if (String(conversation.buyer_id) === String(receiverId)) {
    conversation.unread_count.buyer += 1;
  } else {
    conversation.unread_count.seller += 1;
  }
  await conversation.save();
  const payload = msg.toObject();
  emitToConversation(conversation._id, "message:new", payload);
  return msg;
};

const broadcastDeal = (conversation, deal) => {
  const payload = { conversationId: String(conversation._id), deal };
  emitToConversation(conversation._id, "deal:updated", payload);
  emitToUser(conversation.buyer_id, "conversation:updated", {
    conversationId: String(conversation._id),
    dealStatus: deal.status,
    last_activity_at: new Date(),
  });
  emitToUser(conversation.seller_id, "conversation:updated", {
    conversationId: String(conversation._id),
    dealStatus: deal.status,
    last_activity_at: new Date(),
  });
};

export const getDealForConversation = async ({ conversationId, userId }) => {
  const conversation = await loadConversation(conversationId);
  roleOf(conversation, userId);
  const deal = await ensureDeal(conversation);
  return { conversation, deal };
};

/** Buyer (or either party) makes a price offer. */
export const makeOffer = async ({ conversationId, userId, amount }) => {
  const conversation = await loadConversation(conversationId);
  const role = roleOf(conversation, userId);
  const amt = Math.trunc(Number(amount));
  if (!Number.isFinite(amt) || amt < 1 || amt > 10000000) {
    throw new AppError("Invalid offer amount", 400);
  }

  const product = await Product.findById(conversation.product_id).select(
    "is_negotiable status selling_price is_deleted",
  );
  if (!product) throw new AppError("Product not found", 404);
  // Sold-and-soft-deleted listings say so plainly inside chat flows.
  if (product.is_deleted) {
    throw new AppError("This item is already sold", 400);
  }
  if (product.is_negotiable === false) {
    throw new AppError("Seller has disabled negotiation for this item", 400);
  }
  if (
    product.status !== PRODUCT_STATUS.LISTED &&
    product.status !== undefined
  ) {
    // Allow the already-confirmed deal to proceed, block fresh negotiations.
    const existing = await Deal.findOne({ conversation_id: conversation._id });
    if (!existing || existing.status === DEAL_STATUS.NEGOTIATING) {
      throw new AppError("This item is no longer available", 400);
    }
  }

  const deal = await ensureDeal(conversation);
  // A cancelled deal reopens on the next offer, so the same buyer-seller
  // thread keeps working after a cancel (product CTA flips back too).
  if (deal.status === DEAL_STATUS.CANCELLED) {
    deal.status = DEAL_STATUS.NEGOTIATING;
    deal.offer_status = OFFER_STATUS.PENDING;
    deal.cancelled_at = null;
    deal.cancellation_reason = "";
  }
  if (
    ![
      DEAL_STATUS.NEGOTIATING,
      DEAL_STATUS.OFFER_ACCEPTED,
    ].includes(deal.status)
  ) {
    throw new AppError("Deal has moved past negotiation, offers are locked now", 400);
  }
  // Offer rule: strictly greater than 0 and strictly below the selling
  // price (deal.original_price snapshots it at conversation creation).
  const asking = Number(deal.original_price || 0);
  if (asking > 0 && amt >= asking) {
    throw new AppError(
      `Offer must be less than the selling price (${inr(asking)})`,
      400,
    );
  }

  // Expire older pending offers so only one active card exists in UI.
  deal.offer_history.forEach((o) => {
    if (o.status === OFFER_STATUS.PENDING) o.status = OFFER_STATUS.EXPIRED;
  });

  const receiverId = otherPartyOf(conversation, userId);
  const offerMsg = await Message.create({
    conversation_id: conversation._id,
    sender_id: userId,
    receiver_id: receiverId,
    message_type: MESSAGE_TYPE.OFFER,
    text: `Offered ${inr(amt)}`,
    deal_id: deal._id,
    message_status: MESSAGE_STATUS.SENT,
  });

  deal.offer_history.push({
    amount: amt,
    offered_by: userId,
    offered_by_role: role,
    message_id: offerMsg._id,
    status: OFFER_STATUS.PENDING,
    created_at: new Date(),
  });
  deal.offer_status = OFFER_STATUS.PENDING;
  if (deal.status === DEAL_STATUS.OFFER_ACCEPTED) {
    deal.status = DEAL_STATUS.NEGOTIATING; // new offer reopens negotiation
  }
  await deal.save();

  conversation.last_message = `Offered ${inr(amt)}`;
  conversation.last_message_type = MESSAGE_TYPE.OFFER;
  conversation.last_message_sender = userId;
  conversation.last_activity_at = new Date();
  if (String(conversation.buyer_id) === String(receiverId)) {
    conversation.unread_count.buyer += 1;
  } else {
    conversation.unread_count.seller += 1;
  }
  await conversation.save();

  emitToConversation(conversation._id, "message:new", offerMsg.toObject());
  broadcastDeal(conversation, deal.toObject());
  return { deal, message: offerMsg };
};

/** Accept / decline the active offer (must be the non-offerer). */
export const respondOffer = async ({ conversationId, userId, messageId, action }) => {
  const conversation = await loadConversation(conversationId);
  roleOf(conversation, userId);
  const deal = await ensureDeal(conversation);

  const entry = deal.offer_history.find(
    (o) => String(o.message_id) === String(messageId),
  );
  if (!entry) throw new AppError("Offer not found", 404);
  if (entry.status !== OFFER_STATUS.PENDING) {
    throw new AppError("Offer is no longer active", 400);
  }
  if (String(entry.offered_by) === String(userId)) {
    throw new AppError("You cannot respond to your own offer", 400);
  }

  if (action === "accept") {
    entry.status = OFFER_STATUS.ACCEPTED;
    entry.response_by = userId;
    entry.responded_at = new Date();
    deal.offer_status = OFFER_STATUS.ACCEPTED;
    deal.current_price = entry.amount;
    deal.status = DEAL_STATUS.OFFER_ACCEPTED;
    await deal.save();
    await Message.updateOne(
      { _id: entry.message_id },
      { $set: { message_status: MESSAGE_STATUS.READ, read_at: new Date() } },
    );
    await pushSystemMessage({
      conversation,
      senderId: userId,
      text: `Offer of ${inr(entry.amount)} accepted. Let's go.`,
      deal,
    });
  } else {
    entry.status = OFFER_STATUS.DECLINED;
    entry.response_by = userId;
    entry.responded_at = new Date();
    deal.offer_status = OFFER_STATUS.DECLINED;
    await deal.save();
    await pushSystemMessage({
      conversation,
      senderId: userId,
      text: `Offer of ${inr(entry.amount)} passed on. Shoot another if you're still keen.`,
      deal,
    });
  }

  const fresh = await Deal.findById(deal._id);
  broadcastDeal(conversation, fresh.toObject());
  return fresh;
};

/** Seller confirms the deal at a final amount. */
export const confirmDeal = async ({ conversationId, userId, amount }) => {
  const conversation = await loadConversation(conversationId);
  const role = roleOf(conversation, userId);
  if (role !== "seller") throw new AppError("Only the seller can confirm the deal", 403);
  const product = await Product.findById(conversation.product_id)
    .select("is_deleted")
    .lean();
  if (!product) throw new AppError("Product not found", 404);
  if (product.is_deleted) {
    throw new AppError("This item is already sold", 400);
  }

  const deal = await ensureDeal(conversation);
  if (
    ![DEAL_STATUS.NEGOTIATING, DEAL_STATUS.OFFER_ACCEPTED].includes(deal.status)
  ) {
    throw new AppError("Deal cannot be confirmed in its current state", 400);
  }
  // Single-reservation guard: one product -> at most one active reservation.
  // Prevents the seller confirming two different buyers for the same item,
  // which would desync chat stages from the orders page. Two indexed queries,
  // no populate, stays fast as conversations scale.
  const siblingIds = await Conversation.find({
    product_id: conversation.product_id,
    _id: { $ne: conversation._id },
  })
    .select("_id")
    .lean();
  if (siblingIds.length) {
    const rival = await Deal.findOne({
      conversation_id: { $in: siblingIds.map((c) => c._id) },
      status: {
        $in: [
          DEAL_STATUS.DEAL_CONFIRMED,
          DEAL_STATUS.PICKUP_SCHEDULED,
          DEAL_STATUS.PAYMENT_CONFIRMED,
          DEAL_STATUS.COMPLETED,
        ],
      },
    })
      .select("_id")
      .lean();
    if (rival) {
      throw new AppError(
        "This item is already sold or reserved for another buyer.",
        409,
      );
    }
  }
  const amt = Math.trunc(Number(amount ?? deal.current_price));
  if (!Number.isFinite(amt) || amt < 1 || amt > 10000000) {
    throw new AppError("Invalid deal amount", 400);
  }

  deal.offer_history.forEach((o) => {
    if (o.status === OFFER_STATUS.PENDING) o.status = OFFER_STATUS.EXPIRED;
  });
  deal.current_price = amt;
  deal.status = DEAL_STATUS.DEAL_CONFIRMED;
  deal.deal_confirmed_at = new Date();
  deal.reserved_at = new Date();
  deal.offer_status =
    deal.offer_status === OFFER_STATUS.ACCEPTED
      ? OFFER_STATUS.ACCEPTED
      : OFFER_STATUS.PENDING;
  await deal.save();

  // Keep header snapshot in sync so the list shows reserved price.
  conversation.product_snapshot.selling_price = amt;
  await conversation.save();

  await pushSystemMessage({
    conversation,
    senderId: userId,
    text: `Deal locked at ${inr(amt)}. It's reserved for you.`,
    deal,
  });
  const fresh = await Deal.findById(deal._id);
  broadcastDeal(conversation, fresh.toObject());
  return fresh;
};

/** Seller schedules (or reschedules) pickup. */
export const schedulePickup = async ({ conversationId, userId, date, location }) => {
  const conversation = await loadConversation(conversationId);
  const role = roleOf(conversation, userId);
  if (role !== "seller") throw new AppError("Only the seller can schedule pickup", 403);

  const deal = await ensureDeal(conversation);
  if (
    ![DEAL_STATUS.DEAL_CONFIRMED, DEAL_STATUS.PICKUP_SCHEDULED].includes(deal.status)
  ) {
    throw new AppError("Confirm the deal before scheduling pickup", 400);
  }
  const loc = String(location || "").trim().slice(0, 200);
  if (!loc) throw new AppError("Pickup location required", 400);
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) throw new AppError("Invalid pickup date", 400);
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  if (d < startOfToday) {
    throw new AppError("Pickup date cannot be in the past", 400);
  }

  deal.pickup = {
    scheduled_date: d,
    location: {
      address_line: loc,
      city: loc,
      state: "",
      pincode: "",
      additional_info: "",
    },
    scheduled_at: new Date(),
  };
  deal.status = DEAL_STATUS.PICKUP_SCHEDULED;
  await deal.save();

  const dateLabel = d.toLocaleDateString("en-IN");
  await pushSystemMessage({
    conversation,
    senderId: userId,
    text: `Pickup set for ${dateLabel} at ${loc}. Don't ghost.`,
    deal,
  });
  const fresh = await Deal.findById(deal._id);
  broadcastDeal(conversation, fresh.toObject());
  return fresh;
};

/** Seller confirms offline payment received. */
export const confirmPayment = async ({ conversationId, userId }) => {
  const conversation = await loadConversation(conversationId);
  const role = roleOf(conversation, userId);
  if (role !== "seller") throw new AppError("Only the seller can confirm payment", 403);

  const deal = await ensureDeal(conversation);
  if (deal.status !== DEAL_STATUS.PICKUP_SCHEDULED) {
    throw new AppError("Schedule pickup before confirming payment", 400);
  }
  deal.payment_confirmed = { is_confirmed: true, confirmed_at: new Date() };
  deal.status = DEAL_STATUS.PAYMENT_CONFIRMED;
  await deal.save();

  await pushSystemMessage({
    conversation,
    senderId: userId,
    text: "Seller confirmed the payment. Almost yours.",
    deal,
  });
  const fresh = await Deal.findById(deal._id);
  broadcastDeal(conversation, fresh.toObject());
  return fresh;
};

/** Buyer confirms item received -> transaction complete + product sold. */
export const confirmItemReceived = async ({ conversationId, userId }) => {
  const conversation = await loadConversation(conversationId);
  const role = roleOf(conversation, userId);
  if (role !== "buyer") throw new AppError("Only the buyer can confirm item receipt", 403);

  const deal = await ensureDeal(conversation);
  if (deal.status !== DEAL_STATUS.PAYMENT_CONFIRMED) {
    throw new AppError("Seller must confirm payment first", 400);
  }
  deal.item_received = { is_confirmed: true, confirmed_at: new Date() };
  deal.status = DEAL_STATUS.COMPLETED;
  deal.completed_at = new Date();
  await deal.save();

  // Sold = gone: soft-delete so no other user can get confused by a dead
  // listing. Chat/orders keep their snapshots, so both parties keep full
  // history. The cleanup job hard-deletes 15 days after this update.
  await Product.updateOne(
    { _id: conversation.product_id },
    { $set: { status: PRODUCT_STATUS.SOLD, is_deleted: true } },
  );

  await pushSystemMessage({
    conversation,
    senderId: userId,
    text: "Item received. Deal done. Enjoy it.",
    deal,
  });
  const fresh = await Deal.findById(deal._id);
  broadcastDeal(conversation, fresh.toObject());
  return fresh;
};

/**
 * Cancel a deal before completion (either party, e.g. buyer ghosts or seller
 * re-lists). Frees the reservation so the orders page and chat fall back to
 * `cancelled` together. Completed deals are terminal and cannot be cancelled.
 */
export const cancelDeal = async ({ conversationId, userId, reason = "" }) => {
  const conversation = await loadConversation(conversationId);
  roleOf(conversation, userId); // participant check

  const deal = await ensureDeal(conversation);
  if (deal.status === DEAL_STATUS.COMPLETED) {
    throw new AppError("Completed deals cannot be cancelled", 400);
  }
  if (deal.status === DEAL_STATUS.CANCELLED) return deal;

  deal.offer_history.forEach((o) => {
    if (o.status === OFFER_STATUS.PENDING) o.status = OFFER_STATUS.EXPIRED;
  });
  deal.status = DEAL_STATUS.CANCELLED;
  deal.cancelled_at = new Date();
  deal.cancellation_reason = String(reason || "").trim().slice(0, 300);
  await deal.save();

  await pushSystemMessage({
    conversation,
    senderId: userId,
    text: "Deal cancelled. Item's back on the shelf.",
    deal,
  });
  const fresh = await Deal.findById(deal._id);
  broadcastDeal(conversation, fresh.toObject());
  return fresh;
};

/**
 * Flags for the notification teammate: deals stuck after pickup / payment.
 * `olderThanHours` defaults to 24. Returns lean rows with parties + product.
 */
export const getPendingFollowups = async ({ olderThanHours = 24 } = {}) => {
  const cutoff = new Date(Date.now() - Number(olderThanHours) * 3600 * 1000);
  const deals = await Deal.find({
    $or: [
      {
        status: DEAL_STATUS.PICKUP_SCHEDULED,
        "pickup.scheduled_at": { $lte: cutoff },
      },
      {
        status: DEAL_STATUS.PAYMENT_CONFIRMED,
        "payment_confirmed.confirmed_at": { $lte: cutoff },
      },
    ],
  })
    .populate({
      path: "conversation_id",
      populate: [
        { path: "buyer_id", select: "name email avatar" },
        { path: "seller_id", select: "name email avatar" },
        { path: "product_id", select: "title selling_price images" },
      ],
    })
    .sort({ updatedAt: 1 })
    .limit(200)
    .lean();

  return deals.map((d) => {
    const needs =
      d.status === DEAL_STATUS.PICKUP_SCHEDULED
        ? "payment_confirmation"
        : "item_received";
    return {
      dealId: d._id,
      conversationId: d.conversation_id?._id,
      status: d.status,
      needs,
      pickup: d.pickup,
      current_price: d.current_price,
      updatedAt: d.updatedAt,
      buyer: d.conversation_id?.buyer_id,
      seller: d.conversation_id?.seller_id,
      product: d.conversation_id?.product_id,
    };
  });
};
