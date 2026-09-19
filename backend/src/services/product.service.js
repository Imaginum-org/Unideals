import Product from "../models/Product.model.js";
import { PRODUCT_STATUS } from "../config/constants.js";
import { deleteImage } from "../utils/imagekit.js";

export const createProduct = async (data, user) => {
  // Strip privileged fields that must never be client-controlled.
  // Zod already strips unknown keys, this is defense-in-depth.
  delete data.seller_id;
  delete data.is_boosted;
  delete data.boost_expires_at;
  delete data.boost_tier;
  delete data.views_count;
  delete data.is_deleted;
  delete data.slug;
  delete data.location;
  delete data.meetup_location;

  // Campus pickup-spot model: snapshot carries only spot name/detail.
  // Drop empty optional snapshot fields so regex validators (pincode,
  // mobile) never trip on "" from legacy clients.
  if (data.pickup_address_snapshot && typeof data.pickup_address_snapshot === "object") {
    for (const key of ["state", "pincode", "mobile", "additional_info"]) {
      const val = data.pickup_address_snapshot[key];
      if (val === "" || val === undefined || val === null) {
        delete data.pickup_address_snapshot[key];
      } else if (typeof val === "string") {
        const trimmed = val.trim();
        if (!trimmed) delete data.pickup_address_snapshot[key];
        else data.pickup_address_snapshot[key] = trimmed;
      }
    }
  }

  if (
    data.status !== PRODUCT_STATUS.DRAFT &&
    (!data.images || data.images.length === 0)
  ) {
    throw new Error("Images are required");
  }

  const normalizedTitle = (data.title || "").trim().toLowerCase();
  const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  const safeTitle = escapeRegex(normalizedTitle);

  const FIVE_MINUTES_AGO = new Date(Date.now() - 5 * 60 * 1000);

  // Only run duplicate guard when we have a complete non-draft payload
  if (
    data.status !== PRODUCT_STATUS.DRAFT &&
    normalizedTitle &&
    data.category &&
    Number.isFinite(Number(data.selling_price))
  ) {
    const priceNum = Number(data.selling_price);
    const existingProduct = await Product.findOne({
      seller_id: user._id,
      status: PRODUCT_STATUS.LISTED,
      category: data.category,
      title: {
        $regex: `^${safeTitle}$`,
        $options: "i",
      },
      selling_price: {
        $gte: priceNum * 0.9,
        $lte: priceNum * 1.1,
      },
      createdAt: {
        $gte: FIVE_MINUTES_AGO,
      },
      is_deleted: false,
    });

    if (existingProduct) {
      throw new Error("You already listed a similar product recently.");
    }
  }

  data.seller_id = user._id;
  data.status = data.status || PRODUCT_STATUS.LISTED;
  data.is_deleted = false;

  if (user.current_lat != null && user.current_long != null) {
    data.location = {
      type: "Point",
      coordinates: [user.current_long, user.current_lat],
    };
  }

  if (data.attributes?.purchase_date) {
    const parsed = new Date(data.attributes.purchase_date);
    if (Number.isNaN(parsed.getTime())) {
      throw new Error("Invalid purchase date");
    }
    // Reject future dates
    if (parsed.getTime() > Date.now()) {
      throw new Error("Purchase date cannot be in the future");
    }
    data.attributes.purchase_date = parsed;
  } else if (data.attributes && data.attributes.purchase_date === null) {
    delete data.attributes.purchase_date;
  }

  if (data.original_price && data.selling_price > data.original_price) {
    throw new Error("Selling price cannot be greater than original price");
  }

  return await Product.create(data);
};

export const getBoostedProducts = async () => {
  const now = new Date();

  return await Product.find({
    is_boosted: true,
    boost_expires_at: { $gt: now },
    is_deleted: false,
    status: PRODUCT_STATUS.LISTED,
  })
    .sort({ boost_expires_at: -1 })
    .limit(10)
    .select(
      "title images selling_price original_price category createdAt is_boosted boost_expires_at boost_tier",
    )
    .populate("seller_id", "name avatar subscription")
    .lean();
};

