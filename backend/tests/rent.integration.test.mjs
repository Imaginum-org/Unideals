// Run: node tests/rent.integration.test.mjs
// Rent & Borrow end to end: post rules, lend + share flows, one-winner
// accepts, block alerts with throttling, report auto-hide, sweeps, the
// RENT_ENABLED kill switch and the staff routes over HTTP.
import assert from "node:assert/strict";
import http from "node:http";
import { MongoMemoryServer } from "mongodb-memory-server";

const B = new URL("../", import.meta.url).href;
const ORIGIN = "http://localhost:5173";
Object.assign(process.env, {
  IMAGEKIT_URL_ENDPOINT: "",
  SECRET_KEY_ACCESS_TOKEN: "rent-test",
  SECRET_KEY_REFRESH_TOKEN: "rent-refresh",
  NODE_ENV: "test",
  FRONTEND_URL: ORIGIN,
  ADMIN_FRONTEND_URL: "http://localhost:5174",
  RENT_ENABLED: "true",
});

const mongod = await MongoMemoryServer.create();
const { default: mongoose } = await import(B + "node_modules/mongoose/index.js");
await mongoose.connect(mongod.getUri());
const { default: jwt } = await import(B + "node_modules/jsonwebtoken/index.js");
const { default: app } = await import(B + "src/app.js");
const { default: User } = await import(B + "src/models/User.model.js");
const { default: Campus } = await import(B + "src/models/Campus.model.js");
const { default: Notification } = await import(B + "src/models/Notification.model.js");
const { default: AuditLog } = await import(B + "src/models/AuditLog.model.js");
const { default: RentPost } = await import(B + "src/models/RentPost.model.js");
const { default: RentBooking } = await import(B + "src/models/RentBooking.model.js");
const { default: RentProfile } = await import(B + "src/models/RentProfile.model.js");
const { default: RentCampusConfig } = await import(B + "src/models/RentCampusConfig.model.js");
await Promise.all([RentPost.init(), RentBooking.init(), RentProfile.init(), RentCampusConfig.init(), Notification.init()]);
const { default: Conversation } = await import(B + "src/models/conversation.model.js");
const { default: Message } = await import(B + "src/models/message.model.js");
const conversations = await import(B + "src/services/conversation.service.js");
const deals = await import(B + "src/services/deal.service.js");
const rent = await import(B + "src/services/rent.service.js");
const bookings = await import(B + "src/services/rentBooking.service.js");

let passed = 0;
let failed = 0;
const test = async (name, fn) => {
  try {
    await fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failed++;
    console.log(`  ✗ ${name}\n    ${String(err.stack || err.message).split("\n").slice(0, 4).join("\n    ")}`);
  }
};
const rejects = async (promise, code) => {
  try {
    await promise;
  } catch (err) {
    if (code) assert.equal(err.code, code, `expected ${code}, got ${err.code}: ${err.message}`);
    return err;
  }
  throw new Error(`expected rejection${code ? ` (${code})` : ""}`);
};
const waitFor = async (check, ms = 2000) => {
  const until = Date.now() + ms;
  while (Date.now() < until) {
    if (await check()) return true;
    await new Promise((r) => setTimeout(r, 25));
  }
  return false;
};

const oid = () => new mongoose.Types.ObjectId();
const now = new Date();
const campusA = oid();
const campusB = oid();
await Campus.collection.insertMany([
  { _id: campusA, name: "Alpha Institute", slug: "alpha", short_name: "AI", is_active: true, createdAt: now },
  { _id: campusB, name: "Beta College", slug: "beta", short_name: "BC", is_active: true, createdAt: now },
]);
await RentCampusConfig.create({ campus_id: campusA, blocks: ["Block A", "Block B", "Block C"] });

let n = 0;
const mkUser = async ({ campus = campusA, role = "user", name } = {}) => {
  const _id = oid();
  n++;
  const doc = {
    _id,
    name: name || `Student${n} Test`,
    email: `s${n}@t.edu`,
    role,
    status: "active",
    tokenVersion: 0,
    is_email_verified: true,
    campus_id: campus,
    gender: "male",
    createdAt: now,
  };
  await User.collection.insertOne(doc);
  return { ...doc, token: jwt.sign({ id: String(_id), v: 0 }, process.env.SECRET_KEY_ACCESS_TOKEN, { expiresIn: "15m" }) };
};

