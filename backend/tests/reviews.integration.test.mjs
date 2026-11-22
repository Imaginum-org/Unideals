// Run: node tests/reviews.integration.test.mjs
// Buyer ratings + overview insights, against a real in-memory MongoDB.
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
const { default: Review } = await import(B + "src/models/Review.model.js");
await Promise.all([Product.init(), User.init(), Conversation.init(), Deal.init(), Review.init()]);
const deals = await import(B + "src/services/deal.service.js");
const reviews = await import(B + "src/services/review.service.js");
const { getInsights } = await import(B + "src/services/insights.service.js");
const { getUserOrders } = await import(B + "src/services/order.service.js");

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

const campus = await Campus.create({ slug: "vit", name: "VIT", short_name: "VIT", is_active: true });
let n = 0;
const mkUser = () =>
  User.create({
    name: `U${++n}`, email: `u${n}@t.edu`, password: "password123", campus_id: campus._id,
    is_email_verified: true, status: "active", gender: "male",
  });
const seller = await mkUser();
const buyer = await mkUser();
const S = String(seller._id);
const Bu = String(buyer._id);
const tomorrow = new Date(Date.now() + 864e5).toISOString();

const mkThread = async (price = 900) => {
  const product = await Product.create({
    seller_id: seller._id, campus_id: campus._id, title: `Item ${++n}`, description: "Works perfectly, barely used.",
    category: "electronics", condition: "like_new", selling_price: price, original_price: 1500,
    images: [{ url: "https://ik.imagekit.io/x/a.jpg", fileId: "f" }], status: "listed", payment_preference: "both",
    pickup_address_snapshot: { address_line: "Gate", city: "V" },
  });
  const conv = await Conversation.create({
    product_id: product._id, seller_id: seller._id, buyer_id: buyer._id,
    product_snapshot: { title: product.title, selling_price: product.selling_price },
    last_message: "hi",
  });
  return String(conv._id);
};
const complete = async (id, amount) => {
  await deals.confirmDeal({ conversationId: id, userId: S, amount });
  await deals.schedulePickup({ conversationId: id, userId: S, date: tomorrow, location: "Library" });
  await deals.confirmPayment({ conversationId: id, userId: S });
  await deals.confirmItemReceived({ conversationId: id, userId: Bu });
};

console.log("\nRatings");
await test("can't rate before the deal is complete", async () => {
  const id = await mkThread();
  await deals.confirmDeal({ conversationId: id, userId: S, amount: 800 });
  await assert.rejects(() => reviews.createReview({ conversationId: id, userId: Bu, rating: 5 }), /once the deal is complete/);
});
await test("only the deal's buyer or seller can rate, with 1-5 whole stars", async () => {
  const id = await mkThread();
  await complete(id, 800);
  const stranger = await mkUser();
  await assert.rejects(() => reviews.createReview({ conversationId: id, userId: String(stranger._id), rating: 5 }), /Only the buyer or seller/);
  await assert.rejects(() => reviews.createReview({ conversationId: id, userId: Bu, rating: 6 }), /1 to 5/);
  await assert.rejects(() => reviews.createReview({ conversationId: id, userId: Bu, rating: 4.5 }), /1 to 5/);
});
let ratedConv;
await test("buyer rates once; the seller average updates; a second rating is refused", async () => {
  ratedConv = await mkThread();
  await complete(ratedConv, 800);
  const { sellerRating } = await reviews.createReview({ conversationId: ratedConv, userId: Bu, rating: 4, comment: "  Smooth   deal  " });
  assert.deepEqual(sellerRating, { avg: 4, count: 1 });
  assert.equal((await Review.findOne({ conversation_id: ratedConv })).comment, "Smooth deal");
  await assert.rejects(() => reviews.createReview({ conversationId: ratedConv, userId: Bu, rating: 5 }), /already rated/);
  const u = await User.findById(S).select("rating").lean();
  assert.deepEqual(u.rating, { avg: 4, count: 1 });
});
await test("summary returns average, count and distribution", async () => {
  const id = await mkThread();
  await complete(id, 500);
  await reviews.createReview({ conversationId: id, userId: Bu, rating: 5 });
  const s = await reviews.getRatingSummary(S);
  assert.equal(s.count, 2);
  assert.equal(s.avg, 4.5);
  assert.equal(s.distribution[5], 1);
  assert.equal(s.distribution[4], 1);
  assert.equal(s.recent.length, 2);
});
await test("orders feed tells the buyer which deals they rated", async () => {
  const { data: orders } = await getUserOrders({ userId: Bu, role: "buying", status: "completed" });
  const rated = orders.find((o) => String(o.conversationId) === ratedConv);
  assert.equal(rated.myRating, 4);
});

console.log("\nInsights");
await test("earnings, spend and deals waiting come from deals", async () => {
  const pending = await mkThread();
  await deals.confirmDeal({ conversationId: pending, userId: S, amount: 300 });
  const s = await getInsights(S);
  // Completed as seller: 800 + 800 + 500 (the first thread never completed).
  assert.equal(s.earnings.total, 2100);
  assert.equal(s.earnings.count, 3);
  assert.equal(s.earnings.months.length, 6);
  assert.equal(s.earnings.months.at(-1).total, 2100);
  assert.equal(s.deals.selling, 2); // the 800 confirmed-only thread + this one
  assert.equal(s.deals.yourTurn, 2); // seller must schedule pickup on both
  assert.deepEqual(s.rating, { avg: 4.5, count: 2 });
  const b = await getInsights(Bu);
  assert.equal(b.spent.total, 2100);
  assert.equal(b.deals.buying, 2);
  assert.equal(b.deals.yourTurn, 0);
});

