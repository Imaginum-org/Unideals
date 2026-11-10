import mongoose from "mongoose";
import User from "../models/User.model.js";
import Product from "../models/Product.model.js";
import Campus from "../models/Campus.model.js";
import Report from "../models/Report.model.js";
import AuditLog from "../models/AuditLog.model.js";
import Deal from "../models/deal.model.js";
import Payment from "../models/Payment.model.js";
import { JobState } from "../models/JobRun.model.js";
import {
  USER_ROLES,
  USER_STATUS,
  PRODUCT_STATUS,
  REPORT_STATUS,
  DEAL_STATUS,
  PAYMENT_STATUS,
} from "../config/constants.js";

const { ObjectId } = mongoose.Types;

// ─── Dashboard ─────────────────────────────────────────────────────────────

const STAFF_AND_USERS = { $in: [USER_ROLES.USER, USER_ROLES.SUPPORT] };

/**
 * Month-to-date vs the SAME number of days last month. Comparing a partial
 * month against a full one made every trend read negative early on.
 */
const comparisonWindows = (now = new Date()) => {
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const elapsed = now.getTime() - startOfMonth.getTime();
  // Clamp so e.g. Mar 31 compares against the whole of February.
  const prevEnd = new Date(Math.min(startOfPrevMonth.getTime() + elapsed, startOfMonth.getTime()));
  return {
    current: { $gte: startOfMonth, $lte: now },
    previous: { $gte: startOfPrevMonth, $lt: prevEnd },
  };
};

// Percent change, or null when there is no baseline to compare against.
export const percentChange = (current, previous) => {
  if (!previous) return null;
  const diff = Math.round(((current - previous) / previous) * 100);
  return diff >= 0 ? `+${diff}%` : `${diff}%`;
};

const sumField = (Model, match, field) =>
  Model.aggregate([{ $match: match }, { $group: { _id: null, total: { $sum: field } } }])
    .then((rows) => rows?.[0]?.total || 0)
    .catch(() => 0);

// When a deal finished: completed_at, falling back to updatedAt for legacy
// deals completed before completed_at was recorded.
const completedIn = (range) => ({
  status: DEAL_STATUS.COMPLETED,
  $or: [{ completed_at: range }, { completed_at: null, updatedAt: range }],
});

// When a payment cleared: verified_at, falling back to createdAt.
const verifiedIn = (range) => ({
  status: PAYMENT_STATUS.VERIFIED,
  $or: [{ verified_at: range }, { verified_at: null, createdAt: range }],
});

