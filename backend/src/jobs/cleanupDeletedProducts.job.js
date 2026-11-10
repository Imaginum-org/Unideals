import { defineJob } from "./jobRegistry.js";
import Product from "../models/Product.model.js";
import { deleteImageSafely } from "../utils/imagekit.js";
import { autoUnlistInvalidGirlsListings } from "./autoUnlistInvalidGirlsListings.job.js";

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
  const User = (await import("../models/User.model.js")).default;
  const Report = (await import("../models/Report.model.js")).default;
  await Promise.all([
    Product.deleteMany({ _id: { $in: ids } }),
    User.updateMany(
      { wishlist: { $in: ids } },
      { $pull: { wishlist: { $in: ids } } },
    ),
    Report.deleteMany({
      target_id: { $in: ids },
      target_model: "Product",
    }),
  ]);
};

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
      const fifteenDaysAgo = new Date();
      fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const deletedProducts = await Product.find(
        {
          is_deleted: true,
          $or: [
            { status: "sold", updatedAt: { $lt: fifteenDaysAgo } },
            { updatedAt: { $lt: thirtyDaysAgo } },
          ],
        },
        { _id: 1, images: 1, seller_id: 1 },
      ).lean();

      if (deletedProducts.length > 0) {
        await hardDeleteProducts(deletedProducts.map((p) => p._id));
        await purgeProductImages(deletedProducts);
      }

      const User = (await import("../models/User.model.js")).default;
      const orphanProducts = await Product.aggregate([
        {
          $lookup: {
            from: User.collection.name,
            localField: "seller_id",
            foreignField: "_id",
            as: "seller",
          },
        },
        { $match: { seller: { $size: 0 } } },
        { $project: { _id: 1, images: 1, seller_id: 1 } },
        { $limit: 5000 },
      ]);
      if (orphanProducts.length > 0) {
        await hardDeleteProducts(orphanProducts.map((p) => p._id));
        await purgeProductImages(orphanProducts);
      }

      return { deletedListings: deletedProducts.length, orphanListings: orphanProducts.length };
    },
  });

  defineJob({
    key: "purge-stale-drafts",
    name: "Purge stale drafts",
    description: "Deletes drafts that haven't been touched in 30 days, with their images.",
    schedule: "30 2 * * *",
    scheduleLabel: "Daily at 02:30",
    run: async () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const staleDrafts = await Product.find(
        { status: "draft", is_deleted: false, updatedAt: { $lt: thirtyDaysAgo } },
        { _id: 1, images: 1, seller_id: 1 },
      ).lean();
      if (staleDrafts.length > 0) {
        await hardDeleteProducts(staleDrafts.map((d) => d._id));
        await purgeProductImages(staleDrafts);
      }
      return { draftsDeleted: staleDrafts.length };
    },
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
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await Product.deleteMany({
      is_deleted: true,
      updatedAt: { $lt: cutoffDate },
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