const offer = (over = {}) => ({
  kind: "offer",
  mode: "lend",
  title: "Yonex badminton racket",
  category: "sports",
  price: { amount: 30, unit: "day" },
  block: "Block C",
  ...over,
});

const asha = await mkUser({ name: "Asha Rao" }); // lender, Block C
const ravi = await mkUser({ name: "Ravi K" }); // borrower, Block C
const meera = await mkUser({ name: "Meera S" }); // another borrower
const dev = await mkUser({ name: "Dev P" }); // Block A
const bina = await mkUser({ campus: campusB, name: "Bina B" }); // other campus
await rent.updateMyProfile(ravi, { block: "block c" }); // case-insensitive match
await rent.updateMyProfile(meera, { block: "Block C" });
await rent.updateMyProfile(dev, { block: "Block A" });

console.log("rent: posts");

await test("profile block snaps to the campus list; unknown blocks are rejected", async () => {
  const profile = await rent.getMyProfile(ravi);
  assert.equal(profile.block, "Block C");
  assert.equal(profile.alerts, true);
  await rejects(rent.updateMyProfile(ravi, { block: "Block Z" }), "INVALID_BLOCK");
});

await test("public posts reject phone/room numbers and banned items", async () => {
  await rejects(rent.createPost(asha, offer({ title: "Iron, call 9876543210" })), "RENT_UNSAFE_TEXT");
  await rejects(rent.createPost(asha, offer({ title: "Kettle", description: "Come to room 204" })), "RENT_UNSAFE_TEXT");
  await rejects(rent.createPost(asha, offer({ title: "Cold beer" })), "RENT_BANNED_ITEM");
  // "room heater" is a fine item name.
  const ok = await rent.createPost(asha, offer({ title: "Room heater", category: "appliances", price: { amount: 20, unit: "hour" } }));
  assert.equal(ok.title, "Room heater");
  await rent.deletePost(asha, ok.id);
});

await test("price units follow the mode; free normalises to 0", async () => {
  await rejects(rent.createPost(asha, offer({ mode: "share", price: { amount: 15, unit: "day" } })), "INVALID_PRICE_UNIT");
  const free = await rent.createPost(asha, offer({ title: "Spare shuttlecock", price: { amount: 0, unit: "day" } }));
  assert.deepEqual(free.price, { amount: 0, unit: "free" });
  await rent.deletePost(asha, free.id);
});

await test("block is required on a campus with a block list (falls back to the profile block)", async () => {
  const fresh = await mkUser({ name: "Fresh" });
  await rejects(rent.createPost(fresh, offer({ block: undefined })), "BLOCK_REQUIRED");
  // Asha's first post saved Block C on her profile, so she can skip it now.
  const post = await rent.createPost(asha, offer({ title: "Shuttle tube", block: undefined }));
  assert.equal(post.block, "Block C");
  await rent.deletePost(asha, post.id);
});

