// In-app notification engine.
//
//   Broadcasts (admin campaigns)  -> ONE Notification doc + per-user
//                                    NotificationReceipt for read/dismiss/click.
//   Direct (system events)        -> one Notification doc per recipient,
//                                    read/dismiss/click state on the doc.
//
// Delivery is MongoDB (source of truth) + a best-effort Socket.IO push on
// "notification:new". Offline users pick items up on their next feed fetch.
// Every notifyX() helper is fire-and-forget: it never throws, so a failed
// notification can never fail the deal / message / moderation that caused it.
import mongoose from "mongoose";
import Notification, {
  NotificationReceipt,
  CAMPAIGN_TYPES,
  NOTIFICATION_AUDIENCES,
  retentionDate,
} from "../models/Notification.model.js";
import User from "../models/User.model.js";
import Conversation from "../models/conversation.model.js";
import Product from "../models/Product.model.js";
import { USER_STATUS } from "../config/constants.js";
import {
  emitToAll,
  emitToCampus,
  emitToUser,
  emitToUsers,
  getActiveUserCount,
  onlineUserIdsIn,
} from "../utils/socket.js";
import { AppError } from "../utils/appError.js";
import { pushToUserFilter, pushToUsers } from "./push.service.js";

const EVENT = "notification:new";
const SENDING_STALE_MS = 10 * 60 * 1000; // a "sending" row older than this crashed mid-dispatch
const PRICE_DROP_COOLDOWN_MS = 24 * 60 * 60 * 1000;

const clip = (value, max) => String(value ?? "").trim().slice(0, max);
const inr = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;
const chatPath = (conversationId) => `/chat?conversationId=${conversationId}`;

// ==================== CLIENT PAYLOAD ====================

// Display label sent as `type`. Direct-event labels are kept verbatim from
// the original API so existing clients (web + app) keep matching on them.
const DIRECT_TYPE_LABELS = {
  message: "DIRECT MESSAGE",
  order: "ORDER UPDATE",
  price_drop: "PRICE DROP",
  moderation: "MODERATION",
};

const formatRelativeTime = (date) => {
  if (!date) return "Just now";
  const diffSec = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (diffSec < 60) return "Just now";
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  if (diffSec < 172800) return "Yesterday";
  return `${Math.floor(diffSec / 86400)}d ago`;
};

/**
 * The single shape every client receives, from the feed and from the socket.
 * Both camelCase and the legacy snake_case aliases are included because
 * shipped clients read either; new code should use the camelCase fields and
 * `kind` (the raw type) rather than the display `type`.
 */
export const toClientNotification = (doc, { unread = true } = {}) => {
  const isBroadcast = doc.is_broadcast !== false;
  const kind = doc.type || "general";
  const at = doc.sent_at || doc.createdAt || new Date();
  const actionPath = doc.action_url || (isBroadcast ? "/deals" : "/notification");
  const actionLabel = doc.action_label || (isBroadcast ? "View Offers" : "View Details");
  const id = String(doc._id);
  return {
    id,
    _id: id,
    kind,
    type: (!isBroadcast && DIRECT_TYPE_LABELS[kind]) || kind.toUpperCase(),
    title: doc.title,
    message: doc.message,
    description: doc.message,
    imageUrl: doc.image_url || null,
    image_url: doc.image_url || null,
    actionPath,
    action_url: actionPath,
    actionLabel,
    action_label: actionLabel,
    count: doc.group_count || 1,
    createdAt: at,
    time: formatRelativeTime(at),
    unread,
    isBroadcast,
  };
};

// ==================== DIRECT (ONE USER) ====================

const directDoc = ({
  recipientId,
  type = "general",
  title,
  message,
  actionUrl = null,
  actionLabel = null,
  senderId = null,
  imageUrl = null,
  groupKey = null,
  now = new Date(),
}) => ({
  title: clip(title, 100),
  message: clip(message, 500),
  type,
  target_audience: "all",
  is_broadcast: false,
  recipient_id: recipientId,
  sent_by: senderId,
  action_url: actionUrl,
  action_label: actionLabel,
  image_url: imageUrl,
  group_key: groupKey,
  status: "sent",
  sent_at: now,
  expires_at: retentionDate(now),
  is_read: false,
  stats: { total_sent: 1 },
});

