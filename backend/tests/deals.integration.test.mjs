// Run: node tests/deals.integration.test.mjs
// Deal stage undo (revertDealStage), against a real in-memory MongoDB.
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

const mkThread = async () => {
  const product = await Product.create({
    seller_id: seller._id, campus_id: campus._id, title: `Item ${++n}`, description: "Works perfectly, barely used.",
    category: "electronics", condition: "like_new", selling_price: 900, original_price: 1500,
    images: [{ url: "https://ik.imagekit.io/x/a.jpg", fileId: "f" }], status: "listed", payment_preference: "both",
    pickup_address_snapshot: { address_line: "Gate", city: "V" },
  });
  const conv = await Conversation.create({
    product_id: product._id, seller_id: seller._id, buyer_id: buyer._id,
    product_snapshot: { title: product.title, selling_price: product.selling_price },
  });
  return { product, id: String(conv._id) };
};
const S = String(seller._id);
const Bu = String(buyer._id);
const tomorrow = new Date(Date.now() + 864e5).toISOString();

console.log("\nDeal undo");
await test("each stage steps back exactly one stage", async () => {
  const { id } = await mkThread();
  await deals.confirmDeal({ conversationId: id, userId: S, amount: 800 });
  await deals.schedulePickup({ conversationId: id, userId: S, date: tomorrow, location: "Library" });
  await deals.confirmPayment({ conversationId: id, userId: S });

  let d = await deals.revertDealStage({ conversationId: id, userId: S });
  assert.equal(d.status, "pickup_scheduled");
  assert.equal(d.payment_confirmed?.is_confirmed, false);

  d = await deals.revertDealStage({ conversationId: id, userId: S });
  assert.equal(d.status, "deal_confirmed");
  assert.ok(!d.pickup?.scheduled_date, "pickup cleared");

  d = await deals.revertDealStage({ conversationId: id, userId: S });
  assert.equal(d.status, "negotiating");
  assert.ok(!d.reserved_at, "reservation released");
});
await test("releasing the reservation restores the real price in the chat list", async () => {
  const { id } = await mkThread();
  await deals.confirmDeal({ conversationId: id, userId: S, amount: 700 });
  assert.equal((await Conversation.findById(id)).product_snapshot.selling_price, 700);
  await deals.revertDealStage({ conversationId: id, userId: S });
  assert.equal((await Conversation.findById(id)).product_snapshot.selling_price, 900);
});
await test("after release, the seller can confirm a different buyer", async () => {
  const { id, product } = await mkThread();
  await deals.confirmDeal({ conversationId: id, userId: S, amount: 800 });
  await deals.revertDealStage({ conversationId: id, userId: S });
  const other = await mkUser();
  const conv2 = await Conversation.create({
    product_id: product._id, seller_id: seller._id, buyer_id: other._id,
    product_snapshot: { title: product.title, selling_price: 900 },
  });
  const d = await deals.confirmDeal({ conversationId: String(conv2._id), userId: S, amount: 850 });
  assert.equal(d.status, "deal_confirmed");
});
await test("only the seller can undo", async () => {
  const { id } = await mkThread();
  await deals.confirmDeal({ conversationId: id, userId: S, amount: 800 });
  await assert.rejects(() => deals.revertDealStage({ conversationId: id, userId: Bu }), /seller/i);
});
await test("nothing to undo while negotiating", async () => {
  const { id } = await mkThread();
  await assert.rejects(() => deals.revertDealStage({ conversationId: id, userId: S }), /no step/i);
});
await test("completed deals are final", async () => {
  const { id } = await mkThread();
  await deals.confirmDeal({ conversationId: id, userId: S, amount: 800 });
  await deals.schedulePickup({ conversationId: id, userId: S, date: tomorrow, location: "Library" });
  await deals.confirmPayment({ conversationId: id, userId: S });
  await deals.confirmItemReceived({ conversationId: id, userId: Bu });
  await assert.rejects(() => deals.revertDealStage({ conversationId: id, userId: S }), /can't be undone/i);
});
await test("two simultaneous undos never skip two stages", async () => {
  const { id } = await mkThread();
  await deals.confirmDeal({ conversationId: id, userId: S, amount: 800 });
  await deals.schedulePickup({ conversationId: id, userId: S, date: tomorrow, location: "Library" });
  const results = await Promise.allSettled([
    deals.revertDealStage({ conversationId: id, userId: S }),
    deals.revertDealStage({ conversationId: id, userId: S }),
  ]);
  const final = await Deal.findOne({ conversation_id: id });
  // Either one wins and one is rejected (409), or they serialize; never negotiating.
  assert.notEqual(final.status, "negotiating", `final ${final.status} · ${results.map((r) => r.status).join(",")}`);
});

await mongoose.disconnect();
await mongod.stop();
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
