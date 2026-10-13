import mongoose from "mongoose";
import Notification, { NotificationReceipt } from "../models/Notification.model.js";
import User from "../models/User.model.js";
import Campus from "../models/Campus.model.js";
import Deal from "../models/deal.model.js";
import Product from "../models/Product.model.js";
import { USER_STATUS } from "../config/constants.js";
import {
  emitToAll,
  emitToCampus,
  emitToUser,
  getActiveUserCount,
  getIO,
} from "../utils/socket.js";
import { AppError } from "../utils/appError.js";

/**
 * Estimate recipient count based on target audience and campus filters
 */
export const estimateRecipients = async ({ targetAudience = "all", targetCampus = null }) => {
  if (targetAudience === "campus") {
    if (!targetCampus || !mongoose.Types.ObjectId.isValid(targetCampus)) {
      throw new AppError("A valid campus must be selected for campus targeting", 400);
    }
    return User.countDocuments({
      status: USER_STATUS.ACTIVE,
      campus_id: targetCampus,
    });
  }

  if (targetAudience === "buyers" || targetAudience === "sellers") {
    const ids = targetAudience === "buyers"
      ? await Deal.distinct("buyer_id")
      : await Product.distinct("seller_id");
    return User.countDocuments({
      _id: { $in: ids },
      status: USER_STATUS.ACTIVE,
    });
  }

  if (targetAudience !== "all") {
    throw new AppError("Invalid notification audience", 400);
  }

  return User.countDocuments({ status: USER_STATUS.ACTIVE });
};

/**
 * Dispatches a notification document via Socket.IO
 */
export const dispatchNotificationDocument = async (notification) => {
  const payload = {
    id: String(notification._id),
    _id: String(notification._id),
    title: notification.title,
    message: notification.message,
    description: notification.message,
    type: notification.type,
    image_url: notification.image_url,
    imageUrl: notification.image_url,
    action_url: notification.action_url,
    actionPath: notification.action_url,
    action_label: notification.action_label,
    actionLabel: notification.action_label,
    createdAt: notification.createdAt,
    time: "Just now",
    unread: true,
  };

  const recipientCount = await estimateRecipients({
    targetAudience: notification.target_audience,
    targetCampus: notification.target_campus,
  });

  let targetUserIds = null;
  if (notification.target_audience === "buyers") {
    targetUserIds = await User.find({
      _id: { $in: await Deal.distinct("buyer_id") },
      status: USER_STATUS.ACTIVE,
    }).distinct("_id");
  } else if (notification.target_audience === "sellers") {
    targetUserIds = await User.find({
      _id: { $in: await Product.distinct("seller_id") },
      status: USER_STATUS.ACTIVE,
    }).distinct("_id");
  }

  const io = getIO();
  let delivered = 0;
  if (io) {
    let sockets;
    if (notification.target_audience === "all") {
      sockets = await io.in("broadcast:all").fetchSockets();
    } else if (notification.target_audience === "campus" && notification.target_campus) {
      sockets = await io.in(`campus:${notification.target_campus}`).fetchSockets();
    } else if (targetUserIds?.length) {
      sockets = await io.in(targetUserIds.map((userId) => `user:${userId}`)).fetchSockets();
    } else {
      sockets = [];
    }
    delivered = new Set(sockets.map((socket) => socket.userId).filter(Boolean)).size;
  }

  notification.status = "sent";
  notification.stats = {
    total_sent: recipientCount,
    delivered,
    clicked: notification.stats?.clicked || 0,
  };
  await notification.save();

  if (notification.target_audience === "campus" && notification.target_campus) {
    emitToCampus(notification.target_campus, "notification:new", payload);
  } else if (notification.target_audience === "all") {
    emitToAll("notification:new", payload);
  } else {
    targetUserIds?.forEach((userId) => emitToUser(userId, "notification:new", payload));
  }

  return notification;
};

