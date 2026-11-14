import Product from "../models/Product.model.js";
import Deal from "../models/deal.model.js";
import Conversation from "../models/conversation.model.js";
import { DEAL_STATUS, PRODUCT_CATEGORIES, PRODUCT_CONDITION, PRODUCT_STATUS } from "../config/constants.js";
import { createTtlCache } from "../utils/ttlCache.js";

/**
 * Labs: Smart price suggestions (Pro & Pro+) + Demand meter (Pro+ only).
 *
 * Price: items in one category span ₹50 to ₹50,000, so raw prices can't be
 * compared. Instead every comparable becomes a *resale ratio* (price ÷ what
 * it cost new), normalised for its condition, outliers dropped. The seller's
 * own original price × the typical ratio for their condition gives a
 * suggestion that is about *their* item. Real completed sales are preferred
 * over asking prices when there are enough of them.
 *
 * Demand: live supply, real completed sales (from deals, not listing edit
 * dates) and new buyer chats over the last 30 days. Too little activity →
 * "insufficient", never a confident label from one data point.
 *
 * Market data is cached 10 minutes per campus + category (cheap on a basic
 * DB); per-request maths (seller exclusion, condition, original price) is
 * done in memory.
 */
const cache = createTtlCache({ max: 500 });
const TTL_MS = 10 * 60 * 1000;
const DAY = 864e5;

const LISTED_WINDOW_DAYS = 180;
const SOLD_WINDOW_DAYS = 365;
const MIN_LISTED = 4; // comparables needed to suggest from asking prices
const MIN_SOLD = 3; // completed sales needed to prefer real sale prices
const MIN_RATIO = 0.03; // below 3% of new price = junk / typo
const MAX_RATIO = 1.0; // asking more than new isn't a resale signal

// How much of its new price an item typically keeps, by condition. Only the
// *relative* values matter: comparables are normalised by their own
// condition and re-scaled to the seller's (mirrors the client heuristic).
export const CONDITION_FACTOR = Object.freeze({
  brand_new: 0.85,
  like_new: 0.7,
  gently_used: 0.55,
  well_used: 0.4,
  for_parts_or_not_working: 0.2,
});
const DEFAULT_CONDITION = "gently_used";
const factorOf = (condition) => CONDITION_FACTOR[condition] ?? CONDITION_FACTOR[DEFAULT_CONDITION];

const badRequest = (message) => {
  const e = new Error(message);
  e.statusCode = 400;
  return e;
};

