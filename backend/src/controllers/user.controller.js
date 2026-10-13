import bcrypt from "bcrypt";
import userModel from "../models/User.model.js";
import { USER_STATUS } from "../config/constants.js";
import { deleteImage } from "../utils/imagekit.js";
import { safeErrorMessage } from "../utils/response.js";
import { computeLevel, xpToNextLevel, levelProgress, computeAndAwardBadges } from "../services/badgeService.js";
import { clearAuthCookies } from "../services/auth.service.js";

// GET USER PROFILE
export const getUserProfile = async (req, res) => {
  try {
    const userId = req.userId;

    const user = await userModel
      .findById(userId)
      .select("-password -refresh_token -verifyTokenEmail")
      .populate("campus_id", "slug name short_name city state is_active")
      .lean();

    if (!user) {
      return res.status(404).json({
        message: "User Not Found",
        success: false,
        error: true,
      });
    }

    if (user.gamification) {
      const xp = user.gamification.total_xp || 0;
      const level = computeLevel(xp);
      user.gamification.level = level;
      user.gamification.xp_to_next_level = xpToNextLevel(xp);
      user.gamification.progress_percent = levelProgress(xp);
      user.gamification.next_level = level + 1;
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
      message: safeErrorMessage(err),
      success: false,
      error: true,
    });
  }
};

