import bcrypt from "bcrypt";
import crypto from "crypto";
import { OAuth2Client } from "google-auth-library";
import userModel from "../models/User.model.js";
import sendEmail from "../config/sendEmail.js";
import generatedAccessToken from "../utils/generatedAccessToken.js";
import generatedRefreshToken from "../utils/generatedRefreshToken.js";
import verifyEmailTempplate from "../utils/templates/verifyEmailTemplate.js";
import forgotPaswordTemplate from "../utils/templates/forgotPaswordTemplate.js";
import { USER_STATUS } from "../config/constants.js";
import {
  clearAuthCookies,
  loginWithPassword,
  refreshSession,
  revokeRefreshToken,
  sanitizeAuthUser,
  setAuthCookies,
} from "../services/auth.service.js";

const oauth2Client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI,
);

export const registerUserController = async (req, res) => {
  try {
    let { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        message: "Please provide your name, email, and password.",
        error: true,
        success: false,
      });
    }

    email = email.trim().toLowerCase();
    const existingUser = await userModel.findOne({ email });

    if (existingUser && existingUser.is_email_verified) {
      return res.status(400).json({
        message: "This email is already registered. Please log in.",
        error: true,
        success: false,
      });
    }

    const verifyToken = crypto.randomBytes(32).toString("hex");
    const verifyEmailUrl = `${process.env.FRONTEND_URL}/verify-email?code=${verifyToken}`;

    let responseMessage = "";
    let statusCode = 201;

    if (existingUser) {
      await userModel.findByIdAndUpdate(existingUser._id, {
        verifyTokenEmail: verifyToken,
      });

      responseMessage =
        "Account exists but is unverified. We just resent your verification email!";
      statusCode = 200;
    } else {
      const hashedPassword = await bcrypt.hash(password, 10);

      await userModel.create({
        name,
        email,
        password: hashedPassword,
        verifyTokenEmail: verifyToken,
        is_email_verified: false,
      });

      responseMessage =
        "Account created successfully. Please check your email to verify.";
      statusCode = 201;
    }

    await sendEmail({
      sendTo: email,
      subject: "Verify your email for Unideals",
      html: verifyEmailTempplate({
        name: existingUser ? existingUser.name : name,
        url: verifyEmailUrl,
      }),
    });

    return res.status(statusCode).json({
      message: responseMessage,
      error: false,
      success: true,
    });
  } catch (err) {
    console.error("Registration Error:", err);
    return res.status(500).json({
      message: err.message || "Internal server error",
      error: true,
      success: false,
    });
  }
};

export const loginController = async (req, res) => {
  try {
    const { accessToken, refreshToken, user } = await loginWithPassword(
      req.body,
    );

    setAuthCookies(res, accessToken, refreshToken);

    return res.status(200).json({
      message: "Login successfully",
      success: true,
      error: false,
      data: {
        refreshtoken: refreshToken,
        accesstoken: accessToken,
        refreshToken,
        accessToken,
        user,
      },
    });
  } catch (err) {
    return res.status(err.statusCode || 500).json({
      message: err.message || err,
      success: false,
      error: true,
      requiresVerification: Boolean(err.requiresVerification),
      accountBlocked: Boolean(err.accountBlocked),
      accountStatus: err.accountStatus,
    });
  }
};

export const googleAuthRedirectController = async (req, res) => {
  try {
    const authorizeUrl = oauth2Client.generateAuthUrl({
      access_type: "offline",
      scope: ["openid", "email", "profile"],
      prompt: "select_account",
    });

    return res.redirect(authorizeUrl);
  } catch (error) {
    console.error("Google auth redirect error:", error);
    return res.status(500).json({
      message: "Unable to start Google authentication",
      success: false,
      error: true,
    });
  }
};

