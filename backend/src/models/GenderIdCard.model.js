import mongoose, { Schema } from "mongoose";

// College ID photo attached to a pending gender-change request.
//
// Kept in its own collection (never on the CDN) so it is never publicly
// reachable and deleting it is a real delete: no CDN copies, no cached
// transformations. Only staff with genderRequests access can stream it.
//
// Deleted when the request is approved, rejected or cancelled, when a new
// photo replaces it, and with the account. The TTL is a safety net for
// requests nobody reviews: the photo is erased after ID_CARD_RETENTION_DAYS
// and the user is asked to send it again.
export const ID_CARD_RETENTION_DAYS = 30;
export const ID_CARD_MAX_BYTES = 5 * 1024 * 1024;

const genderIdCardSchema = new Schema(
  {
    user_id: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    data: { type: Buffer, required: true },
    mimetype: { type: String, enum: ["image/jpeg", "image/png", "image/webp"], required: true },
    size: { type: Number, required: true, max: ID_CARD_MAX_BYTES },
    created_at: { type: Date, default: Date.now },
  },
  { versionKey: false },
);

genderIdCardSchema.index({ created_at: 1 }, { expireAfterSeconds: ID_CARD_RETENTION_DAYS * 24 * 60 * 60 });

const GenderIdCard = mongoose.model("GenderIdCard", genderIdCardSchema);
export default GenderIdCard;
