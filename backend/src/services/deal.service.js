import crypto from "crypto";
import mongoose from "mongoose";
import Conversation from "../models/conversation.model.js";
import Message from "../models/message.model.js";
import Deal from "../models/deal.model.js";
import Product from "../models/Product.model.js";
import User from "../models/User.model.js";
import {
  MESSAGE_TYPE,
  MESSAGE_STATUS,
  DEAL_STATUS,
  OFFER_STATUS,
  PRODUCT_STATUS,
} from "../config/constants.js";
import { AppError } from "../utils/appError.js";
import { emitToConversation, emitToUser } from "../utils/socket.js";
import {
  notifyNewOffer,
  notifyOfferAccepted,
  notifyOfferDeclined,
  notifyDealConfirmed,
  notifyPickupScheduled,
  notifyPaymentConfirmed,
  notifyDealCompleted,
  notifyDealCancelled,
  notifyDealEvent,
} from "./notification.service.js";

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
  // [rent] Rent & Borrow threads have no deal (the booking page tracks progress).
  if (conversation.context === "rent") throw new AppError("Rent & Borrow chats don't use deals", 400);
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

// Atomic preview + unread bump (mirrors message.service). Read-modify-save
// on unread_count lost increments under concurrent sends.
const touchConversation = async (conversation, { text, type, senderId, receiverId }) => {
  const at = new Date();
  const side = String(conversation.buyer_id) === String(receiverId) ? "buyer" : "seller";
  const preview = String(text || "").slice(0, 500);
  await Conversation.updateOne(
    { _id: conversation._id },
    {
      $set: {
        last_message: preview,
        last_message_type: type,
        last_message_sender: senderId,
        last_activity_at: at,
      },
      $inc: { [`unread_count.${side}`]: 1 },
    },
  );
  conversation.last_message = preview;
  conversation.last_message_type = type;
  conversation.last_activity_at = at;
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
  await touchConversation(conversation, {
    text,
    type: MESSAGE_TYPE.SYSTEM,
    senderId,
    receiverId,
  });
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

  await touchConversation(conversation, {
    text: `Offered ${inr(amt)}`,
    type: MESSAGE_TYPE.OFFER,
    senderId: userId,
    receiverId,
  });

  emitToConversation(conversation._id, "message:new", offerMsg.toObject());
  broadcastDeal(conversation, deal.toObject());

  // Notify the other party (seller) about the new offer — fire-and-forget
  const buyerUser = await User.findById(userId).select("name").lean();
  const productSnap = conversation.product_snapshot;
  notifyNewOffer({
    conversationId: conversation._id,
    buyerId: userId,
    buyerName: buyerUser?.name || "A buyer",
    amount: amt,
    productTitle: productSnap?.title || "the item",
    sellerId: receiverId,
  }).catch(() => {});

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
    // Notify the buyer (offerer) that their offer was accepted — fire-and-forget
    const sellerUser = await User.findById(userId).select("name").lean();
    notifyOfferAccepted({
      conversationId: conversation._id,
      sellerName: sellerUser?.name || "The seller",
      productTitle: conversation.product_snapshot?.title || "the item",
      amount: entry.amount,
      buyerId: entry.offered_by,
    }).catch(() => {});
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
    // Tell the offerer, who may not be in the chat — fire-and-forget
    const responder = await User.findById(userId).select("name").lean();
    notifyOfferDeclined({
      conversationId: conversation._id,
      responderName: responder?.name,
      productTitle: conversation.product_snapshot?.title,
      amount: entry.amount,
      recipientId: entry.offered_by,
    }).catch(() => {});
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
  await Conversation.updateOne(
    { _id: conversation._id },
    { $set: { "product_snapshot.selling_price": amt } },
  );
  conversation.product_snapshot.selling_price = amt;

  await pushSystemMessage({
    conversation,
    senderId: userId,
    text: `Deal locked at ${inr(amt)}. It's reserved for you.`,
    deal,
  });
  // Notify the buyer the item is reserved for them — fire-and-forget
  const sellerUser = await User.findById(userId).select("name").lean();
  notifyDealConfirmed({
    conversationId: conversation._id,
    sellerName: sellerUser?.name,
    productTitle: conversation.product_snapshot?.title,
    amount: amt,
    buyerId: conversation.buyer_id,
  }).catch(() => {});
  const fresh = await Deal.findById(deal._id);
  broadcastDeal(conversation, fresh.toObject());
  return fresh;
};

