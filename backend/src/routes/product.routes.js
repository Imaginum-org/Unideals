import express from "express";
import { createProductSchema } from "../validations/product.validation.js";
import { validate } from "../middlewares/validation.middleware.js";
import auth, { optionalAuth } from "../middlewares/auth.middleware.js";
import rateLimit from "express-rate-limit";

import {
  createProduct,
  getAllProducts,
  getSingleProduct,
  getBoostedProducts,
  getSearchSuggestions,
  getTrendingProducts,
  searchProducts,
  getMyProducts,
  getMyDraftProducts,
  deleteProduct,
  unlistProduct,
  relistProduct,
  updateProduct,
  markProductSold,
} from "../controllers/product.controller.js";

const router = express.Router();

// RATE LIMIT
const createProductLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: "Too many product listings, please try later",
});

// Feed/detail guards: generous for browsing, bounded against view farming
// and aggregation scraping.
const feedLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { success: false, message: "Too many requests, please slow down" },
});

const detailLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { success: false, message: "Too many requests, please slow down" },
});

// Public aggregation endpoints: generous but bounded (per-keystroke traffic).
const searchLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { success: false, message: "Too many searches, please slow down" },
});

// Boosted products (must be before :id)
router.get("/boosted", optionalAuth, getBoostedProducts);
router.get("/search", searchLimiter, optionalAuth, searchProducts);
router.get("/search-suggestions", searchLimiter, optionalAuth, getSearchSuggestions);
router.get("/trending", searchLimiter, optionalAuth, getTrendingProducts);

// User's products (must be before :id)
router.get("/user/my-products", auth, getMyProducts);

// Draft
router.get("/user/drafts", auth, getMyDraftProducts);

router.get("/", feedLimiter, optionalAuth, getAllProducts);

router.post(
  "/",
  createProductLimiter,
  auth,
  validate(createProductSchema),
  createProduct,
);

// Delete and Unlist (must be before :id)
router.delete("/:id", auth, deleteProduct);
router.patch("/:id/unlist", auth, unlistProduct);
router.patch("/:id/relist", auth, relistProduct);
router.patch("/:id/sold", auth, markProductSold);
// Owner edit — the create schema is fully optional so it doubles as the
// partial-update validator (privileged keys are stripped server-side).
router.patch("/:id", auth, validate(createProductSchema), updateProduct);

router.get("/:id", detailLimiter, optionalAuth, getSingleProduct);

export default router;
