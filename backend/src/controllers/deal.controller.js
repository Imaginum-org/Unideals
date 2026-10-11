import * as dealService from "../services/deal.service.js";
import { forwardServiceError } from "../utils/response.js";

// GET /api/conversations/:id/deal
export const getDeal = async (req, res, next) => {
  try {
    const { deal, conversation } = await dealService.getDealForConversation({
      conversationId: req.params.id,
      userId: req.userId,
    });
    return res.status(200).json({
      success: true,
      message: "Deal fetched",
      data: { deal, conversationId: conversation._id },
    });
  } catch (error) {
    forwardServiceError(error, next);
  }
};

// POST /api/conversations/:id/offers { amount }
export const makeOffer = async (req, res, next) => {
  try {
    const { deal, message } = await dealService.makeOffer({
      conversationId: req.params.id,
      userId: req.userId,
      amount: req.body.amount,
    });
    return res.status(201).json({
      success: true,
      message: "Offer sent",
      data: { deal, message },
    });
  } catch (error) {
    forwardServiceError(error, next);
  }
};

// POST /api/conversations/:id/offers/respond { messageId, action }
export const respondOffer = async (req, res, next) => {
  try {
    const deal = await dealService.respondOffer({
      conversationId: req.params.id,
      userId: req.userId,
      messageId: req.body.messageId,
      action: req.body.action,
    });
    return res.status(200).json({
      success: true,
      message:
        req.body.action === "accept" ? "Offer accepted" : "Offer declined",
      data: deal,
    });
  } catch (error) {
    forwardServiceError(error, next);
  }
};

// POST /api/conversations/:id/confirm { amount }, seller only
export const confirmDeal = async (req, res, next) => {
  try {
    const deal = await dealService.confirmDeal({
      conversationId: req.params.id,
      userId: req.userId,
      amount: req.body.amount,
    });
    return res.status(200).json({
      success: true,
      message: "Deal confirmed",
      data: deal,
    });
  } catch (error) {
    forwardServiceError(error, next);
  }
};

// POST /api/conversations/:id/pickup { date, location }, seller only
export const schedulePickup = async (req, res, next) => {
  try {
    const deal = await dealService.schedulePickup({
      conversationId: req.params.id,
      userId: req.userId,
      date: req.body.date,
      location: req.body.location,
    });
    return res.status(200).json({
      success: true,
      message: "Pickup scheduled",
      data: deal,
    });
  } catch (error) {
    forwardServiceError(error, next);
  }
};

// POST /api/conversations/:id/payment-confirm, seller only
export const confirmPayment = async (req, res, next) => {
  try {
    const deal = await dealService.confirmPayment({
      conversationId: req.params.id,
      userId: req.userId,
    });
    return res.status(200).json({
      success: true,
      message: "Payment confirmed",
      data: deal,
    });
  } catch (error) {
    forwardServiceError(error, next);
  }
};

// POST /api/conversations/:id/item-received, buyer only
export const confirmItemReceived = async (req, res, next) => {
  try {
    const deal = await dealService.confirmItemReceived({
      conversationId: req.params.id,
      userId: req.userId,
    });
    return res.status(200).json({
      success: true,
      message: "Transaction complete",
      data: deal,
    });
  } catch (error) {
    forwardServiceError(error, next);
  }
};

// POST /api/conversations/:id/cancel { reason? }, either party, before completion
export const cancelDeal = async (req, res, next) => {
  try {
    const deal = await dealService.cancelDeal({
      conversationId: req.params.id,
      userId: req.userId,
      reason: req.body?.reason || "",
    });
    return res.status(200).json({
      success: true,
      message: "Deal cancelled",
      data: deal,
    });
  } catch (error) {
    forwardServiceError(error, next);
  }
};

// GET /api/deals/pending-followups?hours=24, flags for notification teammate
export const pendingFollowups = async (req, res, next) => {
  try {
    const hours = Number(req.query.hours) || 24;
    const data = await dealService.getPendingFollowups({
      olderThanHours: Math.min(Math.max(hours, 1), 24 * 30),
    });
    return res.status(200).json({
      success: true,
      message: "Pending followups fetched",
      data,
    });
  } catch (error) {
    forwardServiceError(error, next);
  }
};
