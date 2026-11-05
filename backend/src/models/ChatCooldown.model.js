import mongoose, { Schema } from "mongoose";

/**
 * ChatCooldown — strike counter for the chat safety filter.
 * 7 flagged messages in 24h -> 5 minute send cooldown, then a clean slate.
 * Separate collection (never touches User) and self-resetting, so a cooled
 * user is never permanently muted by automation alone.
 */
const chatCooldownSchema = new Schema(
  {
    user_id: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },

    strikes: {
      type: Number,
      default: 0,
      min: 0,
    },

    window_started_at: {
      type: Date,
      default: Date.now,
    },

    cooldown_until: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

const ChatCooldown = mongoose.model("ChatCooldown", chatCooldownSchema);

export default ChatCooldown;
