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
      enum: ["low", "normal", "medium", "high"],
      default: "normal",
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
      reporter_id: { $exists: true, $ne: null },
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
