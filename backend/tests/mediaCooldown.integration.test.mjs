// Per-person media cooldown + storage compression, through the REAL Express
// app over HTTP (Bearer auth), against an in-memory MongoDB. Cloudinary's
// upload reply is simulated with its documented response signature.
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { MongoMemoryServer } from "mongodb-memory-server";

const B = new URL("../", import.meta.url).href;
process.env.SECRET_KEY_ACCESS_TOKEN = "test-access-secret";
process.env.SECRET_KEY_REFRESH_TOKEN = "test-refresh-secret";
process.env.FRONTEND_URL = "https://app.example.test";
process.env.NODE_ENV = "test";
process.env.CLOUDINARY_CLOUD_NAME = "demo";
process.env.CLOUDINARY_API_KEY = "key";
process.env.CLOUDINARY_API_SECRET = "s3cret";
process.env.CHAT_IMAGE_COOLDOWN_MS = "4000";

const mongod = await MongoMemoryServer.create();
const { default: mongoose } = await import(B + "node_modules/mongoose/index.js");
await mongoose.connect(mongod.getUri());
const { default: bcrypt } = await import(B + "node_modules/bcrypt/bcrypt.js");
const { default: User } = await import(B + "src/models/User.model.js");
const { default: Product } = await import(B + "src/models/Product.model.js");
const { default: Campus } = await import(B + "src/models/Campus.model.js");
const { default: Conversation } = await import(B + "src/models/conversation.model.js");
const { default: Message } = await import(B + "src/models/message.model.js");
await Promise.all([User.init(), Product.init(), Conversation.init(), Message.init()]);
const { default: app } = await import(B + "src/app.js");

const campus = await Campus.create({ slug: "vit", name: "VIT", short_name: "VIT", is_active: true });
const PASSWORD = "Sup3r-secret-pass";
const hash = await bcrypt.hash(PASSWORD, 10);
const mk = (email) =>
  User.create({ name: email.split("@")[0], email, password: hash, is_email_verified: true, status: "active", campus_id: campus._id, gender: "male" });
const seller = await mk("seller@example.test");
const buyer = await mk("buyer@example.test");
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

const server = app.listen(0);
await new Promise((r) => server.once("listening", r));
const base = `http://127.0.0.1:${server.address().port}`;
const MOBILE = { "x-client-type": "mobile", "content-type": "application/json" };
const login = async (email) => {
  const res = await fetch(base + "/api/auth/login", { method: "POST", headers: MOBILE, body: JSON.stringify({ email, password: PASSWORD }) });
  const json = await res.json();
  assert.equal(res.status, 200, JSON.stringify(json));
  return json.data.accessToken;
};
const call = (token, path, { method = "GET", body } = {}) =>
  fetch(base + path, { method, headers: { ...MOBILE, authorization: `Bearer ${token}` }, ...(body ? { body: JSON.stringify(body) } : {}) });

const sha1 = (s) => crypto.createHash("sha1").update(s).digest("hex");
let ver = 1700000000;
// Ticket from the API, then the reply Cloudinary would give the browser.
const uploadVia = async (token) => {
  const t = (await (await call(token, "/api/conversations/uploads/image-signature")).json()).data;
  const version = ++ver;
  return { ticket: t, body: { publicId: t.public_id, version, signature: sha1(`public_id=${t.public_id}&version=${version}s3cret`), width: 800, height: 600 } };
};

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

const buyerToken = await login("buyer@example.test");
const sellerToken = await login("seller@example.test");
const imagePath = `/api/conversations/${conv._id}/image`;

console.log("\nMedia cooldown + compression (HTTP)");
await test("upload tickets make Cloudinary recompress on arrival", async () => {
  const { ticket } = await uploadVia(buyerToken);
  assert.match(ticket.transformation, /q_auto:good/);
  assert.match(ticket.transformation, /c_limit,h_1600,w_1600/);
});
await test("first photo goes through", async () => {
  const { body } = await uploadVia(buyerToken);
  const res = await call(buyerToken, imagePath, { method: "POST", body });
  assert.equal(res.status, 201, await res.text());
});
await test("a second photo inside the cooldown is refused with Retry-After", async () => {
  const { body } = await uploadVia(buyerToken);
  const res = await call(buyerToken, imagePath, { method: "POST", body });
  assert.equal(res.status, 429);
  assert.match((await res.json()).message, /Wait a moment/);
  assert.ok(Number(res.headers.get("retry-after")) > 0, "Retry-After header");
});
await test("the cooldown is per person: the other side can still send", async () => {
  const { body } = await uploadVia(sellerToken);
  const res = await call(sellerToken, imagePath, { method: "POST", body });
  assert.equal(res.status, 201, await res.text());
});
await test("after the cooldown the same person can send again", async () => {
  await new Promise((r) => setTimeout(r, 4200));
  const { body } = await uploadVia(buyerToken);
  const res = await call(buyerToken, imagePath, { method: "POST", body });
  assert.equal(res.status, 201, await res.text());
});

console.log(`\n${passed} passed, ${failed} failed`);
server.close();
await mongoose.disconnect();
await mongod.stop();
process.exit(failed ? 1 : 0);