/** Store + push one direct notification. Never throws; returns the doc or null. */
const sendDirect = async (input) => {
  if (!input?.recipientId) return null;
  try {
    const notification = await Notification.create(directDoc(input));
    const payload = toClientNotification(notification);
    emitToUser(input.recipientId, EVENT, payload);
    pushToUsers([input.recipientId], { ...payload, tag: input.groupKey }); // best-effort, never throws
    return notification;
  } catch (error) {
    console.error(`Failed to send "${input.type || "general"}" notification:`, error?.message);
    return null;
  }
};

/**
 * One-off in-app notification to a single user (stored + pushed live).
 * Never throws: moderation must not fail because a notification did.
 */
export const notifyUser = ({ userId, title, message, actionUrl = null, actionLabel = null, type = "general" }) =>
  sendDirect({ recipientId: userId, type, title, message, actionUrl, actionLabel });

/**
 * Chat message. Suppressed while the recipient is inside that conversation,
 * and grouped: while the previous alert for this chat is unread, new messages
 * update it ("3 new messages from Rahul") instead of stacking new rows.
 */
export const notifyNewMessage = async ({ conversationId, senderId, receiverId, senderName, textSnippet }) => {
  try {
    if (!receiverId) return null;
    const inRoom = await onlineUserIdsIn([`conversation:${conversationId}`]);
    if (inRoom.has(String(receiverId))) return null;

    const name = senderName || "User";
    const message = textSnippet ? clip(textSnippet, 150) : "You received a new message";
    const groupKey = `conversation:${conversationId}`;
    const now = new Date();

    const grouped = await Notification.findOneAndUpdate(
      {
        recipient_id: receiverId,
        is_broadcast: false,
        status: "sent",
        group_key: groupKey,
        is_read: false,
        is_dismissed: { $ne: true },
      },
      { $set: { message, sent_at: now, expires_at: retentionDate(now) }, $inc: { group_count: 1 } },
      { returnDocument: "after" },
    ).lean();

    if (grouped) {
      grouped.title = clip(`${grouped.group_count} new messages from ${name}`, 100);
      await Notification.updateOne({ _id: grouped._id }, { $set: { title: grouped.title } });
      const payload = toClientNotification(grouped);
      emitToUser(receiverId, EVENT, payload);
      // Same tag as the first alert, so the OS replaces it instead of stacking.
      pushToUsers([receiverId], { ...payload, tag: groupKey });
      return grouped;
    }

    return sendDirect({
      recipientId: receiverId,
      senderId,
      type: "message",
      title: `New message from ${name}`,
      message,
      actionUrl: chatPath(conversationId),
      actionLabel: "Reply in Chat",
      groupKey,
      now,
    });
  } catch (error) {
    console.error("Failed to notify new message:", error?.message);
    return null;
  }
};

// ---- Deal lifecycle ----

export const notifyNewOffer = ({ conversationId, buyerId, buyerName, amount, productTitle, sellerId }) =>
  sendDirect({
    recipientId: sellerId,
    senderId: buyerId,
    type: "order",
    title: "New Offer Received!",
    message: `${buyerName || "A buyer"} offered ${inr(amount)} for "${productTitle || "your item"}".`,
    actionUrl: chatPath(conversationId),
    actionLabel: "View Offer",
  });

export const notifyOfferAccepted = ({ conversationId, sellerName, productTitle, amount, buyerId }) =>
  sendDirect({
    recipientId: buyerId,
    type: "order",
    title: "Offer Accepted! 🎉",
    message: `${sellerName || "The seller"} accepted your offer of ${inr(amount)} for "${productTitle || "the item"}". Sort out the pickup in chat.`,
    actionUrl: chatPath(conversationId),
    actionLabel: "View Deal",
  });

export const notifyOfferDeclined = ({ conversationId, responderName, productTitle, amount, recipientId }) =>
  sendDirect({
    recipientId,
    type: "order",
    title: "Offer declined",
    message: `${responderName || "The seller"} passed on your ${inr(amount)} offer for "${productTitle || "the item"}". You can make another one.`,
    actionUrl: chatPath(conversationId),
    actionLabel: "Make New Offer",
  });

