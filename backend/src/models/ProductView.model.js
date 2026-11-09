import mongoose, { Schema } from "mongoose";

/**
 * One row per (listing, viewer) per 24h window. The unique index makes
 * "count this view?" a single atomic insert: a duplicate means the same
 * person already viewed it recently. Rows expire after 24h (TTL), so the
 * same viewer counts again the next day, never more than once a day.
 *
 * viewer_key: "u:<userId>" (logged in) | "v:<visitor cookie>" | "ip:<hash>"
 */
const productViewSchema = new Schema(
  {
    product_id: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    viewer_key: { type: String, required: true, maxlength: 120 },
    created_at: { type: Date, default: Date.now },
  },
  { versionKey: false },
);

productViewSchema.index({ product_id: 1, viewer_key: 1 }, { unique: true });
productViewSchema.index({ created_at: 1 }, { expireAfterSeconds: 24 * 60 * 60 });

export default mongoose.models.ProductView || mongoose.model("ProductView", productViewSchema);
