import userModel from "../models/User.model.js";
import { USER_STATUS } from "../config/constants.js";
import { deleteImage } from "../utils/imagekit.js";

// GET USER PROFILE
export const getUserProfile = async (req, res) => {
  try {
    const userId = req.userId;

    const user = await userModel
      .findById(userId)
      .select("-password -refresh_token -verifyTokenEmail")
      .lean();

    if (!user) {
      return res.status(404).json({
        message: "User Not Found",
        success: false,
        error: true,
      });
    }

    return res.status(200).json({
      message: "User Profile Fetched Successfully",
      success: true,
      error: false,
      user: user, // keep same key for frontend
    });
  } catch (err) {
    console.error("Error fetching in getUserProfile", err);

    return res.status(500).json({
      message: err.message || err,
      success: false,
      error: true,
    });
  }
};

// UPDATE USER PROFILE
export const updateUserProfile = async (req, res) => {
  try {
    const userId = req.userId;
    const { mobile, gender } = req.body;

    const updateData = {};

    // Mobile validation
    if (mobile !== undefined) {
      if (!/^\d{10}$/.test(mobile)) {
        return res.status(400).json({
          message: "Mobile must be 10 digits",
          success: false,
          error: true,
        });
      }
      updateData.mobile = mobile;
    }

    // Gender validation
    if (gender !== undefined) {
      const allowed = ["male", "female", "other"];
      if (!allowed.includes(gender)) {
        return res.status(400).json({
          message: "Invalid gender value",
          success: false,
          error: true,
        });
      }
      updateData.gender = gender;
    }

    const updatedUser = await userModel
      .findByIdAndUpdate(userId, updateData, {
        new: true,
        runValidators: true,
      })
      .select("-password -refresh_token")
      .lean();

    if (!updatedUser) {
      return res.status(404).json({
        message: "User not found",
        success: false,
        error: true,
      });
    }

    return res.status(200).json({
      message: "Profile updated successfully",
      success: true,
      error: false,
      user: updatedUser, // keep same key
    });
  } catch (err) {
    console.error("Error updating profile:", err);

    return res.status(500).json({
      message: err.message || err,
      success: false,
      error: true,
    });
  }
};

export const updateUserAvatar = async (req, res) => {
  try {
    const userId = req.userId;
    const { avatar } = req.body;

    if (!avatar?.url || !avatar?.fileId) {
      return res.status(400).json({
        success: false,
        error: true,
        message: "Avatar URL and fileId are required",
      });
    }

    const user = await userModel.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: true,
        message: "User not found",
      });
    }

    // Delete previous uploaded avatar (don't delete the default avatar)
    if (user.avatar?.fileId) {
      await deleteImage(user.avatar.fileId);
    }

    user.avatar = {
      url: avatar.url,
      fileId: avatar.fileId,
    };

    await user.save();

    const updatedUser = await userModel
      .findById(userId)
      .select("-password -refresh_token")
      .lean();

    return res.status(200).json({
      success: true,
      error: false,
      message: "Avatar updated successfully",
      user: updatedUser,
    });
  } catch (err) {
    console.error("Error updating avatar:", err);

    return res.status(500).json({
      success: false,
      error: true,
      message: err.message || "Internal server error",
    });
  }
};

export const removeUserAvatar = async (req, res) => {
  try {
    const userId = req.user._id;

    const user = await userModel.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Delete custom avatar from ImageKit
    if (user.avatar?.fileId) {
      await deleteImage(user.avatar.fileId);
    }

    // Remove custom avatar
    user.avatar = {
      url: null,
      fileId: null,
    };

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Avatar removed successfully",
      user,
    });
  } catch (error) {
    console.error("Remove avatar error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to remove avatar",
    });
  }
};

// DELETE ACCOUNT (SOFT DELETE)
export const deleteAccount = async (req, res) => {
  try {
    const userId = req.userId;

    const deletedUser = await userModel.findByIdAndUpdate(
      userId,
      {
        status: USER_STATUS.INACTIVE,
        refresh_token: null,
      },
      { new: true },
    );

    if (!deletedUser) {
      return res.status(404).json({
        message: "User not found or already deleted",
        success: false,
        error: true,
      });
    }

    const isProduction = process.env.NODE_ENV === "production";

    const cookieOptions = {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "None" : "Lax",
    };

    res
      .clearCookie("accessToken", cookieOptions)
      .clearCookie("refreshToken", cookieOptions)
      .status(200)
      .json({
        message: "Account deleted successfully",
        success: true,
        error: false,
      });
  } catch (err) {
    console.error("Error in deleteAccount controller:", err);

    return res.status(500).json({
      message: err.message || "Server error while deleting account",
      success: false,
      error: true,
    });
  }
};