export const quantile = (sorted, p) => {
  if (!sorted.length) return null;
  const idx = (sorted.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
};

// Friendly rounding for a suggested price: ₹10 steps under ₹1k, ₹50 under
// ₹5k, ₹100 above.
export const roundPrice = (n) => {
  if (n == null || !Number.isFinite(n)) return null;
  const step = n < 1000 ? 10 : n < 5000 ? 50 : 100;
  return Math.max(step, Math.round(n / step) * step);
};

/**
 * Comparables → condition-normalised resale ratios with outliers removed.
 * comps: [{ price, original, condition }]
 */
export const normalisedRatios = (comps) => {
  const values = comps
    .map((c) => {
      const price = Number(c.price);
      const original = Number(c.original);
      if (!(price > 0) || !(original > 0)) return null;
      const ratio = price / original;
      if (ratio < MIN_RATIO || ratio > MAX_RATIO) return null;
      return ratio / factorOf(c.condition);
    })
    .filter((v) => v != null)
    .sort((a, b) => a - b);
  // Tukey fences once there's enough data to tell what an outlier is.
  if (values.length >= 8) {
    const q1 = quantile(values, 0.25);
    const q3 = quantile(values, 0.75);
    const iqr = q3 - q1;
    return values.filter((v) => v >= q1 - 1.5 * iqr && v <= q3 + 1.5 * iqr);
  }
  return values;
};

const confidenceFor = (n) => (n >= 12 ? "high" : n >= 6 ? "medium" : "low");

/**
 * Pure maths: market comparables + the seller's item → suggestion.
 * Exported for tests.
 */
export const buildPriceInsight = ({ listed, sold, condition, originalPrice }) => {
  const soldN = normalisedRatios(sold);
  const listedN = normalisedRatios(listed);
  const basis = soldN.length >= MIN_SOLD ? "sold" : listedN.length >= MIN_LISTED ? "listed" : null;
  const base = {
    enoughData: Boolean(basis),
    basis,
    soldSamples: soldN.length,
    listedSamples: listedN.length,
  };
  if (!basis) return { ...base, samples: 0, confidence: null, ratio: null, suggestion: null };

  const values = basis === "sold" ? soldN : listedN;
  const f = factorOf(condition);
  const clamp = (r) => Math.min(Math.max(r * f, MIN_RATIO), MAX_RATIO);
  const ratio = {
    low: clamp(quantile(values, 0.25)),
    median: clamp(quantile(values, 0.5)),
    high: clamp(quantile(values, 0.75)),
  };
  const pct = (r) => Math.round(r * 100);

  const original = Number(originalPrice);
  let suggestion = null;
  if (Number.isFinite(original) && original >= 50) {
    // Never suggest asking more than (or exactly) what it cost new.
    const cap = (n) => Math.min(roundPrice(n), Math.max(10, roundPrice(original * 0.98)));
    suggestion = {
      suggested: cap(original * ratio.median),
      low: cap(original * ratio.low),
      high: cap(original * ratio.high),
    };
  }

  return {
    ...base,
    samples: values.length,
    confidence: confidenceFor(values.length),
    ratio: { low: pct(ratio.low), median: pct(ratio.median), high: pct(ratio.high) },
    suggestion,
  };
};

/**
 * Demand level from real signals. Exported for tests.
 * Returns "insufficient" when there's too little activity to judge.
 */
export const demandLevel = ({ live, sales30, chats30, newListings30 }) => {
  if (live + sales30 + newListings30 < 5) return "insufficient";
  const sellThrough = sales30 / Math.max(live + sales30, 1);
  const chatsPerListing = chats30 / Math.max(live + sales30, 1);
  if ((sellThrough >= 0.25 && sales30 >= 2) || chatsPerListing >= 1.5) return "high";
  if (sellThrough >= 0.1 || chatsPerListing >= 0.5) return "moderate";
  return "low";
};

const VALID_CATEGORIES = new Set(Object.values(PRODUCT_CATEGORIES));
const VALID_CONDITIONS = new Set(Object.values(PRODUCT_CONDITION));

/* ── Market data (cached per campus + category) ──────────────────────── */

// Completed sales. New deals carry a `sale` snapshot; older ones are joined
// back to their listing while it still exists (it's hard-deleted ~15 days
// after the sale).
const loadSold = async (campusId, category, since) => {
  const withSnapshot = await Deal.find({
    status: DEAL_STATUS.COMPLETED,
    completed_at: { $gte: since },
    "sale.campus_id": campusId,
    "sale.category": category,
  })
    .select("sale completed_at")
    .sort({ completed_at: -1 })
    .limit(300)
    .lean();

  const legacy = await Deal.find({
    status: DEAL_STATUS.COMPLETED,
    completed_at: { $gte: since },
    sale: { $exists: false },
  })
    .select("conversation_id current_price completed_at")
    .sort({ completed_at: -1 })
    .limit(300)
    .lean();
  let legacyRows = [];
  if (legacy.length) {
    const convs = await Conversation.find({ _id: { $in: legacy.map((d) => d.conversation_id) } })
      .select("product_id")
      .lean();
    const productOf = new Map(convs.map((c) => [String(c._id), String(c.product_id)]));
    const products = await Product.find({
      _id: { $in: [...new Set(convs.map((c) => c.product_id))] },
      campus_id: campusId,
      category,
    })
      .select("condition original_price seller_id")
      .lean();
    const byId = new Map(products.map((p) => [String(p._id), p]));
    legacyRows = legacy
      .map((d) => {
        const p = byId.get(productOf.get(String(d.conversation_id)));
        return p
          ? { price: d.current_price, original: p.original_price, condition: p.condition, seller: String(p.seller_id), at: d.completed_at }
          : null;
      })
      .filter(Boolean);
  }

  return [
    ...withSnapshot.map((d) => ({
      price: d.sale.sold_price,
      original: d.sale.original_price,
      condition: d.sale.condition,
      seller: String(d.sale.seller_id || ""),
      at: d.completed_at,
    })),
    ...legacyRows,
  ];
};

const loadMarket = (campusId, category) =>
  cache.memo(`market|${campusId}|${category}`, TTL_MS, async () => {
    const now = Date.now();
    const listedSince = new Date(now - LISTED_WINDOW_DAYS * DAY);
    const [listedRows, sold] = await Promise.all([
      Product.find({
        campus_id: campusId,
        category,
        is_deleted: false,
        status: PRODUCT_STATUS.LISTED,
        createdAt: { $gte: listedSince },
      })
        .select("selling_price original_price condition seller_id")
        .sort({ createdAt: -1 })
        .limit(400)
        .lean(),
      loadSold(campusId, category, new Date(now - SOLD_WINDOW_DAYS * DAY)),
    ]);
    return {
      listed: listedRows.map((p) => ({
        price: p.selling_price,
        original: p.original_price,
        condition: p.condition,
        seller: String(p.seller_id),
      })),
      sold,
    };
  });

const loadDemand = (campusId, category) =>
  cache.memo(`demand|${campusId}|${category}`, TTL_MS, async () => {
    const since30 = new Date(Date.now() - 30 * DAY);
    const [live, newListings30, recentIds, market] = await Promise.all([
      Product.countDocuments({ campus_id: campusId, category, is_deleted: false, status: PRODUCT_STATUS.LISTED }),
      Product.countDocuments({ campus_id: campusId, category, createdAt: { $gte: since30 } }),
      // Listings a buyer could have chatted about in the window.
      Product.find({
        campus_id: campusId,
        category,
        $or: [{ status: PRODUCT_STATUS.LISTED, is_deleted: false }, { updatedAt: { $gte: since30 } }],
      })
        .select("_id")
        .limit(2000)
        .lean(),
      loadMarket(campusId, category),
    ]);
    const chats30 = recentIds.length
      ? await Conversation.countDocuments({ product_id: { $in: recentIds.map((p) => p._id) }, createdAt: { $gte: since30 } })
      : 0;
    const sales30 = market.sold.filter((s) => s.at && new Date(s.at) >= since30).length;
    return { live, newListings30, chats30, sales30 };
  });

/* ── Public API ─────────────────────────────────────────────────────── */

export const getPriceInsights = async ({ campusId, userId, category, condition, originalPrice, includeDemand }) => {
  if (!campusId) throw badRequest("Campus required");
  if (!VALID_CATEGORIES.has(category)) throw badRequest("Pick a valid category");
  const cond = VALID_CONDITIONS.has(condition) ? condition : null;

  const market = await loadMarket(campusId, category);
  // The seller's own listings and sales never count as "the market".
  const me = userId ? String(userId) : null;
  const notMine = (c) => !me || c.seller !== me;

  const result = {
    category,
    condition: cond,
    ...buildPriceInsight({
      listed: market.listed.filter(notMine),
      sold: market.sold.filter(notMine),
      condition: cond || DEFAULT_CONDITION,
      originalPrice,
    }),
  };

  if (includeDemand) {
    const d = await loadDemand(campusId, category);
    result.demand = {
      level: demandLevel(d),
      live: d.live,
      sales30: d.sales30,
      chats30: d.chats30,
      newListings30: d.newListings30,
    };
  }
  return result;
};
