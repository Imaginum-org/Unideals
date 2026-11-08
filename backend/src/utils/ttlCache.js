// Tiny in-process TTL cache with in-flight de-duplication.
//
// `memo(key, ttlMs, loader)` returns the cached value when fresh; otherwise
// it runs `loader` once — concurrent callers for the same key share the same
// promise (no thundering herd against Mongo when a hot page is opened by many
// students at once). Failures are never cached.
export const createTtlCache = ({ max = 1000 } = {}) => {
  const store = new Map(); // key -> { value, expires }
  const inflight = new Map(); // key -> Promise

  const get = (key) => {
    const hit = store.get(key);
    if (!hit) return undefined;
    if (hit.expires < Date.now()) {
      store.delete(key);
      return undefined;
    }
    return hit.value;
  };

  const set = (key, value, ttlMs) => {
    if (store.size >= max) store.delete(store.keys().next().value);
    store.set(key, { value, expires: Date.now() + ttlMs });
  };

  const memo = async (key, ttlMs, loader) => {
    const cached = get(key);
    if (cached !== undefined) return cached;
    if (inflight.has(key)) return inflight.get(key);
    const p = (async () => {
      try {
        const value = await loader();
        set(key, value, ttlMs);
        return value;
      } finally {
        inflight.delete(key);
      }
    })();
    inflight.set(key, p);
    return p;
  };

  return {
    get,
    set,
    memo,
    delete: (key) => store.delete(key),
    clear: () => store.clear(),
  };
};

// Stable cache key for Mongo filters/pipelines (handles ObjectId, Date, RegExp).
export const keyOf = (value) =>
  JSON.stringify(value, (_k, v) => {
    if (v instanceof RegExp) return `re:${v.source}/${v.flags}`;
    if (v && typeof v === "object" && v._bsontype === "ObjectId") return `oid:${String(v)}`;
    return v;
  });
