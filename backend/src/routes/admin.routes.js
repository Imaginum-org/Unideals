import express from "express";
import rateLimit from "express-rate-limit";
import auth from "../middlewares/auth.middleware.js";
import requireRoles from "../middlewares/role.middleware.js";
import { USER_ROLES } from "../config/constants.js";

// Auth controllers
import {
  adminLogin,
  adminLogout,
  adminMe,
  adminRefreshToken,
} from "../controllers/adminAuth.controller.js";

// Legacy controllers (still used directly for simple cases)
import { getUsers, getUserStats, updateUserRole } from "../controllers/admin.user.controller.js";
import { getProducts } from "../controllers/admin.product.controller.js";
import {
  getOrders,
  getOrderStats,
  getOrderDetails,
  updateOrderStatus,
} from "../controllers/admin.order.controller.js";

// New unified admin controller with audit logging
import {
  getDashboard,
  getUserDetails,
  updateUserStatusWithAudit,
  getProductDetails,
  updateProductStatusWithAudit,
  softDeleteProductWithAudit,
  hardDeleteProductWithAudit,
  getModerationQueue,
  dismissReports,
  resolveReports,
  createCampusWithAudit,
  updateCampusWithAudit,
  deleteCampusWithAudit,
  getAuditLogs,
} from "../controllers/admin.controller.js";

// Campus read (support-accessible)
import { adminListCampuses } from "../controllers/campus.controller.js";

// Validations
import {
  getAdminReports,
  reviewAdminReport,
} from "../controllers/report.controller.js";
import {
  createCampusSchema,
  updateCampusSchema,
} from "../validations/campus.validation.js";
import { validate } from "../middlewares/validation.middleware.js";
import {
  adminCreateNotification,
  adminGetStats,
  adminGetHistory,
  adminGetScheduled,
  adminCancelScheduled,
  adminEstimateRecipients,
} from "../controllers/notification.controller.js";

const router = express.Router();

// Auth 
// Privileged login: strict brute-force protection.
const adminAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { success: false, message: "Too many attempts, please try later" },
});

router.post("/auth/login", adminAuthLimiter, adminLogin);
router.post("/auth/refresh-token", adminAuthLimiter, adminRefreshToken);
router.get("/auth/me", auth, requireRoles(USER_ROLES.ADMIN, USER_ROLES.SUPPORT), adminMe);
router.post("/auth/logout", auth, requireRoles(USER_ROLES.ADMIN, USER_ROLES.SUPPORT), adminLogout);

// Dashboard (real metrics)
// Both roles can view dashboard
router.get(
  "/dashboard",
  auth,
  requireRoles(USER_ROLES.ADMIN, USER_ROLES.SUPPORT),
  getDashboard,
);

// Moderation Queue
// Both roles can view and dismiss reports from the queue
router.get(
  "/moderation/queue",
  auth,
  requireRoles(USER_ROLES.ADMIN, USER_ROLES.SUPPORT),
  getModerationQueue,
);
router.post(
  "/moderation/dismiss",
  auth,
  requireRoles(USER_ROLES.ADMIN, USER_ROLES.SUPPORT),
  dismissReports,
);
router.post(
  "/moderation/resolve",
  auth,
  requireRoles(USER_ROLES.ADMIN, USER_ROLES.SUPPORT),
  resolveReports,
);

// Users
// Stats summary — both roles
router.get(
  "/users/stats",
  auth,
  requireRoles(USER_ROLES.ADMIN, USER_ROLES.SUPPORT),
  getUserStats,
);

// List (paginated, searchable) — both roles
router.get(
  "/users",
  auth,
  requireRoles(USER_ROLES.ADMIN, USER_ROLES.SUPPORT),
  getUsers,
);

// User detail drawer — both roles
router.get(
  "/users/:id",
  auth,
  requireRoles(USER_ROLES.ADMIN, USER_ROLES.SUPPORT),
  getUserDetails,
);

// Status change (suspend/activate) — both roles can moderate users
router.patch(
  "/users/:id/status",
  auth,
  requireRoles(USER_ROLES.ADMIN),
  updateUserStatusWithAudit,
);

router.patch(
  "/users/:id/role",
  auth,
  requireRoles(USER_ROLES.ADMIN),
  updateUserRole,
);

