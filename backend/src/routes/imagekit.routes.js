import express from "express";
import rateLimit from "express-rate-limit";
import { getAuthParams } from "../controllers/imagekit.controller.js";
import auth from "../middlewares/auth.middleware.js";

const router = express.Router();

const imagekitAuthLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { success: false, message: "Too many upload requests, try later" },
});

router.get("/auth", auth, imagekitAuthLimiter, getAuthParams);

export default router;
