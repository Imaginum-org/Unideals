// Stored assistant chats for signed-in students: the server rebuilds the
// history for each turn from here (the client only sends a conversationId),
// so nobody can feed the model made-up "assistant" turns.
import mongoose from "mongoose";
import AssistantConversation, { MAX_STORED_MESSAGES } from "../models/AssistantConversation.model.js";
import { maskPersonalInfo } from "../utils/maskPersonalInfo.js";
import { isSmallTalk } from "./assistant.service.js";

const httpError = (message, statusCode) => Object.assign(new Error(message), { statusCode });

const HISTORY_FOR_MODEL = 8;
const LIST_LIMIT = 30;
// Cards worth keeping with a reply so a reopened chat looks the same.
const EXTRA_FIELDS = ["suggestions", "estimate", "comparison", "draft", "checklist", "bundle", "safetyTips", "route", "routeLabel", "searchQuery", "category"];

const isId = (id) => mongoose.isValidObjectId(id) && String(id).length === 24;

const titleFrom = (text = "") => {
  const clean = maskPersonalInfo(text).replace(/\s+/g, " ").trim();
  return clean.length > 60 ? `${clean.slice(0, 57)}…` : clean || "New chat";
};

const snapshotProducts = (products = []) =>
  products.slice(0, 6).filter((p) => p?._id && isId(p._id)).map((p) => ({
    _id: p._id,
    title: String(p.title || "").slice(0, 120),
    selling_price: p.selling_price,
    original_price: p.original_price,
    image: p.images?.[0] || p.image || null,
    condition: p.condition,
    conditionLabel: p.conditionLabel,
    is_boosted: Boolean(p.is_boosted),
  }));

const extrasFrom = (reply) => {
  const extras = {};
  for (const field of EXTRA_FIELDS) {
    if (reply[field] !== undefined && reply[field] !== null) extras[field] = reply[field];
  }
  return Object.keys(extras).length ? extras : undefined;
};

/** Loads one of the student's conversations (404 if it isn't theirs or has expired). */
export const loadConversation = async (userId, conversationId) => {
  if (!isId(conversationId)) throw httpError("Chat not found", 404);
  const conversation = await AssistantConversation.findOne({ _id: conversationId, user_id: userId }).lean();
  if (!conversation) throw httpError("Chat not found", 404);
  return conversation;
};

/** The last few turns, in the shape the assistant pipeline takes. */
export const historyFor = (conversation) =>
  (conversation?.messages || []).slice(-HISTORY_FOR_MODEL).map((m) => ({ sender: m.role, text: m.text }));

/** Listings shown in the recent replies, so "compare the first two" works. */
export const shownProductsFor = (conversation) =>
  (conversation?.messages || [])
    .slice(-6)
    // `group` says which reply showed the card, so "the first one" means the
    // first card of the latest list, not of the whole chat.
    .flatMap((m, group) =>
      (m.products || []).map((p) => ({ _id: String(p._id), title: p.title, selling_price: p.selling_price, group })),
    );

/**
 * Saves one exchange (masked). Creates the conversation on the first turn.
 * Returns { conversationId, messageId } (messageId = the assistant reply).
 */
