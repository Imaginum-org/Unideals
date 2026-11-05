import mongoose from "mongoose";
import {
  DEAL_STATUS,
  OFFER_STATUS,
  CONVERSATION_ROLE,
} from "../utils/constants.js";

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

    // Transaction status
    status: {
      type: String,
      enum: Object.values(DEAL_STATUS),
      default: DEAL_STATUS.NEGOTIATING,
      index: true,
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
  },
  {
    timestamps: true,
  },
);

/**
 * Fast lookup by status
 */
dealSchema.index({
  status: 1,
});

/**
 * Pickup schedule lookup
 */
dealSchema.index({
  "pickup.scheduled_date": 1,
});

const Deal = mongoose.model("Deal", dealSchema);

export default Deal;
