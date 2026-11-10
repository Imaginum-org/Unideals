/**
 * Read-only analytics for the admin console charts.
 *
 * Everything here is computed from real records at request time — there is
 * no cached or synthesised history. A series only has values where the
 * underlying collection has documents, so a new deployment shows empty
 * charts, not made-up ones.
 *
 * Dates are bucketed in the viewer's time zone (default Asia/Kolkata) so a
 * "day" matches the calendar day staff see in the UI.
 */
import mongoose from "mongoose";
import User from "../models/User.model.js";
import Product from "../models/Product.model.js";
import Campus from "../models/Campus.model.js";
import Report from "../models/Report.model.js";
import AuditLog from "../models/AuditLog.model.js";
import Deal from "../models/deal.model.js";
import Payment from "../models/Payment.model.js";
import { JobRun } from "../models/JobRun.model.js";
import { listJobDefinitions } from "../jobs/jobRegistry.js";
import { auditMatchFromQuery } from "./auditLog.service.js";
import {
  USER_ROLES,
  PRODUCT_STATUS,
  REPORT_STATUS,
  DEAL_STATUS,
  PAYMENT_STATUS,
} from "../config/constants.js";
import { campusIn, campusMatch, dealScopeStages, paymentScopeStages, reportScopeStages } from "./campusScope.service.js";

const DAY = 24 * 60 * 60 * 1000;
const MAX_SPAN_DAYS = 3 * 366;
const MAX_BUCKETS = 400;
export const INTERVALS = ["day", "week", "month"];
const DEFAULT_TZ = "Asia/Kolkata";
const STAFF_AND_USERS = { $in: [USER_ROLES.USER, USER_ROLES.SUPPORT] };
const MODERATED = { $in: ["Product", "User"] };

const badRequest = (message) => Object.assign(new Error(message), { statusCode: 400 });
const forbidden = (message) => Object.assign(new Error(message), { statusCode: 403 });

/**
 * Who may read what. ctx.can(section) says whether the caller can view a
 * section; a metric/dimension is readable through any of its sections (the
 * dashboard shows a summary of several). ctx.scope limits every number to the
 * caller's campuses (null = every campus).
 */
const FULL_CTX = { scope: null, can: () => true };
const allowed = (sections, ctx) => sections.some((section) => ctx.can(section));

// ─── Calendar helpers ──────────────────────────────────────────────────────
// A "calendar day" is represented as the UTC-midnight timestamp of that date,
// which makes day/week/month arithmetic exact regardless of time zone.

const parseDay = (value) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ""));
  if (!match) return null;
  const [y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const time = Date.UTC(y, m - 1, d);
  const date = new Date(time);
  return date.getUTCMonth() === m - 1 && date.getUTCDate() === d ? time : null;
};

const dayKey = (cal) => new Date(cal).toISOString().slice(0, 10);

const resolveTz = (tz) => {
  if (!tz) return DEFAULT_TZ;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return tz;
  } catch {
    return DEFAULT_TZ;
  }
};

// Offset (local − UTC, ms) of `tz` at `instant`.
const tzOffset = (instant, tz) => {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
      .formatToParts(new Date(instant))
      .map((part) => [part.type, part.value]),
  );
  const asUtc = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second);
  return asUtc - Math.floor(instant / 1000) * 1000;
};

// The instant local midnight of calendar day `cal` happens in `tz`.
const localMidnight = (cal, tz) => {
  const guess = cal - tzOffset(cal, tz);
  return cal - tzOffset(guess, tz);
};

// Today's calendar day in `tz`.
const todayIn = (tz, now = Date.now()) => {
  const local = now + tzOffset(now, tz);
  return Date.UTC(new Date(local).getUTCFullYear(), new Date(local).getUTCMonth(), new Date(local).getUTCDate());
};

const bucketStart = (cal, interval) => {
  const date = new Date(cal);
  if (interval === "week") return cal - ((date.getUTCDay() + 6) % 7) * DAY; // Monday
  if (interval === "month") return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1);
  return cal;
};

const nextBucket = (cal, interval) => {
  if (interval === "week") return cal + 7 * DAY;
  if (interval === "month") {
    const date = new Date(cal);
    return Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1);
  }
  return cal + DAY;
};

