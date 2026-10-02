import { Router } from "express";
import rateLimit from "express-rate-limit";
import auth from "../middlewares/auth.middleware.js";

import {
  getUserProfile,
  updateUserProfile,
  updateUserAvatar,
  deleteAccount,
  removeUserAvatar,
} from "../controllers/user.controller.js";

const userRouter = Router();

// Destructive + irreversible: tight limiter plus password re-auth in the
// controller (a stolen bearer alone must not suffice).
const deleteAccountLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { success: false, message: "Too many attempts, please try later" },
});

userRouter.get("/userProfile", auth, getUserProfile);
userRouter.put("/updateProfile", auth, updateUserProfile)
userRouter.put("/updateAvatar", auth, updateUserAvatar);
userRouter.delete("/removeAvatar", auth, removeUserAvatar);
userRouter.delete("/deleteAccount", auth, deleteAccountLimiter, deleteAccount);

export default userRouter;
