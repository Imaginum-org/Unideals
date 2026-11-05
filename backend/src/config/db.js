// MongoDB connection
// right now basic set up - will update when going to production and add more options for connection like retryWrites
import mongoose from "mongoose";

if (!process.env.MONGO_URL) {
  throw new Error("MONGO_URL not found in .env file");
}

export const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URL, {
      serverSelectionTimeoutMS: 15000, // 15s timeout for Atlas cluster discovery & DNS lookup
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
    });

    console.log(`MongoDB connected: ${mongoose.connection.host}`);
  } catch (err) {
    console.error("MongoDB connection failed:", err.message);
    // PM2 / Docker / K8s will restart the app
    process.exit(1);
  }
};

// Connection Events
mongoose.connection.on("error", (err) => {
  console.error("MongoDB runtime error:", err);
});
mongoose.connection.on("disconnected", () => {
  console.warn("MongoDB disconnected");
});

// Graceful Shutdown
const gracefulShutdown = async () => {
  try {
    await mongoose.connection.close();
    console.log("MongoDB connection closed");
    process.exit(0);
  } catch (err) {
    console.error("Error while closing MongoDB connection:", err);
    process.exit(1);
  }
};

process.on("SIGINT", gracefulShutdown);
process.on("SIGTERM", gracefulShutdown);
