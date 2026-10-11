import express from "express";
import rateLimit from "express-rate-limit";
import auth from "../middlewares/auth.middleware.js";
import { listOrders } from "../controllers/order.controller.js";

const router = express.Router();

const ordersLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { success: false, message: "Too many requests, try later" },
});

// Unified orders feed backed by the same Deal documents the chat renders,
// so chat stages and the orders page stay in complete sync.
router.get("/", auth, ordersLimiter, listOrders);

export default router;
