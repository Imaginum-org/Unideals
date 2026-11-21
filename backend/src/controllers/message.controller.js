import * as messageService from "../services/message.service.js";
import { forwardServiceError } from "../utils/response.js";
import { cloudinaryConfigured, signChatImageUpload } from "../utils/cloudinary.js";

// GET /api/conversations/:id/messages?limit=&before=|after=
export const listMessages = async (req, res, next) => {
  try {
    const { limit = "50", before, after } = req.query;
    const result = await messageService.getMessages({
      conversationId: req.params.id,
      userId: req.userId,
      limit,
      before,
      after,
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
      // Turning receipts off is a Pro/Pro+ perk (see updateChatSettings).
      // Without this check a free user could skip the paywall by sending
      // { receipt: false } directly.
      receipt:
        req.user?.role === "admin" ||
        ["pro", "pro_plus"].includes(req.user?.subscription)
          ? req.body?.receipt
          : true,
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

// POST /api/conversations/:id/voice { fileId, durationMs, peaks?, replyTo? }
export const sendVoice = async (req, res, next) => {
  try {
    const message = await messageService.sendVoiceMessage({
      conversationId: req.params.id,
      senderId: req.userId,
      fileId: req.body.fileId,
      durationMs: req.body.durationMs,
      peaks: req.body.peaks,
      replyTo: req.body.replyTo || null,
    });
    return res.status(201).json({ success: true, message: "Voice message sent", data: message });
  } catch (error) {
    forwardServiceError(error, next);
  }
};

// GET /api/conversations/uploads/image-signature — one signed, single-use
// upload ticket for a chat photo (Cloudinary, own folder, fixed public_id).
export const imageUploadSignature = async (req, res, next) => {
  try {
    if (!cloudinaryConfigured()) {
      return res.status(503).json({ success: false, message: "Photo sharing isn't available right now" });
    }
    return res.status(200).json({ success: true, data: signChatImageUpload(req.userId) });
  } catch (error) {
    forwardServiceError(error, next);
  }
};

// POST /api/conversations/:id/image { publicId, version, signature, width?, height?, caption?, replyTo? }
export const sendImage = async (req, res, next) => {
  try {
    const message = await messageService.sendImageMessage({
      conversationId: req.params.id,
      senderId: req.userId,
      publicId: req.body.publicId,
      version: req.body.version,
      signature: req.body.signature,
      width: req.body.width,
      height: req.body.height,
      caption: req.body.caption || "",
      replyTo: req.body.replyTo || null,
    });
    return res.status(201).json({ success: true, message: "Photo sent", data: message });
  } catch (error) {
    forwardServiceError(error, next);
  }
};

// PUT /api/conversations/:id/messages/:messageId/reaction { emoji | null }
export const reactToMessage = async (req, res, next) => {
  try {
    const reactions = await messageService.setReaction({
      conversationId: req.params.id,
      messageId: req.params.messageId,
      userId: req.userId,
      emoji: req.body.emoji ?? null,
    });
    return res.status(200).json({ success: true, data: reactions });
  } catch (error) {
    forwardServiceError(error, next);
  }
};
