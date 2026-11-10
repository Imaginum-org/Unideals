import mongoose, { Schema } from "mongoose";

/**
 * Role access policy for the admin console. One document per delegable role
 * (today only "support"). Missing features fall back to the defaults in
 * config/accessFeatures.js, so new sections never lock anyone out.
 */
const accessPolicySchema = new Schema(
  {
    role: { type: String, enum: ["support"], required: true, unique: true },
    // { [featureKey]: { view: Boolean, manage: Boolean } }
    permissions: { type: Schema.Types.Mixed, default: {} },
    updated_by: { type: Schema.Types.ObjectId, ref: "User", default: null },
    updated_by_name: { type: String, default: null },
  },
  { timestamps: true, versionKey: false, minimize: false },
);

const AccessPolicy = mongoose.model("AccessPolicy", accessPolicySchema);
export default AccessPolicy;
