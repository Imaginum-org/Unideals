import express from "express";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import auth from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validation.middleware.js";
import { createConversationSchema } from "../validations/conversation.validation.js";
import { markReadSchema, reactionSchema, sendImageSchema, sendMessageSchema, sendVoiceSchema } from "../validations/message.validation.js";
import {
  makeOfferSchema,
  respondOfferSchema,
  confirmDealSchema,
  schedulePickupSchema,
  cancelDealSchema,
} from "../validations/deal.validation.js";
import {
  createConversation,
  listConversations,
  getConversation,
  getUnreadCount,
} from "../controllers/conversation.controller.js";
import {
  listMessages,
  sendMessage,
  sendVoice,
  sendImage,
  imageUploadSignature,
  reactToMessage,
  markRead,
} from "../controllers/message.controller.js";
import {
  getDeal,
  makeOffer,
  respondOffer,
  confirmDeal,
  schedulePickup,
  confirmPayment,
  confirmItemReceived,
  cancelDeal,
  revertDealStage,
} from "../controllers/deal.controller.js";

const router = express.Router();

// Every chat limiter keys on the signed-in ACCOUNT (all routes run auth
// first). A whole campus can share one NAT IP: IP keys let one person use
// up everyone's allowance and hide who is actually spamming.
function perAccount(req) {
  return req.userId ? `u:${req.userId}` : `ip:${ipKeyGenerator(req.ip || "")}`;
}

const listLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  keyGenerator: perAccount,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { success: false, message: "Too many requests, try later" },
});

const messageLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  keyGenerator: perAccount,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { success: false, message: "Too many messages, slow down" },
});

const offerLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  keyGenerator: perAccount,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { success: false, message: "Too many offers, try later" },
});

const dealActionLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  keyGenerator: perAccount,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { success: false, message: "Too many deal actions, try later" },
});

// Voice notes cost storage + bandwidth, so they get their own per-ACCOUNT
// limits (a campus can share one NAT IP), layered minute / hour / day. The
// ImageKit auth route is limited separately, and unsent uploads are swept.
const voiceLimit = (windowMs, max, message) =>
  rateLimit({
    windowMs,
    max,
    keyGenerator: perAccount,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: { success: false, code: "VOICE_RATE_LIMIT", message },
  });
// Per-person cooldown: at most one voice note / photo per short window, on
// top of the minute/hour/day caps. Stops rapid-fire spam at the source.
const cooldown = (ms, message) => voiceLimit(ms, 1, message);
const VOICE_COOLDOWN_MS = Number(process.env.VOICE_COOLDOWN_MS) || 3000;
const IMAGE_COOLDOWN_MS = Number(process.env.CHAT_IMAGE_COOLDOWN_MS) || 4000;

const voiceLimiters = [
  cooldown(VOICE_COOLDOWN_MS, "Wait a moment before sending another voice note."),
  voiceLimit(60 * 1000, Number(process.env.VOICE_PER_MINUTE) || 8, "You're sending voice notes too fast. Try again in a minute."),
  voiceLimit(60 * 60 * 1000, Number(process.env.VOICE_PER_HOUR) || 60, "Voice note limit reached for this hour. Try again later."),
  voiceLimit(24 * 60 * 60 * 1000, Number(process.env.VOICE_PER_DAY) || 200, "Daily voice note limit reached. Try again tomorrow."),
];

// Chat photos: same per-account layering. Signing is cheap but each ticket
// allows an upload, so it is capped too.
const imageLimiters = [
  cooldown(IMAGE_COOLDOWN_MS, "Wait a moment before sending another photo."),
  voiceLimit(60 * 1000, Number(process.env.CHAT_IMAGES_PER_MINUTE) || 10, "You're sending photos too fast. Try again in a minute."),
  voiceLimit(60 * 60 * 1000, Number(process.env.CHAT_IMAGES_PER_HOUR) || 80, "Photo limit reached for this hour. Try again later."),
  voiceLimit(24 * 60 * 60 * 1000, Number(process.env.CHAT_IMAGES_PER_DAY) || 300, "Daily photo limit reached. Try again tomorrow."),
];
// Reactions are cheap (one atomic update) but are capped per account so a
// script can't spam socket broadcasts.
const reactionLimiter = voiceLimit(60 * 1000, 60, "You're reacting too fast. Slow down a little.");
const imageSignLimiter = voiceLimit(60 * 1000, 20, "Too many photo uploads. Try again in a minute.");

router.get("/", auth, listLimiter, listConversations);
// Must be registered before "/:id" so "unread-count" isn't read as an id.
router.get("/unread-count", auth, listLimiter, getUnreadCount);
router.get("/uploads/image-signature", auth, imageSignLimiter, imageUploadSignature);
router.post("/", auth, messageLimiter, validate(createConversationSchema), createConversation);

router.get("/:id", auth, listLimiter, getConversation);
router.patch("/:id/read", auth, listLimiter, validate(markReadSchema), markRead);

router.get("/:id/messages", auth, listLimiter, listMessages);
router.post("/:id/messages", auth, messageLimiter, validate(sendMessageSchema), sendMessage);
router.post("/:id/voice", auth, ...voiceLimiters, validate(sendVoiceSchema), sendVoice);
router.post("/:id/image", auth, ...imageLimiters, validate(sendImageSchema), sendImage);
router.put("/:id/messages/:messageId/reaction", auth, reactionLimiter, validate(reactionSchema), reactToMessage);

router.get("/:id/deal", auth, listLimiter, getDeal);
router.post("/:id/offers", auth, offerLimiter, validate(makeOfferSchema), makeOffer);
router.post(
  "/:id/offers/respond",
  auth,
  offerLimiter,
  validate(respondOfferSchema),
  respondOffer,
);
router.post("/:id/confirm", auth, dealActionLimiter, validate(confirmDealSchema), confirmDeal);
router.post("/:id/pickup", auth, dealActionLimiter, validate(schedulePickupSchema), schedulePickup);
router.post("/:id/payment-confirm", auth, dealActionLimiter, confirmPayment);
router.post("/:id/item-received", auth, dealActionLimiter, confirmItemReceived);
router.post("/:id/cancel", auth, dealActionLimiter, validate(cancelDealSchema), cancelDeal);
router.post("/:id/revert", auth, dealActionLimiter, revertDealStage);

export default router;
