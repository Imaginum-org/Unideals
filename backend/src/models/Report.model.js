import mongoose, { Schema } from "mongoose";

import { REPORT_REASONS, REPORT_STATUS } from "../config/constants.js";

const reportSchema = new Schema(
  {
    reporter_id: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },

    reporter_email: {
      type: String,
      trim: true,
    },

    reporter_name: {
      type: String,
      trim: true,
    },

    target_id: {
      type: Schema.Types.ObjectId,
      default: () => new mongoose.Types.ObjectId(),
      refPath: "target_model",
    },

    target_model: {
      type: String,
      required: true,
      enum: ["Product", "User", "Support"],
    },

    reason: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      trim: true,
      maxlength: 3000,
    },

    reference: {
      type: String,
      trim: true,
      maxlength: 1000,
    },

    support_type: {
      type: String,
      trim: true,
      default: "contact",
    },

    priority: {
      type: String,
      enum: ["low", "normal", "medium", "high", "urgent"],
      default: "normal",
    },

    // Numeric twin of `priority` for queue ordering (higher first).
    // Support tickets: set server-side from the requester's plan
    // (Free normal=1, Pro high=2, Pro+ urgent=3; free suggestions low=0).
    priority_rank: {
      type: Number,
      default: 1,
    },

    // Requester's plan at the time of the ticket (shown in the admin queue).
    reporter_plan: {
      type: String,
    },

    status: {
      type: String,
      enum: Object.values(REPORT_STATUS),
      default: REPORT_STATUS.PENDING,
    },

    admin_note: {
      type: String,
      trim: true,
      maxlength: 1000,
    },

    reviewed_at: {
      type: Date,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

reportSchema.index(
  {
    reporter_id: 1,
    target_id: 1,
    target_model: 1,
  },
  {
    unique: true,
    partialFilterExpression: {
      target_model: { $in: ["Product", "User"] },
      // $ne is not allowed in partial indexes (MongoDB rejected the whole
      // index, so duplicate reports were never blocked). $type is allowed
      // and also excludes null / missing reporter_id.
      reporter_id: { $type: "objectId" },
    },
  },
);

reportSchema.index({
  status: 1,
  createdAt: -1,
});

reportSchema.index({
  target_model: 1,
  status: 1,
});

const Report = mongoose.model("Report", reportSchema);

export default Report;
