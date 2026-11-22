// Rent & Borrow: posts, profile, campus config and block alerts.
// Bookings live in rentBooking.service.js, staff tools in rentAdmin.service.js.
import mongoose from "mongoose";
import RentPost from "../models/RentPost.model.js";
import RentBooking from "../models/RentBooking.model.js";
import RentProfile from "../models/RentProfile.model.js";
import RentCampusConfig from "../models/RentCampusConfig.model.js";
import User from "../models/User.model.js";
import Notification from "../models/Notification.model.js";
import { USER_STATUS } from "../config/constants.js";
import {
  isRentEnabled,
  RENT_KIND,
  RENT_MODE,
  RENT_PRICE_UNITS,
  RENT_CATEGORIES,
  RENT_POST_STATUS,
  RENT_VISIBLE_STATUSES,
  RENT_BOOKING_STATUS,
  RENT_LIMITS,
  RENT_BANNED_RE,
  RENT_UNSAFE_TEXT_RE,
} from "../config/rent.js";
import { screenText } from "../utils/profanity.js";
import { deleteImageSafely } from "../utils/imagekit.js";
import { resolveRequestCampus } from "./campus.service.js";
import { notifyRent, notifyRentFanout } from "./notification.service.js";

const HOUR = 60 * 60 * 1000;

export const rentError = (statusCode, message, code = null) =>
  Object.assign(new Error(message), { statusCode, ...(code ? { code } : {}) });

const isId = (id) => mongoose.isValidObjectId(id);
const sameId = (a, b) => a != null && b != null && String(a) === String(b);
const escapeRx = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const firstName = (name) => String(name || "Someone").trim().split(/\s+/)[0];

export const requireCampusOf = (user) => {
  const campusId = user?.campus_id?._id || user?.campus_id;
  if (!campusId) throw rentError(400, "Pick your campus first", "CAMPUS_REQUIRED");
  return campusId;
};

// ---- Campus config (cached; staff edits clear it) ----

const CONFIG_TTL_MS = 60 * 1000;
const configCache = new Map();

export const getCampusRentConfig = async (campusId) => {
  const key = String(campusId);
  const hit = configCache.get(key);
  if (hit && Date.now() - hit.at < CONFIG_TTL_MS) return hit.value;
  const doc = await RentCampusConfig.findOne({ campus_id: campusId }).lean();
  const value = { enabled: doc ? doc.enabled !== false : true, blocks: doc?.blocks || [] };
  configCache.set(key, { at: Date.now(), value });
  return value;
};

export const clearRentConfigCache = (campusId = null) => {
  if (campusId) configCache.delete(String(campusId));
  else configCache.clear();
};

/** Express guard: 404 when Rent & Borrow is off (globally or for the caller's campus). Run after `auth`. */
export const requireRentEnabled = async (req, res, next) => {
  const off = () => res.status(404).json({ success: false, code: "RENT_DISABLED", message: "Rent & Borrow isn't available" });
  if (!isRentEnabled()) return off();
  try {
    const campusId = req.user?.campus_id?._id || req.user?.campus_id;
    if (campusId) {
      const config = await getCampusRentConfig(campusId);
      if (!config.enabled) return off();
      req.rentConfig = config;
    }
    return next();
  } catch (error) {
    return next(error);
  }
};

/** A block from the campus list (case-insensitive), or free text when the campus has no list. */
export const resolveBlock = (input, blocks = []) => {
  if (input == null) return null;
  const clean = String(input).trim().replace(/\s+/g, " ").slice(0, RENT_LIMITS.blockLength);
  if (!clean) return null;
  if (!blocks.length) return clean;
  const match = blocks.find((b) => b.toLowerCase() === clean.toLowerCase());
  if (!match) throw rentError(400, "Pick a block from the list", "INVALID_BLOCK");
  return match;
};

// ---- Text and price rules ----

export const assertPublicText = (...texts) => {
  const joined = texts.filter(Boolean).join("\n");
  if (!joined) return;
  if (RENT_BANNED_RE.test(joined)) {
    throw rentError(400, "This item isn't allowed on Rent & Borrow", "RENT_BANNED_ITEM");
  }
  if (RENT_UNSAFE_TEXT_RE.test(joined)) {
    throw rentError(
      400,
      "Don't put phone or room numbers in a public post. Share them in the booking chat.",
      "RENT_UNSAFE_TEXT",
    );
  }
  if (screenText(joined).flagged) {
    throw rentError(400, "Please keep the post respectful", "RENT_TEXT_BLOCKED");
  }
};

