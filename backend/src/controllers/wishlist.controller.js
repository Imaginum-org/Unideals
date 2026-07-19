import User from "../models/User.model.js";
import Product from "../models/Product.model.js";

export const addToWishlist = async (req, res) => {
  try {
    const userId = req.user._id;
    const { productId } = req.body;

    if (!productId) {
      return res
        .status(400)
        .json({ success: false, message: "Product ID is required" });
    }

    const productExists = await Product.exists({ _id: productId });
    if (!productExists) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
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
      error: error.message,
    });
  }
};

export const removeFromWishlist = async (req, res) => {
  try {
    const userId = req.user._id;
    const { productId } = req.body;

    if (!productId) {
      return res
        .status(400)
        .json({ success: false, message: "Product ID is required" });
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
      error: error.message,
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
          select: "name avatar subscription rating",
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
      error: error.message,
    });
  }
};

export const isInWishlist = async (req, res) => {
  try {
    const userId = req.user._id;
    const { productId } = req.params;

    if (!productId) {
      return res
        .status(400)
        .json({ success: false, message: "Product ID is required" });
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
      error: error.message,
    });
  }
};

export const toggleWishlist = async (req, res) => {
  try {
    const userId = req.user._id;
    const { productId } = req.body;

    if (!productId) {
      return res
        .status(400)
        .json({ success: false, message: "Product ID is required" });
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
      error: error.message,
    });
  }
};
