import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import userModel from "../models/User.model.js";
import { USER_STATUS } from "../config/constants.js";
import generatedAccessToken from "../utils/generatedAccessToken.js";
import generatedRefreshToken, { hashRefreshToken, sessionIdOf } from "../utils/generatedRefreshToken.js";
import AuthSession from "../models/AuthSession.model.js";
import { forgetSession } from "../utils/sessionCache.js";

export const getAuthCookieOptions = () => {
  const frontendUrl = process.env.FRONTEND_URL || "";
  // Secure cookies are required whenever the frontend is served over https
  // (cross-site None cookies are rejected without Secure). Don't rely
  // solely on NODE_ENV — a missing NODE_ENV=production on the host would
  // otherwise set Lax/non-secure cookies that browsers refuse to send
  // cross-site, breaking refresh and logging users out after ~15 minutes.
  const frontendIsHttps = frontendUrl
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .some((s) => s.startsWith("https://"));
  const secure =
    process.env.NODE_ENV === "production" ||
    process.env.COOKIE_SECURE === "true" ||
    frontendIsHttps;

  return {
    httpOnly: true,
    secure,
    sameSite: secure ? "None" : "Lax",
    path: "/",
  };
};

export const setAuthCookies = (res, accessToken, refreshToken) => {
  const baseCookieOptions = getAuthCookieOptions();

  res.cookie("accessToken", accessToken, {
    ...baseCookieOptions,
    maxAge: 15 * 60 * 1000,
  });

  // A grace-window replay has no new refresh token: leave the cookie the
  // first (rotating) response just set.
  if (refreshToken) {
    res.cookie("refreshToken", refreshToken, {
      ...baseCookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
  }
};

export const clearAuthCookies = (res) => {
  const cookieOptions = getAuthCookieOptions();

  res.clearCookie("accessToken", cookieOptions);
  res.clearCookie("refreshToken", cookieOptions);
};

export const sanitizeAuthUser = (user) => ({
  id: user._id?.toString(),
  name: user.name,
  email: user.email,
  role: user.role,
  status: user.status,
  avatar: user.avatar,
  gender: user.gender ?? null,
  genderUpdatedAt: user.genderUpdatedAt ?? null,
  campus_id: user.campus_id ?? null,
});

// Per-account failed-login throttle (in-memory, no new deps).
// Complements the IP-based express-rate-limiters: slows password guessing
// against a single account even when spread across IPs.
const loginFailures = new Map(); // key: normalized email -> { count, expiresAt }
const LOGIN_MAX_FAILS = 5;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;

const pruneLoginFailures = () => {
  const now = Date.now();
  for (const [key, entry] of loginFailures) {
    if (!entry || entry.expiresAt <= now) loginFailures.delete(key);
  }
};

const checkLoginThrottle = (normalizedEmail) => {
  const entry = loginFailures.get(normalizedEmail);
  if (entry && entry.expiresAt > Date.now() && entry.count >= LOGIN_MAX_FAILS) {
    const error = new Error("Too many login attempts. Please try again later.");
    error.statusCode = 429;
    throw error;
  }
  if (entry && entry.expiresAt <= Date.now()) loginFailures.delete(normalizedEmail);
};

const recordLoginFailure = (normalizedEmail) => {
  pruneLoginFailures();
  const now = Date.now();
  const entry = loginFailures.get(normalizedEmail);
  if (!entry || entry.expiresAt <= now) {
    loginFailures.set(normalizedEmail, { count: 1, expiresAt: now + LOGIN_WINDOW_MS });
  } else {
    entry.count += 1;
    loginFailures.set(normalizedEmail, entry);
  }
};

const clearLoginFailures = (normalizedEmail) => {
  loginFailures.delete(normalizedEmail);
};

export const loginWithPassword = async ({
  email,
  password,
  allowedRoles = null,
}) => {
  if (!email) {
    const error = new Error("Please provide Email");
    error.statusCode = 400;
    throw error;
  }
  if (!password) {
    const error = new Error("Please provide Password");
    error.statusCode = 400;
    throw error;
  }

  const normalizedEmail = email.trim().toLowerCase();
  checkLoginThrottle(normalizedEmail);
  const user = await userModel
    .findOne({ email: normalizedEmail })
    .select("+password");

  // Generic message prevents account enumeration (no distinction
  // between missing account vs wrong password). Verification status
  // is only surfaced AFTER a correct password (no oracle).
  if (!user) {
    // Dummy compare so missing accounts take ~as long as real ones
    // (blocks timing-based enumeration).
    await bcrypt.compare(
      "invalid-credential-dummy",
      "$2b$10$invalidinvalidinvalidinvalidinvalidinvali",
    );
    recordLoginFailure(normalizedEmail);
    checkLoginThrottle(normalizedEmail);
    const error = new Error("Invalid email or password");
    error.statusCode = 400;
    throw error;
  }

  if (user.status !== USER_STATUS.ACTIVE) {
    const statusLabel =
      user.status === USER_STATUS.SUSPENDED ? "suspended" : "inactive";
    const error = new Error(
      `Your account is ${statusLabel}. Please contact support.`,
    );
    error.statusCode = 403;
    error.accountBlocked = true;
    error.accountStatus = user.status;
    throw error;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Generic message: distinct "no admin access" would confirm valid
    // credentials for a non-admin account (role leak).
    recordLoginFailure(normalizedEmail);
    const error = new Error("Invalid credentials");
    error.statusCode = 401;
    throw error;
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    recordLoginFailure(normalizedEmail);
    try {
      checkLoginThrottle(normalizedEmail);
    } catch (throttleErr) {
      throw throttleErr;
    }
    const error = new Error("Invalid email or password");
    error.statusCode = 400;
    throw error;
  }

  // Verification gate AFTER correct password only — wrong-password probes
  // can no longer learn verified/unverified status.
  if (!user.is_email_verified) {
    const error = new Error(
      "Please verify your email address before logging in.",
    );
    error.statusCode = 403;
    error.requiresVerification = true;
    throw error;
  }

  clearLoginFailures(normalizedEmail);

  const refreshToken = await generatedRefreshToken(user._id, user.tokenVersion || 0);
  const accessToken = await generatedAccessToken(user._id, user.tokenVersion || 0, sessionIdOf(refreshToken));

  await userModel.findByIdAndUpdate(user._id, {
    last_login_date: new Date(),
  });

  return {
    accessToken,
    refreshToken,
    user: sanitizeAuthUser(user),
  };
};

export const refreshSession = async ({ refreshToken, allowedRoles = null }) => {
  if (!refreshToken) {
    const error = new Error("Refresh token required");
    error.statusCode = 401;
    throw error;
  }

  const decoded = jwt.verify(
    refreshToken,
    process.env.SECRET_KEY_REFRESH_TOKEN,
    { algorithms: ["HS256"] },
  );

  // Per-device session (tokens carrying `sid`). One indexed lookup by _id.
  if (decoded.sid) {
    return refreshDeviceSession({ decoded, refreshToken, allowedRoles });
  }

  // ---- Legacy single-token sessions (issued before per-device sessions).
  // Still honoured until they expire; a successful refresh moves the user
  // onto a device session and clears the old fields.
  const user = await userModel
    .findById(decoded.id)
    .select("+refresh_token +refresh_token_prev +refresh_token_prev_expires_at");

  // Grace-window replay: the token we just rotated out is still honored
  // briefly so parallel refreshes (multi-tab, retry storms) converge on
  // the same session instead of killing it. Reuses the CURRENT stored
  // token result below; no rotation here to avoid token thrash.
  const isGraceReplay =
    Boolean(user?.refresh_token_prev) &&
    user.refresh_token_prev === refreshToken &&
    user.refresh_token_prev_expires_at &&
    new Date(user.refresh_token_prev_expires_at).getTime() > Date.now();

  if (!user || (!isGraceReplay && (!user.refresh_token || user.refresh_token !== refreshToken))) {
    // Failed refresh never revokes: missing/expired/forged cookies just
    // fail this call. Only explicit logout, password reset, suspend, or
    // delete clear sessions. This stops false reuse-nukes from logging
    // users out on parallel refreshes or stale cookies.
    const error = new Error("Invalid or expired refresh token");
    error.statusCode = 401;
    throw error;
  }

  // Reject legacy pre-v tokens (force one re-login to mint v-bearing tokens).
  if (typeof decoded.v !== "number") {
    const error = new Error("Session revoked. Please log in again.");
    error.statusCode = 401;
    throw error;
  }

  // Token version check - invalidates all sessions on password reset / suspend
  if (
    typeof user.tokenVersion === "number" &&
    decoded.v !== user.tokenVersion
  ) {
    const error = new Error("Session revoked. Please log in again.");
    error.statusCode = 401;
    throw error;
  }

  if (user.status !== USER_STATUS.ACTIVE) {
    const statusLabel =
      user.status === USER_STATUS.SUSPENDED ? "suspended" : "inactive";
    const error = new Error(
      `Your account is ${statusLabel}. Please contact support.`,
    );
    error.statusCode = 403;
    error.accountBlocked = true;
    error.accountStatus = user.status;
    throw error;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    const error = new Error("Invalid credentials");
    error.statusCode = 401;
    throw error;
  }

  // Grace replay: hand out a fresh access token but keep the CURRENT
  // stored refresh token untouched, so both parallel callers converge on
  // the same session instead of thrashing rotations.
  if (isGraceReplay) {
    const accessToken = await generatedAccessToken(user._id, user.tokenVersion || 0);
    return {
      accessToken,
      refreshToken: user.refresh_token,
      user: sanitizeAuthUser(user),
    };
  }

  const newRefreshToken = await generatedRefreshToken(user._id, user.tokenVersion || 0);
  const accessToken = await generatedAccessToken(user._id, user.tokenVersion || 0, sessionIdOf(newRefreshToken));
  // Migrated: the legacy token must not be usable any more.
  await userModel.updateOne(
    { _id: user._id },
    { $set: { refresh_token: null, refresh_token_prev: null, refresh_token_prev_expires_at: null } },
  );

  return {
    accessToken,
    refreshToken: newRefreshToken,
    user: sanitizeAuthUser(user),
  };
};

const sessionError = (message = "Invalid or expired refresh token", statusCode = 401) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

/**
 * Refresh for a per-device session: the token's hash must be this
 * session's current one (or the previous one inside the grace window).
 * Then the same account checks as before (token version, status, role),
 * and the session rotates atomically. Other devices are untouched.
 */
const refreshDeviceSession = async ({ decoded, refreshToken, allowedRoles }) => {
  if (!mongoose.Types.ObjectId.isValid(decoded.sid) || !mongoose.Types.ObjectId.isValid(decoded.id)) {
    throw sessionError();
  }
  const hash = hashRefreshToken(refreshToken);
  const [session, user] = await Promise.all([
    AuthSession.findOne({ _id: decoded.sid, user_id: decoded.id })
      .select("token_hash prev_hash prev_expires_at")
      .lean(),
    userModel.findById(decoded.id),
  ]);
  if (!session || !user) throw sessionError();

  const isCurrent = session.token_hash === hash;
  const isGrace =
    !isCurrent &&
    session.prev_hash === hash &&
    session.prev_expires_at &&
    new Date(session.prev_expires_at).getTime() > Date.now();
  // Never revoke on a failed refresh (stale cookies, races): just fail it.
  if (!isCurrent && !isGrace) throw sessionError();

  if (typeof decoded.v !== "number" || (typeof user.tokenVersion === "number" && decoded.v !== user.tokenVersion)) {
    throw sessionError("Session revoked. Please log in again.");
  }
  if (user.status !== USER_STATUS.ACTIVE) {
    const statusLabel = user.status === USER_STATUS.SUSPENDED ? "suspended" : "inactive";
    const error = sessionError(`Your account is ${statusLabel}. Please contact support.`, 403);
    error.accountBlocked = true;
    error.accountStatus = user.status;
    throw error;
  }
  if (allowedRoles && !allowedRoles.includes(user.role)) throw sessionError("Invalid credentials");

  // Same device session before and after rotation.
  const accessToken = await generatedAccessToken(user._id, user.tokenVersion || 0, decoded.sid);
  if (isGrace) {
    // A parallel request already rotated this session: hand out a fresh
    // access token and keep the refresh token the first reply set.
    return { accessToken, refreshToken: null, user: sanitizeAuthUser(user) };
  }
  const newRefreshToken = await generatedRefreshToken(user._id, user.tokenVersion || 0, { sessionId: decoded.sid });
  return { accessToken, refreshToken: newRefreshToken, user: sanitizeAuthUser(user) };
};

/** Sign out ONE device: delete the session this refresh token belongs to. */
export const revokeSessionByToken = async (refreshToken) => {
  if (!refreshToken) return false;
  try {
    const decoded = jwt.verify(refreshToken, process.env.SECRET_KEY_REFRESH_TOKEN, { algorithms: ["HS256"] });
    if (!decoded.sid) return revokeRefreshTokenByToken(refreshToken); // legacy token
    const hash = hashRefreshToken(refreshToken);
    forgetSession(decoded.sid);
    const res = await AuthSession.deleteOne({
      _id: decoded.sid,
      user_id: decoded.id,
      $or: [{ token_hash: hash }, { prev_hash: hash }],
    });
    return res.deletedCount > 0;
  } catch {
    return false;
  }
};

/** Sign out EVERY device (password reset, "log out everywhere", admin). */
export const revokeRefreshToken = async (userId) => {
  if (!userId) return;

  await Promise.all([
    userModel.findByIdAndUpdate(userId, {
      refresh_token: null,
      refresh_token_prev: null,
      refresh_token_prev_expires_at: null,
      $inc: { tokenVersion: 1 },
    }),
    AuthSession.deleteMany({ user_id: userId }),
  ]);
};

export const revokeRefreshTokenByToken = async (refreshToken) => {
  if (!refreshToken) return false;
  try {
    const decoded = jwt.verify(
      refreshToken,
      process.env.SECRET_KEY_REFRESH_TOKEN,
      { algorithms: ["HS256"] },
    );
    const user = await userModel
      .findById(decoded.id)
      .select("+refresh_token +refresh_token_prev");
    if (
      user &&
      (user.refresh_token === refreshToken ||
        user.refresh_token_prev === refreshToken)
    ) {
      await userModel.findByIdAndUpdate(user._id, {
        refresh_token: null,
        refresh_token_prev: null,
        refresh_token_prev_expires_at: null,
        $inc: { tokenVersion: 1 },
      });
      return true;
    }
    return false;
  } catch {
    return false;
  }
};
