// Run: npm run test:plans
// Integration tests for every pricing-page promise, run against a real
// (in-memory) MongoDB with the backend's own models, services and
// aggregation pipelines.
import assert from "node:assert/strict";
import { MongoMemoryServer } from "mongodb-memory-server";

// Backend root (tests/ lives inside it).
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
const { default: Report } = await import(B + "src/models/Report.model.js");
await Promise.all([Product.init(), Conversation.init(), User.init(), Report.init()]);

const productSvc = await import(B + "src/services/product.service.js");
const boostSvc = await import(B + "src/services/boost.service.js");
const convSvc = await import(B + "src/services/conversation.service.js");
const reportSvc = await import(B + "src/services/report.service.js");
const labsSvc = await import(B + "src/services/labs.service.js");
const labs = await import(B + "src/config/labs.js");
const plans = await import(B + "src/config/subscriptionPlans.js");
const perks = await import(B + "src/utils/planPerks.js");
const tierSync = await import(B + "src/utils/sellerTierSync.js");
const wishlistCtl = await import(B + "src/controllers/wishlist.controller.js");

let passed = 0;
let failed = 0;
const test = async (name, fn) => {
  try {
    await fn();
    passed += 1;
    console.log("  PASS", name);
  } catch (err) {
    failed += 1;
    console.log("  FAIL", name, "\n       ", err?.message);
  }
};

// ── fixtures ───────────────────────────────────────────────────────────
const campus = await Campus.create({ slug: "vit-vellore", name: "VIT Vellore", short_name: "VIT", is_active: true });
let n = 0;
const mkUser = (subscription = "base_user", extra = {}) =>
  User.create({
    name: `User ${++n}`,
    email: `u${n}@test.edu`,
    password: "password123",
    subscription,
    campus_id: campus._id,
    is_email_verified: true,
    status: "active",
    gender: "male",
    ...extra,
  });
const img = [{ url: "https://ik.imagekit.io/x/a.jpg", fileId: "f1" }];
const mkProduct = (seller, extra = {}) =>
  Product.create({
    seller_id: seller._id,
    campus_id: campus._id,
    title: extra.title || `Casio calculator ${++n}`,
    description: "Works perfectly, barely used, with box.",
    category: "electronics",
    condition: "like_new",
    selling_price: 500,
    original_price: Math.max(900, (extra.selling_price || 500) * 2),
    images: img,
    status: "listed",
    payment_preference: "both",
    pickup_address_snapshot: { address_line: "Main Gate", city: "Vellore" },
    seller_tier: perks.sellerRank(seller.subscription),
    ...extra,
  });

console.log("\nPlan limits (config)");
await test("Active listings: Free 10, Pro 25, Pro+ unlimited", () => {
  assert.equal(plans.getListingLimit("base_user"), 10);
  assert.equal(plans.getListingLimit("pro"), 25);
  assert.equal(plans.getListingLimit("pro_plus"), null);
});
await test("Wishlist: Free 25, Pro 100, Pro+ unlimited", () => {
  assert.equal(plans.getWishlistLimit("base_user"), 25);
  assert.equal(plans.getWishlistLimit("pro"), 100);
  assert.equal(plans.getWishlistLimit("pro_plus"), null);
});