const assertImageHost = (images = []) => {
  const endpoint = process.env.IMAGEKIT_URL_ENDPOINT;
  if (!endpoint) return;
  for (const image of images) {
    if (image?.url && !String(image.url).startsWith(endpoint)) {
      throw rentError(400, "Image host not allowed.", "INVALID_IMAGE_HOST");
    }
  }
};

const UNITS_FOR_MODE = {
  [RENT_MODE.LEND]: ["hour", "day", "use", "free"],
  [RENT_MODE.SHARE]: ["item", "free"],
};

export const normalizePrice = (price, mode) => {
  const amount = Math.round(Number(price?.amount) || 0);
  let unit = RENT_PRICE_UNITS.includes(price?.unit) ? price.unit : "free";
  if (amount <= 0 || unit === "free") return { amount: 0, unit: "free" };
  if (!UNITS_FOR_MODE[mode].includes(unit)) {
    throw rentError(
      400,
      mode === RENT_MODE.SHARE ? "Shared items are priced per item" : "Lent items are priced per hour, day or use",
      "INVALID_PRICE_UNIT",
    );
  }
  return { amount, unit };
};

const resolveNeededBy = (value, now = new Date()) => {
  if (value == null) return new Date(now.getTime() + RENT_LIMITS.requestDefaultHours * HOUR);
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw rentError(400, "Invalid 'needed by' time", "INVALID_NEEDED_BY");
  if (date.getTime() < now.getTime() + 10 * 60 * 1000) {
    throw rentError(400, "'Needed by' must be at least 10 minutes from now", "INVALID_NEEDED_BY");
  }
  if (date.getTime() > now.getTime() + RENT_LIMITS.requestMaxHours * HOUR) {
    throw rentError(400, `Requests can stay up for at most ${RENT_LIMITS.requestMaxHours} hours`, "INVALID_NEEDED_BY");
  }
  return date;
};

// Offers: the last moment it can be booked. null = no end date.
const resolveAvailableUntil = (value, now = new Date()) => {
  if (value == null) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw rentError(400, "Invalid 'available until' date", "INVALID_AVAILABLE_UNTIL");
  if (date.getTime() <= now.getTime()) {
    throw rentError(400, "'Available until' must be in the future", "INVALID_AVAILABLE_UNTIL");
  }
  if (date.getTime() > now.getTime() + RENT_LIMITS.availableMaxDays * 24 * HOUR) {
    throw rentError(400, `'Available until' can be at most ${RENT_LIMITS.availableMaxDays} days away`, "INVALID_AVAILABLE_UNTIL");
  }
  return date;
};

// Handover details. Missing keys keep their current value; the return
// policy only applies to lend offers (the item comes back to the poster).
const cleanHandover = (input = {}, post, base = {}) => {
  const pick = (key) => String(input[key] ?? base[key] ?? "").trim();
  const lendOffer = post.kind === RENT_KIND.OFFER && post.mode === RENT_MODE.LEND;
  return {
    spot: pick("spot"),
    timing: pick("timing"),
    return_policy: lendOffer ? pick("return_policy") : "",
    notes: pick("notes"),
  };
};

const handoverTexts = (h) => [h?.spot, h?.timing, h?.return_policy, h?.notes];

// ---- Client shapes ----

const ratingOf = (stats) =>
  stats?.rating_count ? Math.round((stats.rating_sum / stats.rating_count) * 10) / 10 : null;

export const toClientProfile = (profile) => ({
  block: profile?.block || null,
  alerts: profile ? profile.alerts !== false : true,
  isSetUp: Boolean(profile?.block),
  stats: {
    lent: profile?.stats?.lent || 0,
    shared: profile?.stats?.shared || 0,
    borrowed: profile?.stats?.borrowed || 0,
    earnedTotal: profile?.stats?.earned_total || 0,
    rating: ratingOf(profile?.stats),
    ratingCount: profile?.stats?.rating_count || 0,
  },
});

export const toClientPerson = (user, profile = null) =>
  user
    ? {
        id: String(user._id),
        name: user.name || "Student",
        avatar: user.avatar || null,
        rating: ratingOf(profile?.stats),
        ratingCount: profile?.stats?.rating_count || 0,
        lentCount: (profile?.stats?.lent || 0) + (profile?.stats?.shared || 0),
      }
    : null;

