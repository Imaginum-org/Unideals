import mongoose, { Schema } from "mongoose";

// One FCM registration token per browser / app install. A token belongs to
// whoever registered it last, so a shared laptop that switches accounts
// stops receiving the previous user's notifications.
const deviceTokenSchema = new Schema(
  {
    token: { type: String, required: true, unique: true, trim: true, maxlength: 4096 },
    user_id: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    platform: { type: String, enum: ["web", "android", "ios"], required: true },
    user_agent: { type: String, default: null, maxlength: 300 },
    last_seen_at: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

// FCM tokens go stale after ~270 days without the app/site being opened;
// drop ours a bit earlier. Re-registration on every visit refreshes it.
deviceTokenSchema.index({ last_seen_at: 1 }, { expireAfterSeconds: 240 * 24 * 60 * 60 });

const DeviceToken = mongoose.model("DeviceToken", deviceTokenSchema);
export default DeviceToken;
