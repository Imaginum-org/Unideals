import { Router } from "express";
import auth from "../middlewares/auth.middleware.js";
import { getMyRewards } from "../controllers/rewardController.js";

const rewardRouter = Router();

/** GET /api/rewards/me — current user's reward wallet (credits, frame, tags, history) */
rewardRouter.get("/me", auth, getMyRewards);

export default rewardRouter;