export const toClientPost = (post, viewerId = null, extra = {}) => ({
  id: String(post._id),
  kind: post.kind,
  mode: post.mode,
  title: post.title,
  description: post.description || "",
  category: post.category,
  images: (post.images || []).map((img) => ({ url: img.url, fileId: img.fileId || null })),
  price: { amount: post.price?.amount || 0, unit: post.price?.unit || "free" },
  deposit: post.deposit || 0,
  quantity: post.quantity ?? 1,
  block: post.block || null,
  neededBy: post.needed_by || null,
  condition: post.condition || null,
  availableUntil: post.available_until || null,
  handover: {
    spot: post.handover?.spot || "",
    timing: post.handover?.timing || "",
    returnPolicy: post.handover?.return_policy || "",
    notes: post.handover?.notes || "",
  },
  status: post.status,
  lentUntil: post.lent_until || null,
  createdAt: post.createdAt,
  updatedAt: post.updatedAt,
  isMine: sameId(post.owner_id?._id || post.owner_id, viewerId),
  ...extra,
});

// ---- Config + profile ----

export const getRentConfig = async (req) => {
  if (!isRentEnabled()) return { enabled: false };
  let campus;
  try {
    campus = await resolveRequestCampus(req);
  } catch {
    return { enabled: false };
  }
  const config = await getCampusRentConfig(campus._id);
  if (!config.enabled) return { enabled: false };

  let profile = null;
  if (req.user?._id) profile = await RentProfile.findOne({ user_id: req.user._id }).lean();
  return {
    enabled: true,
    campus: { id: String(campus._id), name: campus.name, shortName: campus.short_name },
    blocks: config.blocks,
    categories: RENT_CATEGORIES,
    units: UNITS_FOR_MODE,
    limits: {
      requestDefaultHours: RENT_LIMITS.requestDefaultHours,
      requestMaxHours: RENT_LIMITS.requestMaxHours,
      lendMaxDays: RENT_LIMITS.lendMaxDays,
      maxPrice: RENT_LIMITS.maxPrice,
      maxDeposit: RENT_LIMITS.maxDeposit,
      maxQuantity: RENT_LIMITS.maxQuantity,
      messageLength: RENT_LIMITS.messageLength,
    },
    profile: req.user?._id ? toClientProfile(profile) : null,
  };
};

export const getMyProfile = async (user) => {
  const profile = await RentProfile.findOne({ user_id: user._id }).lean();
  return toClientProfile(profile);
};

export const updateMyProfile = async (user, input, config) => {
  const campusId = requireCampusOf(user);
  const blocks = config?.blocks || (await getCampusRentConfig(campusId)).blocks;
  const $set = { campus_id: campusId };
  if (input.block !== undefined) $set.block = resolveBlock(input.block, blocks);
  if (input.alerts !== undefined) $set.alerts = Boolean(input.alerts);
  const profile = await RentProfile.findOneAndUpdate(
    { user_id: user._id },
    { $set },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
  ).lean();
  return toClientProfile(profile);
};

// ---- Posts ----

const OPEN_POST_STATUSES = [RENT_POST_STATUS.ACTIVE, RENT_POST_STATUS.PAUSED, RENT_POST_STATUS.LENT_OUT];

