import dotenv from "dotenv";
dotenv.config({ override: true });

if (!process.env.SECRET_KEY_ACCESS_TOKEN || !process.env.SECRET_KEY_REFRESH_TOKEN) {
  console.error("Missing JWT secrets (SECRET_KEY_ACCESS_TOKEN / SECRET_KEY_REFRESH_TOKEN)");
  process.exit(1);
}

// Services the live site can't work without. Modules load them lazily (so
// tests and scripts run without credentials); this is where a misconfigured
// production deploy fails fast instead of breaking at the first sign-up.
const REQUIRED_IN_PRODUCTION = ["MONGO_URL", "FRONTEND_URL", "RESEND_API_KEY"];
const missingEnv = REQUIRED_IN_PRODUCTION.filter((name) => !String(process.env[name] || "").trim());
if (missingEnv.length) {
  if (process.env.NODE_ENV === "production") {
    console.error(`Missing required environment variables: ${missingEnv.join(", ")}`);
    process.exit(1);
  }
  console.warn(`[env] Not set (features using them will fail): ${missingEnv.join(", ")}`);
}

import http from "http";
import app from "./src/app.js";
import { connectDB } from "./src/config/db.js";
import { backfillSellerTiers, ensureAdminPlans } from "./src/utils/sellerTierSync.js";
import { scheduleCleanupDeletedProducts } from "./src/jobs/cleanupDeletedProducts.job.js";
import { scheduleExpireBoosts } from "./src/jobs/expireBoosts.job.js";
import { scheduleExpireSubscriptions } from "./src/jobs/expireSubscriptions.job.js";
import { scheduleDispatchNotifications } from "./src/jobs/dispatchScheduledNotifications.job.js";
import { scheduleEmailAlerts } from "./src/jobs/emailAlerts.job.js";
import { startScheduledJobs } from "./src/jobs/jobRegistry.js";
import { scheduleRentJobs } from "./src/jobs/rent.job.js"; // [rent]
import { initSockets } from "./src/sockets/index.js";

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();

    scheduleCleanupDeletedProducts();
    scheduleExpireBoosts();
    scheduleExpireSubscriptions();
    scheduleDispatchNotifications();
    scheduleEmailAlerts();
    scheduleRentJobs(); // [rent]
    // Start every job defined above (records runs for the admin console).
    startScheduledJobs();
    // Plan-rank backfill for listings (search ranking perk); idempotent.
    // Admins get Pro Plus first so the backfill ranks their listings too.
    ensureAdminPlans().then(backfillSellerTiers);

    const httpServer = http.createServer(app);
    initSockets(httpServer);

    httpServer.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error.message);
    process.exit(1);
  }
};

startServer();
