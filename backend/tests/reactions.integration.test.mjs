// Message reactions: atomic set/replace/clear, limits and access rules.
import assert from "node:assert/strict";
import { MongoMemoryServer } from "mongodb-memory-server";

const B = new URL("../", import.meta.url).href;
const mongod = await MongoMemoryServer.create();
const { default: mongoose } = await import(B + "node_modules/mongoose/index.js");
await mongoose.connect(mongod.getUri());
const { default: User } = await import(B + "src/models/User.model.js");
const { default: Product } = await import(B + "src/models/Product.model.js");
const { default: Campus } = await import(B + "src/models/Campus.model.js");
const { default: Conversation } = await import(B + "src/models/conversation.model.js");
const { default: Message } = await import(B + "src/models/message.model.js");
await Promise.all([Product.init(), User.init(), Conversation.init(), Message.init()]);
const msgs = await import(B + "src/services/message.service.js");

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
const outsider = await mkUser();
const product = await Product.create({
  seller_id: seller._id, campus_id: campus._id, title: "Item", description: "Works perfectly, barely used.",
  category: "electronics", condition: "like_new", selling_price: 900, original_price: 1500,
  images: [{ url: "https://ik.imagekit.io/x/a.jpg", fileId: "f" }], status: "listed", payment_preference: "both",
  pickup_address_snapshot: { address_line: "Gate", city: "V" },
});
const conv = await Conversation.create({
  product_id: product._id, seller_id: seller._id, buyer_id: buyer._id,
  product_snapshot: { title: "Item", selling_price: 900 },
});
const id = String(conv._id);
const S = String(seller._id);
const Bu = String(buyer._id);
const msg = await msgs.sendTextMessage({ conversationId: id, senderId: S, text: "Still available!" });
const mid = String(msg._id);
const react = (userId, emoji) => msgs.setReaction({ conversationId: id, messageId: mid, userId, emoji });

console.log("\nReactions");
await test("adds a reaction", async () => {
  const r = await react(Bu, "👍");
  assert.equal(r.length, 1);
  assert.equal(r[0].emoji, "👍");
  assert.equal(String(r[0].user_id), Bu);
});
await test("changing your reaction replaces it (one per person)", async () => {
  const r = await react(Bu, "❤️");
  assert.equal(r.length, 1);
  assert.equal(r[0].emoji, "❤️");
});
await test("both people can react; each keeps their own", async () => {
  const r = await react(S, "😂");
  assert.equal(r.length, 2);
  assert.deepEqual(r.map((x) => x.emoji).sort(), ["❤️", "😂"].sort());
});
await test("null clears only your own reaction", async () => {
  const r = await react(Bu, null);
  assert.equal(r.length, 1);
  assert.equal(String(r[0].user_id), S);
});
await test("simultaneous taps never duplicate (atomic update)", async () => {
  await Promise.all(["👍", "😮", "🙏", "😢", "❤️"].map((e) => react(Bu, e)));
  const doc = await Message.findById(mid).lean();
  assert.equal(doc.reactions.filter((x) => String(x.user_id) === Bu).length, 1);
});
await test("reactions come back with the thread", async () => {
  const { messages } = await msgs.getMessages({ conversationId: id, userId: S });
  assert.ok(messages.find((m) => String(m._id) === mid).reactions.length >= 1);
});
await test("unsupported emoji is refused", async () => {
  await assert.rejects(() => react(Bu, "💩"), /Unsupported/);
});
await test("non-participants can't react", async () => {
  await assert.rejects(() => react(String(outsider._id), "👍"), /access/);
});
await test("a message from another chat can't be reacted to via this chat", async () => {
  const other = await Conversation.create({
    product_id: product._id, seller_id: seller._id, buyer_id: outsider._id,
    product_snapshot: { title: "Item", selling_price: 900 },
  });
  const m2 = await msgs.sendTextMessage({ conversationId: String(other._id), senderId: S, text: "hi" });
  await assert.rejects(() => msgs.setReaction({ conversationId: id, messageId: String(m2._id), userId: Bu, emoji: "👍" }), /not found/);
});
await test("system messages can't be reacted to", async () => {
  const sys = await Message.create({ conversation_id: conv._id, sender_id: seller._id, receiver_id: buyer._id, message_type: "system", text: "Deal confirmed" });
  await assert.rejects(() => msgs.setReaction({ conversationId: id, messageId: String(sys._id), userId: Bu, emoji: "👍" }), /not found/);
});

console.log(`\n${passed} passed, ${failed} failed`);
await mongoose.disconnect();
await mongod.stop();
process.exit(failed ? 1 : 0);
