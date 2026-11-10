// Run: npm run test:auth-mobile
// Integration tests for the native-app ("x-client-type: mobile") auth mode,
// run against the real Express app + an in-memory MongoDB.
//
// Guarantees under test:
//  - Web (Origin present) never receives tokens in JSON — cookies only.
//  - Mobile (header + no Origin) receives tokens in JSON and NO cookies.
//  - The mobile header is ignored whenever a browser Origin is present.
//  - Mobile refresh reads ONLY the body token (a cookie can't be converted
//    into a JSON-exposed token), rotates, and Bearer auth works end to end.
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
const { default: User } = await import(B + "src/models/User.model.js");
const { default: app } = await import(B + "src/app.js");

const EMAIL = "mobile.tester@example.test";
const PASSWORD = "Sup3r-secret-pass";
await User.create({
  name: "Mobile Tester",
  email: EMAIL,
  password: await bcrypt.hash(PASSWORD, 10),
  is_email_verified: true,
});

const server = app.listen(0);
await new Promise((r) => server.once("listening", r));
const base = `http://127.0.0.1:${server.address().port}`;

const post = (path, body, headers = {}) =>
  fetch(base + path, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body ?? {}),
  });

const MOBILE = { "x-client-type": "mobile" };
const WEB_ORIGIN = { origin: process.env.FRONTEND_URL };

let failures = 0;
const test = async (name, fn) => {
  try {
    await fn();
    console.log(`  ok  ${name}`);
  } catch (err) {
    failures += 1;
    console.error(`  FAIL ${name}\n       ${err.message}`);
  }
};

let mobileAccess;
let mobileRefresh;

await test("web login: cookies set, no tokens in JSON", async () => {
  const res = await post("/api/auth/login", { email: EMAIL, password: PASSWORD }, WEB_ORIGIN);
  assert.equal(res.status, 200);
  const json = await res.json();
  assert.equal(json.data.accessToken, undefined);
  assert.equal(json.data.refreshToken, undefined);
  const cookies = res.headers.getSetCookie().join(";");
  assert.match(cookies, /accessToken=/);
  assert.match(cookies, /refreshToken=/);
});

await test("mobile header + browser Origin is treated as web", async () => {
  const res = await post(
    "/api/auth/login",
    { email: EMAIL, password: PASSWORD },
    { ...MOBILE, ...WEB_ORIGIN },
  );
  assert.equal(res.status, 200);
  const json = await res.json();
  assert.equal(json.data.accessToken, undefined);
  assert.equal(json.data.refreshToken, undefined);
});

await test("mobile login: tokens in JSON, no auth cookies", async () => {
  // Space out from the previous logins so this session's token differs
  // from the rotated-out one (else the 60s grace replay path applies).
  await new Promise((r) => setTimeout(r, 1100));
  const res = await post("/api/auth/login", { email: EMAIL, password: PASSWORD }, MOBILE);
  assert.equal(res.status, 200);
  const json = await res.json();
  assert.equal(typeof json.data.accessToken, "string");
  assert.equal(typeof json.data.refreshToken, "string");
  assert.equal(json.data.user.email, EMAIL);
  const cookies = res.headers.getSetCookie().join(";");
  assert.doesNotMatch(cookies, /accessToken=|refreshToken=/);
  mobileAccess = json.data.accessToken;
  mobileRefresh = json.data.refreshToken;
});

await test("Bearer access token authenticates protected routes", async () => {
  const res = await fetch(base + "/api/user/userProfile", {
    headers: { authorization: `Bearer ${mobileAccess}` },
  });
  assert.equal(res.status, 200);
  const json = await res.json();
  assert.equal(json.success, true);
});

await test("mobile refresh ignores cookies (no body token → 401)", async () => {
  const res = await post("/api/auth/refresh-token", {}, {
    ...MOBILE,
    cookie: `refreshToken=${mobileRefresh}`,
  });
  assert.equal(res.status, 401);
});

