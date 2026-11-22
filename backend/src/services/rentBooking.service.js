// Rent & Borrow bookings: one lend/share between two students.
//
//   lend:  pending → accepted → active (handed over) → completed (returned)
//   share: pending → accepted → completed (handed over)
//   any open stage can end as declined / cancelled / expired.
//
// The post owner accepts or declines. The lender confirms handover and return.
// Every transition is one conditional update on the expected `from` status, so
// two taps (or two people) can never both win.
import mongoose from "mongoose";
import RentPost from "../models/RentPost.model.js";
import RentBooking from "../models/RentBooking.model.js";
import RentProfile from "../models/RentProfile.model.js";
import Notification from "../models/Notification.model.js";
import {
  RENT_KIND,
  RENT_MODE,
  RENT_POST_STATUS,
  RENT_BOOKING_STATUS as S,
  RENT_LIMITS,
} from "../config/rent.js";
import { screenText } from "../utils/profanity.js";
import { deleteImageSafely } from "../utils/imagekit.js";
import { emitToUsers } from "../utils/socket.js";
import { notifyRent, notifyRentFanout } from "./notification.service.js";
import { rentError, requireCampusOf, peopleById } from "./rent.service.js";
import { bookingChatEvent, ensureBookingChat, postToBookingChat, sendBookingChatMessage } from "./rentChat.service.js";

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

const isId = (id) => mongoose.isValidObjectId(id);
const sameId = (a, b) => a != null && b != null && String(a) === String(b);
const firstName = (name) => String(name || "Someone").trim().split(/\s+/)[0];
const inr = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;
const bookingPath = (id) => `/rent/booking/${id}`;

// ---- Pricing / timing ----

// Requests are short needs: back 2h after the "needed by" time. Offers: 2h for hourly items, else a day.
const defaultReturnBy = (unit, now, neededBy = null) =>
  neededBy
    ? new Date(Math.max(new Date(neededBy).getTime(), now.getTime()) + 2 * HOUR)
    : new Date(now.getTime() + (unit === "hour" ? 2 * HOUR : DAY));

const resolveReturnBy = (value, unit, now = new Date(), neededBy = null) => {
  if (value == null) return defaultReturnBy(unit, now, neededBy);
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw rentError(400, "Invalid return time", "INVALID_RETURN_BY");
  if (date.getTime() < now.getTime() + 15 * 60 * 1000) {
    throw rentError(400, "Return time must be at least 15 minutes from now", "INVALID_RETURN_BY");
  }
  if (date.getTime() > now.getTime() + RENT_LIMITS.lendMaxDays * DAY) {
    throw rentError(400, `Lend for at most ${RENT_LIMITS.lendMaxDays} days`, "INVALID_RETURN_BY");
  }
  return date;
};

/** What the borrower pays the lender (offline). Per-hour/day prices use the booked span. */
export const estimateTotal = ({ amount, unit }, { quantity = 1, returnBy = null, now = new Date() } = {}) => {
  if (!amount || unit === "free") return 0;
  const span = returnBy ? Math.max(0, new Date(returnBy).getTime() - now.getTime()) : 0;
  if (unit === "hour") return amount * Math.max(1, Math.ceil(span / HOUR));
  if (unit === "day") return amount * Math.max(1, Math.ceil(span / DAY));
  return amount * Math.max(1, quantity);
};

// ---- Client shape ----

const roleOf = (booking, userId) => (sameId(booking.lender_id, userId) ? "lender" : "borrower");

export const actionsFor = (booking, userId, now = new Date()) => {
  const isOwner = sameId(booking.owner_id, userId);
  const isLender = sameId(booking.lender_id, userId);
  const role = isLender ? "lender" : "borrower";
  const actions = [];
  switch (booking.status) {
    case S.PENDING:
      if (isOwner) actions.push("accept", "decline");
      else actions.push("cancel");
      break;
    case S.ACCEPTED:
      if (isLender) actions.push("handover");
      actions.push("cancel");
      break;
    case S.ACTIVE:
      if (isLender) actions.push("return");
      break;
    case S.COMPLETED: {
      const mine = role === "lender" ? booking.ratings?.by_lender : booking.ratings?.by_borrower;
      if (!mine?.stars) actions.push("rate");
      break;
    }
    default:
      break;
  }
  if (booking.is_open || (booking.status === S.COMPLETED && now - new Date(booking.completed_at || 0) < 3 * DAY)) {
    actions.push("message");
  }
  return actions;
};

