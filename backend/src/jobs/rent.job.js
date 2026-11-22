import { defineJob } from "./jobRegistry.js";
import { isRentEnabled } from "../config/rent.js";
import { sweepRent } from "../services/rentBooking.service.js";

// Rent & Borrow housekeeping: expire old requests and unanswered bookings,
// nudge borrowers once when a lent item is overdue. Idle while RENT_ENABLED is off.
export const scheduleRentJobs = () => {
  defineJob({
    key: "rent-sweep",
    name: "Rent & Borrow sweep",
    description: "Expires requests past their 'needed by' time and unanswered bookings; reminds borrowers about overdue returns.",
    schedule: "*/15 * * * *",
    scheduleLabel: "Every 15 minutes",
    frequent: true,
    run: () => (isRentEnabled() ? sweepRent() : { disabled: 0 }),
  });
};
