import cron from "node-cron";
import { dispatchDueScheduledNotifications } from "../services/notification.service.js";

export const scheduleDispatchNotifications = () => {
  // Check every minute for scheduled notifications that are due
  cron.schedule("* * * * *", async () => {
    try {
      const count = await dispatchDueScheduledNotifications();
      if (count > 0) {
        console.log(`[NotificationJob] Dispatched ${count} scheduled notification(s)`);
      }
    } catch (error) {
      console.error("[NotificationJob] Error dispatching scheduled notifications:", error.message);
    }
  });
};