export const toClientBooking = (booking, userId, { people = new Map(), withMessages = false } = {}) => {
  const role = roleOf(booking, userId);
  const counterpartId = role === "lender" ? booking.borrower_id : booking.lender_id;
  const now = new Date();
  const mineRating = role === "lender" ? booking.ratings?.by_lender : booking.ratings?.by_borrower;
  const theirRating = role === "lender" ? booking.ratings?.by_borrower : booking.ratings?.by_lender;
  const lastMessage = booking.messages?.length ? booking.messages[booking.messages.length - 1] : null;
  return {
    id: String(booking._id),
    postId: String(booking.post_id),
    kind: booking.kind,
    mode: booking.mode,
    status: booking.status,
    isOpen: booking.is_open,
    role,
    isOwner: sameId(booking.owner_id, userId),
    post: {
      title: booking.post_snapshot?.title,
      image: booking.post_snapshot?.image || null,
      block: booking.post_snapshot?.block || null,
      price: booking.post_snapshot?.price || { amount: 0, unit: "free" },
      deposit: booking.post_snapshot?.deposit || 0,
    },
    quantity: booking.quantity,
    agreedPrice: booking.agreed_price,
    note: booking.note || "",
    returnBy: booking.return_by,
    overdue: booking.status === S.ACTIVE && booking.return_by && new Date(booking.return_by) < now,
    createdAt: booking.createdAt,
    acceptedAt: booking.accepted_at,
    handedOverAt: booking.handed_over_at,
    returnedAt: booking.returned_at,
    completedAt: booking.completed_at,
    closedAt: booking.closed_at,
    closeReason: booking.close_reason,
    counterpart: people.get(String(counterpartId)) || { id: String(counterpartId), name: "Student" },
    myRating: mineRating?.stars || null,
    theirRating: theirRating?.stars || null,
    actions: actionsFor(booking, userId, now),
    conversationId: booking.conversation_id ? String(booking.conversation_id) : null,
    messageCount: booking.messages?.length || 0,
    lastMessage: lastMessage ? { text: lastMessage.text, at: lastMessage.at, mine: sameId(lastMessage.sender_id, userId) } : null,
    ...(withMessages
      ? {
          messages: (booking.messages || []).map((m) => ({
            id: String(m._id),
            text: m.text,
            at: m.at,
            mine: sameId(m.sender_id, userId),
          })),
        }
      : {}),
  };
};

const broadcast = (booking) =>
  emitToUsers([String(booking.lender_id), String(booking.borrower_id)], "rent:booking", {
    bookingId: String(booking._id),
    postId: String(booking.post_id),
    status: booking.status,
  });

const toDetail = async (booking, userId) => {
  const people = await peopleById([booking.lender_id, booking.borrower_id]);
  return toClientBooking(booking, userId, { people, withMessages: true });
};

/** Explains why a guarded update matched nothing: 404 for strangers, 409 for stale state. */
const staleOr404 = async (bookingId, userId) => {
  const exists = await RentBooking.findOne({
    _id: bookingId,
    $or: [{ lender_id: userId }, { borrower_id: userId }],
  })
    .select("status")
    .lean();
  if (!exists) return rentError(404, "Booking not found", "RENT_BOOKING_NOT_FOUND");
  return rentError(409, `This booking is already ${exists.status}. Refresh to see the latest.`, "RENT_BOOKING_STALE");
};

const closeFields = (status, reason, by = null, now = new Date()) => ({
  status,
  is_open: false,
  closed_at: now,
  close_reason: reason,
  closed_by: by,
});

// ---- Create ----

