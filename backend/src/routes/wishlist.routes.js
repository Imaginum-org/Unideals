import express from "express";
import rateLimit from "express-rate-limit";
import auth from "../middlewares/auth.middleware.js";
import {
  addToWishlist,
  removeFromWishlist,
  getWishlist,
  isInWishlist,
  toggleWishlist,
} from "../controllers/wishlist.controller.js";

const router = express.Router();
router.use(auth);

// Wishlist abuse guard: generous for normal saves, bounded against
// rapid add/remove cycling.
const wishlistLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { success: false, message: "Too many wishlist requests, try later" },
});
router.use(wishlistLimiter);
router.get("/", getWishlist);
router.post("/add", addToWishlist);
router.post("/remove", removeFromWishlist);
router.post("/toggle", toggleWishlist);
router.get("/check/:productId", isInWishlist);

export default router;
