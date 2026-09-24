import { Router } from "express";
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

/** POST /api/badges/compute — recompute badges from scratch */
badgeRouter.post("/compute", auth, recomputeMyBadges);

/** GET /api/badges/leaderboard — top users by XP */
badgeRouter.get("/leaderboard", auth, getLeaderboard);

export default badgeRouter;