await test("offers keep condition, availability and handover details; requests drop the offer-only ones", async () => {
  const kiran = await mkUser({ name: "Noor L" });
  // Alerts off, so the same-block alert tests below keep their counts.
  await rent.updateMyProfile(kiran, { block: "Block B", alerts: false });
  const mine = (over) => offer({ block: "Block B", ...over });
  const until = new Date(Date.now() + 3 * 24 * 3600 * 1000);
  const handover = { spot: "Block B lobby", timing: "Evenings", return_policy: "Return it clean", notes: "Ping me first" };

  const lent = await rent.createPost(kiran, mine({ title: "Steam iron", category: "appliances", condition: "good", available_until: until, handover }));
  assert.equal(lent.condition, "good");
  assert.equal(new Date(lent.availableUntil).getTime(), until.getTime());
  assert.deepEqual(lent.handover, { spot: "Block B lobby", timing: "Evenings", returnPolicy: "Return it clean", notes: "Ping me first" });

  // Give-aways don't come back, so there's no return policy.
  const given = await rent.createPost(kiran, mine({ mode: "share", title: "Maggie packets", category: "food", price: { amount: 0, unit: "free" }, handover }));
  assert.equal(given.handover.returnPolicy, "");

  // Requests never carry a condition or an end date.
  const asked = await rent.createPost(kiran, { ...mine({ kind: "request", title: "Need a ladle", category: "kitchen", condition: "new", available_until: until }), handover: { spot: "Mess" } });
  assert.equal(asked.condition, null);
  assert.equal(asked.availableUntil, null);
  assert.equal(asked.handover.spot, "Mess");

  // Partial handover edits keep the other fields; clearing the date works.
  const edited = await rent.updatePost(kiran, lent.id, { handover: { timing: "After 9 PM" }, available_until: null, condition: "like_new" });
  assert.equal(edited.handover.timing, "After 9 PM");
  assert.equal(edited.handover.spot, "Block B lobby");
  assert.equal(edited.availableUntil, null);
  assert.equal(edited.condition, "like_new");

  // Handover text is public, so it's screened like the title.
  await rejects(rent.updatePost(kiran, lent.id, { handover: { spot: "Room 204" } }), "RENT_UNSAFE_TEXT");
  await rejects(rent.updatePost(kiran, lent.id, { available_until: new Date(Date.now() - 1000) }), "INVALID_AVAILABLE_UNTIL");
  await rejects(rent.updatePost(kiran, lent.id, { available_until: new Date(Date.now() + 91 * 24 * 3600 * 1000) }), "INVALID_AVAILABLE_UNTIL");

  for (const id of [lent.id, given.id, asked.id]) await rent.deletePost(kiran, id);
});

await test("open request limit per user", async () => {
  const ids = [];
  for (let i = 0; i < 3; i++) {
    ids.push((await rent.createPost(dev, { kind: "request", mode: "lend", title: `Need thing ${i}`, category: "other", price: { amount: 0, unit: "free" } })).id);
  }
  await rejects(
    rent.createPost(dev, { kind: "request", mode: "lend", title: "Need thing 4", category: "other", price: { amount: 0, unit: "free" } }),
    "RENT_POST_LIMIT",
  );
  for (const id of ids) await rent.deletePost(dev, id);
});

await test("board is campus-scoped and shows my block first", async () => {
  await rent.createPost(dev, offer({ title: "Cricket bat", block: "Block A" }));
  await rent.createPost(asha, offer({ title: "Football" }));
  const forRavi = await rent.listPosts(ravi, { kind: "offer" });
  assert.equal(forRavi.myBlock, "Block C");
  assert.equal(forRavi.items[0].block, "Block C", "same block first");
  assert.ok(forRavi.items.some((p) => p.block === "Block A"), "other blocks still listed");
  const onlyA = await rent.listPosts(ravi, { kind: "offer", block: "Block A" });
  assert.ok(onlyA.items.every((p) => p.block === "Block A"));
  const otherCampus = await rent.listPosts(bina, { kind: "offer" });
  assert.equal(otherCampus.items.length, 0);
  const post = forRavi.items[0];
  await rejects(rent.getPost(bina, post.id), "RENT_POST_NOT_FOUND");
});

console.log("rent: lend flow");

let racket;
await test("lend: request → accept → handover → return, with stats and ratings", async () => {
  racket = await rent.createPost(asha, offer({ deposit: 200 }));
  const returnBy = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000 - 60 * 1000);
  const b = await bookings.createBooking(ravi, racket.id, { note: "For tonight's game", return_by: returnBy });
  assert.equal(b.status, "pending");
  assert.equal(b.role, "borrower");
  assert.equal(b.agreedPrice, 60, "₹30/day × 2 days");
  assert.deepEqual(b.actions, ["cancel", "message"]);

  await rejects(bookings.createBooking(ravi, racket.id, {}), "RENT_BOOKING_EXISTS");
  await rejects(bookings.acceptBooking(ravi, b.id), "RENT_BOOKING_STALE"); // participant, but not the owner

  const accepted = await bookings.acceptBooking(asha, b.id);
  assert.equal(accepted.status, "accepted");
  assert.ok(accepted.actions.includes("handover"));
  assert.equal((await RentPost.findById(racket.id).lean()).status, "lent_out");

  const active = await bookings.confirmHandover(asha, b.id);
  assert.equal(active.status, "active");
  await rejects(bookings.confirmReturn(ravi, b.id), "RENT_BOOKING_STALE"); // only the lender confirms

  const done = await bookings.confirmReturn(asha, b.id);
  assert.equal(done.status, "completed");
  assert.equal((await RentPost.findById(racket.id).lean()).status, "active", "available again");

  await bookings.rateBooking(ravi, b.id, 5);
  await rejects(bookings.rateBooking(ravi, b.id, 4), "RENT_ALREADY_RATED");
  await bookings.rateBooking(asha, b.id, 4);

  const ashaProfile = await rent.getMyProfile(asha);
  assert.equal(ashaProfile.stats.lent, 1);
  assert.equal(ashaProfile.stats.earnedTotal, 60);
  assert.equal(ashaProfile.stats.rating, 5);
  assert.equal((await rent.getMyProfile(ravi)).stats.borrowed, 1);
});

