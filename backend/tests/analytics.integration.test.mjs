// Run: node tests/analytics.integration.test.mjs
// Admin analytics: trend bucketing (time zone, intervals, comparison
// windows), breakdowns and queue drill-down filters, against in-memory MongoDB.
import assert from "node:assert/strict";
import { MongoMemoryServer } from "mongodb-memory-server";

const B = new URL("../", import.meta.url).href;
process.env.IMAGEKIT_URL_ENDPOINT = "";
process.env.SECRET_KEY_ACCESS_TOKEN = "t";
process.env.SECRET_KEY_REFRESH_TOKEN = "t";

const mongod = await MongoMemoryServer.create();
const { default: mongoose } = await import(B + "node_modules/mongoose/index.js");
await mongoose.connect(mongod.getUri());

const { default: User } = await import(B + "src/models/User.model.js");
const { default: Product } = await import(B + "src/models/Product.model.js");
const { default: Campus } = await import(B + "src/models/Campus.model.js");
const { default: Report } = await import(B + "src/models/Report.model.js");
const { default: Deal } = await import(B + "src/models/deal.model.js");
const { default: Payment } = await import(B + "src/models/Payment.model.js");
const { default: AuditLog } = await import(B + "src/models/AuditLog.model.js");
const { JobRun } = await import(B + "src/models/JobRun.model.js");
const analytics = await import(B + "src/services/analytics.service.js");
const adminSvc = await import(B + "src/services/admin.service.js");

let passed = 0;
let failed = 0;
const test = async (name, fn) => {
  try {
    await fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failed++;
    console.log(`  ✗ ${name}\n    ${err.stack.split("\n").slice(0, 3).join("\n    ")}`);
  }
};

const oid = () => new mongoose.Types.ObjectId();
const at = (iso) => new Date(iso);
// Raw inserts: exact timestamps, no unrelated required fields.
const raw = (Model, docs) => Model.collection.insertMany(docs.map((d) => ({ _id: oid(), ...d })));

const vit = await Campus.create({ slug: "vit", name: "VIT Vellore", short_name: "VIT", is_active: true });
const iit = await Campus.create({ slug: "iit", name: "IIT Delhi", short_name: "IIT", is_active: true });

await raw(User, [
  // 2026-03-09 20:00Z is 10 Mar 01:30 in India: must land on 10 Mar (IST).
  { name: "A", email: "a@t", role: "user", status: "active", campus_id: vit._id, createdAt: at("2026-03-09T20:00:00Z") },
  { name: "B", email: "b@t", role: "user", status: "active", campus_id: vit._id, createdAt: at("2026-03-10T08:00:00Z") },
  { name: "C", email: "c@t", role: "user", status: "suspended", campus_id: String(iit._id), createdAt: at("2026-03-12T08:00:00Z") },
  // Previous period (1–9 Mar is the comparison for 10–18 Mar).
  { name: "D", email: "d@t", role: "user", status: "active", campus_id: iit._id, createdAt: at("2026-03-02T08:00:00Z") },
  // Admins never count as users.
  { name: "Z", email: "z@t", role: "admin", status: "active", createdAt: at("2026-03-11T08:00:00Z") },
]);
const staffId = oid();

await raw(Product, [
  { title: "P1", status: "listed", category: "electronics", campus_id: vit._id, is_deleted: false, createdAt: at("2026-03-10T08:00:00Z") },
  { title: "P2", status: "sold", category: "electronics", campus_id: vit._id, is_deleted: false, createdAt: at("2026-03-11T08:00:00Z") },
  { title: "P3", status: "blocked", category: "sports", campus_id: iit._id, is_deleted: false, auto_hidden_at: at("2026-03-12T00:00:00Z"), createdAt: at("2026-03-12T08:00:00Z") },
  { title: "P4", status: "listed", category: "sports", campus_id: iit._id, is_deleted: true, createdAt: at("2026-03-12T08:00:00Z") },
]);

await raw(Deal, [
  { conversation_id: oid(), status: "completed", current_price: 500, completed_at: at("2026-03-10T09:00:00Z"), createdAt: at("2026-03-05T09:00:00Z"), updatedAt: at("2026-03-10T09:00:00Z") },
  // Legacy: no completed_at, falls back to updatedAt.
  { conversation_id: oid(), status: "completed", current_price: 300, completed_at: null, createdAt: at("2026-03-11T09:00:00Z"), updatedAt: at("2026-03-12T09:00:00Z") },
  { conversation_id: oid(), status: "completed", current_price: 1000, completed_at: at("2026-03-03T09:00:00Z"), createdAt: at("2026-03-01T09:00:00Z"), updatedAt: at("2026-03-03T09:00:00Z") },
  { conversation_id: oid(), status: "cancelled", current_price: 200, cancelled_at: at("2026-03-13T09:00:00Z"), createdAt: at("2026-03-13T08:00:00Z"), updatedAt: at("2026-03-13T09:00:00Z") },
]);

