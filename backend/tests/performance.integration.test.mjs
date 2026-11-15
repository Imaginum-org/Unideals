// Run: node tests/performance.integration.test.mjs
// DB-efficiency changes (docs/changelog/2026-11-db-and-jobs-optimisation.md):
// feed page cache + invalidation, bulk subscription expiry, batched cleanup
// jobs, orphan sweep via distinct, Girls Corner sweep, coalesced badge
// recompute, sparse slug index — against in-memory MongoDB.
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
const { default: Subscription } = await import(B + "src/models/Subscription.model.js");
await Promise.all([Product.init(), User.init(), Subscription.init()]);
const svc = await import(B + "src/services/product.service.js");
const { feedPageCache } = await import(B + "src/utils/boostedCache.js");
const { expireDueSubscriptions } = await import(B + "src/services/subscription.service.js");
const { autoUnlistInvalidGirlsListings } = await import(B + "src/jobs/autoUnlistInvalidGirlsListings.job.js");
const registry = await import(B + "src/jobs/jobRegistry.js");
const { scheduleCleanupDeletedProducts } = await import(B + "src/jobs/cleanupDeletedProducts.job.js");
const badges = await import(B + "src/services/badgeService.js");
scheduleCleanupDeletedProducts();

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
const mkUser = (extra = {}) =>
  User.create({
    name: `U${++n}`, email: `u${n}@t.edu`, password: "password123", campus_id: campus._id,
    is_email_verified: true, status: "active", gender: "male", ...extra,
  });
const mkProduct = (seller, extra = {}) =>
  Product.create({
    seller_id: seller._id, campus_id: campus._id, title: `Item ${++n}`,
    description: "Works perfectly, barely used.", category: "electronics", condition: "like_new",
    selling_price: 500, original_price: 900, images: [{ url: "https://x/a.jpg", fileId: "f" }],
    status: "listed", payment_preference: "both",
    pickup_address_snapshot: { address_line: "Gate", city: "V" }, ...extra,
  });
const daysAgo = (d) => new Date(Date.now() - d * 86400000);
const feed = (q = {}) => svc.getAllProducts({ sort: "latest", ...q }, campus._id, "male", "user");

const seller = await mkUser();

console.log("\nFeed page cache");
await test("repeat feed pages are served from memory", async () => {
  await mkProduct(seller);
  feedPageCache.clear();
  const spy = Product.aggregate;
  let calls = 0;
  Product.aggregate = function (...args) {
    calls++;
    return spy.apply(this, args);
  };
  try {
    await feed();
    const afterFirst = calls;
    await feed();
    // Second request: no page aggregation (count/price are cached too).
    assert.equal(calls, afterFirst);
  } finally {
    Product.aggregate = spy;
  }
});
await test("a new / edited / sold listing clears it; view bumps don't", async () => {
  feedPageCache.clear();
  const before = (await feed()).data.length;
  const p = await mkProduct(seller);
  assert.equal((await feed()).data.length, before + 1, "new listing visible immediately");
  await feed();
  // A view bump must not clear the cache: change the title behind Mongoose's
  // back (no hooks), bump views via a hooked update, and the page still
  // shows the cached title.
  await Product.collection.updateOne({ _id: p._id }, { $set: { title: "Sneaky" } });
  await Product.updateOne({ _id: p._id }, { $inc: { views_count: 1 } });
  assert.notEqual((await feed()).data.find((x) => String(x._id) === String(p._id)).title, "Sneaky");
  const cachedTitle = (await feed()).data.find((x) => String(x._id) === String(p._id)).title;
  await Product.updateOne({ _id: p._id }, { $set: { title: "Renamed lamp" } });
  assert.notEqual(cachedTitle, "Renamed lamp");
  assert.equal((await feed()).data.find((x) => String(x._id) === String(p._id)).title, "Renamed lamp");
  await Product.updateOne({ _id: p._id }, { $set: { status: "sold" } });
  assert.equal((await feed()).data.some((x) => String(x._id) === String(p._id)), false);
});
await test("search results are never cached", async () => {
  feedPageCache.clear();
  assert.equal((await feed({ search: "Quokka" })).data.length, 0);
  // Inserted without model hooks (nothing clears caches): an uncached
  // search still finds it on the very next identical request.
  await Product.collection.insertOne({
    title: "Quokka plush", campus_id: campus._id, seller_id: seller._id, status: "listed",
    is_deleted: false, category: "electronics", selling_price: 100, createdAt: new Date(), slug: "quokka-1",
  });
  assert.equal((await feed({ search: "Quokka" })).data.length, 1);
});

