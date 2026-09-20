import express from "express";
import rateLimit from "express-rate-limit";
import auth from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validation.middleware.js";
import {
  createOrderSchema,
  verifyPaymentSchema,
} from "../validations/payment.validation.js";
import {
  createPaymentOrder,
  verifyPaymentOrder,
  getMyBilling,
  paymentWebhook,
} from "../controllers/payment.controller.js";

const router = express.Router();

const orderLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { success: false, message: "Too many payment attempts, try later" },
});

// Webhook is mounted separately in app.js with a raw-body parser and NO
// auth/validation (Razorpay signs the raw payload, not parsed JSON).
router.post("/orders", auth, orderLimiter, validate(createOrderSchema), createPaymentOrder);
router.post("/verify", auth, orderLimiter, validate(verifyPaymentSchema), verifyPaymentOrder);
router.get("/me", auth, getMyBilling);

export const paymentWebhookHandler = paymentWebhook;

export default router;