// Buckets covering [fromCal, toCal], each clipped to the range so a partial
// first/last week or month says exactly which days it holds.
const buildBuckets = (fromCal, toCal, interval) => {
  const buckets = [];
  for (let cal = bucketStart(fromCal, interval); cal <= toCal; cal = nextBucket(cal, interval)) {
    const end = nextBucket(cal, interval) - DAY;
    buckets.push({
      key: dayKey(cal),
      from: dayKey(Math.max(cal, fromCal)),
      to: dayKey(Math.min(end, toCal)),
      partial: cal < fromCal || end > toCal,
    });
  }
  return buckets;
};

const autoInterval = (spanDays) => (spanDays <= 45 ? "day" : spanDays <= 200 ? "week" : "month");

/**
 * Validates ?from=&to=&interval=&compareFrom=&compareTo=&tz= into a window.
 * Defaults: last 30 days, previous equal-length period for comparison.
 */
export const resolveWindow = (query = {}) => {
  const tz = resolveTz(query.tz);
  const today = todayIn(tz);
  const toCal = query.to ? parseDay(query.to) : today;
  const fromCal = query.from ? parseDay(query.from) : (toCal ?? today) - 29 * DAY;
  if (fromCal === null || toCal === null) throw badRequest("from/to must be YYYY-MM-DD dates");
  if (fromCal > toCal) throw badRequest("from must be on or before to");
  const spanDays = Math.round((toCal - fromCal) / DAY) + 1;
  if (spanDays > MAX_SPAN_DAYS) throw badRequest("Date range can be at most 3 years");

  let interval = INTERVALS.includes(query.interval) ? query.interval : autoInterval(spanDays);
  if (interval === "day" && spanDays > MAX_BUCKETS) interval = "week";

  let compareFromCal;
  let compareToCal;
  if (query.compareFrom || query.compareTo) {
    compareFromCal = parseDay(query.compareFrom);
    compareToCal = parseDay(query.compareTo);
    if (compareFromCal === null || compareToCal === null || compareFromCal > compareToCal) {
      throw badRequest("compareFrom/compareTo must be a valid date range");
    }
    if (Math.round((compareToCal - compareFromCal) / DAY) + 1 > MAX_SPAN_DAYS) throw badRequest("Comparison range is too long");
  } else {
    compareToCal = fromCal - DAY;
    compareFromCal = fromCal - spanDays * DAY;
  }

  const range = (a, b) => ({ $gte: new Date(localMidnight(a, tz)), $lt: new Date(localMidnight(b + DAY, tz)) });

  return {
    tz,
    interval,
    current: { fromCal, toCal, range: range(fromCal, toCal), from: dayKey(fromCal), to: dayKey(toCal) },
    previous: {
      fromCal: compareFromCal,
      toCal: compareToCal,
      range: range(compareFromCal, compareToCal),
      from: dayKey(compareFromCal),
      to: dayKey(compareToCal),
    },
  };
};

// ─── Trends ────────────────────────────────────────────────────────────────

// Legacy deals/payments may lack the specific timestamp; fall back the same
// way the dashboard totals do so charts and KPI cards agree.
const completedAt = { $ifNull: ["$completed_at", "$updatedAt"] };
const cancelledAt = { $ifNull: ["$cancelled_at", "$updatedAt"] };
const verifiedAt = { $ifNull: ["$verified_at", "$createdAt"] };
const reviewedAt = { $ifNull: ["$reviewed_at", "$updatedAt"] };

const byCreated = (range) => ({ createdAt: range });
const withFallback = (field, fallback) => (range) => ({
  $or: [{ [field]: range }, { [field]: null, [fallback]: range }],
});

// Campus filter per record type: { match } for direct fields, { stages } for lookups.
const SCOPES = {
  user: (scope) => ({ match: campusMatch(scope) }),
  listing: (scope) => ({ match: campusMatch(scope) }),
  deal: (scope) => ({ stages: dealScopeStages(scope) }),
  payment: (scope) => ({ stages: paymentScopeStages(scope) }),
  report: (scope) => ({ stages: reportScopeStages(scope) }),
  // Staff actions aren't tied to a campus (the audit log is platform-wide).
  none: () => ({}),
};