await test("mobile refresh with body token rotates and returns tokens", async () => {
  // JWTs minted within the same second are byte-identical; wait so the
  // rotated token is distinguishable from the login one.
  await new Promise((r) => setTimeout(r, 1100));
  const res = await post("/api/auth/refresh-token", { refreshToken: mobileRefresh }, MOBILE);
  assert.equal(res.status, 200);
  const json = await res.json();
  assert.equal(typeof json.data.accessToken, "string");
  assert.equal(typeof json.data.refreshToken, "string");
  assert.notEqual(json.data.refreshToken, mobileRefresh);
  assert.doesNotMatch(res.headers.getSetCookie().join(";"), /refreshToken=/);
  mobileAccess = json.data.accessToken;
  mobileRefresh = json.data.refreshToken;
});

await test("web refresh never returns tokens in JSON", async () => {
  const res = await post("/api/auth/refresh-token", { refreshToken: mobileRefresh }, WEB_ORIGIN);
  // No cookie sent → 401, and certainly no body tokens.
  const json = await res.json();
  assert.equal(json.data?.accessToken, undefined);
  assert.equal(res.status, 401);
});

await test("mobile logout revokes the session", async () => {
  const res = await post("/api/auth/logoutUser", { refreshToken: mobileRefresh }, {
    ...MOBILE,
    authorization: `Bearer ${mobileAccess}`,
  });
  assert.equal(res.status, 200);
  const after = await post("/api/auth/refresh-token", { refreshToken: mobileRefresh }, MOBILE);
  assert.equal(after.status, 401);
  const profile = await fetch(base + "/api/user/userProfile", {
    headers: { authorization: `Bearer ${mobileAccess}` },
  });
  assert.equal(profile.status, 401);
});

// ── Google sign-in for the native app (server OAuth flow) ──
const get = (path, headers = {}) => fetch(base + path, { redirect: "manual", headers });

await test("google redirect remembers an app return_to (own schemes only)", async () => {
  const res = await get("/api/auth/google?return_to=" + encodeURIComponent("unideals://oauth"));
  assert.equal(res.status, 302);
  assert.ok(res.headers.get("location").startsWith("https://accounts.google.com/"));
  assert.match(res.headers.getSetCookie().join(";"), /oauth_mobile_return=unideals%3A%2F%2Foauth/);
});

await test("google redirect ignores web return_to values (no open redirect)", async () => {
  const res = await get("/api/auth/google?return_to=" + encodeURIComponent("https://evil.example/steal"));
  assert.equal(res.status, 302);
  const cookies = res.headers.getSetCookie().join(";");
  assert.doesNotMatch(cookies, /evil/);
  assert.doesNotMatch(cookies, /oauth_mobile_return=[^;]+oauth/);
});

await test("google callback errors go back to the app, not the website", async () => {
  const res = await get("/api/auth/google/callback?state=x", { cookie: "oauth_mobile_return=" + encodeURIComponent("unideals://oauth") });
  assert.equal(res.status, 302);
  assert.equal(res.headers.get("location"), "unideals://oauth?oauth_error=missing_code");
  const mismatch = await get("/api/auth/google/callback?code=abc&state=nope", {
    cookie: "oauth_state=other; oauth_mobile_return=" + encodeURIComponent("exp://192.168.0.5:8081/--/oauth"),
  });
  assert.equal(mismatch.headers.get("location"), "exp://192.168.0.5:8081/--/oauth?oauth_error=session_mismatch");
});

await test("google callback without the app cookie still redirects to the website", async () => {
  const res = await get("/api/auth/google/callback?state=x");
  assert.equal(res.headers.get("location"), "https://app.example.test/login?oauth_error=missing_code");
});

await test("mobile exchange of a one-time google code returns tokens in JSON", async () => {
  const { createHash } = await import("node:crypto");
  const code = "one-time-code-for-tests";
  await User.updateOne(
    { email: EMAIL },
    { oauth_login_token: createHash("sha256").update(code).digest("hex"), oauth_login_expiry: new Date(Date.now() + 60_000) },
  );
  const res = await post("/api/auth/google/exchange", { code }, MOBILE);
  assert.equal(res.status, 200);
  const json = await res.json();
  assert.ok(json.data.accessToken && json.data.refreshToken);
  assert.equal(res.headers.getSetCookie().length, 0);
  const again = await post("/api/auth/google/exchange", { code }, MOBILE);
  assert.equal(again.status, 401);
});

server.close();
await mongoose.disconnect();
await mongod.stop();

if (failures) {
  console.error(`\n${failures} test(s) failed`);
  process.exit(1);
}
console.log("\nall mobile auth tests passed");
process.exit(0);
