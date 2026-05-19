import { Router } from "express";
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
  refreshAccessTokenController,
  checkEmailVerificationController,
} from "../controllers/auth.controller.js";

const authRouter = Router();


authRouter.post("/register", registerUserController);
authRouter.post("/login", loginController);

authRouter.get("/google", googleAuthRedirectController);
authRouter.get("/google/callback", googleAuthCallbackController);
authRouter.post("/google/exchange", exchangeGoogleOAuthCodeController);

authRouter.post("/verify-email", verifyEmailController);
authRouter.get("/check-verification", checkEmailVerificationController);
authRouter.post("/resend-verification", resendVerificationController);

authRouter.post("/forgot-password", forgotPasswordController);
authRouter.get("/reset-password/:token", verifyResetTokenPreCheck);
authRouter.post("/reset-password/:token", resetPasswordController);

authRouter.post("/refresh-token", refreshAccessTokenController);

authRouter.get("/logoutUser", logoutUser);

export default authRouter;
