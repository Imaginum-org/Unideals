import cron from "node-cron";
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
};
