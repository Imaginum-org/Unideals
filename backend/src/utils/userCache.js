// Short-lived in-process cache for the authenticated user document.
//
// Why: auth()/optionalAuth() and the socket handshake used to run
// User.findById on EVERY request — the single most frequent DB read in the
// app. On a shared/basic Mongo tier that round-trip (and its connection-pool
// slot) dominates request latency.
//
// Safety: User model middleware (see User.model.js) evicts an entry on every
// write path (save / updateOne / findOneAndUpdate / deletes), and clears the
// whole cache on multi-document writes (updateMany / bulkWrite). So logout,
// password reset, suspension and plan changes take effect immediately on
// this instance. The TTL only bounds staleness across multiple instances.
const TTL_MS = Number(process.env.USER_CACHE_TTL_MS) || 30_000;
const MAX_ENTRIES = 5_000;

const store = new Map(); // id -> { user, expires }

export const getCachedUser = (id) => {
  const key = String(id);
  const hit = store.get(key);
  if (!hit) return null;
  if (hit.expires < Date.now()) {
    store.delete(key);
    return null;
  }
  return hit.user;
};

export const setCachedUser = (id, user) => {
  if (!user) return;
  if (store.size >= MAX_ENTRIES) {
    // Map keeps insertion order → drop the oldest entry.
    store.delete(store.keys().next().value);
  }
  store.set(String(id), { user, expires: Date.now() + TTL_MS });
};

export const invalidateUser = (id) => {
  if (id != null) store.delete(String(id));
};

export const clearUserCache = () => store.clear();

/**
 * Cached equivalent of
 *   User.findById(id).select("-password -refresh_token").lean()
 * Returned objects are shared between requests: treat them as read-only.
 */
export const loadAuthUser = async (User, id) => {
  const cached = getCachedUser(id);
  if (cached) return cached;
  const user = await User.findById(id).select("-password -refresh_token").lean();
  if (user) setCachedUser(id, user);
  return user;
};
