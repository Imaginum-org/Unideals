import { loadAuthUser } from "../utils/userCache.js";
import mongoose from "mongoose";
import Conversation from "../models/conversation.model.js";
import Message from "../models/message.model.js";
import Report from "../models/Report.model.js";
import ChatCooldown from "../models/ChatCooldown.model.js";
import User from "../models/User.model.js";
import { MESSAGE_TYPE, MESSAGE_STATUS, REPORT_REASONS, REPORT_STATUS, VOICE_LIMITS } from "../config/constants.js";
import { getFileDetails, isInVoiceFolderOf, isValidFileId } from "../utils/imagekit.js";
import { AppError } from "../utils/appError.js";
import { emitToConversation, emitToUser } from "../utils/socket.js";
import { screenText, BLOCKED_PLACEHOLDER } from "../utils/profanity.js";
import { notifyNewMessage } from "./notification.service.js";

/** Strip flagged originals before anything reaches a client. */
const toClientMessage = (doc) => {
  const obj = typeof doc.toObject === "function" ? doc.toObject() : { ...doc };
  if (obj.is_flagged) obj.text = BLOCKED_PLACEHOLDER;
  return obj;
};

/**
 * Resolve quote-reply previews in one batched round-trip (never N+1).
 * Text resolves live so later masking (flags) still applies; a missing
 * target yields reply: null and the client hides the quote gracefully.
 */
const attachReplies = async (msgs) => {
  const ids = [
    ...new Set(
      msgs
        .map((m) => m.reply_to)
        .filter((id) => id && mongoose.Types.ObjectId.isValid(id))
        .map(String),
    ),
  ];
  if (!ids.length) return msgs;
  const quoted = await Message.find({ _id: { $in: ids } })
    .select("text sender_id message_type is_flagged")
    .lean();
  const qmap = new Map(quoted.map((q) => [String(q._id), q]));
  const userIds = [...new Set(quoted.map((q) => String(q.sender_id)))];
  const users = userIds.length
    ? await User.find({ _id: { $in: userIds } })
        .select("name")
        .lean()
    : [];
  const nameById = new Map(users.map((u) => [String(u._id), u.name]));
  return msgs.map((m) => {
    if (!m.reply_to) return m;
    const q = qmap.get(String(m.reply_to));
    if (!q) return { ...m, reply: null };
    return {
      ...m,
      reply: {
        _id: q._id,
        text: (q.is_flagged ? BLOCKED_PLACEHOLDER : String(q.text || "")).slice(0, 200),
        sender_id: q.sender_id,
        sender_name: nameById.get(String(q.sender_id)) || "User",
        message_type: q.message_type,
        is_flagged: Boolean(q.is_flagged),
      },
    };
  });
};

/**
 * File an auto-report so the admin team sees flagged chat abuse in the
 * regular moderation queue. Best-effort: deduped to one pending report per
 * sender+conversation per hour, and never fails the message send.
 */
const fileAutoReport = async ({ conversation, senderId, receiverId, excerpt }) => {
  try {
    const hourAgo = new Date(Date.now() - 3600 * 1000);
    const existing = await Report.exists({
      target_id: senderId,
      target_model: "User",
      status: REPORT_STATUS.PENDING,
      createdAt: { $gte: hourAgo },
    });
    if (existing) return;
    await Report.create({
      reporter_id: receiverId,
      target_id: senderId,
      target_model: "User",
      reason: REPORT_REASONS.INAPPROPRIATE_CONTENT,
      description: `Auto-flagged by chat safety filter (conversation ${conversation._id}). Message: "${String(excerpt || "").slice(0, 200)}"`,
    });
  } catch {
    // moderation queue writes must never break chat
  }
};

const assertParticipant = (conversation, userId) => {
  const id = String(userId);
  if (
    String(conversation.buyer_id) !== id &&
    String(conversation.seller_id) !== id
  ) {
    throw new AppError("You do not have access to this conversation.", 403);
  }
};

const otherPartyOf = (conversation, userId) => {
  const id = String(userId);
  return String(conversation.buyer_id) === id
    ? conversation.seller_id
    : conversation.buyer_id;
};

/**
 * Strike policy: 7 flagged messages inside 24h -> 5 minute send cooldown,
 * then a clean slate. Automation only ever mutes briefly, human moderators
 * own anything stronger via the report queue.
 */
