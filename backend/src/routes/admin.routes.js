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
import { getUsers } from "../controllers/admin.user.controller.js";
import { getProducts } from "../controllers/admin.product.controller.js";

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
  createCampusWithAudit,
  updateCampusWithAudit,
  getAuditLogs,
} from "../controllers/admin.controller.js";

// Campus read (support-accessible)
import { adminListCampuses } from "../controllers/campus.controller.js";

// Validations
import {
  createCampusSchema,
  updateCampusSchema,
} from "../validations/campus.validation.js";
import { validate } from "../middlewares/validation.middleware.js";

const router = express.Router();

// ─── Auth ──────────────────────────────────────────────────────────────────
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

// ─── Dashboard (real metrics) ──────────────────────────────────────────────
// Both roles can view dashboard
router.get(
  "/dashboard",
  auth,
  requireRoles(USER_ROLES.ADMIN, USER_ROLES.SUPPORT),
  getDashboard,
);

// ─── Moderation Queue ──────────────────────────────────────────────────────
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

// ─── Users ─────────────────────────────────────────────────────────────────
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
  requireRoles(USER_ROLES.ADMIN, USER_ROLES.SUPPORT),
  updateUserStatusWithAudit,
);

// ─── Products ──────────────────────────────────────────────────────────────
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
  requireRoles(USER_ROLES.ADMIN, USER_ROLES.SUPPORT),
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

// ─── Campus Directory ──────────────────────────────────────────────────────
// Read for both roles; writes for admin only.
// Slugs are immutable — pausing a campus hides its feeds via is_active.
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

// ─── Audit Log ─────────────────────────────────────────────────────────────
// Admins see full audit log; support can read-only for transparency.
router.get(
  "/audit-log",
  auth,
  requireRoles(USER_ROLES.ADMIN, USER_ROLES.SUPPORT),
  getAuditLogs,
);

export default router;
