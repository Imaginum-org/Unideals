import mongoose from "mongoose";
import Product from "../models/Product.model.js";
import User from "../models/User.model.js";
import { USER_ROLES, USER_STATUS } from "../config/constants.js";
import {
  buildPagination,
  escapeRegex,
  toPositiveInt,
} from "../utils/adminQuery.js";

const { ObjectId } = mongoose.Types;

export const getUsers = async (query = {}) => {
  const page = toPositiveInt(query.page, 1);
  const limit = toPositiveInt(query.limit, 5, 50);
  const skip = (page - 1) * limit;

  const match = {
    role: USER_ROLES.USER,
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
    { _id: userId, role: USER_ROLES.USER },
    {
      status,
      ...(isDeactivation
        ? { refresh_token: null, $inc: { tokenVersion: 1 } }
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

export const getUserStats = async () => {
  const now = new Date();
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
    User.countDocuments({ role: USER_ROLES.USER }),
    User.countDocuments({ role: USER_ROLES.USER, status: USER_STATUS.ACTIVE }),
    User.countDocuments({ role: USER_ROLES.USER, status: USER_STATUS.SUSPENDED }),
    User.countDocuments({ role: USER_ROLES.USER, createdAt: { $gte: startOfCurrentMonth } }),
    User.countDocuments({ role: USER_ROLES.USER, createdAt: { $gte: startOfPreviousMonth, $lt: startOfCurrentMonth } }),
    User.countDocuments({ role: USER_ROLES.USER, createdAt: { $gte: thirtyDaysAgo } }),
    User.countDocuments({ role: USER_ROLES.USER, createdAt: { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo } }),
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