/** Seller schedules (or reschedules) pickup. */
// ─── Meetup + handover ─────────────────────────────────────────────────────
//
// After the deal is confirmed the seller schedules a meetup. At the meetup
// the buyer checks the item, pays, then shows a 4-digit handover code; the
// seller enters it and the deal completes in one step. That proves they met
// and that both agreed. If the code can't be used, either side can "mark as
// done": the other side confirms (completes at once), raises a problem
// (clears it), or stays silent (completes after AUTO_COMPLETE_MS). A
// follow-up job asks "did you meet?" once the meetup is overdue and ends a
// reservation nobody acts on (see runHandoverFollowups).

const HOUR = 60 * 60 * 1000;
export const HANDOVER = Object.freeze({
  MAX_ATTEMPTS: 5,
  LOCK_MS: 15 * 60 * 1000,
  AUTO_COMPLETE_MS: 48 * HOUR,
  // "Did you meet?" this long after a set time, or after a date-only day.
  FOLLOWUP_AFTER_TIME_MS: 6 * HOUR,
  FOLLOWUP_AFTER_DAY_MS: 30 * HOUR,
  // Untouched reservations end this long after the follow-up.
  EXPIRE_AFTER_FOLLOWUP_MS: 6 * 24 * HOUR,
  // A no-show can be reported this long after a set time.
  NO_SHOW_AFTER_TIME_MS: 30 * 60 * 1000,
});

// Stages where the item can change hands (meetup scheduled or not yet).
const HANDOVER_STATUSES = [DEAL_STATUS.DEAL_CONFIRMED, DEAL_STATUS.PICKUP_SCHEDULED, DEAL_STATUS.PAYMENT_CONFIRMED];
const MEETUP_STATUSES = [DEAL_STATUS.PICKUP_SCHEDULED, DEAL_STATUS.PAYMENT_CONFIRMED];
const IST = "Asia/Kolkata";

const fmtWhen = (date, withTime = true) =>
  new Date(date).toLocaleString("en-IN", {
    timeZone: IST,
    day: "numeric",
    month: "short",
    ...(withTime ? { hour: "numeric", minute: "2-digit" } : {}),
  });

const roleLabel = (role) => (role === "seller" ? "The seller" : "The buyer");

// 4 digits from HMAC(secret, dealId:nonce). Nothing secret is stored: the
// nonce alone is useless without the server secret.
const handoverSecret = () => {
  const secret = process.env.HANDOVER_CODE_SECRET || process.env.SECRET_KEY_ACCESS_TOKEN;
  if (!secret) throw new AppError("Handover codes are not configured", 500);
  return secret;
};
const codeFor = (dealId, nonce) => {
  const digest = crypto.createHmac("sha256", handoverSecret()).update(`${dealId}:${nonce}`).digest();
  return String(digest.readUInt32BE(0) % 10000).padStart(4, "0");
};
const sameCode = (a, b) => {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};

/** Follow-up and expiry moments for a meetup. */
export const meetupTimers = (when, timeSet) => {
  const at = new Date(when).getTime();
  const followup = at + (timeSet ? HANDOVER.FOLLOWUP_AFTER_TIME_MS : HANDOVER.FOLLOWUP_AFTER_DAY_MS);
  return {
    followup_due_at: new Date(followup),
    expires_at: new Date(followup + HANDOVER.EXPIRE_AFTER_FOLLOWUP_MS),
  };
};

const noShowAllowedAt = (pickup) => {
  if (!pickup?.scheduled_date) return null;
  if (pickup.time_set) return new Date(new Date(pickup.scheduled_date).getTime() + HANDOVER.NO_SHOW_AFTER_TIME_MS);
  return pickup.followup_due_at || meetupTimers(pickup.scheduled_date, false).followup_due_at;
};

// "2026-11-23" + "17:30" is read as India time; a full ISO date (older
// clients) is used as sent.
const parseMeetup = (date, time) => {
  const day = String(date || "").trim();
  const hhmm = String(time || "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(day)) {
    if (hhmm) {
      if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(hhmm)) throw new AppError("Invalid pickup time", 400);
      return { when: new Date(`${day}T${hhmm}:00+05:30`), timeSet: true };
    }
    return { when: new Date(`${day}T00:00:00Z`), timeSet: false };
  }
  return { when: new Date(day), timeSet: false };
};

