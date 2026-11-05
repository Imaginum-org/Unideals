import Product from "../models/Product.model.js";

/**
 * Nightly: auto-unlist girls-only listings whose seller is no longer female.
 * Covers admin gender corrections (edge #10). Idempotent, batched.
 */
export const autoUnlistInvalidGirlsListings = async () => {
  const stale = await Product.find(
    { isGirlsOnly: true, status: "listed", is_deleted: false },
    { _id: 1, seller_id: 1 },
  ).lean();
  if (!stale.length) return { checked: 0, unlisted: 0 };
  const { default: User } = await import("../models/User.model.js");
  const sellerIds = [...new Set(stale.map((p) => String(p.seller_id)))];
  const sellers = await User.find({ _id: { $in: sellerIds } })
    .select("_id gender")
    .lean();
  const bad = new Set(
    sellers.filter((u) => u.gender !== "female").map((u) => String(u._id)),
  );
  const ids = stale.filter((p) => bad.has(String(p.seller_id))).map((p) => p._id);
  if (!ids.length) return { checked: stale.length, unlisted: 0 };
  const r = await Product.updateMany(
    { _id: { $in: ids } },
    { $set: { status: "unlisted", is_boosted: false } },
  );
  return { checked: stale.length, unlisted: r?.modifiedCount || 0 };
};
