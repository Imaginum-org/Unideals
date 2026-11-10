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
import {
  getTargetReports,
  bulkProducts,
  bulkUsers,
  listSavedViews,
  createSavedView,
  deleteSavedView,
  listJobs,
  getJobRuns,
  triggerJob,
  systemStatus,
} from "../controllers/admin.ops.controller.js";
import {
  getMyProfile,
  updateMyProfile,
  changeMyPassword,
} from "../controllers/adminProfile.controller.js";

// Legacy controllers (still used directly for simple cases)
import { getUsers, getUserStats, updateUserRole, getGenderChangeRequests, reviewGenderChangeRequest } from "../controllers/admin.user.controller.js";
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
import { getTrends, getBreakdowns, getJobAnalytics } from "../controllers/admin.analytics.controller.js";
import { getAccess, updateSupportAccess, getAttention } from "../controllers/admin.access.controller.js";
import { requireAccess } from "../middlewares/access.middleware.js";

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

// Own profile (self-service for both roles)
const passwordChangeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { success: false, message: "Too many attempts, please try later" },
});
const staffOnly = [auth, requireRoles(USER_ROLES.ADMIN, USER_ROLES.SUPPORT)];
router.get("/profile", ...staffOnly, getMyProfile);
const adminOnly = [auth, requireRoles(USER_ROLES.ADMIN)];

// Saved list views (per staff member)
router.get("/saved-views", ...staffOnly, listSavedViews);
router.post("/saved-views", ...staffOnly, createSavedView);
router.delete("/saved-views/:id", ...staffOnly, deleteSavedView);

// Individual reports + chat evidence for one reported item
router.get("/moderation/reports", auth, requireAccess("reports", "view"), getTargetReports);

// Bulk moderation (admin only, max 100 items per request)
const bulkLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { success: false, message: "Too many bulk actions, slow down" },
});
router.post("/products/bulk", bulkLimiter, auth, requireAccess("listings", "manage"), bulkProducts);
router.post("/users/bulk", bulkLimiter, auth, requireAccess("users", "manage"), bulkUsers);

// Background jobs: status for staff, manual runs for admins
router.get("/system/status", auth, requireAccess("systemStatus", "view"), systemStatus);
router.get("/system/jobs", auth, requireAccess("jobs", "view"), listJobs);
router.get("/system/jobs/:key/runs", auth, requireAccess("jobs", "view"), getJobRuns);
router.post("/system/jobs/:key/run", auth, requireAccess("jobs", "manage"), triggerJob);
// Analytics for charts (read-only, computed from live records)
const analyticsLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { success: false, message: "Too many analytics requests, slow down" },
});
router.get("/analytics/trends", analyticsLimiter, ...staffOnly, getTrends);
router.get("/analytics/breakdown", analyticsLimiter, ...staffOnly, getBreakdowns);
router.get("/analytics/jobs", analyticsLimiter, auth, requireAccess("jobs", "view"), getJobAnalytics);

// Role access: everyone reads their own; only Super Admins edit support access.
router.get("/access", ...staffOnly, getAccess);
router.put("/access/support", ...adminOnly, updateSupportAccess);
// Sidebar/inbox counts, limited to sections the caller can see.
router.get("/attention", ...staffOnly, getAttention);
router.patch("/profile", ...staffOnly, updateMyProfile);
router.post("/profile/change-password", passwordChangeLimiter, ...staffOnly, changeMyPassword);

// Dashboard (real metrics)
// Both roles can view dashboard
router.get(
  "/dashboard",
  auth,
  requireAccess("dashboard", "view"),
  getDashboard,
);

// Moderation Queue
// Both roles can view and dismiss reports from the queue
router.get(
  "/moderation/queue",
  auth,
  requireAccess("reports", "view"),
  getModerationQueue,
);
router.post(
  "/moderation/dismiss",
  auth,
  requireAccess("reports", "manage"),
  dismissReports,
);
router.post(
  "/moderation/resolve",
  auth,
  requireAccess("reports", "manage"),
  resolveReports,
);

// Users
// Stats summary — both roles
router.get(
  "/users/stats",
  auth,
  requireAccess("users", "view"),
  getUserStats,
);

// List (paginated, searchable) — both roles
router.get(
  "/users",
  auth,
  requireAccess("users", "view"),
  getUsers,
);