export const getDashboardMetrics = async () => {
  const { current, previous } = comparisonWindows();
  const completed = { status: DEAL_STATUS.COMPLETED };
  const verified = { status: PAYMENT_STATUS.VERIFIED };

  const [
    totalUsers,
    activeUsers,
    suspendedUsers,
    inactiveUsers,
    listedProducts,
    blockedProducts,
    pendingReports,
    pendingGenderRequests,
    autoHiddenListings,
    failingJobs,
    activeCampuses,
    completedDeals,
    dealVolumeRupees,
    platformRevenuePaise,
    usersNow,
    usersPrev,
    productsNow,
    productsPrev,
    dealsNow,
    dealsPrev,
    volumeNow,
    volumePrev,
    revenueNow,
    revenuePrev,
    campusDistributionRaw,
    recentAuditLogs,
  ] = await Promise.all([
    User.countDocuments({ role: STAFF_AND_USERS }),
    User.countDocuments({ role: STAFF_AND_USERS, status: USER_STATUS.ACTIVE }),
    User.countDocuments({ role: STAFF_AND_USERS, status: USER_STATUS.SUSPENDED }),
    User.countDocuments({ role: STAFF_AND_USERS, status: USER_STATUS.INACTIVE }),
    Product.countDocuments({ status: PRODUCT_STATUS.LISTED, is_deleted: false }),
    Product.countDocuments({ status: PRODUCT_STATUS.BLOCKED, is_deleted: false }),
    Report.countDocuments({ status: REPORT_STATUS.PENDING }),
    User.countDocuments({ "genderChangeRequest.status": "pending" }).catch(() => 0),
    Product.countDocuments({ auto_hidden_at: { $ne: null }, is_deleted: false }).catch(() => 0),
    JobState.countDocuments({ last_status: "failed" }).catch(() => 0),
    Campus.countDocuments({ is_active: true }),
    Deal.countDocuments(completed).catch(() => 0),
    // Deal prices are stored in rupees.
    sumField(Deal, completed, "$current_price"),
    // Payment.amount is stored in paise.
    sumField(Payment, verified, "$amount"),
    User.countDocuments({ role: STAFF_AND_USERS, createdAt: current }).catch(() => 0),
    User.countDocuments({ role: STAFF_AND_USERS, createdAt: previous }).catch(() => 0),
    Product.countDocuments({ is_deleted: false, createdAt: current }).catch(() => 0),
    Product.countDocuments({ is_deleted: false, createdAt: previous }).catch(() => 0),
    Deal.countDocuments(completedIn(current)).catch(() => 0),
    Deal.countDocuments(completedIn(previous)).catch(() => 0),
    sumField(Deal, completedIn(current), "$current_price"),
    sumField(Deal, completedIn(previous), "$current_price"),
    sumField(Payment, verifiedIn(current), "$amount"),
    sumField(Payment, verifiedIn(previous), "$amount"),
    User.aggregate([
      { $match: { role: STAFF_AND_USERS, campus_id: { $ne: null } } },
      // Legacy accounts may hold campus_id as a string; normalise first.
      { $addFields: { campusObjId: { $convert: { input: "$campus_id", to: "objectId", onError: null, onNull: null } } } },
      { $match: { campusObjId: { $ne: null } } },
      { $group: { _id: "$campusObjId", count: { $sum: 1 } } },
      { $lookup: { from: Campus.collection.name, localField: "_id", foreignField: "_id", as: "campus" } },
      { $project: { campusName: { $arrayElemAt: ["$campus.name", 0] }, count: 1 } },
    ]).catch(() => []),
    AuditLog.find({}).sort({ createdAt: -1 }).limit(8).lean(),
  ]);

  // Users by campus: every active campus appears, even with zero users.
  const countMap = new Map();
  for (const row of campusDistributionRaw) {
    if (row.campusName) countMap.set(row.campusName, row.count);
  }
  const activeCampusesList = await Campus.find({ is_active: true }).select("name").lean();
  for (const campus of activeCampusesList) {
    if (!countMap.has(campus.name)) countMap.set(campus.name, 0);
  }
  const combinedCampuses = Array.from(countMap, ([name, count]) => ({ name, count })).sort(
    (a, b) => b.count - a.count || a.name.localeCompare(b.name),
  );
  const totalCampusUsers = combinedCampuses.reduce((sum, c) => sum + c.count, 0) || totalUsers;
  const usersByCampus = combinedCampuses.slice(0, 6).map((c) => ({
    name: c.name,
    count: c.count,
    percentage: totalCampusUsers > 0 ? Math.round((c.count / totalCampusUsers) * 100) : 0,
  }));

  const toRupees = (paise) => Math.round((paise || 0) / 100);

  return {
    stats: {
      totalUsers: totalUsers || 0,
      activeUsers: activeUsers || 0,
      suspendedUsers: suspendedUsers || 0,
      inactiveUsers: inactiveUsers || 0,
      listedProducts: listedProducts || 0,
      blockedProducts: blockedProducts || 0,
      pendingReports: pendingReports || 0,
      pendingGenderRequests: pendingGenderRequests || 0,
      // Listings hidden automatically by the report threshold, awaiting review.
      autoHiddenListings: autoHiddenListings || 0,
      // Background jobs whose latest run failed.
      failingJobs: failingJobs || 0,
      activeCampuses: activeCampuses || 0,
      // Completed peer-to-peer deals and their total value (GMV), rupees.
      completedDeals: completedDeals || 0,
      dealVolume: Math.round(dealVolumeRupees || 0),
      // Money paid to Unideals itself (subscriptions, boosts), rupees.
      platformRevenue: toRupees(platformRevenuePaise),
      monthToDate: {
        newUsers: usersNow,
        newListings: productsNow,
        completedDeals: dealsNow,
        dealVolume: Math.round(volumeNow),
        platformRevenue: toRupees(revenueNow),
      },
      usersByCampus,
      trends: {
        users: percentChange(usersNow, usersPrev),
        products: percentChange(productsNow, productsPrev),
        orders: percentChange(dealsNow, dealsPrev),
        dealVolume: percentChange(volumeNow, volumePrev),
        revenue: percentChange(revenueNow, revenuePrev),
      },
    },
    recentActivity: recentAuditLogs.map((log) => ({
      id: log._id.toString(),
      actor_name: log.actor_name,
      actor_role: log.actor_role,
      action: log.action,
      target_type: log.target_type,
      target_id: log.target_id?.toString(),
      target_snapshot: log.target_snapshot,
      metadata: log.metadata,
      createdAt: log.createdAt,
    })),
  };
};

