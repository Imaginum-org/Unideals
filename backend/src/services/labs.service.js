import Product from "../models/Product.model.js";
import { PRODUCT_CATEGORIES, PRODUCT_CONDITION, PRODUCT_STATUS } from "../config/constants.js";
import { createTtlCache } from "../utils/ttlCache.js";

/**
 * Labs: Smart price suggestions (Pro & Pro+) + Demand meter (Pro+ only).
 * Campus-scoped, computed from listing data only (no user data), cached
 * 10 minutes per campus/category/condition so it's cheap on a basic DB.
 */
const cache = createTtlCache({ max: 500 });
const TTL_MS = 10 * 60 * 1000;
const DAY = 864e5;
const MIN_SAMPLES = 5;

const badRequest = (message) => {
  const e = new Error(message);
  e.statusCode = 400;
  return e;
};

const percentile = (sorted, p) => {
  if (!sorted.length) return null;
  const idx = (sorted.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  return Math.round(sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo));
};

// Friendly rounding for a suggested price: ₹10 steps under ₹1k, ₹50 under
// ₹5k, ₹100 above.
export const roundPrice = (n) => {
  if (n == null) return null;
  const step = n < 1000 ? 10 : n < 5000 ? 50 : 100;
  return Math.max(step, Math.round(n / step) * step);
};

export const summarisePrices = (prices) => {
  const sorted = [...prices].filter((n) => Number.isFinite(n) && n >= 0).sort((a, b) => a - b);
  if (!sorted.length) return null;
  const median = percentile(sorted, 0.5);
  return {
    samples: sorted.length,
    low: percentile(sorted, 0.25),
    median,
    high: percentile(sorted, 0.75),
    suggested: roundPrice(median),
  };
};

export const demandLevel = ({ activeListings, soldLast30, avgViews }) => {
  const sellThrough = soldLast30 / Math.max(activeListings + soldLast30, 1);
  if (sellThrough >= 0.3 || avgViews >= 40) return "high";
  if (sellThrough >= 0.1 || avgViews >= 15) return "moderate";
  return "low";
};

const VALID_CATEGORIES = new Set(Object.values(PRODUCT_CATEGORIES));
const VALID_CONDITIONS = new Set(Object.values(PRODUCT_CONDITION));

export const getPriceInsights = async ({ campusId, category, condition, includeDemand }) => {
  if (!campusId) throw badRequest("Campus required");
  if (!VALID_CATEGORIES.has(category)) throw badRequest("Pick a valid category");
  const cond = VALID_CONDITIONS.has(condition) ? condition : null;

  const key = `${campusId}|${category}|${cond || "*"}|${includeDemand ? 1 : 0}`;
  return cache.memo(key, TTL_MS, async () => {
    const since = new Date(Date.now() - 180 * DAY);
    const base = {
      campus_id: campusId,
      category,
      is_deleted: false,
      status: { $in: [PRODUCT_STATUS.LISTED, PRODUCT_STATUS.SOLD] },
      createdAt: { $gte: since },
    };
    const fetchPrices = (extra = {}) =>
      Product.find({ ...base, ...extra }).select("selling_price status").sort({ createdAt: -1 }).limit(300).lean();

    // Same condition first; fall back to the whole category when there
    // aren't enough comparable listings to be meaningful.
    let rows = cond ? await fetchPrices({ condition: cond }) : [];
    let scope = "condition";
    if (rows.length < MIN_SAMPLES) {
      rows = await fetchPrices();
      scope = "category";
    }

    const all = summarisePrices(rows.map((r) => r.selling_price));
    const sold = summarisePrices(rows.filter((r) => r.status === PRODUCT_STATUS.SOLD).map((r) => r.selling_price));

    const result = {
      category,
      condition: cond,
      scope,
      enoughData: Boolean(all && all.samples >= MIN_SAMPLES),
      price: all,
      soldPrice: sold && sold.samples >= 3 ? sold : null,
    };

    if (includeDemand) {
      const since30 = new Date(Date.now() - 30 * DAY);
      const [activeListings, soldLast30, recent] = await Promise.all([
        Product.countDocuments({ campus_id: campusId, category, is_deleted: false, status: PRODUCT_STATUS.LISTED }),
        Product.countDocuments({
          campus_id: campusId,
          category,
          is_deleted: false,
          status: PRODUCT_STATUS.SOLD,
          updatedAt: { $gte: since30 },
        }),
        Product.find({ campus_id: campusId, category, is_deleted: false, createdAt: { $gte: since30 } })
          .select("views_count")
          .limit(500)
          .lean(),
      ]);
      const avgViews = recent.length
        ? Math.round(recent.reduce((sum, p) => sum + (p.views_count || 0), 0) / recent.length)
        : 0;
      result.demand = {
        activeListings,
        soldLast30,
        avgViews,
        level: demandLevel({ activeListings, soldLast30, avgViews }),
      };
    }
    return result;
  });
};
