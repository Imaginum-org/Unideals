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

await mongoose.disconnect();
await mongod.stop();
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