// ─── User Details ──────────────────────────────────────────────────────────

export const getUserDetails = async (userId) => {
  if (!ObjectId.isValid(userId)) throw new Error("Invalid user id");

  const [user, listingsCount, recentProducts, reportCount] = await Promise.all([
    User.findOne({ _id: userId, role: { $in: [USER_ROLES.USER, USER_ROLES.SUPPORT] } })
      .select("name email avatar mobile gender role status campus_id subscription createdAt last_login_date gamification")
      .populate("campus_id", "name short_name slug")
      .lean(),
    Product.countDocuments({ seller_id: userId, is_deleted: false }),
    Product.find({ seller_id: userId, is_deleted: false })
      .sort({ createdAt: -1 })
      .limit(5)
      .select("title selling_price status images category createdAt")
      .lean(),
    Report.countDocuments({ target_id: userId, target_model: "User" }),
  ]);

  if (!user) throw new Error("User not found");

  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    avatar: user.avatar,
    mobile: user.mobile,
    gender: user.gender,
    role: user.role,
    status: user.status,
    subscription: user.subscription,
    campus: user.campus_id
      ? {
          id: user.campus_id._id?.toString(),
          name: user.campus_id.name,
          short_name: user.campus_id.short_name,
          slug: user.campus_id.slug,
        }
      : null,
    listingsCount,
    reportCount,
    gamification: {
      level: user.gamification?.level ?? 1,
      total_xp: user.gamification?.total_xp ?? 0,
      rank_title: user.gamification?.rank_title ?? "Seedling",
    },
    recentProducts: recentProducts.map((p) => ({
      id: p._id.toString(),
      title: p.title,
      price: p.selling_price,
      status: p.status,
      category: p.category,
      image: p.images?.[0]?.url ?? null,
      createdAt: p.createdAt,
    })),
    joinedAt: user.createdAt,
    lastLoginAt: user.last_login_date,
  };
};

// ─── Product Details ───────────────────────────────────────────────────────

export const getProductDetails = async (productId) => {
  if (!ObjectId.isValid(productId)) throw new Error("Invalid product id");

  const product = await Product.findById(productId)
    .populate("seller_id", "name email avatar status")
    .populate("campus_id", "name short_name slug")
    .lean();

  if (!product) throw new Error("Product not found");

  const reportCount = await Report.countDocuments({
    target_id: productId,
    target_model: "Product",
  });

  const recentReports = await Report.find({
    target_id: productId,
    target_model: "Product",
    status: REPORT_STATUS.PENDING,
  })
    .sort({ createdAt: -1 })
    .limit(5)
    .populate("reporter_id", "name email")
    .lean();

  return {
    id: product._id.toString(),
    title: product.title,
    description: product.description,
    category: product.category,
    condition: product.condition,
    status: product.status,
    price: product.selling_price,
    original_price: product.original_price,
    is_negotiable: product.is_negotiable,
    payment_preference: product.payment_preference,
    images: (product.images || []).map((img) => ({
      url: img.url,
      fileId: img.fileId,
    })),
    is_deleted: product.is_deleted,
    auto_hidden_at: product.auto_hidden_at || null,
    auto_hidden_report_count: product.auto_hidden_report_count || 0,
    views_count: product.views_count,
    reportCount,
    seller: product.seller_id
      ? {
          id: product.seller_id._id?.toString(),
          name: product.seller_id.name,
          email: product.seller_id.email,
          avatar: product.seller_id.avatar,
          status: product.seller_id.status,
        }
      : null,
    campus: product.campus_id
      ? {
          id: product.campus_id._id?.toString(),
          name: product.campus_id.name,
          short_name: product.campus_id.short_name,
          slug: product.campus_id.slug,
        }
      : null,
    pickup_address: product.pickup_address_snapshot,
    recentReports: recentReports.map((r) => ({
      id: r._id.toString(),
      reason: r.reason,
      description: r.description,
      status: r.status,
      reporter: r.reporter_id
        ? { name: r.reporter_id.name, email: r.reporter_id.email }
        : null,
      createdAt: r.createdAt,
    })),
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
  };
};

// ─── Moderation Queue ─────────────────────────────────────────────────────

/**
 * Build the moderation queue: groups pending reports by their target,
 * sorted by report count descending (highest priority first).
 */
