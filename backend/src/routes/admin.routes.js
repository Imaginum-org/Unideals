import express from "express";
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

const router = express.Router();

router.post("/auth/login", adminLogin);
router.post("/auth/refresh-token", adminRefreshToken);

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

export default router;
