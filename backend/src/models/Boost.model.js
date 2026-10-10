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
    // Quota accounting: false = monthly-quota boost (counts against the
    // plan cap), true = one-time purchased add-on (payment is the
    // entitlement, excluded from quota counts via { isAddon: { $ne: true } }
    // so legacy docs without the field still count as quota).
    isAddon: {
      type: Boolean,
      default: false,
      index: true,
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
