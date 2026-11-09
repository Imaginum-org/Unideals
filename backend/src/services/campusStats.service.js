import Product from "../models/Product.model.js";
import Deal from "../models/deal.model.js";
import { DEAL_STATUS, PRODUCT_STATUS } from "../config/constants.js";

/*
 * Live numbers for the Home hero: what's happening on this campus right now.
 * Viewer-agnostic (girls-only listings excluded so counts never leak them),
 * cached per campus for 10 minutes.
 */

const TTL_MS = 10 * 60 * 1000;
const DAY = 24 * 60 * 60 * 1000;
const cache = new Map();

export const getCampusStats = async (campusId) => {
  const key = String(campusId);
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.data;

  const live = { campus_id: campusId, status: PRODUCT_STATUS.LISTED, is_deleted: false, isGirlsOnly: { $ne: true } };
  const weekAgo = new Date(Date.now() - 7 * DAY);
  const monthAgo = new Date(Date.now() - 30 * DAY);

  const [liveListings, sellers, newThisWeek, dealsAgg] = await Promise.all([
    Product.countDocuments(live),
    Product.distinct("seller_id", live),
    Product.countDocuments({ ...live, createdAt: { $gte: weekAgo } }),
    // Completed deals on this campus: deal → conversation → product.campus_id.
    Deal.aggregate([
      { $match: { status: DEAL_STATUS.COMPLETED, completed_at: { $gte: monthAgo } } },
      { $lookup: { from: "conversations", localField: "conversation_id", foreignField: "_id", as: "c", pipeline: [{ $project: { product_id: 1 } }] } },
      { $unwind: "$c" },
      { $lookup: { from: "products", localField: "c.product_id", foreignField: "_id", as: "p", pipeline: [{ $project: { campus_id: 1 } }] } },
      { $unwind: "$p" },
      { $match: { "p.campus_id": campusId } },
      { $count: "n" },
    ]),
  ]);

  const data = {
    liveListings,
    activeSellers: sellers.length,
    newThisWeek,
    dealsLast30Days: dealsAgg[0]?.n || 0,
  };
  cache.set(key, { at: Date.now(), data });
  return data;
};