export const schedulePickup = async ({ conversationId, userId, date, time, location }) => {
  const conversation = await loadConversation(conversationId);
  const role = roleOf(conversation, userId);
  if (role !== "seller") throw new AppError("Only the seller can schedule pickup", 403);

  const deal = await ensureDeal(conversation);
  if (![DEAL_STATUS.DEAL_CONFIRMED, DEAL_STATUS.PICKUP_SCHEDULED].includes(deal.status)) {
    throw new AppError("Confirm the deal before scheduling pickup", 400);
  }
  const loc = String(location || "").trim().slice(0, 200);
  if (!loc) throw new AppError("Pickup location required", 400);
  const { when: d, timeSet } = parseMeetup(date, time);
  if (Number.isNaN(d.getTime())) throw new AppError("Invalid pickup date", 400);
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  if (d < startOfToday) throw new AppError("Pickup date cannot be in the past", 400);
  if (timeSet && d.getTime() < Date.now() - 5 * 60 * 1000) throw new AppError("Pick a time later than now", 400);

  const rescheduled = deal.status === DEAL_STATUS.PICKUP_SCHEDULED;
  deal.pickup = {
    scheduled_date: d,
    time_set: timeSet,
    location: { address_line: loc, city: loc, state: "", pincode: "", additional_info: "" },
    scheduled_at: new Date(),
    ...meetupTimers(d, timeSet),
  };
  // A new meetup starts fresh: no pending "mark as done", no follow-up yet,
  // no code lockout. The code itself stays the same.
  deal.done_request = undefined;
  deal.followup_sent_at = undefined;
  if (deal.handover) {
    deal.handover.attempts = 0;
    deal.handover.locked_until = undefined;
  }
  deal.status = DEAL_STATUS.PICKUP_SCHEDULED;
  await deal.save();

  const whenLabel = timeSet ? fmtWhen(d) : fmtWhen(d, false);
  await pushSystemMessage({
    conversation,
    senderId: userId,
    text: `${rescheduled ? "Pickup moved to" : "Pickup set for"} ${whenLabel} at ${loc}. At the meetup: check the item, pay, then the buyer shows their handover code to finish the deal.`,
    deal,
  });
  notifyPickupScheduled({
    conversationId: conversation._id,
    location: loc,
    scheduledDate: d,
    recipientId: conversation.buyer_id,
  }).catch(() => {});
  const fresh = await Deal.findById(deal._id);
  broadcastDeal(conversation, fresh.toObject());
  return fresh;
};

/** Buyer: their 4-digit handover code (issued on first request). */
export const getHandoverCode = async ({ conversationId, userId }) => {
  const conversation = await loadConversation(conversationId);
  if (roleOf(conversation, userId) !== "buyer") throw new AppError("Only the buyer has a handover code", 403);
  const deal = await ensureDeal(conversation);
  if (!HANDOVER_STATUSES.includes(deal.status)) throw new AppError("The handover code appears once the deal is confirmed", 400);

  // lean(): the nonce is stripped from serialised documents, not from lean reads.
  let raw = await Deal.findById(deal._id).select("handover").lean();
  if (!raw?.handover?.nonce) {
    await Deal.updateOne(
      { _id: deal._id, "handover.nonce": { $in: [null] } },
      { $set: { "handover.nonce": crypto.randomBytes(16).toString("hex"), "handover.issued_at": new Date() } },
    );
    raw = await Deal.findById(deal._id).select("handover").lean();
  }
  return { code: codeFor(deal._id, raw.handover.nonce) };
};

/** Seller: enter the buyer's code. Right code = deal complete. */
export const verifyHandoverCode = async ({ conversationId, userId, code }) => {
  const conversation = await loadConversation(conversationId);
  if (roleOf(conversation, userId) !== "seller") throw new AppError("Only the seller enters the handover code", 403);
  const deal = await ensureDeal(conversation);
  if (deal.status === DEAL_STATUS.COMPLETED) return deal;
  if (!HANDOVER_STATUSES.includes(deal.status)) throw new AppError("This deal isn't ready to finish yet", 400);
  const entered = String(code || "").trim();
  if (!/^\d{4}$/.test(entered)) throw new AppError("Enter the 4-digit code from the buyer's screen", 400);

  const now = new Date();
  const raw = await Deal.findById(deal._id).select("handover").lean();
  const lockedUntil = raw?.handover?.locked_until;
  const lockedMsg = (until) => `Too many wrong codes. Try again after ${fmtWhen(until)}.`;
  if (lockedUntil && new Date(lockedUntil) > now) throw new AppError(lockedMsg(lockedUntil), 429);
  if (!raw?.handover?.nonce) {
    throw new AppError("The buyer hasn't opened their code yet. Ask them to tap \"Show code\" in this chat.", 400);
  }

  if (!sameCode(codeFor(deal._id, raw.handover.nonce), entered)) {
    // Count the miss atomically (two devices can't share a free retry).
    const counted = await Deal.findOneAndUpdate(
      { _id: deal._id, $or: [{ "handover.locked_until": null }, { "handover.locked_until": { $lte: now } }] },
      { $inc: { "handover.attempts": 1 } },
      { returnDocument: "after", projection: { handover: 1 } },
    ).lean();
    if (!counted) throw new AppError(lockedMsg(new Date(now.getTime() + HANDOVER.LOCK_MS)), 429);
    const attempts = counted.handover?.attempts || 0;
    if (attempts >= HANDOVER.MAX_ATTEMPTS) {
      const until = new Date(now.getTime() + HANDOVER.LOCK_MS);
      await Deal.updateOne({ _id: deal._id }, { $set: { "handover.locked_until": until, "handover.attempts": 0 } });
      throw new AppError(`Wrong code ${HANDOVER.MAX_ATTEMPTS} times. Code entry is paused until ${fmtWhen(until)}.`, 429);
    }
    const left = HANDOVER.MAX_ATTEMPTS - attempts;
    throw new AppError(`That code isn't right. ${left} ${left === 1 ? "try" : "tries"} left.`, 400);
  }

  return finalizeDeal({ conversation, deal, method: "code", actorId: userId });
};

