// Run: node tests/seo.integration.test.mjs
// Listings sitemap + public listing SEO facts: only public, live listings;
// never Girls Corner, deleted, drafts or other private data.
import assert from "node:assert/strict";
import { MongoMemoryServer } from "mongodb-memory-server";

const B = new URL("../", import.meta.url).href;
process.env.IMAGEKIT_URL_ENDPOINT = "";
process.env.FRONTEND_URL = "https://unideals.in";

const mongod = await MongoMemoryServer.create();
const { default: mongoose } = await import(B + "node_modules/mongoose/index.js");
await mongoose.connect(mongod.getUri());
const { default: User } = await import(B + "src/models/User.model.js");
const { default: Product } = await import(B + "src/models/Product.model.js");
const { default: Campus } = await import(B + "src/models/Campus.model.js");
await Product.init();
const seo = await import(B + "src/services/sitemap.service.js");

let passed = 0;
let failed = 0;
const test = async (name, fn) => {
  try { await fn(); passed++; console.log(`  ✓ ${name}`); } catch (err) { failed++; console.log(`  ✗ ${name}\n    ${err.message}`); }
};

const campus = await Campus.create({ slug: "vit-vellore", name: "VIT Vellore", short_name: "Vellore", is_active: true });
const seller = await User.create({ name: "Riya Sharma", email: "r@t.edu", password: "password123", campus_id: campus._id, is_email_verified: true, status: "active", gender: "female", mobile: "9999999999" });
const base = { seller_id: seller._id, campus_id: campus._id, category: "electronics", condition: "like_new", selling_price: 650, original_price: 900, description: "Barely used & works <fine>.", images: [{ url: "https://ik/a.jpg" }], is_deleted: false };
await Product.collection.insertMany([
  { ...base, title: "Casio calculator", slug: "casio-calc-aaa111", status: "listed", updatedAt: new Date() },
  { ...base, title: "Kurti", slug: "kurti-bbb222", status: "listed", isGirlsOnly: true, category: "womens_fashion", updatedAt: new Date() },
  { ...base, title: "Deleted lamp", slug: "lamp-ccc333", status: "listed", is_deleted: true, updatedAt: new Date() },
  { ...base, title: "Draft thing", slug: "draft-ddd444", status: "draft", updatedAt: new Date() },
  { ...base, title: "Tom & Jerry DVD", slug: "tom-jerry-eee555", status: "listed", updatedAt: new Date() },
]);

await test("listings sitemap has only public live listings, XML-escaped", async () => {
  const xml = await seo.buildListingsSitemap();
  assert.match(xml, /^<\?xml version="1.0" encoding="UTF-8"\?>/);
  assert.match(xml, /<loc>https:\/\/unideals.in\/product\/casio-calc-aaa111<\/loc>/);
  assert.match(xml, /<loc>https:\/\/unideals.in\/product\/tom-jerry-eee555<\/loc>/);
  for (const hidden of ["kurti-bbb222", "lamp-ccc333", "draft-ddd444"]) assert.ok(!xml.includes(hidden), hidden);
  assert.equal((xml.match(/<url>/g) || []).length, 2);
});
await test("listing SEO facts: public fields only, first name only", async () => {
  const d = await seo.getListingSeo("CASIO-CALC-AAA111");
  assert.equal(d.title, "Casio calculator");
  assert.equal(d.seller_name, "Riya");
  assert.equal(d.campus_name, "VIT Vellore");
  assert.deepEqual(d.images, ["https://ik/a.jpg"]);
  for (const k of ["mobile", "email", "seller_id", "pickup_address_snapshot"]) assert.equal(d[k], undefined, k);
});
await test("Girls Corner, deleted and draft listings are not exposed", async () => {
  assert.equal(await seo.getListingSeo("kurti-bbb222"), null);
  assert.equal(await seo.getListingSeo("lamp-ccc333"), null);
  assert.equal(await seo.getListingSeo("draft-ddd444"), null);
  assert.equal(await seo.getListingSeo(""), null);
});

console.log(`\n${passed} passed, ${failed} failed\n`);
await mongoose.disconnect();
await mongod.stop();
process.exit(failed ? 1 : 0);
