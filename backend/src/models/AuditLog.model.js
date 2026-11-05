import mongoose, { Schema } from "mongoose";

/**
 * AuditLog — immutable record of every admin/support action.
 * Documents are append-only; never update or delete them.
 */
const auditLogSchema = new Schema(
  {
    // Who performed the action (admin or support user)
    actor_id: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    actor_name: {
      type: String,
      required: true,
      trim: true,
    },

    actor_role: {
      type: String,
      enum: ["admin", "support"],
      required: true,
    },

    // What kind of action was taken
    action: {
      type: String,
      required: true,
      trim: true,
      // e.g. "user.suspend", "user.activate", "product.block",
      // "product.unlist", "product.delete", "campus.create",
      // "campus.update", "campus.pause", "campus.activate",
      // "report.dismiss", "report.action_taken"
    },

    // What entity was acted upon
    target_type: {
      type: String,
      enum: ["user", "product", "campus", "report"],
      required: true,
      index: true,
    },

    target_id: {
      type: Schema.Types.ObjectId,
      required: true,
    },

    // Human-readable snapshot of target at the time of action
    target_snapshot: {
      type: Schema.Types.Mixed,
      default: null,
    },

    // Optional note from the admin
    note: {
      type: String,
      trim: true,
      maxlength: 500,
      default: null,
    },

    // Extra context (e.g. new status value, reason)
    metadata: {
      type: Schema.Types.Mixed,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ target_type: 1, createdAt: -1 });
auditLogSchema.index({ createdAt: -1 });

const AuditLog = mongoose.model("AuditLog", auditLogSchema);

export default AuditLog;
