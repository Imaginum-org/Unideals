import mongoose from "mongoose";
import User from "../models/User.model.js";
import Product from "../models/Product.model.js";
import Campus from "../models/Campus.model.js";
import Report from "../models/Report.model.js";
import AuditLog from "../models/AuditLog.model.js";
import Deal from "../models/deal.model.js";
import Payment from "../models/Payment.model.js";
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

export const getDashboardMetrics = async (range = "month") => {
  const now = new Date();
  const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfPreviousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const [
    totalUsers,
    activeUsers,
    suspendedUsers,
    inactiveUsers,
    listedProducts,
    blockedProducts,
    pendingReports,
    activeCampuses,
    totalOrders,
    paymentsAgg,
    dealsAgg,
    paymentsThisMonthAgg,
    paymentsPrevMonthAgg,
    dealsThisMonthAgg,
    dealsPrevMonthAgg,
    campusDistributionRaw,
    recentAuditLogs,
    usersThisMonth,
    usersPrevMonth,
    productsThisMonth,
    productsPrevMonth,
    ordersThisMonth,
    ordersPrevMonth,
  ] = await Promise.all([
    User.countDocuments({ role: USER_ROLES.USER }),
    User.countDocuments({ role: USER_ROLES.USER, status: USER_STATUS.ACTIVE }),
    User.countDocuments({ role: USER_ROLES.USER, status: USER_STATUS.SUSPENDED }),
    User.countDocuments({ role: USER_ROLES.USER, status: USER_STATUS.INACTIVE }),
    Product.countDocuments({ status: PRODUCT_STATUS.LISTED, is_deleted: false }),
    Product.countDocuments({ status: PRODUCT_STATUS.BLOCKED, is_deleted: false }),
    Report.countDocuments({ status: REPORT_STATUS.PENDING }),
    Campus.countDocuments({ is_active: true }),
    Deal.countDocuments({
      status: {
        $in: [
          DEAL_STATUS.COMPLETED,
          DEAL_STATUS.PAYMENT_CONFIRMED,
          DEAL_STATUS.DEAL_CONFIRMED,
        ],
      },
    }).catch(() => 0),
    Payment.aggregate([
      { $match: { status: PAYMENT_STATUS.VERIFIED } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]).catch(() => []),
    Deal.aggregate([
      { $match: { status: DEAL_STATUS.COMPLETED } },
      { $group: { _id: null, total: { $sum: "$current_price" } } },
    ]).catch(() => []),
    Payment.aggregate([
      {
        $match: {
          status: PAYMENT_STATUS.VERIFIED,
          createdAt: { $gte: startOfCurrentMonth },
        },
      },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]).catch(() => []),
    Payment.aggregate([
      {
        $match: {
          status: PAYMENT_STATUS.VERIFIED,
          createdAt: { $gte: startOfPreviousMonth, $lt: startOfCurrentMonth },
        },
      },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]).catch(() => []),
    Deal.aggregate([
      {
        $match: {
          status: DEAL_STATUS.COMPLETED,
          createdAt: { $gte: startOfCurrentMonth },
        },
      },
      { $group: { _id: null, total: { $sum: "$current_price" } } },
    ]).catch(() => []),
    Deal.aggregate([
      {
        $match: {
          status: DEAL_STATUS.COMPLETED,
          createdAt: { $gte: startOfPreviousMonth, $lt: startOfCurrentMonth },
        },
      },
      { $group: { _id: null, total: { $sum: "$current_price" } } },
    ]).catch(() => []),
    User.aggregate([
      { $match: { role: USER_ROLES.USER, campus_id: { $ne: null } } },
      { $group: { _id: "$campus_id", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: "campuses",
          localField: "_id",
          foreignField: "_id",
          as: "campus",
        },
      },
      {
        $project: {
          campusName: { $arrayElemAt: ["$campus.name", 0] },
          count: 1,
        },
      },
    ]).catch(() => []),
    AuditLog.find({})
      .sort({ createdAt: -1 })
      .limit(8)
      .lean(),
    User.countDocuments({
      role: USER_ROLES.USER,
      createdAt: { $gte: startOfCurrentMonth },
    }).catch(() => 0),
    User.countDocuments({
      role: USER_ROLES.USER,
      createdAt: { $gte: startOfPreviousMonth, $lt: startOfCurrentMonth },
    }).catch(() => 0),
    Product.countDocuments({
      status: PRODUCT_STATUS.LISTED,
      is_deleted: false,
      createdAt: { $gte: startOfCurrentMonth },
    }).catch(() => 0),
    Product.countDocuments({
      status: PRODUCT_STATUS.LISTED,
      is_deleted: false,
      createdAt: { $gte: startOfPreviousMonth, $lt: startOfCurrentMonth },
    }).catch(() => 0),
    Deal.countDocuments({
      status: {
        $in: [
          DEAL_STATUS.COMPLETED,
          DEAL_STATUS.PAYMENT_CONFIRMED,
          DEAL_STATUS.DEAL_CONFIRMED,
        ],
      },
      createdAt: { $gte: startOfCurrentMonth },
    }).catch(() => 0),
    Deal.countDocuments({
      status: {
        $in: [
          DEAL_STATUS.COMPLETED,
          DEAL_STATUS.PAYMENT_CONFIRMED,
          DEAL_STATUS.DEAL_CONFIRMED,
        ],
      },
      createdAt: { $gte: startOfPreviousMonth, $lt: startOfCurrentMonth },
    }).catch(() => 0),
  ]);

  // Payment.amount is recorded in paise in schema; divide by 100 for INR.
  const paymentRupees = Math.round((paymentsAgg?.[0]?.total || 0) / 100);
  const dealRupees = Math.round(dealsAgg?.[0]?.total || 0);
  const totalRevenue = paymentRupees + dealRupees;

  const paymentThisMonthRupees = Math.round((paymentsThisMonthAgg?.[0]?.total || 0) / 100);
  const paymentPrevMonthRupees = Math.round((paymentsPrevMonthAgg?.[0]?.total || 0) / 100);
  const dealThisMonthRupees = Math.round(dealsThisMonthAgg?.[0]?.total || 0);
  const dealPrevMonthRupees = Math.round(dealsPrevMonthAgg?.[0]?.total || 0);

  const revenueThisMonth = paymentThisMonthRupees + dealThisMonthRupees;
  const revenuePrevMonth = paymentPrevMonthRupees + dealPrevMonthRupees;

  const calculateChange = (current, previous) => {
    if (!previous || previous === 0) {
      if (!current || current === 0) return null;
      return `+${current}`;
    }
    const diff = Math.round(((current - previous) / previous) * 100);
    return diff >= 0 ? `+${diff}%` : `${diff}%`;
  };

  const campusColors = ["#3B82F6", "#8B5CF6", "#10B981", "#F97316", "#64748B"];
  const usersByCampus = campusDistributionRaw
    .filter((c) => c.campusName)
    .map((c, index) => ({
      name: c.campusName,
      count: c.count,
      percentage: totalUsers > 0 ? Math.round((c.count / totalUsers) * 100) : 0,
      color: campusColors[index % campusColors.length],
    }));

  return {
    stats: {
      totalUsers: totalUsers || 0,
      activeUsers: activeUsers || 0,
      suspendedUsers: suspendedUsers || 0,
      inactiveUsers: inactiveUsers || 0,
      listedProducts: listedProducts || 0,
      blockedProducts: blockedProducts || 0,
      pendingReports: pendingReports || 0,
      activeCampuses: activeCampuses || 0,
      totalOrders: totalOrders || 0,
      totalRevenue: totalRevenue || 0,
      usersByCampus,
      trends: {
        users: calculateChange(usersThisMonth, usersPrevMonth),
        products: calculateChange(productsThisMonth, productsPrevMonth),
        orders: calculateChange(ordersThisMonth, ordersPrevMonth),
        revenue: calculateChange(revenueThisMonth, revenuePrevMonth),
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
    User.findOne({ _id: userId, role: USER_ROLES.USER })
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

  const [products, users] = await Promise.all([
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
  ]);

  const productMap = new Map(products.map((p) => [p._id.toString(), p]));
  const userMap = new Map(users.map((u) => [u._id.toString(), u]));

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
    }

    return {
      targetId,
      targetModel,
      reportCount: g.reportCount,
      reasons: g.reasons,
      latestReport: g.latestReport,
      firstReport: g.firstReport,
      target: targetDetail,
      // Priority badge: high ≥5, medium ≥2, low = 1
      priority:
        g.reportCount >= 5 ? "high" : g.reportCount >= 2 ? "medium" : "low",
    };
  });

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return {
    data: queueItems,
    pagination: { total, page, limit, totalPages },
  };
};

// ─── Report Quick Actions ─────────────────────────────────────────────────

export const dismissReports = async (targetId, targetModel, actor) => {
  if (!ObjectId.isValid(targetId)) throw new Error("Invalid target id");

  const validModels = ["Product", "User"];
  if (!validModels.includes(targetModel)) {
    throw new Error("Invalid target model");
  }

  const result = await Report.updateMany(
    {
      target_id: new ObjectId(targetId),
      target_model: targetModel,
      status: REPORT_STATUS.PENDING,
    },
    {
      status: REPORT_STATUS.DISMISSED,
      reviewed_at: new Date(),
    },
  );

  try {
    const { logAdminAction } = await import("./auditLog.service.js");
    await logAdminAction({
      actor,
      action: "report.dismiss",
      targetType: "report",
      targetId: new ObjectId(targetId),
      metadata: { targetModel, dismissedCount: result.modifiedCount },
    });
  } catch { /* audit log failure never blocks action */ }

  return { dismissedCount: result.modifiedCount };
};
