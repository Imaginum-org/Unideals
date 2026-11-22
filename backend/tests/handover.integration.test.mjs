// Run: node tests/handover.integration.test.mjs
// Deal handover flow: handover code, "mark as done", no-shows, the
// follow-up job, legacy deals and races, against an in-memory MongoDB.
import assert from "node:assert/strict";
import { MongoMemoryServer } from "mongodb-memory-server";

const B = new URL("../", import.meta.url).href;
process.env.IMAGEKIT_URL_ENDPOINT = "";
process.env.SECRET_KEY_ACCESS_TOKEN = "handover-secret";
process.env.SECRET_KEY_REFRESH_TOKEN = "t";

const mongod = await MongoMemoryServer.create();
const { default: mongoose } = await import(B + "node_modules/mongoose/index.js");
await mongoose.connect(mongod.getUri());

const { default: User } = await import(B + "src/models/User.model.js");
const { default: Product } = await import(B + "src/models/Product.model.js");
const { default: Campus } = await import(B + "src/models/Campus.model.js");
const { default: Conversation } = await import(B + "src/models/conversation.model.js");
const { default: Deal } = await import(B + "src/models/deal.model.js");
const { default: Message } = await import(B + "src/models/message.model.js");
await Promise.all([Product.init(), User.init(), Conversation.init(), Deal.init()]);
const deals = await import(B + "src/services/deal.service.js");
const { HANDOVER } = deals;

