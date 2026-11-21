import mongoose from "mongoose";
import AuthSession from "../models/AuthSession.model.js";

/**
 * "Is this device session still signed in?" for access-token checks.
 *
 * Checked on authenticated requests whose token carries a `sid`, so the
 * answer is cached per process for a short time: one indexed _id lookup per
 * active device every TTL, not one per request. Signing out evicts the
 * entry immediately on this instance; other instances notice within TTL
 * (the same window the user cache already uses). Concurrent misses for the
 * same sid share one query.
 */
const TTL_MS = Number(process.env.SESSION_CACHE_TTL_MS) || 30_000;
const MAX_ENTRIES = 50_000;
const cache = new Map(); // sid -> { alive, at }
const inflight = new Map(); // sid -> Promise<boolean>

export const forgetSession = (sid) => {
  if (sid) cache.delete(String(sid));
};

export const isSessionActive = async (sid) => {
  const key = String(sid || "");
  if (!mongoose.Types.ObjectId.isValid(key)) return false;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.alive;
  if (inflight.has(key)) return inflight.get(key);

  const p = AuthSession.exists({ _id: key, expires_at: { $gt: new Date() } })
    .then((doc) => {
      const alive = Boolean(doc);
      if (cache.size >= MAX_ENTRIES) cache.delete(cache.keys().next().value); // oldest first
      cache.set(key, { alive, at: Date.now() });
      return alive;
    })
    .finally(() => inflight.delete(key));
  inflight.set(key, p);
  return p;
};