await raw(Payment, [
  { status: "verified", amount: 9900, verified_at: at("2026-03-10T09:00:00Z"), createdAt: at("2026-03-10T09:00:00Z") },
  { status: "failed", amount: 9900, createdAt: at("2026-03-10T09:00:00Z") },
]);

const t1 = oid();
const t2 = oid();
const u1 = oid();
await raw(Report, [
  ...Array.from({ length: 5 }, (_, i) => ({ target_id: t1, target_model: "Product", reason: i ? "spam_or_advertisement" : "fraud_or_scam", status: "pending", createdAt: at("2026-03-11T08:00:00Z") })),
  { target_id: t2, target_model: "Product", reason: "spam_or_advertisement", status: "pending", createdAt: at("2026-03-11T08:00:00Z") },
  { target_id: u1, target_model: "User", reason: "fraud_or_scam", status: "pending", createdAt: at("2026-03-11T08:00:00Z") },
  { target_id: u1, target_model: "User", reason: "fraud_or_scam", status: "pending", createdAt: at("2026-03-12T08:00:00Z") },
  { target_id: oid(), target_model: "Product", reason: "other", status: "dismissed", reviewed_at: at("2026-03-13T08:00:00Z"), createdAt: at("2026-03-11T08:00:00Z") },
  { target_id: oid(), target_model: "Support", reason: "Help", status: "pending", createdAt: at("2026-03-11T08:00:00Z") },
]);

await raw(AuditLog, [
  { actor_id: staffId, actor_name: "Asha", actor_role: "admin", action: "product.block", target_type: "product", createdAt: at("2026-03-11T08:00:00Z") },
  { actor_id: staffId, actor_name: "Asha", actor_role: "admin", action: "user.suspend", target_type: "user", createdAt: at("2026-03-12T08:00:00Z") },
  { actor_id: oid(), actor_name: "Sam", actor_role: "support", action: "report.dismiss", target_type: "report", createdAt: at("2026-03-12T08:00:00Z") },
]);

await raw(JobRun, [
  { key: "boosts.expire", status: "success", started_at: at("2026-03-10T08:00:00Z"), duration_ms: 40, trigger: "schedule" },
  { key: "boosts.expire", status: "failed", started_at: at("2026-03-11T08:00:00Z"), duration_ms: 90, trigger: "schedule" },
  { key: "boosts.expire", status: "running", started_at: at("2026-03-12T08:00:00Z"), duration_ms: null, trigger: "schedule" },
]);

const RANGE = { from: "2026-03-10", to: "2026-03-18", tz: "Asia/Kolkata" };

console.log("analytics");

await test("daily trends bucket in the viewer's time zone and compare with the previous period", async () => {
  const result = await analytics.getTrends({ ...RANGE, metrics: "users,listings,deals,gmv,revenue,orders,cancelled", interval: "day" });
  assert.equal(result.interval, "day");
  assert.equal(result.buckets.length, 9);
  assert.equal(result.buckets[0].key, "2026-03-10");
  assert.deepEqual(result.compare, { from: "2026-03-01", to: "2026-03-09" });
  assert.equal(result.series.users[0], 2, "the 20:00Z sign-up is 10 Mar in India");
  assert.equal(result.totals.users, 3, "admins excluded");
  assert.equal(result.previousTotals.users, 1);
  assert.equal(result.totals.listings, 3, "deleted listings excluded");
  assert.equal(result.totals.deals, 2);
  assert.equal(result.series.deals[2], 1, "legacy deal counted on its updatedAt day");
  assert.equal(result.totals.gmv, 800);
  assert.equal(result.previousTotals.gmv, 1000);
  assert.equal(result.totals.revenue, 99, "paise → rupees, verified only");
  assert.equal(result.totals.orders, 2, "deals started in range");
  assert.equal(result.totals.cancelled, 1);
  assert.equal(result.previous.users.length, result.buckets.length);
});

await test("weekly buckets start on Monday and are clipped to the range", async () => {
  const result = await analytics.getTrends({ ...RANGE, metrics: "users", interval: "week" });
  assert.deepEqual(result.buckets.map((b) => b.key), ["2026-03-09", "2026-03-16"]);
  assert.equal(result.buckets[0].from, "2026-03-10");
  assert.equal(result.buckets[0].partial, true);
  assert.equal(result.series.users[0], 3);
});

