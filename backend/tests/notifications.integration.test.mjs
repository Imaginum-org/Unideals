// Run: node tests/notifications.integration.test.mjs
// Notification engine against a real in-memory MongoDB (no sockets: pushes no-op).
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
const { default: Conversation } = await import(B + "src/models/conversation.model.js");
const { default: Deal } = await import(B + "src/models/deal.model.js");
const { default: Notification, NotificationReceipt } = await import(B + "src/models/Notification.model.js");
await Promise.all([User.init(), Product.init(), Conversation.init(), Deal.init(), Notification.init(), NotificationReceipt.init()]);
const svc = await import(B + "src/services/notification.service.js");
const deals = await import(B + "src/services/deal.service.js");

let passed = 0;
let failed = 0;
const test = async (name, fn) => {
  try {
    await fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failed++;
    console.log(`  ✗ ${name}\n    ${err.stack?.split("\n").slice(0, 3).join("\n    ")}`);
  }
};
const settle = () => new Promise((r) => setTimeout(r, 100));

const campus = await Campus.create({ slug: "vit", name: "VIT", short_name: "VIT", is_active: true });
let n = 0;
const mkUser = (extra = {}) =>
  User.create({
    name: `U${++n}`, email: `u${n}@t.edu`, password: "password123", campus_id: campus._id,
    is_email_verified: true, status: "active", gender: "male", ...extra,
  });
const seller = await mkUser({ name: "Sam" });
const buyer = await mkUser({ name: "Bea" });
const S = String(seller._id);
const Bu = String(buyer._id);
const mkProduct = (price = 900) =>
  Product.create({
    seller_id: seller._id, campus_id: campus._id, title: `Item ${++n}`, description: "Works perfectly, barely used.",
    category: "electronics", condition: "like_new", selling_price: price, original_price: 1500,
    images: [{ url: "https://ik.imagekit.io/x/a.jpg", fileId: "f" }], status: "listed", payment_preference: "both",
    pickup_address_snapshot: { address_line: "Gate", city: "V" },
  });
const mkThread = async () => {
  const product = await mkProduct();
  const conv = await Conversation.create({
    product_id: product._id, seller_id: seller._id, buyer_id: buyer._id,
    product_snapshot: { title: product.title, selling_price: product.selling_price }, last_message: "hi",
  });
  return String(conv._id);
};
const feed = (userId) => svc.getUserNotificationFeed(userId);
const directFor = (userId, title) => Notification.find({ recipient_id: userId, ...(title && { title }) }).lean();

console.log("\nDirect notifications");
await test("chat alerts group while unread, and start fresh once read", async () => {
  const conversationId = await mkThread();
  const send = (text) => svc.notifyNewMessage({ conversationId, senderId: S, receiverId: Bu, senderName: "Sam", textSnippet: text });
  await send("hey");
  await send("still there?");
  await send("price is firm");
  let rows = (await feed(Bu)).notifications.filter((x) => x.kind === "message");
  assert.equal(rows.length, 1);
  assert.equal(rows[0].count, 3);
  assert.equal(rows[0].title, "3 new messages from Sam");
  assert.equal(rows[0].message, "price is firm");
  assert.equal(rows[0].type, "DIRECT MESSAGE");

  await svc.markNotificationRead(rows[0].id, Bu);
  await send("hello again");
  rows = (await feed(Bu)).notifications.filter((x) => x.kind === "message");
  assert.equal(rows.length, 2);
  assert.equal(rows[0].title, "New message from Sam");
  assert.equal(rows[0].unread, true);
});

await test("every delivered notification gets sent_at and a 30-day expires_at", async () => {
  const note = await svc.notifyUser({ userId: Bu, title: "Hi", message: "There" });
  assert.ok(note.sent_at);
  const days = (note.expires_at - note.sent_at) / 864e5;
  assert.equal(Math.round(days), 30);
});

await test("long names can't push a title past the schema limit", async () => {
  const note = await svc.notifyNewMessage({
    conversationId: await mkThread(), senderId: S, receiverId: Bu, senderName: "X".repeat(150), textSnippet: "yo",
  });
  assert.ok(note, "notification created instead of failing validation");
  assert.ok(note.title.length <= 100);
});

await test("price-drop alerts: one per user per product per day", async () => {
  const product = await mkProduct(1000);
  const fan = await mkUser({ wishlist: [product._id] });
  await svc.notifyPriceDrop({ productId: product._id, productTitle: product.title, oldPrice: 1000, newPrice: 950 });
  await svc.notifyPriceDrop({ productId: product._id, productTitle: product.title, oldPrice: 950, newPrice: 900 });
  const rows = await directFor(fan._id);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].type, "price_drop");
  assert.equal(await svc.notifyPriceDrop({ productId: product._id, oldPrice: 900, newPrice: 950 }), null, "price rise ignored");
});

console.log("\nDeal lifecycle triggers");
await test("declined offer, locked deal and confirmed payment all notify the buyer", async () => {
  const conversationId = await mkThread();
  const { message } = await deals.makeOffer({ conversationId, userId: Bu, amount: 700 });
  await deals.respondOffer({ conversationId, userId: S, messageId: message._id, action: "decline" });
  await deals.confirmDeal({ conversationId, userId: S, amount: 800 });
  await deals.schedulePickup({ conversationId, userId: S, date: new Date(Date.now() + 864e5).toISOString(), location: "Library" });
  await deals.confirmPayment({ conversationId, userId: S });
  await settle();
  const titles = (await directFor(Bu)).map((x) => x.title);
  for (const t of ["Offer declined", "Deal locked 🔒", "Pickup Spot Confirmed 📍", "Payment confirmed"]) {
    assert.ok(titles.includes(t), `missing "${t}"`);
  }
  assert.ok((await directFor(S, "New Offer Received!")).length >= 1, "seller told about the offer");
});

