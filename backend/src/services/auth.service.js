import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import userModel from "../models/User.model.js";
import { USER_STATUS } from "../config/constants.js";
import generatedAccessToken from "../utils/generatedAccessToken.js";
import generatedRefreshToken from "../utils/generatedRefreshToken.js";

export const getAuthCookieOptions = () => {
  const isProduction = process.env.NODE_ENV === "production";

  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "None" : "Lax",
    path: "/",
  };
};

export const setAuthCookies = (res, accessToken, refreshToken) => {
  const baseCookieOptions = getAuthCookieOptions();

  res.cookie("accessToken", accessToken, {
    ...baseCookieOptions,
    maxAge: 15 * 60 * 1000,
  });

  res.cookie("refreshToken", refreshToken, {
    ...baseCookieOptions,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
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

  const accessToken = await generatedAccessToken(user._id, user.tokenVersion || 0);
  const refreshToken = await generatedRefreshToken(user._id, user.tokenVersion || 0);

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
  const user = await userModel.findById(decoded.id).select("+refresh_token");

  if (!user || !user.refresh_token || user.refresh_token !== refreshToken) {
    // Possible reuse/theft: if token decodes but doesn't match stored token,
    // revoke stored session + bump tokenVersion to kill the stolen 15m
    // access token as well (force re-login on all devices).
    if (user && user.refresh_token && user.refresh_token !== refreshToken) {
      try {
        await userModel.findByIdAndUpdate(user._id, {
          refresh_token: null,
          $inc: { tokenVersion: 1 },
        });
      } catch {
        // ignore revocation errors
      }
    }
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

  const accessToken = await generatedAccessToken(user._id, user.tokenVersion || 0);
  const newRefreshToken = await generatedRefreshToken(user._id, user.tokenVersion || 0);

  return {
    accessToken,
    refreshToken: newRefreshToken,
    user: sanitizeAuthUser(user),
  };
};

export const revokeRefreshToken = async (userId) => {
  if (!userId) return;

  await userModel.findByIdAndUpdate(userId, {
    refresh_token: null,
    $inc: { tokenVersion: 1 },
  });
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
      .select("+refresh_token");
    if (user && user.refresh_token === refreshToken) {
      await userModel.findByIdAndUpdate(user._id, {
        refresh_token: null,
        $inc: { tokenVersion: 1 },
      });
      return true;
    }
    return false;
  } catch {
    return false;
  }
};