export const getAllProducts = async (query) => {
  let {
    page = 1,
    limit = 10,
    search,
    category,
    condition,
    min_price,
    max_price,
    sort = "recommended",
  } = query;

  // Clamp pagination to prevent DoS via huge limit / negative skip
  page = Number.parseInt(page, 10);
  limit = Number.parseInt(limit, 10);
  if (!Number.isInteger(page) || page < 1) page = 1;
  if (!Number.isInteger(limit) || limit < 1) limit = 10;
  limit = Math.min(limit, 50);
  page = Math.min(page, 1000);

  const skip = (page - 1) * limit;
  const now = new Date();

  // Base filter
  const baseMatch = {
    is_deleted: false,
    status: PRODUCT_STATUS.LISTED,
  };

  if (typeof category === "string" && category) {
    baseMatch.category = category;
  }

  if (typeof condition === "string" && condition) {
    baseMatch.condition = condition;
  }

  if (min_price !== undefined || max_price !== undefined) {
    baseMatch.selling_price = {};

    if (min_price !== undefined && min_price !== "") {
      const minNum = Number(min_price);
      if (Number.isFinite(minNum)) baseMatch.selling_price.$gte = minNum;
    }

    if (max_price !== undefined && max_price !== "") {
      const maxNum = Number(max_price);
      if (Number.isFinite(maxNum)) baseMatch.selling_price.$lte = maxNum;
    }
    if (Object.keys(baseMatch.selling_price).length === 0) {
      delete baseMatch.selling_price;
    }
  }

  const pipeline = [{ $match: baseMatch }];

  const priceMetaPipeline = [
    {
      $match: baseMatch,
    },
  ];

  // SEARCH
  if (typeof search === "string" && search.trim()) {
    const sanitizedQuery = search.trim().slice(0, 100);

    const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    const safeQuery = escapeRegex(sanitizedQuery);

    pipeline.push({
      $match: {
        $or: [
          { title: { $regex: safeQuery, $options: "i" } },
          { description: { $regex: safeQuery, $options: "i" } },
        ],
      },
    });

    priceMetaPipeline.push({
      $match: {
        $or: [
          { title: { $regex: safeQuery, $options: "i" } },
          { description: { $regex: safeQuery, $options: "i" } },
        ],
      },
    });

    pipeline.push({
      $addFields: {
        relevanceScore: {
          $cond: [
            {
              $regexMatch: {
                input: "$title",
                regex: safeQuery,
                options: "i",
              },
            },
            10,
            1,
          ],
        },
      },
    });
  }

  // FEED SCORING
  pipeline.push(
    {
      $addFields: {
        hoursSinceCreated: {
          $divide: [{ $subtract: [now, "$createdAt"] }, 1000 * 60 * 60],
        },
      },
    },
    {
      $addFields: {
        recencyScore: {
          $divide: [1, { $add: ["$hoursSinceCreated", 1] }],
        },
        popularityScore: {
          $log10: { $add: ["$views_count", 1] },
        },
        trendingScore: {
          $cond: [{ $gt: ["$views_count", 20] }, 10, 0],
        },
      },
    },
    {
      $addFields: {
        score: {
          $add: [
            { $multiply: ["$recencyScore", 30] },
            { $multiply: ["$popularityScore", 10] },
            "$trendingScore",
          ],
        },
      },
    },
  );

  // SORT - whitelist to prevent injection
  const allowedSorts = ["recommended", "latest", "price_low", "price_high"];
  const safeSort = allowedSorts.includes(sort) ? sort : "recommended";
  const sortOptions = {
    recommended: {
      ...(typeof search === "string" && search.trim() ? { relevanceScore: -1 } : {}),
      score: -1,
      createdAt: -1,
    },

    latest: {
      createdAt: -1,
    },

    price_low: {
      selling_price: 1,
      createdAt: -1,
    },

    price_high: {
      selling_price: -1,
      createdAt: -1,
    },
  };

  pipeline.push({
    $sort: sortOptions[safeSort],
  });

  // PAGINATION
  pipeline.push({ $skip: skip }, { $limit: limit });

  // JOIN SELLER
  pipeline.push(
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
    {
      $project: {
        title: 1,
        description: 1,
        images: 1,
        selling_price: 1,
        original_price: 1,
        category: 1,
        attributes: 1,
        createdAt: 1,
        views_count: 1,
        is_boosted: 1,
        boost_expires_at: 1,
        boost_tier: 1,
        score: 1,

        "seller._id": 1,
        "seller.name": 1,
        "seller.avatar": 1,
        "seller.subscription": 1,
      },
    },
  );

  // Correct total count - only $match stages (avoids $unwind/$project on missing seller)
  const totalPipeline = pipeline.filter((stage) => stage.$match);

  priceMetaPipeline.push({
    $group: {
      _id: null,
      minPrice: {
        $min: "$selling_price",
      },
      maxPrice: {
        $max: "$selling_price",
      },
    },
  });

  const [products, totalResult, priceMeta] = await Promise.all([
    Product.aggregate(pipeline),
    Product.aggregate([...totalPipeline, { $count: "total" }]),
    Product.aggregate(priceMetaPipeline),
  ]);

  const total = totalResult[0]?.total || 0;

  const filterMeta = {
    price: {
      min: priceMeta[0]?.minPrice ?? 0,
      max: priceMeta[0]?.maxPrice ?? 0,
    },
  };

  return {
    data: products,

    pagination: {
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },

    filterMeta,
  };
};

