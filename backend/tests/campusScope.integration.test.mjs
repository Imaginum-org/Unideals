// Run: node tests/campusScope.integration.test.mjs
// Campus limits on support access, end to end over HTTP: a limited support
// person only sees and acts on their campuses' users, listings, orders,
// reports, notifications and numbers; ids from other campuses 404.
import assert from "node:assert/strict";
import http from "node:http";
import { MongoMemoryServer } from "mongodb-memory-server";

const B = new URL("../", import.meta.url).href;
const ORIGIN = "http://localhost:5174";
Object.assign(process.env, {
  IMAGEKIT_URL_ENDPOINT: "",
  SECRET_KEY_ACCESS_TOKEN: "scope-test",
  SECRET_KEY_REFRESH_TOKEN: "scope-refresh",
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
const { default: Campus } = await import(B + "src/models/Campus.model.js");
const { default: Conversation } = await import(B + "src/models/conversation.model.js");
const { default: Deal } = await import(B + "src/models/deal.model.js");
const { default: Notification } = await import(B + "src/models/Notification.model.js");
const { default: AuditLog } = await import(B + "src/models/AuditLog.model.js");

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
const now = new Date();
const token = (id) => jwt.sign({ id: String(id), v: 0 }, process.env.SECRET_KEY_ACCESS_TOKEN, { expiresIn: "15m" });
const mkUser = async (role, name, campus = null) => {
  const _id = oid();
  await User.collection.insertOne({ _id, name, email: `${name.toLowerCase()}@t.edu`, role, status: "active", tokenVersion: 0, is_email_verified: true, campus_id: campus, createdAt: now });
  return { _id, token: token(_id) };
};

const campusA = oid();
const campusB = oid();
await Campus.collection.insertMany([
  { _id: campusA, name: "Alpha Institute", slug: "alpha", short_name: "AI", is_active: true, createdAt: now },
  { _id: campusB, name: "Beta College", slug: "beta", short_name: "BC", is_active: true, createdAt: now },
]);
const admin = await mkUser("admin", "Asha");
const sam = await mkUser("support", "Sam");
const tara = await mkUser("support", "Tara");
const stuA = await mkUser("user", "Anu", campusA);
const stuA2 = await mkUser("user", "Arun", campusA);
const stuB = await mkUser("user", "Bela", campusB);
const stuB2 = await mkUser("user", "Bob", campusB);

const lampA = oid();
const lampB = oid();
await Product.collection.insertMany([
  { _id: lampA, title: "Lamp A", status: "listed", is_deleted: false, seller_id: stuA._id, campus_id: campusA, category: "others", createdAt: now, auto_hidden_at: now },
  { _id: lampB, title: "Lamp B", status: "listed", is_deleted: false, seller_id: stuB._id, campus_id: campusB, category: "others", createdAt: now, auto_hidden_at: now },
]);
await Report.collection.insertMany([
  { _id: oid(), target_id: lampA, target_model: "Product", reason: "other", status: "pending", reporter_id: stuA2._id, createdAt: now },
  { _id: oid(), target_id: lampB, target_model: "Product", reason: "other", status: "pending", reporter_id: stuB2._id, createdAt: now },
  { _id: oid(), target_id: stuB._id, target_model: "User", reason: "other", status: "pending", reporter_id: stuB2._id, createdAt: now },
]);
const convA = oid();
const convB = oid();
await Conversation.collection.insertMany([
  { _id: convA, product_id: lampA, seller_id: stuA._id, buyer_id: stuA2._id, createdAt: now },
  { _id: convB, product_id: lampB, seller_id: stuB._id, buyer_id: stuB2._id, createdAt: now },
]);
const dealA = oid();
const dealB = oid();
await Deal.collection.insertMany([
  { _id: dealA, conversation_id: convA, original_price: 100, current_price: 100, status: "completed", completed_at: now, createdAt: now, updatedAt: now },
  { _id: dealB, conversation_id: convB, original_price: 200, current_price: 200, status: "completed", completed_at: now, createdAt: now, updatedAt: now },
]);
await Notification.collection.insertMany([
  { _id: oid(), title: "Hi A", message: "x", type: "announcement", target_audience: "campus", target_campus: campusA, is_broadcast: true, status: "sent", createdAt: now },
  { _id: oid(), title: "Hi all", message: "x", type: "announcement", target_audience: "all", is_broadcast: true, status: "sent", createdAt: now },
]);

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
const ids = (rows) => rows.map((r) => String(r.id ?? r._id ?? r.targetId)).sort();

console.log("campus scope");

await test("without a limit support sees every campus", async () => {
  const users = await call(sam, "GET", "/users?limit=50");
  assert.equal(users.body.data.length, 6, "4 students + 2 support staff");
  assert.equal((await call(sam, "GET", "/campuses")).body.data.length, 2);
});

await test("role limited to one campus: lists, details, stats and numbers follow it", async () => {
  const saved = await call(admin, "PUT", "/access/support", {
    permissions: { users: { manage: true }, listings: { manage: true }, orders: { manage: true } },
    campuses: [String(campusA)],
  });
  assert.equal(saved.status, 200);
  assert.deepEqual(saved.body.data.campuses, [String(campusA)]);

  assert.deepEqual(ids((await call(sam, "GET", "/users?limit=50")).body.data), ids([{ id: stuA._id }, { id: stuA2._id }]));
  assert.equal((await call(sam, "GET", `/users?campus=${campusB}`)).body.data.length, 0, "filtering to another campus finds nothing");
  assert.equal((await call(sam, "GET", "/users/stats")).body.data.totalUsers, 2);
  assert.equal((await call(sam, "GET", `/users/${stuA._id}`)).status, 200);
  assert.equal((await call(sam, "GET", `/users/${stuB._id}`)).status, 404);
  assert.equal((await call(sam, "PATCH", `/users/${stuB._id}/status`, { status: "suspended", reason: "x" })).status, 404);

  const products = await call(sam, "GET", "/products?limit=50");
  assert.deepEqual(ids(products.body.data), [String(lampA)]);
  assert.equal((await call(sam, "GET", `/products/${lampB}`)).status, 404);
  assert.equal((await call(sam, "PATCH", `/products/${lampB}/status`, { status: "blocked", reason: "x" })).status, 404);

  const orders = await call(sam, "GET", "/orders?limit=50");
  assert.deepEqual(ids(orders.body.data), [String(dealA)]);
  assert.equal((await call(sam, "GET", "/orders/stats")).body.data.totalOrders, 1);
  assert.equal((await call(sam, "GET", `/orders/${dealB}`)).status, 404);

  assert.deepEqual(ids((await call(sam, "GET", "/campuses")).body.data), [String(campusA)]);
});

await test("bulk actions skip other campuses item by item", async () => {
  const r = await call(sam, "POST", "/products/bulk", { ids: [String(lampA), String(lampB)], action: "unlisted", reason: "t" });
  assert.equal(r.status, 200);
  assert.equal(r.body.data.succeeded, 1);
  assert.equal(r.body.data.failed, 1);
  assert.equal((await Product.findById(lampB).lean()).status, "listed");
  await Product.updateOne({ _id: lampA }, { $set: { status: "listed", auto_hidden_at: now } });
});

await test("reports: queue, evidence and actions only for the caller's campuses", async () => {
  const queue = await call(sam, "GET", "/moderation/queue");
  assert.deepEqual(queue.body.data.map((i) => i.targetId), [String(lampA)]);
  assert.equal((await call(sam, "GET", `/moderation/reports?targetId=${lampB}&targetModel=Product`)).status, 404);
  assert.equal((await call(sam, "POST", "/moderation/dismiss", { targetId: String(stuB._id), targetModel: "User" })).status, 404);
  assert.equal((await call(sam, "GET", "/reports")).status, 403, "legacy flat list needs every campus");
  assert.equal((await call(admin, "GET", "/moderation/queue")).body.data.length, 3);
});

await test("dashboard, badges and charts count only the caller's campuses", async () => {
  const dash = (await call(sam, "GET", "/dashboard")).body.data.stats;
  assert.equal(dash.totalUsers, 2);
  assert.equal(dash.listedProducts, 1);
  assert.equal(dash.pendingReports, 1);
  assert.equal(dash.completedDeals, 1);
  assert.equal(dash.dealVolume, 100);
  assert.equal(dash.activeCampuses, 1);
  assert.deepEqual(dash.usersByCampus.map((c) => c.name), ["Alpha Institute"]);

  const attention = (await call(sam, "GET", "/attention")).body.data;
  assert.equal(attention.pendingReports, 1);
  assert.equal(attention.autoHiddenListings, 1);

  const trends = (await call(sam, "GET", "/analytics/trends?metrics=users,listings,gmv,reports")).body.data;
  assert.equal(trends.totals.users, 2);
  assert.equal(trends.totals.listings, 1);
  assert.equal(trends.totals.gmv, 100);
  const breakdown = (await call(sam, "GET", "/analytics/breakdown?dims=campusComparison,queueType")).body.data.data;
  assert.deepEqual(breakdown.campusComparison.map((c) => c.name), ["Alpha Institute"]);
  assert.deepEqual(breakdown.queueType, [{ key: "Product", count: 1 }]);

  const full = (await call(admin, "GET", "/dashboard")).body.data.stats;
  assert.equal(full.totalUsers, 6);
  assert.equal(full.dealVolume, 300);
});

await test("charts need access to their section", async () => {
  await call(admin, "PUT", "/access/support", { permissions: { orders: { view: false }, dashboard: { view: false } } });
  assert.equal((await call(sam, "GET", "/analytics/trends?metrics=orders")).status, 403);
  assert.equal((await call(sam, "GET", "/analytics/trends?metrics=users")).status, 200, "users view still allows user charts");
  await call(admin, "PUT", "/access/support", { permissions: { orders: { view: true }, dashboard: { view: true } } });
});

await test("notifications: send only to own campuses, see only their history", async () => {
  await call(admin, "PUT", "/access/support", { permissions: { notifications: { manage: true } } });
  assert.equal((await call(sam, "POST", "/notifications", { title: "t", message: "m", target_audience: "all" })).status, 403);
  assert.equal((await call(sam, "POST", "/notifications", { title: "t", message: "m", target_audience: "campus", target_campus: String(campusB) })).status, 403);
  assert.equal((await call(sam, "GET", `/notifications/estimate-recipients?target_audience=campus&target_campus=${campusB}`)).status, 403);
  const history = await call(sam, "GET", "/notifications/history");
  assert.deepEqual(history.body.data.items.map((n) => n.title), ["Hi A"]);
});

await test("campuses: limited staff can't create or delete, and only edit their own", async () => {
  await call(admin, "PUT", "/access/support", { permissions: { campuses: { manage: true } } });
  assert.equal((await call(sam, "POST", "/campuses", { name: "Gamma", slug: "gamma" })).status, 403);
  assert.equal((await call(sam, "DELETE", `/campuses/${campusA}`)).status, 403);
  assert.equal((await call(sam, "PATCH", `/campuses/${campusB}`, { is_active: false })).status, 404);
});

await test("one person can cover a different campus than the role", async () => {
  const r = await call(admin, "PUT", `/access/staff/${tara._id}`, { campuses: [String(campusB)] });
  assert.equal(r.status, 200);
  assert.equal(r.body.data.custom, true);
  assert.deepEqual(ids((await call(tara, "GET", "/products?limit=50")).body.data), [String(lampB)]);
  assert.deepEqual(ids((await call(sam, "GET", "/products?limit=50")).body.data), [String(lampA)]);

  const mine = (await call(tara, "GET", "/access")).body.data;
  assert.deepEqual(mine.mineCampuses.map((c) => c.name), ["Beta College"]);
  const overview = (await call(admin, "GET", "/access")).body.data;
  assert.deepEqual(overview.supportCampuses, [String(campusA)]);
  assert.deepEqual(overview.staff.find((s) => s.id === String(tara._id)).campuses, [String(campusB)]);
  assert.equal(overview.campuses.length, 2);
  const entry = await AuditLog.findOne({ action: "access.person_update", target_id: tara._id }).sort({ createdAt: -1 }).lean();
  assert.deepEqual(entry.metadata.campuses.to, ["Beta College"]);
});

await test("bad campus input is rejected; null clears the limit", async () => {
  assert.equal((await call(admin, "PUT", "/access/support", { campuses: ["nope"] })).status, 400);
  assert.equal((await call(admin, "PUT", "/access/support", { campuses: [String(oid())] })).status, 400);
  assert.equal((await call(admin, "PUT", "/access/support", { campuses: "all" })).status, 400);
  const cleared = await call(admin, "PUT", "/access/support", { campuses: null });
  assert.deepEqual(cleared.body.data.campuses, []);
  assert.equal((await call(sam, "GET", "/users?limit=50")).body.data.length, 6);
  const entry = await AuditLog.findOne({ action: "access.update" }).sort({ createdAt: -1 }).lean();
  assert.deepEqual(entry.metadata.campuses, { from: ["Alpha Institute"], to: ["All campuses"] });
});

await test("Super Admins are never campus-limited", async () => {
  assert.equal((await call(admin, "GET", `/products/${lampB}`)).status, 200);
  assert.equal((await call(admin, "GET", "/campuses")).body.data.length, 2);
});

server.close();
await mongoose.disconnect();
await mongod.stop();
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