/**
 * Either side: "the deal is done". If the other side already said so (or,
 * for legacy deals, the seller already confirmed payment and the buyer is
 * the one confirming), the deal completes now.
 */
export const markDealDone = async ({ conversationId, userId }) => {
  const conversation = await loadConversation(conversationId);
  const role = roleOf(conversation, userId);
  const deal = await ensureDeal(conversation);
  if (deal.status === DEAL_STATUS.COMPLETED) return deal;
  if (!HANDOVER_STATUSES.includes(deal.status)) throw new AppError("This deal isn't ready to finish yet", 400);

  const finishBoth = () => finalizeDeal({ conversation, deal, method: "both_confirmed", actorId: userId });
  const pending = deal.done_request;
  if (pending?.at) return pending.role === role ? deal : finishBoth();
  if (deal.status === DEAL_STATUS.PAYMENT_CONFIRMED && role === "buyer") return finishBoth();

  const now = new Date();
  const autoAt = new Date(now.getTime() + HANDOVER.AUTO_COMPLETE_MS);
  const updated = await Deal.findOneAndUpdate(
    { _id: deal._id, status: deal.status, "done_request.at": null },
    { $set: { done_request: { by: userId, role, at: now, auto_complete_at: autoAt } } },
    { returnDocument: "after" },
  );
  if (!updated) {
    // Lost a race: if the other side asked at the same moment, that's both.
    const current = await Deal.findById(deal._id);
    if (current?.done_request?.at && current.done_request.role !== role) {
      return finalizeDeal({ conversation, deal: current, method: "both_confirmed", actorId: userId });
    }
    if (current?.status === DEAL_STATUS.COMPLETED || current?.done_request?.role === role) return current;
    throw new AppError("This deal just changed. Refresh and try again.", 409);
  }

  const other = role === "seller" ? "buyer" : "seller";
  await pushSystemMessage({
    conversation,
    senderId: userId,
    text: `${roleLabel(role)} marked the deal as done. ${other === "buyer" ? "Buyer" : "Seller"}: confirm it in the deal card, or tap "There's a problem". If there's no reply, it completes on ${fmtWhen(autoAt)}.`,
    deal: updated,
  });
  notifyDealEvent({
    recipientId: otherPartyOf(conversation, userId),
    conversationId: conversation._id,
    title: "Confirm your deal",
    message: `${roleLabel(role)} says the deal for "${conversation.product_snapshot?.title || "the item"}" is done. Confirm it, or tell them if something's wrong.`,
    actionLabel: "Review deal",
  }).catch(() => {});
  broadcastDeal(conversation, updated.toObject());
  return updated;
};

/**
 * Clears a "mark as done" request: the requester takes it back, or the other
 * side says there's a problem (with an optional reason).
 */
