import { defineJob } from "./jobRegistry.js";
import Product from "../models/Product.model.js";
import User from "../models/User.model.js";
import Report from "../models/Report.model.js";
import { deleteImageSafely } from "../utils/imagekit.js";
import { autoUnlistInvalidGirlsListings } from "./autoUnlistInvalidGirlsListings.job.js";

// Work in fixed-size batches: bounded memory, short-lived queries, and a
// big backlog (first run after an outage) never holds one giant $in.
const BATCH = 500;
// Safety valve per run; the rest is picked up the next night.
const MAX_BATCHES = 40;

// Best-effort ImageKit purge for a batch of products. Each file is skipped
// when another live listing/avatar still references it, or when it sits in
// a different user's upload folder than the product's seller.
const purgeProductImages = async (products) => {
  const tasks = [];
  for (const p of products) {
    if (!Array.isArray(p.images)) continue;
    for (const img of p.images) {
      if (!img?.fileId) continue;
      tasks.push(
        deleteImageSafely(img.fileId, {
          ownerId: p.seller_id || null,
          excludeProductId: p._id,
        }),
      );
    }
  }
  await Promise.allSettled(tasks);
};

const hardDeleteProducts = async (ids) => {
  await Promise.all([
    Product.deleteMany({ _id: { $in: ids } }),
    User.updateMany({ wishlist: { $in: ids } }, { $pull: { wishlist: { $in: ids } } }),
    Report.deleteMany({ target_id: { $in: ids }, target_model: "Product" }),
  ]);
};

/**
 * Delete everything matching `filter`, BATCH at a time. Each pass re-runs the
 * same (indexed) query because the previous batch is gone, so no cursor or
 * skip is needed. Returns how many listings were removed.
 */
const purgeInBatches = async (filter) => {
  let removed = 0;
  for (let i = 0; i < MAX_BATCHES; i += 1) {
    const batch = await Product.find(filter, { _id: 1, images: 1, seller_id: 1 }).limit(BATCH).lean();
    if (!batch.length) break;
    await hardDeleteProducts(batch.map((p) => p._id));
    await purgeProductImages(batch);
    removed += batch.length;
    if (batch.length < BATCH) break;
  }
  return removed;
};

/**
 * Listings whose seller account no longer exists. Instead of $lookup-ing
 * every product against users (a full scan of both collections nightly),
 * take the distinct seller ids straight from the { seller_id } index and
 * ask Users which of those are missing.
 */
const purgeOrphanListings = async () => {
  const sellerIds = await Product.distinct("seller_id");
  if (!sellerIds.length) return 0;
  let removed = 0;
  for (let i = 0; i < sellerIds.length; i += BATCH) {
    const chunk = sellerIds.slice(i, i + BATCH);
    const existing = await User.find({ _id: { $in: chunk } }).distinct("_id");
    const alive = new Set(existing.map(String));
    const missing = chunk.filter((id) => id && !alive.has(String(id)));
    if (missing.length) removed += await purgeInBatches({ seller_id: { $in: missing } });
  }
  return removed;
};

const daysAgo = (n) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);

/**
 * Cleanup Job: hard delete soft-deleted products.
 * - Sold listings (deal completed): 15 days after completion, so finished
 *   deals vanish fast and nobody trips over dead listings.
 * - Manually deleted listings: 30 days (unchanged grace window).
 * Runs daily at 2 AM
 */
export const scheduleCleanupDeletedProducts = () => {
  defineJob({
    key: "cleanup-deleted-products",
    name: "Purge deleted listings",
    description:
      "Permanently removes listings deleted 30+ days ago (15+ if sold), plus listings whose seller no longer exists, and their images.",
    schedule: "0 2 * * *",
    scheduleLabel: "Daily at 02:00",
    run: async () => {
      // Served by { is_deleted: 1, updatedAt: 1 }.
      const deletedListings = await purgeInBatches({
        is_deleted: true,
        $or: [{ status: "sold", updatedAt: { $lt: daysAgo(15) } }, { updatedAt: { $lt: daysAgo(30) } }],
      });
      const orphanListings = await purgeOrphanListings();
      return { deletedListings, orphanListings };
    },
  });

  defineJob({
    key: "purge-stale-drafts",
    name: "Purge stale drafts",
    description: "Deletes drafts that haven't been touched in 30 days, with their images.",
    schedule: "30 2 * * *",
    scheduleLabel: "Daily at 02:30",
    run: async () => ({
      // Served by { status: 1, updatedAt: 1 }.
      draftsDeleted: await purgeInBatches({ status: "draft", is_deleted: false, updatedAt: { $lt: daysAgo(30) } }),
    }),
  });

  defineJob({
    key: "girls-corner-sweep",
    name: "Girls Corner eligibility sweep",
    description: "Unlists Girls Corner listings whose seller is no longer eligible.",
    schedule: "45 2 * * *",
    scheduleLabel: "Daily at 02:45",
    run: () => autoUnlistInvalidGirlsListings(),
  });
};

/**
 * Optional: Manual cleanup trigger (for testing or admin purposes)
 */
export const manualCleanupDeletedProducts = async (daysOld = 30) => {
  try {
    const result = await Product.deleteMany({
      is_deleted: true,
      updatedAt: { $lt: daysAgo(daysOld) },
    });

    return {
      success: true,
      message: `Hard deleted ${result.deletedCount} products older than ${daysOld} days`,
      deletedCount: result.deletedCount,
    };
  } catch (error) {
    throw new Error(`Manual cleanup failed: ${error.message}`);
  }
};
