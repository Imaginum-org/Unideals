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
  const user = await userModel
    .findOne({ email: normalizedEmail })
    .select("+password");

  // Generic message prevents account enumeration (no distinction
  // between missing account vs wrong password). Verification status
  // is still surfaced via requiresVerification for UX.
  if (!user) {
    const error = new Error("Invalid email or password");
    error.statusCode = 400;
    throw error;
  }

  if (!user.is_email_verified) {
    const error = new Error(
      "Please verify your email address before logging in.",
    );
    error.statusCode = 403;
    error.requiresVerification = true;
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
    const error = new Error("This account does not have admin access");
    error.statusCode = 403;
    throw error;
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    const error = new Error("Invalid email or password");
    error.statusCode = 400;
    throw error;
  }

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
  );
  const user = await userModel.findById(decoded.id).select("+refresh_token");

  if (!user || !user.refresh_token || user.refresh_token !== refreshToken) {
    // Possible reuse/theft: if token decodes but doesn't match stored token,
    // revoke stored session to force re-login on all devices.
    if (user && user.refresh_token && user.refresh_token !== refreshToken) {
      try {
        await userModel.findByIdAndUpdate(user._id, { refresh_token: null });
      } catch {
        // ignore revocation errors
      }
    }
    const error = new Error("Invalid or expired refresh token");
    error.statusCode = 401;
    throw error;
  }

  // Token version check - invalidates all sessions on password reset / suspend
  if (
    typeof decoded.v === "number" &&
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
    const error = new Error("This account does not have admin access");
    error.statusCode = 403;
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
