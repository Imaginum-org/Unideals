import * as productService from "../services/product.service.js";
import { deleteImage } from "../utils/imagekit.js";
import Product from "../models/Product.model.js";
import { PRODUCT_STATUS } from "../config/constants.js";
// CREATE PRODUCT
export const createProduct = async (req, res) => {
  const fileIds = req.body.images?.map((image) => image.fileId) || [];

  try {
    const user = req.user;
    const data = req.body;

    const product = await productService.createProduct(data, user);

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
    });
  } catch (error) {
    // Cleanup uploaded images if product fails
    if (fileIds.length > 0) {
      await Promise.all(fileIds.map((id) => deleteImage(id)));
    }

    return res.status(500).json({
      success: false,
      message: error.message || "Product creation failed",
    });
  }
};

// GET ALL PRODUCTS
export const getAllProducts = async (req, res, next) => {
  try {
    const result = await productService.getAllProducts(req.query);

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
    const product = await productService.getSingleProduct(req.params.id);

    return res.status(200).json({
      success: true,
      message: "Product fetched successfully",
      data: product,
    });
  } catch (error) {
    next(error);
  }
};

// GET BOOSTED PRODUCTS
export const getBoostedProducts = async (req, res, next) => {
  try {
    const products = await productService.getBoostedProducts();

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

    const suggestions = await productService.getSearchSuggestions(q);

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
    const { q } = req.query;

    if (!q || q.trim().length === 0) {
      return res.status(200).json({
        success: true,
        products: [],
      });
    }

    const products = await productService.searchProducts(q);

    return res.status(200).json({
      success: true,
      products,
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

    return res.status(200).json({
      success: true,
      message: "Product deleted successfully",
      data: product,
    });
  } catch (error) {
    next(error);
  }
};

export const unlistProduct = async (req, res, next) => {
  try {
    const productId = req.params.id;
    const userId = req.userId;

    const product = await productService.unlistProduct(productId, userId);

    return res.status(200).json({
      success: true,
      message: "Product unlisted successfully",
      data: product,
    });
  } catch (error) {
    next(error);
  }
};

export const relistProduct = async (req, res, next) => {
  try {
    const productId = req.params.id;
    const userId = req.userId;

    const product = await productService.relistProduct(productId, userId);

    return res.status(200).json({
      success: true,
      message: "Product relisted successfully",
      data: product,
    });
  } catch (error) {
    next(error);
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