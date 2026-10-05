import * as productService from "../services/product.service.js";
import { resolveRequestCampus } from "../services/campus.service.js";
import { deleteImage } from "../utils/imagekit.js";
import { forwardServiceError } from "../utils/response.js";
import Product from "../models/Product.model.js";
import { PRODUCT_STATUS } from "../config/constants.js";
import { computeAndAwardBadges } from "../services/badgeService.js";

// CREATE PRODUCT
export const createProduct = async (req, res) => {
  // Only collect well-formed fileIds for cleanup to prevent arbitrary deletion.
  // ImageKit file IDs are alphanumeric with _-/; cap at 3 (max images).
  const rawFileIds = Array.isArray(req.body.images)
    ? req.body.images.map((image) => image?.fileId).filter(Boolean)
    : [];
  const fileIds = rawFileIds
    .filter(
      (id) =>
        typeof id === "string" &&
        id.length <= 256 &&
        /^[A-Za-z0-9_\-/]+$/.test(id),
    )
    .slice(0, 3);

  try {
    const user = req.user;
    const data = req.body;

    const product = await productService.createProduct(data, user);

    let gamification = null;
    try {
      gamification = await computeAndAwardBadges(user._id);
    } catch (gamifyErr) {
      console.error("Error updating gamification on createProduct:", gamifyErr);
    }

    const productCount = await Product.countDocuments({
      seller_id: user._id,
      status: PRODUCT_STATUS.LISTED,
      is_deleted: false,
    });

    const isFirstListing = productCount === 1;

    return res.status(201).json({
      success: true,
      message: "Product created successfully",
      data: product,
      isFirstListing,
      gamification,
    });
  } catch (error) {
    // Cleanup uploaded images if product fails (best-effort, never fails request)
    if (fileIds.length > 0) {
      await Promise.allSettled(fileIds.map((id) => deleteImage(id)));
    }

    const clientErrors = [
      "Images are required",
      "already listed a similar product",
      "Selling price cannot be greater",
      "Invalid purchase date",
      "Purchase date cannot be",
      "Listing limit reached",
      "Invalid listing status",
      "Campus is required",
      "campus is unavailable",
    ];
    const isClientError =
      error.code === "LISTING_LIMIT" ||
      clientErrors.some((m) => String(error.message || "").includes(m));

    return res.status(error.code === "LISTING_LIMIT" ? 403 : isClientError ? 400 : 500).json({
      success: false,
      message: isClientError ? error.message : "Product creation failed",
      ...(error.code ? { code: error.code } : {}),
    });
  }
};

// GET ALL PRODUCTS
export const getAllProducts = async (req, res, next) => {
  try {
    const campus = await resolveRequestCampus(req);
    const result = await productService.getAllProducts(req.query, campus._id);

    return res.status(200).json({
      success: true,
      message: "Products fetched successfully",
      ...result, // keep for frontend
    });
  } catch (error) {
    next(error);
  }
};

// GET SINGLE PRODUCT
export const getSingleProduct = async (req, res, next) => {
  try {
    const campus = await resolveRequestCampus(req);
    const product = await productService.getSingleProduct(
      req.params.id,
      campus._id,
      req.userId || null,
    );

    // Owner sees extra snapshot fields — never share across users.
    res.set("Cache-Control", "private, max-age=30, must-revalidate");
    return res.status(200).json({
      success: true,
      message: "Product fetched successfully",
      data: product,
    });
  } catch (error) {
    forwardServiceError(error, next);
  }
};

// GET BOOSTED PRODUCTS
export const getBoostedProducts = async (req, res, next) => {
  try {
    const campus = await resolveRequestCampus(req);
    const products = await productService.getBoostedProducts(campus._id);

    // Same content per campus URL for every viewer — edge-cacheable.
    res.set("Cache-Control", "public, max-age=60, s-maxage=300");
    return res.status(200).json({
      success: true,
      message: "Boosted products fetched successfully",
      data: products,
    });
  } catch (error) {
    next(error);
  }
};

export const getSearchSuggestions = async (req, res, next) => {
  try {
    const { q } = req.query;

    // Prevent unnecessary DB calls
    if (!q || q.trim().length < 2) {
      return res.status(200).json({
        success: true,
        data: [],
      });
    }

    const campus = await resolveRequestCampus(req);
    const suggestions = await productService.getSearchSuggestions(
      q,
      campus._id,
    );

    return res.status(200).json({
      success: true,
      data: suggestions,
    });
  } catch (error) {
    next(error);
  }
};

export const searchProducts = async (req, res, next) => {
  try {
    const {
      q,
      page,
      limit,
      sort,
      category,
      condition,
      min_price,
      max_price,
    } = req.query;

    if (!q || String(q).trim().length === 0) {
      return res.status(200).json({
        success: true,
        products: [],
        pagination: { total: 0, page: 1, limit: 20, totalPages: 1 },
      });
    }

    const result = await productService.searchProducts(
      {
        q,
        page,
        limit,
        sort,
        category,
        condition,
        min_price,
        max_price,
      },
      (await resolveRequestCampus(req))._id,
    );

    return res.status(200).json({
      success: true,
      ...result, // { products, pagination } — `products` key retained
    });
  } catch (error) {
    next(error);
  }
};

export const getTrendingProducts = async (req, res, next) => {
  try {
    const campus = await resolveRequestCampus(req);
    const products = await productService.getTrendingProducts(8, campus._id);
    // Same content per campus URL for every viewer — edge-cacheable.
    res.set("Cache-Control", "public, max-age=60, s-maxage=300");
    return res.status(200).json({
      success: true,
      message: "Trending products fetched successfully",
      data: products,
    });
  } catch (error) {
    next(error);
  }
};

export const getMyProducts = async (req, res, next) => {
  try {
    const userId = req.userId;

    const products = await productService.getUserProducts(userId);

    return res.status(200).json({
      success: true,
      message: "Your products fetched successfully",
      data: products,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteProduct = async (req, res, next) => {
  try {
    const productId = req.params.id;
    const userId = req.userId;

    const product = await productService.deleteProduct(productId, userId);

    computeAndAwardBadges(userId).catch((err) =>
      console.error("Error updating gamification on deleteProduct:", err),
    );

    return res.status(200).json({
      success: true,
      message: "Product deleted successfully",
      data: product,
    });
  } catch (error) {
    forwardServiceError(error, next);
  }
};

export const unlistProduct = async (req, res, next) => {
  try {
    const productId = req.params.id;
    const userId = req.userId;

    const product = await productService.unlistProduct(productId, userId);

    computeAndAwardBadges(userId).catch((err) =>
      console.error("Error updating gamification on unlistProduct:", err),
    );

    return res.status(200).json({
      success: true,
      message: "Product unlisted successfully",
      data: product,
    });
  } catch (error) {
    forwardServiceError(error, next);
  }
};

export const relistProduct = async (req, res, next) => {
  try {
    const productId = req.params.id;
    const userId = req.userId;

    const product = await productService.relistProduct(productId, userId);

    computeAndAwardBadges(userId).catch((err) =>
      console.error("Error updating gamification on relistProduct:", err),
    );

    return res.status(200).json({
      success: true,
      message: "Product relisted successfully",
      data: product,
    });
  } catch (error) {
    forwardServiceError(error, next);
  }
};

export const getMyDraftProducts = async (req, res, next) => {
  try {
    const userId = req.userId;

    const drafts = await productService.getMyDraftProducts(userId);

    return res.status(200).json({
      success: true,

      message: "Draft products fetched successfully",

      data: drafts,
    });
  } catch (error) {
    next(error);
  }
};