export const clearDoneRequest = async ({ conversationId, userId, reason = "" }) => {
  const conversation = await loadConversation(conversationId);
  const role = roleOf(conversation, userId);
  const deal = await ensureDeal(conversation);
  const pending = deal.done_request;
  if (!pending?.at || deal.status === DEAL_STATUS.COMPLETED) return deal;

  const updated = await Deal.findOneAndUpdate(
    { _id: deal._id, "done_request.at": pending.at },
    { $unset: { done_request: "" } },
    { returnDocument: "after" },
  );
  if (!updated) return Deal.findById(deal._id);

  const mine = pending.role === role;
  const why = String(reason || "").trim().slice(0, 200);
  const text = mine
    ? `${roleLabel(role)} took back "mark as done".`
    : `${roleLabel(role)} says there's a problem${why ? `: "${why}"` : ""}. Sort it out here, then finish the deal, or cancel it.`;
  await pushSystemMessage({ conversation, senderId: userId, text, deal: updated });
  if (!mine) {
    notifyDealEvent({
      recipientId: otherPartyOf(conversation, userId),
      conversationId: conversation._id,
      title: "There's a problem with your deal",
      message: `${roleLabel(role)} didn't confirm the deal for "${conversation.product_snapshot?.title || "the item"}"${why ? `: ${why}` : ""}.`,
    }).catch(() => {});
  }
  broadcastDeal(conversation, updated.toObject());
  return updated;
};

/** Either side, after the meetup time: the other person never came. */
export const reportNoShow = async ({ conversationId, userId }) => {
  const conversation = await loadConversation(conversationId);
  const role = roleOf(conversation, userId);
  const deal = await ensureDeal(conversation);
  if (deal.status !== DEAL_STATUS.PICKUP_SCHEDULED) throw new AppError("There's no scheduled meetup to report", 400);
  const allowedAt = noShowAllowedAt(deal.pickup);
  if (!allowedAt || Date.now() < allowedAt.getTime()) {
    throw new AppError(`You can report a no-show after the meetup time${allowedAt ? ` (from ${fmtWhen(allowedAt)})` : ""}.`, 400);
  }

  const now = new Date();
  const updated = await Deal.findOneAndUpdate(
    { _id: deal._id, status: DEAL_STATUS.PICKUP_SCHEDULED },
    {
      $set: {
        status: DEAL_STATUS.CANCELLED,
        cancelled_at: now,
        cancellation_reason: `No-show reported by the ${role}`,
        no_show: { reported_by: userId, reporter_role: role, at: now },
      },
      $unset: { done_request: "" },
    },
    { returnDocument: "after" },
  );
  if (!updated) throw new AppError("This deal just changed. Refresh and try again.", 409);

  const other = role === "seller" ? "buyer" : "seller";
  await pushSystemMessage({
    conversation,
    senderId: userId,
    text: `${roleLabel(role)} reported that the ${other} didn't show up. The deal is cancelled and the item is available again.`,
    deal: updated,
  });
  notifyDealEvent({
    recipientId: otherPartyOf(conversation, userId),
    conversationId: conversation._id,
    title: "Deal cancelled: missed meetup",
    message: `${roleLabel(role)} reported you didn't make it to the meetup for "${conversation.product_snapshot?.title || "the item"}". If that's wrong, reply in the chat.`,
  }).catch(() => {});
  broadcastDeal(conversation, updated.toObject());
  return updated;
};

const COMPLETION_TEXT = {
  code: "Handover code verified. Deal done. Enjoy it!",
  both_confirmed: "Both of you confirmed. Deal done. Enjoy it!",
  auto: "No reply in 48 hours, so the deal was completed automatically.",
  legacy: "Item received. Deal done. Enjoy it.",
  admin: "Deal completed by Unideals support.",
};

/**
 * The one way a deal completes. A single conditional update on an active
 * stage, so taps racing each other (or the job) complete it exactly once;
 * only the caller that wins runs the side effects.
 */
