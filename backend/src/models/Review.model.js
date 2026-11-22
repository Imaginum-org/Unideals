import mongoose, { Schema } from "mongoose";

// Two-way deal ratings: after a completed deal the buyer rates the seller
// and the seller rates the buyer (one review each, per deal).
//
// buyer_id / seller_id are always the deal's buyer and seller; reviewer_id /
// reviewee_id say who rated whom. Reviews written before two-way ratings
// have no reviewer fields: those are all buyer → seller (see review.service
// LEGACY_* filters).
const reviewSchema = new Schema(
  {
    deal_id: { type: Schema.Types.ObjectId, ref: "Deal", required: true },
    conversation_id: { type: Schema.Types.ObjectId, ref: "Conversation", required: true },
    product_id: { type: Schema.Types.ObjectId, ref: "Product", default: null },
    product_title: { type: String, trim: true, maxlength: 140, default: "" },
    seller_id: { type: Schema.Types.ObjectId, ref: "User", required: true },
    buyer_id: { type: Schema.Types.ObjectId, ref: "User", required: true },
    reviewer_id: { type: Schema.Types.ObjectId, ref: "User" },
    reviewee_id: { type: Schema.Types.ObjectId, ref: "User" },
    // The reviewer's side of the deal.
    reviewer_role: { type: String, enum: ["buyer", "seller"] },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, trim: true, maxlength: 300, default: "" },
  },
  { timestamps: true },
);

// One review per side per deal. Legacy rows (no reviewer_id) are unique by
// deal already, and createReview checks them before inserting.
reviewSchema.index({ deal_id: 1, reviewer_id: 1 }, { unique: true });
reviewSchema.index({ reviewee_id: 1, createdAt: -1 });
reviewSchema.index({ reviewer_id: 1, createdAt: -1 });
reviewSchema.index({ seller_id: 1, createdAt: -1 });
reviewSchema.index({ buyer_id: 1, createdAt: -1 });

const Review = mongoose.model("Review", reviewSchema);
export default Review;
