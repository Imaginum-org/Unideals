import express from "express";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import {
  chatWithAssistant,
  deleteAllAssistantConversations,
  deleteAssistantConversation,
  enhanceListing,
  getAssistantConversation,
  listAssistantConversations,
  negotiationAdvice,
  rateAssistantMessage,
  streamAssistant,
} from "../controllers/chat.controller.js";
import optionalAuth from "../middlewares/optionalAuth.middleware.js";
import auth from "../middlewares/auth.middleware.js";

const router = express.Router();

// JSON bodies so the clients can show the message (they read response.data.message).
// Signed-in students are limited per account, guests per IP: a whole campus
// can sit behind one NAT address, so an IP limit alone would throttle everyone.
const perPerson = (req) => (req.user?._id ? `u:${req.user._id}` : `ip:${ipKeyGenerator(req.ip || "")}`);

const limiter = (max, message, keyGenerator) =>
  rateLimit({
    windowMs: 60 * 1000,
    max,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    ...(keyGenerator ? { keyGenerator } : {}),
    message: { success: false, error: true, message },
  });
const ASSISTANT_PER_MINUTE = Number(process.env.ASSISTANT_RATE_LIMIT_PER_MINUTE) || 30;
const assistantLimiter = limiter(ASSISTANT_PER_MINUTE, "Too many assistant messages, please try again in a minute", perPerson);
const enhanceLimiter = limiter(10, "Too many requests, please try again in a minute");
const historyLimiter = limiter(60, "Too many requests, please try again in a minute");

router.post("/assistant", optionalAuth, assistantLimiter, chatWithAssistant);
router.post("/assistant/stream", optionalAuth, assistantLimiter, streamAssistant);
router.post("/enhance-listing", enhanceLimiter, auth, enhanceListing);
router.post("/negotiate", enhanceLimiter, auth, negotiationAdvice);

// Stored chats (signed-in students only; kept 90 days after the last message).
router.get("/conversations", historyLimiter, auth, listAssistantConversations);
router.delete("/conversations", historyLimiter, auth, deleteAllAssistantConversations);
router.get("/conversations/:id", historyLimiter, auth, getAssistantConversation);
router.delete("/conversations/:id", historyLimiter, auth, deleteAssistantConversation);
router.put("/conversations/:id/messages/:messageId/feedback", historyLimiter, auth, rateAssistantMessage);

export default router;
