import mongoose from "mongoose";
import { MESSAGE_TYPE, MESSAGE_STATUS } from "../config/constants.js";

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

    // Voice note (message_type "audio"). The file is on ImageKit in the
    // sender's own folder; url comes from ImageKit's record, never the client.
    audio: {
      type: new mongoose.Schema(
        {
          url: { type: String, required: true },
          file_id: { type: String, required: true },
          duration_ms: { type: Number, required: true },
          mime: { type: String, default: "" },
          size: { type: Number, default: 0 },
          peaks: { type: [Number], default: [] },
        },
        { _id: false },
      ),
      default: undefined,
    },

    // Chat photo (message_type "image"), stored on Cloudinary. public_id +
    // version were verified against Cloudinary's signed upload response.
    image: {
      type: new mongoose.Schema(
        {
          url: { type: String, required: true },
          public_id: { type: String, required: true },
          version: { type: Number, required: true },
          width: { type: Number, default: 0 },
          height: { type: Number, default: 0 },
        },
        { _id: false },
      ),
      default: undefined,
    },

    // Reactions: at most one per participant (a chat has two), so this
    // array never holds more than 2 tiny entries. Set/cleared atomically.
    reactions: {
      type: [
        new mongoose.Schema(
          {
            user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
            emoji: { type: String, required: true },
          },
          { _id: false },
        ),
      ],
      default: undefined,
    },

    // Reference to deal (for offer/system messages)
    deal_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Deal",
      default: null,
    },

    // Quote-reply target. Must live in the same conversation (enforced on
    // send); resolved live on read so later masking still applies.
    reply_to: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
      default: null,
      index: true,
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

    // Safety screen: abusive/sexual content is masked for clients but
    // kept verbatim for moderator review. Never client-settable.
    is_flagged: {
      type: Boolean,
      default: false,
      index: true,
    },

    flag_reason: {
      type: String,
      trim: true,
      default: "",
    },

    flagged_at: {
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
 * Thread pages: getMessages filters by conversation and pages on _id
 * (newest first, `before` cursor). Without this index every fetch sorted
 * the whole conversation in memory.
 */
messageSchema.index({ conversation_id: 1, _id: -1 });

/**
 * Fast unread lookup
 */
messageSchema.index({
  receiver_id: 1,
  message_status: 1,
});

// One upload = one message (blocks replaying a fileId), and lets the orphan
// sweep check "is this file used?" with an index hit.
messageSchema.index(
  { "audio.file_id": 1 },
  { unique: true, partialFilterExpression: { "audio.file_id": { $exists: true } } },
);

// One upload = one message; also the "is this photo used?" lookup for the sweep.
messageSchema.index(
  { "image.public_id": 1 },
  { unique: true, partialFilterExpression: { "image.public_id": { $exists: true } } },
);

const Message = mongoose.model("Message", messageSchema);

export default Message;
