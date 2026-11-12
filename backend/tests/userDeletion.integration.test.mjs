// Run: node tests/userDeletion.integration.test.mjs
// Permanent account deletion from the admin portal: Super Admin only, needs
// the email typed back, and removes the user plus everything linked to them
// while leaving other people's data (and the audit log) intact.
import assert from "node:assert/strict";
import http from "node:http";
import { MongoMemoryServer } from "mongodb-memory-server";

const B = new URL("../", import.meta.url).href;
const ORIGIN = "http://localhost:5174";
Object.assign(process.env, {
  IMAGEKIT_URL_ENDPOINT: "",
  SECRET_KEY_ACCESS_TOKEN: "delete-test",
  SECRET_KEY_REFRESH_TOKEN: "delete-refresh",
  NODE_ENV: "test",
  FRONTEND_URL: "http://localhost:5173",
  ADMIN_FRONTEND_URL: ORIGIN,
});

const mongod = await MongoMemoryServer.create();
const { default: mongoose } = await import(B + "node_modules/mongoose/index.js");
await mongoose.connect(mongod.getUri());
const { default: jwt } = await import(B + "node_modules/jsonwebtoken/index.js");
const { default: app } = await import(B + "src/app.js");
const M = async (path) => (await import(B + `src/models/${path}`));
const { default: User } = await M("User.model.js");
const { default: Product } = await M("Product.model.js");
const { default: ProductView } = await M("ProductView.model.js");
const { default: Conversation } = await M("conversation.model.js");
const { default: Message } = await M("message.model.js");
const { default: Deal } = await M("deal.model.js");
const { default: Review } = await M("Review.model.js");
const { default: Report } = await M("Report.model.js");
const { default: Notification, NotificationReceipt } = await M("Notification.model.js");
const { default: Payment } = await M("Payment.model.js");
const { default: Subscription } = await M("Subscription.model.js");
const { default: Boost } = await M("Boost.model.js");
const { default: BadgeEvent } = await M("Badge.model.js");
const { default: ChatCooldown } = await M("ChatCooldown.model.js");
const { default: PhotoHandoff } = await M("PhotoHandoff.model.js");
const { default: PickupSpot } = await M("PickupSpot.model.js");
const { default: StaffAccess } = await M("StaffAccess.model.js");
const { default: AuditLog } = await M("AuditLog.model.js");
const { default: AssistantConversation } = await M("AssistantConversation.model.js");

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
const mkUser = async (role, name, extra = {}) => {
  const _id = oid();
  await User.collection.insertOne({ _id, name, email: `${name.toLowerCase()}@t.edu`, role, status: "active", tokenVersion: 0, is_email_verified: true, createdAt: now, ...extra });
  return { _id, email: `${name.toLowerCase()}@t.edu`, token: jwt.sign({ id: String(_id), v: 0 }, process.env.SECRET_KEY_ACCESS_TOKEN, { expiresIn: "15m" }) };
};

const admin = await mkUser("admin", "Asha");
const admin2 = await mkUser("admin", "Arjun");
const support = await mkUser("support", "Sam");
const other = await mkUser("user", "Olive");
const del = await mkUser("user", "Dev");

