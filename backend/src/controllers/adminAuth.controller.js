import { USER_ROLES } from "../config/constants.js";
import {
  clearAuthCookies,
  loginWithPassword,
  refreshSession,
  revokeRefreshToken,
  sanitizeAuthUser,
  setAuthCookies,
} from "../services/auth.service.js";
import { safeErrorMessage } from "../utils/response.js";

const ADMIN_ROLES = [USER_ROLES.ADMIN, USER_ROLES.SUPPORT];

const sendAuthError = (res, error) =>
  res.status(error.statusCode || 500).json({
    success: false,
    error: true,
    message: safeErrorMessage(error, "Admin authentication failed"),
    accountBlocked: Boolean(error.accountBlocked),
    accountStatus: error.accountStatus,
  });

export const adminLogin = async (req, res) => {
  try {
    const session = await loginWithPassword({
      ...req.body,
      allowedRoles: ADMIN_ROLES,
    });

    setAuthCookies(res, session.accessToken, session.refreshToken);

    return res.status(200).json({
      success: true,
      error: false,
      message: "Admin login successful",
      data: {
        admin: session.user,
      },
    });
  } catch (error) {
    return sendAuthError(res, error);
  }
};

export const adminMe = async (req, res) => {
  return res.status(200).json({
    success: true,
    error: false,
    message: "Admin session fetched successfully",
    data: {
      admin: sanitizeAuthUser(req.user),
    },
  });
};

export const adminRefreshToken = async (req, res) => {
  try {
    const session = await refreshSession({
      refreshToken: req.cookies?.refreshToken,
      allowedRoles: ADMIN_ROLES,
    });

    setAuthCookies(res, session.accessToken, session.refreshToken);

    return res.status(200).json({
      success: true,
      error: false,
      message: "Admin session refreshed successfully",
      data: {
        admin: session.user,
      },
    });
  } catch (error) {
    clearAuthCookies(res);
    return sendAuthError(res, error);
  }
};

export const adminLogout = async (req, res) => {
  try {
    await revokeRefreshToken(req.userId);
    clearAuthCookies(res);

    return res.status(200).json({
      success: true,
      error: false,
      message: "Admin logged out successfully",
    });
  } catch (error) {
    return sendAuthError(res, error);
  }
};
