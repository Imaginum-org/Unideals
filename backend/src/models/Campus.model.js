import mongoose, { Schema } from "mongoose";

// Campus directory: one document per college campus marketplace.
// Slugs are immutable once created (products/users reference by ObjectId,
// but slugs are the stable external key used by clients and seeders).
const campusSchema = new Schema(
  {
    slug: {
      type: String,
      required: [true, "Campus slug is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Invalid campus slug"],
      index: true,
    },

    name: {
      type: String,
      required: [true, "Campus name is required"],
      trim: true,
      maxlength: 120,
    },

    short_name: {
      type: String,
      required: [true, "Campus short name is required"],
      trim: true,
      maxlength: 40,
    },

    city: {
      type: String,
      trim: true,
      maxlength: 80,
      default: null,
    },

    state: {
      type: String,
      trim: true,
      maxlength: 80,
      default: null,
    },

    // College email domains used only to *suggest* a campus during
    // onboarding — never to auto-assign (domains overlap across campuses).
    email_domains: {
      type: [String],
      default: [],
    },

    // Flipping to false pauses the campus: excluded from public list,
    // feeds reject its slug, and its users see a re-pick gate.
    is_active: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

campusSchema.index({ is_active: 1, name: 1 });

const Campus = mongoose.model("Campus", campusSchema);

export default Campus;
