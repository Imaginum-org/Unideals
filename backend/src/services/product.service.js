import Product from "../models/Product.model.js";
import Campus from "../models/Campus.model.js";
import mongoose from "mongoose";
import {
  PRODUCT_STATUS,
  PRODUCT_CATEGORIES,
  PRODUCT_CATEGORY_LABELS,
} from "../config/constants.js";
import { getListingLimit } from "../config/subscriptionPlans.js";
import { deleteImage } from "../utils/imagekit.js";

const campusError = (statusCode, message, code) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  if (code) error.code = code;
  return error;
};

// ---- Marketplace hardening helpers (production-safe, no new deps) ----

// Price guards (defense-in-depth alongside zod): floor ₹10, original cap
// kept at 10M by validation, discount max 90% off.
const assertPriceGuards = (sellingPrice, originalPrice) => {
  if (sellingPrice != null && sellingPrice !== "" && Number(sellingPrice) < 10) {
    throw campusError(400, "Selling price must be at least ₹10.", "INVALID_PRICE");
  }
  if (
    originalPrice != null &&
    originalPrice !== "" &&
    sellingPrice != null &&
    sellingPrice !== "" &&
    Number(sellingPrice) < Number(originalPrice) * 0.1
  ) {
    throw campusError(
      400,
      "Discount cannot exceed 90% of the original price.",
      "INVALID_DISCOUNT",
    );
  }
};

// Image host pin: only our ImageKit endpoint is servable. Read at call time
// so env rotation needs no restart logic beyond the process env.
const assertImageHost = (images) => {
  if (!Array.isArray(images) || images.length === 0) return;
  const endpoint = process.env.IMAGEKIT_URL_ENDPOINT;
  if (!endpoint) return; // unconfigured env: zod https+length checks still apply
  for (const image of images) {
    if (image?.url && !String(image.url).startsWith(endpoint)) {
      throw campusError(400, "Image host not allowed.", "INVALID_IMAGE_HOST");
    }
  }
};

// Phone/room-level detail leak guard for the pickup snapshot.
const UNSAFE_ADDRESS_RE = /\d{10}|\broom\b|\bflat\b|house\s*no|door\s*no/i;

// Snapshot must reference one of the seller's saved public spots
// (name -> address_line, detail -> city). Non-matching snapshots are still
// allowed (legacy/manual flows) unless they carry phone-like or
// room/flat-level private detail.
const assertPickupSnapshot = async (snapshot, userId) => {
  if (!snapshot || typeof snapshot !== "object") return;
  const addressLine = String(snapshot.address_line || "").trim();
  const city = String(snapshot.city || "").trim();
  if (!addressLine && !city) return;
  try {
    const { default: PickupSpot } = await import("../models/PickupSpot.model.js");
    const spots = await PickupSpot.find({ user: userId }).select("name detail").lean();
    const norm = (s) => String(s || "").trim().toLowerCase();
    const matched = spots.some(
      (spot) => norm(spot.name) === norm(addressLine) && norm(spot.detail) === norm(city),
    );
    if (matched) return;
  } catch {
    // Lookup failure falls through to the unsafe-pattern screen below.
  }
  const haystack = [addressLine, city, snapshot.additional_info, snapshot.state]
    .filter((v) => typeof v === "string" && v)
    .join(" ");
  if (UNSAFE_ADDRESS_RE.test(haystack)) {
    throw campusError(400, "Use public campus spot only.", "UNSAFE_ADDRESS");
  }
};

// Best-effort boost revocation shared by unlist/delete/sold paths.
const revokeBoostsForProduct = async (productId) => {
  try {
    const { default: Boost } = await import("../models/Boost.model.js");
    await Boost.deleteMany({ product_id: productId, status: "active" });
  } catch {
    // best-effort: product state transition must never fail on boost cleanup
  }
};

