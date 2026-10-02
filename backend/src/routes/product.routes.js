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
} from "../controllers/product.controller.js";

const router = express.Router();

// RATE LIMIT
const createProductLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: "Too many product listings, please try later",
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

router.get("/", optionalAuth, getAllProducts);

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

router.get("/:id", optionalAuth, getSingleProduct);

export default router;