const finalizeDeal = async ({ conversation, deal, method, actorId = null }) => {
  const now = new Date();
  const soldItem = await Product.findById(conversation.product_id)
    .select("campus_id category condition original_price seller_id attributes.purchase_date")
    .lean()
    .catch(() => null);
  const sale = soldItem
    ? {
        campus_id: soldItem.campus_id,
        category: soldItem.category,
        condition: soldItem.condition,
        original_price: Number(soldItem.original_price) || undefined,
        sold_price: Number(deal.current_price) || undefined,
        seller_id: soldItem.seller_id,
        purchase_date: soldItem.attributes?.purchase_date || undefined,
      }
    : undefined;

  const updated = await Deal.findOneAndUpdate(
    { _id: deal._id, status: { $in: HANDOVER_STATUSES } },
    {
      $set: {
        status: DEAL_STATUS.COMPLETED,
        completed_at: now,
        completed_via: method,
        "item_received.is_confirmed": true,
        "item_received.confirmed_at": now,
        "payment_confirmed.is_confirmed": true,
        "payment_confirmed.confirmed_at": deal.payment_confirmed?.confirmed_at || now,
        ...(sale ? { sale } : {}),
      },
      $unset: { done_request: "", "handover.locked_until": "" },
    },
    { returnDocument: "after" },
  );
  if (!updated) {
    const current = await Deal.findById(deal._id);
    if (current?.status === DEAL_STATUS.COMPLETED) return current;
    throw new AppError("This deal just changed. Refresh and try again.", 409);
  }

  // Sold = gone: soft-delete so no other user can get confused by a dead
  // listing. Chat/orders keep their snapshots; the cleanup job hard-deletes
  // 15 days after this update.
  await Product.updateOne(
    { _id: conversation.product_id },
    { $set: { status: PRODUCT_STATUS.SOLD, is_deleted: true } },
  );

  await pushSystemMessage({
    conversation,
    senderId: actorId || conversation.seller_id,
    text: COMPLETION_TEXT[method] || COMPLETION_TEXT.legacy,
    deal: updated,
  });

  const title = conversation.product_snapshot?.title || "the item";
  const tell = (recipientId, message) =>
    notifyDealEvent({ recipientId, conversationId: conversation._id, title: "Deal complete 🎉", message, actionLabel: "View deal" }).catch(() => {});
  if (method === "legacy") {
    notifyDealCompleted({
      conversationId: conversation._id,
      buyerName: "The buyer",
      productTitle: title,
      sellerId: conversation.seller_id,
    }).catch(() => {});
  } else if (method === "auto") {
    tell(conversation.buyer_id, `Your deal for "${title}" was completed automatically. Rate the seller to finish up.`);
    tell(conversation.seller_id, `Your deal for "${title}" was completed automatically. Rate the buyer to finish up.`);
  } else if (actorId) {
    const other = otherPartyOf(conversation, actorId);
    tell(
      other,
      String(other) === String(conversation.buyer_id)
        ? `Handover confirmed for "${title}". Enjoy it, and rate the seller to finish up.`
        : `The buyer confirmed the deal for "${title}". Nice sale! Rate the buyer to finish up.`,
    );
  }

  broadcastDeal(conversation, updated.toObject());
  return updated;
};

/** Legacy: seller confirms offline payment (older app versions). */
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
  notifyPaymentConfirmed({
    conversationId: conversation._id,
    productTitle: conversation.product_snapshot?.title,
    buyerId: conversation.buyer_id,
  }).catch(() => {});
  const fresh = await Deal.findById(deal._id);
  broadcastDeal(conversation, fresh.toObject());
  return fresh;
};

/** Legacy: buyer confirms receipt after the seller confirmed payment. */
export const confirmItemReceived = async ({ conversationId, userId }) => {
  const conversation = await loadConversation(conversationId);
  const role = roleOf(conversation, userId);
  if (role !== "buyer") throw new AppError("Only the buyer can confirm item receipt", 403);

  const deal = await ensureDeal(conversation);
  if (deal.status !== DEAL_STATUS.PAYMENT_CONFIRMED) {
    throw new AppError("Seller must confirm payment first", 400);
  }
  return finalizeDeal({ conversation, deal, method: "legacy", actorId: userId });
};

// ─── Follow-up job ─────────────────────────────────────────────────────────

/**
 * Every few minutes (jobs/dealFollowups.job.js):
 * 1. "Mark as done" with no reply by auto_complete_at -> complete.
 * 2. Meetup overdue, nothing done -> ask both "did you meet?" (once).
 * 3. Reservation past expires_at, no pending request -> end it. Deals where
 *    the seller already confirmed payment (legacy) complete instead.
 * Also gives pre-existing scheduled deals their timers (one-time backfill;
 * never earlier than now, so nobody is surprised). Bounded batches; each
 * deal is claimed with a conditional write, so overlapping instances
 * can't act twice.
 */