const DASH = "dashboard";

export const METRICS = {
  users: { model: User, base: { role: STAFF_AND_USERS }, date: "$createdAt", inRange: byCreated, sections: ["users", DASH], scope: "user" },
  listings: { model: Product, base: { is_deleted: false }, date: "$createdAt", inRange: byCreated, sections: ["listings", DASH], scope: "listing" },
  orders: { model: Deal, base: {}, date: "$createdAt", inRange: byCreated, sections: ["orders", DASH], scope: "deal" },
  deals: {
    model: Deal,
    base: { status: DEAL_STATUS.COMPLETED },
    date: completedAt,
    inRange: withFallback("completed_at", "updatedAt"),
    sections: ["orders", DASH],
    scope: "deal",
  },
  gmv: {
    sections: ["orders", DASH],
    scope: "deal",
    model: Deal,
    base: { status: DEAL_STATUS.COMPLETED },
    date: completedAt,
    inRange: withFallback("completed_at", "updatedAt"),
    value: "$current_price",
  },
  cancelled: {
    model: Deal,
    base: { status: DEAL_STATUS.CANCELLED },
    date: cancelledAt,
    inRange: withFallback("cancelled_at", "updatedAt"),
    sections: ["orders", DASH],
    scope: "deal",
  },
  // Payment.amount is paise; reported in rupees.
  revenue: {
    sections: [DASH],
    scope: "payment",
    model: Payment,
    base: { status: PAYMENT_STATUS.VERIFIED },
    date: verifiedAt,
    inRange: withFallback("verified_at", "createdAt"),
    value: "$amount",
    divisor: 100,
  },
  reports: { model: Report, base: { target_model: MODERATED }, date: "$createdAt", inRange: byCreated, sections: ["reports", DASH], scope: "report" },
  reportsClosed: {
    sections: ["reports", DASH],
    scope: "report",
    model: Report,
    base: { target_model: MODERATED, status: { $in: [REPORT_STATUS.ACTION_TAKEN, REPORT_STATUS.DISMISSED] } },
    date: reviewedAt,
    inRange: withFallback("reviewed_at", "updatedAt"),
  },
  staffActions: { model: AuditLog, base: {}, date: "$createdAt", inRange: byCreated, sections: ["auditLog"], scope: "none" },
};

const seriesFor = async (metric, window, period, extraMatch = {}, campusScope = null) => {
  const def = METRICS[metric];
  const scoped = SCOPES[def.scope](campusScope);
  const rows = await def.model
    .aggregate([
      { $match: { $and: [def.base, extraMatch, scoped.match || {}, def.inRange(period.range)] } },
      ...(scoped.stages || []),
      {
        $group: {
          _id: {
            $dateToString: {
              format: "%Y-%m-%d",
              timezone: window.tz,
              date: { $dateTrunc: { date: def.date, unit: window.interval, timezone: window.tz, startOfWeek: "monday" } },
            },
          },
          value: { $sum: def.value ? { $ifNull: [def.value, 0] } : 1 },
        },
      },
    ])
    .catch(() => []);
  const byKey = new Map(rows.map((row) => [row._id, row.value]));
  const buckets = buildBuckets(period.fromCal, period.toCal, window.interval);
  const raw = buckets.map((bucket) => byKey.get(bucket.key) || 0);
  const total = raw.reduce((sum, value) => sum + value, 0);
  const scale = (value) => Math.round(def.divisor ? value / def.divisor : value);
  return { buckets, values: raw.map(scale), total: scale(total) };
};

/**
 * Time series for the requested metrics over the current window and the
 * comparison window. `previous` buckets are aligned to `buckets` by index.
 */
