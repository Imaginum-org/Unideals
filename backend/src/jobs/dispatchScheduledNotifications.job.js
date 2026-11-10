import { defineJob } from "./jobRegistry.js";
import { dispatchDueScheduledNotifications } from "../services/notification.service.js";

export const scheduleDispatchNotifications = () => {
  defineJob({
    key: "dispatch-scheduled-notifications",
    name: "Send scheduled notifications",
    description: "Sends push notifications whose scheduled time has arrived.",
    schedule: "* * * * *",
    scheduleLabel: "Every minute",
    frequent: true,
    run: async () => ({ dispatched: (await dispatchDueScheduledNotifications()) || 0 }),
  });
};
