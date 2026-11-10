import * as adminProfileService from "../services/adminProfile.service.js";
import * as auditLogService from "../services/auditLog.service.js";
import { setAuthCookies } from "../services/auth.service.js";
import generatedAccessToken from "../utils/generatedAccessToken.js";
import generatedRefreshToken from "../utils/generatedRefreshToken.js";
import { safeErrorMessage } from "../utils/response.js";

const sendFailure = (res, error) =>
  res.status(error.statusCode || 400).json({
    success: false,
    error: true,
    message: safeErrorMessage(error, "Request failed"),
  });

export const getMyProfile = async (req, res) => {
  try {
    const data = await adminProfileService.getAdminProfile(req.userId || req.user?._id);
    return res.status(200).json({ success: true, error: false, message: "Profile fetched", data });
  } catch (error) {
    return sendFailure(res, error);
  }
};

export const updateMyProfile = async (req, res) => {
  try {
    const data = await adminProfileService.updateAdminProfile(
      req.userId || req.user?._id,
      req.body,
    );
    return res.status(200).json({ success: true, error: false, message: "Profile updated", data });
  } catch (error) {
    return sendFailure(res, error);
  }
};

export const changeMyPassword = async (req, res) => {
  try {
    const userId = req.userId || req.user?._id;
    const { tokenVersion } = await adminProfileService.changeAdminPassword(userId, req.body);

    // Every other session is now revoked (tokenVersion bumped). Keep this
    // one signed in by issuing fresh tokens at the new version.
    const accessToken = await generatedAccessToken(userId, tokenVersion);
    const refreshToken = await generatedRefreshToken(userId, tokenVersion);
    setAuthCookies(res, accessToken, refreshToken);

    auditLogService
      .logAdminAction({
        actor: req.user,
        action: "admin.password_change",
        targetType: "user",
        targetId: userId,
        targetSnapshot: { name: req.user?.name, email: req.user?.email },
      })
      .catch(() => {});

    return res.status(200).json({
      success: true,
      error: false,
      message: "Password changed. Other sessions have been signed out.",
    });
  } catch (error) {
    return sendFailure(res, error);
  }
};
