import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import helmet from "helmet";

import xss from "xss";

import authRouter from "./routes/auth.routes.js";
import userRouter from "./routes/user.routes.js";
import productRouter from "./routes/product.routes.js";
import reportRouter from "./routes/report.routes.js";
import pickupSpotRouter from "./routes/pickupSpot.routes.js";
import imagekitRouter from "./routes/imagekit.routes.js";
import wishlistRouter from "./routes/wishlist.routes.js";
import adminRouter from "./routes/admin.routes.js";
import boostRouter from "./routes/boost.routes.js";
import paymentRouter, { paymentWebhookHandler } from "./routes/payment.routes.js";

// import errorMiddleware from "./middlewares/error.middleware.js";
const app = express();

const allowedOrigins = [
  process.env.FRONTEND_URL,
  process.env.ADMIN_FRONTEND_URL,
]
  .filter(Boolean)
  .flatMap((origin) => origin.split(","))
  .map((origin) => origin.trim())
  .filter(Boolean);

// In non-production, allow local dev origins alongside configured ones.
const isProduction = process.env.NODE_ENV === "production";
const devOrigins = isProduction
  ? []
  : ["http://localhost:5173", "http://127.0.0.1:5173"];

// Protection against XSS attacks, clickjacking, malicious headers
app.use(
  helmet({
    crossOriginResourcePolicy: false,
  }),
);

// Prevent NoSQL injection - deep sanitize body, params, query, cookies
app.use((req, res, next) => {
  const sanitize = (obj, seen = new WeakSet()) => {
    if (!obj || typeof obj !== "object" || seen.has(obj)) return;
    seen.add(obj);

    for (const key of Object.keys(obj)) {
      if (key.includes("$") || key.includes(".")) {
        delete obj[key];
        continue;
      }
      const val = obj[key];
      if (typeof val === "object" && val !== null) {
        sanitize(val, seen);
      }
    }
  };

  sanitize(req.body);
  sanitize(req.params);
  // req.query is a getter in Express 5 - sanitize in place when possible,
  // otherwise replace with a cleaned copy.
  try {
    if (req.query && typeof req.query === "object") {
      sanitize(req.query);
    }
  } catch {
    // ignore - query validation happens downstream
  }
  if (req.cookies && typeof req.cookies === "object") {
    sanitize(req.cookies);
  }

  next();
});

// Prevent XSS attacks - deep sanitize strings in body/params/query
app.use((req, res, next) => {
  const sanitizeStrings = (obj, seen = new WeakSet()) => {
    if (!obj || typeof obj !== "object" || seen.has(obj)) return;
    seen.add(obj);
    for (const key of Object.keys(obj)) {
      const val = obj[key];
      if (typeof val === "string") {
        obj[key] = xss(val);
      } else if (Array.isArray(val)) {
        for (let i = 0; i < val.length; i++) {
          if (typeof val[i] === "string") val[i] = xss(val[i]);
          else if (typeof val[i] === "object" && val[i] !== null)
            sanitizeStrings(val[i], seen);
        }
      } else if (typeof val === "object" && val !== null) {
        sanitizeStrings(val, seen);
      }
    }
  };

  if (req.body) sanitizeStrings(req.body);
  if (req.params) sanitizeStrings(req.params);
  try {
    if (req.query) sanitizeStrings(req.query);
  } catch {
    // ignore
  }

  next();
});

app.use(
  cors({
    origin: (origin, callback) => {
      // Non-browser clients (curl, Postman, health checks) send no Origin.
      // Allow them without credentials risk since CSRF requires a browser Origin.
      if (!origin) {
        return callback(null, true);
      }
      if (
        allowedOrigins.includes(origin) ||
        devOrigins.includes(origin)
      ) {
        return callback(null, true);
      }

      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true, // allows cookies
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  }),
);

app.use(express.json({ limit: "10kb" })); // To prevent large payload attacks
app.use(express.urlencoded({ extended: true, limit: "10kb" })); // Handles form data from frontend
app.use(cookieParser());

// Razorpay webhook needs the RAW body for HMAC verification, so it is
// mounted with express.raw and handled before any JSON parsing of that path.
// (Router-level: POST /api/payments/webhook, no auth — signature is the auth.)
app.post(
  "/api/payments/webhook",
  express.raw({ type: "application/json", limit: "1mb" }),
  paymentWebhookHandler,
);

// Logging in Development mode only - redact secrets from URLs
if (process.env.NODE_ENV !== "production") {
  morgan.token("redacted-url", (req) => {
    try {
      const url = req.originalUrl || req.url || "";
      return url
        .replace(/(oauth_code|code|token)=[^&]*/gi, "$1=[REDACTED]")
        .replace(/\/reset-password\/[^/\s?]+/gi, "/reset-password/[REDACTED]");
    } catch {
      return req.url;
    }
  });
  app.use(morgan(":method :redacted-url :status :response-time ms"));
}

// Health check route
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    uptime: process.uptime(),
    timestamp: new Date(),
  });
});

// Routes
app.use("/api/auth", authRouter);
app.use("/api/user", userRouter);
app.use("/api/product", productRouter);
app.use("/api/report", reportRouter);
app.use("/api/pickup-spots", pickupSpotRouter);
app.use("/api/imagekit", imagekitRouter);
app.use("/api/wishlist", wishlistRouter);
app.use("/api/admin", adminRouter);
app.use("/api/boost", boostRouter);
app.use("/api/payments", paymentRouter);

// If no route matches
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

// Global error handler - never leak internals, preserve status codes
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || err.status || 500;

  // Log full error server-side only
  console.error(err);

  // Map known DB/driver errors to safe messages without leaking details
  let message = err.message || "Something went wrong";
  if (err.name === "CastError") {
    return res.status(400).json({ success: false, message: "Invalid ID format" });
  }
  if (err.code === 11000) {
    return res.status(409).json({ success: false, message: "Duplicate entry" });
  }
  if (err.name === "ValidationError") {
    return res.status(400).json({ success: false, message: "Validation failed" });
  }
  // Don't expose 5xx internals to clients
  if (statusCode >= 500) {
    message = "Internal server error";
  }

  return res.status(statusCode).json({
    success: false,
    message,
    ...(err.code ? { code: err.code } : {}),
  });
});

export default app;