console.log("\nActive listing limit (createProduct)");
await test("Free user cannot exceed 10 live listings", async () => {
  const u = await mkUser("base_user");
  for (let i = 0; i < 10; i += 1) await mkProduct(u, { title: `Item number ${i} unique` });
  await assert.rejects(
    productSvc.createProduct(
      { title: "Eleventh listing here", description: "A valid description text.", category: "electronics", condition: "like_new", selling_price: 300, original_price: 600, images: img, status: "listed", payment_preference: "both", pickup_address_snapshot: { address_line: "Main Gate", city: "Vellore" } },
      u.toObject(),
    ),
    /limit|plan|listing/i,
  );
});
await test("Pro user can create an 11th listing; it is stamped seller_tier=1", async () => {
  const u = await mkUser("pro");
  for (let i = 0; i < 10; i += 1) await mkProduct(u, { title: `Pro item ${i} unique` });
  const created = await productSvc.createProduct(
    { title: "Pro eleventh listing", description: "A valid description text.", category: "electronics", condition: "like_new", selling_price: 300, original_price: 600, images: img, status: "listed", payment_preference: "both", pickup_address_snapshot: { address_line: "Main Gate", city: "Vellore" } },
    u.toObject(),
  );
  const doc = await Product.findById(created._id || created?.data?._id || created?.product?._id).lean();
  assert.ok(doc, "listing created");
  assert.equal(doc.seller_tier, 1);
});

console.log("\nWishlist limit (controller)");
const callCtl = async (fn, req) => {
  let statusCode = 200;
  let body;
  const res = { status(c) { statusCode = c; return this; }, json(b) { body = b; return this; }, set() { return this; } };
  await fn(req, res);
  return { statusCode, body };
};
await test("Free user is blocked at the 26th wishlist save", async () => {
  const seller = await mkUser("base_user");
  const buyer = await mkUser("base_user");
  const items = [];
  for (let i = 0; i < 26; i += 1) items.push(await mkProduct(seller, { title: `Wish item ${i} unique`, status: "listed" }));
  await User.updateOne({ _id: buyer._id }, { $set: { wishlist: items.slice(0, 25).map((p) => p._id) } });
  const req = { userId: buyer._id, user: { ...buyer.toObject(), wishlist: undefined }, body: { productId: String(items[25]._id) } };
  const { statusCode, body } = await callCtl(wishlistCtl.addToWishlist, req);
  assert.equal(statusCode, 403, JSON.stringify(body));
  assert.match(body.code || body.message, /WISHLIST_LIMIT|limit/i);
});

console.log("\nMonthly boosts");
await test("Free plan has 0 monthly boosts", async () => {
  const u = await mkUser("base_user");
  const p = await mkProduct(u);
  await assert.rejects(boostSvc.createBoost({ productId: p._id, user: u.toObject() }), /limit/i);
});
await test("Pro: 2 boosts/month, each 3 days; 3rd is refused", async () => {
  const u = await mkUser("pro");
  const [a, b, c] = [await mkProduct(u), await mkProduct(u), await mkProduct(u)];
  const first = await boostSvc.createBoost({ productId: a._id, user: u.toObject() });
  const hours = (new Date(first.expires_at || first.boost?.expires_at) - Date.now()) / 36e5;
  assert.ok(hours > 71 && hours <= 72.1, `duration ${hours}h`);
  // expire the first so the active-slot cap (1) doesn't mask the monthly cap
  await mongoose.model("Boost").updateMany({ user_id: u._id }, { $set: { expires_at: new Date(Date.now() - 1000) } });
  await boostSvc.createBoost({ productId: b._id, user: u.toObject() });
  await mongoose.model("Boost").updateMany({ user_id: u._id }, { $set: { expires_at: new Date(Date.now() - 1000) } });
  await assert.rejects(boostSvc.createBoost({ productId: c._id, user: u.toObject() }), /Monthly boost limit/i);
});
await test("Pro+: boosts last 7 days", async () => {
  const u = await mkUser("pro_plus");
  const p = await mkProduct(u);
  const boost = await boostSvc.createBoost({ productId: p._id, user: u.toObject() });
  const hours = (new Date(boost.expires_at || boost.boost?.expires_at) - Date.now()) / 36e5;
  assert.ok(hours > 167 && hours <= 168.1, `duration ${hours}h`);
});

