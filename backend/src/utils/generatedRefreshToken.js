import crypto from "crypto";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import AuthSession from "../models/AuthSession.model.js";

const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000; // matches the JWT + cookie
const GRACE_MS = 60 * 1000; // old token still honoured right after rotation
const MAX_SESSIONS = 10; // signed-in devices per account (oldest drop off)

/** The device session id inside a refresh token we just issued. */
export const sessionIdOf = (refreshToken) => jwt.decode(refreshToken)?.sid || null;

export const hashRefreshToken = (token) => crypto.createHash("sha256").update(String(token)).digest("hex");

const sign = (userId, tokenVersion, sid) =>
  jwt.sign({ id: userId, v: tokenVersion, sid: String(sid) }, process.env.SECRET_KEY_REFRESH_TOKEN, {
    expiresIn: "7d",
    // Unique even when two tokens are minted in the same second.
    jwtid: crypto.randomBytes(9).toString("base64url"),
  });

/**
 * Issue a refresh token.
 * - Without `sessionId`: a NEW device session (login, OAuth, migration).
 * - With `sessionId`: rotate that device's session (refresh). The old hash
 *   moves to prev_hash for a short grace window, in one atomic update.
 * Signature kept for existing callers: (userId, tokenVersion).
 */
const generatedRefreshToken = async (userId, tokenVersion = 0, { sessionId, userAgent } = {}) => {
  const now = Date.now();

  if (sessionId) {
    const token = sign(userId, tokenVersion, sessionId);
    const res = await AuthSession.updateOne(
      { _id: sessionId, user_id: userId },
      [
        {
          $set: {
            prev_hash: "$token_hash",
            prev_expires_at: new Date(now + GRACE_MS),
            token_hash: hashRefreshToken(token),
            expires_at: new Date(now + REFRESH_TTL_MS),
            last_used_at: new Date(now),
          },
        },
      ],
      { updatePipeline: true },
    );
    if (res.matchedCount) return token;
    // Session vanished (expired / signed out elsewhere): fall through and
    // start a fresh one rather than handing out a dead token.
  }

  const sid = new mongoose.Types.ObjectId();
  const token = sign(userId, tokenVersion, sid);
  await AuthSession.create({
    _id: sid,
    user_id: userId,
    token_hash: hashRefreshToken(token),
    expires_at: new Date(now + REFRESH_TTL_MS),
    last_used_at: new Date(now),
    user_agent: String(userAgent || "").slice(0, 200),
  });

  // Keep only the newest MAX_SESSIONS devices (index-backed, cheap).
  const stale = await AuthSession.find({ user_id: userId })
    .sort({ last_used_at: -1 })
    .skip(MAX_SESSIONS)
    .select("_id")
    .lean();
  if (stale.length) await AuthSession.deleteMany({ _id: { $in: stale.map((s) => s._id) } });

  return token;
};

export default generatedRefreshToken;