export const notifyDealConfirmed = ({ conversationId, sellerName, productTitle, amount, buyerId }) =>
  sendDirect({
    recipientId: buyerId,
    type: "order",
    title: "Deal locked 🔒",
    message: `${sellerName || "The seller"} reserved "${productTitle || "the item"}" for you at ${inr(amount)}. Pickup details coming next.`,
    actionUrl: chatPath(conversationId),
    actionLabel: "View Deal",
  });

export const notifyPickupScheduled = ({ conversationId, location, scheduledDate, recipientId }) => {
  const dateLabel = scheduledDate
    ? new Date(scheduledDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
    : "a scheduled date";
  return sendDirect({
    recipientId,
    type: "order",
    title: "Pickup Spot Confirmed 📍",
    message: `Meeting scheduled at "${location || "a spot"}" on ${dateLabel}.`,
    actionUrl: "/myorders",
    actionLabel: "View Pickup",
  });
};

export const notifyPaymentConfirmed = ({ conversationId, productTitle, buyerId }) =>
  sendDirect({
    recipientId: buyerId,
    type: "order",
    title: "Payment confirmed",
    message: `The seller confirmed your payment for "${productTitle || "the item"}". Tap "Item received" once it's in your hands.`,
    actionUrl: chatPath(conversationId),
    actionLabel: "Confirm Receipt",
  });

export const notifyDealCompleted = ({ buyerName, productTitle, sellerId }) =>
  sendDirect({
    recipientId: sellerId,
    type: "order",
    title: "Deal Completed Successfully 🎉",
    message: `${buyerName || "The buyer"} confirmed receiving "${productTitle || "the item"}". Payment balance updated.`,
    actionUrl: "/myorders",
    actionLabel: "View Order Details",
  });

export const notifyDealCancelled = ({ productTitle, cancellerName, recipientId }) =>
  sendDirect({
    recipientId,
    type: "order",
    title: "Deal Cancelled",
    message: `Deal for "${productTitle || "the item"}" was cancelled by ${cancellerName || "the other party"}.`,
    actionUrl: "/myorders",
    actionLabel: "View Details",
  });

// ---- Wishlist ----

/**
 * Fan-out price drop alerts to wishlist holders. Each user gets at most one
 * alert per product per 24h, so a seller nudging the price down repeatedly
 * doesn't spam everyone who saved it.
 */
export const notifyPriceDrop = async ({ productId, productTitle, oldPrice, newPrice }) => {
  try {
    const diff = Number(oldPrice) - Number(newPrice);
    if (!(diff > 0)) return null;

    const groupKey = `price_drop:${productId}`;
    const [holders, recentlyAlerted] = await Promise.all([
      User.find({ wishlist: productId, status: USER_STATUS.ACTIVE }).distinct("_id"),
      Notification.find({
        group_key: groupKey,
        is_broadcast: false,
        sent_at: { $gte: new Date(Date.now() - PRICE_DROP_COOLDOWN_MS) },
      }).distinct("recipient_id"),
    ]);
    const skip = new Set(recentlyAlerted.map(String));
    const recipients = holders.filter((id) => !skip.has(String(id)));
    if (!recipients.length) return null;

    const now = new Date();
    const notifications = await Notification.insertMany(
      recipients.map((recipientId) =>
        directDoc({
          recipientId,
          type: "price_drop",
          title: "Price Drop Alert! 🔥",
          message: `"${productTitle || "An item"}" on your wishlist dropped by ${inr(diff)}! Now at ${inr(newPrice)}. Grab it before it sells out!`,
          actionUrl: `/product/${productId}`,
          actionLabel: "Buy Now",
          groupKey,
          now,
        }),
      ),
      { ordered: false },
    );
    for (const notification of notifications) {
      emitToUser(notification.recipient_id, EVENT, toClientNotification(notification));
    }
    if (notifications.length) {
      // Same text for everyone, so one multicast instead of a call per user.
      pushToUsers(recipients, { ...toClientNotification(notifications[0]), id: "", tag: groupKey });
    }
    return notifications;
  } catch (error) {
    console.error("Failed to notify price drop:", error?.message);
    return null;
  }
};

// ---- Moderation / account ----

export const notifyModerationWarning = ({ productTitle, sellerId, adminNote = null }) =>
  sendDirect({
    recipientId: sellerId,
    type: "moderation",
    title: "Listing Under Review ⚠️",
    message: adminNote
      ? `Your listing "${productTitle || "a product"}" has been flagged: ${adminNote}`
      : `Your listing "${productTitle || "a product"}" has been flagged for moderation review. Please review our guidelines.`,
    actionUrl: "/productlisted",
    actionLabel: "Review Guidelines",
  });

const LISTING_ACTION_COPY = {
  blocked: {
    title: "Listing removed",
    body: (t) => `Your listing "${t}" was removed from the marketplace by our team and can't be relisted.`,
  },
  unlisted: {
    title: "Listing hidden",
    body: (t) => `Your listing "${t}" was hidden by our team. Fix the issue, then you can relist it.`,
  },
  deleted: {
    title: "Listing deleted",
    body: (t) => `Your listing "${t}" was deleted by our team for breaking our guidelines.`,
  },
  auto_hidden: {
    title: "Listing paused for review",
    body: (t) => `Your listing "${t}" received several reports and is paused while our team reviews it.`,
  },
  reinstated: {
    title: "Listing is live again",
    body: (t) => `Good news: your listing "${t}" was reviewed and is visible on the marketplace again.`,
  },
};

/** Tell a seller what moderation did to their listing, with the reason. */
export const notifyListingModerated = ({ sellerId, productTitle, action, reason = null }) => {
  const copy = LISTING_ACTION_COPY[action];
  if (!copy) return Promise.resolve(null);
  const title = (productTitle || "your item").slice(0, 80);
  const reasonText = reason ? ` Reason: ${String(reason).slice(0, 200)}` : "";
  return notifyUser({
    userId: sellerId,
    type: "moderation",
    title: copy.title,
    message: copy.body(title) + reasonText,
    actionUrl: "/productlisted",
    actionLabel: "My listings",
  });
};

/**
 * Close the loop with whoever filed a report.
 * outcome: "resolved" (action taken) | "dismissed" (no violation found).
 */
export const notifyReporterOutcome = ({ reporterId, targetModel, targetLabel, outcome }) => {
  const what =
    targetModel === "Product"
      ? `the listing "${(targetLabel || "you reported").slice(0, 80)}"`
      : targetModel === "User"
        ? "the user you reported"
        : "your support request";
  const isSupport = targetModel === "Support";
  const message =
    outcome === "resolved"
      ? isSupport
        ? "Your support request has been resolved. Thanks for reaching out."
        : `Thanks for your report about ${what}. Our team reviewed it and took action.`
      : isSupport
        ? "Your support request was closed. Reply via Help if you still need assistance."
        : `Thanks for your report about ${what}. We reviewed it and didn't find a violation of our guidelines this time.`;
  return notifyUser({
    userId: reporterId,
    title: outcome === "resolved" ? "Update on your report" : "Your report was reviewed",
    message,
    actionUrl: "/notification",
  });
};

/** Notify user when their role is updated (e.g., promoted to support). */
export const notifyRoleAssigned = ({ userId, newRole }) => {
  const role = String(newRole || "");
  const roleLabel = role === "support" ? "Support Staff" : role.charAt(0).toUpperCase() + role.slice(1);
  return sendDirect({
    recipientId: userId,
    title: "Staff Role Updated",
    message: `You have been granted ${roleLabel} permissions on Unideals Admin Portal.`,
    actionUrl: "/profile",
    actionLabel: "View Profile",
  });
};

// ==================== BROADCAST AUDIENCE ====================

/**
 * Who a campaign targets: the active-user filter, plus either the socket
 * room that reaches them or the explicit id list (buyers / sellers).
 */
const resolveAudience = async ({ targetAudience = "all", targetCampus = null }) => {
  const active = { status: USER_STATUS.ACTIVE };
  if (targetAudience === "all") return { filter: active, room: "broadcast:all" };
  if (targetAudience === "campus") {
    if (!targetCampus || !mongoose.Types.ObjectId.isValid(targetCampus)) {
      throw new AppError("A valid campus must be selected for campus targeting", 400);
    }
    return { filter: { ...active, campus_id: targetCampus }, room: `campus:${targetCampus}` };
  }
  if (targetAudience === "buyers" || targetAudience === "sellers") {
    // Buyers = users who opened a conversation; sellers = users with a listing.
    const ids =
      targetAudience === "buyers"
        ? await Conversation.distinct("buyer_id")
        : await Product.distinct("seller_id");
    const filter = { ...active, _id: { $in: ids } };
    return { filter, userIds: await User.distinct("_id", filter) };
  }
  throw new AppError("Invalid notification audience", 400);
};

/** Estimate recipient count based on target audience and campus filters. */
export const estimateRecipients = async ({ targetAudience = "all", targetCampus = null }) => {
  const audience = await resolveAudience({ targetAudience, targetCampus });
  return audience.userIds ? audience.userIds.length : User.countDocuments(audience.filter);
};

/** Mongo match for the broadcasts one user is eligible to see. */
const getUserBroadcastQuery = async (user) => {
  const audiences = [{ target_audience: "all" }];
  if (user.campus_id) audiences.push({ target_audience: "campus", target_campus: user.campus_id });

  const [isBuyer, isSeller] = await Promise.all([
    Conversation.exists({ buyer_id: user._id }),
    Product.exists({ seller_id: user._id }),
  ]);
  if (isBuyer) audiences.push({ target_audience: "buyers" });
  if (isSeller) audiences.push({ target_audience: "sellers" });

  // Only campaigns sent after the user joined. Legacy rows have no sent_at,
  // so fall back to createdAt for them.
  const since = new Date(user.createdAt || 0);
  return {
    is_broadcast: true,
    status: "sent",
    $and: [
      { $or: audiences },
      { $or: [{ sent_at: { $gte: since } }, { sent_at: null, createdAt: { $gte: since } }] },
    ],
  };
};

/**
 * Send a broadcast campaign now: record reach, mark sent, push live.
 * Throws on failure; callers decide whether that marks the row failed.
 */
export const dispatchNotificationDocument = async (notification) => {
  const audience = await resolveAudience({
    targetAudience: notification.target_audience,
    targetCampus: notification.target_campus,
  });
  const recipientCount = audience.userIds
    ? audience.userIds.length
    : await User.countDocuments(audience.filter);
  const onlineRooms = audience.room ? [audience.room] : (audience.userIds || []).map((id) => `user:${id}`);
  const delivered = (await onlineUserIdsIn(onlineRooms)).size;

  const now = new Date();
  notification.status = "sent";
  notification.sent_at = now;
  notification.expires_at = retentionDate(now);
  notification.failure_reason = null;
  notification.stats = {
    total_sent: recipientCount,
    delivered,
    clicked: notification.stats?.clicked || 0,
  };
  await notification.save();

  const payload = toClientNotification(notification);
  if (notification.target_audience === "all") emitToAll(EVENT, payload);
  else if (notification.target_audience === "campus") emitToCampus(notification.target_campus, EVENT, payload);
  else emitToUsers(audience.userIds, EVENT, payload);
  // System push to the same audience, in the background (can be thousands of devices).
  pushToUserFilter(audience.filter, { ...payload, tag: `campaign:${payload.id}` });

  return notification;
};

const markFailed = (notification, error) =>
  Notification.updateOne(
    { _id: notification._id },
    { $set: { status: "failed", failure_reason: clip(error?.message || "Unknown error", 300) } },
  ).catch(() => {});

// action_url is followed by the client on click. Only allow in-app paths
// ("/deals") or absolute https links — never javascript:, data:, or
// protocol-relative "//host" URLs.
const sanitizeActionUrl = (value) => {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string") throw new AppError("Invalid action URL", 400);
  const v = value.trim().slice(0, 500);
  if (!v) return null;
  if (v.startsWith("/") && !v.startsWith("//") && !v.includes("\\")) return v;
  try {
    const u = new URL(v);
    if (u.protocol === "https:") return u.toString();
  } catch {
    // fall through
  }
  throw new AppError("Action URL must be an in-app path (/...) or an https:// link", 400);
};

const sanitizeImageUrl = (value) => {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string") throw new AppError("Invalid image URL", 400);
  const v = value.trim().slice(0, 2048);
  if (!v) return null;
  try {
    const u = new URL(v);
    if (u.protocol === "https:") return u.toString();
  } catch {
    // fall through
  }
  throw new AppError("Image URL must be an https:// link", 400);
};

/** Create a campaign from the admin portal (sent now, or scheduled). */
export const createAdminNotification = async ({
  title,
  message,
  type = "general",
  target_audience = "all",
  target_campus = null,
  image_url = null,
  action_url = null,
  action_label = "View Offers",
  schedule_type = "now",
  scheduled_at = null,
  sent_by = null,
}) => {
  if (typeof title !== "string" || !title.trim()) throw new AppError("Notification title is required", 400);
  if (typeof message !== "string" || !message.trim()) throw new AppError("Notification message is required", 400);
  if (title.trim().length > 100) throw new AppError("Title cannot exceed 100 characters", 400);
  if (message.trim().length > 500) throw new AppError("Message cannot exceed 500 characters", 400);
  if (!CAMPAIGN_TYPES.includes(type)) throw new AppError("Invalid notification type", 400);
  if (!NOTIFICATION_AUDIENCES.includes(target_audience)) throw new AppError("Invalid notification audience", 400);

  const safeActionUrl = sanitizeActionUrl(action_url);
  const safeImageUrl = sanitizeImageUrl(image_url);
  const safeActionLabel =
    typeof action_label === "string" && action_label.trim() ? action_label.trim().slice(0, 40) : "View Offers";

  let campusId = null;
  if (target_audience === "campus") {
    if (!target_campus || !mongoose.Types.ObjectId.isValid(target_campus)) {
      throw new AppError("A valid campus must be selected for campus targeting", 400);
    }
    campusId = target_campus;
  }

  const isScheduled = schedule_type === "scheduled";
  let scheduledDate = null;
  if (isScheduled) {
    scheduledDate = new Date(scheduled_at);
    if (!scheduled_at || Number.isNaN(scheduledDate.getTime()) || scheduledDate <= new Date()) {
      throw new AppError("Scheduled notifications require a future date and time", 400);
    }
  }

  const notification = await Notification.create({
    title: title.trim(),
    message: message.trim(),
    type,
    target_audience,
    target_campus: campusId,
    image_url: safeImageUrl,
    action_url: safeActionUrl,
    action_label: safeActionLabel,
    schedule_type: isScheduled ? "scheduled" : "now",
    scheduled_at: scheduledDate,
    // "sending" (not "draft") so the scheduler's crash recovery can finish
    // an instant send that died half-way.
    status: isScheduled ? "scheduled" : "sending",
    sent_by,
    is_broadcast: true,
  });

  if (!isScheduled) {
    try {
      await dispatchNotificationDocument(notification);
    } catch (error) {
      await markFailed(notification, error);
      throw error;
    }
  }
  return notification;
};

/**
 * Send due scheduled campaigns (called every minute by the job runner).
 * Each row is claimed atomically (-> "sending") first, so overlapping ticks
 * or several server instances never send the same campaign twice. Rows left
 * in "sending" by a crashed process are re-claimed after SENDING_STALE_MS.
 */
export const dispatchDueScheduledNotifications = async () => {
  let count = 0;
  try {
    for (let i = 0; i < 100; i++) {
      const now = new Date();
      const notif = await Notification.findOneAndUpdate(
        {
          is_broadcast: true,
          $or: [
            { status: "scheduled", scheduled_at: { $lte: now } },
            { status: "sending", updatedAt: { $lte: new Date(now.getTime() - SENDING_STALE_MS) } },
          ],
        },
        { $set: { status: "sending" } },
        { returnDocument: "after", sort: { scheduled_at: 1 } },
      );
      if (!notif) break;
      try {
        await dispatchNotificationDocument(notif);
        count += 1;
      } catch (err) {
        console.error("Scheduled notification dispatch failed:", err?.message);
        await markFailed(notif, err);
      }
    }
  } catch (error) {
    console.error("Failed to dispatch scheduled notifications:", error?.message);
  }
  return count;
};

// ==================== USER FEED + STATE ====================

/** A user's feed: eligible broadcasts + their direct notifications. */
export const getUserNotificationFeed = async (userId) => {
  const user = await User.findById(userId).select("campus_id createdAt role").lean();
  if (!user) throw new AppError("User not found", 404);

  const newestFirst = { sent_at: -1, createdAt: -1 };
  const [broadcasts, directs] = await Promise.all([
    getUserBroadcastQuery(user).then((q) => Notification.find(q).sort(newestFirst).limit(50).lean()),
    Notification.find({
      is_broadcast: false,
      recipient_id: userId,
      status: "sent",
      is_dismissed: { $ne: true },
    })
      .sort(newestFirst)
      .limit(50)
      .lean(),
  ]);

  const receipts = broadcasts.length
    ? await NotificationReceipt.find({
        user_id: userId,
        notification_id: { $in: broadcasts.map((b) => b._id) },
      }).lean()
    : [];
  const receiptOf = new Map(receipts.map((r) => [String(r.notification_id), r]));

  const notifications = [
    ...broadcasts
      .filter((b) => !receiptOf.get(String(b._id))?.is_dismissed)
      .map((b) => toClientNotification(b, { unread: !receiptOf.get(String(b._id))?.is_read })),
    ...directs.map((d) => toClientNotification(d, { unread: !d.is_read })),
  ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return {
    notifications,
    unreadCount: notifications.filter((n) => n.unread).length,
  };
};

/** Load a notification the user is allowed to act on, or 404. */
const loadForUser = async (notificationId, userId) => {
  if (!mongoose.Types.ObjectId.isValid(notificationId)) throw new AppError("Invalid notification ID", 400);
  const notification = await Notification.findById(notificationId).lean();
  if (!notification) throw new AppError("Notification not found", 404);

  if (!notification.is_broadcast) {
    if (String(notification.recipient_id) !== String(userId)) throw new AppError("Notification not found", 404);
    return notification;
  }
  const user = await User.findById(userId).select("_id campus_id createdAt").lean();
  const eligible =
    user && (await Notification.exists({ _id: notificationId, ...(await getUserBroadcastQuery(user)) }));
  if (!eligible) throw new AppError("Notification not found", 404);
  return notification;
};

const upsertReceipt = (notificationId, userId, set) =>
  NotificationReceipt.updateOne(
    { notification_id: notificationId, user_id: userId },
    { $set: set },
    { upsert: true },
  );

export const markNotificationRead = async (notificationId, userId) => {
  const notification = await loadForUser(notificationId, userId);
  const set = { is_read: true, read_at: new Date() };
  if (notification.is_broadcast) await upsertReceipt(notificationId, userId, set);
  else await Notification.updateOne({ _id: notificationId }, { $set: set });
  return { ok: true };
};

export const markAllNotificationsRead = async (userId) => {
  const readAt = new Date();
  await Notification.updateMany(
    { recipient_id: userId, is_broadcast: false, status: "sent", is_read: false },
    { $set: { is_read: true, read_at: readAt } },
  );

  const user = await User.findById(userId).select("_id campus_id createdAt").lean();
  if (user) {
    const broadcastIds = await Notification.find(await getUserBroadcastQuery(user)).distinct("_id");
    if (broadcastIds.length) {
      await NotificationReceipt.bulkWrite(
        broadcastIds.map((id) => ({
          updateOne: {
            filter: { notification_id: id, user_id: userId },
            update: { $set: { is_read: true, read_at: readAt } },
            upsert: true,
          },
        })),
        { ordered: false },
      );
    }
  }
  return { ok: true };
};

/** Hide a notification from this user's feed (and mark it read). */
export const dismissNotification = async (notificationId, userId) => {
  const notification = await loadForUser(notificationId, userId);
  const set = { is_dismissed: true, is_read: true, read_at: new Date() };
  if (notification.is_broadcast) await upsertReceipt(notificationId, userId, set);
  else await Notification.updateOne({ _id: notificationId }, { $set: set });
  return { ok: true };
};

/**
 * Record a click. stats.clicked counts unique clickers, so click-through
 * can't exceed 100% when someone opens the same notification twice.
 */
export const trackNotificationClick = async (notificationId, userId) => {
  const notification = await loadForUser(notificationId, userId);
  const now = new Date();
  let firstClick = false;

  if (notification.is_broadcast) {
    try {
      const before = await NotificationReceipt.findOneAndUpdate(
        { notification_id: notificationId, user_id: userId },
        { $set: { is_clicked: true, clicked_at: now }, $setOnInsert: { is_read: false, read_at: null } },
        { upsert: true, returnDocument: "before" },
      ).lean();
      firstClick = !before?.is_clicked;
    } catch (error) {
      if (error?.code !== 11000) throw error; // concurrent first click: the other request counted it
    }
  } else {
    const result = await Notification.updateOne({ _id: notificationId, clicked_at: null }, { $set: { clicked_at: now } });
    firstClick = result.modifiedCount === 1;
  }

  if (firstClick) await Notification.updateOne({ _id: notificationId }, { $inc: { "stats.clicked": 1 } });
};

// ==================== ADMIN ====================

// campuses: null (everything) or the campus ids a limited staff member covers.
const campusAudience = (campuses) => (campuses ? { target_audience: "campus", target_campus: { $in: campuses } } : {});

export const getAdminNotificationStats = async ({ campuses = null } = {}) => {
  const [totals, activeUsers] = await Promise.all([
    Notification.aggregate([
      { $match: { is_broadcast: true, status: "sent", ...campusAudience(campuses) } },
      {
        $group: {
          _id: null,
          totalSent: { $sum: "$stats.total_sent" },
          delivered: { $sum: "$stats.delivered" },
          clicked: { $sum: "$stats.clicked" },
        },
      },
    ]),
    getActiveUserCount(),
  ]);

  const { totalSent = 0, delivered = 0, clicked = 0 } = totals[0] || {};
  const pct = (n) => (totalSent > 0 ? Math.round((n / totalSent) * 100) : 0);
  return {
    totalSent,
    delivered,
    deliveredPercent: pct(delivered),
    clicked,
    clickedPercent: pct(clicked),
    activeUsers,
  };
};

export const getAdminNotificationHistory = async ({ page = 1, limit = 20, campuses = null }) => {
  page = Math.min(Math.max(Number.parseInt(page, 10) || 1, 1), 1000);
  limit = Math.min(Math.max(Number.parseInt(limit, 10) || 20, 1), 100);
  const filter = { is_broadcast: true, status: "sent", ...campusAudience(campuses) };
  const [items, total] = await Promise.all([
    Notification.find(filter)
      .populate("target_campus", "name code")
      .populate("sent_by", "name email")
      .sort({ sent_at: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Notification.countDocuments(filter),
  ]);
  return { items, total, page, totalPages: Math.ceil(total / limit) };
};

export const getAdminScheduledNotifications = ({ campuses = null } = {}) =>
  Notification.find({ status: "scheduled", ...campusAudience(campuses) })
    .populate("target_campus", "name code")
    .populate("sent_by", "name email")
    .sort({ scheduled_at: 1 })
    .lean();

export const cancelScheduledNotification = async (notificationId, { campuses = null } = {}) => {
  if (!mongoose.Types.ObjectId.isValid(notificationId)) throw new AppError("Invalid notification ID", 400);
  const notif = await Notification.findOneAndUpdate(
    { _id: notificationId, status: "scheduled", ...campusAudience(campuses) },
    // Cancelled rows age out like sent ones instead of living forever.
    { $set: { status: "cancelled", expires_at: retentionDate() } },
    { returnDocument: "after" },
  );
  if (!notif) throw new AppError("Scheduled notification not found", 404);
  return notif;
};
