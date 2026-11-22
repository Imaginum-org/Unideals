import { defineJob } from "./jobRegistry.js";
import { sendStaffAttentionAlerts, sendUnreadDigests } from "../services/emailAlerts.service.js";

// Both no-op unless EMAIL_ALERTS_ENABLED=true (see emailAlerts.service.js).
// Cron times are UTC (JOBS_TIMEZONE in jobRegistry.js).
export const scheduleEmailAlerts = () => {
  defineJob({
    key: "email-unread-digest",
    name: "Email unread-notification digests",
    description:
      "Emails users whose personal notifications have piled up unread for a day (capped daily to protect the Resend quota).",
    schedule: "30 13 * * *",
    scheduleLabel: "Daily at 13:30 UTC (7 PM IST)",
    run: () => sendUnreadDigests(),
  });

  defineJob({
    key: "email-staff-attention",
    name: "Email admins about the attention queue",
    description: "Emails admins when pending reports, requests and failing jobs reach the threshold (max once a day each).",
    schedule: "5 * * * *",
    scheduleLabel: "Hourly",
    frequent: true,
    run: () => sendStaffAttentionAlerts(),
  });
};
