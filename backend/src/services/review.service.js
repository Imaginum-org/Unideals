import mongoose from "mongoose";
import Review from "../models/Review.model.js";
import Deal from "../models/deal.model.js";
import Conversation from "../models/conversation.model.js";
import User from "../models/User.model.js";
import { DEAL_STATUS } from "../config/constants.js";
import { AppError } from "../utils/appError.js";

/*
 * Two-way deal ratings. Once a deal completes, the buyer rates the seller
 * and the seller rates the buyer, once each. The app asks both sides with a
 * popup that can't be dismissed until they've rated (GET /api/reviews/pending).
 * A user's average and count over every rating they've received (as buyer
 * or seller) are denormalised onto User.rating so cards and profiles read
 * them for free.
 *
 * Legacy rows (written before two-way ratings) have no reviewer fields and
 * are all buyer → seller; the filters below treat them that way.
 */

// Only deals completed this recently are asked for in the popup, so the
// feature going live doesn't ask people about every deal they ever made.
export const PENDING_WINDOW_DAYS = 30;
const PENDING_LIMIT = 5;

const oid = (v) => new mongoose.Types.ObjectId(String(v));
const clean = (s) => String(s || "").replace(/\s+/g, " ").trim().slice(0, 300);

// Reviews this user received / wrote, including legacy buyer → seller rows.
const receivedBy = (id) => ({ $or: [{ reviewee_id: id }, { reviewee_id: { $exists: false }, seller_id: id }] });
const writtenBy = (id) => ({ $or: [{ reviewer_id: id }, { reviewer_id: { $exists: false }, buyer_id: id }] });

export const recomputeUserRating = async (userId) => {
  const [agg] = await Review.aggregate([
    { $match: receivedBy(oid(userId)) },
    { $group: { _id: null, avg: { $avg: "$rating" }, count: { $sum: 1 } } },
  ]);
  const rating = { avg: agg ? Math.round(agg.avg * 10) / 10 : 0, count: agg?.count || 0 };
  await User.updateOne({ _id: userId }, { $set: { rating } });
  return rating;
};
// Older name, still used by account deletion.
export const recomputeSellerRating = recomputeUserRating;

// Before two-way ratings deal_id alone was unique. Databases that haven't
// run `npm run indexes` yet still have that index and would refuse the
// second side's review; drop it once, then retry.
let legacyIndexDropped = false;
const isLegacyDealIndex = (err) =>
  err?.code === 11000 && err?.keyPattern && Object.keys(err.keyPattern).join() === "deal_id";

export const createReview = async ({ conversationId, userId, rating, comment }) => {
  const stars = Number(rating);
  if (!Number.isInteger(stars) || stars < 1 || stars > 5) throw new AppError("Pick a rating from 1 to 5 stars", 400);
  if (!mongoose.isValidObjectId(conversationId)) throw new AppError("Invalid conversation", 400);

  const conversation = await Conversation.findById(conversationId).select("buyer_id seller_id product_id product_snapshot").lean();
  if (!conversation) throw new AppError("Conversation not found", 404);
  const me = String(userId);
  const isBuyer = String(conversation.buyer_id) === me;
  const isSeller = String(conversation.seller_id) === me;
  if (!isBuyer && !isSeller) throw new AppError("Only the buyer or seller can rate this deal", 403);

  const deal = await Deal.findOne({ conversation_id: conversation._id }).select("_id status").lean();
  if (!deal || deal.status !== DEAL_STATUS.COMPLETED) throw new AppError("You can rate once the deal is complete", 400);

  const revieweeId = isBuyer ? conversation.seller_id : conversation.buyer_id;
  const already = await Review.exists({ deal_id: deal._id, ...writtenBy(oid(me)) });
  if (already) throw new AppError("You have already rated this deal", 409);

  const doc = {
    deal_id: deal._id,
    conversation_id: conversation._id,
    product_id: conversation.product_id || null,
    product_title: conversation.product_snapshot?.title || "",
    seller_id: conversation.seller_id,
    buyer_id: conversation.buyer_id,
    reviewer_id: userId,
    reviewee_id: revieweeId,
    reviewer_role: isBuyer ? "buyer" : "seller",
    rating: stars,
    comment: clean(comment),
  };

  let review;
  try {
    review = await Review.create(doc);
  } catch (err) {
    if (isLegacyDealIndex(err) && !legacyIndexDropped) {
      legacyIndexDropped = true;
      await Review.collection.dropIndex("deal_id_1").catch(() => {});
      review = await Review.create(doc).catch((e) => {
        if (e?.code === 11000) throw new AppError("You have already rated this deal", 409);
        throw e;
      });
    } else if (err?.code === 11000) {
      throw new AppError("You have already rated this deal", 409);
    } else {
      throw err;
    }
  }
  const revieweeRating = await recomputeUserRating(revieweeId);
  // sellerRating kept for older clients that read it after rating a seller.
  return { review, rating: revieweeRating, ...(isBuyer ? { sellerRating: revieweeRating } : {}) };
};