export const createPost = async (user, input, config) => {
  const campusId = requireCampusOf(user);
  const { blocks } = config || (await getCampusRentConfig(campusId));
  const now = new Date();

  const [profile, activeOfKind, lastHour] = await Promise.all([
    RentProfile.findOne({ user_id: user._id }).lean(),
    RentPost.countDocuments({ owner_id: user._id, kind: input.kind, status: { $in: OPEN_POST_STATUSES } }),
    RentPost.countDocuments({ owner_id: user._id, createdAt: { $gte: new Date(now.getTime() - HOUR) } }),
  ]);

  const cap = input.kind === RENT_KIND.REQUEST ? RENT_LIMITS.activeRequests : RENT_LIMITS.activeOffers;
  if (activeOfKind >= cap) {
    throw rentError(
      429,
      input.kind === RENT_KIND.REQUEST
        ? `You can have ${cap} open requests at a time. Close one first.`
        : `You can have ${cap} open offers at a time. Remove one first.`,
      "RENT_POST_LIMIT",
    );
  }
  if (lastHour >= RENT_LIMITS.postsPerHour) {
    throw rentError(429, "Too many posts in the last hour. Try again a bit later.", "RENT_RATE_LIMIT");
  }

  const block = resolveBlock(input.block ?? profile?.block ?? null, blocks);
  if (blocks.length && !block) throw rentError(400, "Pick your block", "BLOCK_REQUIRED");

  const title = input.title.trim();
  const description = (input.description || "").trim();
  const handover = cleanHandover(input.handover, input);
  assertPublicText(title, description, ...handoverTexts(handover));
  const images = input.images || [];
  assertImageHost(images);

  const isShare = input.mode === RENT_MODE.SHARE;
  const isRequest = input.kind === RENT_KIND.REQUEST;
  const availableUntil = isRequest ? null : resolveAvailableUntil(input.available_until, now);

  const post = await RentPost.create({
    owner_id: user._id,
    campus_id: campusId,
    kind: input.kind,
    mode: input.mode,
    title,
    description,
    category: input.category,
    images,
    price: normalizePrice(input.price, input.mode),
    deposit: isShare ? 0 : input.deposit || 0,
    quantity: isShare ? input.quantity || 1 : 1,
    block,
    needed_by: isRequest ? resolveNeededBy(input.needed_by, now) : null,
    condition: isRequest ? null : input.condition ?? null,
    available_until: availableUntil,
    handover,
  });

  // First post sets the block on the profile so the board sorts "my block" first.
  if (block && !profile?.block) {
    await RentProfile.updateOne(
      { user_id: user._id },
      { $set: { block, campus_id: campusId } },
      { upsert: true, setDefaultsOnInsert: true },
    );
  }

  if (isRequest) alertBlockForRequest(post, user).catch(() => {});

  return toClientPost(post.toObject(), user._id, { owner: toClientPerson(user, profile) });
};

const ownerLookupStages = [
  {
    $lookup: {
      from: User.collection.name,
      localField: "owner_id",
      foreignField: "_id",
      pipeline: [{ $project: { name: 1, avatar: 1 } }],
      as: "_owner",
    },
  },
  {
    $lookup: {
      from: RentProfile.collection.name,
      localField: "owner_id",
      foreignField: "user_id",
      pipeline: [{ $project: { stats: 1 } }],
      as: "_ownerProfile",
    },
  },
];

const withOwner = (row, viewerId) =>
  toClientPost(row, viewerId, { owner: toClientPerson(row._owner?.[0], row._ownerProfile?.[0]) });

export const listPosts = async (user, query = {}) => {
  const campusId = requireCampusOf(user);
  const now = new Date();
  const kind = query.kind === RENT_KIND.REQUEST ? RENT_KIND.REQUEST : RENT_KIND.OFFER;
  const page = Math.min(Math.max(parseInt(query.page, 10) || 1, 1), 50);
  const size = RENT_LIMITS.pageSize;

  const match = { campus_id: new mongoose.Types.ObjectId(String(campusId)), kind };
  if (kind === RENT_KIND.REQUEST) {
    match.status = RENT_POST_STATUS.ACTIVE;
    match.needed_by = { $gt: now };
  } else {
    match.status = { $in: RENT_VISIBLE_STATUSES };
  }
  if (typeof query.category === "string" && RENT_CATEGORIES.includes(query.category)) match.category = query.category;
  if (typeof query.mode === "string" && Object.values(RENT_MODE).includes(query.mode)) match.mode = query.mode;
  if (typeof query.block === "string" && query.block.trim() && query.block !== "all") {
    match.block = query.block.trim().slice(0, RENT_LIMITS.blockLength);
  }
  if (typeof query.q === "string" && query.q.trim()) {
    match.title = { $regex: escapeRx(query.q.trim().slice(0, 60)), $options: "i" };
  }

  const profile = await RentProfile.findOne({ user_id: user._id }).select("block").lean();
  const myBlock = profile?.block || null;

  const rows = await RentPost.aggregate([
    { $match: match },
    {
      $addFields: {
        _same: myBlock ? { $cond: [{ $eq: ["$block", myBlock] }, 1, 0] } : 0,
        _free: { $cond: [{ $eq: ["$status", RENT_POST_STATUS.ACTIVE] }, 1, 0] },
      },
    },
    { $sort: { _same: -1, _free: -1, createdAt: -1, _id: -1 } },
    { $skip: (page - 1) * size },
    { $limit: size + 1 },
    { $project: { reports: 0 } },
    ...ownerLookupStages,
  ]);

  const hasMore = rows.length > size;
  return {
    items: rows.slice(0, size).map((row) => withOwner(row, user._id)),
    page,
    hasMore,
    myBlock,
  };
};

