import { defineJob } from "./jobRegistry.js";
import { expireStaleBoosts } from "../services/boost.service.js";

export const scheduleExpireBoosts = () => {
  defineJob({
    key: "expire-boosts",
    name: "Expire boosts",
    description: "Ends boosts past their expiry and removes the boost from those listings.",
    schedule: "*/10 * * * *",
    scheduleLabel: "Every 10 minutes",
    frequent: true,
    run: () => expireStaleBoosts(),
  });
};
