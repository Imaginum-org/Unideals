// Rent & Borrow (student side). Mounted at /api/rent.
// Everything except /config 404s unless RENT_ENABLED=true and the caller's
// campus hasn't switched it off.
import express from "express";
import rateLimit from "express-rate-limit";
import auth, { optionalAuth } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validation.middleware.js";
import { requireRentEnabled } from "../services/rent.service.js";
import {
  createRentPostSchema,
  updateRentPostSchema,
  rentPostStatusSchema,
  rentReportSchema,
  createRentBookingSchema,
  rentReasonSchema,
  rentMessageSchema,
  rentRateSchema,
  rentProfileSchema,
} from "../validations/rent.validation.js";
import * as c from "../controllers/rent.controller.js";

const router = express.Router();

const limiter = (windowMs, max, message) =>
  rateLimit({ windowMs, max, standardHeaders: "draft-7", legacyHeaders: false, message: { success: false, message } });

const readLimiter = limiter(60 * 1000, 120, "Too many requests, please slow down");
const writeLimiter = limiter(60 * 1000, 30, "Too many actions, please slow down");
const postLimiter = limiter(60 * 1000, 5, "Too many posts, please try later");
const messageLimiter = limiter(60 * 1000, 20, "You're sending messages too fast");

router.get("/config", readLimiter, optionalAuth, c.getConfig);

router.use(auth, requireRentEnabled);

router.get("/me/profile", readLimiter, c.getProfile);
router.put("/me/profile", writeLimiter, validate(rentProfileSchema), c.updateProfile);

router.get("/posts", readLimiter, c.listPosts);
router.get("/posts/mine", readLimiter, c.listMyPosts);
router.post("/posts", postLimiter, validate(createRentPostSchema), c.createPost);
router.get("/posts/:id", readLimiter, c.getPost);
router.patch("/posts/:id", writeLimiter, validate(updateRentPostSchema), c.updatePost);
router.patch("/posts/:id/status", writeLimiter, validate(rentPostStatusSchema), c.setPostStatus);
router.delete("/posts/:id", writeLimiter, c.deletePost);
router.post("/posts/:id/report", writeLimiter, validate(rentReportSchema), c.reportPost);
router.post("/posts/:id/bookings", writeLimiter, validate(createRentBookingSchema), c.createBooking);

router.get("/bookings", readLimiter, c.listBookings);
router.get("/bookings/:id", readLimiter, c.getBooking);
router.post("/bookings/:id/accept", writeLimiter, c.acceptBooking);
router.post("/bookings/:id/decline", writeLimiter, validate(rentReasonSchema), c.declineBooking);
router.post("/bookings/:id/cancel", writeLimiter, validate(rentReasonSchema), c.cancelBooking);
router.post("/bookings/:id/handover", writeLimiter, c.confirmHandover);
router.post("/bookings/:id/return", writeLimiter, c.confirmReturn);
router.post("/bookings/:id/rate", writeLimiter, validate(rentRateSchema), c.rateBooking);
router.post("/bookings/:id/messages", messageLimiter, validate(rentMessageSchema), c.addMessage);

export default router;
