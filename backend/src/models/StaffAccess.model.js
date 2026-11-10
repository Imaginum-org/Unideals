import mongoose, { Schema } from "mongoose";

/**
 * Custom access for one support staff member. When a document exists it
 * replaces the Support role defaults for that person entirely (it is a full
 * set, so later edits to the role defaults don't change it). Deleting it puts
 * the person back on the role defaults.
 */
const staffAccessSchema = new Schema(
  {
    user_id: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    // { [featureKey]: { view: Boolean, manage: Boolean } }
    permissions: { type: Schema.Types.Mixed, default: {} },
    // Campuses whose data this access covers. Empty = every campus.
    campuses: { type: [{ type: Schema.Types.ObjectId, ref: "Campus" }], default: [] },
    updated_by: { type: Schema.Types.ObjectId, ref: "User", default: null },
    updated_by_name: { type: String, default: null },
  },
  { timestamps: true, versionKey: false, minimize: false },
);

const StaffAccess = mongoose.model("StaffAccess", staffAccessSchema);
export default StaffAccess;