const loadPostForViewer = async (user, postId) => {
  if (!isId(postId)) throw rentError(404, "Post not found", "RENT_POST_NOT_FOUND");
  const post = await RentPost.findById(postId).lean();
  const campusId = requireCampusOf(user);
  if (!post || post.status === RENT_POST_STATUS.DELETED || !sameId(post.campus_id, campusId)) {
    throw rentError(404, "Post not found", "RENT_POST_NOT_FOUND");
  }
  const isOwner = sameId(post.owner_id, user._id);
  if (post.status === RENT_POST_STATUS.HIDDEN && !isOwner) {
    throw rentError(404, "Post not found", "RENT_POST_NOT_FOUND");
  }
  return { post, isOwner };
};

export const getPost = async (user, postId) => {
  const { post, isOwner } = await loadPostForViewer(user, postId);
  const [owner, ownerProfile] = await Promise.all([
    User.findById(post.owner_id).select("name avatar").lean(),
    RentProfile.findOne({ user_id: post.owner_id }).select("stats").lean(),
  ]);

  const extra = { owner: toClientPerson(owner, ownerProfile) };
  if (isOwner) {
    const bookings = await RentBooking.find({ post_id: post._id, is_open: true })
      .sort({ createdAt: -1 })
      .select("-messages")
      .lean();
    const people = await peopleById(bookings.map((b) => b.requester_id));
    extra.bookings = bookings.map((b) => ({
      id: String(b._id),
      status: b.status,
      quantity: b.quantity,
      agreedPrice: b.agreed_price,
      note: b.note,
      returnBy: b.return_by,
      createdAt: b.createdAt,
      person: people.get(String(b.requester_id)) || null,
    }));
    extra.reportCount = post.report_count || 0;
  } else {
    const mine = await RentBooking.findOne({ post_id: post._id, requester_id: user._id })
      .sort({ createdAt: -1 })
      .select("_id status is_open")
      .lean();
    extra.myBooking = mine ? { id: String(mine._id), status: mine.status, isOpen: mine.is_open } : null;
  }
  return toClientPost(post, user._id, extra);
};

/** Map of userId → client person (name, avatar, rating) for a list of ids. */
export const peopleById = async (ids) => {
  const unique = [...new Set(ids.filter(Boolean).map(String))];
  if (!unique.length) return new Map();
  const [users, profiles] = await Promise.all([
    User.find({ _id: { $in: unique } }).select("name avatar").lean(),
    RentProfile.find({ user_id: { $in: unique } }).select("user_id stats").lean(),
  ]);
  const profileOf = new Map(profiles.map((p) => [String(p.user_id), p]));
  return new Map(users.map((u) => [String(u._id), toClientPerson(u, profileOf.get(String(u._id)))]));
};

export const listMyPosts = async (user) => {
  const posts = await RentPost.find({ owner_id: user._id, status: { $ne: RENT_POST_STATUS.DELETED } })
    .sort({ createdAt: -1 })
    .limit(50)
    .select("-reports")
    .lean();
  const counts = await RentBooking.aggregate([
    { $match: { post_id: { $in: posts.map((p) => p._id) }, status: RENT_BOOKING_STATUS.PENDING } },
    { $group: { _id: "$post_id", n: { $sum: 1 } } },
  ]);
  const pending = new Map(counts.map((c) => [String(c._id), c.n]));
  return posts.map((p) => toClientPost(p, user._id, { pendingCount: pending.get(String(p._id)) || 0 }));
};

const EDITABLE_STATUSES = [RENT_POST_STATUS.ACTIVE, RENT_POST_STATUS.PAUSED];