export const runHandoverFollowups = async ({ now = new Date(), batch = 100 } = {}) => {
  const result = { backfilled: 0, autoCompleted: 0, followups: 0, expired: 0, failed: 0 };
  const loadConv = (deal) => Conversation.findById(deal.conversation_id);

  const legacy = await Deal.find({
    status: { $in: MEETUP_STATUSES },
    "pickup.scheduled_date": { $ne: null },
    "pickup.followup_due_at": { $exists: false },
  })
    .select("pickup")
    .limit(500)
    .lean();
  if (legacy.length) {
    const minFollowup = now.getTime();
    const minExpiry = now.getTime() + HANDOVER.EXPIRE_AFTER_FOLLOWUP_MS;
    await Deal.bulkWrite(
      legacy.map((d) => {
        const t = meetupTimers(d.pickup.scheduled_date, Boolean(d.pickup.time_set));
        return {
          updateOne: {
            filter: { _id: d._id, "pickup.followup_due_at": { $exists: false } },
            update: {
              $set: {
                "pickup.followup_due_at": new Date(Math.max(t.followup_due_at.getTime(), minFollowup)),
                "pickup.expires_at": new Date(Math.max(t.expires_at.getTime(), minExpiry)),
              },
            },
          },
        };
      }),
    );
    result.backfilled = legacy.length;
  }

  const due = await Deal.find({ "done_request.auto_complete_at": { $lte: now }, status: { $in: HANDOVER_STATUSES } }).limit(batch);
  for (const deal of due) {
    try {
      const conversation = await loadConv(deal);
      if (!conversation) continue;
      await finalizeDeal({ conversation, deal, method: "auto", actorId: deal.done_request?.by || null });
      result.autoCompleted += 1;
    } catch {
      result.failed += 1;
    }
  }

  const stale = await Deal.find({
    status: { $in: MEETUP_STATUSES },
    "pickup.expires_at": { $lte: now },
    "done_request.at": null,
  }).limit(batch);
  for (const deal of stale) {
    try {
      const conversation = await loadConv(deal);
      if (!conversation) continue;
      if (deal.status === DEAL_STATUS.PAYMENT_CONFIRMED) {
        await finalizeDeal({ conversation, deal, method: "auto", actorId: null });
      } else {
        const updated = await Deal.findOneAndUpdate(
          { _id: deal._id, status: DEAL_STATUS.PICKUP_SCHEDULED, "done_request.at": null },
          { $set: { status: DEAL_STATUS.CANCELLED, cancelled_at: now, cancellation_reason: "Reservation ended: nobody finished the deal after the meetup" } },
          { returnDocument: "after" },
        );
        if (!updated) continue;
        await pushSystemMessage({
          conversation,
          senderId: conversation.seller_id,
          text: "Nobody finished this deal after the meetup, so the reservation has ended and the item is available again. Make a new offer to restart.",
          deal: updated,
        });
        const title = conversation.product_snapshot?.title || "the item";
        for (const recipientId of [conversation.buyer_id, conversation.seller_id]) {
          notifyDealEvent({
            recipientId,
            conversationId: conversation._id,
            title: "Reservation ended",
            message: `The deal for "${title}" wasn't finished after the meetup, so the reservation ended.`,
          }).catch(() => {});
        }
        broadcastDeal(conversation, updated.toObject());
      }
      result.expired += 1;
    } catch {
      result.failed += 1;
    }
  }

  const overdue = await Deal.find({
    status: { $in: MEETUP_STATUSES },
    "pickup.followup_due_at": { $lte: now },
    followup_sent_at: null,
  }).limit(batch);
  for (const deal of overdue) {
    try {
      const claim = await Deal.updateOne({ _id: deal._id, followup_sent_at: null }, { $set: { followup_sent_at: now } });
      if (!claim.modifiedCount) continue;
      // Already mid-confirmation: they've met, no need to ask.
      if (deal.done_request?.at) continue;
      const conversation = await loadConv(deal);
      if (!conversation) continue;
      const ends = deal.pickup?.expires_at ? fmtWhen(deal.pickup.expires_at, false) : null;
      await pushSystemMessage({
        conversation,
        senderId: conversation.seller_id,
        text: `Did you meet up? Finish the deal with the handover code, reschedule, or report a no-show from the deal card.${ends ? ` If nothing happens, the reservation ends on ${ends}.` : ""}`,
        deal,
      });
      const title = conversation.product_snapshot?.title || "the item";
      for (const recipientId of [conversation.buyer_id, conversation.seller_id]) {
        notifyDealEvent({
          recipientId,
          conversationId: conversation._id,
          title: "Did you meet up?",
          message: `Finish your deal for "${title}" in the chat, or reschedule if the meetup didn't happen.`,
          actionLabel: "Finish deal",
        }).catch(() => {});
      }
      result.followups += 1;
    } catch {
      result.failed += 1;
    }
  }

  return result;
};

/**
 * Step a deal back ONE stage (seller only: these are the seller's own
 * actions). Mistakes happen: wrong pickup, payment ticked too early, or the
 * reservation should be released without cancelling the whole thread.
 *
 *   payment_confirmed → pickup_scheduled   (payment not actually received)
 *   pickup_scheduled  → deal_confirmed     (pickup plan dropped)
 *   deal_confirmed    → negotiating        (reservation released, item free)
 *
 * Completed deals are final (the listing is already marked sold) and
 * cancelled deals restart with a new offer. The status flip is a single
 * conditional update on the expected stage, so two taps (or a race with the
 * buyer confirming) can never skip two stages.
 */
