import express from "express";
import rateLimit from "express-rate-limit";
import auth from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validation.middleware.js";
import { createConversationSchema } from "../validations/conversation.validation.js";
import { markReadSchema, sendMessageSchema } from "../validations/message.validation.js";
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
} from "../controllers/conversation.controller.js";
import {
  listMessages,
  sendMessage,
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

router.get("/", auth, listLimiter, listConversations);
router.post("/", auth, messageLimiter, validate(createConversationSchema), createConversation);

router.get("/:id", auth, listLimiter, getConversation);
router.patch("/:id/read", auth, listLimiter, validate(markReadSchema), markRead);

router.get("/:id/messages", auth, listLimiter, listMessages);
router.post("/:id/messages", auth, messageLimiter, validate(sendMessageSchema), sendMessage);

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

export default router;
