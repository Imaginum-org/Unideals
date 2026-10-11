import mongoose, { Schema } from "mongoose";

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
      enum: ["general", "promotion", "order", "announcement", "message"],
      default: "general",
      index: true,
    },
    target_audience: {
      type: String,
      enum: ["all", "buyers", "sellers", "campus"],
      default: "all",
      index: true,
    },
    target_campus: {
      type: Schema.Types.ObjectId,
      ref: "Campus",
      default: null,
      index: true,
    },
    image_url: {
      type: String,
      default: null,
      trim: true,
    },
    action_url: {
      type: String,
      default: null,
      trim: true,
    },
    action_label: {
      type: String,
      default: "View",
      trim: true,
    },
    schedule_type: {
      type: String,
      enum: ["now", "scheduled"],
      default: "now",
    },
    scheduled_at: {
      type: Date,
      default: null,
      index: true,
    },
    status: {
      type: String,
      enum: ["draft", "scheduled", "sent", "cancelled"],
      default: "sent",
      index: true,
    },
    sent_by: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    is_broadcast: {
      type: Boolean,
      default: true,
      index: true,
    },
    recipient_id: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    is_read: {
      type: Boolean,
      default: false,
    },
    read_at: {
      type: Date,
      default: null,
    },
    stats: {
      total_sent: { type: Number, default: 0 },
      delivered: { type: Number, default: 0 },
      clicked: { type: Number, default: 0 },
    },
  },
  {
    timestamps: true,
  }
);

// Read receipt schema to track individual user reads/clicks on broadcast notifications
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
    is_read: {
      type: Boolean,
      default: true,
    },
    read_at: {
      type: Date,
      default: Date.now,
    },
    is_clicked: {
      type: Boolean,
      default: false,
    },
    clicked_at: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

notificationReceiptSchema.index(
  { notification_id: 1, user_id: 1 },
  { unique: true }
);

export const NotificationReceipt = mongoose.model(
  "NotificationReceipt",
  notificationReceiptSchema
);

const Notification = mongoose.model("Notification", notificationSchema);
export default Notification;
