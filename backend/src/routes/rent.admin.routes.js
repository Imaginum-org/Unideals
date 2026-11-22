// Rent & Borrow staff tools. Mounted at /api/admin/rent (before /api/admin).
// Works even while RENT_ENABLED is false, so staff can set blocks up first.
import express from "express";
import auth from "../middlewares/auth.middleware.js";
import { requireAccess, requireInScope } from "../middlewares/access.middleware.js";
import { validate } from "../middlewares/validation.middleware.js";
import { rentAdminPostActionSchema, rentCampusConfigSchema } from "../validations/rent.validation.js";
import * as c from "../controllers/rent.controller.js";

const router = express.Router();

router.get("/campuses", auth, requireAccess("rent", "view"), c.adminListCampuses);
router.put(
  "/campuses/:campusId",
  auth,
  requireAccess("rent", "manage"),
  requireInScope("campus", (req) => req.params.campusId),
  validate(rentCampusConfigSchema),
  c.adminUpdateCampus,
);

router.get("/posts", auth, requireAccess("rent", "view"), c.adminListPosts);
router.patch("/posts/:id", auth, requireAccess("rent", "manage"), validate(rentAdminPostActionSchema), c.adminModeratePost);

export default router;
