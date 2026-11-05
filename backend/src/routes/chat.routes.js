import express from "express";
import rateLimit from "express-rate-limit";
import { chatWithAssistant, enhanceListing, negotiationAdvice } from "../controllers/chat.controller.js";
import optionalAuth from "../middlewares/optionalAuth.middleware.js";
import auth from "../middlewares/auth.middleware.js";

const router = express.Router();

const assistantLimiter = rateLimit({ windowMs: 60 * 1000, max: 30, message: "Too many assistant messages, please try again in a minute" });
const enhanceLimiter = rateLimit({ windowMs: 60 * 1000, max: 10, message: "Too many enhance requests" });

router.post("/assistant", assistantLimiter, optionalAuth, chatWithAssistant);
router.post("/enhance-listing", enhanceLimiter, auth, enhanceListing);
router.post("/negotiate", enhanceLimiter, auth, negotiationAdvice);

export default router;
