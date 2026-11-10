import os from "node:os";
import { monitorEventLoopDelay } from "node:perf_hooks";
import mongoose from "mongoose";
import { getIO } from "../utils/socket.js";
import { JobState } from "../models/JobRun.model.js";
import { getTrafficSnapshot } from "../middlewares/requestMetrics.middleware.js";

/**
 * Health of the API and everything it depends on, for the admin
 * "Service status" page.
 *
 * Component states: operational | degraded | outage | not_configured.
 * External services are checked for *reachability from this server* (any
 * HTTP response within the timeout counts) plus whether their keys are set.
 * That catches network/DNS/provider outages and missing config, but not a
 * revoked key; real failures with a provider show up as 5xx in API traffic.
 */

const EXTERNAL_TIMEOUT_MS = 4000;
const EXTERNAL_CACHE_MS = 60_000;

const loopDelay = monitorEventLoopDelay({ resolution: 20 });
loopDelay.enable();

const SEVERITY = { operational: 0, not_configured: 0, degraded: 1, outage: 2 };
const worst = (states) =>
  states.reduce((acc, s) => (SEVERITY[s] > SEVERITY[acc] ? s : acc), "operational");

const isSet = (...names) => names.every((n) => Boolean(process.env[n] && String(process.env[n]).trim()));

// ─── Database ─────────────────────────────────────────────────────────────

const READY_STATES = { 0: "disconnected", 1: "connected", 2: "connecting", 3: "disconnecting" };

const checkDatabase = async () => {
  const state = READY_STATES[mongoose.connection.readyState] || "unknown";
  if (state !== "connected") {
    return { status: "outage", detail: `MongoDB is ${state}`, latencyMs: null };
  }
  const start = Date.now();
  try {
    await Promise.race([
      mongoose.connection.db.admin().ping(),
      new Promise((_, reject) => setTimeout(() => reject(new Error("Ping timed out")), 3000)),
    ]);
    const latencyMs = Date.now() - start;
    return {
      status: latencyMs > 500 ? "degraded" : "operational",
      detail: latencyMs > 500 ? "Responding slowly" : "Connected",
      latencyMs,
    };
  } catch (error) {
    return { status: "outage", detail: error.message || "Ping failed", latencyMs: null };
  }
};

// ─── External services ────────────────────────────────────────────────────

const EXTERNAL_SERVICES = [
  {
    key: "payments",
    name: "Payments (Razorpay)",
    description: "Plan and boost checkout",
    env: ["RAZORPAY_KEY_ID", "RAZORPAY_KEY_SECRET"],
    url: () => "https://api.razorpay.com/v1/",
    required: true,
  },
  {
    key: "images",
    name: "Image hosting (ImageKit)",
    description: "Listing photos and avatars",
    env: ["IMAGEKIT_PUBLIC_KEY", "IMAGEKIT_PRIVATE_KEY", "IMAGEKIT_URL_ENDPOINT"],
    url: () => process.env.IMAGEKIT_URL_ENDPOINT,
    required: true,
  },
  {
    key: "email",
    name: "Email (Resend)",
    description: "Verification and password-reset emails",
    env: ["RESEND_API_KEY"],
    url: () => "https://api.resend.com/",
    required: true,
  },
  {
    key: "google-signin",
    name: "Google sign-in",
    description: "Sign in with Google",
    env: ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"],
    url: () => "https://accounts.google.com/.well-known/openid-configuration",
    required: false,
  },
  {
    key: "assistant",
    name: "AI assistant (Gemini)",
    description: "In-app chat assistant",
    env: ["GEMINI_API_KEY"],
    url: () => "https://generativelanguage.googleapis.com/",
    required: false,
  },
];

let externalCache = { at: 0, results: null };

const probe = async (url) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), EXTERNAL_TIMEOUT_MS);
  const start = Date.now();
  try {
    const response = await fetch(url, { method: "GET", redirect: "manual", signal: controller.signal });
    const latencyMs = Date.now() - start;
    // Any HTTP answer means the provider is reachable; 5xx means it's struggling.
    if (response.status >= 500) return { status: "degraded", detail: `Responded ${response.status}`, latencyMs };
    return { status: latencyMs > 2500 ? "degraded" : "operational", detail: latencyMs > 2500 ? "Slow to respond" : "Reachable", latencyMs };
  } catch (error) {
    return {
      status: "outage",
      detail: error.name === "AbortError" ? `No response in ${EXTERNAL_TIMEOUT_MS / 1000}s` : "Unreachable from server",
      latencyMs: null,
    };
  } finally {
    clearTimeout(timer);
  }
};

