import mongoose from "mongoose";
import User from "../models/User.model.js";
import Product from "../models/Product.model.js";
import { PRODUCT_STATUS } from "../config/constants.js";
import { getWishlistLimit } from "../config/subscriptionPlans.js";

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

// Live (visible) wishlist size — dead refs from deleted listings never
// count against the plan cap, matching what GET / renders.
const getLiveWishlistCount = async (wishlistIds) => {
  if (!Array.isArray(wishlistIds) || wishlistIds.length === 0) return 0;
  return await Product.countDocuments({
    _id: { $in: wishlistIds },
    is_deleted: false,
  });
};

// Plan entitlement: null limit = unlimited (Pro+).
const assertWishlistCapacity = async (userId, subscription) => {
  const limit = getWishlistLimit(subscription);
  if (typeof limit !== "number") return;
  const user = await User.findById(userId).select("wishlist").lean();
  const liveCount = await getLiveWishlistCount(user?.wishlist);
  if (liveCount >= limit) {
    const error = new Error(
      `Wishlist limit reached (${limit} items on your plan). Upgrade to save more.`,
    );
    error.statusCode = 403;
    error.code = "WISHLIST_LIMIT";
    throw error;
  }
};

// Only live, listed products can be (re-)saved. Cross-campus saves are
// allowed (no block) — clients render the product's campus chip.
const assertSaveableProduct = async (productId) => {
  const product = await Product.findOne({
    _id: productId,
    is_deleted: false,
    status: PRODUCT_STATUS.LISTED,
  })
    .select("_id")
    .lean();
  if (!product) {
    const error = new Error("Product not found");
    error.statusCode = 404;
    throw error;
  }
  return product;
};

// Atomic post-check (race guard, same pattern as boost): roll back the add
// when parallel requests overshoot the plan cap.
const rollbackOnOverCap = async (userId, subscription) => {
  const limit = getWishlistLimit(subscription);
  if (typeof limit !== "number") return false;
  const user = await User.findById(userId).select("wishlist").lean();
  const liveCount = await getLiveWishlistCount(user?.wishlist);
  return liveCount > limit;
};

