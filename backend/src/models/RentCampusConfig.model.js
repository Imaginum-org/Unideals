import mongoose, { Schema } from "mongoose";

// Per-campus Rent & Borrow settings, edited by staff (or the
// seed:rent-blocks script). No document = enabled, no block list
// (students then type their block freely).
const rentCampusConfigSchema = new Schema(
  {
    campus_id: { type: Schema.Types.ObjectId, ref: "Campus", required: true, unique: true },
    enabled: { type: Boolean, default: true },
    blocks: { type: [String], default: [] },
  },
  { timestamps: true, versionKey: false },
);

const RentCampusConfig = mongoose.model("RentCampusConfig", rentCampusConfigSchema);

export default RentCampusConfig;