await test("accepting one booking declines the others; cancelling before handover frees the item", async () => {
  const b1 = await bookings.createBooking(ravi, racket.id, {});
  const b2 = await bookings.createBooking(meera, racket.id, {});
  await bookings.acceptBooking(asha, b2.id);
  assert.equal((await RentBooking.findById(b1.id).lean()).status, "declined");
  await rejects(bookings.createBooking(ravi, racket.id, {}), "RENT_POST_UNAVAILABLE");
  await rejects(rent.deletePost(asha, racket.id), "RENT_POST_BUSY");

  await bookings.cancelBooking(meera, b2.id, "Plans changed");
  assert.equal((await RentPost.findById(racket.id).lean()).status, "active");
  await rejects(bookings.confirmHandover(asha, b2.id), "RENT_BOOKING_STALE");
});

await test("strangers can't see or act on a booking", async () => {
  const b = await bookings.createBooking(ravi, racket.id, {});
  await rejects(bookings.getBooking(dev, b.id), "RENT_BOOKING_NOT_FOUND");
  await rejects(bookings.acceptBooking(dev, b.id), "RENT_BOOKING_NOT_FOUND");
  await rejects(bookings.addMessage(dev, b.id, "hi"), "RENT_BOOKING_NOT_FOUND");
  await bookings.declineBooking(asha, b.id);
});

await test("booking chat lives in the main inbox: request + note, events, messages, no deals", async () => {
  const kabir = await mkUser({ name: "Kabir T" }); // fresh borrower, fresh thread
  await rent.updateMyProfile(kabir, { block: "Block C", alerts: false });
  const b = await bookings.createBooking(kabir, racket.id, { note: "Need it for Saturday" });
  assert.ok(b.conversationId, "booking points at its chat thread");
  const conv = await Conversation.findById(b.conversationId).lean();
  assert.equal(conv.context, "rent");
  assert.equal(String(conv.rent_booking_id), b.id);
  assert.equal(String(conv.buyer_id), String(kabir._id), "borrower is the buyer side");
  assert.equal(String(conv.seller_id), String(asha._id), "lender is the seller side");

  // Opens with a system line + the note, so it shows in both inboxes.
  let msgs = await Message.find({ conversation_id: conv._id }).sort({ _id: 1 }).lean();
  assert.deepEqual(msgs.map((m) => m.message_type), ["system", "text"]);
  assert.match(msgs[0].text, /asked to borrow/);
  assert.equal(msgs[1].text, "Need it for Saturday");

  // Typed messages go through the normal chat pipeline (screened, unread counts).
  const sent = await bookings.addMessage(asha, b.id, "Coming in 5");
  assert.equal(sent.conversationId, b.conversationId);
  await rejects(bookings.addMessage(dev, b.id, "hi"), "RENT_BOOKING_NOT_FOUND");
  await bookings.acceptBooking(asha, b.id);
  msgs = await Message.find({ conversation_id: conv._id }).sort({ _id: 1 }).lean();
  assert.equal(msgs.length, 4);
  assert.match(msgs[3].text, /accepted/);

  // Inbox rows: tagged rent, no deal card; the Rent tab filters to them.
  const asLender = await conversations.getUserConversations({ userId: asha._id, role: "rent" });
  const row = asLender.data.find((r) => String(r._id) === b.conversationId);
  assert.ok(row, "shows under the Rent tab");
  assert.equal(row.context, "rent");
  assert.equal(row.dealStatus, null);
  assert.equal(row.rentBookingId, b.id);
  assert.equal(row.role, "selling");

  // Deals never attach to rent threads.
  await assert.rejects(deals.getDealForConversation({ conversationId: b.conversationId, userId: kabir._id }), /deals/i);

  // Booking again later reuses the same thread.
  await bookings.cancelBooking(kabir, b.id);
  const again = await bookings.createBooking(kabir, racket.id, {});
  assert.equal(again.conversationId, b.conversationId);
  await bookings.cancelBooking(kabir, again.id);
});

