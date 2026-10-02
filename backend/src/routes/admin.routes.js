import express from "express";
import rateLimit from "express-rate-limit";
import auth from "../middlewares/auth.middleware.js";
import requireRoles from "../middlewares/role.middleware.js";
import { USER_ROLES } from "../config/constants.js";
import {
  getUsers,
  updateUserStatus,
} from "../controllers/admin.user.controller.js";
import {
  getProducts,
  hardDeleteProduct,
  softDeleteProduct,
  updateProductStatus,
} from "../controllers/admin.product.controller.js";
import {
  adminLogin,
  adminLogout,
  adminMe,
  adminRefreshToken,
} from "../controllers/adminAuth.controller.js";
import {
  adminCreateCampus,
  adminListCampuses,
  adminUpdateCampus,
} from "../controllers/campus.controller.js";
import {
  createCampusSchema,
  updateCampusSchema,
} from "../validations/campus.validation.js";
import { validate } from "../middlewares/validation.middleware.js";

const router = express.Router();

// Privileged login: strict brute-force protection (no lockout exists
// server-side, so the limiter is the only guard).
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

// Read + moderation (support allowed)
router.get("/users", auth, requireRoles(USER_ROLES.ADMIN, USER_ROLES.SUPPORT), getUsers);
router.patch(
  "/users/:id/status",
  auth,
  requireRoles(USER_ROLES.ADMIN, USER_ROLES.SUPPORT),
  updateUserStatus,
);

router.get(
  "/products",
  auth,
  requireRoles(USER_ROLES.ADMIN, USER_ROLES.SUPPORT),
  getProducts,
);
router.patch(
  "/products/:id/status",
  auth,
  requireRoles(USER_ROLES.ADMIN, USER_ROLES.SUPPORT),
  updateProductStatus,
);
// Destructive deletes - admin only
router.patch(
  "/products/:id/soft-delete",
  auth,
  requireRoles(USER_ROLES.ADMIN),
  softDeleteProduct,
);
router.delete(
  "/products/:id",
  auth,
  requireRoles(USER_ROLES.ADMIN),
  hardDeleteProduct,
);

// Campus directory - read for support, writes for admin only.
// Slugs are immutable; pausing a campus hides its feeds via is_active.
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
  adminCreateCampus,
);
router.patch(
  "/campuses/:id",
  auth,
  requireRoles(USER_ROLES.ADMIN),
  validate(updateCampusSchema),
  adminUpdateCampus,
);

export default router;
