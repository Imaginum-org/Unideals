import mongoose from "mongoose";
import Product from "../models/Product.model.js";
import Report from "../models/Report.model.js";
import User from "../models/User.model.js";
import { PRODUCT_STATUS } from "../config/constants.js";
import {
  buildPagination,
  escapeRegex,
  toPositiveInt,
} from "../utils/adminQuery.js";

import { withCampusScope } from "./campusScope.service.js";

const { ObjectId } = mongoose.Types;

// Seller-name search matches at most this many accounts.
const MAX_SEARCH_SELLERS = 500;

export const getProducts = async (query = {}, scope = null) => {
  const page = toPositiveInt(query.page, 1);
  const limit = toPositiveInt(query.limit, 5, 50);
  const skip = (page - 1) * limit;

  const match = {};

  if (query.includeDeleted !== "true") {
    match.is_deleted = false;
  }

  if (query.status) {
    if (!Object.values(PRODUCT_STATUS).includes(query.status)) {
      throw new Error("Invalid product status filter");
    }
    match.status = query.status;
  }

  // "Needs review": listings auto-hidden by the report threshold.
  if (query.flag === "auto_hidden") {
    match.auto_hidden_at = { $type: "date" };
  }

  if (typeof query.campus === "string" && ObjectId.isValid(query.campus.trim())) {
    match.campus_id = new ObjectId(query.campus.trim());
  }

  if (query.category?.trim() && !query.category.includes("All")) {
    match.category = { $regex: new RegExp(`^${escapeRegex(query.category.trim())}$`, "i") };
  }

  // Search: title/category on the listing, or name/email of the seller.
  // Sellers are resolved once up front (capped) instead of joining every
  // listing to its seller just to filter.
  if (query.search?.trim()) {
    const searchText = query.search.trim();
    const safeSearch = escapeRegex(searchText);
    const sellerIds = await User.find({
      $or: [
        { name: { $regex: safeSearch, $options: "i" } },
        { email: { $regex: safeSearch, $options: "i" } },
      ],
    })
      .select("_id")
      .limit(MAX_SEARCH_SELLERS)
      .lean();
    match.$or = [
      { title: { $regex: safeSearch, $options: "i" } },
      { category: { $regex: safeSearch, $options: "i" } },
      ...(sellerIds.length ? [{ seller_id: { $in: sellerIds.map((u) => u._id) } }] : []),
      ...(ObjectId.isValid(searchText)
        ? [{ _id: new ObjectId(searchText) }, { seller_id: new ObjectId(searchText) }]
        : []),
    ];
  }

  // Filter + sort on indexes; seller and open-report lookups run only for
  // the page being returned.
  const pipeline = [
    { $match: withCampusScope(match, scope) },
    { $sort: { createdAt: -1, _id: -1 } },
    {
      $facet: {
        data: [
          { $skip: skip },
          { $limit: limit },
          {
            $lookup: {
              from: User.collection.name,
              localField: "seller_id",
              foreignField: "_id",
              pipeline: [{ $project: { name: 1, email: 1, avatar: 1 } }],
              as: "seller",
            },
          },
          { $unwind: { path: "$seller", preserveNullAndEmptyArrays: true } },
          {
            $lookup: {
              from: Report.collection.name,
              localField: "_id",
              foreignField: "target_id",
              pipeline: [{ $match: { target_model: "Product", status: "pending" } }, { $count: "count" }],
              as: "reportStats",
            },
          },
          {
            $project: {
              _id: 0,
              id: { $toString: "$_id" },
              product: "$title",
              title: 1,
              category: 1,
              status: 1,
              reports: { $ifNull: [{ $arrayElemAt: ["$reportStats.count", 0] }, 0] },
              created: "$createdAt",
              createdAt: 1,
              images: 1,
              price: "$selling_price",
              selling_price: 1,
              is_deleted: 1,
              auto_hidden_at: 1,
              auto_hidden_report_count: 1,
              seller: {
                id: { $toString: "$seller._id" },
                name: "$seller.name",
                email: "$seller.email",
                avatar: "$seller.avatar",
              },
              sellerId: { $toString: "$seller_id" },
            },
          },
        ],
        total: [{ $count: "count" }],
      },
    },
  ];

  // Per-status totals for the admin tabs: same filters, minus status.
  const { status: _ignoredStatus, ...matchWithoutStatus } = match;
  const countPipeline = [
    { $match: withCampusScope(matchWithoutStatus, scope) },
    { $group: { _id: "$status", count: { $sum: 1 } } },
  ];

  const [[result], statusRows] = await Promise.all([
    Product.aggregate(pipeline),
    Product.aggregate(countPipeline).catch(() => []),
  ]);
  const total = result?.total?.[0]?.count || 0;

  const statusCounts = { all: 0 };
  for (const row of statusRows) {
    if (!row._id) continue;
    statusCounts[row._id] = row.count;
    statusCounts.all += row.count;
  }

  return {
    data: result?.data || [],
    pagination: buildPagination(total, page, limit),
    statusCounts,
  };
};

export const updateProductStatus = async (productId, status) => {
  if (!ObjectId.isValid(productId)) {
    throw new Error("Invalid product id");
  }

  if (!Object.values(PRODUCT_STATUS).includes(status)) {
    throw new Error("Invalid product status");
  }

  const product = await Product.findOneAndUpdate(
    { _id: productId, is_deleted: false },
    { status },
    { new: true, runValidators: true },
  ).lean();

  if (!product) {
    throw new Error("Product not found");
  }

  return product;
};

export const softDeleteProduct = async (productId) => {
  if (!ObjectId.isValid(productId)) {
    throw new Error("Invalid product id");
  }

  const product = await Product.findOneAndUpdate(
    { _id: productId, is_deleted: false },
    { is_deleted: true },
    { new: true },
  ).lean();

  if (!product) {
    throw new Error("Product not found");
  }

  return product;
};

export const hardDeleteProduct = async (productId) => {
  if (!ObjectId.isValid(productId)) {
    throw new Error("Invalid product id");
  }

  const product = await Product.findById(productId).lean();

  if (!product) {
    throw new Error("Product not found");
  }

  // Best-effort ImageKit cleanup (never fails hard delete)
  const { deleteImageSafely } = await import("../utils/imagekit.js");
  const fileIds = Array.isArray(product.images)
    ? product.images.map((i) => i?.fileId).filter(Boolean)
    : [];
  // Skip files another live listing/avatar still points at.
  await Promise.allSettled(
    fileIds.map((id) =>
      deleteImageSafely(id, {
        ownerId: product.seller_id,
        excludeProductId: product._id,
      }),
    ),
  );

  await Promise.all([
    Product.deleteOne({ _id: productId }),
    Report.deleteMany({ target_id: new ObjectId(productId), target_model: "Product" }),
    User.updateMany(
      { wishlist: productId },
      {
        $pull: {
          wishlist: productId,
        },
      },
    ),
  ]);

  return { id: productId };
};
