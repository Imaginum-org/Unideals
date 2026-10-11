import express from "express";
import rateLimit from "express-rate-limit";

import auth from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validation.middleware.js";

import {
  reportProductSchema,
  reportUserSchema,
} from "../validations/report.validation.js";

import { reportProduct, reportUser, reportSupport } from "../controllers/report.controller.js";

const router = express.Router();

const reportLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { success: false, message: "Too many reports, try later" },
});

const optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next();
  }
  return auth(req, res, () => {
    next();
  });
};

router.post(
  "/product/:productId",
  auth,
  reportLimiter,
  validate(reportProductSchema),
  reportProduct,
);

router.post("/user/:userId", auth, reportLimiter, validate(reportUserSchema), reportUser);

router.post("/support", optionalAuth, reportLimiter, reportSupport);

export default router;
