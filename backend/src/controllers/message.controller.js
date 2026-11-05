import * as messageService from "../services/message.service.js";
import { forwardServiceError } from "../utils/response.js";

// GET /api/conversations/:id/messages?limit=&before=
export const listMessages = async (req, res, next) => {
  try {
    const { limit = "50", before } = req.query;
    const result = await messageService.getMessages({
      conversationId: req.params.id,
      userId: req.userId,
      limit,
      before,
    });
    return res.status(200).json({
      success: true,
      message: "Messages fetched",
      data: result.messages,
      hasMore: result.hasMore,
    });
  } catch (error) {
    forwardServiceError(error, next);
  }
};

// POST /api/conversations/:id/messages { text, replyTo? }
export const sendMessage = async (req, res, next) => {
  try {
    const message = await messageService.sendTextMessage({
      conversationId: req.params.id,
      senderId: req.userId,
      text: req.body.text,
      replyTo: req.body.replyTo || null,
    });
    return res.status(201).json({
      success: true,
      message: "Message sent",
      data: message,
    });
  } catch (error) {
    forwardServiceError(error, next);
  }
};

// PATCH /api/conversations/:id/read { receipt? } — read receipts + unread reset
export const markRead = async (req, res, next) => {
  try {
    const conversation = await messageService.markConversationRead({
      conversationId: req.params.id,
      userId: req.userId,
      receipt: req.body?.receipt,
    });
    return res.status(200).json({
      success: true,
      message: "Marked as read",
      data: conversation,
    });
  } catch (error) {
    forwardServiceError(error, next);
  }
};