/**
 * Create a new notification campaign from the admin portal
 */
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
  if (!title?.trim()) throw new AppError("Notification title is required", 400);
  if (!message?.trim()) throw new AppError("Notification message is required", 400);

  let campusId = null;
  if (target_audience === "campus") {
    if (!target_campus || !mongoose.Types.ObjectId.isValid(target_campus)) {
      throw new AppError("A valid campus must be selected for campus targeting", 400);
    }
    campusId = target_campus;
  }

  let scheduledDate = null;
  if (schedule_type === "scheduled") {
    scheduledDate = new Date(scheduled_at);
    if (!scheduled_at || Number.isNaN(scheduledDate.getTime()) || scheduledDate <= new Date()) {
      throw new AppError("Scheduled notifications require a future date and time", 400);
    }
  }
  const isScheduled = schedule_type === "scheduled";

  const notification = new Notification({
    title: title.trim(),
    message: message.trim(),
    type,
    target_audience,
    target_campus: campusId,
    image_url: image_url?.trim() || null,
    action_url: action_url?.trim() || null,
    action_label: action_label?.trim() || "View Offers",
    schedule_type: isScheduled ? "scheduled" : "now",
    scheduled_at: scheduledDate,
    status: isScheduled ? "scheduled" : "draft",
    sent_by,
    is_broadcast: true,
  });

  await notification.save();

  if (!isScheduled) {
    notification.status = "draft";
    await notification.save();
    await dispatchNotificationDocument(notification);
  }

  return notification;
};

/**
 * Dispatches due scheduled notifications (called periodically by node-cron)
 */
export const dispatchDueScheduledNotifications = async () => {
  try {
    const dueList = await Notification.find({
      status: "scheduled",
      scheduled_at: { $lte: new Date() },
    });

    for (const notif of dueList) {
      await dispatchNotificationDocument(notif);
    }
    return dueList.length;
  } catch (error) {
    console.error("Failed to dispatch scheduled notifications:", error);
    return 0;
  }
};

/**
 * Notify a user of a new direct message
 */
export const notifyNewMessage = async ({
  conversationId,
  senderId,
  receiverId,
  senderName,
  textSnippet,
}) => {
  try {
    // If the recipient is currently inside this conversation room, avoid duplicate bell alerts
    const io = getIO();
    if (io) {
      const room = `conversation:${conversationId}`;
      const sockets = await io.in(room).fetchSockets();
      const isRecipientInRoom = sockets.some((s) => String(s.userId) === String(receiverId));
      if (isRecipientInRoom) {
        return null;
      }
    }

    const notification = await Notification.create({
      title: `New message from ${senderName || "User"}`,
      message: textSnippet ? String(textSnippet).slice(0, 150) : "You received a new message",
      type: "message",
      target_audience: "all",
      is_broadcast: false,
      recipient_id: receiverId,
      sent_by: senderId,
      action_url: `/chat?conversationId=${conversationId}`,
      action_label: "Reply in Chat",
      status: "sent",
      is_read: false,
      stats: { total_sent: 1, delivered: 1, clicked: 0 },
    });

    const payload = {
      id: String(notification._id),
      _id: String(notification._id),
      title: notification.title,
      message: notification.message,
      description: notification.message,
      type: "DIRECT MESSAGE",
      actionPath: `/chat?conversationId=${conversationId}`,
      actionLabel: "Reply in Chat",
      action_url: `/chat?conversationId=${conversationId}`,
      action_label: "Reply in Chat",
      createdAt: notification.createdAt,
      time: "Just now",
      unread: true,
    };

    emitToUser(receiverId, "notification:new", payload);
    return notification;
  } catch (error) {
    console.error("Failed to notify new message:", error);
    return null;
  }
};

/**
 * Fetch a user's notification feed with unread counts
 */
