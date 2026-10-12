import { Router } from "express";
import rateLimit from "express-rate-limit";
import { optionalAuth } from "../middlewares/auth.middleware.js";
import {
  registerUserController,
  loginController,
  verifyEmailController,
  logoutUser,
  forgotPasswordController,
  resetPasswordController,
  verifyResetTokenPreCheck,
  resendVerificationController,
  googleAuthRedirectController,
  googleAuthCallbackController,
  exchangeGoogleOAuthCodeController,
  googleOneTapController,
  refreshAccessTokenController,
  checkEmailVerificationController,
} from "../controllers/auth.controller.js";

const authRouter = Router();

const strictAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { success: false, message: "Too many attempts, please try later" },
});

const emailLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { success: false, message: "Too many email requests, please try later" },
});

// Lightweight probe endpoints (verify/check/reset pre-check) —
// enumerable without this, so keep a modest shared bucket.
const probeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { success: false, message: "Too many attempts, please try later" },
});

// Refresh is called by every tab roughly every 15 minutes plus retries —
// keep it out of the shared probe bucket so background refreshes never
// get 429s (a 429 on refresh looks exactly like a dead session).
const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 120,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { success: false, message: "Too many attempts, please try later" },
});


authRouter.post("/register", strictAuthLimiter, registerUserController);
authRouter.post("/login", strictAuthLimiter, loginController);

authRouter.get("/google", googleAuthRedirectController);
authRouter.get("/google/callback", googleAuthCallbackController);
authRouter.post("/google/exchange", strictAuthLimiter, exchangeGoogleOAuthCodeController);
authRouter.post("/google/one-tap", strictAuthLimiter, googleOneTapController);

authRouter.post("/verify-email", probeLimiter, verifyEmailController);
authRouter.get("/check-verification", probeLimiter, checkEmailVerificationController);
authRouter.post("/resend-verification", emailLimiter, resendVerificationController);

authRouter.post("/forgot-password", emailLimiter, forgotPasswordController);
authRouter.get("/reset-password/:token", probeLimiter, verifyResetTokenPreCheck);
authRouter.post("/reset-password/:token", strictAuthLimiter, resetPasswordController);

authRouter.post("/refresh-token", refreshLimiter, refreshAccessTokenController);

// POST only: a GET logout is a logout-CSRF vector (<img src=...> logs
// the victim out). Frontend uses POST with GET fallback that never fires.
// optionalAuth (not auth): users with an expired access token must still
// reach logout so cookies are cleared + the refresh token is revoked.
// With strict auth they would get 401 and stay stuck with stale cookies.
authRouter.post("/logoutUser", optionalAuth, logoutUser);

export default authRouter;