console.log("\nSearch ranking (Normal / Higher / Highest)");
await Product.deleteMany({});
const free = await mkUser("base_user");
const pro = await mkUser("pro");
const proPlus = await mkUser("pro_plus");
const sameTime = new Date(Date.now() - 2 * 3600e3);
const pFree = await mkProduct(free, { title: "Scientific calculator free seller" });
const pPro = await mkProduct(pro, { title: "Scientific calculator pro seller" });
const pPlus = await mkProduct(proPlus, { title: "Scientific calculator plus seller" });
await Product.updateMany({}, { $set: { createdAt: sameTime, views_count: 5 } }, { timestamps: false });
await test("Feed 'Recommended': Pro+ > Pro > Free for equal listings", async () => {
  const res = await productSvc.getAllProducts({ sort: "recommended", limit: 10 }, campus._id, null, null);
  const order = res.data.map((d) => String(d._id));
  assert.deepEqual(order.slice(0, 3), [String(pPlus._id), String(pPro._id), String(pFree._id)]);
});
await test("Search 'Most relevant': Pro+ > Pro > Free for equally relevant results", async () => {
  const res = await productSvc.searchProducts({ q: "scientific calculator", sort: "relevant" }, campus._id, null, null);
  const order = res.products.map((d) => String(d._id));
  assert.deepEqual(order.slice(0, 3), [String(pPlus._id), String(pPro._id), String(pFree._id)]);
});
await test("Explicit sorts (price/latest) are NOT affected by plan", async () => {
  await Product.updateOne({ _id: pFree._id }, { $set: { selling_price: 100 } });
  const res = await productSvc.getAllProducts({ sort: "price_low", limit: 10 }, campus._id, null, null);
  assert.equal(String(res.data[0]._id), String(pFree._id));
});
await test("Upgrading a seller re-ranks their existing listings (hook)", async () => {
  await User.findByIdAndUpdate(free._id, { subscription: "pro_plus" });
  assert.equal((await Product.findById(pFree._id).lean()).seller_tier, 2);
});
await test("Expiry/downgrade resets listing rank (updateOne hook)", async () => {
  await User.updateOne({ _id: free._id }, { $set: { subscription: "base_user" } });
  assert.equal((await Product.findById(pFree._id).lean()).seller_tier, 0);
});
await test("doc.save() plan change also syncs", async () => {
  const doc = await User.findById(pro._id);
  doc.subscription = "base_user";
  await doc.save();
  assert.equal((await Product.findById(pPro._id).lean()).seller_tier, 0);
});
await test("Startup backfill fixes stale ranks", async () => {
  await Product.updateMany({}, { $set: { seller_tier: 0 } });
  await tierSync.backfillSellerTiers();
  assert.equal((await Product.findById(pPlus._id).lean()).seller_tier, 2);
  assert.equal((await Product.findById(pPro._id).lean()).seller_tier, 0);
});

