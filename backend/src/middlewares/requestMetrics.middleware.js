/**
 * In-memory API traffic metrics for the admin "Service status" page.
 *
 * Records every /api request into one-minute buckets (last 60 minutes),
 * grouped by API area: /api/product/... -> "product", /api/admin/... ->
 * "admin". Per bucket: request count, 4xx, 5xx and a capped latency
 * sample for percentiles.
 *
 * Per process and reset on restart. With several server instances each
 * reports its own traffic.
 */

const WINDOW_MINUTES = 60;
const MAX_SAMPLES_PER_BUCKET = 300;
// Don't let the status page's own polling skew the numbers.
const IGNORED_PATHS = ["/api/admin/system/status"];

const buckets = new Map(); // minuteStart(ms) -> Map(area -> stats)
const startedAt = Date.now();

const minuteOf = (time) => Math.floor(time / 60000) * 60000;

const areaOf = (path) => {
  const match = /^\/api\/([a-z0-9-]+)/i.exec(path);
  return match ? match[1].toLowerCase() : null;
};

const prune = (now) => {
  const oldest = minuteOf(now) - (WINDOW_MINUTES - 1) * 60000;
  for (const key of buckets.keys()) if (key < oldest) buckets.delete(key);
};

const record = (area, status, durationMs, now) => {
  const minute = minuteOf(now);
  let bucket = buckets.get(minute);
  if (!bucket) {
    bucket = new Map();
    buckets.set(minute, bucket);
    prune(now);
  }
  let stats = bucket.get(area);
  if (!stats) {
    stats = { count: 0, clientErrors: 0, serverErrors: 0, samples: [] };
    bucket.set(area, stats);
  }
  stats.count += 1;
  if (status >= 500) stats.serverErrors += 1;
  else if (status >= 400) stats.clientErrors += 1;
  if (stats.samples.length < MAX_SAMPLES_PER_BUCKET) stats.samples.push(durationMs);
  else stats.samples[Math.floor(Math.random() * MAX_SAMPLES_PER_BUCKET)] = durationMs;
};

export const requestMetrics = (req, res, next) => {
  const path = req.originalUrl.split("?")[0];
  const area = areaOf(path);
  if (!area || IGNORED_PATHS.includes(path)) return next();
  const start = process.hrtime.bigint();
  res.on("finish", () => {
    const durationMs = Number(process.hrtime.bigint() - start) / 1e6;
    record(area, res.statusCode, durationMs, Date.now());
  });
  return next();
};

const percentile = (sorted, p) => {
  if (!sorted.length) return null;
  const index = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return Math.round(sorted[Math.max(0, index)]);
};

const summarize = (statsList) => {
  const count = statsList.reduce((sum, s) => sum + s.count, 0);
  const serverErrors = statsList.reduce((sum, s) => sum + s.serverErrors, 0);
  const clientErrors = statsList.reduce((sum, s) => sum + s.clientErrors, 0);
  const samples = statsList.flatMap((s) => s.samples).sort((a, b) => a - b);
  return {
    requests: count,
    serverErrors,
    clientErrors,
    errorRate: count ? Number(((serverErrors / count) * 100).toFixed(2)) : 0,
    p50: percentile(samples, 50),
    p95: percentile(samples, 95),
  };
};

/**
 * Traffic over the last `minutes` (max 60): totals, per-area breakdown and
 * a per-minute series for charts.
 */
export const getTrafficSnapshot = (minutes = 15, now = Date.now()) => {
  const span = Math.min(WINDOW_MINUTES, Math.max(1, minutes));
  const currentMinute = minuteOf(now);
  const series = [];
  const byArea = new Map();
  const all = [];

  for (let i = span - 1; i >= 0; i--) {
    const minute = currentMinute - i * 60000;
    const bucket = buckets.get(minute);
    const minuteStats = bucket ? [...bucket.values()] : [];
    const summary = summarize(minuteStats);
    series.push({ minute: new Date(minute).toISOString(), requests: summary.requests, serverErrors: summary.serverErrors, p95: summary.p95 });
    if (bucket) {
      for (const [area, stats] of bucket) {
        if (!byArea.has(area)) byArea.set(area, []);
        byArea.get(area).push(stats);
        all.push(stats);
      }
    }
  }

  return {
    windowMinutes: span,
    collectingSince: new Date(startedAt).toISOString(),
    totals: summarize(all),
    areas: [...byArea.entries()]
      .map(([area, statsList]) => ({ area, ...summarize(statsList) }))
      .sort((a, b) => b.requests - a.requests),
    series,
  };
};

// Test hook.
export const __resetMetrics = () => buckets.clear();
export const __record = record;
