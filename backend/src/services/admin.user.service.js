import mongoose from "mongoose";
import Product from "../models/Product.model.js";
import User from "../models/User.model.js";
import Campus from "../models/Campus.model.js";
import { USER_ROLES, USER_STATUS } from "../config/constants.js";
import {
  buildPagination,
  escapeRegex,
  toPositiveInt,
} from "../utils/adminQuery.js";
import { notifyRoleAssigned } from "./notification.service.js";

const { ObjectId } = mongoose.Types;

export const getUsers = async (query = {}) => {
  const page = toPositiveInt(query.page, 1);
  const limit = toPositiveInt(query.limit, 5, 50);
  const skip = (page - 1) * limit;

  const match = {
    role: { $in: [USER_ROLES.USER, USER_ROLES.SUPPORT] },
  };

  if (query.status) {
    if (!Object.values(USER_STATUS).includes(query.status)) {
      throw new Error("Invalid user status filter");
    }
    match.status = query.status;
  }

  if (query.search?.trim()) {
    const searchText = query.search.trim();
    const safeSearch = escapeRegex(searchText);
    match.$or = [
      { name: { $regex: safeSearch, $options: "i" } },
      { email: { $regex: safeSearch, $options: "i" } },
      ...(ObjectId.isValid(searchText)
        ? [{ _id: new ObjectId(searchText) }]
        : []),
    ];
  }

  const pipeline = [
    { $match: match },
    {
      $lookup: {
        from: "products",
        let: { userId: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: { $eq: ["$seller_id", "$$userId"] },
              is_deleted: false,
            },
          },
          { $count: "count" },
        ],
        as: "listingStats",
      },
    },
    {
      $addFields: {
        listings: {
          $ifNull: [{ $arrayElemAt: ["$listingStats.count", 0] }, 0],
        },
      },
    },
    {
      $lookup: {
        from: Campus.collection.name,
        localField: "campus_id",
        foreignField: "_id",
        as: "campus",
      },
    },
    { $sort: { createdAt: -1 } },
    {
      $facet: {
        data: [
          { $skip: skip },
          { $limit: limit },
          {
            $project: {
              _id: 0,
              id: { $toString: "$_id" },
              name: 1,
              email: 1,
              avatar: 1,
              mobile: 1,
              gender: 1,
              role: 1,
              status: 1,
              campus: {
                $let: {
                  vars: { campus: { $arrayElemAt: ["$campus", 0] } },
                  in: {
                    id: { $toString: "$$campus._id" },
                    name: "$$campus.name",
                    short_name: "$$campus.short_name",
                    slug: "$$campus.slug",
                  },
                },
              },
              listings: 1,
              joined: "$createdAt",
              createdAt: 1,
            },
          },
        ],
        total: [{ $count: "count" }],
      },
    },
  ];

  const [result] = await User.aggregate(pipeline);
  const total = result?.total?.[0]?.count || 0;

  return {
    data: result?.data || [],
    pagination: buildPagination(total, page, limit),
  };
};

export const updateUserStatus = async (userId, status) => {
  if (!ObjectId.isValid(userId)) {
    throw new Error("Invalid user id");
  }

  if (!Object.values(USER_STATUS).includes(status)) {
    throw new Error("Invalid user status");
  }

  const isDeactivation = status !== USER_STATUS.ACTIVE;

  const user = await User.findOneAndUpdate(
    { _id: userId, role: { $in: [USER_ROLES.USER, USER_ROLES.SUPPORT] } },
    {
      status,
      ...(isDeactivation
        ? {
            refresh_token: null,
            refresh_token_prev: null,
            refresh_token_prev_expires_at: null,
            $inc: { tokenVersion: 1 },
          }
        : {}),
    },
    { new: true, runValidators: true },
  )
    .select("name email avatar mobile gender role status createdAt")
    .lean();

  if (!user) {
    throw new Error("User not found");
  }

  // On suspend/deactivate: kill sessions (tokenVersion above), unlist live
  // listings, and revoke active boosts (best-effort, never fail the request).
  if (isDeactivation) {
    try {
      await Product.updateMany(
        { seller_id: user._id, is_deleted: false, status: "listed" },
        { $set: { status: "unlisted", is_boosted: false } },
      );
    } catch {
      // best-effort only
    }
    try {
      const Boost = (await import("../models/Boost.model.js")).default;
      await Boost.updateMany(
        { user_id: user._id, status: "active" },
        { $set: { status: "expired" } },
      );
    } catch {
      // best-effort only
    }
  }

  const listings = await Product.countDocuments({
    seller_id: user._id,
    is_deleted: false,
  });

  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    avatar: user.avatar,
    mobile: user.mobile,
    gender: user.gender,
    role: user.role,
    status: user.status,
    listings,
    joined: user.createdAt,
    createdAt: user.createdAt,
  };
};

export const updateUserRole = async (userId, role) => {
  if (!ObjectId.isValid(userId)) {
    throw new Error("Invalid user id");
  }

  if (![USER_ROLES.USER, USER_ROLES.SUPPORT].includes(role)) {
    throw new Error("Only support role can be assigned from the admin portal");
  }

  const targetUser = await User.findById(userId).select("role").lean();
  if (!targetUser) {
    throw new Error("User not found");
  }

  if (targetUser.role === USER_ROLES.ADMIN) {
    throw new Error("Admin roles cannot be changed via the admin portal");
  }

  const user = await User.findByIdAndUpdate(
    userId,
    { role },
    { new: true, runValidators: true },
  )
    .select("name email avatar mobile gender role status createdAt")
    .lean();

  const listings = await Product.countDocuments({
    seller_id: user._id,
    is_deleted: false,
  });

  // Notify user when they are promoted to support — fire-and-forget
  if (role === USER_ROLES.SUPPORT) {
    notifyRoleAssigned({ userId, newRole: role }).catch(() => {});
  }

  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    avatar: user.avatar,
    mobile: user.mobile,
    gender: user.gender,
    role: user.role,
    status: user.status,
    listings,
    joined: user.createdAt,
    createdAt: user.createdAt,
  };
};

