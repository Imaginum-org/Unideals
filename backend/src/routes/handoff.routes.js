import express from "express";
import multer from "multer";
import rateLimit from "express-rate-limit";
import auth from "../middlewares/auth.middleware.js";
import {
  createHandoffSession,
  getHandoffSession,
  uploadHandoffPhotos,
} from "../controllers/handoff.controller.js";

const router = express.Router();

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_MIME = ["image/png", "image/jpeg", "image/jpg", "image/webp"];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE, files: 3 },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_MIME.includes(file.mimetype)) {
      cb(null, true);
    } else {
      const error = new Error("Only JPG, PNG or WEBP photos are allowed.");
      error.statusCode = 400;
      cb(error);
    }
  },
});

const createLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { success: false, message: "Too many photo sessions, try later" },
});

// Polling every few seconds while the step is open: generous but bounded.
const statusLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { success: false, message: "Too many requests, try later" },
});

const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { success: false, message: "Too many uploads, try later" },
});

router.post("/", auth, createLimiter, createHandoffSession);
router.get("/:code", auth, statusLimiter, getHandoffSession);
// Phone path: QR-secret auth inside the controller (no user session).
router.post(
  "/:code/photos",
  uploadLimiter,
  upload.array("photos", 3),
  uploadHandoffPhotos,
);

// Multer errors -> clean 400s (never HTML/crashes).
// eslint-disable-next-line no-unused-vars
router.use((err, req, res, next) => {
  if (err) {
    return res.status(err.statusCode || 400).json({
      success: false,
      message: err.message || "Invalid upload",
    });
  }
  next();
});

export default router;