const STRIKE_LIMIT = 7;
const STRIKE_WINDOW_MS = 24 * 3600 * 1000;
const COOLDOWN_MS = 5 * 60 * 1000;

const fmtWait = (ms) => {
  const s = Math.max(1, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

const assertNotCoolingDown = async (userId) => {
  const rec = await ChatCooldown.findOne({ user_id: userId })
    .select("cooldown_until")
    .lean();
  if (rec?.cooldown_until && rec.cooldown_until.getTime() > Date.now()) {
    const retryAfterMs = rec.cooldown_until.getTime() - Date.now();
    const err = new AppError(
      `Slow down. Messaging unlocks in ${fmtWait(retryAfterMs)} after too many flagged messages.`,
      429,
    );
    err.code = "CHAT_COOLDOWN";
    err.retryAfterMs = retryAfterMs;
    throw err;
  }
};

const registerStrike = async (userId) => {
  const now = new Date();
  const rec = await ChatCooldown.findOne({ user_id: userId });
  let strikes = 1;
  let windowStart = now;
  if (rec && now.getTime() - rec.window_started_at.getTime() < STRIKE_WINDOW_MS) {
    strikes = rec.strikes + 1;
    windowStart = rec.window_started_at;
  }
  let cooldownUntil = null;
  if (strikes >= STRIKE_LIMIT) {
    cooldownUntil = new Date(now.getTime() + COOLDOWN_MS);
    strikes = 0;
    windowStart = now;
  }
  await ChatCooldown.updateOne(
    { user_id: userId },
    { $set: { strikes, window_started_at: windowStart, cooldown_until: cooldownUntil } },
    { upsert: true },
  );
  return { strikes, coolingDown: Boolean(cooldownUntil) };
};

/**
 * Send a plain text message inside a conversation.
 * Updates preview + unread, emits realtime events (best-effort).
 */
export const sendTextMessage = async ({ conversationId, senderId, text, replyTo = null }) => {
  if (!mongoose.Types.ObjectId.isValid(conversationId)) {
    throw new AppError("Invalid conversation ID", 400);
  }
  const clean = String(text || "").trim().slice(0, 2000);
  if (!clean) throw new AppError("Message cannot be empty", 400);

  await assertNotCoolingDown(senderId);

  const conversation = await Conversation.findById(conversationId);
  if (!conversation || !conversation.is_active) {
    throw new AppError("Conversation not found", 404);
  }
  assertParticipant(conversation, senderId);
  const receiverId = otherPartyOf(conversation, senderId);

  // Quote target must be a real message inside THIS conversation,
  // otherwise it becomes a cross-thread info leak.
  let replyToId = null;
  if (replyTo) {
    if (!mongoose.Types.ObjectId.isValid(replyTo)) {
      throw new AppError("Invalid reply reference", 400);
    }
    const quoted = await Message.findById(replyTo)
      .select("conversation_id message_type")
      .lean();
    if (!quoted || String(quoted.conversation_id) !== String(conversation._id)) {
      throw new AppError("Replied message not found in this chat", 400);
    }
    if (quoted.message_type === MESSAGE_TYPE.SYSTEM) {
      throw new AppError("Cannot reply to system messages", 400);
    }
    replyToId = quoted._id;
  }

  // Safety screen: abusive/sexual content is stored verbatim for moderator
  // review but served masked, and a flag goes to the admin report queue.
  const screen = screenText(clean);
  const message = await Message.create({
    conversation_id: conversation._id,
    sender_id: senderId,
    receiver_id: receiverId,
    message_type: MESSAGE_TYPE.TEXT,
    text: clean,
    message_status: MESSAGE_STATUS.SENT,
    reply_to: replyToId,
    ...(screen.flagged
      ? {
          is_flagged: true,
          flag_reason: screen.matched || "inappropriate_content",
          flagged_at: new Date(),
        }
      : {}),
  });

  if (screen.flagged) {
    fileAutoReport({
      conversation,
      senderId,
      receiverId,
      excerpt: clean,
    });
    // Strike counts toward the cooldown ladder (never fails the send).
    try {
      await registerStrike(senderId);
    } catch {
      // ignore
    }
  }

  const preview = screen.flagged ? BLOCKED_PLACEHOLDER : clean.slice(0, 500);
  const activityAt = new Date();
  const unreadSide =
    String(conversation.buyer_id) === String(receiverId) ? "buyer" : "seller";
  // Atomic $inc: the old read-modify-save lost unread increments when two
  // messages (or a message + an offer) were written concurrently.
  await Conversation.updateOne(
    { _id: conversation._id },
    {
      $set: {
        last_message: preview,
        last_message_type: MESSAGE_TYPE.TEXT,
        last_message_sender: senderId,
        last_activity_at: activityAt,
      },
      $inc: { [`unread_count.${unreadSide}`]: 1 },
    },
  );
  conversation.last_message = preview;
  conversation.last_activity_at = activityAt;

  const [payload] = await attachReplies([toClientMessage(message)]);
  emitToConversation(conversation._id, "message:new", payload);
  emitToUser(receiverId, "conversation:updated", {
    conversationId: String(conversation._id),
    last_message: conversation.last_message,
    last_activity_at: conversation.last_activity_at,
  });

  // Best-effort in-app message notification
  try {
    // The sender was just authenticated, so this is a cache hit, not a query.
    const sender = await loadAuthUser(User, senderId);
    notifyNewMessage({
      conversationId: conversation._id,
      senderId,
      receiverId,
      senderName: sender?.name || "A user",
      textSnippet: preview,
    });
  } catch {
    // never break message sending if notification fails
  }

  return payload;
};

const fmtClock = (ms) => {
  const s = Math.max(1, Math.round(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};
// ImageKit may label a WebM/MP4 audio-only file as video/*.
const VOICE_MIME_RE = /^(audio\/[a-z0-9.+-]+|video\/(webm|mp4))$/i;

/**
 * Voice note. The client records, uploads straight to ImageKit (signed,
 * into its own /voice folder, tag "voice"), then sends only the fileId.
 * Nothing about the file is trusted from the client: owner folder, size,
 * type and URL come from ImageKit's record (one API call), and the
 * partial-unique index on audio.file_id stops a file being sent twice.
 * Bandwidth never touches this server. Rate limits live on the route
 * (per account, minute/hour/day) on top of the shared abuse cooldown.
 */
export const sendVoiceMessage = async ({ conversationId, senderId, fileId, durationMs, peaks = [], replyTo = null }) => {
  if (!mongoose.Types.ObjectId.isValid(conversationId)) {
    throw new AppError("Invalid conversation ID", 400);
  }
  if (!isValidFileId(fileId)) throw new AppError("Invalid voice note", 400);
  const duration = Math.round(Number(durationMs));
  if (!Number.isFinite(duration) || duration < VOICE_LIMITS.MIN_DURATION_MS) {
    throw new AppError("Voice note is too short", 400);
  }
  if (duration > VOICE_LIMITS.MAX_DURATION_MS + 1500) {
    throw new AppError("Voice notes can be up to 2 minutes", 400);
  }

  await assertNotCoolingDown(senderId);

  // Cheap DB checks before the external call.
  const conversation = await Conversation.findById(conversationId);
  if (!conversation || !conversation.is_active) {
    throw new AppError("Conversation not found", 404);
  }
  assertParticipant(conversation, senderId);
  const receiverId = otherPartyOf(conversation, senderId);
  if (await Message.exists({ "audio.file_id": fileId })) {
    throw new AppError("This voice note was already sent", 409);
  }

  let replyToId = null;
  if (replyTo) {
    if (!mongoose.Types.ObjectId.isValid(replyTo)) throw new AppError("Invalid reply reference", 400);
    const quoted = await Message.findById(replyTo).select("conversation_id message_type").lean();
    if (!quoted || String(quoted.conversation_id) !== String(conversation._id)) {
      throw new AppError("Replied message not found in this chat", 400);
    }
    if (quoted.message_type === MESSAGE_TYPE.SYSTEM) throw new AppError("Cannot reply to system messages", 400);
    replyToId = quoted._id;
  }

  let file;
  try {
    file = await getFileDetails(fileId);
  } catch {
    throw new AppError("Voice note upload not found. Please record it again.", 400);
  }
  const endpoint = String(process.env.IMAGEKIT_URL_ENDPOINT || "").replace(/\/+$/, "");
  if (!isInVoiceFolderOf(file?.filePath, senderId)) throw new AppError("Invalid voice note", 403);
  if (!(Number(file?.size) > 0) || Number(file.size) > VOICE_LIMITS.MAX_BYTES) {
    throw new AppError("Voice note is too large", 413);
  }
  if (file?.mime && !VOICE_MIME_RE.test(file.mime)) throw new AppError("Unsupported audio format", 415);
  if (!endpoint || !String(file?.url || "").startsWith(`${endpoint}/`)) throw new AppError("Invalid voice note", 400);

  // Waveform: at most PEAKS bars, each an integer 0–100.
  const cleanPeaks = (Array.isArray(peaks) ? peaks : [])
    .slice(0, VOICE_LIMITS.PEAKS)
    .map((v) => Math.max(0, Math.min(100, Math.round(Number(v) || 0))));

  let message;
  try {
    message = await Message.create({
      conversation_id: conversation._id,
      sender_id: senderId,
      receiver_id: receiverId,
      message_type: MESSAGE_TYPE.AUDIO,
      text: "Voice message",
      message_status: MESSAGE_STATUS.SENT,
      reply_to: replyToId,
      audio: {
        url: file.url,
        file_id: fileId,
        duration_ms: Math.min(duration, VOICE_LIMITS.MAX_DURATION_MS),
        mime: file.mime || "",
        size: Number(file.size) || 0,
        peaks: cleanPeaks,
      },
    });
  } catch (err) {
    if (err?.code === 11000) throw new AppError("This voice note was already sent", 409);
    throw err;
  }

  const preview = `🎤 Voice message (${fmtClock(message.audio.duration_ms)})`;
  const activityAt = new Date();
  const unreadSide = String(conversation.buyer_id) === String(receiverId) ? "buyer" : "seller";
  await Conversation.updateOne(
    { _id: conversation._id },
    {
      $set: {
        last_message: preview,
        last_message_type: MESSAGE_TYPE.AUDIO,
        last_message_sender: senderId,
        last_activity_at: activityAt,
      },
      $inc: { [`unread_count.${unreadSide}`]: 1 },
    },
  );

  const [payload] = await attachReplies([toClientMessage(message)]);
  emitToConversation(conversation._id, "message:new", payload);
  emitToUser(receiverId, "conversation:updated", {
    conversationId: String(conversation._id),
    last_message: preview,
    last_activity_at: activityAt,
  });
  try {
    const sender = await loadAuthUser(User, senderId);
    notifyNewMessage({
      conversationId: conversation._id,
      senderId,
      receiverId,
      senderName: sender?.name || "A user",
      textSnippet: preview,
    });
  } catch {
    // never break sending if notification fails
  }
  return payload;
};

/**
 * Paginated messages, oldest -> newest for rendering.
 * `before` = ObjectId cursor; loads older messages.
 */
export const getMessages = async ({ conversationId, userId, limit = 50, before = null, after = null }) => {
  if (!mongoose.Types.ObjectId.isValid(conversationId)) {
    throw new AppError("Invalid conversation ID", 400);
  }
  const conversation = await Conversation.findById(conversationId).select("buyer_id seller_id").lean();
  if (!conversation) throw new AppError("Conversation not found", 404);
  assertParticipant(conversation, userId);

  const lim = Math.min(Math.max(Number(limit) || 50, 1), 100);
  const filter = { conversation_id: conversation._id };
  if (before) {
    // A garbage cursor must fail loudly, silently ignoring it would return
    // the newest page as "older" messages (duplicates on the client).
    if (!mongoose.Types.ObjectId.isValid(before)) {
      throw new AppError("Invalid message cursor", 400);
    }
    filter._id = { $lt: new mongoose.Types.ObjectId(before) };
  } else if (after) {
    // Incremental catch-up (safety-net polls, post-action refresh): only
    // messages newer than the client's last one. Usually zero rows, so the
    // reply/receipt work below is skipped too.
    if (!mongoose.Types.ObjectId.isValid(after)) {
      throw new AppError("Invalid message cursor", 400);
    }
    filter._id = { $gt: new mongoose.Types.ObjectId(after) };
  }

  const docs = await Message.find(filter)
    .sort({ _id: after && !before ? 1 : -1 })
    .limit(lim)
    .lean();
  if (after && !before) {
    docs.reverse(); // keep the newest-first shape the code below expects
    if (!docs.length) return { messages: [], hasMore: false };
  }
  // Mask flagged originals, clients never see abusive text, moderators do.
  let ordered = docs.reverse().map((m) =>
    m.is_flagged ? { ...m, text: BLOCKED_PLACEHOLDER } : m,
  );

  // Quote previews, batched.
  ordered = await attachReplies(ordered);

  // Reciprocal receipts: with read receipts off, the reader still needs
  // correct local state, but peer READs render as DELIVERED in their view.
  // Cached auth user (this request already loaded it): no extra query.
  const me = await loadAuthUser(User, userId);
  if (me?.chat_settings && me.chat_settings.read_receipts === false) {
    const myId = String(userId);
    ordered = ordered.map((m) =>
      String(m.sender_id) !== myId && m.message_status === MESSAGE_STATUS.READ
        ? { ...m, message_status: MESSAGE_STATUS.DELIVERED }
        : m,
    );
  }

  // Opportunistic delivery marking: messages addressed to this reader
  // that are still SENT become DELIVERED on fetch.
  const deliverable = docs
    .filter(
      (m) =>
        String(m.receiver_id) === String(userId) &&
        m.message_status === MESSAGE_STATUS.SENT,
    )
    .map((m) => m._id);
  if (deliverable.length) {
    const deliveredAt = new Date();
    await Message.updateMany(
      { _id: { $in: deliverable } },
      { $set: { message_status: MESSAGE_STATUS.DELIVERED, delivered_at: deliveredAt } },
    );
    const deliveredSet = new Set(deliverable.map((id) => String(id)));
    ordered.forEach((m) => {
      if (deliveredSet.has(String(m._id))) {
        m.message_status = MESSAGE_STATUS.DELIVERED;
      }
    });
    // Realtime second tick: the sender upgrades ✓ -> ✓✓ (grey) instantly.
    emitToConversation(conversation._id, "message:delivered", {
      conversationId: String(conversation._id),
      messageIds: [...deliveredSet],
      deliveredAt,
    });
  }

  return { messages: ordered, hasMore: docs.length === lim };
};

/**
 * Mark all messages addressed to userId as READ + reset unread counter.
 * With receipt=false the reader's bookkeeping still clears (badges stay
 * correct) but messages stop at DELIVERED and nothing is broadcast, so the
 * peer keeps grey ticks forever. Returns the conversation.
 */
export const markConversationRead = async ({ conversationId, userId, receipt = true }) => {
  if (!mongoose.Types.ObjectId.isValid(conversationId)) {
    throw new AppError("Invalid conversation ID", 400);
  }
  const conversation = await Conversation.findById(conversationId)
    .select("buyer_id seller_id unread_count")
    .lean();
  if (!conversation) throw new AppError("Conversation not found", 404);
  assertParticipant(conversation, userId);

  const now = new Date();
  const target = receipt === false ? MESSAGE_STATUS.DELIVERED : MESSAGE_STATUS.READ;
  const side = String(conversation.buyer_id) === String(userId) ? "buyer" : "seller";
  const res = await Message.updateMany(
    {
      conversation_id: conversation._id,
      receiver_id: userId,
      message_status: { $in: [MESSAGE_STATUS.SENT, MESSAGE_STATUS.DELIVERED] },
    },
    { $set: { message_status: target, delivered_at: now, ...(receipt === false ? {} : { read_at: now }) } },
  );

  // One atomic write, and only when there is something to clear (opening a
  // thread that's already read costs a single indexed updateMany, no save).
  if ((conversation.unread_count?.[side] || 0) !== 0) {
    await Conversation.updateOne({ _id: conversation._id }, { $set: { [`unread_count.${side}`]: 0 } });
    conversation.unread_count = { ...(conversation.unread_count || {}), [side]: 0 };
  }

  // Nothing changed: no broadcast (the peer would only re-render).
  if (receipt !== false && res.modifiedCount > 0) {
    emitToConversation(conversation._id, "message:read", {
      conversationId: String(conversation._id),
      readBy: String(userId),
      readAt: now,
    });
  }

  return conversation;
};
