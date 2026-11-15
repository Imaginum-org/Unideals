// Run: node tests/collegeVerification.integration.test.mjs
// College email verification (blue tick): domain checks, OTP send/verify,
// cooldown, wrong-code limits, expiry, one account per address and the
// +50 XP, against in-memory MongoDB.
import assert from "node:assert/strict";
import bcrypt from "bcrypt";
import { MongoMemoryServer } from "mongodb-memory-server";

const B = new URL("../", import.meta.url).href;
process.env.IMAGEKIT_URL_ENDPOINT = "";
process.env.SECRET_KEY_ACCESS_TOKEN = "t";
process.env.SECRET_KEY_REFRESH_TOKEN = "t";

const mongod = await MongoMemoryServer.create();
const { default: mongoose } = await import(B + "node_modules/mongoose/index.js");
await mongoose.connect(mongod.getUri());

const { default: User } = await import(B + "src/models/User.model.js");
const { default: Campus } = await import(B + "src/models/Campus.model.js");
await User.init();
const svc = await import(B + "src/services/collegeVerification.service.js");
const { computeAndAwardBadges } = await import(B + "src/services/badgeService.js");

// No mail provider in tests: the service prints the code; capture it.
process.env.NODE_ENV = "test";
delete process.env.RESEND_API_KEY;
const codes = new Map();
const realInfo = console.info;
console.info = (msg, ...rest) => {
  const m = /^\[college-otp\] (\S+) -> (\d{6})$/.exec(String(msg));
  if (m) codes.set(m[1], m[2]);
  else realInfo(msg, ...rest);
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
const rejects = (fn, pattern) => assert.rejects(fn, (err) => pattern.test(err.message));

// Default campus: VIT Vellore. Its document still lists the old vit.ac.in
// on purpose: the VIT rule must win and accept only vitstudent.ac.in.
const campus = await Campus.create({ slug: "vit-vellore", name: "VIT Vellore", short_name: "Vellore", is_active: true, email_domains: ["vit.ac.in"] });
const bhopal = await Campus.create({ slug: "vit-bhopal", name: "VIT Bhopal", short_name: "Bhopal", is_active: true, email_domains: ["vitbhopal.ac.in"] });
// A future college with its own domain set on the campus, and one not set up.
const lpu = await Campus.create({ slug: "lpu", name: "LPU", short_name: "LPU", is_active: true, email_domains: ["lpu.in", "gmail.com"] });
const other = await Campus.create({ slug: "srm-ktr", name: "SRM KTR", short_name: "SRM", is_active: true });
let n = 0;
const mkUser = (extra = {}) =>
  User.create({
    name: `User ${++n}`, email: `u${n}@gmail.com`, password: bcrypt.hashSync("password123", 4),
    campus_id: campus._id, is_email_verified: true, status: "active", ...extra,
  });
// Skip the 60s resend cooldown between steps.
const clearCooldown = (id) => User.updateOne({ _id: id }, { $set: { "college_email_otp.sent_at": new Date(0) } });
const wrong = (code) => String((Number(code) + 1) % 1_000_000).padStart(6, "0");

console.log("\nCampus domains");
await test("every VIT campus accepts only addresses ending in vitstudent.ac.in", async () => {
  assert.deepEqual(svc.campusDomainsFor({ slug: "vit-vellore", email_domains: ["vit.ac.in"] }), ["vitstudent.ac.in"]);
  assert.deepEqual(svc.campusDomainsFor({ slug: "vit-chennai" }), ["vitstudent.ac.in"]);
  assert.deepEqual(svc.campusDomainsFor({ slug: "vit-amaravati" }), ["vitstudent.ac.in"]);
  assert.deepEqual(svc.campusDomainsFor({ slug: "vitamin-u" }), []);
  const u = await mkUser();
  await rejects(() => svc.sendCollegeOtp(u._id, "riya@vit.ac.in"), /VIT Vellore email ending in @vitstudent\.ac\.in/);
  await rejects(() => svc.sendCollegeOtp(u._id, "riya@iitd.ac.in"), /@vitstudent\.ac\.in/);
  await rejects(() => svc.sendCollegeOtp(u._id, "riya@notvitstudent.ac.in"), /@vitstudent\.ac\.in/);
  await rejects(() => svc.sendCollegeOtp(u._id, "riya@gmail.com"), /@vitstudent\.ac\.in/);
  await rejects(() => svc.sendCollegeOtp(u._id, "not-an-email"), /valid email/);
  const b = await mkUser({ campus_id: bhopal._id });
  await rejects(() => svc.sendCollegeOtp(b._id, "riya@vitbhopal.ac.in"), /VIT Bhopal email ending in @vitstudent\.ac\.in/);
  await svc.sendCollegeOtp(b._id, "riya.b@vitstudent.ac.in");
  const st = await svc.getCollegeStatus(u._id);
  assert.equal(st.available, true);
  assert.deepEqual(st.allowedDomains, ["vitstudent.ac.in"]);
});
await test("other colleges use their campus's domains (personal ones ignored)", async () => {
  const u = await mkUser({ campus_id: lpu._id });
  await rejects(() => svc.sendCollegeOtp(u._id, "me@gmail.com"), /@lpu\.in/);
  await svc.sendCollegeOtp(u._id, "me@students.lpu.in");
});
await test("a campus with no domain set up can't verify yet", async () => {
  const u = await mkUser({ campus_id: other._id });
  const st = await svc.getCollegeStatus(u._id);
  assert.equal(st.available, false);
  await rejects(() => svc.sendCollegeOtp(u._id, "me@srmist.edu.in"), /isn't available for your campus yet/);
});

console.log("\nSending and verifying");
await test("sends a code, stores only its hash, and verifies with it", async () => {
  const u = await mkUser();
  const sent = await svc.sendCollegeOtp(u._id, "  Riya@VITstudent.ac.in ");
  assert.equal(sent.email, "riya@vitstudent.ac.in");
  const code = codes.get("riya@vitstudent.ac.in");
  assert.match(code, /^\d{6}$/);
  const raw = await User.findById(u._id).select("+college_email_otp").lean();
  assert.notEqual(raw.college_email_otp.hash, code);
  assert.equal(raw.college_email_otp.hash.length, 64);
  const pending = await svc.getCollegeStatus(u._id);
  assert.equal(pending.verified, false);
  assert.equal(pending.pendingEmail, "riya@vitstudent.ac.in");

  const res = await svc.verifyCollegeOtp(u._id, code);
  assert.equal(res.verified, true);
  assert.equal(res.email, "ri•••@vitstudent.ac.in");
  const after = await User.findById(u._id).select("+college_email_otp").lean();
  assert.equal(after.is_college_verified, true);
  assert.equal(after.college_email, "riya@vitstudent.ac.in");
  assert.equal(after.college_email_otp, null);
  await rejects(() => svc.sendCollegeOtp(u._id, "riya2@vitstudent.ac.in"), /already verified/);
});
await test("a profile read without +college_email_otp never includes the code hash", async () => {
  const u = await mkUser();
  await svc.sendCollegeOtp(u._id, "x@vitstudent.ac.in");
  const plain = await User.findById(u._id).lean();
  assert.equal(plain.college_email_otp, undefined);
});
await test("enforces the resend cooldown", async () => {
  const u = await mkUser();
  await svc.sendCollegeOtp(u._id, "a@vitstudent.ac.in");
  await rejects(() => svc.sendCollegeOtp(u._id, "a@vitstudent.ac.in"), /Please wait \d+s/);
  await clearCooldown(u._id);
  await svc.sendCollegeOtp(u._id, "a@vitstudent.ac.in");
});
await test("a new code replaces the old one", async () => {
  const u = await mkUser();
  await svc.sendCollegeOtp(u._id, "b@vitstudent.ac.in");
  const first = codes.get("b@vitstudent.ac.in");
  await clearCooldown(u._id);
  await svc.sendCollegeOtp(u._id, "b@vitstudent.ac.in");
  const second = codes.get("b@vitstudent.ac.in");
  if (first !== second) await rejects(() => svc.verifyCollegeOtp(u._id, first), /isn't right/);
  assert.equal((await svc.verifyCollegeOtp(u._id, second)).verified, true);
});

console.log("\nWrong codes and expiry");
await test("counts wrong tries and locks the code after 5", async () => {
  const u = await mkUser();
  await svc.sendCollegeOtp(u._id, "c@vitstudent.ac.in");
  const code = codes.get("c@vitstudent.ac.in");
  await rejects(() => svc.verifyCollegeOtp(u._id, "12"), /6-digit code/);
  for (let i = 4; i >= 1; i--) {
    await rejects(() => svc.verifyCollegeOtp(u._id, wrong(code)), new RegExp(`${i} tr(y|ies) left`));
  }
  await rejects(() => svc.verifyCollegeOtp(u._id, wrong(code)), /Too many wrong tries/);
  await rejects(() => svc.verifyCollegeOtp(u._id, code), /Too many wrong tries/);
  assert.equal((await User.findById(u._id).lean()).is_college_verified, false);
});
await test("rejects an expired code and a verify with no code sent", async () => {
  const u = await mkUser();
  await rejects(() => svc.verifyCollegeOtp(u._id, "123456"), /Ask for a code first/);
  await svc.sendCollegeOtp(u._id, "d@vitstudent.ac.in");
  await User.updateOne({ _id: u._id }, { $set: { "college_email_otp.expires_at": new Date(Date.now() - 1000) } });
  await rejects(() => svc.verifyCollegeOtp(u._id, codes.get("d@vitstudent.ac.in")), /expired/);
});
await test("a code is bound to its account", async () => {
  const a = await mkUser();
  const b = await mkUser();
  await svc.sendCollegeOtp(a._id, "e@vitstudent.ac.in");
  await svc.sendCollegeOtp(b._id, "f@vitstudent.ac.in");
  // The hash includes user id and address, so A's code never works for B
  // (unless the two random codes happen to match, 1 in a million).
  if (codes.get("e@vitstudent.ac.in") !== codes.get("f@vitstudent.ac.in")) {
    await rejects(() => svc.verifyCollegeOtp(b._id, codes.get("e@vitstudent.ac.in")), /isn't right/);
  }
});

console.log("\nOne account per address");
await test("an address verified on one account can't be used on another", async () => {
  const a = await mkUser();
  const b = await mkUser();
  // Both ask before either verifies.
  await svc.sendCollegeOtp(a._id, "shared@vitstudent.ac.in");
  const codeA = codes.get("shared@vitstudent.ac.in");
  await svc.sendCollegeOtp(b._id, "shared@vitstudent.ac.in");
  const codeB = codes.get("shared@vitstudent.ac.in");
  await svc.verifyCollegeOtp(a._id, codeA);
  await rejects(() => svc.verifyCollegeOtp(b._id, codeB), /already linked to another/);
  const c = await mkUser();
  await rejects(() => svc.sendCollegeOtp(c._id, "SHARED@vitstudent.ac.in"), /already linked to another/);
});

console.log("\nReward");
await test("a verified college email adds 50 XP to the recompute", async () => {
  const u = await mkUser();
  const before = (await computeAndAwardBadges(u._id)).total_xp;
  await svc.sendCollegeOtp(u._id, "g@vitstudent.ac.in");
  await svc.verifyCollegeOtp(u._id, codes.get("g@vitstudent.ac.in"));
  const after = (await computeAndAwardBadges(u._id)).total_xp;
  assert.equal(after - before, 50);
});

console.info = realInfo;
console.log(`\n${passed} passed, ${failed} failed\n`);
await mongoose.disconnect();
await mongod.stop();
process.exit(failed ? 1 : 0);
