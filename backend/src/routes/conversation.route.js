import express from "express";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import auth from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validation.middleware.js";
import { createConversationSchema } from "../validations/conversation.validation.js";
import { markReadSchema, sendMessageSchema, sendVoiceSchema } from "../validations/message.validation.js";
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

const listLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { success: false, message: "Too many requests, try later" },
});

const messageLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { success: false, message: "Too many messages, slow down" },
});

const offerLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { success: false, message: "Too many offers, try later" },
});

const dealActionLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { success: false, message: "Too many deal actions, try later" },
});

// Voice notes cost storage + bandwidth, so they get their own per-ACCOUNT
// limits (a campus can share one NAT IP), layered minute / hour / day. The
// ImageKit auth route is limited separately, and unsent uploads are swept.
const perAccount = (req) => (req.userId ? `u:${req.userId}` : `ip:${ipKeyGenerator(req.ip || "")}`);
const voiceLimit = (windowMs, max, message) =>
  rateLimit({
    windowMs,
    max,
    keyGenerator: perAccount,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: { success: false, code: "VOICE_RATE_LIMIT", message },
  });
const voiceLimiters = [
  voiceLimit(60 * 1000, Number(process.env.VOICE_PER_MINUTE) || 8, "You're sending voice notes too fast. Try again in a minute."),
  voiceLimit(60 * 60 * 1000, Number(process.env.VOICE_PER_HOUR) || 60, "Voice note limit reached for this hour. Try again later."),
  voiceLimit(24 * 60 * 60 * 1000, Number(process.env.VOICE_PER_DAY) || 200, "Daily voice note limit reached. Try again tomorrow."),
];

router.get("/", auth, listLimiter, listConversations);
// Must be registered before "/:id" so "unread-count" isn't read as an id.
router.get("/unread-count", auth, listLimiter, getUnreadCount);
router.post("/", auth, messageLimiter, validate(createConversationSchema), createConversation);

router.get("/:id", auth, listLimiter, getConversation);
router.patch("/:id/read", auth, listLimiter, validate(markReadSchema), markRead);

router.get("/:id/messages", auth, listLimiter, listMessages);
router.post("/:id/messages", auth, messageLimiter, validate(sendMessageSchema), sendMessage);
router.post("/:id/voice", auth, ...voiceLimiters, validate(sendVoiceSchema), sendVoice);

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