console.log("\nBroadcast campaigns");
await test("scheduled campaigns never expire before they're sent, and show their send time", async () => {
  const c = await svc.createAdminNotification({
    title: "Fest sale", message: "Big discounts", type: "promotion", target_audience: "campus",
    target_campus: String(campus._id), schedule_type: "scheduled", scheduled_at: new Date(Date.now() + 60e3).toISOString(),
  });
  assert.equal(c.status, "scheduled");
  assert.equal(c.expires_at, null);
  // Pretend it was written long ago and is now due.
  const longAgo = new Date(Date.now() - 20 * 864e5);
  await Notification.collection.updateOne({ _id: c._id }, { $set: { createdAt: longAgo, scheduled_at: new Date(Date.now() - 1000) } });
  assert.equal(await svc.dispatchDueScheduledNotifications(), 1);
  const sent = await Notification.findById(c._id).lean();
  assert.equal(sent.status, "sent");
  assert.ok(sent.sent_at > longAgo);
  assert.equal(sent.stats.total_sent, await User.countDocuments({ campus_id: campus._id, status: "active" }));
  const row = (await feed(Bu)).notifications.find((x) => x.id === String(c._id));
  assert.ok(row, "visible in the feed");
  assert.equal(row.time, "Just now");
  assert.equal(row.type, "PROMOTION");
});

await test("users who joined after creation but before sending still get it", async () => {
  const c = await svc.createAdminNotification({
    title: "Later", message: "m", target_audience: "all", schedule_type: "scheduled",
    scheduled_at: new Date(Date.now() + 60e3).toISOString(),
  });
  const newcomer = await mkUser();
  await Notification.updateOne({ _id: c._id }, { $set: { scheduled_at: new Date(Date.now() - 1000) } });
  await svc.dispatchDueScheduledNotifications();
  assert.ok((await feed(newcomer._id)).notifications.some((x) => x.id === String(c._id)));
});

await test("a dispatch that throws marks the campaign failed instead of leaving it stuck", async () => {
  const { insertedId } = await Notification.collection.insertOne({
    title: "Broken", message: "m", type: "general", target_audience: "campus", target_campus: null,
    is_broadcast: true, status: "scheduled", scheduled_at: new Date(Date.now() - 1000), createdAt: new Date(),
  });
  await svc.dispatchDueScheduledNotifications();
  const row = await Notification.findById(insertedId).lean();
  assert.equal(row.status, "failed");
  assert.match(row.failure_reason, /campus/);
});

await test("a send that crashed mid-way is picked up again", async () => {
  const { insertedId } = await Notification.collection.insertOne({
    title: "Crashed", message: "m", type: "general", target_audience: "all", is_broadcast: true,
    status: "sending", schedule_type: "now", createdAt: new Date(), updatedAt: new Date(Date.now() - 11 * 60e3),
  });
  await svc.dispatchDueScheduledNotifications();
  assert.equal((await Notification.findById(insertedId).lean()).status, "sent");
});

await test("clicks are counted once per user", async () => {
  const c = await svc.createAdminNotification({ title: "Click me", message: "m", target_audience: "all" });
  await svc.trackNotificationClick(String(c._id), Bu);
  await svc.trackNotificationClick(String(c._id), Bu);
  await svc.trackNotificationClick(String(c._id), S);
  assert.equal((await Notification.findById(c._id).lean()).stats.clicked, 2);

  const d = await svc.notifyUser({ userId: Bu, title: "Direct", message: "m" });
  await svc.trackNotificationClick(String(d._id), Bu);
  await svc.trackNotificationClick(String(d._id), Bu);
  assert.equal((await Notification.findById(d._id).lean()).stats.clicked, 1);
  assert.equal(await NotificationReceipt.countDocuments({ notification_id: d._id }), 0, "no receipts for direct rows");
});

await test("dismiss hides a broadcast for one user only; mark-all clears the badge", async () => {
  const c = await svc.createAdminNotification({ title: "Dismiss me", message: "m", target_audience: "all" });
  await svc.dismissNotification(String(c._id), Bu);
  assert.ok(!(await feed(Bu)).notifications.some((x) => x.id === String(c._id)));
  assert.ok((await feed(S)).notifications.some((x) => x.id === String(c._id)));
  await svc.markAllNotificationsRead(S);
  assert.equal((await feed(S)).unreadCount, 0);
});

await test("other users can't touch someone else's direct notification", async () => {
  const d = await svc.notifyUser({ userId: Bu, title: "Mine", message: "m" });
  await assert.rejects(svc.markNotificationRead(String(d._id), S), /not found/);
  await assert.rejects(svc.dismissNotification(String(d._id), S), /not found/);
});

await test("legacy rows without sent_at still show in the feed", async () => {
  const { insertedId } = await Notification.collection.insertOne({
    title: "Old style", message: "m", type: "announcement", target_audience: "all", is_broadcast: true,
    status: "sent", createdAt: new Date(),
  });
  assert.ok((await feed(Bu)).notifications.some((x) => x.id === String(insertedId)));
});

await mongoose.disconnect();
await mongod.stop();
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
