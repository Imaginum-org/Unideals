import mongoose, { Schema } from "mongoose";
import { PAYMENT_STATUS } from "../config/constants.js";
import { USER_TIER } from "../config/constants.js";
import { BOOST_ADDON } from "../config/boostAddons.js";

// One document per Razorpay order attempt. The verify step atomically
// transitions created -> verified so concurrent retries/double-clicks
// can never activate a tier twice or record two payments for one order.
const paymentSchema = new Schema(
  {
    user_id: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    plan: {
      type: String,
      enum: [USER_TIER.PRO, USER_TIER.PRO_PLUS, BOOST_ADDON.THREE_DAY, BOOST_ADDON.SEVEN_DAY],
      required: true,
      index: true,
    },
    // Target listing for one-time boost add-ons (null for plan purchases).
    product_id: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      default: null,
      index: true,
    },
    subscription_type: {
      type: String,
      required: true,
    },
    amount: {
      type: Number, // paise, from server-side plan catalog (never client input)
      required: true,
      min: 1,
    },
    currency: {
      type: String,
      required: true,
      default: "INR",
    },
    receipt: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    razorpay_order_id: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    razorpay_payment_id: {
      type: String,
      default: undefined,
      // Sparse unique: the field is ABSENT until paid (never stored as null,
      // because MongoDB treats explicit null as an indexed value and would
      // reject the second unpaid order). Each real payment_id is unique.
      // Drives webhook/verify idempotency.
      unique: true,
      sparse: true,
    },
    razorpay_signature: {
      type: String,
      default: null,
      select: false,
    },
    status: {
      type: String,
      enum: Object.values(PAYMENT_STATUS),
      default: PAYMENT_STATUS.CREATED,
      index: true,
    },
    verified_at: {
      type: Date,
      default: null,
    },
    refunded_at: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

paymentSchema.index({ user_id: 1, status: 1, createdAt: -1 });
paymentSchema.index({ user_id: 1, plan: 1, status: 1 });

const Payment = mongoose.model("Payment", paymentSchema);

export default Payment;
