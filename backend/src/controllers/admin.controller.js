import * as adminService from "../services/admin.service.js";
import * as adminUserService from "../services/admin.user.service.js";
import * as adminProductService from "../services/admin.product.service.js";
import * as campusService from "../services/campus.service.js";
import * as auditLogService from "../services/auditLog.service.js";
import * as moderationService from "../services/moderation.service.js";
import { safeErrorMessage } from "../utils/response.js";

const sendSuccess = (res, message, payload, statusCode = 200) =>
  res.status(statusCode).json({ success: true, error: false, message, ...payload });

const sendFailure = (res, error, statusCode = error?.statusCode || 400) =>
  res.status(statusCode).json({
    success: false,
    error: true,
    message: safeErrorMessage(error, "Request failed"),
  });

// ─── Dashboard ─────────────────────────────────────────────────────────────

export const getDashboard = async (req, res) => {
  try {
    const permissions = req.access?.permissions || {};
    const data = await adminService.getDashboardMetrics({
      scope: req.campusScope,
      can: (section) => Boolean(permissions[section]?.view),
    });
    return sendSuccess(res, "Dashboard data fetched", { data });
  } catch (error) {
    return sendFailure(res, error);
  }
};

// ─── User Details ──────────────────────────────────────────────────────────

export const getUserDetails = async (req, res) => {
  try {
    const data = await adminService.getUserDetails(req.params.id);
    return sendSuccess(res, "User details fetched", { data });
  } catch (error) {
    return sendFailure(res, error);
  }
};

// ─── User Status Update (with audit log) ──────────────────────────────────

export const updateUserStatusWithAudit = async (req, res) => {
  try {
    const user = await moderationService.moderateUserStatus({
      userId: req.params.id,
      status: req.body.status,
      reason: req.body.reason,
      actor: req.user,
    });
    return sendSuccess(res, "User status updated successfully", { data: user });
  } catch (error) {
    return sendFailure(res, error);
  }
};

// ─── Product Details ───────────────────────────────────────────────────────

export const getProductDetails = async (req, res) => {
  try {
    const data = await adminService.getProductDetails(req.params.id);
    return sendSuccess(res, "Product details fetched", { data });
  } catch (error) {
    return sendFailure(res, error);
  }
};

// ─── Product Status Update (with audit log) ───────────────────────────────

export const updateProductStatusWithAudit = async (req, res) => {
  try {
    const product = await moderationService.moderateProductStatus({
      productId: req.params.id,
      status: req.body.status,
      reason: req.body.reason,
      actor: req.user,
    });
    return sendSuccess(res, "Product status updated successfully", { data: product });
  } catch (error) {
    return sendFailure(res, error);
  }
};

// ─── Product Soft Delete (with audit log) ─────────────────────────────────

export const softDeleteProductWithAudit = async (req, res) => {
  try {
    const product = await adminProductService.softDeleteProduct(req.params.id);

    auditLogService
      .logAdminAction({
        actor: req.user,
        action: "product.soft_delete",
        targetType: "product",
        targetId: req.params.id,
        targetSnapshot: { title: product.title },
      })
      .catch(() => {});

    return sendSuccess(res, "Product soft deleted successfully", { data: product });
  } catch (error) {
    return sendFailure(res, error);
  }
};

// ─── Product Hard Delete (with audit log) ─────────────────────────────────

export const hardDeleteProductWithAudit = async (req, res) => {
  try {
    const result = await moderationService.deleteProductPermanently({
      productId: req.params.id,
      reason: req.body?.reason,
      actor: req.user,
    });
    return sendSuccess(res, "Product permanently deleted", { data: result });
  } catch (error) {
    return sendFailure(res, error);
  }
};

// ─── Moderation Queue ─────────────────────────────────────────────────────

export const getModerationQueue = async (req, res) => {
  try {
    const result = await adminService.getModerationQueue(req.query, req.campusScope);
    return sendSuccess(res, "Moderation queue fetched", result);
  } catch (error) {
    return sendFailure(res, error);
  }
};

// ─── Dismiss Reports ──────────────────────────────────────────────────────

export const dismissReports = async (req, res) => {
  try {
    const { targetId, targetModel } = req.body;
    if (!targetId || !targetModel) {
      return sendFailure(res, new Error("targetId and targetModel are required"));
    }
    const result = await moderationService.closeReports({ targetId, targetModel, outcome: "dismissed", actor: req.user });
    return sendSuccess(res, "Reports dismissed", { data: result });
  } catch (error) {
    return sendFailure(res, error);
  }
};

// ─── Resolve Reports ──────────────────────────────────────────────────────

export const resolveReports = async (req, res) => {
  try {
    const { targetId, targetModel, adminNote } = req.body;
    if (!targetId || !targetModel) {
      return sendFailure(res, new Error("targetId and targetModel are required"));
    }
    const result = await moderationService.closeReports({
      targetId,
      targetModel,
      outcome: "resolved",
      adminNote,
      actor: req.user,
    });
    return sendSuccess(res, "Reports resolved", { data: result });
  } catch (error) {
    return sendFailure(res, error);
  }
};


// ─── Campus Management (with audit log) ───────────────────────────────────

export const createCampusWithAudit = async (req, res, next) => {
  try {
    const campus = await campusService.createCampus(req.body);

    auditLogService
      .logAdminAction({
        actor: req.user,
        action: "campus.create",
        targetType: "campus",
        targetId: campus._id,
        targetSnapshot: { name: campus.name, slug: campus.slug },
      })
      .catch(() => {});

    return res.status(201).json({
      success: true,
      message: "Campus created successfully",
      data: campus,
    });
  } catch (error) {
    next(error);
  }
};

export const updateCampusWithAudit = async (req, res, next) => {
  try {
    const campus = await campusService.updateCampus(req.params.id, req.body);

    // Determine action subtype
    let action = "campus.update";
    if (req.body.is_active === true) action = "campus.activate";
    else if (req.body.is_active === false) action = "campus.pause";

    auditLogService
      .logAdminAction({
        actor: req.user,
        action,
        targetType: "campus",
        targetId: campus._id,
        targetSnapshot: { name: campus.name, slug: campus.slug },
        metadata: req.body.is_active !== undefined ? { is_active: req.body.is_active } : null,
      })
      .catch(() => {});

    return res.status(200).json({
      success: true,
      message: "Campus updated successfully",
      data: campus,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteCampusWithAudit = async (req, res, next) => {
  try {
    const campus = await campusService.deleteCampus(req.params.id);

    auditLogService
      .logAdminAction({
        actor: req.user,
        action: "campus.delete",
        targetType: "campus",
        targetId: campus._id,
        targetSnapshot: { name: campus.name, slug: campus.slug },
      })
      .catch(() => {});

    return res.status(200).json({
      success: true,
      message: "Campus deleted successfully",
      data: campus,
    });
  } catch (error) {
    next(error);
  }
};

// ─── Audit Log ────────────────────────────────────────────────────────────

export const getAuditLogs = async (req, res) => {
  try {
    const result = await auditLogService.getAuditLogs(req.query);
    return sendSuccess(res, "Audit logs fetched", result);
  } catch (error) {
    return sendFailure(res, error);
  }
};