console.log("\nBrowse filters + price bounds");
await Product.deleteMany({});
// Own campus: the feed's 60s bounds/count cache is keyed per filter scope.
const campus2 = await Campus.create({ slug: "nit-trichy", name: "NIT Trichy", short_name: "NITT", is_active: true });
const s = await mkUser("base_user", { campus_id: campus2._id });
await mkProduct(s, { campus_id: campus2._id, title: "Cheap like new", selling_price: 200, condition: "like_new", is_negotiable: true });
await mkProduct(s, { campus_id: campus2._id, title: "Mid gently used", selling_price: 1500, condition: "gently_used", is_negotiable: false });
await mkProduct(s, { campus_id: campus2._id, title: "Pricey brand new", selling_price: 9000, condition: "brand_new", is_negotiable: true });
const old = await mkProduct(s, { campus_id: campus2._id, title: "Old well used", selling_price: 700, condition: "well_used", is_negotiable: true });
// createdAt is immutable in Mongoose -> back-date through the raw collection.
await Product.collection.updateOne({ _id: old._id }, { $set: { createdAt: new Date(Date.now() - 20 * 864e5) } });
const feed = (q) => productSvc.getAllProducts({ limit: 50, ...q }, campus2._id, null, null);
await test("Price bounds ignore the price filter (slider keeps full range)", async () => {
  const r = await feed({ min_price: 1000, max_price: 2000 });
  assert.equal(r.data.length, 1);
  assert.deepEqual(r.filterMeta.price, { min: 200, max: 9000 });
});
await test("Reversed price range is swapped, not empty", async () => {
  const r = await feed({ min_price: 2000, max_price: 1000 });
  assert.equal(r.data.length, 1);
});
await test("Multi-condition filter", async () => {
  const r = await feed({ condition: "like_new,brand_new" });
  assert.equal(r.data.length, 2);
});
await test("Invalid condition values are ignored (whitelist)", async () => {
  const r = await feed({ condition: "like_new,$where" });
  assert.equal(r.data.length, 1);
});
await test("Posted within 7 days excludes the 20-day-old listing", async () => {
  const r = await feed({ posted_within: "7" });
  assert.equal(r.data.length, 3);
});
await test("Open to offers only", async () => {
  const r = await feed({ negotiable: "true" });
  assert.equal(r.data.length, 3);
});
await test("Search returns filterMeta price bounds", async () => {
  // Every fixture says "barely used", so all 4 match; the 600 floor must
  // filter results but NOT shrink the bounds.
  const r = await productSvc.searchProducts({ q: "used", min_price: 600 }, campus2._id, null, null);
  assert.deepEqual(r.filterMeta.price, { min: 200, max: 9000 });
  assert.ok(r.products.length > 0 && r.products.every((p) => p.selling_price >= 600));
});

console.log("\nChat priority");
await test("Inbox lists Pro+ chats first, then Pro, then Free (recency within band)", async () => {
  const me = await mkUser("base_user");
  const others = [await mkUser("base_user"), await mkUser("pro"), await mkUser("pro_plus")];
  const prod = await mkProduct(me, { title: "Chat priority product" });
  const ids = [];
  for (let i = 0; i < others.length; i += 1) {
    const c = await Conversation.create({
      product_id: prod._id,
      seller_id: me._id,
      buyer_id: others[i]._id,
      last_message: "hi",
      last_activity_at: new Date(Date.now() - (3 - i) * 6e4 * (i === 0 ? -10 : 1)), // free one is the most recent
      product_snapshot: { title: "Chat priority product", selling_price: 500 },
    });
    ids.push(String(c._id));
  }
  const res = await convSvc.getUserConversations({ userId: me._id, role: "all", page: 1, limit: 30 });
  const order = res.data.map((c) => String(c._id));
  assert.deepEqual(order, [ids[2], ids[1], ids[0]]);
});

console.log("\nPriority support");
await test("Ticket priority comes from plan; client-sent priority ignored", async () => {
  const f = await mkUser("base_user");
  const p = await mkUser("pro");
  const pp = await mkUser("pro_plus");
  const body = { email: "x@test.edu", description: "Need help", support_type: "contact", priority: "high" };
  const a = await reportSvc.reportSupport(body, f.toObject());
  const b = await reportSvc.reportSupport(body, p.toObject());
  const c = await reportSvc.reportSupport(body, pp.toObject());
  assert.deepEqual([a.priority, b.priority, c.priority], ["normal", "high", "urgent"]);
  assert.equal(c.reporter_plan, "pro_plus");
});
await test("Free feature suggestions are low; guest tickets are normal", async () => {
  const f = await mkUser("base_user");
  const sug = await reportSvc.reportSupport({ email: "s@test.edu", description: "idea", support_type: "suggest" }, f.toObject());
  const guest = await reportSvc.reportSupport({ email: "g@test.edu", description: "help", support_type: "contact" }, null);
  assert.equal(sug.priority, "low");
  assert.equal(guest.priority, "normal");
});
await test("Admin support queue: highest plan priority first", async () => {
  const q = await reportSvc.getReportQueue({ target_model: "Support", limit: 50 });
  const ranks = q.data.map((r) => r.priority_rank);
  assert.deepEqual(ranks, [...ranks].sort((x, y) => y - x));
  assert.equal(q.data[0].priority, "urgent");
});

