import express from "express";
import rateLimit from "express-rate-limit";
import auth from "../middlewares/auth.middleware.js";
import {
  boostProduct,
  getMyBoostSummary,
} from "../controllers/boost.controller.js";

const router = express.Router();

const boostLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { success: false, message: "Too many boost requests, try later" },
});

// Summary is a cheap read but fan-out heavy (dashboard polling) — 30/min.
const summaryLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { success: false, message: "Too many requests, try later" },
});

router.get("/me/summary", auth, summaryLimiter, getMyBoostSummary);
router.post("/products/:productId", auth, boostLimiter, boostProduct);

export default router;