// UPDATE USER PROFILE
export const updateUserProfile = async (req, res) => {
  try {
    const userId = req.userId;
    const { mobile, gender, campus_slug } = req.body;

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

    // Gender: set-once via onboarding gate, then locked (admin approval only).
    // First set (gender==null) is free. Later changes via this route are
    // rejected — users must file POST /requestGenderChange for admin review.
    if (gender !== undefined) {
      const allowed = ["male", "female", "other"];
      if (!allowed.includes(gender)) {
        return res.status(400).json({
          message: "Invalid gender value",
          success: false,
          error: true,
        });
      }
      const current = await userModel.findById(userId).select("gender genderUpdatedAt role").lean();
      if (current && current.gender !== gender) {
        if (current.gender !== null && current.gender !== undefined) {
          return res.status(403).json({
            message: "Gender is locked. Please request admin approval to change it.",
            success: false,
            error: true,
            code: "GENDER_LOCKED",
          });
        }
        updateData.gender = gender;
        updateData.genderUpdatedAt = new Date();
      }
    }

    // Campus selection (onboarding gate + Settings change).
    // Slug validated against active directory; live listings migrate
    // to the new campus in the same request.
    let movedListings = 0;
    if (campus_slug !== undefined) {
      const { getActiveCampusBySlug } = await import(
        "../services/campus.service.js"
      );
      let campus;
      try {
        campus = await getActiveCampusBySlug(campus_slug);
      } catch (e) {
        return res.status(e.statusCode || 400).json({
          message: e.message,
          success: false,
          error: true,
          ...(e.code ? { code: e.code } : {}),
        });
      }
      updateData.campus_id = campus._id;

      try {
        const Product = (await import("../models/Product.model.js")).default;
        const result = await Product.updateMany(
          { seller_id: userId, is_deleted: false, status: "listed" },
          { $set: { campus_id: campus._id } },
        );
        movedListings = result?.modifiedCount || 0;
      } catch {
        // best-effort only — profile update still succeeds
      }
    }

    const updatedUser = await userModel
      .findByIdAndUpdate(userId, updateData, {
        new: true,
        runValidators: true,
      })
      .select("-password -refresh_token")
      .populate("campus_id", "slug name short_name city state is_active")
      .lean();

    if (!updatedUser) {
      return res.status(404).json({
        message: "User not found",
        success: false,
        error: true,
      });
    }

    // Recompute badges/gamification in background if profile fields change
    computeAndAwardBadges(userId).catch((err) =>
      console.error("Error updating gamification on updateUserProfile:", err),
    );

    if (updatedUser.gamification) {
      const xp = updatedUser.gamification.total_xp || 0;
      const level = computeLevel(xp);
      updatedUser.gamification.level = level;
      updatedUser.gamification.xp_to_next_level = xpToNextLevel(xp);
      updatedUser.gamification.progress_percent = levelProgress(xp);
      updatedUser.gamification.next_level = level + 1;
    }

    // Girls Corner 🌸 auto-unlist: leaving female unlists girls-only listings
    // (reversible via relist once eligible again). Widening is free.
    let unlistedGirlsOnly = 0;
    if (updateData.gender !== undefined && updateData.gender !== "female") {
      try {
        const Product = (await import("../models/Product.model.js")).default;
        const r = await Product.updateMany(
          { seller_id: userId, isGirlsOnly: true, status: "listed", is_deleted: false },
          { $set: { status: "unlisted", is_boosted: false } },
        );
        unlistedGirlsOnly = r?.modifiedCount || 0;
      } catch {
        // best-effort only
      }
    }

    return res.status(200).json({
      message: "Profile updated successfully",
      success: true,
      error: false,
      user: updatedUser, // keep same key
      movedListings,
      unlistedGirlsOnly,
    });
  } catch (err) {
    console.error("Error updating profile:", err);

    return res.status(500).json({
      message: safeErrorMessage(err),
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

    if (
      typeof avatar.url !== "string" ||
      !avatar.url.startsWith("https://") ||
      avatar.url.length > 2048
    ) {
      return res.status(400).json({
        success: false,
        error: true,
        message: "Invalid avatar URL",
      });
    }

    // Pin avatars to ImageKit endpoint when configured, allow Google avatars
    const endpoint = process.env.IMAGEKIT_URL_ENDPOINT;
    // Fail closed: without a configured endpoint we cannot verify host.
    if (!endpoint) {
      return res.status(500).json({
        success: false,
        error: true,
        message: "Avatar service unavailable",
      });
    }
    const isImageKit = avatar.url.startsWith(endpoint);
    const isGoogle = /^https:\/\/lh\d*\.googleusercontent\.com\//.test(avatar.url);
    if (!isImageKit && !isGoogle) {
      return res.status(400).json({
        success: false,
        error: true,
        message: "Avatar must be hosted on our image service",
      });
    }

    if (
      typeof avatar.fileId !== "string" ||
      !/^[A-Za-z0-9_\-/]+$/.test(avatar.fileId) ||
      avatar.fileId.length > 256
    ) {
      // Google avatars have no fileId - allow empty fileId for them
      if (!(isGoogle && !avatar.fileId)) {
        return res.status(400).json({
          success: false,
          error: true,
          message: "Invalid avatar file ID",
        });
      }
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

    computeAndAwardBadges(userId).catch((err) =>
      console.error("Error updating gamification on updateUserAvatar:", err),
    );

    if (updatedUser?.gamification) {
      const xp = updatedUser.gamification.total_xp || 0;
      const level = computeLevel(xp);
      updatedUser.gamification.level = level;
      updatedUser.gamification.xp_to_next_level = xpToNextLevel(xp);
      updatedUser.gamification.progress_percent = levelProgress(xp);
      updatedUser.gamification.next_level = level + 1;
    }

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
      message: safeErrorMessage(err, "Internal server error"),
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

    const safeUser = await userModel
      .findById(userId)
      .select("-password -refresh_token -verifyTokenEmail")
      .lean();

    return res.status(200).json({
      success: true,
      message: "Avatar removed successfully",
      user: safeUser,
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
    const { password } = req.body || {};

    // Password re-auth: a stolen session alone must not delete the account.
    // Google-only accounts have no known password — they set one via
    // Forgot Password first (surfaced in the UI error below).
    if (!password || typeof password !== "string") {
      return res.status(400).json({
        message: "Please enter your password to confirm deletion.",
        success: false,
        error: true,
        code: "PASSWORD_REQUIRED",
      });
    }

    const account = await userModel.findById(userId).select("+password");
    if (!account) {
      return res.status(404).json({
        message: "User not found or already deleted",
        success: false,
        error: true,
      });
    }

    const bcryptOk = await bcrypt.compare(password, account.password);
    if (!bcryptOk) {
      return res.status(403).json({
        message:
          "Incorrect password. Google sign-in users can set one via Forgot Password first.",
        success: false,
        error: true,
        code: "INVALID_PASSWORD",
      });
    }

    const deletedUser = await userModel.findByIdAndUpdate(
      userId,
      {
        status: USER_STATUS.INACTIVE,
        refresh_token: null,
        refresh_token_prev: null,
        refresh_token_prev_expires_at: null,
        $inc: { tokenVersion: 1 },
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

    // Unlist live listings so ghost storefronts don't remain
    let deletedProductIds = [];
    try {
      const Product = (await import("../models/Product.model.js")).default;
      const owned = await Product.find(
        { seller_id: userId, is_deleted: false },
        { _id: 1 },
      ).lean();
      deletedProductIds = (owned || []).map((p) => p._id);
      await Product.updateMany(
        { seller_id: userId, is_deleted: false, status: "listed" },
        { $set: { status: "unlisted", is_boosted: false } },
      );
      // Clear boost flags on all owned listings (sold/unlisted included)
      await Product.updateMany(
        { seller_id: userId, is_boosted: true },
        { $set: { is_boosted: false } },
      );
    } catch {
      // best-effort only
    }

    // Best-effort orphan cleanup: pull owned products from others'
    // wishlists, delete Boost docs (credits stay spent), clear wishlists.
    try {
      if (deletedProductIds.length > 0) {
        await userModel.updateMany(
          { wishlist: { $in: deletedProductIds } },
          { $pull: { wishlist: { $in: deletedProductIds } } },
        );
      }
    } catch {
      // best-effort only
    }
    try {
      const Boost = (await import("../models/Boost.model.js")).default;
      await Boost.deleteMany({ user_id: userId });
    } catch {
      // best-effort only
    }

    // Reuse the shared clearer so Secure/SameSite/Path always match the
    // flags the cookies were set with (a mismatched clear leaves orphans).
    clearAuthCookies(res);

    res.status(200).json({
      message: "Account deleted successfully",
      success: true,
      error: false,
    });
  } catch (err) {
    console.error("Error in deleteAccount controller:", err);

    return res.status(500).json({
      message: safeErrorMessage(err, "Server error while deleting account"),
      success: false,
      error: true,
    });
  }
};
// Chat preferences: wallpaper + read receipts + typing indicators.
// Strict whitelist, unknown keys ignored, wrong types rejected.
const CHAT_WALLPAPERS = ["default", "campus", "grid", "paper", "waves"];

export const updateChatSettings = async (req, res) => {
  try {
    const userId = req.userId;
    const body = req.body || {};
    const set = {};

    if (body.wallpaper !== undefined) {
      if (typeof body.wallpaper !== "string" || !CHAT_WALLPAPERS.includes(body.wallpaper)) {
        return res.status(400).json({
          message: "Invalid wallpaper",
          success: false,
          error: true,
        });
      }
      set["chat_settings.wallpaper"] = body.wallpaper;
    }
    for (const key of ["read_receipts", "typing_indicators"]) {
      if (body[key] !== undefined) {
        if (typeof body[key] !== "boolean") {
          return res.status(400).json({
            message: `Invalid value for ${key}`,
            success: false,
            error: true,
          });
        }
        set[`chat_settings.${key}`] = body[key];
      }
    }

    if (Object.keys(set).length === 0) {
      return res.status(400).json({
        message: "Nothing to update",
        success: false,
        error: true,
      });
    }

    // Read receipts control is a Pro/Pro+ perk (admins are always entitled).
    // Base users stay on the default (enabled) and cannot switch it off.
    if (set["chat_settings.read_receipts"] === false) {
      const me = await userModel
        .findById(userId)
        .select("subscription role")
        .lean();
      const entitled =
        me &&
        (me.role === "admin" ||
          me.subscription === "pro" ||
          me.subscription === "pro_plus");
      if (!entitled) {
        return res.status(403).json({
          message: "Read receipts control is a Pro feature. Upgrade to unlock it.",
          success: false,
          error: true,
          code: "UPGRADE_REQUIRED",
        });
      }
    }

    const updated = await userModel
      .findByIdAndUpdate(userId, { $set: set }, { new: true })
      .select("chat_settings")
      .lean();

    if (!updated) {
      return res.status(404).json({
        message: "User Not Found",
        success: false,
        error: true,
      });
    }

    return res.status(200).json({
      message: "Chat settings updated",
      success: true,
      error: false,
      chat_settings: {
        wallpaper: "default",
        read_receipts: true,
        typing_indicators: true,
        ...(updated.chat_settings || {}),
      },
    });
  } catch (err) {
    console.error("Error updating chat settings:", err);
    return res.status(500).json({
      message: safeErrorMessage(err),
      success: false,
      error: true,
    });
  }
};

// REQUEST GENDER CHANGE (needs admin approval — gender is set-once).
// Rate-limited by route limiter. One pending request per user; re-POST
// while pending just refreshes the requested value (idempotent).
export const requestGenderChange = async (req, res) => {
  try {
    const userId = req.userId;
    const { requestedGender } = req.body || {};
    const allowed = ["male", "female", "other"];
    if (!allowed.includes(requestedGender)) {
      return res.status(400).json({
        message: "Invalid gender value",
        success: false,
        error: true,
      });
    }
    const current = await userModel
      .findById(userId)
      .select("gender genderChangeRequest")
      .lean();
    if (!current) {
      return res.status(404).json({ message: "User not found", success: false, error: true });
    }
    if (current.gender === requestedGender) {
      return res.status(400).json({
        message: "This is already your gender.",
        success: false,
        error: true,
      });
    }
    const updated = await userModel
      .findByIdAndUpdate(
        userId,
        {
          $set: {
            genderChangeRequest: {
              requestedGender,
              status: "pending",
              requestedAt: new Date(),
              reviewedAt: null,
            },
          },
        },
        { new: true },
      )
      .select("gender genderChangeRequest")
      .lean();
    return res.status(200).json({
      message: "Request sent for admin approval.",
      success: true,
      error: false,
      genderChangeRequest: updated?.genderChangeRequest || null,
    });
  } catch (err) {
    console.error("Error requesting gender change:", err);
    return res.status(500).json({
      message: safeErrorMessage(err),
      success: false,
      error: true,
    });
  }
};

export const getGenderChangeStatus = async (req, res) => {
  try {
    const user = await userModel
      .findById(req.userId)
      .select("gender genderChangeRequest")
      .lean();
    if (!user) {
      return res.status(404).json({ message: "User not found", success: false, error: true });
    }
    return res.status(200).json({
      success: true,
      error: false,
      gender: user.gender ?? null,
      genderChangeRequest: user.genderChangeRequest || null,
    });
  } catch (err) {
    return res.status(500).json({
      message: safeErrorMessage(err),
      success: false,
      error: true,
    });
  }
};
