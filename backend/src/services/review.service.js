import mongoose from "mongoose";
import Review from "../models/Review.model.js";
import Deal from "../models/deal.model.js";
import Conversation from "../models/conversation.model.js";
import User from "../models/User.model.js";
import { DEAL_STATUS } from "../config/constants.js";
import { AppError } from "../utils/appError.js";

/*
 * Buyer ratings. Only the buyer of a completed deal can rate its seller,
 * once. The seller's average and count are denormalised onto User.rating so
 * cards and profiles read them for free.
 */

const oid = (v) => new mongoose.Types.ObjectId(String(v));
const clean = (s) => String(s || "").replace(/\s+/g, " ").trim().slice(0, 300);

export const recomputeSellerRating = async (sellerId) => {
  const [agg] = await Review.aggregate([
    { $match: { seller_id: oid(sellerId) } },
    { $group: { _id: null, avg: { $avg: "$rating" }, count: { $sum: 1 } } },
  ]);
  const rating = { avg: agg ? Math.round(agg.avg * 10) / 10 : 0, count: agg?.count || 0 };
  await User.updateOne({ _id: sellerId }, { $set: { rating } });
  return rating;
};

export const createReview = async ({ conversationId, userId, rating, comment }) => {
  const stars = Number(rating);
  if (!Number.isInteger(stars) || stars < 1 || stars > 5) throw new AppError("Pick a rating from 1 to 5 stars", 400);
  if (!mongoose.isValidObjectId(conversationId)) throw new AppError("Invalid conversation", 400);

  const conversation = await Conversation.findById(conversationId).select("buyer_id seller_id product_id product_snapshot").lean();
  if (!conversation) throw new AppError("Conversation not found", 404);
  if (String(conversation.buyer_id) !== String(userId)) throw new AppError("Only the buyer can rate this deal", 403);

  const deal = await Deal.findOne({ conversation_id: conversation._id }).select("_id status").lean();
  if (!deal || deal.status !== DEAL_STATUS.COMPLETED) throw new AppError("You can rate the seller once the deal is complete", 400);

  try {
    const review = await Review.create({
      deal_id: deal._id,
      conversation_id: conversation._id,
      product_id: conversation.product_id || null,
      product_title: conversation.product_snapshot?.title || "",
      seller_id: conversation.seller_id,
      buyer_id: userId,
      rating: stars,
      comment: clean(comment),
    });
    const sellerRating = await recomputeSellerRating(conversation.seller_id);
    return { review, sellerRating };
  } catch (err) {
    if (err?.code === 11000) throw new AppError("You have already rated this deal", 409);
    throw err;
  }
};

// Average, count, 5→1 distribution and the latest reviews for one seller.
export const getRatingSummary = async (sellerId, { recent = 3 } = {}) => {
  const id = oid(sellerId);
  const [dist, latest] = await Promise.all([
    Review.aggregate([{ $match: { seller_id: id } }, { $group: { _id: "$rating", n: { $sum: 1 } } }]),
    Review.find({ seller_id: id })
      .sort({ createdAt: -1 })
      .limit(Math.min(Math.max(recent, 0), 10))
      .populate("buyer_id", "name avatar")
      .select("rating comment product_title createdAt buyer_id")
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
    recent: latest.map((r) => ({
      _id: r._id,
      rating: r.rating,
      comment: r.comment,
      product_title: r.product_title,
      createdAt: r.createdAt,
      buyer: r.buyer_id ? { name: r.buyer_id.name, avatar: r.buyer_id.avatar } : null,
    })),
  };
};

// Which of these deals has this buyer already rated? Map dealId -> rating.
export const ratedDealsFor = async (buyerId, dealIds) => {
  if (!dealIds.length) return new Map();
  const rows = await Review.find({ buyer_id: buyerId, deal_id: { $in: dealIds } }).select("deal_id rating").lean();
  return new Map(rows.map((r) => [String(r.deal_id), r.rating]));
};
