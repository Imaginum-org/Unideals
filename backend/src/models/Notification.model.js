import mongoose, { Schema } from "mongoose";

// How long a delivered notification stays in feeds before MongoDB's TTL
// monitor removes it. Measured from send time (expires_at), NOT createdAt:
// a campaign scheduled 6 weeks out must not be swept before it is sent.
export const NOTIFICATION_RETENTION_DAYS = 30;
export const retentionDate = (from = new Date()) =>
  new Date(from.getTime() + NOTIFICATION_RETENTION_DAYS * 24 * 60 * 60 * 1000);

// Admin campaigns may only use the first five; the rest are system events.
export const CAMPAIGN_TYPES = ["general", "promotion", "order", "announcement", "message"];
export const NOTIFICATION_TYPES = [...CAMPAIGN_TYPES, "price_drop", "moderation"];
export const NOTIFICATION_AUDIENCES = ["all", "buyers", "sellers", "campus"];

// draft -> (scheduled ->) sending -> sent | failed ; scheduled -> cancelled
export const NOTIFICATION_STATUSES = ["draft", "scheduled", "sending", "sent", "failed", "cancelled"];

const notificationSchema = new Schema(
  {
    title: {
      type: String,
      required: [true, "Notification title is required"],
      trim: true,
      maxlength: [100, "Title cannot exceed 100 characters"],
    },
    message: {
      type: String,
      required: [true, "Notification message is required"],
      trim: true,
      maxlength: [500, "Message cannot exceed 500 characters"],
    },
    type: {
      type: String,
      enum: NOTIFICATION_TYPES,
      default: "general",
      index: true,
    },
    target_audience: {
      type: String,
      enum: NOTIFICATION_AUDIENCES,
      default: "all",
      index: true,
    },
    target_campus: {
      type: Schema.Types.ObjectId,
      ref: "Campus",
      default: null,
      index: true,
    },
    image_url: { type: String, default: null, trim: true },
    action_url: { type: String, default: null, trim: true },
    action_label: { type: String, default: "View", trim: true },
    schedule_type: {
      type: String,
      enum: ["now", "scheduled"],
      default: "now",
    },
    scheduled_at: { type: Date, default: null, index: true },
    status: {
      type: String,
      enum: NOTIFICATION_STATUSES,
      default: "sent",
      index: true,
    },
    // When the notification actually went out. Feeds sort and show time by
    // this (a scheduled campaign's createdAt is when the admin wrote it).
    sent_at: { type: Date, default: null },
    // TTL anchor. null = never expires (drafts, pending schedules).
    expires_at: { type: Date, default: null },
    failure_reason: { type: String, default: null },
    sent_by: { type: Schema.Types.ObjectId, ref: "User", default: null },
    is_broadcast: { type: Boolean, default: true, index: true },
    recipient_id: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    // Direct notifications that collapse into one feed row while unread
    // (e.g. "3 new messages from Rahul"). null = never grouped.
    group_key: { type: String, default: null },
    group_count: { type: Number, default: 1 },
    is_read: { type: Boolean, default: false },
    is_dismissed: { type: Boolean, default: false },
    read_at: { type: Date, default: null },
    // First click on a direct notification (broadcast clicks live on receipts).
    clicked_at: { type: Date, default: null },
    stats: {
      total_sent: { type: Number, default: 0 },
      delivered: { type: Number, default: 0 }, // recipients online at send time
      clicked: { type: Number, default: 0 }, // unique clickers
    },
  },
  { timestamps: true },
);

notificationSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 });
// Personal feed: direct rows for one user, newest first.
notificationSchema.index({ recipient_id: 1, is_broadcast: 1, status: 1, sent_at: -1 });
// Message grouping lookup.
notificationSchema.index(
  { recipient_id: 1, group_key: 1, is_read: 1 },
  { partialFilterExpression: { group_key: { $type: "string" } } },
);
// Broadcast feed / admin history.
notificationSchema.index({ is_broadcast: 1, status: 1, target_audience: 1, sent_at: -1 });

// Per-user read / dismiss / click state for broadcast notifications, so one
// campaign is one document no matter how many users it reaches.
const notificationReceiptSchema = new Schema(
  {
    notification_id: {
      type: Schema.Types.ObjectId,
      ref: "Notification",
      required: true,
      index: true,
    },
    user_id: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    is_read: { type: Boolean, default: true },
    is_dismissed: { type: Boolean, default: false },
    read_at: { type: Date, default: Date.now },
    is_clicked: { type: Boolean, default: false },
    clicked_at: { type: Date, default: null },
  },
  { timestamps: true },
);

notificationReceiptSchema.index({ notification_id: 1, user_id: 1 }, { unique: true });
// Receipts outlive their notification by at most the retention window.
notificationReceiptSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: NOTIFICATION_RETENTION_DAYS * 24 * 60 * 60 },
);

export const NotificationReceipt = mongoose.model("NotificationReceipt", notificationReceiptSchema);

const Notification = mongoose.model("Notification", notificationSchema);
export default Notification;
