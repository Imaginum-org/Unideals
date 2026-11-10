// Run: node tests/admin.integration.test.mjs
// Admin console backend: own profile, password change, list filters,
// campus delete guard and audit log coverage, against in-memory MongoDB.
import assert from "node:assert/strict";
import bcrypt from "bcrypt";
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
const { default: AuditLog } = await import(B + "src/models/AuditLog.model.js");
await Promise.all([Product.init(), User.init(), AuditLog.init()]);
const profileSvc = await import(B + "src/services/adminProfile.service.js");
const userSvc = await import(B + "src/services/admin.user.service.js");
const productSvc = await import(B + "src/services/admin.product.service.js");
const campusSvc = await import(B + "src/services/campus.service.js");
const auditSvc = await import(B + "src/services/auditLog.service.js");
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
    console.log(`  ✗ ${name}\n    ${err.message}`);
  }
};

const vit = await Campus.create({ slug: "vit", name: "VIT Vellore", short_name: "VIT", is_active: true });
const iit = await Campus.create({ slug: "iit", name: "IIT Delhi", short_name: "IIT", is_active: true });
let n = 0;
const mkUser = (extra = {}) =>
  User.create({
    name: `User ${++n}`, email: `u${n}@t.edu`, password: bcrypt.hashSync("password123", 4),
    campus_id: vit._id, is_email_verified: true, status: "active", ...extra,
  });
const mkProduct = (seller, extra = {}) =>
  Product.create({
    seller_id: seller._id, campus_id: seller.campus_id, title: `Item ${++n}`,
    description: "Works perfectly, barely used.", category: "electronics", condition: "like_new",
    selling_price: 500, original_price: 900, images: [{ url: "https://x/a.jpg", fileId: "f" }],
    status: "listed", payment_preference: "both",
    pickup_address_snapshot: { address_line: "Gate", city: "V" }, ...extra,
  });

const admin = await mkUser({ name: "Asha Admin", role: "admin", mobile: "9876543210" });
const vitUser = await mkUser();
const iitUser = await mkUser({ campus_id: iit._id });

console.log("\nProfile");
await test("returns identity, campus and own activity summary", async () => {
  await auditSvc.logAdminAction({ actor: admin, action: "user.suspend", targetType: "user", targetId: vitUser._id });
  await auditSvc.logAdminAction({ actor: admin, action: "order.status_update", targetType: "order", targetId: new mongoose.Types.ObjectId() });
  const profile = await profileSvc.getAdminProfile(String(admin._id));
  assert.equal(profile.email, admin.email);
  assert.equal(profile.campus.name, "VIT Vellore");
  assert.equal(profile.activity.totalActions, 2);
  assert.equal(profile.activity.byTarget.user, 1);
  assert.equal(profile.activity.byTarget.order, 1, "order audit entries must be stored (enum fix)");
  assert.equal(profile.activity.recent.length, 2);
});
await test("updates name and mobile, rejects bad mobile and empty update", async () => {
  const updated = await profileSvc.updateAdminProfile(String(admin._id), { name: "  Asha   K  ", mobile: "91234 56789" });
  assert.equal(updated.name, "Asha K");
  assert.equal(updated.mobile, "9123456789");
  await assert.rejects(profileSvc.updateAdminProfile(String(admin._id), { mobile: "123" }), /10 digits/);
  await assert.rejects(profileSvc.updateAdminProfile(String(admin._id), {}), /Nothing to update/);
});
await test("ignores attempts to change email or role", async () => {
  await profileSvc.updateAdminProfile(String(admin._id), { name: "Asha K", email: "x@evil.com", role: "user" });
  const fresh = await User.findById(admin._id).lean();
  assert.equal(fresh.email, admin.email);
  assert.equal(fresh.role, "admin");
});

console.log("\nPassword change");
await test("rejects wrong current password and weak new password", async () => {
  await assert.rejects(profileSvc.changeAdminPassword(String(admin._id), { currentPassword: "nope", newPassword: "newpass123" }), /incorrect/);
  await assert.rejects(profileSvc.changeAdminPassword(String(admin._id), { currentPassword: "password123", newPassword: "short" }), /8\+/);
});
await test("changes password, bumps token version, clears refresh tokens", async () => {
  const before = await User.findById(admin._id).select("+password +refresh_token tokenVersion").lean();
  const { tokenVersion } = await profileSvc.changeAdminPassword(String(admin._id), { currentPassword: "password123", newPassword: "brandNew123" });
  const after = await User.findById(admin._id).select("+password +refresh_token tokenVersion").lean();
  assert.equal(tokenVersion, (before.tokenVersion || 0) + 1);
  assert.equal(after.refresh_token, null);
  assert.equal(await bcrypt.compare("brandNew123", after.password), true);
});

