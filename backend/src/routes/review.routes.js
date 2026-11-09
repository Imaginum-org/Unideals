import { Router } from "express";
import rateLimit from "express-rate-limit";
import mongoose from "mongoose";
import auth from "../middlewares/auth.middleware.js";
import { createReview, getRatingSummary } from "../services/review.service.js";
import { forwardServiceError } from "../utils/response.js";

const router = Router();

const reviewLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { success: false, message: "Too many attempts, please try later" },
});

// POST /api/reviews { conversationId, rating 1-5, comment? }: buyer rates seller.
router.post("/", auth, reviewLimiter, async (req, res, next) => {
  try {
    const { conversationId, rating, comment } = req.body || {};
    const data = await createReview({ conversationId, userId: req.userId, rating, comment });
    return res.status(201).json({ success: true, message: "Thanks for rating", data });
  } catch (error) {
    forwardServiceError(error, next);
  }
});

// GET /api/reviews/me: my rating summary as a seller.
router.get("/me", auth, async (req, res, next) => {
  try {
    return res.json({ success: true, data: await getRatingSummary(req.userId, { recent: 3 }) });
  } catch (error) {
    forwardServiceError(error, next);
  }
});

// GET /api/reviews/user/:id: any seller's rating summary.
router.get("/user/:id", auth, async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ success: false, message: "Invalid user" });
    return res.json({ success: true, data: await getRatingSummary(req.params.id, { recent: 5 }) });
  } catch (error) {
    forwardServiceError(error, next);
  }
});

export default router;
