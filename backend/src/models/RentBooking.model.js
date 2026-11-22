import mongoose, { Schema } from "mongoose";
import { RENT_KIND, RENT_MODE, RENT_PRICE_UNITS, RENT_BOOKING_STATUS, RENT_LIMITS } from "../config/rent.js";

// One lend/share between two students, created from a post.
// The post owner always accepts or declines. The lender confirms handover
// and return (they're the one with something at stake).
const rentBookingSchema = new Schema(
  {
    post_id: { type: Schema.Types.ObjectId, ref: "RentPost", required: true, index: true },
    campus_id: { type: Schema.Types.ObjectId, ref: "Campus", required: true },
    kind: { type: String, enum: Object.values(RENT_KIND), required: true },
    mode: { type: String, enum: Object.values(RENT_MODE), required: true },

    owner_id: { type: Schema.Types.ObjectId, ref: "User", required: true }, // post owner (accepts)
    requester_id: { type: Schema.Types.ObjectId, ref: "User", required: true }, // who tapped the button
    lender_id: { type: Schema.Types.ObjectId, ref: "User", required: true },
    borrower_id: { type: Schema.Types.ObjectId, ref: "User", required: true },

    post_snapshot: {
      title: { type: String, required: true },
      image: { type: String, default: null },
      block: { type: String, default: null },
      price: {
        amount: { type: Number, default: 0 },
        unit: { type: String, enum: RENT_PRICE_UNITS, default: "free" },
      },
      deposit: { type: Number, default: 0 },
    },

    quantity: { type: Number, min: 1, max: RENT_LIMITS.maxQuantity, default: 1 },
    // Total the borrower pays the lender offline (estimate shown to both).
    agreed_price: { type: Number, min: 0, default: 0 },
    note: { type: String, trim: true, maxlength: 300, default: "" },
    return_by: { type: Date, default: null },

    // This booking's thread in the main chat inbox (rentChat.service.js).
    conversation_id: { type: Schema.Types.ObjectId, ref: "Conversation", default: null },

    status: {
      type: String,
      enum: Object.values(RENT_BOOKING_STATUS),
      default: RENT_BOOKING_STATUS.PENDING,
    },
    // true while pending/accepted/active — backs the one-open-booking-per-post index.
    is_open: { type: Boolean, default: true },

    accepted_at: { type: Date, default: null },
    handed_over_at: { type: Date, default: null },
    returned_at: { type: Date, default: null },
    completed_at: { type: Date, default: null },
    closed_at: { type: Date, default: null },
    close_reason: { type: String, default: null },
    closed_by: { type: Schema.Types.ObjectId, ref: "User", default: null },
    reminded_overdue_at: { type: Date, default: null },

    messages: {
      type: [
        {
          sender_id: { type: Schema.Types.ObjectId, ref: "User", required: true },
          text: { type: String, required: true, trim: true, maxlength: RENT_LIMITS.messageLength },
          at: { type: Date, default: Date.now },
        },
      ],
      default: [],
    },

    ratings: {
      by_lender: { stars: { type: Number, min: 1, max: 5 }, at: Date },
      by_borrower: { stars: { type: Number, min: 1, max: 5 }, at: Date },
    },
  },
  { timestamps: true, versionKey: false },
);

// One open booking per person per post.
rentBookingSchema.index(
  { post_id: 1, requester_id: 1 },
  { unique: true, partialFilterExpression: { is_open: true }, name: "one_open_booking_per_post" },
);
rentBookingSchema.index({ lender_id: 1, updatedAt: -1 });
rentBookingSchema.index({ borrower_id: 1, updatedAt: -1 });
rentBookingSchema.index({ requester_id: 1, is_open: 1 });
// Sweeps: stale pending, overdue returns.
rentBookingSchema.index({ status: 1, createdAt: 1 });
rentBookingSchema.index({ status: 1, return_by: 1 });

const RentBooking = mongoose.model("RentBooking", rentBookingSchema);

export default RentBooking;
