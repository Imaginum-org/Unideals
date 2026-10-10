import cron from "node-cron";
import Payment from "../models/Payment.model.js";
import { PAYMENT_STATUS } from "../config/constants.js";
import { expireDueSubscriptions } from "../services/subscription.service.js";

/**
 * Expiry Job: downgrade expired semester subscriptions to Free.
 * Founder (lifetime) rows are skipped inside expireDueSubscriptions.
 * Runs daily at 3 AM (after the 2 AM product-cleanup job).
 */
export const scheduleExpireSubscriptions = () => {
  cron.schedule("0 3 * * *", async () => {
    try {
      console.log("[Job] Checking for expired subscriptions...");
      const { checked, expired } = await expireDueSubscriptions();
      console.log(
        `[Job] Subscription expiry sweep done (checked ${checked}, expired ${expired})`,
      );
    } catch (error) {
      console.error("[Job] Error in subscription expiry job:", error.message);
    }
  });

  console.log(
    "[Job] Subscription expiry scheduler initialized (runs daily at 3 AM UTC)",
  );

  // CREATED-order sweep: abandoned Razorpay orders older than 24h can never
  // be paid (reuse window is 15m), so mark them EXPIRED. Keeps the unpaid
  // cap (max 10 CREATED/user) from filling with dead rows. Runs 3:15 AM.
  cron.schedule("15 3 * * *", async () => {
    try {
      console.log("[Job] Expiring abandoned CREATED payment orders...");
      const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const result = await Payment.updateMany(
        { status: PAYMENT_STATUS.CREATED, createdAt: { $lt: cutoff } },
        { $set: { status: PAYMENT_STATUS.EXPIRED } },
      );
      console.log(
        `[Job] CREATED-order sweep done (expired ${result.modifiedCount || 0})`,
      );
    } catch (error) {
      console.error("[Job] Error in CREATED-order sweep:", error.message);
    }
  });
};
