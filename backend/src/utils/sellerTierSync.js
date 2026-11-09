import mongoose from "mongoose";
import { USER_TIER } from "../config/constants.js";
import { sellerRank } from "./planPerks.js";

// Listings carry their seller's plan rank (Product.seller_tier) for
// ranking. This keeps it correct whenever a plan changes — payment,
// expiry job, refund downgrade, reward, admin edit — without each call
// site having to remember. Wired from User model hooks.

const Product = () => mongoose.model("Product");

export const syncSellerTier = async (userId, tier) => {
  if (!userId) return;
  try {
    await Product().updateMany(
      { seller_id: userId, seller_tier: { $ne: sellerRank(tier) } },
      { $set: { seller_tier: sellerRank(tier) } },
    );
  } catch (err) {
    console.error("[sellerTierSync] failed:", err?.message);
  }
};

/**
 * One-off, idempotent backfill run at startup: listings of paid sellers get
 * their rank; everything else is 0 by default/$ifNull. Cheap — only paid
 * users are scanned.
 */
export const backfillSellerTiers = async () => {
  try {
    const User = mongoose.model("User");
    const paid = await User.find({ subscription: { $in: [USER_TIER.PRO, USER_TIER.PRO_PLUS] } })
      .select("_id subscription")
      .lean();
    for (const u of paid) await syncSellerTier(u._id, u.subscription);
    // Listings whose seller is no longer paid but still carry a rank.
    const paidIds = paid.map((u) => u._id);
    await Product().updateMany(
      { seller_tier: { $gt: 0 }, seller_id: { $nin: paidIds } },
      { $set: { seller_tier: 0 } },
    );
  } catch (err) {
    console.error("[sellerTierSync] backfill failed:", err?.message);
  }
};

/**
 * Startup, idempotent: every admin gets Pro Plus (staff perk). Downgrade
 * paths skip admins, so this only catches accounts made admin directly in
 * the database.
 */
export const ensureAdminPlans = async () => {
  try {
    const User = mongoose.model("User");
    const admins = await User.find({ role: "admin", subscription: { $ne: USER_TIER.PRO_PLUS } }).select("_id").lean();
    if (!admins.length) return;
    await User.updateMany({ _id: { $in: admins.map((a) => a._id) } }, { $set: { subscription: USER_TIER.PRO_PLUS } });
    for (const a of admins) await syncSellerTier(a._id, USER_TIER.PRO_PLUS);
    console.log(`[plans] gave Pro Plus to ${admins.length} admin account(s)`);
  } catch (err) {
    console.error("[plans] admin plan sync failed:", err?.message);
  }
};

// Pull the new subscription value out of an update document, if any.
export const subscriptionFromUpdate = (update) => {
  if (!update) return undefined;
  if (update.$set && Object.prototype.hasOwnProperty.call(update.$set, "subscription")) return update.$set.subscription;
  if (Object.prototype.hasOwnProperty.call(update, "subscription")) return update.subscription;
  return undefined;
};
