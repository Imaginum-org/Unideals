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

  if (!user) {
    const error = new Error("No account found with this email");
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
    const error = new Error("Incorrect password");
    error.statusCode = 400;
    throw error;
  }

  const accessToken = await generatedAccessToken(user._id);
  const refreshToken = await generatedRefreshToken(user._id);

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

  if (!user || user.refresh_token !== refreshToken) {
    const error = new Error("Invalid or expired refresh token");
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

  const accessToken = await generatedAccessToken(user._id);
  const newRefreshToken = await generatedRefreshToken(user._id);

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
  });
};
