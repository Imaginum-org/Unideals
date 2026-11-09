import { USER_TIER } from "./constants.js";

/**
 * Unideals Labs: the "Early Feature Access" perk on the pricing page.
 *
 *   Free  –        no Labs features
 *   Pro   Limited  features with minTier PRO
 *   Pro+  Full     every Labs feature
 *
 * Add a feature here and gate it with `hasLabsFeature(user, key)` on the
 * server (the client only mirrors GET /api/user/labs for UI). When a
 * feature graduates to everyone, delete it from this list.
 */
const TIER_ORDER = {
  [USER_TIER.BASE_USER]: 0,
  [USER_TIER.PRO]: 1,
  [USER_TIER.PRO_PLUS]: 2,
};

export const LABS_FEATURES = Object.freeze([
  {
    key: "price_insights",
    name: "Smart price suggestions",
    description:
      "While listing, see what similar items sold and are listed for on your campus, with a suggested price.",
    minTier: USER_TIER.PRO,
  },
  {
    key: "demand_meter",
    name: "Demand meter",
    description:
      "See how hot a category is on your campus right now (supply, views and recent sales) before you price it.",
    minTier: USER_TIER.PRO_PLUS,
  },
]);

export const hasLabsFeature = (user, key) => {
  const feature = LABS_FEATURES.find((f) => f.key === key);
  if (!feature) return false;
  const have = TIER_ORDER[user?.subscription] ?? 0;
  return have >= (TIER_ORDER[feature.minTier] ?? 99);
};

export const labsForUser = (user) =>
  LABS_FEATURES.map((f) => ({
    key: f.key,
    name: f.name,
    description: f.description,
    minTier: f.minTier,
    enabled: hasLabsFeature(user, f.key),
  }));
