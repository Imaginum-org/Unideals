import mongoose from "mongoose";
import { MESSAGE_TYPE, MESSAGE_STATUS } from "../utils/constants.js";

const messageSchema = new mongoose.Schema(
  {
    // Conversation this message belongs to
    conversation_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
      index: true,
    },

    // Sender
    sender_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // Receiver
    receiver_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // Message type
    message_type: {
      type: String,
      enum: Object.values(MESSAGE_TYPE),
      default: MESSAGE_TYPE.TEXT,
      index: true,
    },

    // Text content
    text: {
      type: String,
      trim: true,
      default: "",
    },

    // Reference to deal (for offer/system messages)
    deal_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Deal",
      default: null,
    },

    // Delivery status
    message_status: {
      type: String,
      enum: Object.values(MESSAGE_STATUS),
      default: MESSAGE_STATUS.SENT,
      index: true,
    },

    // Delivered timestamp
    delivered_at: {
      type: Date,
      default: null,
    },

    // Read timestamp
    read_at: {
      type: Date,
      default: null,
    },

    // Future support
    is_edited: {
      type: Boolean,
      default: false,
    },

    edited_at: {
      type: Date,
      default: null,
    },

    // Soft delete support
    deleted_for: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
  },
  {
    timestamps: true,
  },
);

/**
 * Fast message loading inside a conversation
 */
messageSchema.index({
  conversation_id: 1,
  createdAt: 1,
});

/**
 * Fast unread lookup
 */
messageSchema.index({
  receiver_id: 1,
  message_status: 1,
});

const Message = mongoose.model("Message", messageSchema);

export default Message;
