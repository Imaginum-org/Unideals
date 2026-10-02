import { Router } from "express";
import rateLimit from "express-rate-limit";
import auth from "../middlewares/auth.middleware.js";
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

// Low-cost enumeration/DoS surface: probe and session endpoints.
const probeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
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

authRouter.post("/refresh-token", probeLimiter, refreshAccessTokenController);

// POST only: a GET logout is a logout-CSRF vector (<img src=...> logs
// the victim out). Frontend uses POST with GET fallback that never fires.
authRouter.post("/logoutUser", auth, logoutUser);

export default authRouter;
