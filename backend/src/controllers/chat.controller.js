import { buildAssistantReply, buildEnhanceListingReply, buildNegotiationAdvice } from "../services/assistant.service.js";
import * as history from "../services/assistantHistory.service.js";

const MAX_MESSAGE_LENGTH = 2000;
const MAX_DESCRIPTION_LENGTH = 2000;

const badRequest = (res, message) => res.status(400).json({ success: false, error: true, message });
const fail = (res, error, fallback) =>
  res.status(error.statusCode || 500).json({ success: false, error: true, message: error.statusCode ? error.message : fallback });

const validateAssistantBody = (body = {}) => {
  const { message } = body;
  if (typeof message !== "string" || !message.trim()) return "Type a message first";
  if (message.length > MAX_MESSAGE_LENGTH) return `Keep messages under ${MAX_MESSAGE_LENGTH} characters`;
  if (body.conversationId != null && typeof body.conversationId !== "string") return "Invalid chat id";
  return null;
};

const mediaKind = (attachments) => {
  const mime = attachments.find((a) => a?.mimeType)?.mimeType || "";
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("audio/")) return "audio";
  return null;
};

/**
 * Loads the conversation for a signed-in student (the stored history replaces
 * whatever the client sent). Guests keep the client-side history and nothing
 * is stored. Throws a 404 for someone else's or an expired chat.
 */
const prepareTurn = async (req) => {
  const body = req.body || {};
  const attachments = Array.isArray(body.attachments) ? body.attachments : [];
  const user = req.user || null;
  let conversation = null;
  if (user && body.conversationId) conversation = await history.loadConversation(user._id, body.conversationId);
  return {
    user,
    attachments,
    conversation,
    params: {
      message: body.message,
      history: user ? history.historyFor(conversation) : Array.isArray(body.history) ? body.history : [],
      shownProducts: user ? history.shownProductsFor(conversation) : [],
      user,
      attachments,
    },
  };
};

// Saves a signed-in student's exchange. Never fails the reply itself.
const saveTurn = async ({ user, attachments, conversation }, message, result, latencyMs) => {
  if (!user) return {};
  try {
    const media = mediaKind(attachments);
    // Store what the student said, not the internal "please transcribe" prompt.
    const userText = media === "audio" && result.transcript ? result.transcript : message;
    return await history.recordTurn({
      userId: user._id,
      conversationId: conversation?._id,
      userText,
      media,
      reply: result,
      latencyMs,
    });
  } catch (error) {
    console.warn("[Assistant] Could not save chat history:", error.message || error);
    return {};
  }
};

export const chatWithAssistant = async (req, res, next) => {
  const invalid = validateAssistantBody(req.body);
  if (invalid) return badRequest(res, invalid);
  try {
    const startedAt = Date.now();
    const turn = await prepareTurn(req);
    const result = await buildAssistantReply(turn.params);
    const saved = await saveTurn(turn, req.body.message, result, Date.now() - startedAt);
    return res.status(200).json({ success: true, data: { ...result, ...saved } });
  } catch (error) {
    if (error.statusCode === 404) return fail(res, error);
    next(error);
  }
};

/**
 * Same as chatWithAssistant, streamed as server-sent events:
 *   event: delta  data: {"text": "..."}   (reply text as it's written)
 *   event: done   data: {"success": true, "data": {...}}   (the final reply, always sent)
 *   event: error  data: {"message": "..."}
 * Validation errors and unknown chats are plain JSON responses (before streaming starts).
 */