console.log("\nList filters");
await test("users: campus filter by id and slug (was ignored before)", async () => {
  const byId = await userSvc.getUsers({ campus: String(iit._id), limit: 50 });
  assert.deepEqual(byId.data.map((u) => u.id), [String(iitUser._id)]);
  const bySlug = await userSvc.getUsers({ campus: "iit", limit: 50 });
  assert.equal(bySlug.data.length, 1);
  const unknown = await userSvc.getUsers({ campus: "nowhere", limit: 50 });
  assert.equal(unknown.data.length, 0);
});
await test("products: campus filter and per-status counts ignore the status filter", async () => {
  await mkProduct(vitUser);
  await mkProduct(vitUser, { status: "blocked" });
  await mkProduct(iitUser);
  const blocked = await productSvc.getProducts({ status: "blocked", limit: 50 });
  assert.equal(blocked.data.length, 1);
  assert.equal(blocked.statusCounts.all, 3);
  assert.equal(blocked.statusCounts.listed, 2);
  const iitOnly = await productSvc.getProducts({ campus: String(iit._id), limit: 50 });
  assert.equal(iitOnly.data.length, 1);
  assert.equal(iitOnly.statusCounts.all, 1);
});

console.log("\nAudit log & dashboard");
await test("audit log filters by actor and date range", async () => {
  const mine = await auditSvc.getAuditLogs({ actor_id: String(admin._id) });
  assert.ok(mine.data.length >= 2);
  assert.ok(mine.data.every((e) => e.actor_id === String(admin._id)));
  const future = await auditSvc.getAuditLogs({ from: new Date(Date.now() + 86400000).toISOString() });
  assert.equal(future.data.length, 0);
  const orders = await auditSvc.getAuditLogs({ target_type: "order" });
  assert.equal(orders.data.length, 1);
});
await test("dashboard reports pending gender requests", async () => {
  await User.updateOne({ _id: vitUser._id }, { genderChangeRequest: { requestedGender: "female", status: "pending", requestedAt: new Date() } });
  const metrics = await adminSvc.getDashboardMetrics();
  assert.equal(metrics.stats.pendingGenderRequests, 1);
});

console.log("\nDashboard money metrics");
const { default: Deal } = await import(B + "src/models/deal.model.js");
const { default: Payment } = await import(B + "src/models/Payment.model.js");
await test("percentChange: null without a baseline, signed percent otherwise", async () => {
  assert.equal(adminSvc.percentChange(5, 0), null);
  assert.equal(adminSvc.percentChange(150, 100), "+50%");
  assert.equal(adminSvc.percentChange(0, 100), "-100%");
});
await test("GMV and platform revenue are separate; deals bucket by completion date", async () => {
  const now = new Date();
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 1);
  // Raw inserts: these tests are about the metrics, not deal validation.
  // Started last month, completed now: belongs to THIS month.
  await Deal.collection.insertOne({ conversation_id: new mongoose.Types.ObjectId(), status: "completed", current_price: 1000, original_price: 1200, createdAt: lastMonth, updatedAt: now, completed_at: now });
  // Completed at the start of last month: inside the comparable window.
  await Deal.collection.insertOne({ conversation_id: new mongoose.Types.ObjectId(), status: "completed", current_price: 500, original_price: 500, createdAt: lastMonth, updatedAt: lastMonth, completed_at: lastMonth });
  // Not completed: must not count toward GMV.
  await Deal.collection.insertOne({ conversation_id: new mongoose.Types.ObjectId(), status: "negotiating", current_price: 999999, original_price: 999999, createdAt: now, updatedAt: now });
  await Payment.collection.insertOne({ status: "verified", amount: 9900, createdAt: now, updatedAt: now, verified_at: now });
  const { stats } = await adminSvc.getDashboardMetrics();
  assert.equal(stats.completedDeals, 2);
  assert.equal(stats.dealVolume, 1500, "GMV in rupees from completed deals only");
  assert.equal(stats.platformRevenue, 99, "payments are paise -> rupees, kept separate from GMV");
  assert.equal(stats.monthToDate.dealVolume, 1000);
  assert.equal(stats.monthToDate.completedDeals, 1);
  assert.equal(stats.trends.dealVolume, "+100%");
  assert.equal(stats.totalRevenue, undefined, "old mixed metric removed");
});