export const createBooking = async (user, postId, input = {}) => {
  if (!isId(postId)) throw rentError(404, "Post not found", "RENT_POST_NOT_FOUND");
  const campusId = requireCampusOf(user);
  const now = new Date();
  const post = await RentPost.findById(postId).lean();
  if (!post || post.status === RENT_POST_STATUS.DELETED || post.status === RENT_POST_STATUS.HIDDEN || !sameId(post.campus_id, campusId)) {
    throw rentError(404, "Post not found", "RENT_POST_NOT_FOUND");
  }
  if (sameId(post.owner_id, user._id)) throw rentError(400, "This is your own post", "RENT_OWN_POST");
  if (post.status !== RENT_POST_STATUS.ACTIVE) {
    throw rentError(409, "This post isn't taking requests right now", "RENT_POST_UNAVAILABLE");
  }
  if (post.kind === RENT_KIND.REQUEST && (!post.needed_by || post.needed_by <= now)) {
    throw rentError(409, "This request has expired", "RENT_POST_EXPIRED");
  }
  if (post.kind === RENT_KIND.OFFER && post.available_until && post.available_until <= now) {
    throw rentError(409, "This offer is no longer available", "RENT_POST_EXPIRED");
  }

  const openCount = await RentBooking.countDocuments({
    $or: [{ lender_id: user._id }, { borrower_id: user._id }],
    is_open: true,
  });
  if (openCount >= RENT_LIMITS.openBookingsPerUser) {
    throw rentError(429, "You have too many open bookings. Finish some first.", "RENT_BOOKING_LIMIT");
  }

  const isOffer = post.kind === RENT_KIND.OFFER;
  const isShare = post.mode === RENT_MODE.SHARE;
  const lenderId = isOffer ? post.owner_id : user._id;
  const borrowerId = isOffer ? user._id : post.owner_id;

  let quantity = 1;
  if (isShare) {
    quantity = isOffer ? Math.min(Math.max(input.quantity || 1, 1), post.quantity || 1) : post.quantity || 1;
  }

  let price = { amount: post.price?.amount || 0, unit: post.price?.unit || "free" };
  // A helper answering a request may quote their own per-unit price.
  if (!isOffer && input.price !== undefined) {
    const amount = Math.round(input.price);
    const unit = price.unit !== "free" ? price.unit : isShare ? "item" : "use";
    price = amount > 0 ? { amount, unit } : { amount: 0, unit: "free" };
  }

  const returnBy = isShare ? null : resolveReturnBy(input.return_by, price.unit, now, isOffer ? null : post.needed_by);
  const note = (input.note || "").trim();
  if (note && screenText(note).flagged) throw rentError(400, "Please keep the note respectful", "RENT_TEXT_BLOCKED");

  let booking;
  try {
    booking = await RentBooking.create({
      post_id: post._id,
      campus_id: post.campus_id,
      kind: post.kind,
      mode: post.mode,
      owner_id: post.owner_id,
      requester_id: user._id,
      lender_id: lenderId,
      borrower_id: borrowerId,
      post_snapshot: {
        title: post.title,
        image: post.images?.[0]?.url || null,
        block: post.block || null,
        price,
        deposit: isShare ? 0 : post.deposit || 0,
      },
      quantity,
      agreed_price: estimateTotal(price, { quantity, returnBy, now }),
      note,
      return_by: returnBy,
    });
  } catch (error) {
    if (error?.code === 11000) {
      throw rentError(409, "You already have an open booking for this post", "RENT_BOOKING_EXISTS");
    }
    throw error;
  }

  const name = firstName(user.name);
  notifyRent({
    userId: post.owner_id,
    title: isOffer ? (isShare ? "Someone wants your item" : "New borrow request") : "Someone can help!",
    message: isOffer
      ? `${name} wants ${isShare && quantity > 1 ? `${quantity} × ` : ""}"${post.title}"${booking.agreed_price ? ` for ${inr(booking.agreed_price)}` : ""}. Accept or decline.`
      : `${name} can ${isShare ? "give" : "lend"} you "${post.title}"${booking.agreed_price ? ` for ${inr(booking.agreed_price)}` : ""}.`,
    actionUrl: bookingPath(booking._id),
    actionLabel: "Review",
    imageUrl: post.images?.[0]?.url || null,
  }).catch(() => {});
  broadcast(booking);

  // The thread in the main chat inbox opens with the request (+ the note).
  const verb = isOffer ? (isShare ? "asked for" : "asked to borrow") : `offered to ${isShare ? "give" : "lend"}`;
  const terms = booking.agreed_price ? ` · ${inr(booking.agreed_price)}` : " · free";
  const conversation = await bookingChatEvent(booking, user._id, `${name} ${verb} “${post.title}”${terms}`);
  if (conversation && note) await postToBookingChat(booking, { senderId: user._id, text: note, system: false }).catch(() => null);

  return toDetail({ ...booking.toObject(), conversation_id: conversation?._id || null }, user._id);
};

