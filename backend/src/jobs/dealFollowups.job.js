import { defineJob } from "./jobRegistry.js";
import { runHandoverFollowups } from "../services/deal.service.js";

// Deal handover upkeep (see deal.service.js "Follow-up job"): completes
// "mark as done" requests nobody answered, asks "did you meet?" after
// overdue meetups, and ends reservations nobody finished. Indexed, batched
// queries; a quiet tick is a handful of index lookups.
export const scheduleDealFollowups = () => {
  defineJob({
    key: "deal-followups",
    name: "Deal handover follow-ups",
    description:
      "Auto-completes deals marked as done with no reply in 48h, asks both sides \"did you meet?\" after an overdue meetup, and ends reservations nobody finished.",
    schedule: "*/15 * * * *",
    scheduleLabel: "Every 15 minutes",
    frequent: true,
    run: () => runHandoverFollowups(),
  });
};
