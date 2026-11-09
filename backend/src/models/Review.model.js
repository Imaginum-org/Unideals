import mongoose, { Schema } from "mongoose";

// Buyer → seller rating, one per completed deal.
const reviewSchema = new Schema(
  {
    deal_id: { type: Schema.Types.ObjectId, ref: "Deal", required: true, unique: true },
    conversation_id: { type: Schema.Types.ObjectId, ref: "Conversation", required: true },
    product_id: { type: Schema.Types.ObjectId, ref: "Product", default: null },
    product_title: { type: String, trim: true, maxlength: 140, default: "" },
    seller_id: { type: Schema.Types.ObjectId, ref: "User", required: true },
    buyer_id: { type: Schema.Types.ObjectId, ref: "User", required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, trim: true, maxlength: 300, default: "" },
  },
  { timestamps: true },
);

reviewSchema.index({ seller_id: 1, createdAt: -1 });
reviewSchema.index({ buyer_id: 1, createdAt: -1 });

const Review = mongoose.model("Review", reviewSchema);
export default Review;