// User detail drawer — both roles
router.get(
  "/users/:id",
  auth,
  requireAccess("users", "view"),
  getUserDetails,
);

// Status change (suspend/activate) — admin only
router.patch(
  "/users/:id/status",
  auth,
  requireAccess("users", "manage"),
  updateUserStatusWithAudit,
);

router.patch(
  "/users/:id/role",
  auth,
  requireRoles(USER_ROLES.ADMIN),
  updateUserRole,
);

// Gender change approvals (set-once gender; admin-only writes).
router.get(
  "/gender-requests",
  auth,
  requireAccess("genderRequests", "view"),
  getGenderChangeRequests,
);
router.patch(
  "/gender-requests/:id",
  auth,
  requireAccess("genderRequests", "manage"),
  reviewGenderChangeRequest,
);

// Products
// List — both roles
router.get(
  "/products",
  auth,
  requireAccess("listings", "view"),
  getProducts,
);

// Product detail drawer — both roles
router.get(
  "/products/:id",
  auth,
  requireAccess("listings", "view"),
  getProductDetails,
);

// Status change (block/unlist/list) — admin only
router.patch(
  "/products/:id/status",
  auth,
  requireAccess("listings", "manage"),
  updateProductStatusWithAudit,
);

// Destructive: soft-delete — admin only
router.patch(
  "/products/:id/soft-delete",
  auth,
  requireAccess("listings", "manage"),
  softDeleteProductWithAudit,
);

// Destructive: hard-delete — admin only
router.delete(
  "/products/:id",
  auth,
  requireAccess("listings", "manage"),
  hardDeleteProductWithAudit,
);

// Orders / Deals
router.get(
  "/orders/stats",
  auth,
  requireAccess("orders", "view"),
  getOrderStats,
);
router.get(
  "/orders",
  auth,
  requireAccess("orders", "view"),
  getOrders,
);
router.get(
  "/orders/:id",
  auth,
  requireAccess("orders", "view"),
  getOrderDetails,
);
router.patch(
  "/orders/:id/status",
  auth,
  requireAccess("orders", "manage"),
  updateOrderStatus,
);

// Campus Directory
// Read for both roles; writes for admin only.
// Slugs are immutable — pausing a campus hides its feeds via is_active.
// Reports moderation queue - read + review for support, writes already role-gated.
router.get(
  "/reports",
  auth,
  requireAccess("reports", "view"),
  getAdminReports,
);
router.patch(
  "/reports/:id",
  auth,
  requireAccess("reports", "manage"),
  reviewAdminReport,
);

// Campus list stays readable by all staff: it is reference data for the
// campus filters on other pages. "Campuses" access hides the page itself.
router.get(
  "/campuses",
  auth,
  requireRoles(USER_ROLES.ADMIN, USER_ROLES.SUPPORT),
  adminListCampuses,
);

router.post(
  "/campuses",
  auth,
  requireAccess("campuses", "manage"),
  validate(createCampusSchema),
  createCampusWithAudit,
);

router.patch(
  "/campuses/:id",
  auth,
  requireAccess("campuses", "manage"),
  validate(updateCampusSchema),
  updateCampusWithAudit,
);

router.delete(
  "/campuses/:id",
  auth,
  requireAccess("campuses", "manage"),
  deleteCampusWithAudit,
);

// Audit Log
// Admins see full audit log; support can read-only for transparency.
router.get(
  "/audit-log",
  auth,
  requireAccess("auditLog", "view"),
  getAuditLogs,
);

// Push Notifications
// Read stats, history, scheduled for both admin & support; mutations for admin only.
router.get(
  "/notifications/stats",
  auth,
  requireAccess("notifications", "view"),
  adminGetStats,
);
router.get(
  "/notifications/history",
  auth,
  requireAccess("notifications", "view"),
  adminGetHistory,
);
router.get(
  "/notifications/scheduled",
  auth,
  requireAccess("notifications", "view"),
  adminGetScheduled,
);
router.get(
  "/notifications/estimate-recipients",
  auth,
  requireAccess("notifications", "view"),
  adminEstimateRecipients,
);
router.post(
  "/notifications",
  auth,
  requireAccess("notifications", "manage"),
  adminCreateNotification,
);
router.patch(
  "/notifications/:id/cancel",
  auth,
  requireAccess("notifications", "manage"),
  adminCancelScheduled,
);

export default router;
