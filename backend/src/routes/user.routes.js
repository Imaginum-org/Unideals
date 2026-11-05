import { Router } from "express";
import auth from "../middlewares/auth.middleware.js";

import {
  getUserProfile,
  updateUserProfile,
  updateUserAvatar,
  deleteAccount,
  removeUserAvatar,
} from "../controllers/user.controller.js";

const userRouter = Router();

userRouter.get("/userProfile", auth, getUserProfile);
userRouter.put("/updateProfile", auth, updateUserProfile)
userRouter.put("/updateAvatar", auth, updateUserAvatar);
userRouter.delete("/removeAvatar", auth, removeUserAvatar);
userRouter.delete("/deleteAccount", auth, deleteAccount);

export default userRouter;
