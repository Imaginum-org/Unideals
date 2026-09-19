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

router.get("/me/summary", auth, getMyBoostSummary);
router.post("/products/:productId", auth, boostLimiter, boostProduct);

export default router;
