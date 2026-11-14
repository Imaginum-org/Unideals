// Run: node tests/labs.integration.test.mjs
// Smart price suggestions + Demand meter (Labs), against a real in-memory
// MongoDB. Each test pins down a way the old version misled sellers.
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
await Promise.all([Product.init(), User.init(), Conversation.init(), Deal.init()]);
const labs = await import(B + "src/services/labs.service.js");

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

let n = 0;
const campus = await Campus.create({ slug: "vit", name: "VIT", short_name: "VIT", is_active: true });
const mkUser = () =>
  User.create({
    name: `U${++n}`, email: `u${n}@t.edu`, password: "password123", campus_id: campus._id,
    is_email_verified: true, status: "active", gender: "male",
  });
const mkProduct = (seller, { price, original, condition = "like_new", category = "electronics", ...extra }) =>
  Product.create({
    seller_id: seller._id, campus_id: campus._id, title: `Item ${++n}`, description: "Works perfectly, barely used.",
    category, condition, selling_price: price, original_price: original,
    images: [{ url: "https://x/a.jpg", fileId: "f" }], status: "listed", payment_preference: "both",
    pickup_address_snapshot: { address_line: "Gate", city: "V" }, ...extra,
  });
// A completed sale (the listing is gone; only the deal's sale record remains).
const mkSale = async (seller, buyer, { sold, original, condition = "like_new", category = "electronics", daysAgo = 3 }) => {
  const conv = await Conversation.create({
    product_id: new mongoose.Types.ObjectId(), seller_id: seller._id, buyer_id: buyer._id,
    product_snapshot: { title: "Sold item", selling_price: sold },
  });
  return Deal.create({
    conversation_id: conv._id, original_price: sold, current_price: sold, status: "completed",
    completed_at: new Date(Date.now() - daysAgo * 864e5),
    sale: { campus_id: campus._id, category, condition, original_price: original, sold_price: sold, seller_id: seller._id },
  });
};
const reset = async () => {
  await Promise.all([Product.deleteMany({}), Deal.deleteMany({}), Conversation.deleteMany({})]);
  // Insights are cached per campus+category; use a fresh campus id per test.
};
let freshCampus = campus._id;
const insights = (args) => labs.getPriceInsights({ campusId: freshCampus, category: "electronics", ...args });

const other = await mkUser();
const buyer = await mkUser();
const me = await mkUser();

console.log("Smart price suggestion");

await test("is about THIS item: a ₹1,000 calculator and a ₹40,000 phone get different prices", async () => {
  await reset();
  freshCampus = campus._id;
  // Same category, wildly different items, all listed at 60% of new.
  for (const [price, original] of [[300, 500], [450, 750], [600, 1000], [1200, 2000], [30000, 50000]]) {
    await mkProduct(other, { price, original });
  }
  const calc = await insights({ userId: me._id, condition: "like_new", originalPrice: 1000 });
  const phone = await insights({ userId: me._id, condition: "like_new", originalPrice: 40000 });
  assert.equal(calc.basis, "listed");
  assert.equal(calc.suggestion.suggested, 600);
  assert.equal(phone.suggestion.suggested, 24000);
  assert.equal(calc.ratio.median, 60);
});

await test("absurd prices don't skew it (above-new and near-zero listings are ignored)", async () => {
  freshCampus = new mongoose.Types.ObjectId();
  for (const [price, original] of [[300, 500], [600, 1000], [1200, 2000], [3000, 5000]]) {
    await mkProduct(other, { price, original, campus_id: freshCampus });
  }
  // The model blocks price > original on save, but old or hand-edited data
  // can still hold one: write it directly to prove it's ignored.
  const raw = (await mkProduct(other, { price: 500, original: 1000, campus_id: freshCampus })).toObject();
  await Product.collection.insertOne({ ...raw, _id: new mongoose.Types.ObjectId(), slug: `absurd-${n}`, selling_price: 5999999, original_price: 60000 });
  await Product.deleteOne({ _id: raw._id });
  await mkProduct(other, { price: 1, original: 2000, campus_id: freshCampus }); // 0.05%: junk, ignored
  const r = await insights({ userId: me._id, condition: "like_new", originalPrice: 1000 });
  assert.equal(r.listedSamples, 4);
  assert.equal(r.suggestion.suggested, 600);
});

await test("adjusts for condition: a well-used item is priced lower than like-new comparables", async () => {
  freshCampus = new mongoose.Types.ObjectId();
  for (const [price, original] of [[600, 1000], [600, 1000], [600, 1000], [600, 1000]]) {
    await mkProduct(other, { price, original, campus_id: freshCampus });
  }
  const r = await insights({ userId: me._id, condition: "well_used", originalPrice: 1000 });
  // 60% for like-new (0.70) → 0.6 / 0.7 × 0.4 ≈ 34% for well-used.
  assert.equal(r.suggestion.suggested, 340);
});

await test("needs the seller's original price for a number, but still shows the typical %", async () => {
  const r = await insights({ userId: me._id, condition: "like_new" });
  assert.equal(r.enoughData, true);
  assert.equal(r.suggestion, null);
  assert.equal(r.ratio.median, 60);
});