export const getUserNotificationFeed = async (userId) => {
  const user = await User.findById(userId).select("campus_id createdAt role").lean();
  if (!user) throw new AppError("User not found", 404);

  // Broadcast criteria
  // Direct notifications criteria
  const directQuery = {
    is_broadcast: false,
    recipient_id: userId,
    status: "sent",
    $or: [
      { is_dismissed: false },
      { is_dismissed: { $exists: false } },
    ],
  };
  const matchedBroadcastQuery = await getUserBroadcastQuery(user);

  const [broadcasts, directNotifications, receipts] = await Promise.all([
    Notification.find(matchedBroadcastQuery).sort({ createdAt: -1 }).limit(50).lean(),
    Notification.find(directQuery).sort({ createdAt: -1 }).limit(50).lean(),
    NotificationReceipt.find({ user_id: userId }).lean(),
  ]);

  const readReceiptMap = new Map();
  receipts.forEach((r) => {
    readReceiptMap.set(String(r.notification_id), r);
  });

  const formattedBroadcasts = broadcasts.map((b) => {
    const receipt = readReceiptMap.get(String(b._id));
    const isRead = Boolean(receipt?.is_read);
    return {
      id: String(b._id),
      _id: String(b._id),
      title: b.title,
      message: b.message,
      description: b.message,
      type: b.type.toUpperCase(),
      imageUrl: b.image_url,
      image_url: b.image_url,
      actionPath: b.action_url || "/deals",
      actionLabel: b.action_label || "View Offers",
      action_url: b.action_url || "/deals",
      action_label: b.action_label || "View Offers",
      time: formatRelativeTime(b.createdAt),
      createdAt: b.createdAt,
      unread: !isRead,
      isBroadcast: true,
    };
  });

  const formattedDirect = directNotifications.map((d) => ({
    id: String(d._id),
    _id: String(d._id),
    title: d.title,
    message: d.message,
    description: d.message,
    type: d.type === "message" ? "DIRECT MESSAGE" : d.type.toUpperCase(),
    imageUrl: d.image_url,
    image_url: d.image_url,
    actionPath: d.action_url || "/chat",
    actionLabel: d.action_label || "View Details",
    action_url: d.action_url || "/chat",
    action_label: d.action_label || "View Details",
    time: formatRelativeTime(d.createdAt),
    createdAt: d.createdAt,
    unread: !d.is_read,
    isBroadcast: false,
  }));

  const combined = [...formattedBroadcasts, ...formattedDirect].sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  );

  const visibleNotifications = combined.filter((notification) => {
    if (!notification.isBroadcast) return true;
    return !readReceiptMap.get(String(notification._id))?.is_dismissed;
  });
  const unreadCount = visibleNotifications.filter((n) => n.unread).length;

  return {
    notifications: visibleNotifications,
    unreadCount,
  };
};

const getUserBroadcastQuery = async (user) => {
  const audiences = [{ target_audience: "all" }];
  if (user.campus_id) {
    audiences.push({
      target_audience: "campus",
      target_campus: user.campus_id,
    });
  }

  const [isBuyer, isSeller] = await Promise.all([
    Deal.exists({ buyer_id: user._id }),
    Product.exists({ seller_id: user._id }),
  ]);
  if (isBuyer) audiences.push({ target_audience: "buyers" });
  if (isSeller) audiences.push({ target_audience: "sellers" });

  return {
    is_broadcast: true,
    status: "sent",
    createdAt: { $gte: new Date(user.createdAt || 0) },
    $or: audiences,
  };
};

/**
 * Mark a single notification as read
 */
export const markNotificationRead = async (notificationId, userId) => {
  if (!mongoose.Types.ObjectId.isValid(notificationId)) {
    throw new AppError("Invalid notification ID", 400);
  }

  const notification = await Notification.findById(notificationId);
  if (!notification) throw new AppError("Notification not found", 404);

  if (!notification.is_broadcast) {
    if (String(notification.recipient_id) !== String(userId)) {
      throw new AppError("Notification not found", 404);
    }
    notification.is_read = true;
    notification.read_at = new Date();
    await notification.save();
  } else {
    const user = await User.findById(userId).select("_id campus_id createdAt").lean();
    if (!user || !(await Notification.exists({
      _id: notificationId,
      ...(await getUserBroadcastQuery(user)),
    }))) {
      throw new AppError("Notification not found", 404);
    }
    await NotificationReceipt.findOneAndUpdate(
      { notification_id: notificationId, user_id: userId },
      { $set: { is_read: true, read_at: new Date() } },
      { upsert: true, new: true }
    );
  }

  return { ok: true };
};

/**
 * Mark all notifications as read for a user
 */