const checkExternal = async ({ force = false } = {}) => {
  const age = Date.now() - externalCache.at;
  // Forced rechecks are still throttled to one per 15s.
  if (externalCache.results && (age < 15_000 || (!force && age < EXTERNAL_CACHE_MS))) {
    return externalCache.results;
  }
  const results = await Promise.all(
    EXTERNAL_SERVICES.map(async (service) => {
      const base = { key: service.key, name: service.name, description: service.description, group: "external" };
      if (!isSet(...service.env)) {
        return {
          ...base,
          status: service.required ? "outage" : "not_configured",
          detail: service.required ? "Credentials missing on the server" : "Not configured (optional)",
          latencyMs: null,
        };
      }
      const url = service.url();
      if (!url) return { ...base, status: "outage", detail: "No endpoint configured", latencyMs: null };
      return { ...base, ...(await probe(url)) };
    }),
  );
  externalCache = { at: Date.now(), results };
  return results;
};

// ─── Internal components ──────────────────────────────────────────────────

const checkRealtime = () => {
  const io = getIO();
  if (!io) return { status: "outage", detail: "Socket server not started", connections: 0 };
  const connections = io.engine?.clientsCount ?? 0;
  return { status: "operational", detail: `${connections} live connection${connections === 1 ? "" : "s"}`, connections };
};

const checkJobs = async () => {
  try {
    const failing = await JobState.find({ last_status: "failed" }).select("key").lean();
    if (!failing.length) return { status: "operational", detail: "No failing jobs", failing: [] };
    return {
      status: "degraded",
      detail: `${failing.length} job${failing.length === 1 ? "" : "s"} failing`,
      failing: failing.map((j) => j.key),
    };
  } catch {
    return { status: "degraded", detail: "Could not read job status", failing: [] };
  }
};

const checkApi = (traffic) => {
  const { requests, errorRate, p95 } = traffic.totals;
  // Need a minimum sample before calling it degraded.
  if (requests >= 20 && errorRate >= 25) return { status: "outage", detail: `${errorRate}% of requests failing` };
  if (requests >= 20 && errorRate >= 5) return { status: "degraded", detail: `${errorRate}% of requests failing` };
  if (p95 !== null && p95 > 2000) return { status: "degraded", detail: `Slow: 95% of requests under ${p95} ms` };
  return { status: "operational", detail: requests ? "Serving requests normally" : "No traffic in this window" };
};

const processInfo = () => {
  const memory = process.memoryUsage();
  return {
    uptimeSeconds: Math.round(process.uptime()),
    startedAt: new Date(Date.now() - process.uptime() * 1000).toISOString(),
    nodeVersion: process.version,
    environment: process.env.NODE_ENV || "development",
    memory: { rssMb: Math.round(memory.rss / 1048576), heapUsedMb: Math.round(memory.heapUsed / 1048576), heapTotalMb: Math.round(memory.heapTotal / 1048576) },
    eventLoopLagMs: { p50: Math.round(loopDelay.percentile(50) / 1e6), p99: Math.round(loopDelay.percentile(99) / 1e6) },
    loadAverage: os.loadavg().map((n) => Number(n.toFixed(2))),
    cpuCount: os.cpus().length,
  };
};

export const getSystemStatus = async ({ windowMinutes = 15, refreshExternal = false } = {}) => {
  const traffic = getTrafficSnapshot(windowMinutes);
  const [database, jobs, external] = await Promise.all([checkDatabase(), checkJobs(), checkExternal({ force: refreshExternal })]);
  const realtime = checkRealtime();
  const api = checkApi(traffic);
  const proc = processInfo();
  const loopStatus = proc.eventLoopLagMs.p99 > 500 ? "degraded" : "operational";

  const components = [
    { key: "api", name: "API server", description: "REST API for the app and this console", group: "core", ...api, latencyMs: traffic.totals.p95 },
    { key: "database", name: "Database (MongoDB)", description: "All marketplace data", group: "core", ...database },
    { key: "realtime", name: "Realtime (Socket.io)", description: "Chat, live notifications, deal updates", group: "core", ...realtime },
    { key: "jobs", name: "Background jobs", description: "Expiry, cleanup and scheduled sends", group: "core", ...jobs },
    {
      key: "runtime",
      name: "Server runtime",
      description: "Node.js process responsiveness",
      group: "core",
      status: loopStatus,
      detail: loopStatus === "degraded" ? `Event loop blocked up to ${proc.eventLoopLagMs.p99} ms` : "Responsive",
      latencyMs: proc.eventLoopLagMs.p99,
    },
    ...external,
  ];

  // Optional services that aren't configured don't affect the overall state.
  const overall = worst(components.map((c) => c.status));
  loopDelay.reset();

  return {
    overall,
    checkedAt: new Date().toISOString(),
    externalCheckedAt: new Date(externalCache.at).toISOString(),
    components,
    traffic,
    process: proc,
  };
};

// Test hook.
export const __resetExternalCache = () => {
  externalCache = { at: 0, results: null };
};