console.log("\nCampus delete guard");
await test("refuses to delete a campus that still has listings", async () => {
  await assert.rejects(campusSvc.deleteCampus(String(iit._id)), /Pause it instead/);
  assert.ok(await Campus.findById(iit._id));
});
await test("deletes an empty campus", async () => {
  const empty = await Campus.create({ slug: "empty", name: "Empty U", short_name: "EU", is_active: false });
  await campusSvc.deleteCampus(String(empty._id));
  assert.equal(await Campus.findById(empty._id), null);
});

// ─── Reports: evidence, notifications, auto-hide ─────────────────────────
const { default: Report } = await import(B + "src/models/Report.model.js");
const { default: Notification } = await import(B + "src/models/Notification.model.js");
const { default: Conversation } = await import(B + "src/models/conversation.model.js");
const { default: Message } = await import(B + "src/models/message.model.js");
const reportSvc = await import(B + "src/services/report.service.js");
const moderation = await import(B + "src/services/moderation.service.js");
const productPublic = await import(B + "src/services/product.service.js");
const registry = await import(B + "src/jobs/jobRegistry.js");
const { JobRun, JobState } = await import(B + "src/models/JobRun.model.js");

const notesFor = (userId) => Notification.find({ recipient_id: userId }).sort({ createdAt: 1 }).lean();
// Notifications are fire-and-forget; give them a moment to land.
const settle = () => new Promise((r) => setTimeout(r, 150));

const seller = await mkUser({ name: "Sam Seller" });
const buyer = await mkUser({ name: "Bea Buyer" });
const outsider = await mkUser({ name: "Olly Outsider" });
const chatProduct = await mkProduct(seller, { title: "Desk lamp" });
const convId = new mongoose.Types.ObjectId();
await Conversation.collection.insertOne({ _id: convId, product_id: chatProduct._id, seller_id: seller._id, buyer_id: buyer._id, createdAt: new Date() });
for (let i = 0; i < 45; i++) {
  await Message.collection.insertOne({
    conversation_id: convId,
    sender_id: i % 2 ? seller._id : buyer._id,
    receiver_id: i % 2 ? buyer._id : seller._id,
    message_type: "text",
    text: `message ${i}`,
    createdAt: new Date(Date.now() - (45 - i) * 1000),
  });
}

console.log("\nChat report evidence");
await test("report from chat stores the conversation and last 40 messages in order", async () => {
  const report = await reportSvc.reportUser(String(seller._id), { reason: "fraud_or_scam", description: "Asked me to pay outside the app", conversation_id: String(convId) }, buyer);
  const saved = await Report.findById(report._id).lean();
  assert.equal(String(saved.conversation_id), String(convId));
  assert.equal(saved.chat_snapshot.length, reportSvc.CHAT_SNAPSHOT_LIMIT);
  assert.equal(saved.chat_snapshot.at(-1).text, "message 44");
  assert.equal(saved.chat_snapshot[0].text, "message 5");
});
await test("cannot attach a conversation you are not part of", async () => {
  await assert.rejects(
    reportSvc.reportUser(String(seller._id), { reason: "fraud_or_scam", description: "Trying to pull someone else's chat", conversation_id: String(convId) }, outsider),
    /part of/,
  );
});
await test("cannot attach a chat to a user who isn't in it", async () => {
  await assert.rejects(
    reportSvc.reportUser(String(outsider._id), { reason: "fraud_or_scam", description: "Wrong person for this chat", conversation_id: String(convId) }, buyer),
    /not part of this conversation/,
  );
});
await test("review panel returns chat with sender names", async () => {
  const reports = await moderation.getTargetReports({ targetId: String(seller._id), targetModel: "User" });
  assert.equal(reports.length, 1);
  assert.equal(reports[0].reporter.name, "Bea Buyer");
  assert.ok(reports[0].chat.some((m) => m.sender.name === "Sam Seller"));
});