console.log("\nSlug index");
await test("several listings without a slug can coexist (sparse unique)", async () => {
  await Product.collection.insertMany([
    { title: "", status: "draft", seller_id: seller._id, campus_id: campus._id, is_deleted: false },
    { title: "", status: "draft", seller_id: seller._id, campus_id: campus._id, is_deleted: false },
  ]);
  const idx = (await Product.collection.indexes()).find((i) => i.key.slug === 1);
  assert.equal(idx.unique, true);
  assert.equal(idx.sparse, true);
});

console.log("\nSubscription expiry");
await test("expires due plans in bulk and never downgrades a renewed user", async () => {
  const a = await mkUser({ subscription: "pro" });
  const b = await mkUser({ subscription: "pro_plus" });
  const renewed = await mkUser({ subscription: "pro" });
  const lifetime = await mkUser({ subscription: "pro_plus" });
  await Subscription.collection.insertMany([
    { user_id: a._id, plan: "pro", status: "active", is_lifetime: false, expires_at: daysAgo(1) },
    { user_id: b._id, plan: "pro_plus", status: "active", is_lifetime: false, expires_at: daysAgo(2) },
    { user_id: lifetime._id, plan: "pro_plus", status: "active", is_lifetime: true, expires_at: daysAgo(5) },
  ]);
  // `renewed` had an expired row AND a fresh active one (renewal raced the job).
  await Subscription.collection.insertOne({ user_id: renewed._id, plan: "pro", status: "expired", is_lifetime: false, expires_at: daysAgo(1) });
  const res = await expireDueSubscriptions();
  assert.equal(res.expired, 2);
  assert.equal((await User.findById(a._id).lean()).subscription, "base_user");
  assert.equal((await User.findById(b._id).lean()).subscription, "base_user");
  assert.equal((await User.findById(lifetime._id).lean()).subscription, "pro_plus");
  assert.equal((await User.findById(renewed._id).lean()).subscription, "pro");
  assert.deepEqual(await expireDueSubscriptions(), { checked: 0, expired: 0 });
});

console.log("\nGirls Corner sweep");
await test("unlists only listings of sellers who are no longer eligible", async () => {
  const girl = await mkUser({ gender: "female" });
  const changed = await mkUser({ gender: "female" });
  const keep = await mkProduct(girl, { isGirlsOnly: true });
  const drop = await mkProduct(changed, { isGirlsOnly: true });
  await User.updateOne({ _id: changed._id }, { $set: { gender: "male" } });
  const res = await autoUnlistInvalidGirlsListings();
  assert.equal(res.unlisted, 1);
  assert.equal((await Product.findById(keep._id).lean()).status, "listed");
  assert.equal((await Product.findById(drop._id).lean()).status, "unlisted");
});

console.log("\nCleanup jobs");
await test("purges old soft-deleted listings, stale drafts and orphans; keeps the rest", async () => {
  const ghostSeller = new mongoose.Types.ObjectId();
  const [oldDeleted, oldSold, recentDeleted, staleDraft, freshDraft, orphan, live] = await Product.collection
    .insertMany([
      { title: "old", seller_id: seller._id, is_deleted: true, status: "unlisted", updatedAt: daysAgo(40) },
      { title: "sold", seller_id: seller._id, is_deleted: true, status: "sold", updatedAt: daysAgo(20) },
      { title: "recent", seller_id: seller._id, is_deleted: true, status: "unlisted", updatedAt: daysAgo(3) },
      { title: "draft", seller_id: seller._id, is_deleted: false, status: "draft", updatedAt: daysAgo(45) },
      { title: "draft2", seller_id: seller._id, is_deleted: false, status: "draft", updatedAt: daysAgo(2) },
      { title: "orphan", seller_id: ghostSeller, is_deleted: false, status: "listed", updatedAt: new Date() },
      { title: "live", seller_id: seller._id, is_deleted: false, status: "listed", updatedAt: new Date() },
    ])
    .then((r) => Object.values(r.insertedIds));
  const run1 = await registry.runJob("cleanup-deleted-products");
  assert.equal(run1.status, "success", run1.error);
  assert.equal(run1.result.deletedListings, 2);
  assert.equal(run1.result.orphanListings, 1);
  const run2 = await registry.runJob("purge-stale-drafts");
  assert.equal(run2.result.draftsDeleted, 1);
  const left = new Set((await Product.find({}, { _id: 1 }).lean()).map((p) => String(p._id)));
  for (const id of [oldDeleted, oldSold, staleDraft, orphan]) assert.equal(left.has(String(id)), false);
  for (const id of [recentDeleted, freshDraft, live]) assert.equal(left.has(String(id)), true);
});

