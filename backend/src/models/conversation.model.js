import mongoose from "mongoose";
import { MESSAGE_TYPE } from "../utils/constants.js";

const conversationSchema = new mongoose.Schema(
  {
    // Product this conversation belongs to
    product_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },

    // Seller of the product
    seller_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // Buyer who started the conversation
    buyer_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // Last message preview (for conversation list)
    last_message: {
      type: String,
      default: "",
      trim: true,
    },

    // Last message type
    last_message_type: {
      type: String,
      enum: Object.values(MESSAGE_TYPE),
      default: MESSAGE_TYPE.TEXT,
    },

    // Who sent the last message
    last_message_sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    // Used for sorting conversation list
    last_activity_at: {
      type: Date,
      default: Date.now,
      index: true,
    },

    product_snapshot: {
      title: {
        type: String,
        required: true,
      },

      image: {
        type: String,
        default: "",
      },

      selling_price: {
        type: Number,
        required: true,
      },
    },

    // Unread counts
    unread_count: {
      buyer: {
        type: Number,
        default: 0,
        min: 0,
      },
      seller: {
        type: Number,
        default: 0,
        min: 0,
      },
    },

    // Soft delete (future feature)
    deleted_for: {
      buyer: {
        type: Boolean,
        default: false,
      },
      seller: {
        type: Boolean,
        default: false,
      },
    },

    // Conversation status
    is_active: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

/**
 * One Buyer + One Seller + One Product = One Conversation
 */
conversationSchema.index(
  {
    buyer_id: 1,
    seller_id: 1,
    product_id: 1,
  },
  {
    unique: true,
  }
);

/**
 * Fast sorting for chat list
 */
conversationSchema.index({
  last_activity_at: -1,
});

const Conversation = mongoose.model("Conversation", conversationSchema);

export default Conversation;