console.log("\nCampus stats");
await test("hero stats count live listings, sellers and completed deals on this campus", async () => {
  const { getCampusStats } = await import(B + "src/services/campusStats.service.js");
  const s = await getCampusStats(campus._id);
  const live = await Product.countDocuments({ campus_id: campus._id, status: "listed", is_deleted: false });
  assert.equal(s.liveListings, live);
  assert.equal(s.activeSellers, live > 0 ? 1 : 0);
  assert.equal(s.dealsLast30Days, 3);
  const other = await Campus.create({ slug: "x", name: "X", short_name: "X", is_active: true });
  assert.equal((await getCampusStats(other._id)).dealsLast30Days, 0, "other campuses don't count");
});

console.log("\nBadges");
await test("completed purchases count as buys, and locked badges report progress", async () => {
  const { computeAndAwardBadges } = await import(B + "src/services/badgeService.js");
  const g = await computeAndAwardBadges(Bu);
  assert.ok(g.badges.some((b) => b.badge_id === "first_buy"), "first_buy earned");
  const hunter = g.locked_badges.find((l) => l.badge_id === "deal_hunter");
  assert.deepEqual(hunter.progress, { current: 3, required: 5 });
  assert.ok(!g.locked_badges.some((l) => l.badge_id === "first_buy"), "earned badges are not locked");
});

console.log("\nTwo-way ratings + popup queue");
await test("both sides see a completed deal in their pending list until they rate", async () => {
  const id = await mkThread();
  await complete(id, 700);
  const sp = await reviews.getPendingReviews(S);
  const bp = await reviews.getPendingReviews(Bu);
  const sItem = sp.find((x) => String(x.conversationId) === id);
  const bItem = bp.find((x) => String(x.conversationId) === id);
  assert.equal(sItem.role, "seller");
  assert.equal(sItem.otherParty.name, buyer.name);
  assert.equal(bItem.role, "buyer");
  assert.equal(bItem.otherParty.name, seller.name);
  // Buyer rates: gone from the buyer's list, still on the seller's.
  await reviews.createReview({ conversationId: id, userId: Bu, rating: 5 });
  assert.ok(!(await reviews.getPendingReviews(Bu)).some((x) => String(x.conversationId) === id));
  assert.ok((await reviews.getPendingReviews(S)).some((x) => String(x.conversationId) === id));
});
await test("seller rates the buyer; the buyer's rating updates and the seller can't rate twice", async () => {
  const before = (await User.findById(S).select("rating").lean()).rating;
  const pending = await reviews.getPendingReviews(S);
  for (const item of pending) await reviews.createReview({ conversationId: String(item.conversationId), userId: S, rating: 4 });
  assert.equal((await reviews.getPendingReviews(S)).length, 0);
  const bRating = (await User.findById(Bu).select("rating").lean()).rating;
  assert.equal(bRating.count, pending.length);
  assert.equal(bRating.avg, 4);
  const sumB = await reviews.getRatingSummary(Bu);
  assert.equal(sumB.recent[0].reviewer_role, "seller");
  assert.equal(sumB.recent[0].reviewer.name, seller.name);
  await assert.rejects(() => reviews.createReview({ conversationId: String(pending[0].conversationId), userId: S, rating: 5 }), /already rated/);
  // Seller's own rating only counts ratings the seller received.
  const after = (await User.findById(S).select("rating").lean()).rating;
  assert.deepEqual(after, before, "rating the buyer doesn't change the seller's own rating");
});
await test("deals older than the window aren't asked about", async () => {
  const id = await mkThread();
  await complete(id, 600);
  await Deal.updateOne({ conversation_id: id }, { $set: { completed_at: new Date(Date.now() - (reviews.PENDING_WINDOW_DAYS + 1) * 864e5) } });
  assert.ok(!(await reviews.getPendingReviews(Bu)).some((x) => String(x.conversationId) === id));
});
await test("orders feed shows the seller's own rating of the buyer", async () => {
  const { data: orders } = await getUserOrders({ userId: S, role: "selling", status: "completed" });
  assert.ok(orders.some((o) => o.myRating === 4));
});
await test("legacy buyer reviews (no reviewer fields) count as the buyer's, and the old deal-only unique index heals", async () => {
  const id = await mkThread();
  await complete(id, 650);
  const deal = await Deal.findOne({ conversation_id: id }).lean();
  // Old schema: unique on deal_id alone, and no reviewer fields. (Clear the
  // two-way rows first: the old index can't even be built over them.)
  await Review.deleteMany({});
  await Review.collection.createIndex({ deal_id: 1 }, { unique: true, name: "deal_id_1" });
  await Review.collection.insertOne({
    deal_id: deal._id, conversation_id: deal.conversation_id, seller_id: seller._id, buyer_id: buyer._id,
    rating: 3, comment: "", product_title: "", createdAt: new Date(), updatedAt: new Date(),
  });
  assert.ok(!(await reviews.getPendingReviews(Bu)).some((x) => String(x.conversationId) === id), "legacy row = buyer already rated");
  await assert.rejects(() => reviews.createReview({ conversationId: id, userId: Bu, rating: 5 }), /already rated/);
  // Seller can still rate the buyer even though deal_id_1 exists.
  await reviews.createReview({ conversationId: id, userId: S, rating: 5 });
  const idx = await Review.collection.indexes();
  assert.ok(!idx.some((i) => i.name === "deal_id_1"), "old index dropped");
});

await mongoose.disconnect();
await mongod.stop();
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