export const getUserStats = async () => {  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
  const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfPreviousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const [
    totalUsers,
    activeUsers,
    suspendedUsers,
    usersThisMonth,
    usersPrevMonth,
    newUsers30d,
    newUsersPrev30d,
  ] = await Promise.all([
    User.countDocuments({ role: { $in: [USER_ROLES.USER, USER_ROLES.SUPPORT] } }),
    User.countDocuments({ role: { $in: [USER_ROLES.USER, USER_ROLES.SUPPORT] }, status: USER_STATUS.ACTIVE }),
    User.countDocuments({ role: { $in: [USER_ROLES.USER, USER_ROLES.SUPPORT] }, status: USER_STATUS.SUSPENDED }),
    User.countDocuments({ role: { $in: [USER_ROLES.USER, USER_ROLES.SUPPORT] }, createdAt: { $gte: startOfCurrentMonth } }),
    User.countDocuments({ role: { $in: [USER_ROLES.USER, USER_ROLES.SUPPORT] }, createdAt: { $gte: startOfPreviousMonth, $lt: startOfCurrentMonth } }),
    User.countDocuments({ role: { $in: [USER_ROLES.USER, USER_ROLES.SUPPORT] }, createdAt: { $gte: thirtyDaysAgo } }),
    User.countDocuments({ role: { $in: [USER_ROLES.USER, USER_ROLES.SUPPORT] }, createdAt: { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo } }),
  ]);

  const activePct = totalUsers > 0 ? Number(((activeUsers / totalUsers) * 100).toFixed(1)) : 0;
  const suspendedPct = totalUsers > 0 ? Number(((suspendedUsers / totalUsers) * 100).toFixed(1)) : 0;

  const totalGrowth = usersPrevMonth > 0
    ? Number((((usersThisMonth - usersPrevMonth) / usersPrevMonth) * 100).toFixed(1))
    : usersThisMonth > 0 ? 100 : 0;

  const newUsersGrowth = newUsersPrev30d > 0
    ? Number((((newUsers30d - newUsersPrev30d) / newUsersPrev30d) * 100).toFixed(1))
    : newUsers30d > 0 ? 100 : 0;

  return {
    totalUsers,
    totalGrowth,
    activeUsers,
    activePct,
    suspendedUsers,
    suspendedPct,
    newUsers30d,
    newUsersGrowth,
  };
};

// Gender change approval queue — scalable paginated query on the embedded
// pending subdoc (single index-friendly match, lean + limit clamped).
export const getGenderChangeRequests = async (query = {}) => {
  const page = toPositiveInt(query.page, 1);
  const limit = toPositiveInt(query.limit, 20, 50);
  const skip = (page - 1) * limit;
  const match = { "genderChangeRequest.status": "pending" };
  const [total, data] = await Promise.all([
    User.countDocuments(match),
    User.find(match)
      .select("name email gender genderSource genderChangeRequest createdAt")
      .sort({ "genderChangeRequest.requestedAt": -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
  ]);
  return {
    data: data.map((u) => ({
      id: String(u._id),
      name: u.name,
      email: u.email,
      gender: u.gender ?? null,
      genderSource: u.genderSource,
      requestedGender: u.genderChangeRequest?.requestedGender || null,
      requestedAt: u.genderChangeRequest?.requestedAt || null,
    })),
    pagination: buildPagination(total, page, limit),
  };
};

export const reviewGenderChangeRequest = async (userId, action) => {
  if (!ObjectId.isValid(userId)) throw new Error("Invalid user id");
  const act = String(action || "").toLowerCase();
  if (!["approve", "reject"].includes(act)) throw new Error("Invalid action");
  const user = await User.findById(userId).select("gender genderChangeRequest");
  if (!user) throw new Error("User not found");
  if (!user.genderChangeRequest || user.genderChangeRequest.status !== "pending") {
    throw new Error("No pending gender change request");
  }
  if (act === "reject") {
    user.genderChangeRequest.status = "rejected";
    user.genderChangeRequest.reviewedAt = new Date();
    await user.save();
    return user.toObject();
  }
  // Approve: set gender as admin, stamp source, auto-unlist girls-only if
  // leaving female (same safety as profile update, reversible via relist).
  const next = user.genderChangeRequest.requestedGender;
  const leavingFemale = user.gender === "female" && next !== "female";
  user.gender = next;
  user.genderSource = "admin";
  user.genderUpdatedAt = new Date();
  user.genderChangeRequest.status = "approved";
  user.genderChangeRequest.reviewedAt = new Date();
  await user.save();
  if (leavingFemale) {
    try {
      await Product.updateMany(
        { seller_id: user._id, isGirlsOnly: true, status: "listed", is_deleted: false },
        { $set: { status: "unlisted", is_boosted: false } },
      );
    } catch {
      // best-effort only
    }
  }
  return user.toObject();
};
