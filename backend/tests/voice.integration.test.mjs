// Voice notes (sendVoiceMessage + orphan sweep), against a real in-memory
// MongoDB. ImageKit is stubbed at the SDK prototype: no network calls.
import assert from "node:assert/strict";
import { MongoMemoryServer } from "mongodb-memory-server";

const ENDPOINT = "https://ik.imagekit.io/test";
process.env.IMAGEKIT_PUBLIC_KEY = "pub";
process.env.IMAGEKIT_PRIVATE_KEY = "priv";
process.env.IMAGEKIT_URL_ENDPOINT = ENDPOINT;

const B = new URL("../", import.meta.url).href;
const mongod = await MongoMemoryServer.create();
const { default: mongoose } = await import(B + "node_modules/mongoose/index.js");
await mongoose.connect(mongod.getUri());

// Fake ImageKit file store: fileId -> details.
const files = new Map();
const deletedIds = [];
const { default: ImageKit } = await import(B + "node_modules/imagekit/dist/index.js");
ImageKit.prototype.getFileDetails = async (id) => {
  const f = files.get(id);
  if (!f) throw new Error("not found");
  return f;
};
ImageKit.prototype.listFiles = async ({ tags, limit = 1000, skip = 0 }) =>
  [...files.values()]
    .filter((f) => (f.tags || []).includes(tags))
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
    .slice(skip, skip + limit);
ImageKit.prototype.bulkDeleteFiles = async (ids) => {
  ids.forEach((id) => {
    files.delete(id);
    deletedIds.push(id);
  });
  return { successfullyDeletedFileIds: ids };
};

const { default: User } = await import(B + "src/models/User.model.js");
const { default: Product } = await import(B + "src/models/Product.model.js");
const { default: Campus } = await import(B + "src/models/Campus.model.js");
const { default: Conversation } = await import(B + "src/models/conversation.model.js");
const { default: Message } = await import(B + "src/models/message.model.js");
await Promise.all([Product.init(), User.init(), Conversation.init(), Message.init()]);
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

let fileN = 0;
const putFile = (ownerId, { size = 120_000, mime = "audio/mp4", ageMs = 0, folder = "voice" } = {}) => {
  const fileId = `file_${++fileN}`;
  const name = `voice_${fileN}.m4a`;
  files.set(fileId, {
    fileId,
    name,
    filePath: `/unideals/${ownerId}/${folder}/${name}`,
    url: `${ENDPOINT}/unideals/${ownerId}/${folder}/${name}`,
    size,
    mime,
    tags: ["voice"],
    createdAt: new Date(Date.now() - ageMs).toISOString(),
  });
  return fileId;
};
const send = (fileId, extra = {}) =>
  msgs.sendVoiceMessage({ conversationId: id, senderId: String(buyer._id), fileId, durationMs: 4200, peaks: [10, 50, 200, -3], ...extra });

console.log("\nVoice notes");
await test("sends a voice note with ImageKit's url, clean peaks and a preview", async () => {
  const fileId = putFile(buyer._id);
  const m = await send(fileId);
  assert.equal(m.message_type, "audio");
  assert.equal(m.audio.url, files.get(fileId).url);
  assert.equal(m.audio.duration_ms, 4200);
  assert.deepEqual(m.audio.peaks, [10, 50, 100, 0]);
  const c = await Conversation.findById(id).lean();
  assert.equal(c.last_message, "🎤 Voice message (0:04)");
  assert.equal(c.last_message_type, "audio");
  assert.equal(c.unread_count.seller, 1);
});
await test("the receiver's thread fetch includes the playable audio", async () => {
  const fileId = putFile(buyer._id);
  const sent = await send(fileId);
  for (const after of [null, String(conv._id).replace(/./g, "0")]) {
    const { messages } = await msgs.getMessages({ conversationId: id, userId: String(seller._id), ...(after ? { after } : {}) });
    const got = messages.find((m) => String(m._id) === String(sent._id));
    assert.ok(got, "message returned");
    assert.equal(got.message_type, "audio");
    assert.equal(got.audio?.url, files.get(fileId).url, "audio url present for the receiver");
    assert.equal(got.audio?.duration_ms, 4200);
  }
});
await test("the same upload can't be sent twice", async () => {
  const fileId = putFile(buyer._id);
  await send(fileId);
  await assert.rejects(() => send(fileId), /already sent/);
});
await test("someone else's file is refused", async () => {
  const fileId = putFile(outsider._id);
  await assert.rejects(() => send(fileId), /Invalid voice note/);
});
await test("a file outside the voice folder is refused", async () => {
  const fileId = putFile(buyer._id, { folder: "photos" });
  await assert.rejects(() => send(fileId), /Invalid voice note/);
});
await test("oversized and non-audio files are refused", async () => {
  await assert.rejects(() => send(putFile(buyer._id, { size: 3 * 1024 * 1024 })), /too large/);
  await assert.rejects(() => send(putFile(buyer._id, { mime: "image/png" })), /Unsupported/);
});
await test("too short / too long durations are refused", async () => {
  await assert.rejects(() => send(putFile(buyer._id), { durationMs: 200 }), /too short/);
  await assert.rejects(() => send(putFile(buyer._id), { durationMs: 10 * 60 * 1000 }), /up to 2 minutes/);
});
await test("non-participants can't send into the chat", async () => {
  const fileId = putFile(outsider._id);
  await assert.rejects(() =>
    msgs.sendVoiceMessage({ conversationId: id, senderId: String(outsider._id), fileId, durationMs: 3000 }),
  );
});
await test("a missing upload is reported, not crashed on", async () => {
  await assert.rejects(() => send("file_does_not_exist"), /not found/);
});

console.log("\nOrphan sweep");
await test("deletes old unsent uploads, keeps sent and fresh ones", async () => {
  const sentOld = putFile(buyer._id, { ageMs: 3 * 864e5 });
  await send(sentOld);
  const orphanOld = putFile(buyer._id, { ageMs: 3 * 864e5 });
  const orphanFresh = putFile(buyer._id, { ageMs: 60 * 1000 });
  const r = await sweep.sweepOrphanVoiceFiles();
  assert.ok(deletedIds.includes(orphanOld), "old orphan deleted");
  assert.ok(files.has(sentOld), "sent note kept");
  assert.ok(files.has(orphanFresh), "fresh upload kept (may still be sending)");
  assert.ok(r.deleted >= 1);
});
await test("deleting a chat on both sides frees its voice files", async () => {
  const fileId = putFile(buyer._id);
  await send(fileId);
  await sweep.deleteConversationVoiceFiles(conv._id);
  assert.ok(!files.has(fileId));
});

console.log(`\n${passed} passed, ${failed} failed`);
await mongoose.disconnect();
await mongod.stop();
process.exit(failed ? 1 : 0);