export const getModerationQueue = async (query = {}) => {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(query.limit, 10) || 20));
  const skip = (page - 1) * limit;

  const targetModelFilter = query.target_model
    ? { target_model: query.target_model }
    : {};

  // Aggregate pending reports grouped by target
  const pipeline = [
    { $match: { status: REPORT_STATUS.PENDING, ...targetModelFilter } },
    {
      $group: {
        _id: { target_id: "$target_id", target_model: "$target_model" },
        reportCount: { $sum: 1 },
        reasons: { $addToSet: "$reason" },
        latestReport: { $max: "$createdAt" },
        firstReport: { $min: "$createdAt" },
        // Any report filed from a chat (evidence available).
        hasChat: { $max: { $cond: [{ $ifNull: ["$conversation_id", false] }, 1, 0] } },
      },
    },
    { $sort: { reportCount: -1, latestReport: -1 } },
    {
      $facet: {
        data: [{ $skip: skip }, { $limit: limit }],
        total: [{ $count: "count" }],
      },
    },
  ];

  const [aggResult] = await Report.aggregate(pipeline);
  const total = aggResult?.total?.[0]?.count || 0;
  const groups = aggResult?.data || [];

  // Now hydrate each group with the target details
  const productIds = groups
    .filter((g) => g._id.target_model === "Product")
    .map((g) => g._id.target_id);
  const userIds = groups
    .filter((g) => g._id.target_model === "User")
    .map((g) => g._id.target_id);
  const supportIds = groups
    .filter((g) => g._id.target_model === "Support")
    .map((g) => g._id.target_id);

  const [products, users, supportTickets] = await Promise.all([
    productIds.length
      ? Product.find({ _id: { $in: productIds } })
          .select("title status selling_price images category is_deleted seller_id")
          .populate("seller_id", "name email")
          .lean()
      : [],
    userIds.length
      ? User.find({ _id: { $in: userIds } })
          .select("name email avatar status")
          .lean()
      : [],
    supportIds.length
      ? Report.find({ target_id: { $in: supportIds } })
          .populate("reporter_id", "name email avatar")
          .lean()
      : [],
  ]);

  const productMap = new Map(products.map((p) => [p._id.toString(), p]));
  const userMap = new Map(users.map((u) => [u._id.toString(), u]));
  const supportMap = new Map(supportTickets.map((s) => [s.target_id.toString(), s]));

  const queueItems = groups.map((g) => {
    const targetId = g._id.target_id.toString();
    const targetModel = g._id.target_model;
    let targetDetail = null;

    if (targetModel === "Product") {
      const p = productMap.get(targetId);
      if (p) {
        targetDetail = {
          id: targetId,
          type: "product",
          title: p.title,
          status: p.status,
          price: p.selling_price,
          category: p.category,
          image: p.images?.[0]?.url ?? null,
          is_deleted: p.is_deleted,
          seller: p.seller_id
            ? {
                id: p.seller_id._id?.toString(),
                name: p.seller_id.name,
                email: p.seller_id.email,
              }
            : null,
        };
      }
    } else if (targetModel === "User") {
      const u = userMap.get(targetId);
      if (u) {
        targetDetail = {
          id: targetId,
          type: "user",
          name: u.name,
          email: u.email,
          avatar: u.avatar,
          status: u.status,
        };
      }
    } else if (targetModel === "Support") {
      const s = supportMap.get(targetId);
      if (s) {
        targetDetail = {
          id: targetId,
          type: "support",
          title: s.reason || "Support Request",
          description: s.description,
          email: s.reporter_email || s.reporter_id?.email || "—",
          name: s.reporter_name || s.reporter_id?.name || "Visitor",
          reference: s.reference || "",
          support_type: s.support_type || "contact",
          priority: s.priority || "normal",
          status: s.status,
          createdAt: s.createdAt,
        };
      }
    }

    return {
      targetId,
      targetModel,
      reportCount: g.reportCount,
      hasChat: Boolean(g.hasChat),
      reasons: g.reasons,
      latestReport: g.latestReport,
      firstReport: g.firstReport,
      target: targetDetail,
      // Priority badge: high ≥5, medium ≥2, low = 1
      priority:
        targetModel === "Support" && targetDetail?.priority
          ? targetDetail.priority
          : g.reportCount >= 5 ? "high" : g.reportCount >= 2 ? "medium" : "low",
    };
  });

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return {
    data: queueItems,
    pagination: { total, page, limit, totalPages },
  };
};

// ─── Report Quick Actions ─────────────────────────────────────────────────