await test("queue flags items that have chat evidence", async () => {
  const queue = await adminSvc.getModerationQueue({ target_model: "User" });
  const item = queue.data.find((i) => i.targetId === String(seller._id));
  assert.ok(item, "reported seller is in the queue");
  assert.equal(item.hasChat, true);
});

console.log("\nReporter and seller notifications");
await test("resolving reports tells each reporter, once", async () => {
  const result = await moderation.closeReports({ targetId: String(seller._id), targetModel: "User", outcome: "resolved", adminNote: "Warned", actor: admin });
  await settle();
  assert.equal(result.notifiedReporters, 1);
  const notes = await notesFor(buyer._id);
  assert.ok(notes.some((n) => /took action/.test(n.message)));
  const report = await Report.findOne({ target_id: seller._id }).lean();
  assert.ok(report.reporter_notified_at);
});
await test("blocking a listing tells the seller, with the reason", async () => {
  const p = await mkProduct(seller, { title: "Fake AirPods" });
  await moderation.moderateProductStatus({ productId: String(p._id), status: "blocked", reason: "Counterfeit item", actor: admin });
  await settle();
  const notes = await notesFor(seller._id);
  const note = notes.find((n) => n.title === "Listing removed");
  assert.ok(note, "seller notified");
  assert.match(note.message, /Fake AirPods.*Counterfeit item/);
});
await test("sellers can no longer relist a blocked listing", async () => {
  const p = await mkProduct(seller, { title: "Blocked thing", status: "blocked" });
  await assert.rejects(productPublic.relistProduct(String(p._id), seller._id), /removed by our team/);
});

console.log("\nAuto-hidden listings");
const hidden = await mkProduct(seller, { title: "Suspicious phone" });
await test("5 reports auto-hide the listing, mark it and tell the seller", async () => {
  for (let i = 0; i < 5; i++) {
    const reporter = await mkUser();
    await reportSvc.reportProduct(String(hidden._id), { reason: "fake_or_misleading", description: "Looks like a scam listing" }, reporter);
  }
  await settle();
  const fresh = await Product.findById(hidden._id).lean();
  assert.equal(fresh.status, "unlisted");
  assert.ok(fresh.auto_hidden_at);
  const notes = await notesFor(seller._id);
  assert.equal(notes.filter((n) => n.title === "Listing paused for review").length, 1);
  const listed = await productSvc.getProducts({ flag: "auto_hidden", limit: 50 });
  assert.deepEqual(listed.data.map((p) => p.id), [String(hidden._id)]);
});
await test("seller can't relist while it is under review", async () => {
  await assert.rejects(productPublic.relistProduct(String(hidden._id), seller._id), /reviews reports/);
});
await test("dismissing the reports puts it back live and tells seller + all 5 reporters", async () => {
  const result = await moderation.closeReports({ targetId: String(hidden._id), targetModel: "Product", outcome: "dismissed", actor: admin });
  await settle();
  assert.equal(result.notifiedReporters, 5);
  const fresh = await Product.findById(hidden._id).lean();
  assert.equal(fresh.status, "listed");
  assert.equal(fresh.auto_hidden_at, null);
  const notes = await notesFor(seller._id);
  assert.ok(notes.some((n) => n.title === "Listing is live again"));
});
await test("deleting a reported listing still tells its reporters", async () => {
  const p = await mkProduct(seller, { title: "Doomed listing" });
  const reporter = await mkUser();
  await reportSvc.reportProduct(String(p._id), { reason: "prohibited_item", description: "This item is not allowed" }, reporter);
  await moderation.deleteProductPermanently({ productId: String(p._id), actor: admin });
  await settle();
  assert.equal(await Product.findById(p._id), null);
  assert.ok((await notesFor(reporter._id)).some((n) => /Doomed listing/.test(n.message)));
  assert.ok((await notesFor(seller._id)).some((n) => n.title === "Listing deleted"));
});

console.log("\nBulk actions");
await test("bulk applies per item and reports partial failures", async () => {
  const a = await mkProduct(seller);
  const b = await mkProduct(seller);
  const missing = new mongoose.Types.ObjectId();
  const result = await moderation.runBulk([String(a._id), String(b._id), String(missing)], (productId) =>
    moderation.moderateProductStatus({ productId, status: "unlisted", actor: admin, bulk: true }),
  );
  assert.equal(result.succeeded, 2);
  assert.equal(result.failed, 1);
  assert.equal(result.results.find((r) => !r.ok).error, "Product not found");
  assert.equal((await Product.findById(a._id)).status, "unlisted");
});
await test("bulk rejects more than the limit", async () => {
  const ids = Array.from({ length: moderation.BULK_LIMIT + 1 }, () => String(new mongoose.Types.ObjectId()));
  await assert.rejects(moderation.runBulk(ids, async () => {}), /at most/);
});

