import { defineJob } from "./jobRegistry.js";
import Payment from "../models/Payment.model.js";
import { PAYMENT_STATUS } from "../config/constants.js";
import { expireDueSubscriptions } from "../services/subscription.service.js";

/**
 * Expiry Job: downgrade expired semester subscriptions to Free.
 * Founder (lifetime) rows are skipped inside expireDueSubscriptions.
 * Runs daily at 3 AM (after the 2 AM product-cleanup job).
 */
export const scheduleExpireSubscriptions = () => {
  defineJob({
    key: "expire-subscriptions",
    name: "Expire subscriptions",
    description: "Moves users whose Pro / Pro+ plan has ended back to the free plan.",
    schedule: "0 3 * * *",
    scheduleLabel: "Daily at 03:00",
    run: () => expireDueSubscriptions(),
  });

  defineJob({
    key: "expire-payment-orders",
    name: "Expire abandoned payments",
    description: "Marks payment orders that were created but never paid within 24 hours as expired.",
    schedule: "15 3 * * *",
    scheduleLabel: "Daily at 03:15",
    run: async () => {
      const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const result = await Payment.updateMany(
        { status: PAYMENT_STATUS.CREATED, createdAt: { $lt: cutoff } },
        { $set: { status: PAYMENT_STATUS.EXPIRED } },
      );
      return { ordersExpired: result.modifiedCount || 0 };
    },
  });
};
