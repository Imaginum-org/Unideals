import mongoose, { Schema } from "mongoose";
import {
  RENT_KIND,
  RENT_MODE,
  RENT_PRICE_UNITS,
  RENT_CATEGORIES,
  RENT_CONDITIONS,
  RENT_POST_STATUS,
  RENT_LIMITS,
} from "../config/rent.js";

// One "I have it" offer or "I need it" request on the Rent & Borrow board.
// Separate from Product on purpose: marketplace code never sees these.
const rentPostSchema = new Schema(
  {
    owner_id: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    // Copied from the owner, never from the client.
    campus_id: { type: Schema.Types.ObjectId, ref: "Campus", required: true },

    kind: { type: String, enum: Object.values(RENT_KIND), required: true },
    mode: { type: String, enum: Object.values(RENT_MODE), required: true },

    title: { type: String, required: true, trim: true, minlength: 3, maxlength: 80 },
    description: { type: String, trim: true, maxlength: 500, default: "" },
    category: { type: String, enum: RENT_CATEGORIES, required: true },

    images: {
      type: [
        {
          _id: false,
          url: { type: String, required: true },
          fileId: { type: String, default: null },
        },
      ],
      default: [],
      validate: [(v) => v.length <= 3, "At most 3 photos"],
    },

    // For an offer: what it costs. For a request: what the poster will pay.
    price: {
      amount: { type: Number, min: 0, max: RENT_LIMITS.maxPrice, default: 0 },
      unit: { type: String, enum: RENT_PRICE_UNITS, default: "free" },
    },
    // Refundable deposit, collected offline. 0 = none.
    deposit: { type: Number, min: 0, max: RENT_LIMITS.maxDeposit, default: 0 },
    // Share offers only (e.g. 5 packets). Lend items are single.
    quantity: { type: Number, min: 0, max: RENT_LIMITS.maxQuantity, default: 1 },

    block: { type: String, trim: true, maxlength: RENT_LIMITS.blockLength, default: null },

    // Requests only: when the poster stops needing it.
    needed_by: { type: Date, default: null },

    // Offers only (all optional). Condition of the item; the last day it can
    // be booked (the sweep expires it after that).
    condition: { type: String, enum: [...RENT_CONDITIONS, null], default: null },
    available_until: { type: Date, default: null },

    // Where and how the two meet. Public text, screened like the title.
    handover: {
      spot: { type: String, trim: true, maxlength: RENT_LIMITS.handoverSpotLength, default: "" },
      timing: { type: String, trim: true, maxlength: RENT_LIMITS.handoverTimingLength, default: "" },
      // Lend offers only.
      return_policy: { type: String, trim: true, maxlength: RENT_LIMITS.returnPolicyLength, default: "" },
      notes: { type: String, trim: true, maxlength: RENT_LIMITS.handoverNotesLength, default: "" },
    },

    status: {
      type: String,
      enum: Object.values(RENT_POST_STATUS),
      default: RENT_POST_STATUS.ACTIVE,
    },
    // Lend offer that is out: when it should be back.
    lent_until: { type: Date, default: null },

    reports: {
      type: [
        {
          _id: false,
          user_id: { type: Schema.Types.ObjectId, ref: "User", required: true },
          reason: { type: String, trim: true, maxlength: 200, default: "" },
          at: { type: Date, default: Date.now },
        },
      ],
      default: [],
    },
    report_count: { type: Number, default: 0 },
    // Where to go back to when staff restore a hidden post.
    hidden_from_status: { type: String, default: null },
    hidden_reason: { type: String, default: null },
  },
  { timestamps: true, versionKey: false },
);

rentPostSchema.index({ campus_id: 1, kind: 1, status: 1, createdAt: -1 });
rentPostSchema.index({ campus_id: 1, kind: 1, status: 1, block: 1, createdAt: -1 });
rentPostSchema.index({ owner_id: 1, status: 1, createdAt: -1 });
// Expiry sweep for requests.
rentPostSchema.index({ kind: 1, status: 1, needed_by: 1 });
// Expiry sweep for offers with an end date.
rentPostSchema.index({ kind: 1, status: 1, available_until: 1 });
// Staff queue: reported first.
rentPostSchema.index({ campus_id: 1, report_count: -1, createdAt: -1 });

const RentPost = mongoose.model("RentPost", rentPostSchema);

export default RentPost;