// ---- Owner decides ----

// Reserve the post for the accepted booking. Returns false when it's no longer available.
const reservePost = async (booking) => {
  const { post_id: postId, kind, mode, quantity, return_by: returnBy } = booking;
  if (kind === RENT_KIND.REQUEST) {
    const res = await RentPost.updateOne(
      { _id: postId, status: RENT_POST_STATUS.ACTIVE },
      { $set: { status: RENT_POST_STATUS.FULFILLED } },
    );
    return { ok: res.modifiedCount > 0, exhausted: true };
  }
  if (mode === RENT_MODE.LEND) {
    const res = await RentPost.updateOne(
      { _id: postId, status: RENT_POST_STATUS.ACTIVE },
      { $set: { status: RENT_POST_STATUS.LENT_OUT, lent_until: returnBy } },
    );
    return { ok: res.modifiedCount > 0, exhausted: true };
  }
  const post = await RentPost.findOneAndUpdate(
    { _id: postId, status: RENT_POST_STATUS.ACTIVE, quantity: { $gte: quantity } },
    { $inc: { quantity: -quantity } },
    { returnDocument: "after" },
  ).lean();
  if (!post) return { ok: false, exhausted: false };
  if (post.quantity <= 0) {
    await RentPost.updateOne(
      { _id: postId, status: RENT_POST_STATUS.ACTIVE, quantity: { $lte: 0 } },
      { $set: { status: RENT_POST_STATUS.FULFILLED } },
    );
    return { ok: true, exhausted: true };
  }
  return { ok: true, exhausted: false };
};

// Undo reservePost when an accepted booking is cancelled before handover.
const releasePost = async (booking) => {
  const { post_id: postId, kind, mode, quantity } = booking;
  if (kind === RENT_KIND.REQUEST) {
    const post = await RentPost.findById(postId).select("needed_by").lean();
    const stillNeeded = post?.needed_by && post.needed_by > new Date();
    await RentPost.updateOne(
      { _id: postId, status: RENT_POST_STATUS.FULFILLED },
      { $set: { status: stillNeeded ? RENT_POST_STATUS.ACTIVE : RENT_POST_STATUS.EXPIRED } },
    );
    return;
  }
  if (mode === RENT_MODE.LEND) {
    await RentPost.updateOne(
      { _id: postId, status: RENT_POST_STATUS.LENT_OUT },
      { $set: { status: RENT_POST_STATUS.ACTIVE, lent_until: null } },
    );
    return;
  }
  const res = await RentPost.updateOne(
    { _id: postId, status: { $in: [RENT_POST_STATUS.ACTIVE, RENT_POST_STATUS.FULFILLED] } },
    { $inc: { quantity }, $set: { status: RENT_POST_STATUS.ACTIVE } },
  );
  if (!res.modifiedCount) {
    await RentPost.updateOne({ _id: postId, status: { $ne: RENT_POST_STATUS.DELETED } }, { $inc: { quantity } });
  }
};

export const acceptBooking = async (user, bookingId) => {
  if (!isId(bookingId)) throw rentError(404, "Booking not found", "RENT_BOOKING_NOT_FOUND");
  const now = new Date();
  const booking = await RentBooking.findOneAndUpdate(
    { _id: bookingId, owner_id: user._id, status: S.PENDING },
    { $set: { status: S.ACCEPTED, accepted_at: now } },
    { returnDocument: "after" },
  ).lean();
  if (!booking) throw await staleOr404(bookingId, user._id);

  const reserved = await reservePost(booking);
  if (!reserved.ok) {
    await RentBooking.updateOne({ _id: booking._id, status: S.ACCEPTED }, { $set: { status: S.PENDING, accepted_at: null } });
    throw rentError(409, "This item is no longer available for this booking", "RENT_POST_UNAVAILABLE");
  }

  // One winner: everyone else waiting on this post hears "not this time".
  if (reserved.exhausted) {
    const others = await RentBooking.find({ post_id: booking.post_id, status: S.PENDING, _id: { $ne: booking._id } })
      .select("requester_id")
      .lean();
    if (others.length) {
      await RentBooking.updateMany(
        { _id: { $in: others.map((b) => b._id) }, status: S.PENDING },
        { $set: closeFields(S.DECLINED, "another_accepted", null, now) },
      );
      notifyRentFanout({
        recipientIds: others.map((b) => b.requester_id),
        title: "Not this time",
        message: `"${booking.post_snapshot.title}" went to someone else. Check the board for more.`,
        actionUrl: "/rent",
        actionLabel: "Browse",
      }).catch(() => {});
      for (const other of others) {
        emitToUsers([String(other.requester_id)], "rent:booking", { bookingId: String(other._id), status: S.DECLINED });
      }
    }
  }

  notifyRent({
    userId: booking.requester_id,
    title: "Accepted 🎉",
    message: `${firstName(user.name)} accepted "${booking.post_snapshot.title}". Chat to fix the handover.`,
    actionUrl: bookingPath(booking._id),
    actionLabel: "Open",
  }).catch(() => {});
  broadcast(booking);
  await bookingChatEvent(booking, user._id, `${firstName(user.name)} accepted. Sort out the handover here.`);
  return toDetail(booking, user._id);
};

