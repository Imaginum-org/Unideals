// Staff tools for Rent & Borrow: per-campus switch + block list, and post moderation.
import mongoose from "mongoose";
import Campus from "../models/Campus.model.js";
import RentPost from "../models/RentPost.model.js";
import RentBooking from "../models/RentBooking.model.js";
import RentCampusConfig from "../models/RentCampusConfig.model.js";
import User from "../models/User.model.js";
import { RENT_POST_STATUS, RENT_LIMITS, isRentEnabled } from "../config/rent.js";
import { campusMatch, withCampusScope, isCampusInScope, outOfScope } from "./campusScope.service.js";
import { logAdminAction } from "./auditLog.service.js";
import { notifyRent } from "./notification.service.js";
import { rentError, clearRentConfigCache, toClientPost } from "./rent.service.js";

const escapeRx = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Every campus the caller can see, with its Rent settings and live counts. */
export const listCampusConfigs = async (scope) => {
  const campuses = await Campus.find(campusMatch(scope, "_id")).select("name short_name slug is_active").sort({ name: 1 }).lean();
  const ids = campuses.map((c) => c._id);
  const [configs, posts, bookings] = await Promise.all([
    RentCampusConfig.find({ campus_id: { $in: ids } }).lean(),
    RentPost.aggregate([
      { $match: { campus_id: { $in: ids }, status: { $in: [RENT_POST_STATUS.ACTIVE, RENT_POST_STATUS.LENT_OUT] } } },
      { $group: { _id: "$campus_id", n: { $sum: 1 } } },
    ]),
    RentBooking.aggregate([
      { $match: { campus_id: { $in: ids }, is_open: true } },
      { $group: { _id: "$campus_id", n: { $sum: 1 } } },
    ]),
  ]);
  const configOf = new Map(configs.map((c) => [String(c.campus_id), c]));
  const postsOf = new Map(posts.map((p) => [String(p._id), p.n]));
  const bookingsOf = new Map(bookings.map((b) => [String(b._id), b.n]));
  return {
    globallyEnabled: isRentEnabled(),
    campuses: campuses.map((c) => {
      const config = configOf.get(String(c._id));
      return {
        campus: { id: String(c._id), name: c.name, shortName: c.short_name, slug: c.slug, isActive: c.is_active },
        enabled: config ? config.enabled !== false : true,
        blocks: config?.blocks || [],
        livePosts: postsOf.get(String(c._id)) || 0,
        openBookings: bookingsOf.get(String(c._id)) || 0,
      };
    }),
  };
};

/** Clean a block list: trimmed, single-spaced, de-duplicated (case-insensitive), order kept. */
export const cleanBlocks = (blocks = []) => {
  const seen = new Set();
  const out = [];
  for (const raw of blocks) {
    const block = String(raw || "").trim().replace(/\s+/g, " ").slice(0, RENT_LIMITS.blockLength);
    const key = block.toLowerCase();
    if (!block || seen.has(key)) continue;
    seen.add(key);
    out.push(block);
  }
  return out.slice(0, RENT_LIMITS.maxBlocks);
};

export const updateCampusConfig = async ({ campusId, input, actor, scope }) => {
  if (!mongoose.isValidObjectId(campusId)) throw rentError(404, "Campus not found");
  if (!isCampusInScope(scope, campusId)) throw outOfScope("Campus");
  const campus = await Campus.findById(campusId).select("name").lean();
  if (!campus) throw rentError(404, "Campus not found");

  const $set = {};
  if (input.enabled !== undefined) $set.enabled = input.enabled;
  if (input.blocks !== undefined) $set.blocks = cleanBlocks(input.blocks);

  const before = await RentCampusConfig.findOne({ campus_id: campusId }).lean();
  const config = await RentCampusConfig.findOneAndUpdate(
    { campus_id: campusId },
    { $set },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
  ).lean();
  clearRentConfigCache(campusId);

  try {
    await logAdminAction({
      actor,
      action: "rent.config_update",
      targetType: "rent",
      targetId: campus._id,
      targetSnapshot: { campus: campus.name },
      metadata: {
        before: before ? { enabled: before.enabled, blocks: before.blocks } : null,
        after: { enabled: config.enabled, blocks: config.blocks },
      },
    });
  } catch {
    // audit failure never blocks the change
  }
  return { campusId: String(campusId), enabled: config.enabled, blocks: config.blocks };
};