const REVERT_RULES = {
  [DEAL_STATUS.PAYMENT_CONFIRMED]: {
    to: DEAL_STATUS.PICKUP_SCHEDULED,
    update: { $set: { "payment_confirmed.is_confirmed": false, "payment_confirmed.confirmed_at": null } },
    text: "Seller marked the payment as not received yet.",
  },
  [DEAL_STATUS.PICKUP_SCHEDULED]: {
    to: DEAL_STATUS.DEAL_CONFIRMED,
    update: { $unset: { pickup: "", done_request: "", followup_sent_at: "" } },
    text: "Seller cleared the pickup plan. A new time will be set.",
  },
  [DEAL_STATUS.DEAL_CONFIRMED]: {
    to: DEAL_STATUS.NEGOTIATING,
    update: { $unset: { deal_confirmed_at: "", reserved_at: "", done_request: "", handover: "" } },
    text: "Seller reopened the deal. The item is no longer reserved.",
  },
};

// `from` is the stage the seller saw when tapping Undo. A double tap (or two
// tabs) then undoes one step, not two: the second request sees a newer stage.
export const revertDealStage = async ({ conversationId, userId, from }) => {
  const conversation = await loadConversation(conversationId);
  const role = roleOf(conversation, userId);
  if (role !== "seller") throw new AppError("Only the seller can undo a deal step", 403);

  const deal = await ensureDeal(conversation);
  if (deal.status === DEAL_STATUS.COMPLETED) {
    throw new AppError("Completed deals can't be undone", 400);
  }
  if (from && from !== deal.status) throw new AppError("This deal just changed. Refresh and try again.", 409);
  const rule = REVERT_RULES[deal.status];
  if (!rule) throw new AppError("There's no step to undo yet", 400);

  const updated = await Deal.findOneAndUpdate(
    { _id: deal._id, status: deal.status },
    { ...rule.update, $set: { ...(rule.update.$set || {}), status: rule.to } },
    { returnDocument: "after" },
  );
  if (!updated) throw new AppError("This deal just changed. Refresh and try again.", 409);

  // Released reservation: the chat list shows the listing's real price again.
  if (rule.to === DEAL_STATUS.NEGOTIATING) {
    const product = await Product.findById(conversation.product_id).select("selling_price").lean();
    if (product?.selling_price != null) {
      await Conversation.updateOne(
        { _id: conversation._id },
        { $set: { "product_snapshot.selling_price": product.selling_price } },
      );
    }
  }

  await pushSystemMessage({ conversation, senderId: userId, text: rule.text, deal: updated });
  broadcastDeal(conversation, updated.toObject());
  return updated;
};

/**
 * Cancel a deal before completion (either party, e.g. buyer ghosts or seller
 * re-lists). Frees the reservation so the orders page and chat fall back to
 * `cancelled` together. Completed deals are terminal and cannot be cancelled.
 */
export const cancelDeal = async ({ conversationId, userId, reason = "" }) => {
  const conversation = await loadConversation(conversationId);
  const cancellerRole = roleOf(conversation, userId); // participant check

  const deal = await ensureDeal(conversation);
  if (deal.status === DEAL_STATUS.COMPLETED) {
    throw new AppError("Completed deals cannot be cancelled", 400);
  }
  if (deal.status === DEAL_STATUS.CANCELLED) return deal;

  deal.offer_history.forEach((o) => {
    if (o.status === OFFER_STATUS.PENDING) o.status = OFFER_STATUS.EXPIRED;
  });
  deal.status = DEAL_STATUS.CANCELLED;
  deal.done_request = undefined;
  deal.cancelled_at = new Date();
  deal.cancellation_reason = String(reason || "").trim().slice(0, 300);
  await deal.save();

  await pushSystemMessage({
    conversation,
    senderId: userId,
    text: `${cancellerRole === "seller" ? "Seller" : "Buyer"} cancelled the deal. Item's back on the shelf.`,
    deal,
  });
  // Notify the other party about cancellation — fire-and-forget
  const cancellerUser = await User.findById(userId).select("name").lean();
  const cancelRecipient = otherPartyOf(conversation, userId);
  notifyDealCancelled({
    conversationId: conversation._id,
    productTitle: conversation.product_snapshot?.title || "the item",
    cancellerName: cancellerUser?.name || "The other party",
    recipientId: cancelRecipient,
  }).catch(() => {});
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