console.log("rent: share + requests");

const sana = await mkUser({ name: "Sana M" }); // Block C sharer
await rent.updateMyProfile(sana, { block: "Block C" });

await test("share: quantity goes down per handover; sold out → fulfilled", async () => {
  const maggie = await rent.createPost(sana, offer({ mode: "share", title: "Maggie packet", category: "food", price: { amount: 15, unit: "item" }, quantity: 3 }));
  const b1 = await bookings.createBooking(ravi, maggie.id, { quantity: 2 });
  assert.equal(b1.agreedPrice, 30);
  await bookings.acceptBooking(sana, b1.id);
  assert.equal((await RentPost.findById(maggie.id).lean()).quantity, 1);
  const done = await bookings.confirmHandover(sana, b1.id);
  assert.equal(done.status, "completed", "share completes on handover");

  const b2 = await bookings.createBooking(meera, maggie.id, { quantity: 5 });
  assert.equal(b2.quantity, 1, "clamped to what's left");
  await bookings.acceptBooking(sana, b2.id);
  assert.equal((await RentPost.findById(maggie.id).lean()).status, "fulfilled");
  assert.equal((await rent.getMyProfile(sana)).stats.shared, 1);
});

await test("request: helper offers, owner accepts → request fulfilled; alerts go to same block only", async () => {
  await rent.updateMyProfile(meera, { alerts: false });
  const req = await rent.createPost(ravi, {
    kind: "request",
    mode: "lend",
    title: "Need an iron",
    category: "appliances",
    price: { amount: 20, unit: "use" },
  });
  assert.equal(req.block, "Block C");
  assert.ok(new Date(req.neededBy) > new Date(), "default needed-by in the future");

  const alerted = await waitFor(async () => (await Notification.countDocuments({ group_key: `rent_alert:${req.id}` })) > 0);
  assert.ok(alerted, "alert sent");
  const recipients = (await Notification.find({ group_key: `rent_alert:${req.id}` }).lean()).map((x) => String(x.recipient_id)).sort();
  assert.deepEqual(recipients, [String(asha._id), String(sana._id)].sort(), "Block C, alerts on, not the poster (Meera opted out, Dev is Block A)");

  const help = await bookings.createBooking(asha, req.id, { price: 15 });
  assert.equal(help.role, "lender");
  assert.equal(help.agreedPrice, 15, "helper's quote");
  await rejects(bookings.acceptBooking(asha, help.id), "RENT_BOOKING_STALE"); // helper can't accept their own offer
  await bookings.acceptBooking(ravi, help.id);
  assert.equal((await RentPost.findById(req.id).lean()).status, "fulfilled");
  const handed = await bookings.confirmHandover(asha, help.id);
  assert.equal(handed.status, "active");
});

await test("block alerts are capped per person per hour", async () => {
  const lonely = await mkUser({ name: "Kiran" });
  await rent.updateMyProfile(lonely, { block: "Block B" });
  const poster = await mkUser({ name: "Poster" });
  await Notification.insertMany(
    Array.from({ length: 6 }, (_, i) => ({
      title: "x",
      message: "x",
      type: "rent",
      is_broadcast: false,
      recipient_id: lonely._id,
      group_key: `rent_alert:old${i}`,
      status: "sent",
      sent_at: new Date(),
    })),
  );
  const post = await RentPost.create({
    owner_id: poster._id,
    campus_id: campusA,
    kind: "request",
    mode: "lend",
    title: "Need a stapler",
    category: "study",
    block: "Block B",
    needed_by: new Date(Date.now() + 3600 * 1000),
  });
  assert.equal(await rent.alertBlockForRequest(post, poster), 0);
});

console.log("rent: moderation + sweeps");