await test("monthly interval and explicit comparison window", async () => {
  const result = await analytics.getTrends({ from: "2026-03-01", to: "2026-03-31", compareFrom: "2026-02-01", compareTo: "2026-02-28", interval: "month", metrics: "users" });
  assert.equal(result.buckets.length, 1);
  assert.equal(result.totals.users, 4);
  assert.equal(result.previousTotals.users, 0);
});

await test("rejects bad ranges and unknown metrics", async () => {
  await assert.rejects(() => analytics.getTrends({ from: "2026-03-10", to: "2026-03-01" }), /on or before/);
  await assert.rejects(() => analytics.getTrends({ from: "2026-02-30", to: "2026-03-01" }), /YYYY-MM-DD/);
  await assert.rejects(() => analytics.getTrends({ from: "2020-01-01", to: "2026-03-01" }), /3 years/);
  await assert.rejects(() => analytics.getTrends({ ...RANGE, metrics: "nope" }), /metrics must include/);
});

await test("staff-action trend honours audit filters", async () => {
  const result = await analytics.getTrends({ ...RANGE, metrics: "staffActions", actor_role: "admin" });
  assert.equal(result.totals.staffActions, 2);
});

await test("breakdowns: listing status/category, campus comparison", async () => {
  const { data } = await analytics.getBreakdowns({ ...RANGE, dims: "listingStatus,listingCategory,campusComparison" });
  assert.deepEqual(
    Object.fromEntries(data.listingStatus.map((r) => [r.key, r.count])),
    { listed: 1, sold: 1, blocked: 1 },
  );
  assert.deepEqual(data.listingCategory.map((r) => r.key), ["electronics", "sports"]);
  const review = await analytics.getBreakdowns({ ...RANGE, dims: "listingCategory", listingStatus: "review" });
  assert.deepEqual(review.data.listingCategory, [{ key: "sports", count: 1 }]);
  const vitRow = data.campusComparison.find((c) => c.name === "VIT Vellore");
  const iitRow = data.campusComparison.find((c) => c.name === "IIT Delhi");
  assert.equal(vitRow.users, 2);
  assert.equal(iitRow.users, 2, "string campus_id normalised");
  assert.equal(vitRow.liveListings, 1);
  assert.equal(iitRow.newListings, 1);
});

await test("breakdowns: queue by type, priority and reason match the queue unit (items)", async () => {
  const { data } = await analytics.getBreakdowns({ ...RANGE, dims: "queueType,queuePriority,queueReason,reportStatus" });
  assert.deepEqual(Object.fromEntries(data.queueType.map((r) => [r.key, r.count])), { Product: 2, User: 1, Support: 1 });
  assert.deepEqual(Object.fromEntries(data.queuePriority.map((r) => [r.key, r.count])), { high: 1, medium: 1, low: 1 });
  assert.deepEqual(Object.fromEntries(data.queueReason.map((r) => [r.key, r.count])), { spam_or_advertisement: 2, fraud_or_scam: 2 });
  assert.deepEqual(Object.fromEntries(data.reportStatus.map((r) => [r.key, r.count])), { pending: 8, dismissed: 1 });
});

await test("queue drill-down filters return the same items the chart counted", async () => {
  const high = await adminSvc.getModerationQueue({ priority: "high" });
  assert.deepEqual(high.data.map((i) => i.targetId), [String(t1)]);
  const medium = await adminSvc.getModerationQueue({ priority: "medium" });
  assert.deepEqual(medium.data.map((i) => i.targetId), [String(u1)]);
  const spam = await adminSvc.getModerationQueue({ reason: "spam_or_advertisement" });
  assert.equal(spam.pagination.total, 2);
  const ignored = await adminSvc.getModerationQueue({ reason: "not-a-reason", priority: "nope" });
  assert.equal(ignored.pagination.total, 4, "invalid filters are ignored");
});

await test("audit breakdowns by action and staff", async () => {
  const { data } = await analytics.getBreakdowns({ ...RANGE, dims: "auditAction,auditActor" });
  assert.equal(data.auditAction.length, 3);
  assert.equal(data.auditActor[0].key, String(staffId));
  assert.equal(data.auditActor[0].count, 2);
});

await test("job analytics counts finished runs per job and per bucket", async () => {
  const result = await analytics.getJobAnalytics({ ...RANGE, interval: "day" });
  assert.equal(result.series.success[0], 1);
  assert.equal(result.series.failed[1], 1);
  assert.equal(result.runs.length, 2, "running runs excluded");
  assert.ok(Array.isArray(result.jobs));
});

await mongoose.disconnect();
await mongod.stop();
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
