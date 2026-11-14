// Cache for the Home "Boosted" rail (product.service.getBoostedProducts).
//
// Kept in its own module so the Product model can clear it on writes without
// importing the service (no circular import). The Product model's hooks call
// clearBoostedCache() whenever a write touches a field that decides whether a
// listing belongs in the rail (status, deletion, boost window, audience), so a
// listing that is sold, unlisted, deleted or un-boosted leaves the rail at once
// instead of lingering for the cache TTL.
import { createTtlCache } from "./ttlCache.js";

export const boostedCache = createTtlCache({ max: 200 });

export const clearBoostedCache = () => boostedCache.clear();

// Fields whose change can add or remove a listing from the Boosted rail.
export const BOOSTED_RAIL_FIELDS = [
  "status",
  "is_deleted",
  "is_boosted",
  "boost_expires_at",
  "boost_tier",
  "campus_id",
  "isGirlsOnly",
  "category",
];

/** True when a Mongo update document touches any Boosted-rail field. */
export const updateTouchesBoostedRail = (update) => {
  if (!update) return false;
  // Pipeline updates: be safe and treat as relevant.
  if (Array.isArray(update)) return true;
  const keys = new Set();
  for (const [k, v] of Object.entries(update)) {
    if (k.startsWith("$")) {
      if (v && typeof v === "object") Object.keys(v).forEach((f) => keys.add(f.split(".")[0]));
    } else {
      keys.add(k.split(".")[0]);
    }
  }
  return BOOSTED_RAIL_FIELDS.some((f) => keys.has(f));
};
