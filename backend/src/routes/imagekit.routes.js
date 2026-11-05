import express from "express";
import rateLimit from "express-rate-limit";
import { getAuthParams, deleteFile } from "../controllers/imagekit.controller.js";
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

// Orphan cleanup for publish/edit flows (frontend deleteImage tries
// DELETE /:fileId first, then falls back to DELETE /file { fileId }).
// Both kept for backwards-compatibility.
router.delete("/file", auth, imagekitAuthLimiter, deleteFile);
router.delete("/:fileId", auth, imagekitAuthLimiter, deleteFile);

export default router;
