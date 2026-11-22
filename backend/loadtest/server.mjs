// Load-test server: the REAL app (production mode) against a LOCAL MongoDB
// seeded with realistic data. Every external service is switched off by
// clearing its keys, so nothing here can touch Atlas, Render, ImageKit,
// Cloudinary, Gemini/Groq, Resend, Firebase or Razorpay.
//
// Exposes /__stats (CPU, memory, event-loop delay, Mongo ops) and
// /__reset for the load generator. Writes loadtest/.fixtures.json.
//
//   node loadtest/server.mjs            (then run loadtest/run.mjs)
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { monitorEventLoopDelay } from "node:perf_hooks";
import { MongoMemoryServer } from "mongodb-memory-server";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const B = new URL("../", import.meta.url).href;
const PORT = Number(process.env.LOADTEST_PORT) || 5055;

// ---- Environment: production code paths, no outside services ----
Object.assign(process.env, {
  NODE_ENV: "production",
  RUN_JOBS: "false",
  SECRET_KEY_ACCESS_TOKEN: "loadtest-access-secret",
  SECRET_KEY_REFRESH_TOKEN: "loadtest-refresh-secret",
  FRONTEND_URL: "https://app.loadtest.invalid",
  MONGO_MAX_POOL: process.env.MONGO_MAX_POOL || "20",
});
for (const k of [
  "IMAGEKIT_PUBLIC_KEY", "IMAGEKIT_PRIVATE_KEY", "IMAGEKIT_URL_ENDPOINT",
  "CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET", "CLOUDINARY_URL",
  "GEMINI_API_KEY", "GROQ_API_KEY", "RESEND_API_KEY",
  "FIREBASE_PROJECT_ID", "FIREBASE_CLIENT_EMAIL", "FIREBASE_PRIVATE_KEY", "PUSH_ENABLED",
  "RAZORPAY_KEY_ID", "RAZORPAY_KEY_SECRET", "RAZORPAY_WEBHOOK_SECRET", "EMAIL_ALERTS_ENABLED",
]) process.env[k] = ""; // blank, not deleted: the app's dotenv must not refill it from .env

const SIZE = {
  users: Number(process.env.LT_USERS) || 3000,
  products: Number(process.env.LT_PRODUCTS) || 6000,
  conversations: Number(process.env.LT_CONVERSATIONS) || 4000,
  messagesPerConversation: 20,
  notificationsPerUser: 10,
  activeUsers: 600, // users the load generator signs in as
};

const mongod = await MongoMemoryServer.create();
const { default: mongoose } = await import(B + "node_modules/mongoose/index.js");
await mongoose.connect(mongod.getUri(), {
  maxPoolSize: Number(process.env.MONGO_MAX_POOL),
  minPoolSize: 2,
  monitorCommands: true,
});

// Count every Mongo command the app issues (handshakes excluded).
const ops = { total: 0, byCommand: {} };
const IGNORE = new Set(["hello", "isMaster", "ismaster", "ping", "endSessions", "saslStart", "saslContinue", "buildInfo"]);
mongoose.connection.getClient().on("commandStarted", (e) => {
  if (IGNORE.has(e.commandName)) return;
  ops.total += 1;
  ops.byCommand[e.commandName] = (ops.byCommand[e.commandName] || 0) + 1;
});

const model = (f) => import(B + "src/models/" + f).then((m) => m.default);
const [User, Product, Campus, Conversation, Message, Notification, AuthSession] = await Promise.all([
  model("User.model.js"), model("Product.model.js"), model("Campus.model.js"), model("conversation.model.js"),
  model("message.model.js"), model("Notification.model.js"), model("AuthSession.model.js"),
]);
await Promise.all([User, Product, Campus, Conversation, Message, Notification, AuthSession].map((m) => m.init()));

// ---- Seed ----
const t0 = Date.now();
const { default: bcrypt } = await import(B + "node_modules/bcrypt/bcrypt.js");
const PASSWORD = "LoadTest!2026";
const hash = await bcrypt.hash(PASSWORD, 10);
const oid = () => new mongoose.Types.ObjectId();
const pick = (a) => a[Math.floor(Math.random() * a.length)];