await test("never suggests asking more than the item cost new", async () => {
  const r = labs.buildPriceInsight({
    listed: [1, 2, 3, 4].map(() => ({ price: 950, original: 1000, condition: "for_parts_or_not_working" })),
    sold: [],
    condition: "brand_new",
    originalPrice: 1000,
  });
  assert.ok(r.suggestion.suggested < 1000, `got ${r.suggestion.suggested}`);
});

await test("the seller's own listings never count as the market", async () => {
  freshCampus = new mongoose.Types.ObjectId();
  for (let i = 0; i < 6; i += 1) await mkProduct(me, { price: 900, original: 1000, campus_id: freshCampus });
  const r = await insights({ userId: me._id, condition: "like_new", originalPrice: 1000 });
  assert.equal(r.enoughData, false);
  assert.equal(r.suggestion, null);
});

await test("prefers real completed sales over asking prices", async () => {
  freshCampus = new mongoose.Types.ObjectId();
  for (let i = 0; i < 5; i += 1) await mkProduct(other, { price: 800, original: 1000, campus_id: freshCampus }); // asking 80%
  // Sales recorded against this fresh campus.
  for (let i = 0; i < 3; i += 1) {
    const d = await mkSale(other, buyer, { sold: 500, original: 1000 }); // actually sold at 50%
    await Deal.updateOne({ _id: d._id }, { $set: { "sale.campus_id": freshCampus } });
  }
  const r = await insights({ userId: me._id, condition: "like_new", originalPrice: 1000 });
  assert.equal(r.basis, "sold");
  assert.equal(r.soldSamples, 3);
  assert.equal(r.suggestion.suggested, 500);
});

await test("says 'not enough data' instead of guessing from 1-2 listings", async () => {
  freshCampus = new mongoose.Types.ObjectId();
  await mkProduct(other, { price: 500, original: 1000, campus_id: freshCampus });
  await mkProduct(other, { price: 700, original: 1000, campus_id: freshCampus });
  const r = await insights({ userId: me._id, condition: "like_new", originalPrice: 1000 });
  assert.equal(r.enoughData, false);
  assert.equal(r.confidence, null);
});

await test("rejects an invalid category", async () => {
  await assert.rejects(labs.getPriceInsights({ campusId: campus._id, category: "weapons" }), /valid category/);
});

console.log("\nDemand meter");

await test("too little activity → 'insufficient', never a confident label", async () => {
  assert.equal(labs.demandLevel({ live: 1, sales30: 1, chats30: 3, newListings30: 1 }), "insufficient");
});

await test("levels come from real sell-through and buyer chats", () => {
  assert.equal(labs.demandLevel({ live: 6, sales30: 3, chats30: 2, newListings30: 4 }), "high"); // 33% sold
  assert.equal(labs.demandLevel({ live: 10, sales30: 0, chats30: 20, newListings30: 5 }), "high"); // 2 chats/listing
  assert.equal(labs.demandLevel({ live: 10, sales30: 1, chats30: 2, newListings30: 5 }), "low");
  assert.equal(labs.demandLevel({ live: 10, sales30: 2, chats30: 3, newListings30: 5 }), "moderate");
});

await test("counts sales by when the deal completed (not when a listing was last edited)", async () => {
  freshCampus = new mongoose.Types.ObjectId();
  for (let i = 0; i < 4; i += 1) await mkProduct(other, { price: 500, original: 1000, campus_id: freshCampus });
  for (const daysAgo of [2, 10, 45]) {
    const d = await mkSale(other, buyer, { sold: 500, original: 1000, daysAgo });
    await Deal.updateOne({ _id: d._id }, { $set: { "sale.campus_id": freshCampus } });
  }
  // An old sold listing that was merely edited recently must NOT count.
  const stale = await mkProduct(other, { price: 500, original: 1000, campus_id: freshCampus, status: "sold" });
  await Product.updateOne({ _id: stale._id }, { $set: { views_count: 99 } });
  const r = await insights({ userId: me._id, condition: "like_new", includeDemand: true });
  assert.equal(r.demand.live, 4);
  assert.equal(r.demand.sales30, 2);
});

await test("counts new buyer chats on listings in the category (old chats don't count)", async () => {
  freshCampus = new mongoose.Types.ObjectId();
  const live = [];
  for (let i = 0; i < 5; i += 1) live.push(await mkProduct(other, { price: 500, original: 1000, campus_id: freshCampus }));
  const chat = (p) =>
    Conversation.create({ product_id: p._id, seller_id: other._id, buyer_id: buyer._id, product_snapshot: { title: p.title, selling_price: p.selling_price } });
  await chat(live[0]);
  await chat(live[1]);
  await chat(live[2]);
  const old = await chat(live[3]);
  await Conversation.collection.updateOne({ _id: old._id }, { $set: { createdAt: new Date(Date.now() - 60 * 864e5) } });
  const r = await insights({ userId: me._id, includeDemand: true });
  assert.equal(r.demand.chats30, 3);
  assert.equal(r.demand.live, 5);
});

await test("demand isn't included unless asked (Pro vs Pro+)", async () => {
  const r = await insights({ userId: me._id, condition: "like_new" });
  assert.equal(r.demand, undefined);
});

await mongoose.disconnect();
await mongod.stop();
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