export const getTrends = async (query = {}, ctx = FULL_CTX) => {
  const window = resolveWindow(query);
  const requested = String(query.metrics || "users,listings,deals,gmv,revenue")
    .split(",")
    .map((m) => m.trim())
    .filter((m) => METRICS[m]);
  const metrics = [...new Set(requested)];
  if (!metrics.length) throw badRequest(`metrics must include one of: ${Object.keys(METRICS).join(", ")}`);
  const blocked = metrics.filter((metric) => !allowed(METRICS[metric].sections, ctx));
  if (blocked.length) throw forbidden(`Your role doesn't have access to: ${blocked.join(", ")}`);
  if (buildBuckets(window.current.fromCal, window.current.toCal, window.interval).length > MAX_BUCKETS) {
    throw badRequest("Too many points; pick a longer interval");
  }

  // Audit filters (action/target/role/actor) narrow the staff-actions series
  // so the audit timeline matches the table below it.
  const auditMatch = metrics.includes("staffActions") ? auditMatchFromQuery({ ...query, from: "", to: "" }) : {};

  const results = await Promise.all(
    metrics.flatMap((metric) => {
      const extra = metric === "staffActions" ? auditMatch : {};
      return [
        seriesFor(metric, window, window.current, extra, ctx.scope),
        seriesFor(metric, window, window.previous, extra, ctx.scope),
      ];
    }),
  );

  const series = {};
  const previous = {};
  const totals = {};
  const previousTotals = {};
  metrics.forEach((metric, index) => {
    const current = results[index * 2];
    const prior = results[index * 2 + 1];
    series[metric] = current.values;
    totals[metric] = current.total;
    previous[metric] = current.buckets.map((_, i) => (i < prior.values.length ? prior.values[i] : null));
    previousTotals[metric] = prior.total;
  });

  const first = results[0];
  const prevBuckets = results[1].buckets;
  return {
    interval: window.interval,
    tz: window.tz,
    range: { from: window.current.from, to: window.current.to },
    compare: { from: window.previous.from, to: window.previous.to },
    buckets: first.buckets.map((bucket, i) => ({ ...bucket, previous: prevBuckets[i] ? { from: prevBuckets[i].from, to: prevBuckets[i].to } : null })),
    series,
    previous,
    totals,
    previousTotals,
  };
};

// ─── Breakdowns ────────────────────────────────────────────────────────────

const objectIdOrNull = (value) =>
  typeof value === "string" && mongoose.Types.ObjectId.isValid(value) ? new mongoose.Types.ObjectId(value) : null;

const toRows = (rows) =>
  rows
    .filter((row) => row._id !== null && row._id !== undefined && row._id !== "")
    .map((row) => ({ key: String(row._id), count: row.count }))
    .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));

// Open (pending) moderation items, one row per reported target — the same
// unit the Reports queue lists.
const pendingTargets = (extra = [], scope = null) =>
  Report.aggregate([
    { $match: { status: REPORT_STATUS.PENDING } },
    ...reportScopeStages(scope),
    {
      $group: {
        _id: { target_id: "$target_id", target_model: "$target_model" },
        reportCount: { $sum: 1 },
        reasons: { $addToSet: "$reason" },
      },
    },
    ...extra,
  ]);