console.log("\nEarly access (Labs)");
await test("Free: no Labs; Pro: price insights only; Pro+: everything", () => {
  const has = (tier) => labs.LABS_FEATURES.map((f) => labs.hasLabsFeature({ subscription: tier }, f.key));
  assert.deepEqual(has("base_user"), [false, false]);
  assert.deepEqual(has("pro"), [true, false]);
  assert.deepEqual(has("pro_plus"), [true, true]);
});
await test("Price insights: percentiles + suggested price; demand only when asked", async () => {
  await Product.deleteMany({});
  const sl = await mkUser("base_user");
  for (const price of [300, 400, 500, 600, 700, 800]) await mkProduct(sl, { title: `Calc ${price}`, selling_price: price });
  await mkProduct(sl, { title: "Sold calc", selling_price: 550, status: "sold" });
  const noDemand = await labsSvc.getPriceInsights({ campusId: campus._id, category: "electronics", condition: "like_new", includeDemand: false });
  assert.equal(noDemand.price.samples, 7);
  assert.equal(noDemand.price.median, 550);
  assert.equal(noDemand.price.suggested, 550);
  assert.equal(noDemand.demand, undefined);
  const withDemand = await labsSvc.getPriceInsights({ campusId: campus._id, category: "electronics", condition: "like_new", includeDemand: true });
  assert.equal(withDemand.demand.activeListings, 6);
  assert.equal(withDemand.demand.soldLast30, 1);
  assert.ok(["low", "moderate", "high"].includes(withDemand.demand.level));
});
await test("Price insights falls back to category when the condition is too rare", async () => {
  const r = await labsSvc.getPriceInsights({ campusId: campus._id, category: "electronics", condition: "brand_new", includeDemand: false });
  assert.equal(r.scope, "category");
});
await test("Price insights rejects an invalid category", async () => {
  await assert.rejects(labsSvc.getPriceInsights({ campusId: campus._id, category: "weapons", includeDemand: false }), /valid category/);
});

console.log("\nRegressions found while testing");
await test("Duplicate user report is now blocked (unique partial index exists)", async () => {
  const a = await mkUser("base_user");
  const b = await mkUser("base_user");
  await Report.syncIndexes();
  await reportSvc.reportUser(String(b._id), { reason: "spam", description: "spam messages" }, a.toObject());
  await assert.rejects(
    reportSvc.reportUser(String(b._id), { reason: "spam", description: "reporting the same user again" }, a.toObject()),
    /already reported/i,
  );
});

console.log("\nLabs HTTP gate");
const labsCtl = await import(B + "src/controllers/labs.controller.js");
const run = (fn, req) => callCtl((q, r) => fn(q, r, (e) => { throw e; }), req);
await test("GET /price-insights: Free gets 403 PLAN_REQUIRED", async () => {
  const u = await mkUser("base_user");
  const { statusCode, body } = await run(labsCtl.priceInsights, { user: u.toObject(), query: { category: "electronics" } });
  assert.equal(statusCode, 403);
  assert.equal(body.code, "PLAN_REQUIRED");
});
await test("GET /price-insights: Pro gets prices without demand; /labs lists 1 enabled", async () => {
  const u = await mkUser("pro");
  const { statusCode, body } = await run(labsCtl.priceInsights, { user: u.toObject(), query: { category: "electronics" } });
  assert.equal(statusCode, 200, JSON.stringify(body));
  assert.equal(body.data.demand, undefined);
  const labsRes = await callCtl(labsCtl.getMyLabs, { user: u.toObject() });
  assert.equal(labsRes.body.data.filter((f) => f.enabled).length, 1);
});

console.log(`\n${passed} passed, ${failed} failed`);
await mongoose.disconnect();
await mongod.stop();
process.exit(failed ? 1 : 0);