export const declineBooking = async (user, bookingId, reason = "") => {
  if (!isId(bookingId)) throw rentError(404, "Booking not found", "RENT_BOOKING_NOT_FOUND");
  const booking = await RentBooking.findOneAndUpdate(
    { _id: bookingId, owner_id: user._id, status: S.PENDING },
    { $set: closeFields(S.DECLINED, reason || "declined", user._id) },
    { returnDocument: "after" },
  ).lean();
  if (!booking) throw await staleOr404(bookingId, user._id);
  notifyRent({
    userId: booking.requester_id,
    title: "Declined",
    message: `"${booking.post_snapshot.title}" was declined.${reason ? ` Reason: ${reason}` : ""}`,
    actionUrl: "/rent",
    actionLabel: "Browse",
  }).catch(() => {});
  broadcast(booking);
  await bookingChatEvent(booking, user._id, `${firstName(user.name)} declined the request.`);
  return toDetail(booking, user._id);
};

export const cancelBooking = async (user, bookingId, reason = "") => {
  if (!isId(bookingId)) throw rentError(404, "Booking not found", "RENT_BOOKING_NOT_FOUND");
  const before = await RentBooking.findOneAndUpdate(
    {
      _id: bookingId,
      status: { $in: [S.PENDING, S.ACCEPTED] },
      $or: [{ lender_id: user._id }, { borrower_id: user._id }],
    },
    { $set: closeFields(S.CANCELLED, reason || "cancelled", user._id) },
    { returnDocument: "before" },
  ).lean();
  if (!before) throw await staleOr404(bookingId, user._id);
  if (before.status === S.ACCEPTED) await releasePost(before);

  const booking = { ...before, ...closeFields(S.CANCELLED, reason || "cancelled", user._id) };
  const otherId = sameId(before.lender_id, user._id) ? before.borrower_id : before.lender_id;
  notifyRent({
    userId: otherId,
    title: "Booking cancelled",
    message: `${firstName(user.name)} cancelled "${before.post_snapshot.title}".${reason ? ` Reason: ${reason}` : ""}`,
    actionUrl: bookingPath(before._id),
  }).catch(() => {});
  broadcast(booking);
  await bookingChatEvent(booking, user._id, `${firstName(user.name)} cancelled the booking.`);
  return toDetail(booking, user._id);
};

// ---- Lender confirms ----

const recordCompletion = async (booking) => {
  const statKey = booking.mode === RENT_MODE.SHARE ? "stats.shared" : "stats.lent";
  await Promise.all([
    RentProfile.updateOne(
      { user_id: booking.lender_id },
      { $inc: { [statKey]: 1, "stats.earned_total": booking.agreed_price || 0 }, $setOnInsert: { campus_id: booking.campus_id } },
      { upsert: true },
    ),
    RentProfile.updateOne(
      { user_id: booking.borrower_id },
      { $inc: { "stats.borrowed": 1 }, $setOnInsert: { campus_id: booking.campus_id } },
      { upsert: true },
    ),
  ]);
};

