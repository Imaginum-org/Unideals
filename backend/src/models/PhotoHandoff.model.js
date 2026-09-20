import mongoose, { Schema } from "mongoose";

// Ephemeral phone-to-desktop photo handoff session. Created when the
// desktop listing flow shows "Add from phone"; auto-deleted by TTL after
// 15 minutes so abandoned sessions leave zero residue (multi-instance safe,
// unlike in-memory stores).
const photoHandoffSchema = new Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    secretHash: {
      type: String,
      required: true,
      select: false,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    images: {
      type: [
        {
          _id: false,
          url: { type: String, required: true },
          fileId: { type: String, required: true },
          uploadedAt: { type: Date, default: Date.now },
        },
      ],
      default: [],
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

photoHandoffSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const PhotoHandoff = mongoose.model("PhotoHandoff", photoHandoffSchema);

export default PhotoHandoff;
