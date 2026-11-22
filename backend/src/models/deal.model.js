import mongoose from "mongoose";
import {
  DEAL_STATUS,
  OFFER_STATUS,
  CONVERSATION_ROLE,
} from "../config/constants.js";

function stripSecrets(ret) {
  if (ret?.handover) {
    const { nonce, ...rest } = ret.handover;
    ret.handover = { ...rest, issued: Boolean(nonce) };
  }
  return ret;
}

const dealSchema = new mongoose.Schema(
  {
    // One conversation has one deal lifecycle
    conversation_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
      unique: true,
      index: true,
    },

    // Original product price
    original_price: {
      type: Number,
      required: true,
      min: 0,
    },

    // Current agreed price
    current_price: {
      type: Number,
      required: true,
      min: 0,
    },

    // Offer history
    offer_history: [
      {
        amount: {
          type: Number,
          required: true,
          min: 0,
        },

        offered_by: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },

        offered_by_role: {
          type: String,
          enum: Object.values(CONVERSATION_ROLE),
          required: true,
        },

        message_id: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Message",
          default: null,
        },

        status: {
          type: String,
          enum: Object.values(OFFER_STATUS),
          default: OFFER_STATUS.PENDING,
        },

        response_by: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          default: null,
        },

        responded_at: {
          type: Date,
          default: null,
        },

        created_at: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // Current offer status
    offer_status: {
      type: String,
      enum: Object.values(OFFER_STATUS),
      default: OFFER_STATUS.PENDING,
    },

    // Transaction status (indexed via dealSchema.index below)
    status: {
      type: String,
      enum: Object.values(DEAL_STATUS),
      default: DEAL_STATUS.NEGOTIATING,
    },

    // Seller confirmed deal
    deal_confirmed_at: {
      type: Date,
      default: null,
    },

    reserved_at: {
      type: Date,
      default: null,
    },

    // Pickup
    pickup: {
      scheduled_date: Date,

      location: {
        address_line: String,
        city: String,
        state: String,
        pincode: String,
        additional_info: String,
      },

      scheduled_at: Date,
      // true when the seller picked a time, not just a day.
      time_set: { type: Boolean, default: false },
      // When to ask "did you meet?" and when an untouched reservation
      // ends. Set on (re)scheduling; see deal.service.js handover section.
      followup_due_at: { type: Date, default: undefined },
      expires_at: { type: Date, default: undefined },
    },

    // Handover code. The 4 digits are derived (HMAC) from this random nonce
    // and a server secret, so the code itself is never stored. The nonce is
    // stripped from every serialised deal (see transform below), so the
    // seller can't read it from a socket payload.
    handover: {
      nonce: { type: String, default: undefined },
      issued_at: { type: Date, default: undefined },
      attempts: { type: Number, default: 0 },
      locked_until: { type: Date, default: undefined },
    },

    // "Mark as done" from one side: the other side confirms (completes),
    // raises a problem (clears it), or stays silent (auto-completes).
    done_request: {
      by: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: undefined },
      role: { type: String, enum: ["buyer", "seller"], default: undefined },
      at: { type: Date, default: undefined },
      auto_complete_at: { type: Date, default: undefined },
    },

    // "Did you meet?" prompt already sent for the current meetup.
    followup_sent_at: { type: Date, default: undefined },

    // Who reported the other side didn't turn up (deal is then cancelled).
    no_show: {
      reported_by: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: undefined },
      reporter_role: { type: String, enum: ["buyer", "seller"], default: undefined },
      at: { type: Date, default: undefined },
    },

    // How the deal was completed: "code" (buyer's handover code verified),
    // "both_confirmed", "auto" (no reply in time), "legacy" (old two-button
    // flow) or "admin".
    completed_via: {
      type: String,
      enum: ["code", "both_confirmed", "auto", "legacy", "admin"],
      default: undefined,
    },

    // Seller confirmation
    payment_confirmed: {
      is_confirmed: {
        type: Boolean,
        default: false,
      },

      confirmed_at: {
        type: Date,
        default: null,
      },
    },

    // Buyer confirmation
    item_received: {
      is_confirmed: {
        type: Boolean,
        default: false,
      },

      confirmed_at: {
        type: Date,
        default: null,
      },
    },

    // Final completion
    completed_at: {
      type: Date,
      default: null,
    },

    cancelled_at: {
      type: Date,
      default: null,
    },

    cancellation_reason: {
      type: String,
      trim: true,
      default: "",
    },

    // What sold, captured at completion. The listing itself is soft-deleted
    // on completion and hard-deleted ~15 days later, so this is the durable
    // record that price insights and the demand meter learn from.
    sale: {
      type: new mongoose.Schema(
        {
          campus_id: { type: mongoose.Schema.Types.ObjectId, ref: "Campus" },
          category: { type: String },
          condition: { type: String },
          original_price: { type: Number }, // what the seller paid new (MRP)
          sold_price: { type: Number }, // agreed price the deal closed at
          purchase_date: { type: Date }, // when the seller bought it (age-adjusts price insights)
          seller_id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        },
        { _id: false },
      ),
      default: undefined,
    },
  },
  {
    timestamps: true,
    // Never ship the handover nonce to a client (deals are broadcast to
    // both sides of the chat).
    toObject: { transform: (_doc, ret) => stripSecrets(ret) },
    toJSON: { transform: (_doc, ret) => stripSecrets(ret) },
  },
);

/**
 * Market data: completed sales per campus + category, newest first.
 */
dealSchema.index(
  { "sale.campus_id": 1, "sale.category": 1, completed_at: -1 },
  { partialFilterExpression: { status: "completed" } },
);

/**
 * Fast lookup by status
 */
dealSchema.index({
  status: 1,
});

/**
 * Admin orders page (newest first) and order counts by date
 */
dealSchema.index({ createdAt: -1 });

/**
 * Handover follow-up job: overdue meetups, stale reservations, and
 * "mark as done" requests that auto-complete.
 */
dealSchema.index({ status: 1, "pickup.followup_due_at": 1 });
dealSchema.index({ status: 1, "pickup.expires_at": 1 });
dealSchema.index(
  { "done_request.auto_complete_at": 1 },
  { partialFilterExpression: { "done_request.auto_complete_at": { $type: "date" } } },
);

/**
 * Pickup schedule lookup
 */
dealSchema.index({
  "pickup.scheduled_date": 1,
});

const Deal = mongoose.model("Deal", dealSchema);

export default Deal;