await test("three reports hide a post; owner can't report their own", async () => {
  const post = await rent.createPost(dev, offer({ title: "Table tennis bat", block: "Block A" }));
  await rejects(rent.reportPost(dev, post.id), "RENT_SELF_REPORT");
  await rent.reportPost(asha, post.id, "spam");
  await rejects(rent.reportPost(asha, post.id), "RENT_ALREADY_REPORTED");
  await rent.reportPost(ravi, post.id);
  const third = await rent.reportPost(meera, post.id);
  assert.equal(third.hidden, true);
  await rejects(rent.getPost(ravi, post.id), "RENT_POST_NOT_FOUND");
  assert.equal((await rent.getPost(dev, post.id)).status, "hidden", "owner still sees it");
});

await test("sweep expires old requests + unanswered bookings and nudges overdue borrowers once", async () => {
  const late = await RentPost.create({
    owner_id: meera._id,
    campus_id: campusA,
    kind: "request",
    mode: "lend",
    title: "Need a ladle",
    category: "kitchen",
    block: "Block C",
    needed_by: new Date(Date.now() - 1000),
  });
  const kettle = await rent.createPost(sana, offer({ title: "Electric kettle", category: "appliances", price: { amount: 10, unit: "hour" } }));
  const stale = await bookings.createBooking(meera, kettle.id, {});
  // createdAt is immutable through Mongoose; age it with the raw driver.
  await RentBooking.collection.updateOne({ _id: new mongoose.Types.ObjectId(stale.id) }, { $set: { createdAt: new Date(Date.now() - 13 * 3600 * 1000) } });

  const lend = await bookings.createBooking(dev, racket.id, {});
  await bookings.acceptBooking(asha, lend.id);
  await bookings.confirmHandover(asha, lend.id);
  await RentBooking.updateOne({ _id: lend.id }, { $set: { return_by: new Date(Date.now() - 1000) } });

  // An offer whose "available until" has passed (written raw: the API refuses past dates).
  const ended = await RentPost.create({
    owner_id: sana._id,
    campus_id: campusA,
    kind: "offer",
    mode: "lend",
    title: "Old table lamp",
    category: "appliances",
    block: "Block C",
    available_until: new Date(Date.now() - 1000),
  });
  await rejects(bookings.createBooking(meera, String(ended._id), {}), "RENT_POST_EXPIRED");

  const first = await bookings.sweepRent();
  assert.equal(first.expiredRequests, 1);
  assert.equal(first.expiredOffers, 1);
  assert.equal(first.expiredBookings, 1);
  assert.equal(first.overdueReminders, 1);
  assert.equal((await RentPost.findById(ended._id).lean()).status, "expired");
  assert.equal((await RentPost.findById(late._id).lean()).status, "expired");
  assert.equal((await RentBooking.findById(stale.id).lean()).status, "expired");
  assert.equal((await bookings.getBooking(dev, lend.id)).overdue, true);

  const second = await bookings.sweepRent();
  assert.equal(second.overdueReminders, 0, "only one reminder");
  await bookings.confirmReturn(asha, lend.id);
});

await test("account deletion purges rent data and frees items they held", async () => {
  const leaver = await mkUser({ name: "Leaver" });
  const lamp = await rent.createPost(sana, offer({ title: "Study lamp", category: "study", price: { amount: 10, unit: "day" } }));
  const held = await bookings.createBooking(leaver, lamp.id, {});
  await bookings.acceptBooking(sana, held.id);
  await rent.createPost(leaver, offer({ title: "Leaver's kettle", category: "appliances", price: { amount: 5, unit: "hour" } }));
  const result = await bookings.purgeRentDataForUser(leaver._id);
  assert.deepEqual(result, { posts: 1, released: 1 });
  assert.equal((await RentPost.findById(lamp.id).lean()).status, "active", "lamp back on the board");
  assert.equal(await RentPost.countDocuments({ owner_id: leaver._id }), 0);
  assert.equal(await RentBooking.countDocuments({ $or: [{ lender_id: leaver._id }, { borrower_id: leaver._id }] }), 0);
});

console.log("rent: HTTP + kill switch");