export const confirmHandover = async (user, bookingId) => {
  if (!isId(bookingId)) throw rentError(404, "Booking not found", "RENT_BOOKING_NOT_FOUND");
  const now = new Date();
  const current = await RentBooking.findOne({ _id: bookingId, lender_id: user._id, status: S.ACCEPTED })
    .select("mode")
    .lean();
  if (!current) throw await staleOr404(bookingId, user._id);

  const isShare = current.mode === RENT_MODE.SHARE;
  const $set = isShare
    ? { status: S.COMPLETED, handed_over_at: now, completed_at: now, is_open: false, closed_at: now, close_reason: "completed" }
    : { status: S.ACTIVE, handed_over_at: now };
  const booking = await RentBooking.findOneAndUpdate(
    { _id: bookingId, lender_id: user._id, status: S.ACCEPTED },
    { $set },
    { returnDocument: "after" },
  ).lean();
  if (!booking) throw await staleOr404(bookingId, user._id);

  if (isShare) await recordCompletion(booking);
  const pay = booking.agreed_price ? ` Pay ${inr(booking.agreed_price)} by UPI or cash.` : "";
  notifyRent({
    userId: booking.borrower_id,
    title: isShare ? "Handed over ✅" : "Enjoy! 🙌",
    message: isShare
      ? `${firstName(user.name)} marked "${booking.post_snapshot.title}" as handed over.${pay} Rate the exchange.`
      : `You have "${booking.post_snapshot.title}". Return it by ${new Date(booking.return_by).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" })}.${pay}`,
    actionUrl: bookingPath(booking._id),
  }).catch(() => {});
  broadcast(booking);
  await bookingChatEvent(
    booking,
    user._id,
    isShare
      ? `${firstName(user.name)} handed it over. All done.`
      : `${firstName(user.name)} handed it over. Back by ${new Date(booking.return_by).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" })}.`,
  );
  return toDetail(booking, user._id);
};

export const confirmReturn = async (user, bookingId) => {
  if (!isId(bookingId)) throw rentError(404, "Booking not found", "RENT_BOOKING_NOT_FOUND");
  const now = new Date();
  const booking = await RentBooking.findOneAndUpdate(
    { _id: bookingId, lender_id: user._id, status: S.ACTIVE },
    { $set: { status: S.COMPLETED, returned_at: now, completed_at: now, is_open: false, closed_at: now, close_reason: "completed" } },
    { returnDocument: "after" },
  ).lean();
  if (!booking) throw await staleOr404(bookingId, user._id);

  if (booking.kind === RENT_KIND.OFFER) {
    await RentPost.updateOne(
      { _id: booking.post_id, status: RENT_POST_STATUS.LENT_OUT },
      { $set: { status: RENT_POST_STATUS.ACTIVE, lent_until: null } },
    );
  }
  await recordCompletion(booking);
  notifyRent({
    userId: booking.borrower_id,
    title: "Returned ✅",
    message: `${firstName(user.name)} got "${booking.post_snapshot.title}" back. Thanks for returning it! Rate the exchange.`,
    actionUrl: bookingPath(booking._id),
    actionLabel: "Rate",
  }).catch(() => {});
  broadcast(booking);
  await bookingChatEvent(booking, user._id, `${firstName(user.name)} got it back. Booking complete.`);
  return toDetail(booking, user._id);
};

// ---- After ----

export const rateBooking = async (user, bookingId, stars) => {
  if (!isId(bookingId)) throw rentError(404, "Booking not found", "RENT_BOOKING_NOT_FOUND");
  const current = await RentBooking.findOne({
    _id: bookingId,
    $or: [{ lender_id: user._id }, { borrower_id: user._id }],
  }).lean();
  if (!current) throw rentError(404, "Booking not found", "RENT_BOOKING_NOT_FOUND");
  if (current.status !== S.COMPLETED) throw rentError(409, "You can rate once the booking is complete", "RENT_NOT_COMPLETE");

  const isLender = sameId(current.lender_id, user._id);
  const field = isLender ? "by_lender" : "by_borrower";
  const targetId = isLender ? current.borrower_id : current.lender_id;
  const booking = await RentBooking.findOneAndUpdate(
    { _id: bookingId, status: S.COMPLETED, [`ratings.${field}.stars`]: { $exists: false } },
    { $set: { [`ratings.${field}`]: { stars, at: new Date() } } },
    { returnDocument: "after" },
  ).lean();
  if (!booking) throw rentError(409, "You've already rated this booking", "RENT_ALREADY_RATED");

  await RentProfile.updateOne(
    { user_id: targetId },
    { $inc: { "stats.rating_sum": stars, "stats.rating_count": 1 }, $setOnInsert: { campus_id: booking.campus_id } },
    { upsert: true },
  );
  broadcast(booking);
  return toDetail(booking, user._id);
};