export const streamAssistant = async (req, res) => {
  // fetch() can't refresh a session by itself the way the axios client does:
  // tell it to, rather than silently answering as a guest.
  if (req.authExpired) {
    return res.status(401).json({ success: false, error: true, code: "TOKEN_EXPIRED", message: "Session expired" });
  }
  const invalid = validateAssistantBody(req.body);
  if (invalid) return badRequest(res, invalid);
  let turn;
  try {
    turn = await prepareTurn(req);
  } catch (error) {
    return fail(res, error, "Could not open that chat");
  }

  res.status(200).set({
    "Content-Type": "text/event-stream; charset=utf-8",
    // no-transform keeps the compression middleware from buffering the stream.
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
  res.flushHeaders?.();

  const controller = new AbortController();
  res.on("close", () => {
    if (!res.writableEnded) controller.abort();
  });
  const send = (event, data) => {
    if (res.writableEnded || controller.signal.aborted) return;
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  try {
    const startedAt = Date.now();
    const result = await buildAssistantReply({
      ...turn.params,
      signal: controller.signal,
      onText: (text) => send("delta", { text }),
    });
    const saved = await saveTurn(turn, req.body.message, result, Date.now() - startedAt);
    send("done", { success: true, data: { ...result, ...saved } });
  } catch (error) {
    console.warn("[Assistant] Stream failed:", error.message || error);
    send("error", { message: "I couldn't finish that reply. Please try again." });
  }
  res.end();
};

export const listAssistantConversations = async (req, res) => {
  try {
    return res.status(200).json({ success: true, data: await history.listConversations(req.userId) });
  } catch (error) {
    return fail(res, error, "Could not load your chats");
  }
};

export const getAssistantConversation = async (req, res) => {
  try {
    return res.status(200).json({ success: true, data: await history.getConversationForClient(req.userId, req.params.id) });
  } catch (error) {
    return fail(res, error, "Could not load that chat");
  }
};

export const deleteAssistantConversation = async (req, res) => {
  try {
    await history.deleteConversation(req.userId, req.params.id);
    return res.status(200).json({ success: true, message: "Chat deleted" });
  } catch (error) {
    return fail(res, error, "Could not delete that chat");
  }
};

export const deleteAllAssistantConversations = async (req, res) => {
  try {
    const deleted = await history.deleteAllConversations(req.userId);
    return res.status(200).json({ success: true, message: "All your AI chats were deleted", data: { deleted } });
  } catch (error) {
    return fail(res, error, "Could not delete your chats");
  }
};

export const rateAssistantMessage = async (req, res) => {
  try {
    const value = req.body?.value ?? null;
    await history.setFeedback(req.userId, req.params.id, req.params.messageId, value);
    return res.status(200).json({ success: true, data: { feedback: value } });
  } catch (error) {
    return fail(res, error, "Could not save your feedback");
  }
};

export const enhanceListing = async (req, res, next) => {
  const { itemDescription, condition, originalPrice, category } = req.body || {};
  if (typeof itemDescription !== "string" || !itemDescription.trim()) return badRequest(res, "Describe the item first");
  if (itemDescription.length > MAX_DESCRIPTION_LENGTH) return badRequest(res, "That description is too long");
  try {
    const result = await buildEnhanceListingReply({
      itemDescription: itemDescription.trim(),
      condition: typeof condition === "string" ? condition.slice(0, 40) : undefined,
      originalPrice: Number.isFinite(Number(originalPrice)) && Number(originalPrice) > 0 ? Number(originalPrice) : undefined,
      category: typeof category === "string" ? category.slice(0, 60) : undefined,
    });
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

export const negotiationAdvice = async (req, res, next) => {
  const { productId, askingPrice, offerPrice, userRole } = req.body || {};
  const asking = Number(askingPrice);
  const offer = Number(offerPrice);
  if (!Number.isFinite(asking) || asking <= 0 || !Number.isFinite(offer) || offer <= 0) {
    return badRequest(res, "Asking price and offer must be positive numbers");
  }
  if (!["buyer", "seller"].includes(userRole)) return badRequest(res, "userRole must be buyer or seller");
  try {
    const result = await buildNegotiationAdvice({
      productId: typeof productId === "string" ? productId.slice(0, 64) : undefined,
      askingPrice: asking,
      offerPrice: offer,
      userRole,
    });
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};
