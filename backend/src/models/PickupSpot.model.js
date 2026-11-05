import mongoose, { Schema } from "mongoose";

const pickupSpotSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },

    detail: {
      type: String,
      required: true,
      trim: true,
      maxlength: 180,
    },

    isPrimary: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

pickupSpotSchema.index({ user: 1, isPrimary: 1 });

pickupSpotSchema.pre("save", async function () {
  if (this.isPrimary) {
    await mongoose
      .model("PickupSpot")
      .updateMany(
        { user: this.user, _id: { $ne: this._id } },
        { $set: { isPrimary: false } },
      );
  }
});

const PickupSpot = mongoose.model("PickupSpot", pickupSpotSchema);

export default PickupSpot;
