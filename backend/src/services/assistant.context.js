// What the assistant knows about the signed-in student, gathered on the
// server so the model can personalise replies ("your cycle has 40 views").
// Only marketplace facts go in: no phone numbers, emails, addresses or ids
// of other people. Cached briefly so a chat doesn't re-query on every turn.
import mongoose from "mongoose";
import Campus from "../models/Campus.model.js";
import Product from "../models/Product.model.js";
import Conversation from "../models/conversation.model.js";
import Deal from "../models/deal.model.js";
import Boost from "../models/Boost.model.js";
import { DEAL_STATUS, PRODUCT_STATUS } from "../config/constants.js";
import { getBoostPlanRules } from "../config/boostPlans.js";

const CONTEXT_TTL_MS = 60_000;
const CONTEXT_MAX = 500;
const contextCache = new Map();

const PLAN_LABELS = { base_user: "Free", pro: "Pro", pro_plus: "Pro+" };
const OPEN_DEAL_STATUSES = [
  DEAL_STATUS.NEGOTIATING,
  DEAL_STATUS.OFFER_ACCEPTED,
  DEAL_STATUS.DEAL_CONFIRMED,
  DEAL_STATUS.PICKUP_SCHEDULED,
  DEAL_STATUS.PAYMENT_CONFIRMED,
];

const firstName = (user) => String(user?.name || "").trim().split(/\s+/)[0] || "";

const monthStart = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
};

const loadContext = async (user) => {
  const uid = new mongoose.Types.ObjectId(String(user._id));
  const [campus, listings, wishlistCount, conversations, boostsThisMonth] = await Promise.all([
    user.campus_id ? Campus.findById(user.campus_id).select("name short_name").lean() : null,
    Product.find({ seller_id: uid, is_deleted: false, status: PRODUCT_STATUS.LISTED })
      .sort({ views_count: -1 })
      .limit(3)
      .select("title selling_price views_count is_boosted")
      .lean(),
    Array.isArray(user.wishlist) ? user.wishlist.length : 0,
    Conversation.find({ $or: [{ buyer_id: uid }, { seller_id: uid }] }).select("_id").limit(200).lean(),
    Boost.countDocuments({ user_id: uid, isAddon: { $ne: true }, createdAt: { $gte: monthStart() } }),
  ]);
  const [activeListingCount, openDeals] = await Promise.all([
    Product.countDocuments({ seller_id: uid, is_deleted: false, status: PRODUCT_STATUS.LISTED }),
    conversations.length
      ? Deal.countDocuments({ conversation_id: { $in: conversations.map((c) => c._id) }, status: { $in: OPEN_DEAL_STATUSES } })
      : 0,
  ]);
  const rules = getBoostPlanRules(user.subscription);
  return {
    firstName: firstName(user),
    campus: campus?.name || null,
    plan: PLAN_LABELS[user.subscription] || "Free",
    boostsLeftThisMonth: Math.max((rules?.monthlyLimit || 0) - boostsThisMonth, 0),
    activeListingCount,
    topListings: listings.map((p) => ({
      title: String(p.title || "").slice(0, 60),
      price: p.selling_price,
      views: p.views_count || 0,
      boosted: Boolean(p.is_boosted),
    })),
    wishlistCount,
    openDeals,
  };
};

/** Marketplace context for a signed-in student, or null for guests. Never throws. */
export const getViewerContext = async (user) => {
  if (!user?._id) return null;
  const key = String(user._id);
  const hit = contextCache.get(key);
  if (hit && Date.now() - hit.ts < CONTEXT_TTL_MS) return hit.data;
  try {
    const data = await loadContext(user);
    if (contextCache.size >= CONTEXT_MAX) contextCache.delete(contextCache.keys().next().value);
    contextCache.set(key, { data, ts: Date.now() });
    return data;
  } catch (error) {
    console.warn("[Assistant] Viewer context failed:", error.message || error);
    return { firstName: firstName(user), plan: PLAN_LABELS[user.subscription] || "Free" };
  }
};

/** Drops the cached context (after the student lists, boosts or deletes something). */
export const forgetViewerContext = (userId) => contextCache.delete(String(userId));

/** The context as prompt lines. */
export const describeViewerContext = (context) => {
  if (!context) return "The student is browsing as a guest (not signed in). Don't use a name.";
  const lines = [`First name: ${context.firstName || "unknown"}`];
  if (context.campus) lines.push(`Campus: ${context.campus}`);
  if (context.plan) lines.push(`Plan: ${context.plan}${Number.isFinite(context.boostsLeftThisMonth) ? `, ${context.boostsLeftThisMonth} plan boost(s) left this month` : ""}`);
  if (Number.isFinite(context.activeListingCount)) {
    lines.push(`Active listings: ${context.activeListingCount}`);
    for (const listing of context.topListings || []) {
      lines.push(`  - "${listing.title}" at ₹${Number(listing.price || 0).toLocaleString("en-IN")}, ${listing.views} views${listing.boosted ? ", boosted" : ""}`);
    }
  }
  if (Number.isFinite(context.wishlistCount)) lines.push(`Wishlist items: ${context.wishlistCount}`);
  if (Number.isFinite(context.openDeals)) lines.push(`Open deals in progress: ${context.openDeals}`);
  return lines.join("\n");
};