// Products
// List — both roles
router.get(
  "/products",
  auth,
  requireRoles(USER_ROLES.ADMIN, USER_ROLES.SUPPORT),
  getProducts,
);

// Product detail drawer — both roles
router.get(
  "/products/:id",
  auth,
  requireRoles(USER_ROLES.ADMIN, USER_ROLES.SUPPORT),
  getProductDetails,
);

// Status change (block/unlist/list) — both roles can moderate
router.patch(
  "/products/:id/status",
  auth,
  requireRoles(USER_ROLES.ADMIN),
  updateProductStatusWithAudit,
);

// Destructive: soft-delete — admin only
router.patch(
  "/products/:id/soft-delete",
  auth,
  requireRoles(USER_ROLES.ADMIN),
  softDeleteProductWithAudit,
);

// Destructive: hard-delete — admin only
router.delete(
  "/products/:id",
  auth,
  requireRoles(USER_ROLES.ADMIN),
  hardDeleteProductWithAudit,
);

// Orders / Deals
router.get(
  "/orders/stats",
  auth,
  requireRoles(USER_ROLES.ADMIN, USER_ROLES.SUPPORT),
  getOrderStats,
);
router.get(
  "/orders",
  auth,
  requireRoles(USER_ROLES.ADMIN, USER_ROLES.SUPPORT),
  getOrders,
);
router.get(
  "/orders/:id",
  auth,
  requireRoles(USER_ROLES.ADMIN, USER_ROLES.SUPPORT),
  getOrderDetails,
);
router.patch(
  "/orders/:id/status",
  auth,
  requireRoles(USER_ROLES.ADMIN),
  updateOrderStatus,
);

// Campus Directory
// Read for both roles; writes for admin only.
// Slugs are immutable — pausing a campus hides its feeds via is_active.
// Reports moderation queue - read + review for support, writes already role-gated.
router.get(
  "/reports",
  auth,
  requireRoles(USER_ROLES.ADMIN, USER_ROLES.SUPPORT),
  getAdminReports,
);
router.patch(
  "/reports/:id",
  auth,
  requireRoles(USER_ROLES.ADMIN, USER_ROLES.SUPPORT),
  reviewAdminReport,
);

router.get(
  "/campuses",
  auth,
  requireRoles(USER_ROLES.ADMIN, USER_ROLES.SUPPORT),
  adminListCampuses,
);

router.post(
  "/campuses",
  auth,
  requireRoles(USER_ROLES.ADMIN),
  validate(createCampusSchema),
  createCampusWithAudit,
);

router.patch(
  "/campuses/:id",
  auth,
  requireRoles(USER_ROLES.ADMIN),
  validate(updateCampusSchema),
  updateCampusWithAudit,
);

router.delete(
  "/campuses/:id",
  auth,
  requireRoles(USER_ROLES.ADMIN),
  deleteCampusWithAudit,
);

// Audit Log
// Admins see full audit log; support can read-only for transparency.
router.get(
  "/audit-log",
  auth,
  requireRoles(USER_ROLES.ADMIN, USER_ROLES.SUPPORT),
  getAuditLogs,
);

// Push Notifications
// Read stats, history, scheduled for both admin & support; mutations for admin only.
router.get(
  "/notifications/stats",
  auth,
  requireRoles(USER_ROLES.ADMIN, USER_ROLES.SUPPORT),
  adminGetStats,
);
router.get(
  "/notifications/history",
  auth,
  requireRoles(USER_ROLES.ADMIN, USER_ROLES.SUPPORT),
  adminGetHistory,
);
router.get(
  "/notifications/scheduled",
  auth,
  requireRoles(USER_ROLES.ADMIN, USER_ROLES.SUPPORT),
  adminGetScheduled,
);
router.get(
  "/notifications/estimate-recipients",
  auth,
  requireRoles(USER_ROLES.ADMIN, USER_ROLES.SUPPORT),
  adminEstimateRecipients,
);
router.post(
  "/notifications",
  auth,
  requireRoles(USER_ROLES.ADMIN),
  adminCreateNotification,
);
router.patch(
  "/notifications/:id/cancel",
  auth,
  requireRoles(USER_ROLES.ADMIN),
  adminCancelScheduled,
);

export default router;
