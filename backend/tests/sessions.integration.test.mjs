// Per-device auth sessions, through the REAL Express app over HTTP (mobile
// token mode), against an in-memory MongoDB.
import assert from "node:assert/strict";
import { MongoMemoryServer } from "mongodb-memory-server";

const B = new URL("../", import.meta.url).href;
process.env.SECRET_KEY_ACCESS_TOKEN = "test-access-secret";
process.env.SECRET_KEY_REFRESH_TOKEN = "test-refresh-secret";
process.env.FRONTEND_URL = "https://app.example.test";
process.env.NODE_ENV = "test";

const mongod = await MongoMemoryServer.create();
const { default: mongoose } = await import(B + "node_modules/mongoose/index.js");
await mongoose.connect(mongod.getUri());
const { default: bcrypt } = await import(B + "node_modules/bcrypt/bcrypt.js");
const { default: jwt } = await import(B + "node_modules/jsonwebtoken/index.js");
const { default: User } = await import(B + "src/models/User.model.js");
const { default: AuthSession } = await import(B + "src/models/AuthSession.model.js");
await Promise.all([User.init(), AuthSession.init()]);
const { revokeRefreshToken } = await import(B + "src/services/auth.service.js");
const { default: app } = await import(B + "src/app.js");

const EMAIL = "sessions@example.test";
const PASSWORD = "Sup3r-secret-pass";
const user = await User.create({ name: "Session Tester", email: EMAIL, password: await bcrypt.hash(PASSWORD, 10), is_email_verified: true, status: "active" });

const server = app.listen(0);
await new Promise((r) => server.once("listening", r));
const base = `http://127.0.0.1:${server.address().port}`;
const MOBILE = { "x-client-type": "mobile", "content-type": "application/json" };
const post = (path, body, headers = {}) =>
  fetch(base + path, { method: "POST", headers: { ...MOBILE, ...headers }, body: JSON.stringify(body ?? {}) });
const login = async () => {
  const res = await post("/api/auth/login", { email: EMAIL, password: PASSWORD });
  const json = await res.json();
  assert.equal(res.status, 200, JSON.stringify(json));
  return json.data;
};
const refresh = (refreshToken) => post("/api/auth/refresh-token", { refreshToken });
const me = (accessToken) => fetch(base + "/api/user/userProfile", { headers: { ...MOBILE, authorization: `Bearer ${accessToken}` } });

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

console.log("\nPer-device sessions");
let A;
let Bdev;
await test("two devices sign in and BOTH stay signed in", async () => {
  A = await login();
  Bdev = await login();
  assert.ok(jwt.decode(A.refreshToken).sid, "token carries a session id");
  assert.notEqual(jwt.decode(A.refreshToken).sid, jwt.decode(Bdev.refreshToken).sid);
  const ra = await refresh(A.refreshToken);
  const rb = await refresh(Bdev.refreshToken);
  assert.equal(ra.status, 200, "device A refresh");
  assert.equal(rb.status, 200, "device B refresh (used to fail: one token per user)");
  A = (await ra.json()).data;
  Bdev = (await rb.json()).data;
  assert.equal((await me(A.accessToken)).status, 200);
});
await test("only a hash is stored, never the token", async () => {
  const s = await AuthSession.findById(jwt.decode(A.refreshToken).sid).lean();
  assert.ok(s.token_hash && s.token_hash.length === 64);
  assert.ok(!JSON.stringify(s).includes(A.refreshToken));
});
await test("parallel refresh: the just-rotated token gets a grace reply", async () => {
  const old = A.refreshToken;
  const first = await refresh(old);
  assert.equal(first.status, 200);
  const rotated = (await first.json()).data;
  const second = await refresh(old); // the other tab, a moment later
  assert.equal(second.status, 200, "grace window honoured");
  const graceData = (await second.json()).data;
  assert.ok(graceData.accessToken, "fresh access token");
  assert.ok(!graceData.refreshToken, "no new refresh token: keep the rotated one");
  A = rotated;
});
await test("a forged/unknown token for a real session is refused", async () => {
  const fake = jwt.sign({ id: String(user._id), v: 0, sid: jwt.decode(A.refreshToken).sid }, "test-refresh-secret", { expiresIn: "7d", jwtid: "x" });
  assert.equal((await refresh(fake)).status, 401);
});
await test("logging out one device leaves the other signed in", async () => {
  const out = await post("/api/auth/logoutUser", { refreshToken: A.refreshToken }, { authorization: `Bearer ${A.accessToken}` });
  assert.equal(out.status, 200);
  assert.equal((await refresh(A.refreshToken)).status, 401, "device A is out");
  assert.equal((await me(A.accessToken)).status, 401, "device A access token ends immediately");
  assert.equal((await me(Bdev.accessToken)).status, 200, "device B access token still works");
  const rb = await refresh(Bdev.refreshToken);
  assert.equal(rb.status, 200, "device B still in");
  Bdev = (await rb.json()).data;
});
await test("sign out everywhere (password reset etc.) ends every device", async () => {
  const C = await login();
  await revokeRefreshToken(user._id);
  assert.equal((await refresh(Bdev.refreshToken)).status, 401);
  assert.equal((await refresh(C.refreshToken)).status, 401);
  assert.equal(await AuthSession.countDocuments({ user_id: user._id }), 0);
});
await test("old-style tokens (before sessions) still work once, then move to a device session", async () => {
  const fresh = await User.findById(user._id).lean();
  const legacy = jwt.sign({ id: String(user._id), v: fresh.tokenVersion }, "test-refresh-secret", { expiresIn: "7d" });
  await User.updateOne({ _id: user._id }, { $set: { refresh_token: legacy } });
  const res = await refresh(legacy);
  assert.equal(res.status, 200, "legacy token honoured");
  const data = (await res.json()).data;
  assert.ok(jwt.decode(data.refreshToken).sid, "migrated to a device session");
  assert.equal((await refresh(legacy)).status, 401, "legacy token can't be reused");
  assert.equal((await refresh(data.refreshToken)).status, 200);
});
await test("at most 10 devices per account (oldest drop off)", async () => {
  for (let i = 0; i < 12; i++) await login();
  assert.equal(await AuthSession.countDocuments({ user_id: user._id }), 10);
});

console.log(`\n${passed} passed, ${failed} failed`);
server.close();
await mongoose.disconnect();
await mongod.stop();
process.exit(failed ? 1 : 0);