const server = http.createServer(app);
await new Promise((resolve) => server.listen(0, resolve));
const base = `http://127.0.0.1:${server.address().port}/api`;
const call = async (who, method, path, body, origin = ORIGIN) => {
  const response = await fetch(base + path, {
    method,
    headers: { ...(who ? { Cookie: `accessToken=${who.token}` } : {}), Origin: origin, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: response.status, body: await response.json().catch(() => ({})) };
};

const admin = await mkUser({ role: "admin", campus: null, name: "Admin" });
const STAFF = "http://localhost:5174";

await test("enabled: config, board and posting work over HTTP", async () => {
  const config = await call(ravi, "GET", "/rent/config");
  assert.equal(config.status, 200);
  assert.equal(config.body.data.enabled, true);
  assert.deepEqual(config.body.data.blocks, ["Block A", "Block B", "Block C"]);
  assert.equal(config.body.data.profile.block, "Block C");

  assert.equal((await call(ravi, "GET", "/rent/posts?kind=offer")).status, 200);
  const created = await call(ravi, "POST", "/rent/posts", offer({ title: "Carrom board", category: "sports" }));
  assert.equal(created.status, 201);
  const bad = await call(ravi, "POST", "/rent/posts", { ...offer(), owner_id: String(asha._id) });
  assert.equal(bad.status, 400, "unknown keys rejected");
  assert.equal((await call(null, "GET", "/rent/posts")).status, 401);
});

await test("RENT_ENABLED=false hides everything", async () => {
  process.env.RENT_ENABLED = "false";
  try {
    const config = await call(ravi, "GET", "/rent/config");
    assert.equal(config.status, 200);
    assert.deepEqual(config.body.data, { enabled: false });
    const posts = await call(ravi, "GET", "/rent/posts");
    assert.equal(posts.status, 404);
    assert.equal(posts.body.code, "RENT_DISABLED");
    assert.equal((await call(ravi, "POST", "/rent/posts", offer())).status, 404);
    // Staff can still prepare blocks while it's off.
    assert.equal((await call(admin, "GET", "/admin/rent/campuses", null, STAFF)).status, 200);
  } finally {
    process.env.RENT_ENABLED = "true";
  }
});

await test("staff: block list + per-campus switch, audited; students can't call it", async () => {
  assert.equal((await call(ravi, "GET", "/admin/rent/campuses", null, STAFF)).status, 403);

  const list = await call(admin, "GET", "/admin/rent/campuses", null, STAFF);
  assert.equal(list.status, 200);
  assert.equal(list.body.data.campuses.length, 2);

  const saved = await call(admin, "PUT", `/admin/rent/campuses/${campusB}`, { blocks: ["Block X", " block x ", "Block Y"] }, STAFF);
  assert.equal(saved.status, 200);
  assert.deepEqual(saved.body.data.blocks, ["Block X", "Block Y"], "trimmed + de-duplicated");
  assert.equal((await call(bina, "GET", "/rent/config")).body.data.blocks.length, 2);

  await call(admin, "PUT", `/admin/rent/campuses/${campusB}`, { enabled: false }, STAFF);
  assert.equal((await call(bina, "GET", "/rent/config")).body.data.enabled, false);
  assert.equal((await call(bina, "GET", "/rent/posts")).status, 404);
  assert.equal((await call(ravi, "GET", "/rent/posts")).status, 200, "other campus unaffected");
  assert.equal(await AuditLog.countDocuments({ action: "rent.config_update", target_type: "rent" }), 2);
});

await test("staff: reported posts first; hide and restore", async () => {
  const list = await call(admin, "GET", "/admin/rent/posts?reported=1", null, STAFF);
  assert.equal(list.status, 200);
  const hidden = list.body.data[0];
  assert.equal(hidden.status, "hidden");
  assert.equal(hidden.reportCount, 3);

  const restored = await call(admin, "PATCH", `/admin/rent/posts/${hidden.id}`, { action: "restore" }, STAFF);
  assert.equal(restored.status, 200);
  assert.equal(restored.body.data.status, "active");
  assert.equal((await RentPost.findById(hidden.id).lean()).report_count, 0);

  const hide = await call(admin, "PATCH", `/admin/rent/posts/${hidden.id}`, { action: "hide", reason: "test" }, STAFF);
  assert.equal(hide.body.data.status, "hidden");
  assert.equal(await AuditLog.countDocuments({ target_type: "rent", action: { $in: ["rent.hide", "rent.restore"] } }), 2);
});

server.close();
await mongoose.disconnect();
await mongod.stop();
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
