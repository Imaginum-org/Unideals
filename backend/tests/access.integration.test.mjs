// Run: node tests/access.integration.test.mjs
// Support-role access policy, end to end over HTTP against the real app and
// routes: defaults match the old behaviour, Super Admin edits are enforced on
// every guarded route, audited, and can't be made by support staff.
import assert from "node:assert/strict";
import http from "node:http";
import { MongoMemoryServer } from "mongodb-memory-server";

const B = new URL("../", import.meta.url).href;
const ORIGIN = "http://localhost:5174";
Object.assign(process.env, {
  IMAGEKIT_URL_ENDPOINT: "",
  SECRET_KEY_ACCESS_TOKEN: "access-test",
  SECRET_KEY_REFRESH_TOKEN: "refresh-test",
  NODE_ENV: "test",
  FRONTEND_URL: "http://localhost:5173",
  ADMIN_FRONTEND_URL: ORIGIN,
});

const mongod = await MongoMemoryServer.create();
const { default: mongoose } = await import(B + "node_modules/mongoose/index.js");
await mongoose.connect(mongod.getUri());
const { default: jwt } = await import(B + "node_modules/jsonwebtoken/index.js");
const { default: app } = await import(B + "src/app.js");
const { default: User } = await import(B + "src/models/User.model.js");
const { default: Product } = await import(B + "src/models/Product.model.js");
const { default: Report } = await import(B + "src/models/Report.model.js");
const { default: AuditLog } = await import(B + "src/models/AuditLog.model.js");
const access = await import(B + "src/services/access.service.js");

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
const mkStaff = async (role, name) => {
  const _id = oid();
  await User.collection.insertOne({ _id, name, email: `${name.toLowerCase()}@t.edu`, role, status: "active", tokenVersion: 0, is_email_verified: true, createdAt: new Date() });
  return { _id, token: jwt.sign({ id: String(_id), v: 0 }, process.env.SECRET_KEY_ACCESS_TOKEN, { expiresIn: "15m" }) };
};
const admin = await mkStaff("admin", "Asha");
const support = await mkStaff("support", "Sam");
const student = oid();
await User.collection.insertOne({ _id: student, name: "Stu", email: "stu@t.edu", role: "user", status: "active", tokenVersion: 0, createdAt: new Date() });
const listing = oid();
await Product.collection.insertOne({ _id: listing, title: "Lamp", status: "listed", is_deleted: false, seller_id: student, category: "others", createdAt: new Date() });
await Report.collection.insertOne({ _id: oid(), target_id: listing, target_model: "Product", reason: "other", status: "pending", reporter_id: student, createdAt: new Date() });

const server = http.createServer(app);
await new Promise((resolve) => server.listen(0, resolve));
const base = `http://127.0.0.1:${server.address().port}/api/admin`;
const call = async (who, method, path, body) => {
  const response = await fetch(base + path, {
    method,
    headers: { Cookie: `accessToken=${who.token}`, Origin: ORIGIN, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: response.status, body: await response.json().catch(() => ({})) };
};

console.log("access");

await test("defaults keep the old behaviour: support views everything, acts only on reports", async () => {
  assert.equal((await call(support, "GET", "/users")).status, 200);
  assert.equal((await call(support, "GET", "/products")).status, 200);
  assert.equal((await call(support, "GET", "/audit-log")).status, 200);
  assert.equal((await call(support, "PATCH", `/users/${student}/status`, { status: "suspended" })).status, 403);
  assert.equal((await call(support, "PATCH", `/products/${listing}/status`, { status: "blocked" })).status, 403);
  assert.equal((await call(support, "POST", "/system/jobs/boosts.expire/run")).status, 403);
  assert.notEqual((await call(support, "POST", "/moderation/dismiss", { targetId: String(listing), targetModel: "Product" })).status, 403);
});

await test("support reads its own access but not the editable policy, and can't change it", async () => {
  const mine = await call(support, "GET", "/access");
  assert.equal(mine.status, 200);
  assert.equal(mine.body.data.mine.reports.manage, true);
  assert.equal(mine.body.data.support, undefined);
  assert.equal((await call(support, "PUT", "/access/support", { permissions: { users: { manage: true } } })).status, 403);
});

await test("Super Admin edits are enforced on the routes and audited", async () => {
  const saved = await call(admin, "PUT", "/access/support", {
    permissions: { users: { view: false }, listings: { manage: true }, reports: { view: false } },
  });
  assert.equal(saved.status, 200);
  assert.equal(saved.body.data.changes, 4, "users.view, users.manage stays false, listings.manage, reports.view+manage");
  assert.equal((await call(support, "GET", "/users")).status, 403);
  assert.equal((await call(support, "GET", "/users/stats")).status, 403);
  assert.equal((await call(support, "GET", "/moderation/queue")).status, 403);
  assert.equal((await call(support, "POST", "/moderation/resolve", { targetId: String(listing), targetModel: "Product" })).status, 403);
  assert.equal((await call(support, "PATCH", `/products/${listing}/status`, { status: "unlisted", reason: "test" })).status, 200);
  const entry = await AuditLog.findOne({ action: "access.update" }).lean();
  assert.equal(entry.target_type, "settings");
  assert.ok(entry.metadata.changes.some((c) => c.section === "listings" && c.level === "manage" && c.to === true));
});

await test("attention counts only cover sections the caller can see", async () => {
  // The first test dismissed the original report; file a fresh one.
  await Report.collection.insertOne({ _id: oid(), target_id: listing, target_model: "Product", reason: "spam_or_advertisement", status: "pending", reporter_id: oid(), createdAt: new Date() });
  const asSupport = await call(support, "GET", "/attention");
  assert.equal(asSupport.body.data.pendingReports, 0, "reports hidden from support");
  const asAdmin = await call(admin, "GET", "/attention");
  assert.equal(asAdmin.body.data.pendingReports, 1);
});

await test("Super Admins keep full access whatever the policy says", async () => {
  assert.equal((await call(admin, "GET", "/users")).status, 200);
  assert.equal((await call(admin, "GET", "/moderation/queue")).status, 200);
});

await test("manage needs view, sections without actions can't be managed, bad input is rejected", async () => {
  const r = await call(admin, "PUT", "/access/support", { permissions: { orders: { view: false, manage: true }, auditLog: { manage: true } } });
  assert.equal(r.body.data.permissions.orders.manage, false);
  assert.equal(r.body.data.permissions.auditLog.manage, false);
  assert.equal((await call(admin, "PUT", "/access/support", { permissions: { nope: { view: true } } })).status, 400);
  assert.equal((await call(admin, "PUT", "/access/support", { permissions: { users: { view: "yes" } } })).status, 400);
  assert.equal((await call(admin, "PUT", "/access/support", { permissions: [] })).status, 400);
});

await test("role changes stay Super Admin only even with users access", async () => {
  await call(admin, "PUT", "/access/support", { permissions: { users: { view: true, manage: true } } });
  assert.equal((await call(support, "PATCH", `/users/${student}/role`, { role: "support" })).status, 403);
});

await test("unknown or missing stored sections fall back to defaults", async () => {
  const normalized = access.normalizePermissions({ users: { view: false } });
  assert.equal(normalized.users.view, false);
  assert.equal(normalized.reports.manage, true);
  assert.equal(normalized.dashboard.view, true);
});

server.close();
await mongoose.disconnect();
await mongod.stop();
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
