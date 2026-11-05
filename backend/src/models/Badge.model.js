import mongoose, { Schema } from "mongoose";

/**
 * BadgeEvent — audit log for every badge earned by a user.
 * One document per earning event (including tier upgrades).
 */
const badgeEventSchema = new Schema(
  {
    user_id: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    badge_id: {
      type: String,
      required: true,
    },
    tier: {
      type: String,
      enum: ["bronze", "silver", "gold", "special"],
      required: true,
    },
    xp_granted: { type: Number, default: 0 },
    earned_at:  { type: Date,   default: Date.now },
  },
  { timestamps: false },
);

badgeEventSchema.index({ user_id: 1, earned_at: -1 });
const BadgeEvent = mongoose.model("BadgeEvent", badgeEventSchema);
export default BadgeEvent;
