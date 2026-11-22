import mongoose, { Schema } from "mongoose";
import { RENT_LIMITS } from "../config/rent.js";

// Per-student Rent & Borrow settings and track record. Kept out of User so
// the feature can be removed by dropping its own collections.
const rentProfileSchema = new Schema(
  {
    user_id: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    campus_id: { type: Schema.Types.ObjectId, ref: "Campus", required: true },
    block: { type: String, trim: true, maxlength: RENT_LIMITS.blockLength, default: null },
    // "Someone in my block needs something" alerts.
    alerts: { type: Boolean, default: true },
    stats: {
      lent: { type: Number, default: 0 },
      shared: { type: Number, default: 0 },
      borrowed: { type: Number, default: 0 },
      earned_total: { type: Number, default: 0 }, // ₹, agreed offline
      rating_sum: { type: Number, default: 0 },
      rating_count: { type: Number, default: 0 },
    },
  },
  { timestamps: true, versionKey: false },
);

// Alert fan-out: same campus + block, alerts on.
rentProfileSchema.index({ campus_id: 1, block: 1, alerts: 1 });

const RentProfile = mongoose.model("RentProfile", rentProfileSchema);

export default RentProfile;