export const getSingleProduct = async (id) => {
  const mongoose = await import("mongoose").then((m) => m.default);
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new Error("Product not found");
  }
  const product = await Product.findOneAndUpdate(
    { _id: id, is_deleted: false },
    { $inc: { views_count: 1 } },
    { new: true },
  )
    .populate("seller_id", "name avatar")
    .lean();

  if (!product) {
    throw new Error("Product not found");
  }

  return product;
};

export const getSearchSuggestions = async (query) => {
  if (typeof query !== "string") return [];
  const sanitizedQuery = query.trim().slice(0, 100).toLowerCase();
  if (sanitizedQuery.length < 2) return [];

  const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  const safeQuery = escapeRegex(sanitizedQuery);

  return await Product.find({
    is_deleted: false,
    status: PRODUCT_STATUS.LISTED,
    title: { $regex: safeQuery, $options: "i" },
  })
    .select("title slug images selling_price")
    .limit(6)
    .lean();
};

export const searchProducts = async (query) => {
  if (typeof query !== "string" || query.trim().length === 0) return [];

  const sanitizedQuery = query.trim().slice(0, 100).toLowerCase();

  const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  const safeQuery = escapeRegex(sanitizedQuery);

  const compactQuery = escapeRegex(sanitizedQuery.replace(/\s+/g, ""));
  const tokens = sanitizedQuery.split(/\s+/).map(escapeRegex);

  const now = new Date();

  const pipeline = [
    {
      $match: {
        is_deleted: false,
        status: PRODUCT_STATUS.LISTED,
      },
    },

    {
      $match: {
        $or: [
          { title: { $regex: safeQuery, $options: "i" } },
          { title: { $regex: compactQuery, $options: "i" } },
          { description: { $regex: safeQuery, $options: "i" } },
          { category: { $regex: safeQuery, $options: "i" } },

          ...tokens.map((token) => ({
            title: { $regex: token, $options: "i" },
          })),
        ],
      },
    },

    {
      $addFields: {
        relevanceScore: {
          $add: [
            {
              $cond: [
                {
                  $regexMatch: {
                    input: "$title",
                    regex: safeQuery,
                    options: "i",
                  },
                },
                10,
                0,
              ],
            },
          ],
        },
      },
    },

    // RECENCY
    {
      $addFields: {
        hoursSinceCreated: {
          $divide: [{ $subtract: [now, "$createdAt"] }, 1000 * 60 * 60],
        },
      },
    },
    {
      $addFields: {
        recencyScore: {
          $divide: [1, { $add: ["$hoursSinceCreated", 1] }],
        },
      },
    },

    {
      $addFields: {
        finalScore: {
          $add: ["$relevanceScore", { $multiply: ["$recencyScore", 30] }],
        },
      },
    },

    {
      $sort: {
        finalScore: -1,
        createdAt: -1,
      },
    },

    { $limit: 20 },

    {
      $project: {
        title: 1,
        images: 1,
        selling_price: 1,
        category: 1,
        createdAt: 1,
      },
    },
  ];

  return await Product.aggregate(pipeline);
};

// GET USER PRODUCTS
export const getUserProducts = async (userId) => {
  return await Product.find({
    seller_id: userId,
    is_deleted: false,
  })
    .sort({ createdAt: -1 })
    .lean();
};

// SOFT DELETE PRODUCT
export const deleteProduct = async (productId, userId) => {
  const product = await Product.findOne({
    _id: productId,
    seller_id: userId,
  });

  if (!product) {
    throw new Error(
      "Product not found or you don't have permission to delete it",
    );
  }

  if (product.is_deleted) {
    throw new Error("Product is already deleted");
  }

  // Delete all uploaded images from ImageKit
  await Promise.all(
    product.images
      .filter((image) => image.fileId)
      .map((image) => deleteImage(image.fileId)),
  );

  // Soft delete product
  product.is_deleted = true;

  return await product.save();
};;

// UNLIST PRODUCT
export const unlistProduct = async (productId, userId) => {
  const product = await Product.findOne({
    _id: productId,
    seller_id: userId,
    is_deleted: false,
  });

  if (!product) {
    throw new Error(
      "Product not found or you don't have permission to unlist it",
    );
  }

  if (product.status === PRODUCT_STATUS.UNLISTED) {
    return product;
  }

  product.status = PRODUCT_STATUS.UNLISTED;
  return await product.save();
};

// RELIST PRODUCT
export const relistProduct = async (productId, userId) => {
  const product = await Product.findOne({
    _id: productId,
    seller_id: userId,
    is_deleted: false,
  });

  if (!product) {
    throw new Error(
      "Product not found or you don't have permission to relist it",
    );
  }

  if (product.status === PRODUCT_STATUS.LISTED) {
    return product;
  }

  product.status = PRODUCT_STATUS.LISTED;
  return await product.save();
};

export const getMyDraftProducts = async (userId) => {
  return await Product.find({
    seller_id: userId,

    status: PRODUCT_STATUS.DRAFT,

    is_deleted: false,
  })
    .sort({ updatedAt: -1 })
    .lean();
};
