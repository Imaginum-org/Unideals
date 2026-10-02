import { Router } from "express";
import rateLimit from "express-rate-limit";
import auth from "../middlewares/auth.middleware.js";
import {
  getMyBadges,
  recomputeMyBadges,
  getLeaderboard,
  getBadgeConfig,
} from "../controllers/badgeController.js";

const badgeRouter = Router();

/** GET /api/badges/config — public, no auth required */
badgeRouter.get("/config", getBadgeConfig);

/** GET /api/badges/me — returns current user gamification data */
badgeRouter.get("/me", auth, getMyBadges);

/** POST /api/badges/compute — recompute badges from scratch (expensive scan) */
const computeLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { success: false, message: "Too many attempts, please try later" },
});
badgeRouter.post("/compute", auth, computeLimiter, recomputeMyBadges);

/** GET /api/badges/leaderboard — top users by XP */
badgeRouter.get("/leaderboard", auth, getLeaderboard);

export default badgeRouter;
