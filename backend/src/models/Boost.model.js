import mongoose, { Schema } from "mongoose";

const boostSchema = new Schema(
  {
    product_id: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },
    user_id: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    tier: {
      type: String,
      required: true,
      index: true,
    },
    starts_at: {
      type: Date,
      required: true,
      default: Date.now,
    },
    expires_at: {
      type: Date,
      required: true,
      index: true,
    },
    duration_hours: {
      type: Number,
      required: true,
      min: 1,
    },
    status: {
      type: String,
      enum: ["active", "expired"],
      default: "active",
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

boostSchema.index({ user_id: 1, createdAt: -1 });
boostSchema.index({ product_id: 1, status: 1, expires_at: -1 });
boostSchema.index({ user_id: 1, status: 1, expires_at: -1 });

const Boost = mongoose.model("Boost", boostSchema);

export default Boost;
