import Product from "../models/Product.model.js";
import { PRODUCT_STATUS } from "../config/constants.js";
import { deleteImage } from "../utils/imagekit.js";

export const createProduct = async (data, user) => {
  if (
    data.status !== PRODUCT_STATUS.DRAFT &&
    (!data.images || data.images.length === 0)
  ) {
    throw new Error("Images are required");
  }

  const normalizedTitle = data.title.trim().toLowerCase();
  const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  const safeTitle = escapeRegex(normalizedTitle);

  const FIVE_MINUTES_AGO = new Date(Date.now() - 5 * 60 * 1000);

  const existingProduct = await Product.findOne({
    seller_id: user._id,
    status: PRODUCT_STATUS.LISTED,
    category: data.category,
    title: {
      $regex: `^${safeTitle}$`,
      $options: "i",
    },
    selling_price: {
      $gte: data.selling_price * 0.9,
      $lte: data.selling_price * 1.1,
    },
    createdAt: {
      $gte: FIVE_MINUTES_AGO,
    },
    is_deleted: false,
  });

  if (existingProduct) {
    throw new Error("You already listed a similar product recently.");
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
    data.attributes.purchase_date = new Date(data.attributes.purchase_date);
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
  const {
    page = 1,
    limit = 10,
    search,
    category,
    condition,
    min_price,
    max_price,
    sort = "recommended",
  } = query;

  const skip = (Number(page) - 1) * Number(limit);
  const now = new Date();

  // Base filter
  const baseMatch = {
    is_deleted: false,
    status: PRODUCT_STATUS.LISTED,
  };

  if (category) {
    baseMatch.category = category;
  }

  if (condition) {
    baseMatch.condition = condition;
  }

  if (min_price || max_price) {
    baseMatch.selling_price = {};

    if (min_price !== undefined && min_price !== "") {
      baseMatch.selling_price.$gte = Number(min_price);
    }

    if (max_price !== undefined && max_price !== "") {
      baseMatch.selling_price.$lte = Number(max_price);
    }
  }

  const pipeline = [{ $match: baseMatch }];

  const priceMetaPipeline = [
    {
      $match: baseMatch,
    },
  ];

  // SEARCH
  if (search) {
    const sanitizedQuery = search.trim();

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

  // SORT
  const sortOptions = {
    recommended: {
      ...(search ? { relevanceScore: -1 } : {}),
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
    $sort: sortOptions[sort] || sortOptions.recommended,
  });

  // PAGINATION
  pipeline.push({ $skip: skip }, { $limit: Number(limit) });

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
        location: 1,
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

  // Correct total count
  const totalPipeline = pipeline.filter(
    (stage) => !stage.$skip && !stage.$limit && !stage.$lookup,
  );

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
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / limit),
    },

    filterMeta,
  };
};

export const getSingleProduct = async (id) => {
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
  const sanitizedQuery = query.trim().toLowerCase();

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
  if (!query || query.trim().length === 0) return [];

  const sanitizedQuery = query.trim().toLowerCase();

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
  });

  if (!product) {
    throw new Error(
      "Product not found or you don't have permission to unlist it",
    );
  }

  product.status = PRODUCT_STATUS.UNLISTED;
  return await product.save();
};

// RELIST PRODUCT
export const relistProduct = async (productId, userId) => {
  const product = await Product.findOne({
    _id: productId,
    seller_id: userId,
  });

  if (!product) {
    throw new Error(
      "Product not found or you don't have permission to relist it",
    );
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
