import * as adminUserService from "../services/admin.user.service.js";
import { cachedAdminStat, viewKey } from "../utils/adminStatsCache.js";
import * as accessService from "../services/access.service.js";
import * as auditLogService from "../services/auditLog.service.js";
import * as userDeletionService from "../services/userDeletion.service.js";
import { safeErrorMessage } from "../utils/response.js";
import { getIdCardForReview } from "../services/genderRequest.service.js";

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
    const result = await adminUserService.getUsers(req.query, req.campusScope);
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

    // Custom access belongs to the support role; drop it when that role goes.
    if (user.role !== "support") await accessService.dropPersonAccess(user.id || user._id);

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
    const stats = await cachedAdminStat(`userStats:${viewKey(req.campusScope)}`, () => adminUserService.getUserStats(req.campusScope));
    return sendSuccess(res, "User stats fetched successfully", { data: stats });
  } catch (error) {
    return sendFailure(res, error);
  }
};

// Gender change approvals — admin only. Paginated, indexed by pending status.
export const getGenderChangeRequests = async (req, res) => {
  try {
    const result = await adminUserService.getGenderChangeRequests(req.query, req.campusScope);
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
      req.body?.note,
    );
    auditLogService
      .logAdminAction({
        actor: req.user,
        action: "user.gender_change_review",
        targetType: "user",
        targetId: user.id || user._id,
        targetSnapshot: { gender: user.gender },
        metadata: { action: req.body?.action, note: typeof req.body?.note === "string" ? req.body.note.slice(0, 300) : null },
      })
      .catch(() => {});
    return sendSuccess(res, "Gender change request reviewed", { data: user });
  } catch (error) {
    const msg = String(error?.message || "");
    const status = /not found/i.test(msg) ? 404 : /no pending/i.test(msg) ? 409 : 400;
    return sendFailure(res, error, status);
  }
};


// DELETE /admin/users/:id { confirmEmail, reason? } — Super Admin only.
// Permanently removes the account and everything linked to it (audited).
export const deleteUser = async (req, res) => {
  try {
    const result = await userDeletionService.deleteUserPermanently({
      userId: req.params.id,
      actor: req.user,
      confirmEmail: req.body?.confirmEmail,
      reason: req.body?.reason,
    });
    return sendSuccess(res, "Account and all linked data deleted", { data: result });
  } catch (error) {
    return sendFailure(res, error, error?.statusCode || 400);
  }
};

// The college ID photo for a pending request. Streamed straight from the
// database, never cached, and every view is audit-logged.
export const getGenderRequestIdCard = async (req, res) => {
  try {
    const card = await getIdCardForReview(req.params.id);
    auditLogService
      .logAdminAction({
        actor: req.user,
        action: "user.gender_id_view",
        targetType: "user",
        targetId: req.params.id,
      })
      .catch(() => {});
    res.set({
      "Content-Type": card.mimetype,
      "Content-Length": String(card.size),
      "Cache-Control": "no-store, private, max-age=0",
      Pragma: "no-cache",
      "Content-Disposition": "inline",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'",
      "Cross-Origin-Resource-Policy": "same-site",
    });
    // lean() returns BSON Binary; its .buffer is the image bytes.
    const bytes = Buffer.isBuffer(card.data) ? card.data : Buffer.from(card.data.buffer);
    return res.status(200).send(bytes);
  } catch (error) {
    return sendFailure(res, error, error?.statusCode || 400);
  }
};
