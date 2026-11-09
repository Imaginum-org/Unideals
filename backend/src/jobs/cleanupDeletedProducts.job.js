import cron from "node-cron";
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
  cron.schedule("0 2 * * *", async () => {
    try {
      console.log("[Job] Starting cleanup of deleted products...");

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

      console.log(
        `[Job] Found ${deletedProducts.length} deleted products to clean up`,
      );

      if (deletedProducts.length > 0) {
        const ids = deletedProducts.map((p) => p._id);
        // Remove DB rows first so the reference check in the image purge
        // no longer sees these products as live references.
        await hardDeleteProducts(ids);
        await purgeProductImages(deletedProducts);
        console.log(
          `[Job] Successfully deleted ${ids.length} products from database`,
        );
      }

      // Orphan sweep (unverified TTL deletes): products whose seller no
      // longer exists. Uses $lookup instead of loading every user id into
      // memory for a $nin (which degrades linearly with the user base).
      try {
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
          const orphanIds = orphanProducts.map((p) => p._id);
          console.log(
            `[Job] Found ${orphanIds.length} orphan products (seller gone) to clean up`,
          );
          await hardDeleteProducts(orphanIds);
          await purgeProductImages(orphanProducts);
          console.log(
            `[Job] Successfully deleted ${orphanIds.length} orphan products`,
          );
        }
      } catch (orphanErr) {
        console.error("[Job] Error in orphan sweep:", orphanErr.message);
      }

      console.log("[Job] Cleanup job completed successfully");
    } catch (error) {
      console.error("[Job] Error in cleanup job:", error.message);
    }
  });

  console.log(
    "[Job] Product cleanup scheduler initialized (runs daily at 2 AM UTC)",
  );

  // Draft TTL: unpublished drafts older than 30d are deleted (abandoned
  // composer state — never user-visible). Their images are purged too
  // (previously left orphaned on ImageKit). Runs daily at 2:30 AM UTC.
  cron.schedule("30 2 * * *", async () => {
    try {
      console.log("[Job] Purging stale drafts older than 30 days...");
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const staleDrafts = await Product.find(
        {
          status: "draft",
          is_deleted: false,
          updatedAt: { $lt: thirtyDaysAgo },
        },
        { _id: 1, images: 1, seller_id: 1 },
      ).lean();
      if (staleDrafts.length > 0) {
        await hardDeleteProducts(staleDrafts.map((d) => d._id));
        await purgeProductImages(staleDrafts);
      }
      console.log(
        `[Job] Draft purge done (deleted ${staleDrafts.length} stale drafts)`,
      );
    } catch (error) {
      console.error("[Job] Error in draft purge:", error.message);
    }
  });

  // Girls Corner: nightly auto-unlist of girls-only listings whose seller is
  // no longer female (admin gender corrections). The job existed but was
  // never scheduled. Runs daily at 2:45 AM UTC.
  cron.schedule("45 2 * * *", async () => {
    try {
      const { checked, unlisted } = await autoUnlistInvalidGirlsListings();
      if (unlisted > 0) {
        console.log(
          `[Job] Girls Corner sweep: checked ${checked}, unlisted ${unlisted}`,
        );
      }
    } catch (error) {
      console.error("[Job] Error in Girls Corner sweep:", error.message);
    }
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
