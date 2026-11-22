import mongoose from "mongoose";

/**
 * One signed-in device/browser. Refresh tokens carry this document's id
 * (`sid`) and only a SHA-256 hash of the current token is stored, never the
 * token itself. Each device rotates independently, so signing in on a
 * phone no longer signs the laptop out (the old single-token design kept
 * one refresh token per user).
 *
 * Global revocation (password reset, suspend, delete) still works through
 * User.tokenVersion, which every refresh checks. Expired sessions remove
 * themselves via the TTL index.
 */
const authSessionSchema = new mongoose.Schema(
  {
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    token_hash: { type: String, required: true },
    // Previous token, honoured for a few seconds after rotation so parallel
    // refreshes (two tabs, retries) converge instead of failing.
    prev_hash: { type: String, default: null },
    prev_expires_at: { type: Date, default: null },
    expires_at: { type: Date, required: true },
    last_used_at: { type: Date, default: Date.now },
    user_agent: { type: String, default: "", maxlength: 200 },
  },
  { timestamps: { createdAt: "created_at", updatedAt: false }, versionKey: false },
);

// Mongo deletes the session once expires_at passes.
authSessionSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 });
// Per-user listing / "keep the newest N" cap.
authSessionSchema.index({ user_id: 1, last_used_at: -1 });

const AuthSession = mongoose.model("AuthSession", authSessionSchema);
export default AuthSession;