export const updatePost = async (user, postId, input, config) => {
  const { post, isOwner } = await loadPostForViewer(user, postId);
  if (!isOwner) throw rentError(404, "Post not found", "RENT_POST_NOT_FOUND");
  if (!EDITABLE_STATUSES.includes(post.status)) {
    throw rentError(409, "This post can't be edited right now", "RENT_POST_LOCKED");
  }
  const { blocks } = config || (await getCampusRentConfig(post.campus_id));
  const $set = {};
  if (input.title !== undefined) $set.title = input.title.trim();
  if (input.description !== undefined) $set.description = (input.description || "").trim();
  if (input.category !== undefined) $set.category = input.category;
  if (input.images !== undefined) {
    assertImageHost(input.images);
    $set.images = input.images;
  }
  if (input.price !== undefined) $set.price = normalizePrice(input.price, post.mode);
  if (input.deposit !== undefined && post.mode === RENT_MODE.LEND) $set.deposit = input.deposit;
  if (input.quantity !== undefined && post.mode === RENT_MODE.SHARE) $set.quantity = input.quantity;
  if (input.block !== undefined) {
    $set.block = resolveBlock(input.block, blocks);
    if (blocks.length && !$set.block) throw rentError(400, "Pick your block", "BLOCK_REQUIRED");
  }
  if (input.needed_by !== undefined && post.kind === RENT_KIND.REQUEST) $set.needed_by = resolveNeededBy(input.needed_by);
  if (post.kind === RENT_KIND.OFFER) {
    if (input.condition !== undefined) $set.condition = input.condition;
    if (input.available_until !== undefined) $set.available_until = resolveAvailableUntil(input.available_until);
  }
  if (input.handover !== undefined) $set.handover = cleanHandover(input.handover, post, post.handover);
  assertPublicText(
    $set.title ?? post.title,
    $set.description ?? post.description,
    ...handoverTexts($set.handover ?? post.handover),
  );

  const updated = await RentPost.findOneAndUpdate(
    { _id: post._id, owner_id: user._id, status: { $in: EDITABLE_STATUSES } },
    { $set },
    { returnDocument: "after", runValidators: true },
  ).lean();
  if (!updated) throw rentError(409, "This post changed meanwhile. Refresh and try again.", "RENT_POST_LOCKED");

  if ($set.images) {
    const kept = new Set($set.images.map((i) => i.fileId).filter(Boolean));
    for (const img of post.images || []) {
      if (img.fileId && !kept.has(img.fileId)) deleteImageSafely(img.fileId, { ownerId: user._id }).catch(() => {});
    }
  }
  return toClientPost(updated, user._id);
};

export const setPostStatus = async (user, postId, status) => {
  const { post, isOwner } = await loadPostForViewer(user, postId);
  if (!isOwner) throw rentError(404, "Post not found", "RENT_POST_NOT_FOUND");
  if (status === RENT_POST_STATUS.ACTIVE && post.kind === RENT_KIND.REQUEST && post.needed_by && post.needed_by <= new Date()) {
    throw rentError(409, "This request has expired. Post a new one.", "RENT_POST_EXPIRED");
  }
  if (status === RENT_POST_STATUS.ACTIVE && post.kind === RENT_KIND.OFFER && post.available_until && post.available_until <= new Date()) {
    throw rentError(409, "This offer's availability has ended. Post it again.", "RENT_POST_EXPIRED");
  }
  if (status === RENT_POST_STATUS.ACTIVE && post.mode === RENT_MODE.SHARE && post.kind === RENT_KIND.OFFER && post.quantity < 1) {
    throw rentError(409, "Nothing left to share. Edit the quantity first.", "RENT_POST_EMPTY");
  }
  const updated = await RentPost.findOneAndUpdate(
    { _id: post._id, owner_id: user._id, status: { $in: EDITABLE_STATUSES } },
    { $set: { status } },
    { returnDocument: "after" },
  ).lean();
  if (!updated) throw rentError(409, "This post can't be paused or resumed right now", "RENT_POST_LOCKED");
  return toClientPost(updated, user._id);
};