console.log("\nBackground job tracking");
registry.defineJob({ key: "test-ok", name: "OK job", schedule: "0 3 * * *", run: async () => ({ cleaned: 2 }) });
registry.defineJob({ key: "test-fail", name: "Failing job", schedule: "0 3 * * *", run: async () => { throw new Error("db down"); } });
registry.defineJob({ key: "test-noop", name: "Frequent no-op", schedule: "* * * * *", frequent: true, run: async () => ({ sent: 0 }) });
await test("successful run updates state and history", async () => {
  const run = await registry.runJob("test-ok");
  assert.equal(run.status, "success");
  const state = await JobState.findOne({ key: "test-ok" }).lean();
  assert.equal(state.last_status, "success");
  assert.deepEqual(state.last_result, { cleaned: 2 });
  assert.equal(await JobRun.countDocuments({ key: "test-ok" }), 1);
});
await test("failure is recorded, not thrown", async () => {
  await registry.runJob("test-fail");
  await registry.runJob("test-fail");
  const state = await JobState.findOne({ key: "test-fail" }).lean();
  assert.equal(state.last_status, "failed");
  assert.equal(state.consecutive_failures, 2);
  assert.match(state.last_error, /db down/);
});
await test("frequent no-op runs update state but skip history", async () => {
  await registry.runJob("test-noop");
  assert.equal(await JobRun.countDocuments({ key: "test-noop" }), 0);
  assert.equal((await JobState.findOne({ key: "test-noop" }).lean()).run_count, 1);
});
await test("dashboard counts failing jobs and auto-hidden listings", async () => {
  const { stats } = await adminSvc.getDashboardMetrics();
  assert.equal(stats.failingJobs, 1);
  assert.equal(stats.autoHiddenListings, 0);
});

console.log("\nService status");
const metrics = await import(B + "src/middlewares/requestMetrics.middleware.js");
const status = await import(B + "src/services/systemStatus.service.js");
await test("traffic snapshot groups by API area with error rate and percentiles", async () => {
  metrics.__resetMetrics();
  const now = Date.now();
  for (let i = 1; i <= 18; i++) metrics.__record("product", 200, i * 10, now);
  metrics.__record("product", 500, 900, now);
  metrics.__record("admin", 404, 30, now);
  const snap = metrics.getTrafficSnapshot(15, now);
  assert.equal(snap.totals.requests, 20);
  assert.equal(snap.totals.serverErrors, 1);
  assert.equal(snap.totals.clientErrors, 1);
  assert.equal(snap.totals.errorRate, 5);
  const product = snap.areas.find((a) => a.area === "product");
  assert.equal(product.requests, 19);
  assert.equal(product.p50, 100);
  assert.equal(product.p95, 900, "nearest-rank: the slow failing request");
  assert.equal(snap.series.length, 15);
  assert.equal(snap.series.at(-1).requests, 20);
});
await test("status: DB checked live, missing credentials flagged, optional services ignored", async () => {
  for (const k of ["RAZORPAY_KEY_ID", "RAZORPAY_KEY_SECRET", "RESEND_API_KEY", "GEMINI_API_KEY", "GOOGLE_CLIENT_ID", "IMAGEKIT_PUBLIC_KEY"]) delete process.env[k];
  status.__resetExternalCache();
  const result = await status.getSystemStatus();
  const byKey = Object.fromEntries(result.components.map((c) => [c.key, c]));
  assert.equal(byKey.database.status, "operational");
  assert.ok(byKey.database.latencyMs >= 0);
  assert.equal(byKey.payments.status, "outage");
  assert.match(byKey.payments.detail, /Credentials missing/);
  assert.equal(byKey.assistant.status, "not_configured");
  assert.equal(byKey.api.status, "degraded", "5% errors over 20 requests");
  assert.equal(byKey.jobs.status, "degraded", "the failing test job from earlier");
  assert.equal(result.overall, "outage");
  assert.ok(result.process.uptimeSeconds >= 0);
});

await mongoose.disconnect();
await mongod.stop();
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