console.log("\nBadges");
await test("bursts of changes coalesce into one recompute", async () => {
  const u = await mkUser();
  // Count recomputes via the user's last_computed_at stamp updates.
  for (let i = 0; i < 5; i++) badges.scheduleBadgeRecompute(u._id, 50);
  await new Promise((r) => setTimeout(r, 300));
  const first = (await User.findById(u._id).lean()).gamification?.last_computed_at;
  assert.ok(first, "recompute ran");
  await new Promise((r) => setTimeout(r, 200));
  const again = (await User.findById(u._id).lean()).gamification?.last_computed_at;
  assert.equal(String(first), String(again), "only one recompute for the burst");
});
await test("OG member check still works with the capped count", async () => {
  const u = await mkUser();
  const g = await badges.computeAndAwardBadges(u._id);
  assert.ok(g.badges.some((b) => b.badge_id === "og_badge"), "early user is OG");
});

console.log("\nChat inbox");
const { default: Conversation } = await import(B + "src/models/conversation.model.js");
const { default: Deal } = await import(B + "src/models/deal.model.js");
const convSvc = await import(B + "src/services/conversation.service.js");
await test("hides empty threads, fills product + deal for the returned page, paginates", async () => {
  const me = await mkUser();
  const items = [];
  for (let i = 0; i < 4; i++) items.push(await mkProduct(seller));
  const convs = await Conversation.collection
    .insertMany(
      items.map((p, i) => ({
        buyer_id: me._id, seller_id: seller._id, product_id: p._id,
        product_snapshot: { title: p.title, selling_price: p.selling_price },
        // the last thread was opened but never messaged
        last_message: i === 3 ? "" : `hello ${i}`,
        last_activity_at: new Date(Date.now() - i * 1000),
        unread_count: { buyer: i, seller: 0 },
        deleted_for: { buyer: false, seller: false },
        is_active: true,
      })),
    )
    .then((r) => Object.values(r.insertedIds));
  await Deal.collection.insertOne({ conversation_id: convs[0], status: "agreed", current_price: 450 });

  const page1 = await convSvc.getUserConversations({ userId: me._id, page: 1, limit: 2 });
  assert.equal(page1.pagination.total, 3, "empty thread hidden");
  assert.equal(page1.data.length, 2);
  assert.equal(page1.data[0].product.title, items[0].title);
  assert.equal(page1.data[0].product.images.length, 1);
  assert.equal(page1.data[0].dealStatus, "agreed");
  assert.equal(page1.data[0].dealPrice, 450);
  assert.equal(page1.data[1].dealStatus, "negotiating");
  assert.equal(page1.unreadTotal, 0 + 1 + 2);
  const page2 = await convSvc.getUserConversations({ userId: me._id, page: 2, limit: 2 });
  assert.equal(page2.data.length, 1);
  assert.equal(page2.data[0].product.title, items[2].title);
  // Search on the listing title still works without the product populate.
  const found = await convSvc.getUserConversations({ userId: me._id, search: items[1].title });
  assert.equal(found.data.length, 1);
});

console.log(`\n${passed} passed, ${failed} failed\n`);
await mongoose.disconnect();
await mongod.stop();
process.exit(failed ? 1 : 0);
