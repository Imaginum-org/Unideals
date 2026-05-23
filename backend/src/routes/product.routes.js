import express from "express";
import { createProductSchema } from "../validations/product.validation.js";
import { validate } from "../middlewares/validation.middleware.js";
import auth from "../middlewares/auth.middleware.js";
import rateLimit from "express-rate-limit";

import {
  createProduct,
  getAllProducts,
  getSingleProduct,
  getBoostedProducts,
  getSearchSuggestions,
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

// Boosted products (must be before :id)
router.get("/boosted", getBoostedProducts);
router.get("/search", searchProducts);
router.get("/search-suggestions", getSearchSuggestions);

// User's products (must be before :id)
router.get("/user/my-products", auth, getMyProducts);

// Draft
router.get("/user/drafts", auth, getMyDraftProducts);

router.get("/", getAllProducts);

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

router.get("/:id", getSingleProduct);

export default router;
