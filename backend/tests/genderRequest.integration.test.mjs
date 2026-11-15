// Run: node tests/genderRequest.integration.test.mjs
// Gender-change requests with a college ID photo: submit, replace, cancel,
// staff review (photo deleted either way), account deletion and the Google
// gender lookup, against in-memory MongoDB.
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
const { default: GenderIdCard } = await import(B + "src/models/GenderIdCard.model.js");
const { default: Notification } = await import(B + "src/models/Notification.model.js");
await Promise.all([User.init(), GenderIdCard.init()]);
const svc = await import(B + "src/services/genderRequest.service.js");
const adminSvc = await import(B + "src/services/admin.user.service.js");
const deletion = await import(B + "src/services/userDeletion.service.js");

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
const rejects = async (fn, pattern) => {
  await assert.rejects(fn, (err) => pattern.test(err.message));
};

const campus = await Campus.create({ slug: "vit", name: "VIT Vellore", short_name: "VIT", is_active: true });
let n = 0;
const mkUser = (extra = {}) =>
  User.create({
    name: `User ${++n}`, email: `g${n}@t.edu`, password: bcrypt.hashSync("password123", 4),
    campus_id: campus._id, is_email_verified: true, status: "active", gender: "male", ...extra,
  });

const jpeg = (size = 64) => {
  const buf = Buffer.alloc(size, 1);
  buf[0] = 0xff; buf[1] = 0xd8; buf[2] = 0xff;
  return { buffer: buf, mimetype: "image/jpeg" };
};
const png = () => ({ buffer: Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(32)]), mimetype: "image/png" });

console.log("\nSubmitting a request");
await test("needs an ID photo", async () => {
  const u = await mkUser();
  await rejects(() => svc.submitGenderRequest({ userId: u._id, requestedGender: "female", file: null }), /photo of your college ID/);
  assert.equal(await GenderIdCard.countDocuments({ user_id: u._id }), 0);
  assert.equal((await User.findById(u._id).lean()).genderChangeRequest?.status ?? null, null);
});
await test("checks the file bytes, not the declared type", async () => {
  const u = await mkUser();
  const fake = { buffer: Buffer.from("<script>alert(1)</script> not an image"), mimetype: "image/jpeg" };
  await rejects(() => svc.submitGenderRequest({ userId: u._id, requestedGender: "female", file: fake }), /JPG, PNG or WEBP/);
});
await test("rejects photos over 5 MB", async () => {
  const u = await mkUser();
  await rejects(() => svc.submitGenderRequest({ userId: u._id, requestedGender: "female", file: jpeg(5 * 1024 * 1024 + 1) }), /under 5 MB/);
});
await test("rejects the current gender and users without one", async () => {
  const u = await mkUser();
  await rejects(() => svc.submitGenderRequest({ userId: u._id, requestedGender: "male", file: jpeg() }), /already your gender/);
  const none = await mkUser({ gender: null });
  await rejects(() => svc.submitGenderRequest({ userId: none._id, requestedGender: "female", file: jpeg() }), /Set your gender/);
});
await test("stores the photo and a pending request; status reports it", async () => {
  const u = await mkUser();
  const req = await svc.submitGenderRequest({ userId: u._id, requestedGender: "female", file: jpeg() });
  assert.equal(req.status, "pending");
  assert.equal(req.idCardOnFile, true);
  const card = await GenderIdCard.findOne({ user_id: u._id }).lean();
  assert.equal(card.mimetype, "image/jpeg");
  const status = await svc.getGenderRequestStatus(u._id);
  assert.equal(status.gender, "male", "gender doesn't change until approved");
  assert.equal(status.genderChangeRequest.requestedGender, "female");
  assert.equal(status.genderChangeRequest.idCardOnFile, true);
});
await test("sending again replaces the photo (still one per user)", async () => {
  const u = await mkUser();
  await svc.submitGenderRequest({ userId: u._id, requestedGender: "female", file: jpeg() });
  await svc.submitGenderRequest({ userId: u._id, requestedGender: "other", file: png() });
  const cards = await GenderIdCard.find({ user_id: u._id }).lean();
  assert.equal(cards.length, 1);
  assert.equal(cards[0].mimetype, "image/png");
  assert.equal((await User.findById(u._id).lean()).genderChangeRequest.requestedGender, "other");
});
await test("a pending request whose photo expired reports idCardOnFile=false", async () => {
  const u = await mkUser();
  await svc.submitGenderRequest({ userId: u._id, requestedGender: "female", file: jpeg() });
  await GenderIdCard.deleteOne({ user_id: u._id }); // what the TTL does
  const status = await svc.getGenderRequestStatus(u._id);
  assert.equal(status.genderChangeRequest.status, "pending");
  assert.equal(status.genderChangeRequest.idCardOnFile, false);
  await rejects(() => svc.getIdCardForReview(u._id), /expired/);
});

console.log("\nCancelling");
await test("cancel deletes the photo and marks the request cancelled", async () => {
  const u = await mkUser();
  await svc.submitGenderRequest({ userId: u._id, requestedGender: "female", file: jpeg() });
  const res = await svc.cancelGenderRequest(u._id);
  assert.equal(res.status, "cancelled");
  assert.equal(await GenderIdCard.countDocuments({ user_id: u._id }), 0);
  assert.equal((await User.findById(u._id).lean()).gender, "male");
});
await test("cancel without a pending request is a 409", async () => {
  const u = await mkUser();
  await assert.rejects(() => svc.cancelGenderRequest(u._id), (err) => err.statusCode === 409);
});