export const listPostsForStaff = async ({ scope, query = {} }) => {
  const page = Math.min(Math.max(parseInt(query.page, 10) || 1, 1), 500);
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || 20, 1), 100);

  let match = { status: { $ne: RENT_POST_STATUS.DELETED } };
  if (typeof query.status === "string" && Object.values(RENT_POST_STATUS).includes(query.status)) match.status = query.status;
  if (query.reported === "1" || query.reported === "true") match.report_count = { $gte: 1 };
  if (typeof query.kind === "string" && ["offer", "request"].includes(query.kind)) match.kind = query.kind;
  if (typeof query.campus === "string" && mongoose.isValidObjectId(query.campus)) {
    match.campus_id = new mongoose.Types.ObjectId(query.campus);
  }
  if (typeof query.q === "string" && query.q.trim()) {
    match.title = { $regex: escapeRx(query.q.trim().slice(0, 60)), $options: "i" };
  }
  match = withCampusScope(match, scope);

  const [rows, total] = await Promise.all([
    RentPost.find(match)
      .sort({ report_count: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    RentPost.countDocuments(match),
  ]);
  const owners = await User.find({ _id: { $in: rows.map((r) => r.owner_id) } }).select("name email").lean();
  const campuses = await Campus.find({ _id: { $in: [...new Set(rows.map((r) => String(r.campus_id)))] } }).select("name").lean();
  const ownerOf = new Map(owners.map((o) => [String(o._id), o]));
  const campusOf = new Map(campuses.map((c) => [String(c._id), c.name]));

  return {
    items: rows.map((r) => ({
      ...toClientPost(r),
      campus: { id: String(r.campus_id), name: campusOf.get(String(r.campus_id)) || null },
      owner: ownerOf.has(String(r.owner_id))
        ? { id: String(r.owner_id), name: ownerOf.get(String(r.owner_id)).name, email: ownerOf.get(String(r.owner_id)).email }
        : { id: String(r.owner_id), name: "Deleted user", email: null },
      reportCount: r.report_count || 0,
      reports: (r.reports || []).slice(-10).map((x) => ({ reason: x.reason, at: x.at })),
      hiddenReason: r.hidden_reason || null,
    })),
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  };
};

export const moderatePost = async ({ postId, action, reason = "", actor, scope }) => {
  if (!mongoose.isValidObjectId(postId)) throw rentError(404, "Post not found");
  const post = await RentPost.findById(postId).lean();
  if (!post || post.status === RENT_POST_STATUS.DELETED) throw rentError(404, "Post not found");
  if (!isCampusInScope(scope, post.campus_id)) throw outOfScope("Post");

  let update;
  if (action === "hide") {
    if (post.status === RENT_POST_STATUS.HIDDEN) throw rentError(409, "Post is already hidden");
    update = {
      $set: { status: RENT_POST_STATUS.HIDDEN, hidden_from_status: post.status, hidden_reason: reason || "staff" },
    };
  } else {
    if (post.status !== RENT_POST_STATUS.HIDDEN) throw rentError(409, "Post isn't hidden");
    // Restored posts start clean so old reports don't re-hide them at once.
    update = {
      $set: {
        status: post.hidden_from_status || RENT_POST_STATUS.ACTIVE,
        hidden_from_status: null,
        hidden_reason: null,
        reports: [],
        report_count: 0,
      },
    };
  }
  const updated = await RentPost.findOneAndUpdate({ _id: post._id, status: post.status }, update, {
    returnDocument: "after",
  }).lean();
  if (!updated) throw rentError(409, "Post changed meanwhile, refresh and try again");

  try {
    await logAdminAction({
      actor,
      action: `rent.${action}`,
      targetType: "rent",
      targetId: post._id,
      targetSnapshot: { title: post.title, kind: post.kind, campus_id: post.campus_id, owner_id: post.owner_id },
      note: reason || null,
    });
  } catch {
    // ignore
  }

  notifyRent({
    userId: post.owner_id,
    title: action === "hide" ? "Post hidden" : "Post restored",
    message:
      action === "hide"
        ? `"${post.title}" was hidden by our team.${reason ? ` Reason: ${reason}` : ""}`
        : `"${post.title}" is visible on the board again.`,
    actionUrl: "/rentals",
  }).catch(() => {});

  return toClientPost(updated);
};