// Dev sells a desk to Olive, and buys a chair from Olive.
const desk = oid();
const chair = oid();
await Product.collection.insertMany([
  { _id: desk, title: "Desk", status: "sold", is_deleted: false, seller_id: del._id, category: "others", images: [], createdAt: now },
  { _id: chair, title: "Chair", status: "sold", is_deleted: false, seller_id: other._id, category: "others", images: [], createdAt: now },
]);
await User.updateOne({ _id: other._id }, { $set: { wishlist: [desk] } });
const convDesk = oid();
const convChair = oid();
await Conversation.collection.insertMany([
  { _id: convDesk, product_id: desk, seller_id: del._id, buyer_id: other._id, createdAt: now },
  { _id: convChair, product_id: chair, seller_id: other._id, buyer_id: del._id, createdAt: now },
]);
const dealDesk = oid();
const dealChair = oid();
await Deal.collection.insertMany([
  { _id: dealDesk, conversation_id: convDesk, current_price: 500, status: "completed", createdAt: now },
  { _id: dealChair, conversation_id: convChair, current_price: 300, status: "completed", createdAt: now },
]);
await Message.collection.insertMany([
  { _id: oid(), conversation_id: convDesk, sender_id: other._id, receiver_id: del._id, text: "hi", createdAt: now },
  { _id: oid(), conversation_id: convChair, sender_id: del._id, receiver_id: other._id, text: "hey", createdAt: now },
]);
// Olive rated Dev (desk), Dev rated Olive (chair) — Olive's rating must drop it.
await Review.collection.insertMany([
  { _id: oid(), deal_id: dealDesk, conversation_id: convDesk, product_id: desk, seller_id: del._id, buyer_id: other._id, rating: 5, createdAt: now },
  { _id: oid(), deal_id: dealChair, conversation_id: convChair, product_id: chair, seller_id: other._id, buyer_id: del._id, rating: 1, createdAt: now },
]);
await User.updateOne({ _id: other._id }, { $set: { rating: { avg: 1, count: 1 } } });
await Report.collection.insertMany([
  { _id: oid(), target_id: other._id, target_model: "User", reason: "other", status: "pending", reporter_id: del._id, createdAt: now },
  { _id: oid(), target_id: del._id, target_model: "User", reason: "other", status: "pending", reporter_id: other._id, createdAt: now },
  { _id: oid(), target_id: desk, target_model: "Product", reason: "other", status: "pending", reporter_id: other._id, createdAt: now },
]);
const otherReport = oid();
await Report.collection.insertOne({ _id: otherReport, target_id: chair, target_model: "Product", reason: "other", status: "pending", reporter_id: admin2._id, createdAt: now });
await Notification.collection.insertOne({ _id: oid(), title: "t", message: "m", recipient_id: del._id, is_broadcast: false, status: "sent", createdAt: now });
await NotificationReceipt.collection.insertOne({ _id: oid(), notification_id: oid(), user_id: del._id, createdAt: now });
await Payment.collection.insertOne({ _id: oid(), user_id: del._id, amount: 4900, status: "verified", createdAt: now });
await Subscription.collection.insertOne({ _id: oid(), user_id: del._id, tier: "pro", status: "active", createdAt: now });
await Boost.collection.insertOne({ _id: oid(), product_id: desk, user_id: del._id, status: "active", createdAt: now });
await ProductView.collection.insertOne({ _id: oid(), product_id: desk, viewer_key: "u:x", created_at: now });
await BadgeEvent.collection.insertOne({ _id: oid(), user_id: del._id, badge_id: "first_sale", createdAt: now });
await ChatCooldown.collection.insertOne({ _id: oid(), user_id: del._id, strikes: 1, createdAt: now });
await PhotoHandoff.collection.insertOne({ _id: oid(), code: "abc", user: del._id, images: [], createdAt: now });
await PickupSpot.collection.insertOne({ _id: oid(), user: del._id, name: "Gate", createdAt: now });
await AssistantConversation.collection.insertMany([
  { _id: oid(), user_id: del._id, title: "Cycles", messages: [{ _id: oid(), role: "user", text: "cycle" }], last_active_at: now },
  { _id: oid(), user_id: other._id, title: "Books", messages: [], last_active_at: now },
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

console.log("user deletion");

await test("support staff can't delete accounts, even with Users actions", async () => {
  await call(admin, "PUT", "/access/support", { permissions: { users: { view: true, manage: true } } });
  assert.equal((await call(support, "DELETE", `/users/${del._id}`, { confirmEmail: del.email })).status, 403);
});

await test("needs the email typed back; never self or another Super Admin", async () => {
  assert.equal((await call(admin, "DELETE", `/users/${del._id}`, {})).status, 400);
  assert.equal((await call(admin, "DELETE", `/users/${del._id}`, { confirmEmail: "wrong@t.edu" })).status, 400);
  assert.equal((await call(admin, "DELETE", `/users/${admin._id}`, { confirmEmail: admin.email })).status, 400);
  assert.equal((await call(admin, "DELETE", `/users/${admin2._id}`, { confirmEmail: admin2.email })).status, 403);
  assert.equal((await call(admin, "DELETE", "/users/not-an-id", { confirmEmail: "x" })).status, 400);
  assert.ok(await User.exists({ _id: del._id }), "nothing deleted yet");
});

await test("deletes the user and everything linked to them", async () => {
  const r = await call(admin, "DELETE", `/users/${del._id}`, { confirmEmail: "  DEV@t.edu ", reason: "Requested by student" });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.deepEqual(r.body.data.removed, {
    listings: 1, conversations: 2, messages: 2, deals: 2, reviews: 2, reports: 3, notifications: 2, payments: 1, subscriptions: 1,
  });

  const u = { _id: del._id };
  assert.equal(await User.exists(u), null);
  for (const [Model, filter] of [
    [Product, { seller_id: del._id }],
    [Conversation, { $or: [{ buyer_id: del._id }, { seller_id: del._id }] }],
    [Message, { $or: [{ sender_id: del._id }, { receiver_id: del._id }] }],
    [Deal, { _id: { $in: [dealDesk, dealChair] } }],
    [Review, { $or: [{ buyer_id: del._id }, { seller_id: del._id }] }],
    [Report, { $or: [{ reporter_id: del._id }, { target_id: del._id }, { target_id: desk }] }],
    [Notification, { recipient_id: del._id }],
    [NotificationReceipt, { user_id: del._id }],
    [Payment, { user_id: del._id }],
    [Subscription, { user_id: del._id }],
    [Boost, { user_id: del._id }],
    [ProductView, { product_id: desk }],
    [BadgeEvent, { user_id: del._id }],
    [ChatCooldown, { user_id: del._id }],
    [PhotoHandoff, { user: del._id }],
    [PickupSpot, { user: del._id }],
    [AssistantConversation, { user_id: del._id }],
  ]) {
    assert.equal(await Model.countDocuments(filter), 0, `${Model.modelName} left behind`);
  }
});

await test("other people's data stays, and points at nothing deleted", async () => {
  const olive = await User.findById(other._id).lean();
  assert.ok(olive);
  assert.deepEqual(olive.wishlist, [], "deleted listing pulled from wishlists");
  assert.deepEqual(olive.rating, { avg: 0, count: 0 }, "Dev's review no longer counts");
  assert.ok(await Product.exists({ _id: chair }), "Olive's own listing stays");
  assert.ok(await Report.exists({ _id: otherReport }), "unrelated reports stay");
  assert.equal(await AssistantConversation.countDocuments({ user_id: other._id }), 1, "Olive's AI chats stay");
});

await test("the deletion is audited and can't be repeated", async () => {
  const entry = await AuditLog.findOne({ action: "user.delete", target_id: del._id }).lean();
  assert.ok(entry);
  assert.equal(entry.target_snapshot.email, del.email);
  assert.equal(entry.metadata.reason, "Requested by student");
  assert.equal(entry.metadata.removed.listings, 1);
  assert.equal((await call(admin, "DELETE", `/users/${del._id}`, { confirmEmail: del.email })).status, 404);
});

await test("deleting a support person also removes their custom access", async () => {
  await call(admin, "PUT", `/access/staff/${support._id}`, { permissions: { jobs: { view: true } } });
  assert.ok(await StaffAccess.exists({ user_id: support._id }));
  assert.equal((await call(admin, "DELETE", `/users/${support._id}`, { confirmEmail: support.email })).status, 200);
  assert.equal(await StaffAccess.exists({ user_id: support._id }), null);
  assert.equal((await call(support, "GET", "/access")).status, 401, "their session is gone");
});

server.close();
await mongoose.disconnect();
await mongod.stop();
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
