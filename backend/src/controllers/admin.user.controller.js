import * as adminUserService from "../services/admin.user.service.js";
import * as auditLogService from "../services/auditLog.service.js";
import { safeErrorMessage } from "../utils/response.js";

const sendSuccess = (res, message, payload, statusCode = 200) =>
  res.status(statusCode).json({
    success: true,
    error: false,
    message,
    ...payload,
  });

const sendFailure = (res, error, statusCode = 400) =>
  res.status(statusCode).json({
    success: false,
    error: true,
    message: safeErrorMessage(error, "Request failed"),
  });

export const getUsers = async (req, res) => {
  try {
    const result = await adminUserService.getUsers(req.query);
    return sendSuccess(res, "Users fetched successfully", result);
  } catch (error) {
    return sendFailure(res, error);
  }
};

export const updateUserStatus = async (req, res) => {
  try {
    const user = await adminUserService.updateUserStatus(
      req.params.id,
      req.body.status,
    );

    return sendSuccess(res, "User status updated successfully", {
      data: user,
    });
  } catch (error) {
    return sendFailure(res, error);
  }
};

export const updateUserRole = async (req, res) => {
  try {
    const user = await adminUserService.updateUserRole(
      req.params.id,
      req.body.role,
    );

    auditLogService
      .logAdminAction({
        actor: req.user,
        action: "user.role_change",
        targetType: "user",
        targetId: user.id || user._id,
        targetSnapshot: { name: user.name, email: user.email, role: user.role },
        metadata: { role: user.role },
      })
      .catch(() => {});

    return sendSuccess(res, "User role updated successfully", {
      data: user,
    });
  } catch (error) {
    return sendFailure(res, error);
  }
};

export const getUserStats = async (req, res) => {
  try {
    const stats = await adminUserService.getUserStats();
    return sendSuccess(res, "User stats fetched successfully", { data: stats });
  } catch (error) {
    return sendFailure(res, error);
  }
};

// Gender change approvals — admin only. Paginated, indexed by pending status.
export const getGenderChangeRequests = async (req, res) => {
  try {
    const result = await adminUserService.getGenderChangeRequests(req.query);
    return sendSuccess(res, "Gender change requests fetched", result);
  } catch (error) {
    return sendFailure(res, error);
  }
};

export const reviewGenderChangeRequest = async (req, res) => {
  try {
    const user = await adminUserService.reviewGenderChangeRequest(
      req.params.id,
      req.body?.action,
    );
    auditLogService
      .logAdminAction({
        actor: req.user,
        action: "user.gender_change_review",
        targetType: "user",
        targetId: user.id || user._id,
        targetSnapshot: { gender: user.gender },
        metadata: { action: req.body?.action },
      })
      .catch(() => {});
    return sendSuccess(res, "Gender change request reviewed", { data: user });
  } catch (error) {
    const msg = String(error?.message || "");
    const status = /not found/i.test(msg) ? 404 : /no pending/i.test(msg) ? 409 : 400;
    return sendFailure(res, error, status);
  }
};

