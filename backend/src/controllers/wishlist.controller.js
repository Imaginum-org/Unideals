import mongoose from "mongoose";
import User from "../models/User.model.js";
import Product from "../models/Product.model.js";
import { getWishlistLimit } from "../config/subscriptionPlans.js";

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

// Plan entitlement: null limit = unlimited (Pro+).
const assertWishlistCapacity = async (userId, subscription) => {
  const limit = getWishlistLimit(subscription);
  if (typeof limit !== "number") return;
  const user = await User.findById(userId).select("wishlist").lean();
  if ((user?.wishlist?.length || 0) >= limit) {
    const error = new Error(
      `Wishlist limit reached (${limit} items on your plan). Upgrade to save more.`,
    );
    error.statusCode = 403;
    error.code = "WISHLIST_LIMIT";
    throw error;
  }
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

    const productExists = await Product.exists({ _id: productId });
    if (!productExists) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    }

    // Idempotent: re-adding a saved item is a no-op success even at cap.
    const alreadySaved = await User.exists({ _id: userId, wishlist: productId });
    if (alreadySaved) {
      const user = await User.findById(userId).select("wishlist").lean();
      return res.status(200).json({
        success: true,
        message: "Product added to wishlist",
        data: user?.wishlist || [],
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

    const user = await User.findById(userId)
      .populate({
        path: "wishlist",
        model: "Product",
        select:
          "_id title images category selling_price original_price seller_id location is_boosted boost_tier boost_expires_at",
        populate: {
          path: "seller_id",
          model: "User",
          select: "name avatar subscription",
        },
      })
      .select("wishlist");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Wishlist retrieved",
      data: user.wishlist || [],
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

    const productExists = await Product.exists({ _id: productId });
    if (!productExists) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
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
    if (!isAlreadyInWishlist) {
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
