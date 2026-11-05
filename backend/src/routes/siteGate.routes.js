// [SITE-LOCK] testing gate — delete this file to remove the lock.
import express from "express";
import rateLimit from "express-rate-limit";
import { siteGateStatus, unlockSite } from "../controllers/siteGate.controller.js";

const router = express.Router();

// Shared testing password — brute-force guarded per IP. The password never
// leaves the server; clients only receive the signed cookie on success.
const unlockLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { success: false, message: "Too many attempts, try later" },
});

router.post("/unlock", unlockLimiter, unlockSite);
router.get("/status", siteGateStatus);

export default router;
