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
  revokeRefreshTokenByToken,
  sanitizeAuthUser,
  setAuthCookies,
} from "../services/auth.service.js";

const oauth2Client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI,
);

const findOrCreateGoogleUser = async (payload) => {
  const email = payload?.email?.toLowerCase();

  if (!email) {
    const error = new Error("Google did not return a valid email.");
    error.statusCode = 400;
    throw error;
  }

  // Only trust Google-verified emails for auto-verification/linking
  if (payload?.email_verified === false) {
    const error = new Error("Google email is not verified.");
    error.statusCode = 400;
    throw error;
  }

  const name = payload.name || email.split("@")[0];
  // Only accept Google-hosted avatar URLs to prevent stored XSS/phishing
  const rawPicture = typeof payload.picture === "string" ? payload.picture : null;
  const isGoogleAvatar =
    rawPicture &&
    /^https:\/\/lh\d*\.googleusercontent\.com\//.test(rawPicture);
  const picture = isGoogleAvatar ? rawPicture.replace("s96-c", "s400-c") : null;

  let user = await userModel.findOne({ email }).select("+password");

  if (!user) {
    const randomPassword = crypto.randomBytes(32).toString("hex");
    const hashedPassword = await bcrypt.hash(randomPassword, 10);

    user = await userModel.create({
      name,
      email,
      password: hashedPassword,
      avatar: picture ? { url: picture } : undefined,
      is_email_verified: true,
      verifyTokenEmail: "",
      verifyTokenEmailExpiry: null,
    });
  } else {
    if (picture && !user.avatar?.url) {
      user.avatar = {
        ...(user.avatar?.toObject?.() || user.avatar || {}),
        url: picture,
      };
    }

    if (!user.is_email_verified) {
      user.is_email_verified = true;
    }

    await user.save();
  }

  return user;
};

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
      // Generic response to avoid confirming which emails are registered,
      // while preserving existing client behavior (400 for verified accounts).
      return res.status(400).json({
        message: "If this email is registered, please log in or check your inbox.",
        error: true,
        success: false,
      });
    }

    const verifyToken = crypto.randomBytes(32).toString("hex");
    const verifyExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const verifyEmailUrl = `${process.env.FRONTEND_URL}/verify-email?code=${verifyToken}`;

    let responseMessage = "";
    let statusCode = 201;

    if (existingUser) {
      await userModel.findByIdAndUpdate(existingUser._id, {
        verifyTokenEmail: verifyToken,
        verifyTokenEmailExpiry: verifyExpiry,
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
        verifyTokenEmailExpiry: verifyExpiry,
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
    const previewUser = await userModel
      .findOne({ email: payload?.email?.toLowerCase() })
      .select("status")
      .lean();
    if (previewUser && previewUser.status !== USER_STATUS.ACTIVE) {
      const statusLabel =
        previewUser.status === USER_STATUS.SUSPENDED ? "suspended" : "inactive";
      return res.status(403).json({
        message: `Your account is ${statusLabel}. Please contact support.`,
        success: false,
        error: true,
        accountBlocked: true,
        accountStatus: previewUser.status,
      });
    }
    const user = await findOrCreateGoogleUser(payload);

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

export const googleOneTapController = async (req, res) => {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({
        message: "Google credential is required",
        success: false,
        error: true,
      });
    }

    const ticket = await oauth2Client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const user = await findOrCreateGoogleUser(ticket.getPayload());

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

    user.last_login_date = new Date();
    await user.save();

    const accessToken = await generatedAccessToken(user._id, user.tokenVersion || 0);
    const refreshToken = await generatedRefreshToken(user._id, user.tokenVersion || 0);

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
    console.error("Google One Tap error:", error);
    return res.status(error.statusCode || 500).json({
      message: error.message || "Google login failed",
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

    // Atomic single-use consume to prevent parallel replay
    const user = await userModel.findOneAndUpdate(
      {
        oauth_login_token: hashedOauthLoginCode,
        oauth_login_expiry: { $gt: new Date() },
      },
      {
        $set: { oauth_login_token: "", oauth_login_expiry: null },
      },
      { new: false },
    );

    if (!user) {
      return res.status(401).json({
        message: "Google login session expired. Please try again.",
        success: false,
        error: true,
      });
    }

    const freshUser = await userModel.findById(user._id);

    if (freshUser.status !== USER_STATUS.ACTIVE) {
      const statusLabel =
        freshUser.status === USER_STATUS.SUSPENDED ? "suspended" : "inactive";

      return res.status(403).json({
        message: `Your account is ${statusLabel}. Please contact support.`,
        success: false,
        error: true,
        accountBlocked: true,
        accountStatus: freshUser.status,
      });
    }

    freshUser.last_login_date = new Date();
    await freshUser.save();

    const accessToken = await generatedAccessToken(freshUser._id, freshUser.tokenVersion || 0);
    const refreshToken = await generatedRefreshToken(freshUser._id, freshUser.tokenVersion || 0);

    setAuthCookies(res, accessToken, refreshToken);

    return res.status(200).json({
      message: "Google login successful",
      success: true,
      error: false,
      data: {
        accessToken,
        refreshToken,
        user: sanitizeAuthUser(freshUser),
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
    if (!code || typeof code !== "string") {
      return res.status(400).json({
        message: "verification code required ",
        success: false,
        error: true,
      });
    }
    const user = await userModel.findOne({
      verifyTokenEmail: code,
      verifyTokenEmailExpiry: { $gt: new Date() },
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
    user.verifyTokenEmailExpiry = null;
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
    if (!email || typeof email !== "string") {
      return res.status(400).json({
        message: "Email is required to check verification status",
        success: false,
        error: true,
      });
    }

    const normalized = String(email).trim().toLowerCase();
    // Basic email shape check to avoid DB probe with garbage
    if (!/^\S+@\S+\.\S+$/.test(normalized)) {
      return res.status(400).json({
        message: "Invalid email format",
        success: false,
        error: true,
      });
    }

    const user = await userModel.findOne({ email: normalized });
    if (!user) {
      // Generic response to avoid enumeration; frontend treats as unverified
      return res.status(200).json({
        message: "Email is not verified yet",
        success: true,
        error: false,
        verified: false,
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
      message: "Unable to check verification status",
      success: false,
      error: true,
    });
  }
};

export const logoutUser = async (req, res) => {
  try {
    // Prefer authenticated userId, fallback to refresh-cookie lookup
    // so legacy GET /logoutUser (no auth middleware) still revokes server-side.
    if (req.userId) {
      await revokeRefreshToken(req.userId);
    } else if (req.cookies?.refreshToken) {
      await revokeRefreshTokenByToken(req.cookies.refreshToken);
    }
    clearAuthCookies(res);

    return res.status(200).json({
      success: true,
      message: "Logged out successfully",
      error: false,
    });
  } catch (error) {
    console.error("Error in logoutUser:", error);
    clearAuthCookies(res);
    res.status(200).json({
      success: true,
      message: "Logged out successfully",
      error: false,
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
    const genericMessage =
      "If an account exists for this email, a password reset link has been sent. Please check your inbox.";

    if (!email || typeof email !== "string") {
      return res.status(200).json({
        message: genericMessage,
        success: true,
        error: false,
      });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const user = await userModel.findOne({ email: normalizedEmail });

    if (!user) {
      // Generic success to prevent enumeration
      return res.status(200).json({
        message: genericMessage,
        success: true,
        error: false,
      });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    const hashedResetToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    const expireTime = Date.now() + 15 * 60 * 1000;
    await userModel.findByIdAndUpdate(user._id, {
      reset_password_token: hashedResetToken,
      reset_password_expiry: expireTime,
    });

    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

    // 5. Send the email
    try {
      await sendEmail({
        sendTo: normalizedEmail,
        subject: "Reset your Unideals password",
        html: forgotPaswordTemplate({
          name: user.name,
          resetUrl,
        }),
      });
    } catch (emailErr) {
      // Roll back token if email fails so stale tokens don't linger
      await userModel.findByIdAndUpdate(user._id, {
        reset_password_token: "",
        reset_password_expiry: null,
      });
      throw emailErr;
    }

    return res.status(200).json({
      message: genericMessage,
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

    if (!password || typeof password !== "string" || password.length < 6) {
      return res.status(400).json({
        message: "Please provide a new password of at least 6 characters",
        success: false,
        error: true,
      });
    }

    const hashedToken = crypto.createHash("sha256").update(String(token)).digest("hex");
    const user = await userModel.findOne({
      reset_password_token: hashedToken,
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
      refresh_token: null,
      $inc: { tokenVersion: 1 },
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

    const hashedToken = crypto.createHash("sha256").update(String(token)).digest("hex");
    // Check if the token exists and hasn't expired yet
    const user = await userModel.findOne({
      reset_password_token: hashedToken,
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
    const genericMessage = "If this email is registered and unverified, a verification email has been sent.";

    if (!email || typeof email !== "string") {
      return res.status(200).json({
        message: genericMessage,
        success: true,
        error: false,
      });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const user = await userModel.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(200).json({
        message: genericMessage,
        success: true,
        error: false,
      });
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
      verifyTokenEmailExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    // Send the email
    const verifyEmailUrl = `${process.env.FRONTEND_URL}/verify-email?code=${verifyToken}`;
    await sendEmail({
      sendTo: normalizedEmail,
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
      .json({ message: "Unable to resend verification email", success: false, error: true });
  }
};