export const googleAuthCallbackController = async (req, res) => {
  try {
    const { code } = req.query;
    if (!code) {
      return res.status(400).json({
        message: "Google authorization code is missing.",
        success: false,
        error: true,
      });
    }

    const { tokens } = await oauth2Client.getToken(code);
    if (!tokens?.id_token) {
      return res.status(400).json({
        message: "Unable to verify Google identity.",
        success: false,
        error: true,
      });
    }

    const ticket = await oauth2Client.verifyIdToken({
      idToken: tokens.id_token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const email = payload?.email?.toLowerCase();

    if (!email) {
      return res.status(400).json({
        message: "Google did not return a valid email.",
        success: false,
        error: true,
      });
    }

    const name = payload.name || email.split("@")[0];

    // High-quality image
    const picture = payload.picture
      ? payload.picture.replace("s96-c", "s400-c")
      : null;

    let user = await userModel.findOne({ email }).select("+password");

    if (!user) {
      const randomPassword = crypto.randomBytes(32).toString("hex");
      const hashedPassword = await bcrypt.hash(randomPassword, 10);

      user = await userModel.create({
        name,
        email,
        password: hashedPassword,
        avatar: picture || undefined, // only store if exists
        is_email_verified: true,
        verifyTokenEmail: "",
      });
    } else {
      // ONLY update avatar if user has default / no avatar
      if (
        picture &&
        (!user.avatar ||
          user.avatar.includes("avatar-default") ||
          user.avatar === "")
      ) {
        user.avatar = picture;
      }

      // Ensure verified
      if (!user.is_email_verified) {
        user.is_email_verified = true;
      }

      await user.save();
    }

    const oauthLoginCode = crypto.randomBytes(32).toString("hex");
    const hashedOauthLoginCode = crypto
      .createHash("sha256")
      .update(oauthLoginCode)
      .digest("hex");

    await userModel.findByIdAndUpdate(user._id, {
      oauth_login_token: hashedOauthLoginCode,
      oauth_login_expiry: new Date(Date.now() + 2 * 60 * 1000),
    });

    const redirectUrl = new URL(`${process.env.FRONTEND_URL}/login`);
    redirectUrl.searchParams.set("oauth_code", oauthLoginCode);

    return res.redirect(redirectUrl.toString());
  } catch (error) {
    console.error("Google auth callback error:", error);
    return res.status(500).json({
      message: "Google authentication failed.",
      success: false,
      error: true,
    });
  }
};

export const exchangeGoogleOAuthCodeController = async (req, res) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({
        message: "OAuth login code is required",
        success: false,
        error: true,
      });
    }

    const hashedOauthLoginCode = crypto
      .createHash("sha256")
      .update(code)
      .digest("hex");

    const user = await userModel.findOne({
      oauth_login_token: hashedOauthLoginCode,
      oauth_login_expiry: { $gt: new Date() },
    });

    if (!user) {
      return res.status(401).json({
        message: "Google login session expired. Please try again.",
        success: false,
        error: true,
      });
    }

    if (user.status !== USER_STATUS.ACTIVE) {
      const statusLabel =
        user.status === USER_STATUS.SUSPENDED ? "suspended" : "inactive";

      return res.status(403).json({
        message: `Your account is ${statusLabel}. Please contact support.`,
        success: false,
        error: true,
        accountBlocked: true,
        accountStatus: user.status,
      });
    }

    user.oauth_login_token = "";
    user.oauth_login_expiry = null;
    user.last_login_date = new Date();
    await user.save();

    const accessToken = await generatedAccessToken(user._id);
    const refreshToken = await generatedRefreshToken(user._id);

    setAuthCookies(res, accessToken, refreshToken);

    return res.status(200).json({
      message: "Google login successful",
      success: true,
      error: false,
      data: {
        accessToken,
        refreshToken,
        user: sanitizeAuthUser(user),
      },
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message || "Google login failed",
      success: false,
      error: true,
    });
  }
};

export const verifyEmailController = async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) {
      return res.status(400).json({
        message: "verification code required ",
        success: false,
        error: true,
      });
    }
    const user = await userModel.findOne({
      verifyTokenEmail: code,
    });
    if (!user) {
      return res.status(400).json({
        message: " Invalid or expired verification link",
        success: false,
        error: true,
      });
    }

    user.is_email_verified = true;
    user.verifyTokenEmail = "";
    await user.save();

    return res.status(200).json({
      message: "Verified email",
      success: true,
      error: false,
    });
  } catch (err) {
    return res.status(500).json({
      message: err.message || err,
      success: false,
      error: true,
    });
  }
};

export const checkEmailVerificationController = async (req, res) => {
  try {
    const email = req.query.email;
    if (!email) {
      return res.status(400).json({
        message: "Email is required to check verification status",
        success: false,
        error: true,
      });
    }

    const user = await userModel.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({
        message: "User not found",
        success: false,
        error: true,
      });
    }

    return res.status(200).json({
      message: user.is_email_verified
        ? "Email is verified"
        : "Email is not verified yet",
      success: true,
      error: false,
      verified: user.is_email_verified,
    });
  } catch (err) {
    return res.status(500).json({
      message: err.message || err,
      success: false,
      error: true,
    });
  }
};

