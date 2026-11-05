import mongoose, { Schema } from "mongoose";
import { SUBSCRIPTION_STATUS, USER_TIER } from "../config/constants.js";

// One document per user per tier lineage. Founder (lifetime) rows never
// expire; semester rows carry expires_at and are swept by the
// expireSubscriptions job which downgrades to base_user.
const subscriptionSchema = new Schema(
  {
    user_id: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    tier: {
      type: String,
      enum: Object.values(USER_TIER),
      required: true,
      default: USER_TIER.BASE_USER,
    },
    subscription_type: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: Object.values(SUBSCRIPTION_STATUS),
      default: SUBSCRIPTION_STATUS.ACTIVE,
      index: true,
    },
    is_lifetime: {
      type: Boolean,
      default: false,
    },
    started_at: {
      type: Date,
      default: null,
    },
    expires_at: {
      type: Date,
      default: null,
      index: true,
    },
    last_payment_id: {
      type: Schema.Types.ObjectId,
      ref: "Payment",
      default: null,
    },
    cancelled_at: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

subscriptionSchema.index({ status: 1, expires_at: 1 });

const Subscription = mongoose.model("Subscription", subscriptionSchema);

export default Subscription;
