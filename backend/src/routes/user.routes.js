import { Router } from "express";
import rateLimit from "express-rate-limit";
import multer from "multer";
import { getMyLabs } from "../controllers/labs.controller.js";
import auth from "../middlewares/auth.middleware.js";

import {
  getUserProfile,
  updateUserProfile,
  updateUserAvatar,
  deleteAccount,
  removeUserAvatar,
  updateChatSettings,
  requestGenderChange,
  cancelGenderChange,
  getGenderChangeStatus,
  getMyInsights,
  getCollegeVerification,
  sendCollegeVerificationOtp,
  verifyCollegeVerificationOtp,
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
// Labs (early access) features available to this account.
userRouter.get("/labs", auth, getMyLabs);
// Profile overview numbers (cached server-side for 2 minutes).
userRouter.get("/insights", auth, getMyInsights);
userRouter.put("/updateProfile", auth, updateUserProfile)
userRouter.put("/chatSettings", auth, updateChatSettings);
// Gender is set-once; later changes need admin approval (tight limiter).
const genderRequestLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { success: false, message: "Too many attempts, please try later" },
});
// College ID photo for the request: one image, held in memory and stored
// only in GenderIdCard (bytes are re-checked in the service).
const idCardUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 5 },
  fileFilter: (req, file, cb) => {
    if (["image/jpeg", "image/jpg", "image/png", "image/webp"].includes(file.mimetype)) return cb(null, true);
    const error = new Error("ID photo must be a JPG, PNG or WEBP image.");
    error.statusCode = 400;
    return cb(error);
  },
});
const withIdCard = (req, res, next) =>
  idCardUpload.single("idCard")(req, res, (err) => {
    if (!err) return next();
    const message = err.code === "LIMIT_FILE_SIZE" ? "ID photo must be under 5 MB." : err.statusCode ? err.message : "Could not read the photo. Please try again.";
    return res.status(400).json({ message, success: false, error: true });
  });
userRouter.post("/requestGenderChange", auth, genderRequestLimiter, withIdCard, requestGenderChange);
userRouter.delete("/genderChangeRequest", auth, genderRequestLimiter, cancelGenderChange);
userRouter.get("/genderChangeStatus", auth, getGenderChangeStatus);
// College email verification (blue tick). Sends are capped per hour on top
// of the 60s cooldown in the service; wrong tries are capped per code there.
const collegeOtpSendLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 6,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { success: false, message: "Too many codes requested. Please try again in an hour." },
});
const collegeOtpVerifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { success: false, message: "Too many attempts, please try later" },
});
userRouter.get("/college-verification", auth, getCollegeVerification);
userRouter.post("/college-verification/send-otp", auth, collegeOtpSendLimiter, sendCollegeVerificationOtp);
userRouter.post("/college-verification/verify", auth, collegeOtpVerifyLimiter, verifyCollegeVerificationOtp);
userRouter.put("/updateAvatar", auth, updateUserAvatar);
userRouter.delete("/removeAvatar", auth, removeUserAvatar);
userRouter.delete("/deleteAccount", auth, deleteAccountLimiter, deleteAccount);

export default userRouter;