// Each dimension: run(query, window, scope) plus the sections that can read it.
const DIMENSIONS = {
  // Current listing status mix (matches the Listings tab counts).
  listingStatus: async (query, window, scope) =>
    toRows(
      await Product.aggregate([{ $match: { is_deleted: false, ...campusMatch(scope) } }, { $group: { _id: "$status", count: { $sum: 1 } } }]),
    ),

  // Category mix, narrowed by the Listings page's status/campus filters.
  listingCategory: async (query, window, scope) => {
    const match = { is_deleted: false, ...campusMatch(scope) };
    if (query.listingStatus === "review") match.auto_hidden_at = { $ne: null };
    else if (Object.values(PRODUCT_STATUS).includes(query.listingStatus)) match.status = query.listingStatus;
    const campus = objectIdOrNull(query.campus);
    if (campus) match.$and = [{ campus_id: campus }];
    return toRows(await Product.aggregate([{ $match: match }, { $group: { _id: "$category", count: { $sum: 1 } } }]));
  },

  // Per active campus: users, live listings, and new users/listings in range.
  campusComparison: async (query, window, scope) => {
    const range = window.current.range;
    const campuses = await Campus.find({ is_active: true, ...(scope ? { _id: { $in: scope } } : {}) }).select("name short_name").lean();
    const ids = campuses.map((c) => c._id);
    // Legacy users may store campus_id as a string; normalise like the dashboard.
    const userCampus = { $convert: { input: "$campus_id", to: "objectId", onError: null, onNull: null } };
    const people = { role: STAFF_AND_USERS, ...(scope ? { campus_id: campusIn(scope) } : {}) };
    const [users, newUsers, live, newListings] = await Promise.all([
      User.aggregate([{ $match: people }, { $group: { _id: userCampus, count: { $sum: 1 } } }]),
      User.aggregate([{ $match: { ...people, createdAt: range } }, { $group: { _id: userCampus, count: { $sum: 1 } } }]),
      Product.aggregate([
        { $match: { is_deleted: false, status: PRODUCT_STATUS.LISTED, campus_id: { $in: ids } } },
        { $group: { _id: "$campus_id", count: { $sum: 1 } } },
      ]),
      Product.aggregate([
        { $match: { is_deleted: false, createdAt: range, campus_id: { $in: ids } } },
        { $group: { _id: "$campus_id", count: { $sum: 1 } } },
      ]),
    ]);
    const asMap = (rows) => new Map(rows.filter((r) => r._id).map((r) => [String(r._id), r.count]));
    const [u, nu, l, nl] = [asMap(users), asMap(newUsers), asMap(live), asMap(newListings)];
    return campuses
      .map((campus) => {
        const id = String(campus._id);
        return {
          key: id,
          name: campus.name,
          shortName: campus.short_name || "",
          users: u.get(id) || 0,
          newUsers: nu.get(id) || 0,
          liveListings: l.get(id) || 0,
          newListings: nl.get(id) || 0,
        };
      })
      .sort((a, b) => b.users - a.users || a.name.localeCompare(b.name));
  },

  // Reports filed in range, by their current status.
  reportStatus: async (query, window, scope) =>
    toRows(
      await Report.aggregate([
        { $match: { target_model: MODERATED, createdAt: window.current.range } },
        ...reportScopeStages(scope),
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
    ),

  // Open queue items by type (Listing / User / Help & support).
  queueType: async (query, window, scope) =>
    toRows(await pendingTargets([{ $group: { _id: "$_id.target_model", count: { $sum: 1 } } }], scope)),

  // Open listing/user items by priority (same thresholds as the queue badge).
  queuePriority: async (query, window, scope) =>
    toRows(
      await pendingTargets([
        { $match: { "_id.target_model": MODERATED } },
        {
          $group: {
            _id: {
              $switch: {
                branches: [
                  { case: { $gte: ["$reportCount", 5] }, then: "high" },
                  { case: { $gte: ["$reportCount", 2] }, then: "medium" },
                ],
                default: "low",
              },
            },
            count: { $sum: 1 },
          },
        },
      ], scope),
    ),

  // Open listing/user items by reason (an item counts once per reason).
  queueReason: async (query, window, scope) =>
    toRows(
      await pendingTargets([
        { $match: { "_id.target_model": MODERATED } },
        { $unwind: "$reasons" },
        { $group: { _id: "$reasons", count: { $sum: 1 } } },
      ], scope),
    ),

  // Audit entries in range by action, honouring the audit page filters.
  auditAction: async (query, window) =>
    toRows(
      await AuditLog.aggregate([
        { $match: { ...auditMatchFromQuery({ ...query, from: "", to: "" }), createdAt: window.current.range } },
        { $group: { _id: "$action", count: { $sum: 1 } } },
      ]),
    ),

  // Audit entries in range by staff member.
  auditActor: async (query, window) => {
    const rows = await AuditLog.aggregate([
      { $match: { ...auditMatchFromQuery({ ...query, from: "", to: "" }), createdAt: window.current.range } },
      { $group: { _id: "$actor_id", name: { $last: "$actor_name" }, role: { $last: "$actor_role" }, count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 15 },
    ]);
    return rows.filter((r) => r._id).map((r) => ({ key: String(r._id), name: r.name || "Unknown", role: r.role, count: r.count }));
  },
};

export const DIMENSION_KEYS = Object.keys(DIMENSIONS);

const DIMENSION_SECTIONS = {
  listingStatus: ["listings", DASH],
  listingCategory: ["listings", DASH],
  campusComparison: ["campuses", DASH],
  reportStatus: ["reports", DASH],
  queueType: ["reports", DASH],
  queuePriority: ["reports", DASH],
  queueReason: ["reports", DASH],
  auditAction: ["auditLog"],
  auditActor: ["auditLog"],
};

export const getBreakdowns = async (query = {}, ctx = FULL_CTX) => {
  const dims = [...new Set(String(query.dims || "").split(",").map((d) => d.trim()))].filter((d) => DIMENSIONS[d]);
  if (!dims.length) throw badRequest(`dims must include one of: ${DIMENSION_KEYS.join(", ")}`);
  const blocked = dims.filter((dim) => !allowed(DIMENSION_SECTIONS[dim], ctx));
  if (blocked.length) throw forbidden(`Your role doesn't have access to: ${blocked.join(", ")}`);
  const window = resolveWindow(query);
  const values = await Promise.all(dims.map((dim) => DIMENSIONS[dim](query, window, ctx.scope).catch(() => [])));
  return {
    range: { from: window.current.from, to: window.current.to },
    data: Object.fromEntries(dims.map((dim, i) => [dim, values[i]])),
  };
};

// ─── Background jobs ───────────────────────────────────────────────────────

/**
 * Recorded job runs in range: totals per job, a success/failed series and
 * per-run durations. Run history is kept for 30 days, and frequent jobs only
 * record runs that changed something or failed (see JobRun.model.js).
 */
export const getJobAnalytics = async (query = {}) => {
  const window = resolveWindow(query);
  const range = window.current.range;
  const definitions = listJobDefinitions();
  const names = new Map(definitions.map((d) => [d.key, d.name]));
  const keyFilter = typeof query.key === "string" && names.has(query.key) ? { key: query.key } : {};

  const [perJob, perBucket, runs] = await Promise.all([
    JobRun.aggregate([
      { $match: { ...keyFilter, started_at: range, status: { $ne: "running" } } },
      {
        $group: {
          _id: "$key",
          success: { $sum: { $cond: [{ $eq: ["$status", "success"] }, 1, 0] } },
          failed: { $sum: { $cond: [{ $eq: ["$status", "failed"] }, 1, 0] } },
          avgMs: { $avg: "$duration_ms" },
          maxMs: { $max: "$duration_ms" },
        },
      },
    ]),
    JobRun.aggregate([
      { $match: { ...keyFilter, started_at: range, status: { $ne: "running" } } },
      {
        $group: {
          _id: {
            bucket: {
              $dateToString: {
                format: "%Y-%m-%d",
                timezone: window.tz,
                date: { $dateTrunc: { date: "$started_at", unit: window.interval, timezone: window.tz, startOfWeek: "monday" } },
              },
            },
            status: "$status",
          },
          count: { $sum: 1 },
        },
      },
    ]),
    JobRun.find({ ...keyFilter, started_at: range, status: { $ne: "running" }, duration_ms: { $ne: null } })
      .sort({ started_at: -1 })
      .limit(500)
      .select("key started_at duration_ms status trigger")
      .lean(),
  ]);

  const buckets = buildBuckets(window.current.fromCal, window.current.toCal, window.interval);
  const counts = new Map(perBucket.map((row) => [`${row._id.bucket}|${row._id.status}`, row.count]));
  const statsByKey = new Map(perJob.map((row) => [row._id, row]));

  return {
    interval: window.interval,
    range: { from: window.current.from, to: window.current.to },
    buckets,
    series: {
      success: buckets.map((b) => counts.get(`${b.key}|success`) || 0),
      failed: buckets.map((b) => counts.get(`${b.key}|failed`) || 0),
    },
    jobs: definitions
      .filter((d) => !keyFilter.key || d.key === keyFilter.key)
      .map((d) => {
        const row = statsByKey.get(d.key);
        return {
          key: d.key,
          name: d.name,
          frequent: d.frequent,
          success: row?.success || 0,
          failed: row?.failed || 0,
          avgMs: row?.avgMs != null ? Math.round(row.avgMs) : null,
          maxMs: row?.maxMs ?? null,
        };
      }),
    runs: runs
      .reverse()
      .map((run) => ({ key: run.key, at: run.started_at, ms: run.duration_ms, status: run.status, trigger: run.trigger })),
  };
};