// Every public query must be campus-scoped. The campus ObjectId is required
// so a missing campus fails loudly instead of leaking cross-campus data.
const requireCampusId = (campusId) => {
  if (!campusId) {
    throw campusError(
      400,
      "Campus is required. Please pick your campus.",
      "CAMPUS_REQUIRED",
    );
  }
  return new mongoose.Types.ObjectId(campusId);
};

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
  // Campus is never client-controlled — stamped from the seller below.
  delete data.campus_id;

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

  // Service-level price + host guards (mirror zod, fail with codes).
  assertPriceGuards(data.selling_price, data.original_price);
  assertImageHost(data.images);
  await assertPickupSnapshot(data.pickup_address_snapshot, user._id);

  if (
    data.status !== PRODUCT_STATUS.DRAFT &&
    (!data.images || data.images.length === 0)
  ) {
    throw new Error("Images are required");
  }

  const normalizedTitle = (data.title || "").trim().toLowerCase();
  const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  const safeTitle = escapeRegex(normalizedTitle);

  // Repost cooldown: same seller + title + category within 24h at a similar
  // price (±10%) is a recency-farm duplicate.
  const TWENTY_FOUR_HOURS_AGO = new Date(Date.now() - 24 * 60 * 60 * 1000);

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
        $gte: TWENTY_FOUR_HOURS_AGO,
      },
      is_deleted: false,
    });

    if (existingProduct) {
      throw campusError(
        400,
        "You already listed a similar product recently.",
        "DUPLICATE_LISTING",
      );
    }
  }

  data.seller_id = user._id;
  // Defense-in-depth alongside the zod whitelist: privileged states are
  // never client-settable (prevents limit bypass via status:"sold").
  if (data.status && ![PRODUCT_STATUS.DRAFT, PRODUCT_STATUS.LISTED].includes(data.status)) {
    throw campusError(400, "Invalid listing status.", "INVALID_STATUS");
  }
  data.status = data.status || PRODUCT_STATUS.LISTED;
  data.is_deleted = false;

  // Draft cap: at most 50 open drafts per seller (storage/UX bound).
  if (data.status === PRODUCT_STATUS.DRAFT) {
    const draftCount = await Product.countDocuments({
      seller_id: user._id,
      status: PRODUCT_STATUS.DRAFT,
      is_deleted: false,
    });
    if (draftCount >= 50) {
      throw campusError(
        403,
        "Draft limit reached (50 drafts). Publish or delete old drafts first.",
        "DRAFT_LIMIT",
      );
    }
  }

  // Listings belong to the seller's campus. Campus-less accounts pass the
  // onboarding gate first, so this is a guardrail, not a flow.
  const sellerCampusId = user.campus_id?._id || user.campus_id;
  if (!sellerCampusId) {
    throw campusError(
      400,
      "Campus is required. Please pick your campus first.",
      "CAMPUS_REQUIRED",
    );
  }
  const campus = await Campus.findById(sellerCampusId).select("is_active").lean();
  if (!campus || !campus.is_active) {
    throw campusError(
      400,
      "Your campus is unavailable. Please pick your campus again.",
      "CAMPUS_INACTIVE",
    );
  }
  data.campus_id = campus._id;

  // Plan entitlement: cap active (listed, visible) listings per tier.
  // Drafts never count. null limit = unlimited (Pro+).
  if (data.status === PRODUCT_STATUS.LISTED) {
    const listingLimit = getListingLimit(user.subscription);
    if (typeof listingLimit === "number") {
      const activeCount = await Product.countDocuments({
        seller_id: user._id,
        status: PRODUCT_STATUS.LISTED,
        is_deleted: false,
      });
      if (activeCount >= listingLimit) {
        const error = new Error(
          `Listing limit reached (${listingLimit} active listings on your plan). Upgrade to list more.`,
        );
        error.statusCode = 403;
        error.code = "LISTING_LIMIT";
        throw error;
      }
    }
  }

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

  if (data.quantity !== undefined) {
    const qty = Number(data.quantity);
    if (!Number.isInteger(qty) || qty < 1 || qty > 99) {
      throw campusError(400, "Quantity must be between 1 and 99.", "INVALID_QUANTITY");
    }
    data.quantity = qty;
  }

  // Normalize legal consent timestamp (ISO string -> Date; invalid dropped).
  if (data.terms_accepted_at !== undefined && data.terms_accepted_at !== null) {
    const parsed = new Date(data.terms_accepted_at);
    if (!Number.isNaN(parsed.getTime())) {
      data.terms_accepted_at = parsed;
    } else {
      delete data.terms_accepted_at;
    }
  } else if (data.terms_accepted_at === null) {
    delete data.terms_accepted_at;
  }

  const created = await Product.create(data);

  // Atomic post-check (race guard, same pattern as boost): a parallel
  // request may have filled the last plan slot between the pre-check and
  // this insert. Roll back the over-cap insert instead of overserving.
  if (created.status === PRODUCT_STATUS.LISTED) {
    const listingLimit = getListingLimit(user.subscription);
    if (typeof listingLimit === "number") {
      const activeCount = await Product.countDocuments({
        seller_id: user._id,
        status: PRODUCT_STATUS.LISTED,
        is_deleted: false,
      });
      if (activeCount > listingLimit) {
        await Product.deleteOne({ _id: created._id });
        throw campusError(
          403,
          `Listing limit reached (${listingLimit} active listings on your plan). Upgrade to list more.`,
          "LISTING_LIMIT",
        );
      }
    }
  }

  return created;
};