console.log("\nStaff review");
await test("the photo is only served while the request is pending", async () => {
  const u = await mkUser();
  await rejects(() => svc.getIdCardForReview(u._id), /No pending/);
  await svc.submitGenderRequest({ userId: u._id, requestedGender: "female", file: jpeg(100) });
  const card = await svc.getIdCardForReview(u._id);
  assert.equal(card.size, 100);
  assert.equal(card.mimetype, "image/jpeg");
});
await test("the queue says which requests have a photo", async () => {
  await User.updateMany({}, { $unset: { genderChangeRequest: 1 } });
  await GenderIdCard.deleteMany({});
  const withPhoto = await mkUser();
  const expired = await mkUser();
  await svc.submitGenderRequest({ userId: withPhoto._id, requestedGender: "female", file: jpeg() });
  await svc.submitGenderRequest({ userId: expired._id, requestedGender: "female", file: jpeg() });
  await GenderIdCard.deleteOne({ user_id: expired._id });
  const { data } = await adminSvc.getGenderChangeRequests({});
  const byId = Object.fromEntries(data.map((r) => [r.id, r]));
  assert.equal(byId[String(withPhoto._id)].hasIdCard, true);
  assert.match(byId[String(withPhoto._id)].idCardUrl, /\/api\/admin\/gender-requests\/.+\/id-card$/);
  assert.equal(byId[String(expired._id)].hasIdCard, false);
  assert.equal(byId[String(expired._id)].idCardUrl, null);
});
await test("approve sets the gender, deletes the photo and tells the user", async () => {
  const u = await mkUser();
  await svc.submitGenderRequest({ userId: u._id, requestedGender: "female", file: jpeg() });
  await adminSvc.reviewGenderChangeRequest(String(u._id), "approve");
  const after = await User.findById(u._id).lean();
  assert.equal(after.gender, "female");
  assert.equal(after.genderSource, "admin");
  assert.equal(after.genderChangeRequest.status, "approved");
  assert.equal(await GenderIdCard.countDocuments({ user_id: u._id }), 0);
  await new Promise((r) => setTimeout(r, 50));
  const note = await Notification.findOne({ recipient_id: u._id }).lean();
  assert.match(note?.title || "", /approved/);
});
await test("reject keeps the gender, deletes the photo and shows the reason", async () => {
  const u = await mkUser();
  await svc.submitGenderRequest({ userId: u._id, requestedGender: "female", file: jpeg() });
  await adminSvc.reviewGenderChangeRequest(String(u._id), "reject", "  ID photo is blurry  ");
  const after = await User.findById(u._id).lean();
  assert.equal(after.gender, "male");
  assert.equal(after.genderChangeRequest.status, "rejected");
  assert.equal(await GenderIdCard.countDocuments({ user_id: u._id }), 0);
  const status = await svc.getGenderRequestStatus(u._id);
  assert.equal(status.genderChangeRequest.reviewNote, "ID photo is blurry");
  // and they can try again
  const again = await svc.submitGenderRequest({ userId: u._id, requestedGender: "female", file: jpeg() });
  assert.equal(again.status, "pending");
  assert.equal(again.reviewNote, null);
});

console.log("\nAccount deletion");
await test("permanent delete erases the ID photo", async () => {
  const admin = await mkUser({ role: "admin" });
  const u = await mkUser();
  await svc.submitGenderRequest({ userId: u._id, requestedGender: "female", file: jpeg() });
  await deletion.deleteUserPermanently({ userId: String(u._id), actor: admin, confirmEmail: u.email });
  assert.equal(await GenderIdCard.countDocuments({ user_id: u._id }), 0);
});

console.log("\nGoogle gender");
const realFetch = globalThis.fetch;
const fakeFetch = (body, ok = true) => {
  globalThis.fetch = async (url, opts) => {
    assert.match(String(url), /people\.googleapis\.com\/v1\/people\/me\?personFields=genders/);
    assert.equal(opts.headers.Authorization, "Bearer tok");
    return { ok, json: async () => body };
  };
};
await test("uses the primary male/female value", async () => {
  fakeFetch({ genders: [{ value: "male" }, { value: "female", metadata: { primary: true } }] });
  assert.equal(await svc.fetchGoogleGender("tok"), "female");
});
await test("ignores unspecified, custom, missing and failed lookups", async () => {
  fakeFetch({ genders: [{ value: "unspecified" }] });
  assert.equal(await svc.fetchGoogleGender("tok"), null);
  fakeFetch({ genders: [{ value: "Non-binary" }] });
  assert.equal(await svc.fetchGoogleGender("tok"), null);
  fakeFetch({});
  assert.equal(await svc.fetchGoogleGender("tok"), null);
  fakeFetch({ error: "x" }, false);
  assert.equal(await svc.fetchGoogleGender("tok"), null);
  globalThis.fetch = async () => { throw new Error("network down"); };
  assert.equal(await svc.fetchGoogleGender("tok"), null);
  assert.equal(await svc.fetchGoogleGender(null), null);
});
globalThis.fetch = realFetch;

await mongoose.disconnect();
await mongod.stop();
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
