// Run: node tests/boosted.integration.test.mjs
// Home "Boosted" rail: only listed products inside their boost window, and
// sold / unlisted / deleted / expired listings leave it immediately (no stale
// cache), against a real in-memory MongoDB.
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
await Promise.all([Product.init(), User.init()]);
const svc = await import(B + "src/services/product.service.js");
const { boostedCache } = await import(B + "src/utils/boostedCache.js");

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
const seller = await User.create({
  name: "Seller", email: "s@t.edu", password: "password123", campus_id: campus._id,
  is_email_verified: true, status: "active", gender: "male",
});
const HOUR = 3600 * 1000;
const mkBoosted = (extra = {}) =>
  Product.create({
    seller_id: seller._id, campus_id: campus._id, title: `Item ${++n}`,
    description: "Works perfectly, barely used.", category: "electronics", condition: "like_new",
    selling_price: 500, original_price: 900, images: [{ url: "https://x/a.jpg", fileId: "f" }],
    status: "listed", payment_preference: "both",
    pickup_address_snapshot: { address_line: "Gate", city: "V" },
    is_boosted: true, boost_expires_at: new Date(Date.now() + 72 * HOUR), boost_tier: "addon",
    ...extra,
  });
const railIds = async () => (await svc.getBoostedProducts(campus._id)).map((p) => String(p._id));

console.log("Boosted rail");

await test("a live boost shows; an expired one or a non-boosted listing does not", async () => {
  const live = await mkBoosted();
  const expired = await mkBoosted({ boost_expires_at: new Date(Date.now() - HOUR) });
  const plain = await mkBoosted({ is_boosted: false, boost_expires_at: undefined });
  const ids = await railIds();
  assert.ok(ids.includes(String(live._id)));
  assert.ok(!ids.includes(String(expired._id)));
  assert.ok(!ids.includes(String(plain._id)));
});

await test("marking sold removes it right away (cache cleared, not after 30s)", async () => {
  const p = await mkBoosted();
  assert.ok((await railIds()).includes(String(p._id))); // now cached
  await Product.updateOne({ _id: p._id }, { $set: { status: "sold" } });
  assert.ok(!(await railIds()).includes(String(p._id)));
});

await test("unlisting via save() removes it right away", async () => {
  const p = await mkBoosted();
  assert.ok((await railIds()).includes(String(p._id)));
  const doc = await Product.findById(p._id);
  doc.status = "unlisted";
  await doc.save();
  assert.ok(!(await railIds()).includes(String(p._id)));
});

await test("soft delete via findOneAndUpdate removes it right away", async () => {
  const p = await mkBoosted();
  assert.ok((await railIds()).includes(String(p._id)));
  await Product.findOneAndUpdate({ _id: p._id }, { $set: { is_deleted: true } });
  assert.ok(!(await railIds()).includes(String(p._id)));
});

await test("a boost that ends while cached drops off on the next read", async () => {
  const p = await mkBoosted({ boost_expires_at: new Date(Date.now() + 400) });
  assert.ok((await railIds()).includes(String(p._id))); // cached with it inside
  await new Promise((r) => setTimeout(r, 500));
  assert.ok(!(await railIds()).includes(String(p._id)));
});

await test("a newly boosted listing appears right away", async () => {
  await railIds(); // warm cache
  const p = await mkBoosted({ is_boosted: false, boost_expires_at: undefined });
  await railIds();
  await Product.updateOne(
    { _id: p._id },
    { $set: { is_boosted: true, boost_expires_at: new Date(Date.now() + 168 * HOUR) } },
  );
  assert.ok((await railIds()).includes(String(p._id)));
});

await test("view-count bumps do not clear the cache", async () => {
  const p = await mkBoosted();
  await railIds();
  let cleared = false;
  const orig = boostedCache.clear;
  boostedCache.clear = () => {
    cleared = true;
    return orig();
  };
  try {
    await Product.updateOne({ _id: p._id }, { $inc: { views_count: 1 } });
    assert.equal(cleared, false);
  } finally {
    boostedCache.clear = orig;
  }
});

await mongoose.disconnect();
await mongod.stop();
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
