import Product from "../models/Product.model.js";
import User from "../models/User.model.js";

const LIVE_GIRLS = { isGirlsOnly: true, status: "listed", is_deleted: false };

/**
 * Nightly: auto-unlist girls-only listings whose seller is no longer female.
 * Covers admin gender corrections (edge #10). Admin sellers are exempt:
 * they may list in Girls Corner after confirming. Idempotent.
 *
 * Works on distinct sellers, not listings: one distinct + one user lookup
 * + one updateMany, instead of pulling every live girls-only listing into
 * memory each night.
 */
export const autoUnlistInvalidGirlsListings = async () => {
  const sellerIds = await Product.distinct("seller_id", LIVE_GIRLS);
  if (!sellerIds.length) return { checked: 0, unlisted: 0 };
  const ineligible = await User.find({ _id: { $in: sellerIds }, gender: { $ne: "female" }, role: { $ne: "admin" } }).distinct("_id");
  if (!ineligible.length) return { checked: sellerIds.length, unlisted: 0 };
  const r = await Product.updateMany(
    { ...LIVE_GIRLS, seller_id: { $in: ineligible } },
    { $set: { status: "unlisted", is_boosted: false } },
  );
  return { checked: sellerIds.length, unlisted: r?.modifiedCount || 0 };
};
