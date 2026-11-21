// Chat photos (Cloudinary): signing, response-signature verification,
// ownership, replay, caption screening and the orphan sweep. Real in-memory
// MongoDB; Cloudinary's HTTP API is faked through global fetch.
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { MongoMemoryServer } from "mongodb-memory-server";

process.env.CLOUDINARY_CLOUD_NAME = "demo";
process.env.CLOUDINARY_API_KEY = "key";
process.env.CLOUDINARY_API_SECRET = "s3cret";

const B = new URL("../", import.meta.url).href;
const mongod = await MongoMemoryServer.create();
const { default: mongoose } = await import(B + "node_modules/mongoose/index.js");
await mongoose.connect(mongod.getUri());

// Fake Cloudinary store behind fetch (Admin API: list by tag + delete).
const store = new Map(); // public_id -> { created_at }
const realFetch = globalThis.fetch;
globalThis.fetch = async (url, init = {}) => {
  const u = new URL(String(url));
  if (!u.hostname.endsWith("cloudinary.com")) return realFetch(url, init);
  if (init.method === "DELETE") {
    u.searchParams.getAll("public_ids[]").forEach((id) => store.delete(id));
    return new Response(JSON.stringify({ deleted: {} }), { status: 200 });
  }
  const resources = [...store.entries()].map(([public_id, v]) => ({ public_id, created_at: v.created_at }));
  return new Response(JSON.stringify({ resources }), { status: 200 });
};

const { default: User } = await import(B + "src/models/User.model.js");
const { default: Product } = await import(B + "src/models/Product.model.js");
const { default: Campus } = await import(B + "src/models/Campus.model.js");
const { default: Conversation } = await import(B + "src/models/conversation.model.js");
const { default: Message } = await import(B + "src/models/message.model.js");
await Promise.all([Product.init(), User.init(), Conversation.init(), Message.init()]);
const cld = await import(B + "src/utils/cloudinary.js");
const msgs = await import(B + "src/services/message.service.js");
const sweep = await import(B + "src/services/voiceCleanup.service.js");

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
const sha1 = (s) => crypto.createHash("sha1").update(s).digest("hex");

// Simulate "browser uploads with the ticket, Cloudinary replies".
let ver = 1700000000;
const upload = (userId, { ageMs = 0 } = {}) => {
  const t = cld.signChatImageUpload(userId);
  const version = ++ver;
  store.set(t.public_id, { created_at: new Date(Date.now() - ageMs).toISOString() });
  return { publicId: t.public_id, version, signature: sha1(`public_id=${t.public_id}&version=${version}s3cret`) };
};
const send = (up, extra = {}) =>
  msgs.sendImageMessage({ conversationId: id, senderId: String(buyer._id), width: 1200, height: 900, ...up, ...extra });

console.log("\nChat photos");
await test("upload ticket is signed the way Cloudinary expects", async () => {
  const t = cld.signChatImageUpload(String(buyer._id));
  const params = { allowed_formats: t.allowed_formats, overwrite: t.overwrite, public_id: t.public_id, tags: t.tags, timestamp: t.timestamp, transformation: t.transformation };
  const str = Object.keys(params).sort().map((k) => `${k}=${params[k]}`).join("&");
  assert.equal(t.signature, sha1(str + "s3cret"));
  assert.ok(t.public_id.startsWith(`unideals/chat/${buyer._id}/`));
  assert.equal(t.overwrite, "false");
});
await test("sends a photo with caption; receiver fetch includes it", async () => {
  const m = await send(upload(String(buyer._id)), { caption: "Small scratch here" });
  assert.equal(m.message_type, "image");
  assert.match(m.image.url, /^https:\/\/res\.cloudinary\.com\/demo\/image\/upload\/f_auto,q_auto\/v\d+\//);
  const c = await Conversation.findById(id).lean();
  assert.equal(c.last_message, "📷 Small scratch here");
  const { messages } = await msgs.getMessages({ conversationId: id, userId: String(seller._id) });
  assert.equal(messages.at(-1).image.public_id, m.image.public_id);
});
await test("a forged Cloudinary signature is refused", async () => {
  const up = upload(String(buyer._id));
  await assert.rejects(() => send({ ...up, signature: "0".repeat(40) }), /Invalid photo/);
});
await test("someone else's upload can't be sent", async () => {
  await assert.rejects(() => send(upload(String(seller._id))), /Invalid photo/);
});
await test("the same photo can't be sent twice", async () => {
  const up = upload(String(buyer._id));
  await send(up);
  await assert.rejects(() => send(up), /already sent/);
});
await test("an abusive caption is flagged and masked in the preview", async () => {
  const m = await send(upload(String(buyer._id)), { caption: "you are a bitch" });
  assert.equal(m.is_flagged, true);
  const c = await Conversation.findById(id).lean();
  assert.notEqual(c.last_message, "📷 you are a bitch");
});
await test("photo sharing reports unavailable when Cloudinary isn't set up", async () => {
  const secret = process.env.CLOUDINARY_API_SECRET;
  process.env.CLOUDINARY_API_SECRET = "";
  try {
    await assert.rejects(() => send(upload(String(buyer._id))), /isn't available/);
  } finally {
    process.env.CLOUDINARY_API_SECRET = secret;
  }
});

console.log("\nOrphan sweep");
await test("deletes old unsent photos, keeps sent and fresh ones", async () => {
  const sentOld = upload(String(buyer._id), { ageMs: 3 * 864e5 });
  await send(sentOld);
  const orphanOld = upload(String(buyer._id), { ageMs: 3 * 864e5 });
  const orphanFresh = upload(String(buyer._id), { ageMs: 60 * 1000 });
  const r = await sweep.sweepOrphanChatImages();
  assert.ok(!store.has(orphanOld.publicId), "old orphan deleted");
  assert.ok(store.has(sentOld.publicId), "sent photo kept");
  assert.ok(store.has(orphanFresh.publicId), "fresh upload kept");
  assert.ok(r.deleted >= 1);
});
await test("deleting a chat on both sides frees its photos", async () => {
  const up = upload(String(buyer._id));
  await send(up);
  await sweep.deleteConversationImages(conv._id);
  assert.ok(!store.has(up.publicId));
});

console.log(`\n${passed} passed, ${failed} failed`);
await mongoose.disconnect();
await mongod.stop();
process.exit(failed ? 1 : 0);