const campus = await Campus.create({ slug: "vit-vellore", name: "VIT Vellore", short_name: "VIT", is_active: true });
const users = Array.from({ length: SIZE.users }, (_, i) => ({
  _id: oid(), name: `Student ${i}`, email: `student${i}@loadtest.invalid`, password: hash,
  campus_id: campus._id, is_email_verified: true, status: "active", gender: i % 3 === 0 ? "female" : "male",
  tokenVersion: 0,
}));
await User.collection.insertMany(users, { ordered: false });

const CATS = ["electronics", "study_material", "hostel_essentials", "clothing", "accessories", "lab_equipment", "sports", "fitness", "vehicles", "others"];
const WORDS = ["calculator", "cycle", "laptop", "books", "lamp", "headphones", "kettle", "mattress", "lab coat", "shoes", "jacket", "phone", "chair", "table", "guitar", "racket", "bag", "monitor", "keyboard", "mouse"];
const ADJ = ["Casio", "Hero", "Dell", "HP", "boAt", "Nike", "Puma", "Philips", "Sony", "Lenovo", "Apple", "Wildcraft"];
const CONDS = ["brand_new", "like_new", "gently_used", "well_used"];
const now = Date.now();
const products = Array.from({ length: SIZE.products }, (_, i) => {
  const price = 100 + Math.floor(Math.random() * 9000);
  const created = new Date(now - Math.floor(Math.random() * 60 * 864e5));
  return {
    _id: oid(), seller_id: users[i % SIZE.users]._id, campus_id: campus._id,
    title: `${pick(ADJ)} ${pick(WORDS)} ${i}`,
    description: "Good condition, used for one semester. Pickup near the hostel gate.",
    category: pick(CATS), condition: pick(CONDS), selling_price: price, original_price: price + 500,
    images: [{ url: "https://ik.imagekit.io/loadtest/a.jpg", fileId: `f${i}` }],
    status: "listed", is_deleted: false, payment_preference: "both", is_negotiable: i % 2 === 0,
    isGirlsOnly: false, views_count: Math.floor(Math.random() * 300),
    is_boosted: i % 40 === 0, boost_expires_at: i % 40 === 0 ? new Date(now + 864e5) : undefined, boost_tier: i % 40 === 0 ? "pro" : undefined,
    pickup_address_snapshot: { address_line: "Hostel gate", city: "Vellore" },
    createdAt: created, updatedAt: created,
  };
});
await Product.collection.insertMany(products, { ordered: false });

// Conversations concentrate on the active users (they are the ones testing).
const active = users.slice(0, SIZE.activeUsers);
const conversations = [];
const seen = new Set();
while (conversations.length < SIZE.conversations) {
  const buyer = pick(active);
  const p = pick(products);
  if (String(p.seller_id) === String(buyer._id)) continue;
  const key = `${buyer._id}:${p._id}`;
  if (seen.has(key)) continue;
  seen.add(key);
  conversations.push({
    _id: oid(), buyer_id: buyer._id, seller_id: p.seller_id, product_id: p._id, is_active: true,
    product_snapshot: { title: p.title, selling_price: p.selling_price },
    last_message: "Is it still available?", last_message_type: "text",
    last_activity_at: new Date(now - Math.floor(Math.random() * 7 * 864e5)),
    unread_count: { buyer: Math.floor(Math.random() * 3), seller: Math.floor(Math.random() * 3) },
    deleted_for: { buyer: false, seller: false },
    createdAt: new Date(), updatedAt: new Date(),
  });
}
await Conversation.collection.insertMany(conversations, { ordered: false });

const messages = [];
for (const c of conversations) {
  for (let j = 0; j < SIZE.messagesPerConversation; j++) {
    const fromBuyer = j % 2 === 0;
    messages.push({
      _id: oid(), conversation_id: c._id,
      sender_id: fromBuyer ? c.buyer_id : c.seller_id, receiver_id: fromBuyer ? c.seller_id : c.buyer_id,
      message_type: "text", text: `Message ${j}: sounds good, can we meet tomorrow?`, message_status: "read",
      createdAt: new Date(now - (SIZE.messagesPerConversation - j) * 60000), updatedAt: new Date(),
    });
  }
}
for (let i = 0; i < messages.length; i += 20000) await Message.collection.insertMany(messages.slice(i, i + 20000), { ordered: false });

