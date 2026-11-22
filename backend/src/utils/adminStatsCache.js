/**
 * Short in-memory cache for the admin console's summary reads (dashboard,
 * stat cards, sidebar counts, chart analytics).
 *
 * Why: those endpoints run many counts/aggregations over the same
 * collections the marketplace uses. Several staff tabs polling them would
 * repeat identical work and compete with student traffic for the DB. With
 * this, each distinct view is computed at most once per TTL per instance,
 * and concurrent requests for the same key share one in-flight query.
 *
 * Freshness: any staff write through /api/admin clears the cache (see
 * admin.routes.js), so a moderator sees their own action reflected at once.
 * Marketplace activity shows up within the TTL.
 *
 * ADMIN_STATS_CACHE_MS=0 disables it (tests do, since they write to the DB
 * directly and read straight back).
 */
const DEFAULT_TTL_MS = 30_000;
const MAX_ENTRIES = 500;

const ttlMs = () => {
  const raw = process.env.ADMIN_STATS_CACHE_MS;
  if (raw === undefined || raw === "") return process.env.NODE_ENV === "test" ? 0 : DEFAULT_TTL_MS;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : DEFAULT_TTL_MS;
};

const store = new Map(); // key -> { value, expires } | { promise }

/** Resolve `fn()` once per key per TTL. Failures are never cached. */
export const cachedAdminStat = async (key, fn, ttl = ttlMs()) => {
  if (!ttl) return fn();
  const now = Date.now();
  const hit = store.get(key);
  if (hit?.promise) return hit.promise;
  if (hit && hit.expires > now) return hit.value;

  const promise = (async () => fn())();
  store.set(key, { promise });
  try {
    const value = await promise;
    // A clear() during the query drops the entry: don't resurrect stale data.
    if (store.get(key)?.promise === promise) {
      if (store.size >= MAX_ENTRIES) store.delete(store.keys().next().value);
      store.set(key, { value, expires: Date.now() + ttl });
    }
    return value;
  } catch (err) {
    if (store.get(key)?.promise === promise) store.delete(key);
    throw err;
  }
};

export const clearAdminStatsCache = () => store.clear();

/**
 * Stable key part for a caller's view: campus limit + the sections they can
 * see (both change what the numbers contain).
 */
export const viewKey = (scope, permissions) => {
  const campuses = scope ? scope.map(String).sort().join(",") : "*";
  const sections = permissions
    ? Object.keys(permissions)
        .filter((k) => permissions[k]?.view)
        .sort()
        .join(",")
    : "*";
  return `${campuses}|${sections}`;
};

/** Query object to a stable string (key order independent). */
export const queryKey = (query = {}) =>
  JSON.stringify(
    Object.keys(query)
      .sort()
      .map((k) => [k, query[k]]),
  );