/** Messages now live in the main chat inbox; this posts into the booking's thread there. */
export const addMessage = async (user, bookingId, text) => {
  if (!isId(bookingId)) throw rentError(404, "Booking not found", "RENT_BOOKING_NOT_FOUND");
  const booking = await RentBooking.findOne({
    _id: bookingId,
    $or: [{ lender_id: user._id }, { borrower_id: user._id }],
  })
    .select("-messages")
    .lean();
  if (!booking) throw rentError(404, "Booking not found", "RENT_BOOKING_NOT_FOUND");
  const clean = String(text || "").trim();
  if (!clean) throw rentError(400, "Type a message", "RENT_EMPTY_MESSAGE");
  return sendBookingChatMessage(booking, user._id, clean);
};

// ---- Reads ----

export const getBooking = async (user, bookingId) => {
  if (!isId(bookingId)) throw rentError(404, "Booking not found", "RENT_BOOKING_NOT_FOUND");
  const booking = await RentBooking.findOne({
    _id: bookingId,
    $or: [{ lender_id: user._id }, { borrower_id: user._id }],
  }).lean();
  if (!booking) throw rentError(404, "Booking not found", "RENT_BOOKING_NOT_FOUND");
  if (!booking.conversation_id) {
    const conversation = await ensureBookingChat(booking).catch(() => null);
    if (conversation) booking.conversation_id = conversation._id;
  }
  const detail = await toDetail(booking, user._id);
  const post = await RentPost.findById(booking.post_id).select("status block deposit").lean();
  detail.postStatus = post?.status || RENT_POST_STATUS.DELETED;
  return detail;
};

export const listBookings = async (user, query = {}) => {
  const role = query.role === "lending" ? "lending" : query.role === "borrowing" ? "borrowing" : "all";
  const match =
    role === "lending"
      ? { lender_id: user._id }
      : role === "borrowing"
        ? { borrower_id: user._id }
        : { $or: [{ lender_id: user._id }, { borrower_id: user._id }] };
  if (query.state === "open") match.is_open = true;
  if (query.state === "closed") match.is_open = false;

  const bookings = await RentBooking.find(match)
    .sort({ is_open: -1, updatedAt: -1 })
    .limit(60)
    .slice("messages", -1)
    .lean();
  const people = await peopleById(bookings.flatMap((b) => [b.lender_id, b.borrower_id]));
  return bookings.map((b) => toClientBooking(b, user._id, { people }));
};

// ---- Account deletion (userDeletion.service) ----

/**
 * Removes everything Rent & Borrow holds about a user: their posts (and the
 * bookings on them), bookings they're part of, and their rent profile.
 * Items reserved for them on other people's posts are released first, and
 * those owners are told. Never throws into the caller.
 */
export const purgeRentDataForUser = async (userId) => {
  const uid = new mongoose.Types.ObjectId(String(userId));
  const posts = await RentPost.find({ owner_id: uid }).select("_id images").lean();
  const postIds = posts.map((p) => p._id);

  const reserved = await RentBooking.find({
    status: { $in: [S.ACCEPTED, S.ACTIVE] },
    $or: [{ lender_id: uid }, { borrower_id: uid }],
    ...(postIds.length ? { post_id: { $nin: postIds } } : {}),
  }).lean();
  for (const booking of reserved) {
    await releasePost(booking);
    notifyRent({
      userId: booking.owner_id,
      title: "Booking closed",
      message: `The other person's account was deleted, so "${booking.post_snapshot?.title}" is back on the board.`,
      actionUrl: `/rent/${booking.post_id}`,
    }).catch(() => {});
  }

  await Promise.all([
    RentBooking.deleteMany({ $or: [{ lender_id: uid }, { borrower_id: uid }, ...(postIds.length ? [{ post_id: { $in: postIds } }] : [])] }),
    RentPost.deleteMany({ owner_id: uid }),
    RentProfile.deleteMany({ user_id: uid }),
    RentPost.updateMany({ "reports.user_id": uid }, { $pull: { reports: { user_id: uid } } }),
  ]);
  await Promise.allSettled(
    posts.flatMap((p) => (p.images || []).filter((img) => img.fileId).map((img) => deleteImageSafely(img.fileId, { ownerId: uid }))),
  );
  return { posts: postIds.length, released: reserved.length };
};

