import cron from "node-cron";
import Product from "../models/Product.model.js";

/**
 * Cleanup Job: Hard delete soft-deleted products after 30 days
 * Runs daily at 2 AM
 */
export const scheduleCleanupDeletedProducts = () => {
  // Schedule job to run daily at 2:00 AM
  cron.schedule("0 2 * * *", async () => {
    try {
      console.log("[Job] Starting cleanup of deleted products...");

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Find soft-deleted products older than 30 days
      const deletedProducts = await Product.find({
        is_deleted: true,
        updatedAt: { $lt: thirtyDaysAgo },
      });

      console.log(
        `[Job] Found ${deletedProducts.length} deleted products to clean up`,
      );

      if (deletedProducts.length > 0) {
        const ids = deletedProducts.map((p) => p._id);
        // Best-effort ImageKit cleanup
        try {
          const { deleteImage } = await import("../utils/imagekit.js");
          const fileIds = deletedProducts.flatMap((p) =>
            Array.isArray(p.images)
              ? p.images.map((i) => i?.fileId).filter(Boolean)
              : [],
          );
          await Promise.allSettled(fileIds.map((id) => deleteImage(id)));
        } catch {
          // ignore image cleanup failures
        }
        // Hard delete + clean dangling refs
        const User = (await import("../models/User.model.js")).default;
        const Report = (await import("../models/Report.model.js")).default;
        await Promise.all([
          Product.deleteMany({
            _id: { $in: ids },
          }),
          User.updateMany(
            { wishlist: { $in: ids } },
            { $pull: { wishlist: { $in: ids } } },
          ),
          Report.deleteMany({
            target_id: { $in: ids },
            target_model: "Product",
          }),
        ]);

        console.log(
          `[Job] Successfully deleted ${ids.length} products from database`,
        );
      }

      console.log("[Job] Cleanup job completed successfully");

      // Orphan sweep (unverified TTL deletes): products whose seller no
      // longer exists (TTL auto-delete has no pre-hook) + wishlist pull.
      try {
        const User = (await import("../models/User.model.js")).default;
        const existingUserIds = await User.distinct("_id");
        const orphanProducts = await Product.find(
          { seller_id: { $nin: existingUserIds } },
          { _id: 1, images: 1 },
        ).lean();
        if (orphanProducts.length > 0) {
          const orphanIds = orphanProducts.map((p) => p._id);
          console.log(
            `[Job] Found ${orphanIds.length} orphan products (seller gone) to clean up`,
          );
          try {
            const { deleteImage } = await import("../utils/imagekit.js");
            const fileIds = orphanProducts.flatMap((p) =>
              Array.isArray(p.images)
                ? p.images.map((i) => i?.fileId).filter(Boolean)
                : [],
            );
            await Promise.allSettled(fileIds.map((id) => deleteImage(id)));
          } catch {
            // ignore image cleanup failures
          }
          const Report = (await import("../models/Report.model.js")).default;
          await Promise.all([
            Product.deleteMany({ _id: { $in: orphanIds } }),
            User.updateMany(
              { wishlist: { $in: orphanIds } },
              { $pull: { wishlist: { $in: orphanIds } } },
            ),
            Report.deleteMany({
              target_id: { $in: orphanIds },
              target_model: "Product",
            }),
          ]);
          console.log(
            `[Job] Successfully deleted ${orphanIds.length} orphan products`,
          );
        }
      } catch (orphanErr) {
        console.error("[Job] Error in orphan sweep:", orphanErr.message);
      }
    } catch (error) {
      console.error("[Job] Error in cleanup job:", error.message);
    }
  });

  console.log(
    "[Job] Product cleanup scheduler initialized (runs daily at 2 AM UTC)",
  );

  // Draft TTL: unpublished drafts older than 30d are deleted (abandoned
  // composer state — never user-visible). Runs daily at 2:30 AM UTC.
  cron.schedule("30 2 * * *", async () => {
    try {
      console.log("[Job] Purging stale drafts older than 30 days...");
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const result = await Product.deleteMany({
        status: "draft",
        is_deleted: false,
        updatedAt: { $lt: thirtyDaysAgo },
      });
      console.log(
        `[Job] Draft purge done (deleted ${result.deletedCount || 0} stale drafts)`,
      );
    } catch (error) {
      console.error("[Job] Error in draft purge:", error.message);
    }
  });
};

/**
 * Optional: Manual cleanup trigger (for testing or admin purposes)
 * DELETE endpoint can be added to call this
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