export const getBoostedProducts = async (campusId) => {
  const now = new Date();

  return await Product.find({
    campus_id: requireCampusId(campusId),
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

export const getAllProducts = async (query, campusId) => {
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

  // Base filter — campus first: legacy campus-less listings are excluded
  // from every feed (their sellers assign campus via the onboarding gate).
  const baseMatch = {
    campus_id: requireCampusId(campusId),
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

// View anti-farm: at most 1 counted view per product per IP per 10 min.
// In-memory Map (single-process best-effort; a restart only resets the
// cooldown, never corrupts counts). Bounded to avoid memory growth.
const viewCooldown = new Map();
const VIEW_COOLDOWN_MS = 10 * 60 * 1000;

const shouldCountView = (productId, clientIp) => {
  if (!clientIp) return true;
  const key = `${String(productId)}:${String(clientIp)}`;
  const now = Date.now();
  const last = viewCooldown.get(key);
  if (last && now - last < VIEW_COOLDOWN_MS) return false;
  viewCooldown.set(key, now);
  if (viewCooldown.size > 5000) {
    for (const [k, at] of viewCooldown) {
      if (now - at >= VIEW_COOLDOWN_MS) viewCooldown.delete(k);
      if (viewCooldown.size <= 4000) break;
    }
  }
  return true;
};

export const getSingleProduct = async (id, campusId, requesterId = null, clientIp = null) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new Error("Product not found");
  }
  const viewerCampusId = requireCampusId(campusId);

  // Read first so cross-campus views never increment views_count.
  const product = await Product.findOne({ _id: id, is_deleted: false })
    .populate("seller_id", "name avatar subscription")
    .populate("campus_id", "slug name short_name")
    .lean();

  if (!product) {
    throw new Error("Product not found");
  }

  // Legacy campus-less listings and other-campus listings are invisible.
  if (
    !product.campus_id ||
    product.campus_id._id.toString() !== viewerCampusId.toString()
  ) {
    throw campusError(
      404,
      "This product is not available at your campus.",
      "CAMPUS_MISMATCH",
    );
  }

  // Anti-farm: the seller's own views never count, and each IP counts at
  // most once per product per 10 minutes.
  const sellerIdStr = String(product.seller_id?._id || product.seller_id || "");
  const isOwnerView = !!requesterId && sellerIdStr && String(requesterId) === sellerIdStr;
  if (!isOwnerView && shouldCountView(id, clientIp)) {
    await Product.updateOne({ _id: id }, { $inc: { views_count: 1 } });
    product.views_count = (product.views_count || 0) + 1;
  }

  // Pickup snapshot carries seller mobile/pincode — visible to the owner
  // only. Buyers keep the public meetup fields (spot name/city).
  const sellerId = product.seller_id?._id || product.seller_id;
  if (!requesterId || String(sellerId) !== String(requesterId)) {
    if (product.pickup_address_snapshot) {
      delete product.pickup_address_snapshot.mobile;
      delete product.pickup_address_snapshot.pincode;
    }
  }

  return product;
};

export const getSearchSuggestions = async (query, campusId) => {
  if (typeof query !== "string") return [];
  const sanitizedQuery = query.trim().slice(0, 100).toLowerCase();
  if (sanitizedQuery.length < 2) return [];

  const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  const safeQuery = escapeRegex(sanitizedQuery);

  return await Product.find({
    campus_id: requireCampusId(campusId),
    is_deleted: false,
    status: PRODUCT_STATUS.LISTED,
    title: { $regex: safeQuery, $options: "i" },
  })
    .select("title slug images selling_price")
    .limit(6)
    .lean();
};

const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Typo tolerance: single adjacent transpositions per token ("laptpo" ->
// "laptop"). Bounded: tokens capped, only tokens with 4+ chars qualify.
const transpositionVariants = (token) => {
  const variants = new Set();
  if (token.length >= 4 && token.length <= 20) {
    for (let i = 0; i < token.length - 1; i++) {
      const chars = token.split("");
      [chars[i], chars[i + 1]] = [chars[i + 1], chars[i]];
      const swapped = chars.join("");
      if (swapped !== token) variants.add(escapeRegex(swapped));
    }
  }
  return [...variants].slice(0, 8);
};

// Campus-marketplace synonym groups (bidirectional). Query terms expand to
// group members so "mobile" finds "phone" listings and vice versa.
const SYNONYM_GROUPS = [
  ["laptop", "notebook", "macbook", "thinkpad"],
  ["mobile", "phone", "smartphone", "iphone"],
  ["cycle", "bicycle", "bike"],
  ["book", "textbook", "novel", "notes"],
  ["bottle", "flask", "sipper"],
  ["bag", "backpack", "rucksack"],
  ["headphones", "headphone", "earphones", "earbuds", "headset"],
  ["shoes", "shoe", "sneakers", "footwear"],
  ["watch", "smartwatch"],
  ["calculator", "calc"],
  ["charger", "adapter"],
  ["mouse", "keyboard", "monitor", "speaker"],
  ["jersey", "tshirt", "t-shirt"],
  ["bat", "ball", "racket", "dumbbell"],
  ["mattress", "matress", "bedding"],
  ["lamp", "lantern"],
  ["kettle", "iron", "heater"],
  ["guitar", "instrument"],
  ["coat", "apron"],
  ["table", "chair", "stool"],
];

const synonymVariants = (tokens) => {
  const out = new Set();
  const lowered = tokens.map((t) => t.toLowerCase());
  for (const group of SYNONYM_GROUPS) {
    if (lowered.some((t) => group.includes(t))) {
      for (const member of group) {
        if (!lowered.includes(member)) out.add(escapeRegex(member));
      }
    }
    if (out.size >= 20) break;
  }
  return [...out].slice(0, 20);
};

// Naive stemming assist: plural-stripped variant ("books" -> "book").
// Singular queries already substring-match plurals, so one direction suffices.
const stemVariants = (tokens) => {
  const out = new Set();
  for (const raw of tokens) {
    const t = raw.toLowerCase();
    if (t.length > 4 && t.endsWith("s") && !t.endsWith("ss")) {
      out.add(escapeRegex(t.slice(0, -1)));
    }
  }
  return [...out].slice(0, 5);
};

// Category intelligence: detect category values/labels mentioned in the
// query ("study material" <-> "study_material") so category intent ranks
// and is exposed to clients for shortcut chips.
const detectCategories = (sanitizedQuery) => {
  const normalized = sanitizedQuery.toLowerCase();
  const squashed = normalized.replace(/[\s_]+/g, "");
  const found = [];
  for (const value of Object.values(PRODUCT_CATEGORIES)) {
    const label = (PRODUCT_CATEGORY_LABELS[value] || "").toLowerCase();
    const valueSquashed = value.replace(/_/g, "");
    const labelSquashed = label.replace(/[\s_]+/g, "");
    if (
      (value.length >= 4 && normalized.includes(value.replace(/_/g, " "))) ||
      (label.length >= 4 && normalized.includes(label)) ||
      (valueSquashed.length >= 6 && squashed.includes(valueSquashed)) ||
      (labelSquashed.length >= 6 && squashed.includes(labelSquashed))
    ) {
      found.push({ value, label: PRODUCT_CATEGORY_LABELS[value] || value });
    }
  }
  return found.slice(0, 3);
};

export const searchProducts = async (queryOrOptions = {}, campusId) => {
  const options =
    typeof queryOrOptions === "string" ? { q: queryOrOptions } : queryOrOptions || {};
  const {
    q: query,
    sort = "relevant",
    category,
    condition,
    min_price,
    max_price,
  } = options;
  let { page = 1, limit = 20 } = options;

  page = Number.parseInt(page, 10);
  limit = Number.parseInt(limit, 10);
  if (!Number.isInteger(page) || page < 1) page = 1;
  if (!Number.isInteger(limit) || limit < 1) limit = 20;
  limit = Math.min(limit, 50);
  page = Math.min(page, 1000);
  const skip = (page - 1) * limit;

  if (typeof query !== "string" || query.trim().length === 0) {
    return {
      products: [],
      pagination: { total: 0, page, limit, totalPages: 1 },
    };
  }

  const sanitizedQuery = query.trim().slice(0, 100).toLowerCase();

  const safeQuery = escapeRegex(sanitizedQuery);

  const compactQuery = escapeRegex(sanitizedQuery.replace(/\s+/g, ""));
  const rawTokens = sanitizedQuery.split(/\s+/).slice(0, 5);
  const tokens = rawTokens.map(escapeRegex);
  const typoVariants = [
    ...new Set(tokens.flatMap(transpositionVariants)),
  ].slice(0, 12);
  // Similar-meaning + stemming expansion for the fallback matcher.
  const synonymClauses = synonymVariants(rawTokens);
  const stemClauses = stemVariants(rawTokens);
  const matchedCategories = detectCategories(sanitizedQuery);

  const now = new Date();

  // Base visibility filter + whitelisted facet filters.
  const baseMatch = {
    campus_id: requireCampusId(campusId),
    is_deleted: false,
    status: PRODUCT_STATUS.LISTED,
  };
  if (typeof category === "string" && category) {
    baseMatch.category = category;
  }
  if (typeof condition === "string" && condition) {
    baseMatch.condition = condition;
  }
  const priceRange = {};
  if (min_price !== undefined && min_price !== "") {
    const minNum = Number(min_price);
    if (Number.isFinite(minNum)) priceRange.$gte = minNum;
  }
  if (max_price !== undefined && max_price !== "") {
    const maxNum = Number(max_price);
    if (Number.isFinite(maxNum)) priceRange.$lte = maxNum;
  }
  if (Object.keys(priceRange).length > 0) {
    baseMatch.selling_price = priceRange;
  }

  // Speed: indexed $text first pass scopes candidates (stemming included).
  // Falls back to the full set when $text finds nothing (typos live there).
  let matchScope = baseMatch;
  if (sanitizedQuery.length >= 2) {
    try {
      const textSearch = sanitizedQuery.replace(/[-"\\]/g, " ").slice(0, 100);
      const textIds = await Product.find(
        { ...baseMatch, $text: { $search: textSearch } },
        { _id: 1 },
      )
        .limit(500)
        .lean();
      if (textIds.length > 0) {
        matchScope = { ...baseMatch, _id: { $in: textIds.map((d) => d._id) } };
      }
    } catch {
      // Malformed $text input or missing index: full regex scan below.
    }
  }

  const relevanceAdds = [
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
  ];
  // $or requires at least one clause — only score typos when variants exist.
  if (typoVariants.length > 0) {
    relevanceAdds.push({
      $cond: [
        {
          $or: typoVariants.map((variant) => ({
            $regexMatch: { input: "$title", regex: variant, options: "i" },
          })),
        },
        4,
        0,
      ],
    });
  }
  // Similar-meaning (+2) and explicit category intent (+6) scoring.
  if (synonymClauses.length > 0) {
    relevanceAdds.push({
      $cond: [
        {
          $or: synonymClauses.map((syn) => ({
            $regexMatch: { input: "$title", regex: syn, options: "i" },
          })),
        },
        2,
        0,
      ],
    });
  }
  if (matchedCategories.length > 0) {
    relevanceAdds.push({
      $cond: [
        {
          $in: [
            "$category",
            matchedCategories.map((c) => c.value),
          ],
        },
        6,
        0,
      ],
    });
  }

  const pipeline = [
    { $match: matchScope },

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

          ...typoVariants.map((variant) => ({
            title: { $regex: variant, $options: "i" },
          })),

          ...synonymClauses.map((syn) => ({
            title: { $regex: syn, $options: "i" },
          })),

          ...stemClauses.map((stem) => ({
            title: { $regex: stem, $options: "i" },
          })),
        ],
      },
    },

    {
      $addFields: {
        relevanceScore: { $add: relevanceAdds },
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
  ];

  const allowedSorts = ["relevant", "latest", "price_low", "price_high"];
  const safeSort = allowedSorts.includes(sort) ? sort : "relevant";
  const sortStage = {
    relevant: { finalScore: -1, createdAt: -1 },
    latest: { createdAt: -1 },
    price_low: { selling_price: 1, createdAt: -1 },
    price_high: { selling_price: -1, createdAt: -1 },
  }[safeSort];

  pipeline.push({ $sort: sortStage });
  pipeline.push({ $skip: skip }, { $limit: limit });

  pipeline.push(
    {
      $project: {
        title: 1,
        images: 1,
        selling_price: 1,
        original_price: 1,
        category: 1,
        condition: 1,
        createdAt: 1,
        is_boosted: 1,
        boost_tier: 1,
      },
    },
  );

  // Total from match stages only (same pattern as the feed).
  const totalPipeline = pipeline.filter((stage) => stage.$match);
  const [products, totalResult] = await Promise.all([
    Product.aggregate(pipeline),
    Product.aggregate([...totalPipeline, { $count: "total" }]),
  ]);
  const total = totalResult[0]?.total || 0;

  return {
    products,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
    matchedCategories,
  };
};

// Trending searches fallback: most-viewed live listings, cached 10 minutes
// per campus (a global cache would leak one campus's trends into another's).
const trendingCache = new Map();
const TRENDING_TTL_MS = 10 * 60 * 1000;

export const getTrendingProducts = async (limit = 8, campusId) => {
  const campusObjectId = requireCampusId(campusId);
  const cacheKey = campusObjectId.toString();
  const now = Date.now();
  const cached = trendingCache.get(cacheKey);
  if (cached && cached.data.length > 0 && now - cached.at < TRENDING_TTL_MS) {
    return cached.data.slice(0, limit);
  }
  const products = await Product.find({
    campus_id: campusObjectId,
    is_deleted: false,
    status: PRODUCT_STATUS.LISTED,
  })
    .select("title images selling_price category views_count")
    .sort({ views_count: -1, createdAt: -1 })
    .limit(8)
    .lean();
  trendingCache.set(cacheKey, { data: products, at: now });
  // Bound memory: campuses are few, but never grow unbounded.
  if (trendingCache.size > 100) trendingCache.clear();
  return products.slice(0, limit);
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
export const deleteProduct = async (productId, userId) => {  const product = await Product.findOne({
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

  // Delete all uploaded images from ImageKit (best-effort, never fails request)
  await Promise.allSettled(
    product.images
      .filter((image) => image.fileId)
      .map((image) => deleteImage(image.fileId)),
  );

  // Soft delete product + revoke any live boost exposure.
  product.is_deleted = true;
  product.is_boosted = false;
  product.boost_expires_at = undefined;
  product.boost_tier = undefined;
  const saved = await product.save();
  await revokeBoostsForProduct(product._id);
  return saved;
};

// UPDATE PRODUCT (owner only). Editable: title/desc/prices/images/
// attributes/quantity/pickup snapshot. Listing-cap re-check is NOT needed
// for edits (no new active slot), but price floor/gap + image host pin are
// re-validated. Status changes go through dedicated transitions.
export const updateProduct = async (productId, userId, data = {}) => {
  // Strip privileged/server-controlled fields (defense-in-depth).
  delete data.seller_id;
  delete data.is_boosted;
  delete data.boost_expires_at;
  delete data.boost_tier;
  delete data.views_count;
  delete data.is_deleted;
  delete data.slug;
  delete data.location;
  delete data.campus_id;
  delete data.status;

  const product = await Product.findOne({
    _id: productId,
    seller_id: userId,
    is_deleted: false,
  });

  if (!product) {
    throw new Error("Product not found or you don't have permission to edit it");
  }

  const ALLOWED = new Set([
    "title",
    "description",
    "category",
    "condition",
    "selling_price",
    "original_price",
    "is_negotiable",
    "payment_preference",
    "images",
    "attributes",
    "pickup_address_snapshot",
    "quantity",
    "terms_version",
    "terms_accepted_at",
  ]);
  const updates = {};
  for (const key of Object.keys(data)) {
    if (ALLOWED.has(key) && data[key] !== undefined) updates[key] = data[key];
  }
  // Normalize terms_accepted_at (ISO string -> Date; null clears).
  if (updates.terms_accepted_at !== undefined) {
    if (updates.terms_accepted_at === null) {
      delete updates.terms_accepted_at;
    } else {
      const parsed = new Date(updates.terms_accepted_at);
      if (!Number.isNaN(parsed.getTime())) {
        updates.terms_accepted_at = parsed;
      } else {
        delete updates.terms_accepted_at;
      }
    }
  }

  if (updates.attributes?.purchase_date) {
    const parsed = new Date(updates.attributes.purchase_date);
    if (Number.isNaN(parsed.getTime())) {
      throw new Error("Invalid purchase date");
    }
    if (parsed.getTime() > Date.now()) {
      throw new Error("Purchase date cannot be in the future");
    }
    updates.attributes.purchase_date = parsed;
  } else if (updates.attributes && updates.attributes.purchase_date === null) {
    delete updates.attributes.purchase_date;
  }

  // Price guards on the merged (existing + incoming) values.
  const mergedSelling = updates.selling_price ?? product.selling_price;
  const mergedOriginal = updates.original_price ?? product.original_price;
  assertPriceGuards(mergedSelling, mergedOriginal);
  if (mergedOriginal && mergedSelling > mergedOriginal) {
    throw new Error("Selling price cannot be greater than original price");
  }
  assertImageHost(updates.images);
  await assertPickupSnapshot(updates.pickup_address_snapshot, userId);

  if (updates.quantity !== undefined) {
    const qty = Number(updates.quantity);
    if (!Number.isInteger(qty) || qty < 1 || qty > 99) {
      throw campusError(400, "Quantity must be between 1 and 99.", "INVALID_QUANTITY");
    }
    updates.quantity = qty;
  }

  Object.assign(product, updates);
  try {
    return await product.save();
  } catch (err) {
    // Incomplete/invalid edit payloads are client errors, not 500s.
    if (err?.name === "ValidationError") {
      err.statusCode = 400;
    }
    throw err;
  }
};

// MARK SOLD (owner only): listed → sold, boost exposure cleared.
export const markProductSold = async (productId, userId) => {
  const product = await Product.findOne({
    _id: productId,
    seller_id: userId,
    is_deleted: false,
  });

  if (!product) {
    throw new Error("Product not found or you don't have permission to edit it");
  }

  if (product.status === PRODUCT_STATUS.SOLD) {
    return product;
  }

  if (product.status !== PRODUCT_STATUS.LISTED) {
    throw campusError(
      400,
      "Only active listed products can be marked as sold.",
      "INVALID_STATUS_TRANSITION",
    );
  }

  product.status = PRODUCT_STATUS.SOLD;
  product.is_boosted = false;
  product.boost_expires_at = undefined;
  product.boost_tier = undefined;
  const saved = await product.save();
  await revokeBoostsForProduct(product._id);
  return saved;
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
  // Unlisted listings lose all boost exposure immediately.
  product.is_boosted = false;
  product.boost_expires_at = undefined;
  product.boost_tier = undefined;
  const saved = await product.save();
  await revokeBoostsForProduct(product._id);
  return saved;
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

  const prevStatus = product.status;

  // Relisting reactivates against the plan cap — same rule as creation.
  const { default: UserModel } = await import("../models/User.model.js");
  const owner = await UserModel.findById(product.seller_id)
    .select("subscription")
    .lean();
  const listingLimit = getListingLimit(owner?.subscription);
  if (typeof listingLimit === "number") {
    const activeCount = await Product.countDocuments({
      seller_id: product.seller_id,
      status: PRODUCT_STATUS.LISTED,
      is_deleted: false,
    });
    if (activeCount >= listingLimit) {
      const error = new Error(
        `Listing limit reached (${listingLimit} active listings on your plan). Upgrade to list more.`,
      );
      error.statusCode = 403;
      error.code = "LISTING_LIMIT";
      throw error;
    }
  }

  product.status = PRODUCT_STATUS.LISTED;
  let saved;
  try {
    saved = await product.save();
  } catch (err) {
    // Drafts missing required listing fields fail validation on relist —
    // that is a client error (incomplete draft), not a 500.
    if (err?.name === "ValidationError") {
      err.statusCode = 400;
    }
    throw err;
  }

  // Atomic post-check (race guard, same pattern as boost): parallel relists
  // may have filled the last plan slot — revert instead of overserving.
  const postLimit = getListingLimit(owner?.subscription);
  if (typeof postLimit === "number") {
    const activeAfter = await Product.countDocuments({
      seller_id: product.seller_id,
      status: PRODUCT_STATUS.LISTED,
      is_deleted: false,
    });
    if (activeAfter > postLimit) {
      product.status = prevStatus;
      await product.save();
      throw campusError(
        403,
        `Listing limit reached (${postLimit} active listings on your plan). Upgrade to list more.`,
        "LISTING_LIMIT",
      );
    }
  }

  return saved;
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