export const markAllNotificationsRead = async (userId) => {
  // Mark direct notifications
  await Notification.updateMany(
    { recipient_id: userId, is_broadcast: false, status: "sent", is_read: false },
    { $set: { is_read: true, read_at: new Date() } }
  );

  // Mark broadcasts by creating receipts
  const user = await User.findById(userId).select("_id campus_id createdAt").lean();
  if (user) {
    const broadcastQuery = await getUserBroadcastQuery(user);
    const broadcasts = await Notification.find(broadcastQuery).select("_id").lean();
    const ops = broadcasts.map((b) => ({
      updateOne: {
        filter: { notification_id: b._id, user_id: userId },
        update: { $set: { is_read: true, read_at: new Date() } },
        upsert: true,
      },
    }));

    if (ops.length > 0) {
      await NotificationReceipt.bulkWrite(ops);
    }
  }

  return { ok: true };
};

/**
 * Dismiss a notification for its intended recipient only
 */
export const dismissNotification = async (notificationId, userId) => {
  if (!mongoose.Types.ObjectId.isValid(notificationId)) {
    throw new AppError("Invalid notification ID", 400);
  }

  const notification = await Notification.findById(notificationId);
  if (!notification) throw new AppError("Notification not found", 404);

  if (!notification.is_broadcast) {
    if (String(notification.recipient_id) !== String(userId)) {
      throw new AppError("Notification not found", 404);
    }
    await Notification.updateOne(
      { _id: notificationId, recipient_id: userId },
      { $set: { is_dismissed: true, is_read: true, read_at: new Date() } },
    );
    return { ok: true };
  }

  const user = await User.findById(userId).select("_id campus_id createdAt").lean();
  if (!user || !(await Notification.exists({
    _id: notificationId,
    ...(await getUserBroadcastQuery(user)),
  }))) {
    throw new AppError("Notification not found", 404);
  }

  await NotificationReceipt.findOneAndUpdate(
    { notification_id: notificationId, user_id: userId },
    {
      $set: { is_dismissed: true, is_read: true, read_at: new Date() },
    },
    { upsert: true, new: true },
  );
  return { ok: true };
};

/**
 * Track notification click
 */
export const trackNotificationClick = async (notificationId, userId) => {
  if (!mongoose.Types.ObjectId.isValid(notificationId)) {
    throw new AppError("Invalid notification ID", 400);
  }

  const notification = await Notification.findById(notificationId).lean();
  if (!notification) throw new AppError("Notification not found", 404);

  if (notification.is_broadcast) {
    const user = await User.findById(userId).select("_id campus_id createdAt").lean();
    if (!user || !(await Notification.exists({
      _id: notificationId,
      ...(await getUserBroadcastQuery(user)),
    }))) {
      throw new AppError("Notification not found", 404);
    }
    await NotificationReceipt.findOneAndUpdate(
      { notification_id: notificationId, user_id: userId },
      {
        $set: { is_clicked: true, clicked_at: new Date() },
        $setOnInsert: { is_read: false, read_at: null },
      },
      { upsert: true },
    );
  } else {
    if (String(notification.recipient_id) !== String(userId)) {
      throw new AppError("Notification not found", 404);
    }
  }

  await Notification.updateOne(
    { _id: notificationId },
    { $inc: { "stats.clicked": 1 } },
  );

  if (!notification.is_broadcast) {
    await NotificationReceipt.findOneAndUpdate(
      { notification_id: notificationId, user_id: userId },
      { $set: { is_clicked: true, clicked_at: new Date() } },
      { upsert: true },
    );
  }
};

/**
 * Fetch analytics and stats for the admin push notifications view
 */