export const addToWishlist = async (req, res) => {
  try {
    const userId = req.user._id;
    const { productId } = req.body;

    if (!productId || !isValidObjectId(productId)) {
      return res
        .status(400)
        .json({ success: false, message: "Valid Product ID is required" });
    }

    // Idempotent: re-adding a saved item is a no-op success even at cap.
    // (Saveability — live + listed — is enforced by assertSaveableProduct
    // below, so no bare existence probe is needed on the add path.)
    const alreadySaved = await User.exists({ _id: userId, wishlist: productId });
    if (alreadySaved) {
      try {
        await assertSaveableProduct(productId);
      } catch (saveErr) {
        return res.status(saveErr.statusCode || 404).json({
          success: false,
          message: saveErr.message,
        });
      }
      const user = await User.findById(userId).select("wishlist").lean();
      return res.status(200).json({
        success: true,
        message: "Product added to wishlist",
        data: user?.wishlist || [],
      });
    }

    try {
      await assertSaveableProduct(productId);
    } catch (saveErr) {
      return res.status(saveErr.statusCode || 404).json({
        success: false,
        message: saveErr.message,
      });
    }

    try {
      await assertWishlistCapacity(userId, req.user.subscription);
    } catch (limitErr) {
      return res.status(limitErr.statusCode || 403).json({
        success: false,
        message: limitErr.message,
        code: limitErr.code,
      });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { $addToSet: { wishlist: productId } },
      { new: true, select: "wishlist" },
    ).lean();

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    // Post-add race guard: roll back when parallel adds overshoot the cap.
    if (await rollbackOnOverCap(userId, req.user.subscription)) {
      await User.findByIdAndUpdate(userId, { $pull: { wishlist: productId } });
      const limit = getWishlistLimit(req.user.subscription);
      return res.status(403).json({
        success: false,
        message: `Wishlist limit reached (${limit} items on your plan). Upgrade to save more.`,
        code: "WISHLIST_LIMIT",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Product added to wishlist",
      data: user.wishlist,
    });
  } catch (error) {
    console.error("Add to wishlist error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const removeFromWishlist = async (req, res) => {
  try {
    const userId = req.user._id;
    const { productId } = req.body;

    if (!productId || !isValidObjectId(productId)) {
      return res
        .status(400)
        .json({ success: false, message: "Valid Product ID is required" });
    }

    // $pull removes the item from the array directly in the DB
    const user = await User.findByIdAndUpdate(
      userId,
      { $pull: { wishlist: productId } },
      { new: true, select: "wishlist" },
    ).lean();

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Product removed from wishlist",
      data: user.wishlist,
    });
  } catch (error) {
    console.error("Remove from wishlist error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const getWishlist = async (req, res) => {
  try {
    const userId = req.user._id;

    // Pagination: page/limit clamped to 1–50 (default limit 20).
    let page = Number.parseInt(req.query.page, 10);
    let limit = Number.parseInt(req.query.limit, 10);
    if (!Number.isInteger(page) || page < 1) page = 1;
    if (!Number.isInteger(limit) || limit < 1) limit = 20;
    limit = Math.min(limit, 50);
    page = Math.min(page, 1000);
    const skip = (page - 1) * limit;

    const user = await User.findById(userId).select("wishlist").lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const wishlistIds = Array.isArray(user.wishlist) ? user.wishlist : [];
    // Dead refs from deleted listings are filtered out of the render.
    const match = { _id: { $in: wishlistIds }, is_deleted: false };
    const [total, items] = await Promise.all([
      wishlistIds.length > 0 ? Product.countDocuments(match) : 0,
      wishlistIds.length > 0
        ? Product.find(match)
            .select(
              "_id title images category selling_price original_price seller_id location is_boosted boost_tier boost_expires_at campus_id status",
            )
            .populate({
              path: "seller_id",
              model: "User",
              select: "name avatar subscription",
            })
            // Stable order so page boundaries never duplicate/skip items.
            .sort({ _id: -1 })
            .skip(skip)
            .limit(limit)
            .lean()
        : [],
    ]);

    return res.status(200).json({
      success: true,
      message: "Wishlist retrieved",
      data: items,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  } catch (error) {
    console.error("Get wishlist error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const isInWishlist = async (req, res) => {
  try {
    const userId = req.user._id;
    const { productId } = req.params;

    if (!productId || !isValidObjectId(productId)) {
      return res
        .status(400)
        .json({ success: false, message: "Valid Product ID is required" });
    }

    const userHasProduct = await User.exists({
      _id: userId,
      wishlist: productId,
    });

    return res.status(200).json({
      success: true,
      data: { isInWishlist: !!userHasProduct },
    });
  } catch (error) {
    console.error("Check wishlist error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const toggleWishlist = async (req, res) => {
  try {
    const userId = req.user._id;
    const { productId } = req.body;

    if (!productId || !isValidObjectId(productId)) {
      return res
        .status(400)
        .json({ success: false, message: "Valid Product ID is required" });
    }

    // Removal must always work (even for deleted/unlisted products). Only
    // the add path requires a live listed product; a bare existence probe
    // here preserves the 404 shape for IDs that never existed.
    const productExists = await Product.exists({ _id: productId });
    if (!productExists) {
      const inList = await User.exists({ _id: userId, wishlist: productId });
      if (!inList) {
        return res
          .status(404)
          .json({ success: false, message: "Product not found" });
      }
    }

    const user = await User.findById(userId).select("wishlist").lean();
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    const isAlreadyInWishlist = user.wishlist.some(
      (id) => id.toString() === productId.toString(),
    );

    // Only adding counts against the plan cap; removing is always allowed.
    // Adding requires a live listed product; cross-campus saves allowed.
    if (!isAlreadyInWishlist) {
      try {
        await assertSaveableProduct(productId);
      } catch (saveErr) {
        return res.status(saveErr.statusCode || 404).json({
          success: false,
          message: saveErr.message,
        });
      }
      try {
        await assertWishlistCapacity(userId, req.user.subscription);
      } catch (limitErr) {
        return res.status(limitErr.statusCode || 403).json({
          success: false,
          message: limitErr.message,
          code: limitErr.code,
        });
      }
    }

    const updateQuery = isAlreadyInWishlist
      ? { $pull: { wishlist: productId } }
      : { $addToSet: { wishlist: productId } };

    const updatedUser = await User.findByIdAndUpdate(userId, updateQuery, {
      new: true,
      select: "wishlist",
    }).lean();

    // Post-add race guard (add path only): roll back on cap overshoot.
    if (!isAlreadyInWishlist && (await rollbackOnOverCap(userId, req.user.subscription))) {
      await User.findByIdAndUpdate(userId, { $pull: { wishlist: productId } });
      const limit = getWishlistLimit(req.user.subscription);
      return res.status(403).json({
        success: false,
        message: `Wishlist limit reached (${limit} items on your plan). Upgrade to save more.`,
        code: "WISHLIST_LIMIT",
      });
    }

    return res.status(200).json({
      success: true,
      message: isAlreadyInWishlist
        ? "Product removed from wishlist"
        : "Product added to wishlist",
      data: {
        isInWishlist: !isAlreadyInWishlist,
        wishlist: updatedUser.wishlist,
      },
    });
  } catch (error) {
    console.error("Toggle wishlist error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
