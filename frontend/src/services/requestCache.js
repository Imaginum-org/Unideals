// Tiny stale-while-revalidate-free GET cache with in-flight de-duplication.
//
// Why: every page re-fetched its data on each mount, so Home → Product →
// back → Home re-ran the same feed queries (and DB aggregations) and showed
// a loader again. Responses are now kept briefly in memory:
//   • reopening / going back to a page within the TTL renders instantly,
//   • identical concurrent requests (two components, hover-prefetch + click)
//     share ONE network call,
//   • failures are never cached, and mutations call invalidate(prefix).
const store = new Map(); // key -> { promise, expires }
const MAX = 300;

export const cachedRequest = (key, ttlMs, run) => {
  const now = Date.now();
  const hit = store.get(key);
  if (hit && hit.expires > now) return hit.promise;
  const promise = run().catch((err) => {
    if (store.get(key)?.promise === promise) store.delete(key);
    throw err;
  });
  if (store.size >= MAX) store.delete(store.keys().next().value);
  store.set(key, { promise, expires: now + ttlMs });
  return promise;
};

export const invalidateRequests = (prefix = "") => {
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) store.delete(key);
  }
};

// Stable key: params sorted so {a,b} and {b,a} hit the same entry.
export const requestKey = (url, params = {}) => {
  const entries = Object.entries(params || {})
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .sort(([a], [b]) => a.localeCompare(b));
  return `${url}?${new URLSearchParams(entries).toString()}`;
};

// Session changes (login/logout/campus switch) alter what the API returns.
if (typeof window !== "undefined") {
  ["unideals:session-expired", "unideals:account-blocked", "unideals:auth-changed"].forEach((evt) =>
    window.addEventListener(evt, () => invalidateRequests()),
  );
}
