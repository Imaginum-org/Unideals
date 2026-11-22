/*
 * Plan caps as the UI explains them. Mirrors backend/src/config/
 * subscriptionPlans.js + boostPlans.js (the server is what enforces them;
 * change both together). null = unlimited.
 */
export const PLAN_ORDER = ["base_user", "pro", "pro_plus"];

export const PLAN_NAMES = { base_user: "Free", pro: "Pro", pro_plus: "Pro+" };

export const PLAN_CAPS = {
  base_user: { listings: 10, wishlist: 25, monthlyBoosts: 0, boostDays: 0, liveBoosts: 1 },
  pro: { listings: 25, wishlist: 100, monthlyBoosts: 2, boostDays: 3, liveBoosts: 1 },
  pro_plus: { listings: null, wishlist: null, monthlyBoosts: 5, boostDays: 7, liveBoosts: 3 },
};

export const normalizeTier = (tier) => (PLAN_ORDER.includes(tier) ? tier : "base_user");

// Next plan up, or null on the top plan.
export const nextTier = (tier) => {
  const i = PLAN_ORDER.indexOf(normalizeTier(tier));
  return PLAN_ORDER[i + 1] || null;
};

export const capLabel = (value) => (value === null ? "Unlimited" : String(value));

// When this month's free boosts come back: 1st of next month, India time.
export const nextBoostReset = (now = new Date()) => {
  const ist = new Date(now.getTime() + 330 * 60 * 1000);
  return new Date(Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth() + 1, 1) - 330 * 60 * 1000);
};
