// MongoDB connection
// right now basic set up - will update when going to production and add more options for connection like retryWrites
import mongoose from "mongoose";

// Checked when connecting, not at import, so importing this module (via
// app.js) never crashes tests or scripts; server.js validates env first.
export const connectDB = async () => {
  if (!process.env.MONGO_URL) {
    console.error("MongoDB connection failed: MONGO_URL is not set");
    process.exit(1);
  }
  try {
    // Pool sized per instance (Atlas caps total connections per tier, so
    // instances × MONGO_MAX_POOL must stay under it). A few warm sockets
    // avoid connect latency on the first requests after idle; idle extras
    // are released after a minute.
    const num = (v, d) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : d);
    await mongoose.connect(process.env.MONGO_URL, {
      serverSelectionTimeoutMS: 15000, // 15s timeout for Atlas cluster discovery & DNS lookup
      socketTimeoutMS: 45000,
      maxPoolSize: num(process.env.MONGO_MAX_POOL, 20),
      minPoolSize: num(process.env.MONGO_MIN_POOL, 2),
      maxIdleTimeMS: 60000,
      // Retry a write once on a transient network/failover error.
      retryWrites: true,
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

// Shutdown is handled in server.js: it stops taking requests and lets the
// in-flight ones finish BEFORE closing this connection (closing first is
// what produced "MongoClientClosedError: Operation interrupted").
