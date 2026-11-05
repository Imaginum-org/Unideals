import dotenv from "dotenv";
dotenv.config();

import app from "./src/app.js";
import { connectDB } from "./src/config/db.js";
import { scheduleCleanupDeletedProducts } from "./src/jobs/cleanupDeletedProducts.job.js";
import { scheduleExpireBoosts } from "./src/jobs/expireBoosts.job.js";

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();

    scheduleCleanupDeletedProducts();
    scheduleExpireBoosts();

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error.message);
    process.exit(1);
  }
};

startServer();
