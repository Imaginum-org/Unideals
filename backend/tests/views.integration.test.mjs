// Run: node tests/views.integration.test.mjs
// Unique-view counting + Hot deal tag, against a real in-memory MongoDB.
import assert from "node:assert/strict";
import { MongoMemoryServer } from "mongodb-memory-server";

const B = new URL("../", import.meta.url).href;
process.env.IMAGEKIT_URL_ENDPOINT = "";
process.env.SECRET_KEY_ACCESS_TOKEN = "t";
process.env.SECRET_KEY_REFRESH_TOKEN = "t";
// Small thresholds so the test stays fast.
process.env.HOT_MIN_UNIQUE_VIEWS = "3";
process.env.HOT_MAX_PER_CAMPUS = "1";
process.env.HOT_QUALIFY_WINDOW_HOURS = "48";
process.env.HOT_DURATION_HOURS = "48";

const mongod = await MongoMemoryServer.create();
const { default: mongoose } = await import(B + "node_modules/mongoose/index.js");
await mongoose.connect(mongod.getUri());

const { default: User } = await import(B + "src/models/User.model.js");
const { default: Product } = await import(B + "src/models/Product.model.js");
const { default: Campus } = await import(B + "src/models/Campus.model.js");
const { default: ProductView } = await import(B + "src/models/ProductView.model.js");
await Promise.all([Product.init(), User.init(), ProductView.init()]);
const svc = await import(B + "src/services/product.service.js");

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
const other = await Campus.create({ slug: "iit", name: "IIT", short_name: "IIT", is_active: true });
let n = 0;
const mkUser = () =>
  User.create({
    name: `U${++n}`, email: `u${n}@t.edu`, password: "password123", campus_id: campus._id,
    is_email_verified: true, status: "active", gender: "male",
  });
const mkProduct = (seller, extra = {}) =>
  Product.create({
    seller_id: seller._id, campus_id: campus._id, title: `Item ${++n}`,
    description: "Works perfectly, barely used.", category: "electronics", condition: "like_new",
    selling_price: 500, original_price: 900, images: [{ url: "https://x/a.jpg", fileId: "f" }],
    status: "listed", payment_preference: "both",
    pickup_address_snapshot: { address_line: "Gate", city: "V" }, ...extra,
  });
const view = (p, opts) => svc.recordProductView(String(p._id), campus._id, opts);
const UA = "Mozilla/5.0 (Linux; Android 14) Chrome/120";

const seller = await mkUser();
const buyer = await mkUser();

console.log("\nUnique views");
await test("first view by a user counts, repeat within 24h does not", async () => {
  const p = await mkProduct(seller);
  assert.equal((await view(p, { userId: buyer._id, userAgent: UA })).counted, true);
  assert.equal((await view(p, { userId: buyer._id, userAgent: UA })).counted, false);
  assert.equal((await Product.findById(p._id)).views_count, 1);
});
await test("seller's own views never count", async () => {
  const p = await mkProduct(seller);
  assert.equal((await view(p, { userId: seller._id, userAgent: UA })).counted, false);
});
await test("bots / link previews never count", async () => {
  const p = await mkProduct(seller);
  assert.equal((await view(p, { visitorId: "a".repeat(24), userAgent: "WhatsApp/2.23" })).counted, false);
  assert.equal((await view(p, { visitorId: "b".repeat(24), userAgent: "Googlebot/2.1" })).counted, false);
});
await test("two anonymous students on the SAME campus IP count separately", async () => {
  const p = await mkProduct(seller);
  const ip = "10.0.0.1";
  assert.equal((await view(p, { visitorId: "c".repeat(24), ip, userAgent: UA })).counted, true);
  assert.equal((await view(p, { visitorId: "d".repeat(24), ip, userAgent: UA })).counted, true);
});
await test("unlisted / sold listings don't count", async () => {
  const p = await mkProduct(seller, { status: "unlisted" });
  assert.equal((await view(p, { userId: buyer._id, userAgent: UA })).counted, false);
});
await test("other campus can't record a view", async () => {
  const p = await mkProduct(seller);
  await assert.rejects(() => svc.recordProductView(String(p._id), other._id, { userId: buyer._id, userAgent: UA }));
});
await test("detail GET no longer increments views (prefetch-safe)", async () => {
  const p = await mkProduct(seller);
  await svc.getSingleProduct(String(p._id), campus._id, buyer._id, "1.2.3.4");
  await svc.getSingleProduct(String(p._id), campus._id, null, "1.2.3.5");
  assert.equal((await Product.findById(p._id)).views_count, 0);
});