/**
 * Completed deals (last PENDING_WINDOW_DAYS days) this user still has to
 * rate, oldest first. Drives the rating popup on the client.
 */
export const getPendingReviews = async (userId) => {
  const me = oid(userId);
  const conversations = await Conversation.find({ $or: [{ buyer_id: me }, { seller_id: me }] })
    .select("buyer_id seller_id product_snapshot")
    .lean();
  if (!conversations.length) return [];

  const since = new Date(Date.now() - PENDING_WINDOW_DAYS * 864e5);
  const deals = await Deal.find({
    conversation_id: { $in: conversations.map((c) => c._id) },
    status: DEAL_STATUS.COMPLETED,
    completed_at: { $gte: since },
  })
    .select("_id conversation_id completed_at current_price")
    .sort({ completed_at: 1 })
    .lean();
  if (!deals.length) return [];

  const rated = new Set(
    (await Review.find({ deal_id: { $in: deals.map((d) => d._id) }, ...writtenBy(me) }).select("deal_id").lean())
      .map((r) => String(r.deal_id)),
  );
  const convById = new Map(conversations.map((c) => [String(c._id), c]));
  const todo = deals
    .filter((d) => !rated.has(String(d._id)))
    .map((d) => {
      const c = convById.get(String(d.conversation_id));
      const isBuyer = String(c.buyer_id) === String(me);
      return { deal: d, conversation: c, role: isBuyer ? "buyer" : "seller", otherId: isBuyer ? c.seller_id : c.buyer_id };
    });
  if (!todo.length) return [];

  // Skip deals whose other side has deleted their account: nobody to rate.
  const others = await User.find({ _id: { $in: todo.map((t) => t.otherId) } })
    .select("name avatar is_college_verified")
    .lean();
  const otherById = new Map(others.map((u) => [String(u._id), u]));

  return todo
    .filter((t) => otherById.has(String(t.otherId)))
    .slice(0, PENDING_LIMIT)
    .map(({ deal, conversation, role, otherId }) => {
      const other = otherById.get(String(otherId));
      return {
        dealId: deal._id,
        conversationId: conversation._id,
        role,
        completedAt: deal.completed_at,
        price: deal.current_price ?? conversation.product_snapshot?.selling_price ?? null,
        product: {
          title: conversation.product_snapshot?.title || "",
          image: conversation.product_snapshot?.image || null,
        },
        otherParty: {
          _id: other._id,
          name: other.name,
          avatar: other.avatar,
          is_college_verified: Boolean(other.is_college_verified),
        },
      };
    });
};

// Average, count, 5→1 distribution and the latest reviews this user received.
export const getRatingSummary = async (userId, { recent = 3 } = {}) => {
  const id = oid(userId);
  const match = receivedBy(id);
  const [dist, latest] = await Promise.all([
    Review.aggregate([{ $match: match }, { $group: { _id: "$rating", n: { $sum: 1 } } }]),
    Review.find(match)
      .sort({ createdAt: -1 })
      .limit(Math.min(Math.max(recent, 0), 10))
      .populate("reviewer_id", "name avatar is_college_verified")
      .populate("buyer_id", "name avatar is_college_verified")
      .select("rating comment product_title createdAt buyer_id reviewer_id reviewer_role")
      .lean(),
  ]);
  const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  let total = 0;
  let sum = 0;
  dist.forEach(({ _id, n }) => {
    distribution[_id] = n;
    total += n;
    sum += _id * n;
  });
  return {
    avg: total ? Math.round((sum / total) * 10) / 10 : 0,
    count: total,
    distribution,
    recent: latest.map((r) => {
      const reviewer = r.reviewer_id || r.buyer_id;
      return {
        _id: r._id,
        rating: r.rating,
        comment: r.comment,
        product_title: r.product_title,
        createdAt: r.createdAt,
        // Which side the reviewer was on: "buyer" means they bought from this user.
        reviewer_role: r.reviewer_role || "buyer",
        // `buyer` kept for older clients; it's the reviewer either way.
        buyer: reviewer ? { name: reviewer.name, avatar: reviewer.avatar } : null,
        reviewer: reviewer ? { name: reviewer.name, avatar: reviewer.avatar } : null,
      };
    }),
  };
};

// Which of these deals has this user already rated? Map dealId -> rating.
export const ratedDealsFor = async (userId, dealIds) => {
  if (!dealIds.length) return new Map();
  const rows = await Review.find({ deal_id: { $in: dealIds }, ...writtenBy(oid(userId)) }).select("deal_id rating").lean();
  return new Map(rows.map((r) => [String(r.deal_id), r.rating]));
};