const notifications = [];
for (const u of active) {
  for (let j = 0; j < SIZE.notificationsPerUser; j++) {
    notifications.push({
      _id: oid(), is_broadcast: false, recipient_id: u._id, status: "sent", type: "message",
      title: "New message", message: "Someone replied to your listing", is_read: j > 2, sent_at: new Date(now - j * 3600e3),
      createdAt: new Date(), updatedAt: new Date(),
    });
  }
}
await Notification.collection.insertMany(notifications, { ordered: false });

// Signed-in sessions for the active users (real per-device sessions).
const { default: generatedRefreshToken, sessionIdOf } = await import(B + "src/utils/generatedRefreshToken.js");
const { default: generatedAccessToken } = await import(B + "src/utils/generatedAccessToken.js");
const convByUser = new Map();
for (const c of conversations) {
  for (const id of [String(c.buyer_id), String(c.seller_id)]) {
    if (!convByUser.has(id)) convByUser.set(id, []);
    convByUser.get(id).push(String(c._id));
  }
}
const sessions = [];
for (const u of active) {
  const refresh = await generatedRefreshToken(u._id, 0);
  const access = await generatedAccessToken(u._id, 0, sessionIdOf(refresh));
  sessions.push({ userId: String(u._id), email: u.email, access, refresh, conversations: (convByUser.get(String(u._id)) || []).slice(0, 20) });
}

fs.writeFileSync(
  path.join(HERE, ".fixtures.json"),
  JSON.stringify({
    port: PORT, password: PASSWORD, campusSlug: "vit-vellore",
    productIds: products.map((p) => String(p._id)),
    searchTerms: [...WORDS, ...ADJ.map((a) => a.toLowerCase())],
    categories: CATS, sessions, size: SIZE,
  }),
);
// Release the seed data so memory readings reflect the app, not the harness.
for (const arr of [users, products, conversations, messages, notifications]) arr.length = 0;
sessions.length = 0;
global.gc?.();
console.log(`[loadtest] seeded ${SIZE.users} users, ${SIZE.products} listings, ${SIZE.conversations} chats, ${SIZE.conversations * SIZE.messagesPerConversation} messages, ${SIZE.activeUsers * SIZE.notificationsPerUser} notifications in ${((Date.now() - t0) / 1000).toFixed(1)}s`);

// ---- App + stats ----
const { default: app } = await import(B + "src/app.js");
const { initSockets } = await import(B + "src/sockets/index.js");
const loop = monitorEventLoopDelay({ resolution: 10 });
loop.enable();

const server = http.createServer((req, res) => {
  if (req.url === "/__stats") {
    const cpu = process.cpuUsage();
    const mem = process.memoryUsage();
    res.setHeader("content-type", "application/json");
    return res.end(JSON.stringify({
      cpuMicros: cpu.user + cpu.system,
      rssMB: mem.rss / 1048576, heapMB: mem.heapUsed / 1048576,
      loopP99Ms: loop.percentile(99) / 1e6, loopMaxMs: loop.max / 1e6,
      ops: ops.total, opsByCommand: ops.byCommand,
    }));
  }
  if (req.url === "/__dbstats") {
    // Storage per collection (documents + indexes): what fills Atlas's quota.
    const db = mongoose.connection.db;
    const names = ["users", "products", "conversations", "messages", "notifications", "authsessions"];
    Promise.all(
      names.map(async (n) => {
        const [st] = await db.collection(n).aggregate([{ $collStats: { storageStats: {} } }]).toArray();
        const s2 = st?.storageStats || {};
        return { collection: n, count: s2.count || 0, avgObjBytes: s2.avgObjSize || 0, dataMB: (s2.size || 0) / 1048576, indexMB: (s2.totalIndexSize || 0) / 1048576 };
      }),
    ).then((rows) => {
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify(rows));
    });
    return undefined;
  }
  if (req.url === "/__gc") {
    global.gc?.();
    return res.end(global.gc ? "ok" : "start with --expose-gc");
  }
  if (req.url === "/__reset") {
    loop.reset();
    ops.total = 0;
    ops.byCommand = {};
    return res.end("ok");
  }
  return app(req, res);
});
initSockets(server);
server.keepAliveTimeout = 65000;
server.listen(PORT, () => console.log(`[loadtest] app listening on http://127.0.0.1:${PORT} (pid ${process.pid})`));

const stop = async () => {
  server.close();
  await mongoose.disconnect().catch(() => {});
  await mongod.stop().catch(() => {});
  process.exit(0);
};
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
