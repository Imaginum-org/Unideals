import express from "express";
import rateLimit from "express-rate-limit";
import auth from "../middlewares/auth.middleware.js";
import { pendingFollowups } from "../controllers/deal.controller.js";

const router = express.Router();

const followupLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { success: false, message: "Too many requests, try later" },
});

// Flags for the notification teammate:
// deals stuck at pickup_scheduled (needs payment_confirmation) or
// payment_confirmed (needs item_received) older than ?hours=.
router.get("/pending-followups", auth, followupLimiter, pendingFollowups);

export default router;
