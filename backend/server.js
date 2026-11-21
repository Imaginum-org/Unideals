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
import mongoose from "mongoose";
import app from "./src/app.js";
import { connectDB } from "./src/config/db.js";
import { backfillSellerTiers, ensureAdminPlans } from "./src/utils/sellerTierSync.js";
import { scheduleCleanupDeletedProducts } from "./src/jobs/cleanupDeletedProducts.job.js";
import { scheduleExpireBoosts } from "./src/jobs/expireBoosts.job.js";
import { scheduleExpireSubscriptions } from "./src/jobs/expireSubscriptions.job.js";
import { scheduleDispatchNotifications } from "./src/jobs/dispatchScheduledNotifications.job.js";
import { scheduleEmailAlerts } from "./src/jobs/emailAlerts.job.js";
import { scheduleSweepVoiceFiles } from "./src/jobs/sweepVoiceFiles.job.js";
import { startScheduledJobs } from "./src/jobs/jobRegistry.js";
import { cloudinaryMissing } from "./src/utils/cloudinary.js";
import { initSockets } from "./src/sockets/index.js";

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();

    // Optional integrations: say clearly (names only, never values) what is
    // off, so a missing env var is one glance at the logs, not a mystery.
    const cldMissing = cloudinaryMissing();
    console.log(
      cldMissing.length
        ? `[Cloudinary] chat photos OFF, missing: ${cldMissing.join(", ")}`
        : "[Cloudinary] chat photos ON",
    );

    scheduleCleanupDeletedProducts();
    scheduleExpireBoosts();
    scheduleExpireSubscriptions();
    scheduleDispatchNotifications();
    scheduleEmailAlerts();
    scheduleSweepVoiceFiles();
    // Start every job defined above (records runs for the admin console).
    startScheduledJobs();
    // Plan-rank backfill for listings (search ranking perk); idempotent.
    // Admins get Pro Plus first so the backfill ranks their listings too.
    ensureAdminPlans().then(backfillSellerTiers);

    const httpServer = http.createServer(app);
    initSockets(httpServer);

    // Graceful shutdown (deploys, nodemon restarts): stop accepting new
    // requests, give in-flight ones up to 8s to finish, then close Mongo.
    let shuttingDown = false;
    const shutdown = (signal) => {
      if (shuttingDown) return;
      shuttingDown = true;
      console.log(`[Server] ${signal} received, finishing in-flight requests…`);
      const force = setTimeout(() => process.exit(0), 8000);
      force.unref();
      httpServer.close(async () => {
        try {
          await mongoose.connection.close();
        } catch {
          // already closed
        }
        process.exit(0);
      });
      httpServer.closeIdleConnections?.();
    };
    process.on("SIGINT", () => shutdown("SIGINT"));
    process.on("SIGTERM", () => shutdown("SIGTERM"));

    httpServer.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error.message);
    process.exit(1);
  }
};

startServer();