export const logoutUser = async (req, res) => {
  try {
    await revokeRefreshToken(req.userId);
    clearAuthCookies(res);

    return res.status(200).json({
      success: true,
      message: "Logged out successfully",
      error: false,
    });
  } catch (error) {
    console.error("Error in logoutUser:", error);
    res.status(500).json({
      success: false,
      message: "Server error during logout",
      error: true,
    });
  }
};

export const refreshAccessTokenController = async (req, res) => {
  try {
    const session = await refreshSession({
      refreshToken: req.cookies?.refreshToken,
    });

    setAuthCookies(res, session.accessToken, session.refreshToken);

    return res.status(200).json({
      message: "Token refreshed successfully",
      success: true,
      error: false,
      data: session,
    });
  } catch (err) {
    return res.status(err.statusCode || 401).json({
      message: err.message || "Invalid refresh token",
      success: false,
      error: true,
    });
  }
};

export const forgotPasswordController = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await userModel.findOne({ email });

    if (!user) {
      return res.status(404).json({
        message: "User with this email doesn't exist",
        success: false,
        error: true,
      });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");

    const expireTime = Date.now() + 15 * 60 * 1000;
    await userModel.findByIdAndUpdate(user._id, {
      reset_password_token: resetToken,
      reset_password_expiry: expireTime,
    });

    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

    // 5. Send the email
    await sendEmail({
      sendTo: email,
      subject: "Reset your Unideals password",
      html: forgotPaswordTemplate({
        name: user.name,
        resetUrl,
      }),
    });

    return res.status(200).json({
      message:
        "Password reset link sent to your email. Please check your inbox.",
      success: true,
      error: false,
    });
  } catch (error) {
    return res.status(500).json({
      message:
        error.message || "An error occurred while sending the reset email",
      success: false,
      error: true,
    });
  }
};

export const resetPasswordController = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        message: "Please provide a new password",
        success: false,
        error: true,
      });
    }

    const user = await userModel.findOne({
      reset_password_token: token,
      reset_password_expiry: { $gt: Date.now() }, // $gt means "greater than" right now
    });

    if (!user) {
      return res.status(400).json({
        message: "This password reset link is invalid or has expired.",
        success: false,
        error: true,
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    await userModel.findByIdAndUpdate(user._id, {
      password: hashedPassword,
      reset_password_token: "",
      reset_password_expiry: null,
    });

    return res.status(200).json({
      message: "Password updated successfully!",
      success: true,
      error: false,
    });
  } catch (error) {
    return res.status(500).json({
      message:
        error.message || "An error occurred while resetting the password",
      success: false,
      error: true,
    });
  }
};

export const verifyResetTokenPreCheck = async (req, res) => {
  try {
    const { token } = req.params;

    // Check if the token exists and hasn't expired yet
    const user = await userModel.findOne({
      reset_password_token: token,
      reset_password_expiry: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        message: "This password reset link is invalid or has expired.",
        success: false,
        error: true,
      });
    }

    // If user is found, the token is perfectly valid!
    return res.status(200).json({
      message: "Token is valid",
      success: true,
      error: false,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Server error while verifying link",
      success: false,
      error: true,
    });
  }
};

export const resendVerificationController = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await userModel.findOne({ email });

    if (!user) {
      return res
        .status(404)
        .json({ message: "User not found.", success: false, error: true });
    }

    if (user.is_email_verified) {
      return res.status(400).json({
        message: "Email is already verified. Please log in.",
        success: false,
        error: true,
      });
    }

    // Generate a new token and update the user
    const verifyToken = crypto.randomBytes(32).toString("hex");
    await userModel.findByIdAndUpdate(user._id, {
      verifyTokenEmail: verifyToken,
    });

    // Send the email
    const verifyEmailUrl = `${process.env.FRONTEND_URL}/verify-email?code=${verifyToken}`;
    await sendEmail({
      sendTo: email,
      subject: "Verify your email for Unideals",
      html: verifyEmailTempplate({ name: user.name, url: verifyEmailUrl }),
    });

    return res.status(200).json({
      message: "Verification email resent!",
      success: true,
      error: false,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: error.message || error, success: false, error: true });
  }
};