export const recordTurn = async ({ userId, conversationId, userText, media = null, reply, latencyMs }) => {
  const now = new Date();
  const userMessage = {
    _id: new mongoose.Types.ObjectId(),
    role: "user",
    text: maskPersonalInfo(String(userText || "")).slice(0, 4000),
    media,
    created_at: now,
  };
  const assistantMessage = {
    _id: new mongoose.Types.ObjectId(),
    role: "assistant",
    text: maskPersonalInfo(String(reply.reply || "")).slice(0, 4000),
    intent: reply.intent || null,
    ai_powered: Boolean(reply.aiPowered),
    model: reply.model || null,
    latency_ms: Number.isFinite(latencyMs) ? Math.round(latencyMs) : null,
    products: snapshotProducts(reply.productCards?.length ? reply.productCards : reply.products),
    extras: extrasFrom(reply),
    created_at: new Date(now.getTime() + 1),
  };

  if (conversationId) {
    const updated = await AssistantConversation.findOneAndUpdate(
      { _id: conversationId, user_id: userId },
      {
        $push: { messages: { $each: [userMessage, assistantMessage], $slice: -MAX_STORED_MESSAGES } },
        $inc: { message_count: 2 },
        $set: { last_active_at: now },
      },
      { returnDocument: "after", projection: { _id: 1 } },
    );
    if (updated) {
      // A chat that opened with "hi" takes its title from the first real question.
      if (!isSmallTalk(userText)) {
        await AssistantConversation.updateOne(
          { _id: updated._id, title_is_placeholder: true },
          { $set: { title: titleFrom(userText), title_is_placeholder: false } },
        );
      }
      return { conversationId: String(updated._id), messageId: String(assistantMessage._id) };
    }
    // Expired or deleted meanwhile: start a fresh one below.
  }
  const created = await AssistantConversation.create({
    user_id: userId,
    title: titleFrom(media && !userText ? "Photo search" : userText),
    title_is_placeholder: isSmallTalk(userText),
    messages: [userMessage, assistantMessage],
    message_count: 2,
    last_active_at: now,
  });
  return { conversationId: String(created._id), messageId: String(assistantMessage._id) };
};

/** The student's recent chats, newest first. */
export const listConversations = async (userId) => {
  const rows = await AssistantConversation.find({ user_id: userId })
    .sort({ last_active_at: -1 })
    .limit(LIST_LIMIT)
    .select({ title: 1, message_count: 1, last_active_at: 1, messages: { $slice: -1 } })
    .lean();
  return rows.map((row) => ({
    id: String(row._id),
    title: row.title,
    messageCount: row.message_count,
    lastActiveAt: row.last_active_at,
    preview: String(row.messages?.[0]?.text || "").replace(/[*_`#>]/g, "").slice(0, 90),
  }));
};

/** One chat in the widget's message shape. */
export const getConversationForClient = async (userId, conversationId) => {
  const conversation = await loadConversation(userId, conversationId);
  return {
    id: String(conversation._id),
    title: conversation.title,
    lastActiveAt: conversation.last_active_at,
    messages: conversation.messages.map((m) => ({
      id: String(m._id),
      serverId: m.role === "assistant" ? String(m._id) : undefined,
      sender: m.role,
      text: m.text,
      hadMedia: Boolean(m.media),
      intent: m.intent || undefined,
      feedback: m.feedback || null,
      products: (m.products || []).map((p) => ({
        _id: String(p._id),
        title: p.title,
        selling_price: p.selling_price,
        original_price: p.original_price,
        images: p.image ? [p.image] : [],
        condition: p.condition,
        conditionLabel: p.conditionLabel,
        is_boosted: p.is_boosted,
      })),
      ...(m.extras || {}),
    })),
  };
};

export const deleteConversation = async (userId, conversationId) => {
  if (!isId(conversationId)) throw httpError("Chat not found", 404);
  const { deletedCount } = await AssistantConversation.deleteOne({ _id: conversationId, user_id: userId });
  if (!deletedCount) throw httpError("Chat not found", 404);
};

export const deleteAllConversations = async (userId) => {
  const { deletedCount } = await AssistantConversation.deleteMany({ user_id: userId });
  return deletedCount;
};

/** Thumbs up / down (or null to clear) on one of the assistant's replies. */
export const setFeedback = async (userId, conversationId, messageId, value) => {
  if (!isId(conversationId) || !isId(messageId)) throw httpError("Message not found", 404);
  if (!["up", "down", null].includes(value)) throw httpError("Feedback must be up, down or null", 400);
  const { matchedCount } = await AssistantConversation.updateOne(
    { _id: conversationId, user_id: userId, messages: { $elemMatch: { _id: messageId, role: "assistant" } } },
    { $set: { "messages.$.feedback": value, "messages.$.feedback_at": value ? new Date() : null } },
  );
  if (!matchedCount) throw httpError("Message not found", 404);
};