// ---- Sweeps (jobs/rent.job.js) ----

export const sweepRent = async (now = new Date()) => {
  // 1. Requests past "needed by".
  const stale = await RentPost.find({ kind: RENT_KIND.REQUEST, status: RENT_POST_STATUS.ACTIVE, needed_by: { $lte: now } })
    .select("_id")
    .limit(1000)
    .lean();
  const requestIds = stale.map((p) => p._id);
  let expiredRequests = 0;
  if (requestIds.length) {
    const res = await RentPost.updateMany(
      { _id: { $in: requestIds }, status: RENT_POST_STATUS.ACTIVE },
      { $set: { status: RENT_POST_STATUS.EXPIRED } },
    );
    expiredRequests = res.modifiedCount;
  }

  // 1b. Offers past "available until" (lent-out ones wait until they're back).
  const ended = await RentPost.find({
    kind: RENT_KIND.OFFER,
    status: { $in: [RENT_POST_STATUS.ACTIVE, RENT_POST_STATUS.PAUSED] },
    available_until: { $ne: null, $lte: now },
  })
    .select("_id")
    .limit(1000)
    .lean();
  const offerIds = ended.map((p) => p._id);
  let expiredOffers = 0;
  if (offerIds.length) {
    const res = await RentPost.updateMany(
      { _id: { $in: offerIds }, status: { $in: [RENT_POST_STATUS.ACTIVE, RENT_POST_STATUS.PAUSED] } },
      { $set: { status: RENT_POST_STATUS.EXPIRED } },
    );
    expiredOffers = res.modifiedCount;
  }
  const staleIds = [...requestIds, ...offerIds];

  // 2. Pending bookings nobody answered (or whose request just expired).
  const cutoff = new Date(now.getTime() - RENT_LIMITS.pendingBookingHours * HOUR);
  const pending = await RentBooking.find({
    status: S.PENDING,
    $or: [{ createdAt: { $lte: cutoff } }, ...(staleIds.length ? [{ post_id: { $in: staleIds } }] : [])],
  })
    .select("requester_id post_snapshot.title")
    .limit(1000)
    .lean();
  let expiredBookings = 0;
  if (pending.length) {
    const res = await RentBooking.updateMany(
      { _id: { $in: pending.map((b) => b._id) }, status: S.PENDING },
      { $set: closeFields(S.EXPIRED, "no_reply", null, now) },
    );
    expiredBookings = res.modifiedCount;
    for (const b of pending.slice(0, 200)) {
      notifyRent({
        userId: b.requester_id,
        title: "Request expired",
        message: `No reply on "${b.post_snapshot?.title || "your request"}" in time. Try someone else on the board.`,
        actionUrl: "/rent",
        actionLabel: "Browse",
      }).catch(() => {});
    }
  }

  // 3. One nudge when a lent item is overdue.
  const overdue = await RentBooking.find({
    status: S.ACTIVE,
    mode: RENT_MODE.LEND,
    return_by: { $lte: now },
    reminded_overdue_at: null,
  })
    .select("lender_id borrower_id post_snapshot.title")
    .limit(200)
    .lean();
  let overdueReminders = 0;
  for (const b of overdue) {
    const res = await RentBooking.updateOne({ _id: b._id, reminded_overdue_at: null }, { $set: { reminded_overdue_at: now } });
    if (!res.modifiedCount) continue;
    overdueReminders++;
    notifyRent({
      userId: b.borrower_id,
      title: "Time to return ⏰",
      message: `"${b.post_snapshot?.title}" was due back. Please return it and message the owner.`,
      actionUrl: bookingPath(b._id),
    }).catch(() => {});
    notifyRent({
      userId: b.lender_id,
      title: "Item overdue",
      message: `"${b.post_snapshot?.title}" is past its return time. We've reminded the borrower.`,
      actionUrl: bookingPath(b._id),
    }).catch(() => {});
  }

  return { expiredRequests, expiredOffers, expiredBookings, overdueReminders };
};