export const deletePost = async (user, postId) => {
  const { post, isOwner } = await loadPostForViewer(user, postId);
  if (!isOwner) throw rentError(404, "Post not found", "RENT_POST_NOT_FOUND");
  const busy = await RentBooking.exists({
    post_id: post._id,
    status: { $in: [RENT_BOOKING_STATUS.ACCEPTED, RENT_BOOKING_STATUS.ACTIVE] },
  });
  if (busy) throw rentError(409, "Finish or cancel the ongoing booking first", "RENT_POST_BUSY");

  await RentPost.updateOne({ _id: post._id }, { $set: { status: RENT_POST_STATUS.DELETED } });

  const pending = await RentBooking.find({ post_id: post._id, status: RENT_BOOKING_STATUS.PENDING })
    .select("requester_id")
    .lean();
  if (pending.length) {
    await RentBooking.updateMany(
      { _id: { $in: pending.map((b) => b._id) }, status: RENT_BOOKING_STATUS.PENDING },
      { $set: { status: RENT_BOOKING_STATUS.DECLINED, is_open: false, closed_at: new Date(), close_reason: "post_removed" } },
    );
    for (const b of pending) {
      notifyRent({
        userId: b.requester_id,
        title: "Post removed",
        message: `"${post.title}" was removed by its owner.`,
        actionUrl: "/rent",
        actionLabel: "Browse",
      }).catch(() => {});
    }
  }
  for (const img of post.images || []) {
    if (img.fileId) deleteImageSafely(img.fileId, { ownerId: user._id }).catch(() => {});
  }
  return { id: String(post._id), status: RENT_POST_STATUS.DELETED };
};

export const reportPost = async (user, postId, reason = "") => {
  const { post, isOwner } = await loadPostForViewer(user, postId);
  if (isOwner) throw rentError(400, "You can't report your own post", "RENT_SELF_REPORT");

  const updated = await RentPost.findOneAndUpdate(
    { _id: post._id, "reports.user_id": { $ne: user._id } },
    { $push: { reports: { user_id: user._id, reason: reason || "", at: new Date() } }, $inc: { report_count: 1 } },
    { returnDocument: "after" },
  ).lean();
  if (!updated) throw rentError(409, "You've already reported this post", "RENT_ALREADY_REPORTED");

  let hidden = false;
  if (updated.report_count >= RENT_LIMITS.reportsToHide && OPEN_POST_STATUSES.includes(updated.status)) {
    const res = await RentPost.updateOne(
      { _id: post._id, status: updated.status },
      { $set: { status: RENT_POST_STATUS.HIDDEN, hidden_from_status: updated.status, hidden_reason: "reports" } },
    );
    hidden = res.modifiedCount > 0;
    if (hidden) {
      notifyRent({
        userId: post.owner_id,
        title: "Post hidden for review",
        message: `"${post.title}" got several reports and is hidden until our team reviews it.`,
        actionUrl: "/rentals",
      }).catch(() => {});
    }
  }
  return { reported: true, hidden };
};

// ---- Block alerts for new requests ----

/**
 * "Someone in Block C needs an iron": alerts students in the same campus and
 * block who left alerts on. At most RENT_LIMITS.alertsPerRecipientPerHour
 * rent alerts per person per hour, and at most alertRecipientsCap people.
 */
export const alertBlockForRequest = async (post, owner) => {
  if (!post?.block) return 0;
  const profiles = await RentProfile.find({
    campus_id: post.campus_id,
    block: post.block,
    alerts: true,
    user_id: { $ne: owner._id },
  })
    .select("user_id")
    .limit(RENT_LIMITS.alertRecipientsCap * 2)
    .lean();
  if (!profiles.length) return 0;

  const active = await User.find({
    _id: { $in: profiles.map((p) => p.user_id) },
    status: USER_STATUS.ACTIVE,
    campus_id: post.campus_id,
  }).distinct("_id");
  if (!active.length) return 0;

  const busy = await Notification.aggregate([
    {
      $match: {
        recipient_id: { $in: active },
        type: "rent",
        group_key: { $regex: "^rent_alert:" },
        sent_at: { $gte: new Date(Date.now() - HOUR) },
      },
    },
    { $group: { _id: "$recipient_id", n: { $sum: 1 } } },
    { $match: { n: { $gte: RENT_LIMITS.alertsPerRecipientPerHour } } },
  ]);
  const skip = new Set(busy.map((b) => String(b._id)));
  const recipients = active.filter((id) => !skip.has(String(id))).slice(0, RENT_LIMITS.alertRecipientsCap);
  if (!recipients.length) return 0;

  const pay = post.price?.amount > 0 ? ` · will pay ₹${post.price.amount}` : "";
  await notifyRentFanout({
    recipientIds: recipients,
    title: `${post.block}: someone needs ${post.title}`.slice(0, 100),
    message: `${firstName(owner.name)} needs "${post.title}"${pay}. Can you help?`,
    actionUrl: `/rent/${post._id}`,
    actionLabel: "I can help",
    groupKey: `rent_alert:${post._id}`,
    imageUrl: post.images?.[0]?.url || null,
  });
  return recipients.length;
};
