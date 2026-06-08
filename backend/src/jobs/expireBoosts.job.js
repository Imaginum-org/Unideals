import cron from "node-cron";
import { expireStaleBoosts } from "../services/boost.service.js";

export const scheduleExpireBoosts = () => {
  cron.schedule("*/10 * * * *", async () => {
    try {
      await expireStaleBoosts();
    } catch (error) {
      console.error("Boost expiry job failed:", error.message);
    }
  });
};
