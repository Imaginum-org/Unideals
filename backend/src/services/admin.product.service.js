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

const { ObjectId } = mongoose.Types;

export const getProducts = async (query = {}) => {
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

  const pipeline = [
    { $match: match },
    {
      $lookup: {
        from: "users",
        localField: "seller_id",
        foreignField: "_id",
        as: "seller",
      },
    },
    {
      $unwind: {
        path: "$seller",
        preserveNullAndEmptyArrays: true,
      },
    },
  ];

  if (query.search?.trim()) {
    const searchText = query.search.trim();
    const safeSearch = escapeRegex(searchText);
    pipeline.push({
      $match: {
        $or: [
          { title: { $regex: safeSearch, $options: "i" } },
          { category: { $regex: safeSearch, $options: "i" } },
          { "seller.name": { $regex: safeSearch, $options: "i" } },
          { "seller.email": { $regex: safeSearch, $options: "i" } },
          ...(ObjectId.isValid(searchText)
            ? [
                { _id: new ObjectId(searchText) },
                { seller_id: new ObjectId(searchText) },
              ]
            : []),
        ],
      },
    });
  }

  pipeline.push(
    {
      $lookup: {
        from: "reports",
        let: { productId: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$target_id", "$$productId"] },
                  { $eq: ["$target_model", "Product"] },
                ],
              },
              status: "pending",
            },
          },
          { $count: "count" },
        ],
        as: "reportStats",
      },
    },
    {
      $addFields: {
        reports: {
          $ifNull: [{ $arrayElemAt: ["$reportStats.count", 0] }, 0],
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
              product: "$title",
              title: 1,
              category: 1,
              status: 1,
              reports: 1,
              created: "$createdAt",
              createdAt: 1,
              images: 1,
              price: "$selling_price",
              selling_price: 1,
              is_deleted: 1,
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
  );

  const [result] = await Product.aggregate(pipeline);
  const total = result?.total?.[0]?.count || 0;

  return {
    data: result?.data || [],
    pagination: buildPagination(total, page, limit),
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
  const { deleteImage } = await import("../utils/imagekit.js");
  const fileIds = Array.isArray(product.images)
    ? product.images.map((i) => i?.fileId).filter(Boolean)
    : [];
  await Promise.allSettled(fileIds.map((id) => deleteImage(id)));

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