let passed = 0;
let failed = 0;
const test = async (name, fn) => {
  try {
    await fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failed++;
    console.log(`  ✗ ${name}\n    ${err.stack.split("\n").slice(0, 3).join("\n    ")}`);
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
const S = String(seller._id);
const Bu = String(buyer._id);

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

// India-time day + time strings, `days` from today.
const istDay = (days = 1) => new Date(Date.now() + days * 864e5 + 5.5 * 36e5).toISOString().slice(0, 10);
const scheduled = async ({ time = "17:30", days = 1 } = {}) => {
  const t = await mkThread();
  await deals.confirmDeal({ conversationId: t.id, userId: S, amount: 800 });
  await deals.schedulePickup({ conversationId: t.id, userId: S, date: istDay(days), time, location: "Library" });
  return t;
};
const dealOf = (id) => Deal.findOne({ conversation_id: id }).lean();
const wrongCode = (code) => String((Number(code) + 1) % 10000).padStart(4, "0");
const systemTexts = async (id) => (await Message.find({ conversation_id: id, message_type: "system" }).sort({ createdAt: 1 }).lean()).map((m) => m.text);

console.log("\nScheduling");
await test("a meetup with a time stores India time and its follow-up timers", async () => {
  const { id } = await scheduled({ time: "17:30" });
  const d = await dealOf(id);
  assert.equal(d.status, "pickup_scheduled");
  assert.equal(d.pickup.time_set, true);
  assert.equal(new Date(d.pickup.scheduled_date).toISOString(), new Date(`${istDay(1)}T17:30:00+05:30`).toISOString());
  assert.equal(d.pickup.followup_due_at.getTime() - d.pickup.scheduled_date.getTime(), HANDOVER.FOLLOWUP_AFTER_TIME_MS);
  assert.equal(d.pickup.expires_at.getTime() - d.pickup.followup_due_at.getTime(), HANDOVER.EXPIRE_AFTER_FOLLOWUP_MS);
  assert.match((await systemTexts(id)).at(-1), /handover code/);
});
await test("date-only meetups still work (older clients)", async () => {
  const { id } = await scheduled({ time: "" });
  const d = await dealOf(id);
  assert.equal(d.pickup.time_set, false);
  assert.ok(d.pickup.followup_due_at);
});
await test("a time earlier than now is refused", async () => {
  const t = await mkThread();
  await deals.confirmDeal({ conversationId: t.id, userId: S, amount: 800 });
  await assert.rejects(
    () => deals.schedulePickup({ conversationId: t.id, userId: S, date: istDay(0), time: "00:00", location: "Gate" }),
    /later than now|past/,
  );
});

console.log("\nHandover code");
await test("only the buyer can see the code, and it never leaves the server in a deal payload", async () => {
  const { id } = await scheduled();
  await assert.rejects(() => deals.getHandoverCode({ conversationId: id, userId: S }), /only the buyer/i);
  const { code } = await deals.getHandoverCode({ conversationId: id, userId: Bu });
  assert.match(code, /^\d{4}$/);
  assert.equal((await deals.getHandoverCode({ conversationId: id, userId: Bu })).code, code, "stable across calls");
  const doc = await Deal.findOne({ conversation_id: id });
  for (const view of [doc.toObject(), doc.toJSON(), JSON.parse(JSON.stringify(doc))]) {
    assert.equal(view.handover.nonce, undefined);
    assert.equal(view.handover.issued, true);
    assert.ok(!JSON.stringify(view).includes(code) || !/"code"/.test(JSON.stringify(view)), "no code field");
  }
});
await test("seller entering a code before the buyer opened it gets a clear message", async () => {
  const { id } = await scheduled();
  await assert.rejects(() => deals.verifyHandoverCode({ conversationId: id, userId: S, code: "1234" }), /Show code/);
});
await test("right code completes the deal: sold, sale recorded, method = code", async () => {
  const { id, product } = await scheduled();
  const { code } = await deals.getHandoverCode({ conversationId: id, userId: Bu });
  await assert.rejects(() => deals.verifyHandoverCode({ conversationId: id, userId: Bu, code }), /only the seller/i);
  const done = await deals.verifyHandoverCode({ conversationId: id, userId: S, code });
  assert.equal(done.status, "completed");
  const d = await dealOf(id);
  assert.equal(d.completed_via, "code");
  assert.equal(d.payment_confirmed.is_confirmed, true);
  assert.equal(d.item_received.is_confirmed, true);
  assert.equal(d.sale.sold_price, 800);
  const p = await Product.findById(product._id).lean();
  assert.equal(p.status, "sold");
  assert.equal(p.is_deleted, true);
  assert.match((await systemTexts(id)).at(-1), /code verified/i);
  const again = await deals.verifyHandoverCode({ conversationId: id, userId: S, code });
  assert.equal(again.status, "completed", "repeat is harmless");
});
await test("wrong codes count down, then lock entry for 15 minutes (even for the right code)", async () => {
  const { id } = await scheduled();
  const { code } = await deals.getHandoverCode({ conversationId: id, userId: Bu });
  const bad = wrongCode(code);
  for (let left = HANDOVER.MAX_ATTEMPTS - 1; left >= 1; left--) {
    await assert.rejects(() => deals.verifyHandoverCode({ conversationId: id, userId: S, code: bad }), new RegExp(`${left} tr(y|ies) left`));
  }
  await assert.rejects(() => deals.verifyHandoverCode({ conversationId: id, userId: S, code: bad }), /paused until/);
  await assert.rejects(() => deals.verifyHandoverCode({ conversationId: id, userId: S, code }), /Too many wrong codes/);
  assert.equal((await dealOf(id)).status, "pickup_scheduled");
  // Lock passes: the right code works and attempts were reset.
  await Deal.updateOne({ conversation_id: id }, { $set: { "handover.locked_until": new Date(Date.now() - 1000) } });
  assert.equal((await deals.verifyHandoverCode({ conversationId: id, userId: S, code })).status, "completed");
});
await test("malformed codes are rejected without using a try", async () => {
  const { id } = await scheduled();
  await deals.getHandoverCode({ conversationId: id, userId: Bu });
  await assert.rejects(() => deals.verifyHandoverCode({ conversationId: id, userId: S, code: "12a4" }), /4-digit/);
  assert.equal((await dealOf(id)).handover.attempts, 0);
});
await test("met without scheduling: the code works straight from 'deal confirmed'", async () => {
  const t = await mkThread();
  await deals.confirmDeal({ conversationId: t.id, userId: S, amount: 700 });
  const { code } = await deals.getHandoverCode({ conversationId: t.id, userId: Bu });
  assert.equal((await deals.verifyHandoverCode({ conversationId: t.id, userId: S, code })).status, "completed");
});
await test("two devices entering the right code at once complete it exactly once", async () => {
  const { id } = await scheduled();
  const { code } = await deals.getHandoverCode({ conversationId: id, userId: Bu });
  const results = await Promise.all([1, 2, 3].map(() => deals.verifyHandoverCode({ conversationId: id, userId: S, code })));
  assert.ok(results.every((r) => r.status === "completed"));
  const doneMsgs = (await systemTexts(id)).filter((t) => /Deal done/.test(t));
  assert.equal(doneMsgs.length, 1);
});

console.log("\nMark as done");
await test("one side marks done, the other confirms: completes (both_confirmed)", async () => {
  const { id } = await scheduled();
  const d1 = await deals.markDealDone({ conversationId: id, userId: S });
  assert.equal(d1.done_request.role, "seller");
  assert.equal(d1.done_request.auto_complete_at.getTime() - d1.done_request.at.getTime(), HANDOVER.AUTO_COMPLETE_MS);
  const again = await deals.markDealDone({ conversationId: id, userId: S });
  assert.equal(again.status, "pickup_scheduled", "repeat by the same side just waits");
  const d2 = await deals.markDealDone({ conversationId: id, userId: Bu });
  assert.equal(d2.status, "completed");
  assert.equal((await dealOf(id)).completed_via, "both_confirmed");
  assert.equal((await dealOf(id)).done_request, undefined);
});
await test("both tapping at the same moment completes once", async () => {
  const { id } = await scheduled();
  await Promise.all([deals.markDealDone({ conversationId: id, userId: S }), deals.markDealDone({ conversationId: id, userId: Bu })]);
  // Either both requests met (completed) or one waits; a follow-up tap finishes it.
  let d = await dealOf(id);
  if (d.status !== "completed") {
    await deals.markDealDone({ conversationId: id, userId: d.done_request.role === "seller" ? Bu : S });
    d = await dealOf(id);
  }
  assert.equal(d.status, "completed");
  assert.equal((await systemTexts(id)).filter((t) => /Deal done/.test(t)).length, 1);
});
await test("'There's a problem' clears it with the reason; the requester can also take it back", async () => {
  const { id } = await scheduled();
  await deals.markDealDone({ conversationId: id, userId: Bu });
  const cleared = await deals.clearDoneRequest({ conversationId: id, userId: S, reason: "Haven't been paid yet" });
  assert.equal(cleared.done_request?.at, undefined);
  assert.match((await systemTexts(id)).at(-1), /problem: "Haven't been paid yet"/);
  await deals.markDealDone({ conversationId: id, userId: Bu });
  await deals.clearDoneRequest({ conversationId: id, userId: Bu });
  assert.match((await systemTexts(id)).at(-1), /took back/);
  assert.equal((await dealOf(id)).status, "pickup_scheduled");
});
await test("legacy: after the seller confirmed payment, the buyer's 'done' completes it", async () => {
  const { id } = await scheduled();
  await deals.confirmPayment({ conversationId: id, userId: S });
  assert.equal((await deals.markDealDone({ conversationId: id, userId: Bu })).status, "completed");
});
await test("legacy two-button flow still completes (method = legacy)", async () => {
  const { id } = await scheduled();
  await deals.confirmPayment({ conversationId: id, userId: S });
  await deals.confirmItemReceived({ conversationId: id, userId: Bu });
  assert.equal((await dealOf(id)).completed_via, "legacy");
});
await test("rescheduling clears a pending 'done' and the code lockout, keeps the code", async () => {
  const { id } = await scheduled();
  const { code } = await deals.getHandoverCode({ conversationId: id, userId: Bu });
  await deals.markDealDone({ conversationId: id, userId: S });
  await Deal.updateOne({ conversation_id: id }, { $set: { "handover.locked_until": new Date(Date.now() + 6e5), "handover.attempts": 3 } });
  await deals.schedulePickup({ conversationId: id, userId: S, date: istDay(2), time: "12:00", location: "Canteen" });
  const d = await dealOf(id);
  assert.equal(d.done_request?.at, undefined);
  assert.equal(d.handover.attempts, 0);
  assert.equal(d.handover.locked_until, undefined);
  assert.equal((await deals.getHandoverCode({ conversationId: id, userId: Bu })).code, code);
  assert.match((await systemTexts(id)).at(-1), /Pickup moved to/);
});
await test("undoing the pickup clears a pending 'done'", async () => {
  const { id } = await scheduled();
  await deals.markDealDone({ conversationId: id, userId: S });
  await deals.revertDealStage({ conversationId: id, userId: S });
  const d = await dealOf(id);
  assert.equal(d.status, "deal_confirmed");
  assert.equal(d.done_request?.at, undefined);
});
await test("nothing to finish while still negotiating", async () => {
  const t = await mkThread();
  await deals.ensureDeal(await Conversation.findById(t.id));
  await assert.rejects(() => deals.markDealDone({ conversationId: t.id, userId: S }), /isn't ready/);
  await assert.rejects(() => deals.getHandoverCode({ conversationId: t.id, userId: Bu }), /once the deal is confirmed/);
});

console.log("\nNo-show");
await test("can't report a no-show before the meetup", async () => {
  const { id } = await scheduled({ days: 2 });
  await assert.rejects(() => deals.reportNoShow({ conversationId: id, userId: Bu }), /after the meetup time/);
});
await test("after the meetup: cancels, records who reported, frees the item", async () => {
  const { id } = await scheduled();
  await Deal.updateOne({ conversation_id: id }, { $set: { "pickup.scheduled_date": new Date(Date.now() - 2 * 36e5) } });
  const d = await deals.reportNoShow({ conversationId: id, userId: Bu });
  assert.equal(d.status, "cancelled");
  const raw = await dealOf(id);
  assert.equal(raw.no_show.reporter_role, "buyer");
  assert.match(raw.cancellation_reason, /No-show/);
  assert.match((await systemTexts(id)).at(-1), /didn't show up/);
});

console.log("\nFollow-up job");
const past = (ms) => new Date(Date.now() - ms);
await test("unanswered 'mark as done' auto-completes after 48h", async () => {
  const { id } = await scheduled();
  await deals.markDealDone({ conversationId: id, userId: S });
  await Deal.updateOne({ conversation_id: id }, { $set: { "done_request.auto_complete_at": past(1000) } });
  const r = await deals.runHandoverFollowups();
  assert.ok(r.autoCompleted >= 1);
  const d = await dealOf(id);
  assert.equal(d.status, "completed");
  assert.equal(d.completed_via, "auto");
});
await test("overdue meetup: 'did you meet?' is sent exactly once", async () => {
  const { id } = await scheduled();
  await Deal.updateOne({ conversation_id: id }, { $set: { "pickup.followup_due_at": past(1000) } });
  await deals.runHandoverFollowups();
  await deals.runHandoverFollowups();
  assert.equal((await systemTexts(id)).filter((t) => /Did you meet up/.test(t)).length, 1);
  assert.ok((await dealOf(id)).followup_sent_at);
});
await test("stale reservation ends; a deal the seller marked paid completes instead", async () => {
  const a = await scheduled();
  const b = await scheduled();
  await deals.confirmPayment({ conversationId: b.id, userId: S });
  await Deal.updateMany({ conversation_id: { $in: [a.id, b.id] } }, { $set: { "pickup.expires_at": past(1000), followup_sent_at: past(1000) } });
  await deals.runHandoverFollowups();
  assert.equal((await dealOf(a.id)).status, "cancelled");
  assert.match((await systemTexts(a.id)).at(-1), /reservation has ended/);
  assert.equal((await dealOf(b.id)).status, "completed");
});
await test("a pending 'mark as done' is never expired out from under them", async () => {
  const { id } = await scheduled();
  await deals.markDealDone({ conversationId: id, userId: Bu });
  await Deal.updateOne({ conversation_id: id }, { $set: { "pickup.expires_at": past(1000) } });
  await deals.runHandoverFollowups();
  assert.equal((await dealOf(id)).status, "pickup_scheduled");
});
await test("deals scheduled before this release get timers no earlier than now", async () => {
  const { id } = await scheduled();
  await Deal.updateOne({ conversation_id: id }, {
    $set: { "pickup.scheduled_date": past(60 * 864e5) },
    $unset: { "pickup.followup_due_at": "", "pickup.expires_at": "", "pickup.time_set": "" },
  });
  const before = Date.now();
  const r = await deals.runHandoverFollowups();
  assert.ok(r.backfilled >= 1);
  const d = await dealOf(id);
  assert.ok(d.pickup.expires_at.getTime() >= before + HANDOVER.EXPIRE_AFTER_FOLLOWUP_MS - 1000, "a full week from now");
  assert.notEqual(d.status, "cancelled");
});
await test("a quiet tick touches nothing", async () => {
  const r = await deals.runHandoverFollowups();
  assert.deepEqual(r, { backfilled: 0, autoCompleted: 0, followups: 0, expired: 0, failed: 0 });
});
await test("job queries use indexes", async () => {
  const plan = (e) => JSON.stringify(e.queryPlanner.winningPlan);
  const now = new Date();
  for (const q of [
    { "done_request.auto_complete_at": { $lte: now }, status: { $in: ["pickup_scheduled"] } },
    { status: { $in: ["pickup_scheduled", "payment_confirmed"] }, "pickup.expires_at": { $lte: now }, "done_request.at": null },
    { status: { $in: ["pickup_scheduled", "payment_confirmed"] }, "pickup.followup_due_at": { $lte: now }, followup_sent_at: null },
  ]) {
    assert.doesNotMatch(plan(await Deal.find(q).explain()), /COLLSCAN/);
  }
});

await mongoose.disconnect();
await mongod.stop();
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