export const getAdminNotificationStats = async () => {
  const [totals, activeCount] = await Promise.all([
    Notification.aggregate([
      { $match: { is_broadcast: true, status: "sent" } },
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

  const stats = totals[0] || { totalSent: 0, delivered: 0, clicked: 0 };
  const deliveredPct = stats.totalSent > 0
    ? Math.round((stats.delivered / stats.totalSent) * 100)
    : 0;
  const clickedPct = stats.totalSent > 0
    ? Math.round((stats.clicked / stats.totalSent) * 100)
    : 0;

  return {
    totalSent: stats.totalSent || 0,
    delivered: stats.delivered || 0,
    deliveredPercent: deliveredPct,
    clicked: stats.clicked || 0,
    clickedPercent: clickedPct,
    activeUsers: activeCount,
  };
};

/**
 * Fetch history of sent notifications
 */
export const getAdminNotificationHistory = async ({ page = 1, limit = 20 }) => {
  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    Notification.find({ is_broadcast: true, status: "sent" })
      .populate("target_campus", "name code")
      .populate("sent_by", "name email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Notification.countDocuments({ is_broadcast: true, status: "sent" }),
  ]);

  return {
    items,
    total,
    page: Number(page),
    totalPages: Math.ceil(total / limit),
  };
};

/**
 * Fetch scheduled notifications
 */
export const getAdminScheduledNotifications = async () => {
  return await Notification.find({ status: "scheduled" })
    .populate("target_campus", "name code")
    .populate("sent_by", "name email")
    .sort({ scheduled_at: 1 })
    .lean();
};

/**
 * Cancel a scheduled notification
 */
export const cancelScheduledNotification = async (notificationId) => {
  if (!mongoose.Types.ObjectId.isValid(notificationId)) {
    throw new AppError("Invalid notification ID", 400);
  }
  const notif = await Notification.findOneAndUpdate(
    { _id: notificationId, status: "scheduled" },
    { $set: { status: "cancelled" } },
    { new: true }
  );
  if (!notif) throw new AppError("Scheduled notification not found", 404);
  return notif;
};

/**
 * Notify seller when a buyer makes a new offer
 */
export const notifyNewOffer = async ({
  conversationId,
  buyerId,
  buyerName,
  amount,
  productTitle,
  sellerId,
}) => {
  try {
    const inr = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;
    const notification = await Notification.create({
      title: "New Offer Received!",
      message: `${buyerName || "A buyer"} offered ${inr(amount)} for "${productTitle || "your item"}".`,
      type: "order",
      target_audience: "all",
      is_broadcast: false,
      recipient_id: sellerId,
      sent_by: buyerId,
      action_url: `/chat?conversationId=${conversationId}`,
      action_label: "View Offer",
      status: "sent",
      is_read: false,
      stats: { total_sent: 1, delivered: 1, clicked: 0 },
    });
    emitToUser(sellerId, "notification:new", {
      id: String(notification._id),
      _id: String(notification._id),
      title: notification.title,
      message: notification.message,
      description: notification.message,
      type: "ORDER UPDATE",
      actionPath: `/chat?conversationId=${conversationId}`,
      actionLabel: "View Offer",
      action_url: `/chat?conversationId=${conversationId}`,
      action_label: "View Offer",
      createdAt: notification.createdAt,
      time: "Just now",
      unread: true,
    });
    return notification;
  } catch (error) {
    console.error("Failed to notify new offer:", error);
    return null;
  }
};

/**
 * Notify buyer when their offer is accepted / deal is confirmed
 */
export const notifyOfferAccepted = async ({
  conversationId,
  sellerName,
  productTitle,
  amount,
  buyerId,
}) => {
  try {
    const inr = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;
    const notification = await Notification.create({
      title: "Offer Accepted! 🎉",
      message: `${sellerName || "The seller"} accepted your offer of ${inr(amount)} for "${productTitle || "the item"}". Schedule pickup now.`,
      type: "order",
      target_audience: "all",
      is_broadcast: false,
      recipient_id: buyerId,
      action_url: `/myorders`,
      action_label: "View Deal",
      status: "sent",
      is_read: false,
      stats: { total_sent: 1, delivered: 1, clicked: 0 },
    });
    emitToUser(buyerId, "notification:new", {
      id: String(notification._id),
      _id: String(notification._id),
      title: notification.title,
      message: notification.message,
      description: notification.message,
      type: "ORDER UPDATE",
      actionPath: `/myorders`,
      actionLabel: "View Deal",
      action_url: `/myorders`,
      action_label: "View Deal",
      createdAt: notification.createdAt,
      time: "Just now",
      unread: true,
    });
    return notification;
  } catch (error) {
    console.error("Failed to notify offer accepted:", error);
    return null;
  }
};

/**
 * Notify counterparty when pickup is scheduled
 */
export const notifyPickupScheduled = async ({
  conversationId,
  location,
  scheduledDate,
  recipientId,
}) => {
  try {
    const dateLabel = scheduledDate
      ? new Date(scheduledDate).toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })
      : "a scheduled date";
    const notification = await Notification.create({
      title: "Pickup Spot Confirmed 📍",
      message: `Meeting scheduled at "${location || "a spot"}" on ${dateLabel}.`,
      type: "order",
      target_audience: "all",
      is_broadcast: false,
      recipient_id: recipientId,
      action_url: `/myorders`,
      action_label: "View Pickup",
      status: "sent",
      is_read: false,
      stats: { total_sent: 1, delivered: 1, clicked: 0 },
    });
    emitToUser(recipientId, "notification:new", {
      id: String(notification._id),
      _id: String(notification._id),
      title: notification.title,
      message: notification.message,
      description: notification.message,
      type: "ORDER UPDATE",
      actionPath: `/myorders`,
      actionLabel: "View Pickup",
      action_url: `/myorders`,
      action_label: "View Pickup",
      createdAt: notification.createdAt,
      time: "Just now",
      unread: true,
    });
    return notification;
  } catch (error) {
    console.error("Failed to notify pickup scheduled:", error);
    return null;
  }
};

/**
 * Notify seller when buyer confirms item received (deal completed)
 */
export const notifyDealCompleted = async ({
  conversationId,
  buyerName,
  productTitle,
  sellerId,
}) => {
  try {
    const notification = await Notification.create({
      title: "Deal Completed Successfully 🎉",
      message: `${buyerName || "The buyer"} confirmed receiving "${productTitle || "the item"}". Payment balance updated.`,
      type: "order",
      target_audience: "all",
      is_broadcast: false,
      recipient_id: sellerId,
      action_url: `/myorders`,
      action_label: "View Order Details",
      status: "sent",
      is_read: false,
      stats: { total_sent: 1, delivered: 1, clicked: 0 },
    });
    emitToUser(sellerId, "notification:new", {
      id: String(notification._id),
      _id: String(notification._id),
      title: notification.title,
      message: notification.message,
      description: notification.message,
      type: "ORDER UPDATE",
      actionPath: `/myorders`,
      actionLabel: "View Order Details",
      action_url: `/myorders`,
      action_label: "View Order Details",
      createdAt: notification.createdAt,
      time: "Just now",
      unread: true,
    });
    return notification;
  } catch (error) {
    console.error("Failed to notify deal completed:", error);
    return null;
  }
};

/**
 * Notify counterparty when a deal is cancelled
 */
export const notifyDealCancelled = async ({
  conversationId,
  productTitle,
  cancellerName,
  recipientId,
}) => {
  try {
    const notification = await Notification.create({
      title: "Deal Cancelled",
      message: `Deal for "${productTitle || "the item"}" was cancelled by ${cancellerName || "the other party"}.`,
      type: "order",
      target_audience: "all",
      is_broadcast: false,
      recipient_id: recipientId,
      action_url: `/myorders`,
      action_label: "View Details",
      status: "sent",
      is_read: false,
      stats: { total_sent: 1, delivered: 1, clicked: 0 },
    });
    emitToUser(recipientId, "notification:new", {
      id: String(notification._id),
      _id: String(notification._id),
      title: notification.title,
      message: notification.message,
      description: notification.message,
      type: "ORDER UPDATE",
      actionPath: `/myorders`,
      actionLabel: "View Details",
      action_url: `/myorders`,
      action_label: "View Details",
      createdAt: notification.createdAt,
      time: "Just now",
      unread: true,
    });
    return notification;
  } catch (error) {
    console.error("Failed to notify deal cancelled:", error);
    return null;
  }
};

/**
 * Fan-out price drop alerts to all users who have the product in their wishlist
 */
export const notifyPriceDrop = async ({
  productId,
  productTitle,
  oldPrice,
  newPrice,
}) => {
  try {
    const inr = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;
    const diff = Number(oldPrice) - Number(newPrice);
    if (diff <= 0) return null; // Only notify on actual price drop

    // Find all users who have this product in their wishlist
    const wishlistUsers = await User.find({ wishlist: productId })
      .select("_id")
      .lean();
    if (!wishlistUsers.length) return null;

    const message = `"${productTitle || "An item"}" on your wishlist dropped by ${inr(diff)}! Now at ${inr(newPrice)}. Grab it before it sells out!`;

    // Create individual direct notifications (not a broadcast) for each wishlist user
    const ops = wishlistUsers.map((u) => ({
      title: "Price Drop Alert! 🔥",
      message,
      type: "promotion",
      target_audience: "all",
      is_broadcast: false,
      recipient_id: u._id,
      action_url: `/product/${productId}`,
      action_label: "Buy Now",
      status: "sent",
      is_read: false,
      stats: { total_sent: 1, delivered: 1, clicked: 0 },
    }));

    const notifications = await Notification.insertMany(ops, { ordered: true });
    const notificationByRecipient = new Map(
      notifications.map((notification) => [
        String(notification.recipient_id),
        notification,
      ]),
    );

    // Push live to each wishlist holder
    for (const u of wishlistUsers) {
      const notification = notificationByRecipient.get(String(u._id));
      if (!notification) continue;
      emitToUser(u._id, "notification:new", {
        id: String(notification._id),
        _id: String(notification._id),
        title: notification.title,
        message: notification.message,
        description: notification.message,
        type: "OFFER / PROMO",
        actionPath: notification.action_url,
        actionLabel: notification.action_label,
        action_url: notification.action_url,
        action_label: notification.action_label,
        createdAt: notification.createdAt,
        time: "Just now",
        unread: true,
      });
    }

    return notifications;
  } catch (error) {
    console.error("Failed to notify price drop:", error);
    return null;
  }
};

/**
 * Notify seller when their listing is flagged/actioned by moderation
 */
export const notifyModerationWarning = async ({
  productId,
  productTitle,
  sellerId,
  adminNote = null,
}) => {
  try {
    const message = adminNote
      ? `Your listing "${productTitle || "a product"}" has been flagged: ${adminNote}`
      : `Your listing "${productTitle || "a product"}" has been flagged for moderation review. Please review our guidelines.`;

    const notification = await Notification.create({
      title: "Listing Under Review ⚠️",
      message,
      type: "general",
      target_audience: "all",
      is_broadcast: false,
      recipient_id: sellerId,
      action_url: `/productlisted`,
      action_label: "Review Guidelines",
      status: "sent",
      is_read: false,
      stats: { total_sent: 1, delivered: 1, clicked: 0 },
    });
    emitToUser(sellerId, "notification:new", {
      id: String(notification._id),
      _id: String(notification._id),
      title: notification.title,
      message: notification.message,
      description: notification.message,
      type: "GENERAL",
      actionPath: `/productlisted`,
      actionLabel: "Review Guidelines",
      action_url: `/productlisted`,
      action_label: "Review Guidelines",
      createdAt: notification.createdAt,
      time: "Just now",
      unread: true,
    });
    return notification;
  } catch (error) {
    console.error("Failed to notify moderation warning:", error);
    return null;
  }
};

/**
 * Notify user when their role is updated (e.g., promoted to support)
 */
export const notifyRoleAssigned = async ({ userId, newRole }) => {
  try {
    const roleLabel =
      newRole === "support" ? "Support Staff" : newRole.charAt(0).toUpperCase() + newRole.slice(1);
    const notification = await Notification.create({
      title: "Staff Role Updated",
      message: `You have been granted ${roleLabel} permissions on UniDeals Admin Portal.`,
      type: "general",
      target_audience: "all",
      is_broadcast: false,
      recipient_id: userId,
      action_url: `/profile`,
      action_label: "View Profile",
      status: "sent",
      is_read: false,
      stats: { total_sent: 1, delivered: 1, clicked: 0 },
    });
    emitToUser(userId, "notification:new", {
      id: String(notification._id),
      _id: String(notification._id),
      title: notification.title,
      message: notification.message,
      description: notification.message,
      type: "GENERAL",
      actionPath: `/profile`,
      actionLabel: "View Profile",
      action_url: `/profile`,
      action_label: "View Profile",
      createdAt: notification.createdAt,
      time: "Just now",
      unread: true,
    });
    return notification;
  } catch (error) {
    console.error("Failed to notify role assigned:", error);
    return null;
  }
};

// Helper function for human-readable relative time
const formatRelativeTime = (date) => {
  if (!date) return "Just now";
  const diffSec = Math.floor((new Date() - new Date(date)) / 1000);
  if (diffSec < 60) return "Just now";
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  if (diffSec < 172800) return "Yesterday";
  return `${Math.floor(diffSec / 86400)}d ago`;
};
