// "Last seen" snapshots of public, campus-wide lists (Home feed, Boosted
// rail), kept in localStorage so a returning visitor sees listings
// instantly instead of skeletons while the API (possibly waking from idle)
// answers. The fresh response always replaces the snapshot a moment later
// (stale-while-revalidate).
//
// Only public campus data is stored. Girls Corner lists are never stored on
// the device. Everything is wrapped in try/catch: private mode, full
// storage or blocked site data just mean "no snapshot".

const PREFIX = "unideals:snap:";
const MAX_AGE_MS = 24 * 60 * 60 * 1000; // older than a day isn't worth showing
const MAX_ENTRIES = 8;
const MAX_BYTES = 150_000; // per snapshot; skip anything unusually large

export const readSnapshot = (key) => {
  try {
    const raw = window.localStorage.getItem(PREFIX + key);
    if (!raw) return null;
    const { at, data } = JSON.parse(raw);
    if (!at || Date.now() - at > MAX_AGE_MS) {
      window.localStorage.removeItem(PREFIX + key);
      return null;
    }
    return data ?? null;
  } catch {
    return null;
  }
};

export const writeSnapshot = (key, data) => {
  try {
    const raw = JSON.stringify({ at: Date.now(), data });
    if (raw.length > MAX_BYTES) return;
    window.localStorage.setItem(PREFIX + key, raw);
    // Keep only the newest few snapshots (e.g. after switching campuses).
    const keys = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (k?.startsWith(PREFIX)) keys.push(k);
    }
    if (keys.length > MAX_ENTRIES) {
      keys
        .map((k) => {
          try {
            return [k, JSON.parse(window.localStorage.getItem(k))?.at || 0];
          } catch {
            return [k, 0];
          }
        })
        .sort((a, b) => a[1] - b[1])
        .slice(0, keys.length - MAX_ENTRIES)
        .forEach(([k]) => window.localStorage.removeItem(k));
    }
  } catch {
    // storage full / blocked: snapshots are a nice-to-have
  }
};