console.log("\nHot deal");
await test("young listing with enough unique views becomes hot", async () => {
  const p = await mkProduct(seller);
  let r;
  for (let i = 0; i < 3; i++) r = await view(p, { visitorId: `hot${i}`.padEnd(20, "x"), userAgent: UA });
  assert.ok(r.hot_until, "hot_until set on the qualifying view");
  const doc = await Product.findById(p._id);
  const hrs = (doc.hot_until - Date.now()) / 3.6e6;
  assert.ok(hrs > 47 && hrs <= 48, `lasts ~48h (got ${hrs.toFixed(1)}h)`);
});
await test("campus cap: a second qualifying listing waits for a free slot", async () => {
  const p = await mkProduct(seller);
  let r;
  for (let i = 0; i < 4; i++) r = await view(p, { visitorId: `cap${i}`.padEnd(20, "x"), userAgent: UA });
  assert.equal(r.hot_until, null);
});
await test("old listings (past the 48h window) never qualify", async () => {
  await Product.updateMany({ hot_until: { $exists: true } }, { $unset: { hot_until: "" } }); // free the slot
  const p = await mkProduct(seller);
  await Product.collection.updateOne({ _id: p._id }, { $set: { createdAt: new Date(Date.now() - 72 * 3.6e6) } });
  let r;
  for (let i = 0; i < 4; i++) r = await view(p, { visitorId: `old${i}`.padEnd(20, "x"), userAgent: UA });
  assert.equal(r.hot_until, null);
});
await test("unlisting removes the tag", async () => {
  const p = await mkProduct(seller);
  for (let i = 0; i < 3; i++) await view(p, { visitorId: `un${i}`.padEnd(20, "x"), userAgent: UA });
  assert.ok((await Product.findById(p._id)).hot_until);
  await svc.unlistProduct(String(p._id), String(seller._id));
  assert.equal((await Product.findById(p._id)).hot_until, undefined);
});

console.log("\nProduct URLs");
await test("detail resolves by slug and by legacy id", async () => {
  const p = await mkProduct(seller, { title: "Casio FX 991ES Plus" });
  assert.match(p.slug, /^casio-fx-991es-plus-[a-z0-9_-]{6}$/);
  const bySlug = await svc.getSingleProduct(p.slug, campus._id, buyer._id);
  const byId = await svc.getSingleProduct(String(p._id), campus._id, buyer._id);
  assert.equal(String(bySlug._id), String(p._id));
  assert.equal(String(byId._id), String(p._id));
});
await test("junk refs are rejected (isValid would accept any 12-char string)", async () => {
  await assert.rejects(() => svc.getSingleProduct("aaaaaaaaaaaa", campus._id, buyer._id));
  await assert.rejects(() => svc.getSingleProduct("../../etc/passwd", campus._id, buyer._id));
  await assert.rejects(() => svc.getSingleProduct({ $ne: null }, campus._id, buyer._id));
});

console.log("\nDrafts");
const mkDraft = (extra = {}, owner = seller) =>
  mkProduct(owner, {
    status: "draft",
    images: [
      { url: "https://ik.imagekit.io/x/a.jpg", fileId: "f1" },
      { url: "https://ik.imagekit.io/x/b.jpg", fileId: "f2" },
    ],
    ...extra,
  });
await test("drafts are private: owner can open, others get 404", async () => {
  const d = await mkDraft();
  const own = await svc.getSingleProduct(String(d._id), campus._id, seller._id, null, null, null, { forEdit: true });
  assert.equal(own.images.length, 2, "all photos come back for the edit form");
  await assert.rejects(() => svc.getSingleProduct(String(d._id), campus._id, buyer._id));
  await assert.rejects(() => svc.getSingleProduct(String(d._id), campus._id, null));
});
await test("publishing a draft makes it listed with a fresh createdAt (one save)", async () => {
  const fresh = await mkUser(); // own seller: the shared one is at the free-plan cap
  const d = await mkDraft({ title: "Draft lamp to publish" }, fresh);
  await Product.collection.updateOne({ _id: d._id }, { $set: { createdAt: new Date(Date.now() - 7 * 864e5) } });
  const saved = await svc.updateProduct(String(d._id), String(fresh._id), { status: "listed", selling_price: 450 });
  assert.equal(saved.status, "listed");
  assert.ok(Date.now() - new Date(saved.createdAt).getTime() < 60_000, "createdAt reset to now");
  assert.equal(saved.selling_price, 450);
  assert.ok(saved.slug, "slug present for the public URL");
});
await test("publishing needs at least one photo", async () => {
  const d = await mkDraft({ title: "Photo-less draft", images: [] });
  await assert.rejects(() => svc.updateProduct(String(d._id), String(seller._id), { status: "listed" }), /photo/i);
  assert.equal((await Product.findById(d._id)).status, "draft");
});
await test("status in an edit never changes a listed/unlisted product", async () => {
  const p = await mkProduct(seller, { status: "unlisted", title: "Hidden thing" });
  const saved = await svc.updateProduct(String(p._id), String(seller._id), { status: "listed", title: "Hidden thing v2" });
  assert.equal(saved.status, "unlisted");
});
await test("publish respects the plan's listing cap", async () => {
  const capped = await mkUser();
  const live = [];
  for (let i = 0; i < 10; i++) live.push(mkProduct(capped, { title: `Cap item ${i}` }));
  await Promise.all(live);
  const d = await mkProduct(capped, { status: "draft", title: "Over the cap" });
  await assert.rejects(() => svc.updateProduct(String(d._id), String(capped._id), { status: "listed" }), /limit/i);
});
await test("my-products returns card fields + cover only", async () => {
  await mkDraft({ title: "Projection check" });
  const items = await svc.getUserProducts(seller._id);
  const it = items.find((x) => x.title === "Projection check");
  assert.equal(it.status, "draft");
  assert.equal(it.images.length, 1, "only the cover photo");
  assert.equal(it.description, undefined, "no description");
  assert.equal(it.pickup_address_snapshot, undefined, "no pickup snapshot");
});

await mongoose.disconnect();
await mongod.stop();
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
