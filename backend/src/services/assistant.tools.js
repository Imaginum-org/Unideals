import { AsyncLocalStorage } from "node:async_hooks";
import { Type } from "@google/genai";
import Product from "../models/Product.model.js";
import {
  PRODUCT_CATEGORIES,
  PRODUCT_STATUS,
  PRODUCT_CATEGORY_LABELS,
  PRODUCT_CONDITION_LABELS,
  GIRLS_ONLY_CATEGORIES,
} from "../config/constants.js";
import { canSeeGirlsProduct } from "../utils/girlsCorner.js";
import {
  TERMS_AND_CONDITIONS,
  SUBSCRIPTION_PLANS,
  STEP_BY_STEP_GUIDES,
  PRIVACY_POLICY,
  REVIEW_RATING_POLICY,
  UNKNOWN_QUESTION_FALLBACK,
} from "../config/knowledgeBase.js";
import { USER_TIER } from "../config/constants.js";
import { BOOST_ADDONS } from "../config/boostAddons.js";
import { getBoostPlanRules } from "../config/boostPlans.js";

// Boost credits per plan, read from the live plan config (never hard-coded).
const rupees = (paise) => `₹${Math.round(paise / 100)}`;
const addonSummary = () =>
  Object.values(BOOST_ADDONS)
    .map((addon) => `${rupees(addon.amountInPaise)}/${Math.round(addon.durationHours / 24)}-day`)
    .join(", ");
const creditLine = (tier) => {
  const rules = getBoostPlanRules(tier);
  if (!rules.monthlyLimit) return `0 monthly credits — can purchase add-ons (${addonSummary()}).`;
  const days = Math.round(rules.durationHours / 24);
  const active = rules.maxActiveBoosts === 1 ? "Max 1 active boost at a time." : `Up to ${rules.maxActiveBoosts} active boosts simultaneously.`;
  return `${rules.monthlyLimit} boost credits/month (${days}-day each). ${active}`;
};

const compactProduct = (product) => {
  if (!product) return null;
  return {
    _id: product._id,
    title: product.title,
    description: product.description,
    category: product.category,
    categoryLabel: PRODUCT_CATEGORY_LABELS[product.category] || product.category,
    condition: product.condition,
    conditionLabel: PRODUCT_CONDITION_LABELS[product.condition] || product.condition,
    selling_price: product.selling_price,
    original_price: product.original_price,
    images: product.images?.map(img => typeof img === 'string' ? img : img.url) || [],
    slug: product.slug,
    views_count: product.views_count,
    is_boosted: product.is_boosted,
    is_negotiable: product.is_negotiable,
    brand: product.attributes?.brand,
  };
};


// ── Per-request viewer context ──
// Tool handlers are called from many code paths (Gemini function calls and the
// deterministic fallbacks), so the viewer travels via AsyncLocalStorage rather
// than being threaded through every call.
const viewerContext = new AsyncLocalStorage();

export const runWithViewer = (user, fn) => viewerContext.run({ user: user || null }, fn);

export const viewerCanSeeGirlsListings = () => {
  const user = viewerContext.getStore()?.user;
  return Boolean(user && canSeeGirlsProduct(user.gender, user.role));
};

// Base filter for anything the assistant shows: active listings only, and
// Girls Corner listings hidden from viewers who can't see them elsewhere.
const visibleListingFilter = (extra = {}) => {
  const filter = { is_deleted: false, status: PRODUCT_STATUS.LISTED, ...extra };
  if (!viewerCanSeeGirlsListings()) {
    filter.isGirlsOnly = { $ne: true };
    if (!filter.category) {
      filter.category = { $nin: [...GIRLS_ONLY_CATEGORIES] };
    } else if (typeof filter.category === "string" && GIRLS_ONLY_CATEGORIES.includes(filter.category)) {
      filter.category = { $in: [] };
    }
  }
  return filter;
};

const escapeRegex = (value = "") => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const SEARCH_STOPWORDS = new Set([
  "a", "an", "the", "and", "or", "for", "to", "of", "in", "on", "at", "with", "by", "from", "is", "are", "am",
  "be", "it", "this", "that", "these", "those", "me", "my", "i", "we", "you", "your", "some", "any", "all",
  "please", "pls", "plz", "show", "find", "search", "get", "give", "need", "want", "looking", "look", "buy",
  "purchase", "recommend", "suggest", "do", "does", "have", "has", "there", "available", "can", "could",
  "would", "like", "good", "best", "cheap", "cheapest", "cheaper", "affordable", "budget", "under", "below",
  "less", "than", "within", "upto", "up", "above", "over", "more", "around", "rs", "inr", "rupees", "price",
  "priced", "item", "items", "product", "products", "listing", "listings", "stuff", "thing", "things",
  "campus", "unideals", "website", "app", "here", "now", "new", "used", "second", "hand", "secondhand",
  "student", "students", "college", "something", "one", "ones", "what", "which", "where", "how", "much",
  "only", "just", "also", "very", "really", "kya", "hai", "chahiye", "mujhe", "dikhao", "ka", "ki", "ke",
  "similar", "other", "another", "options", "option", "deal", "deals", "sale", "sell", "selling",
]);

// Words that point straight at a category. Matching on the category field
// lets "cycle" find a listing titled "Hero Sprint 26T" filed under vehicles.
const CATEGORY_ALIASES = {
  electronics: "electronics", electronic: "electronics", gadget: "electronics", gadgets: "electronics",
  laptop: "electronics", laptops: "electronics", phone: "electronics", phones: "electronics", mobile: "electronics",
  book: "study_material", books: "study_material", textbook: "study_material", textbooks: "study_material",
  notes: "study_material", stationery: "study_material", drafter: "study_material",
  cycle: "vehicles", cycles: "vehicles", bicycle: "vehicles", bicycles: "vehicles", bike: "vehicles",
  bikes: "vehicles", scooter: "vehicles", scooty: "vehicles", vehicle: "vehicles", vehicles: "vehicles",
  hostel: "hostel_essentials", mattress: "hostel_essentials", kettle: "hostel_essentials", cooler: "hostel_essentials",
  clothes: "clothing", clothing: "clothing", jacket: "clothing", hoodie: "clothing", tshirt: "clothing",
  sports: "sports", sport: "sports", cricket: "sports", football: "sports", badminton: "sports",
  fitness: "fitness", gym: "fitness", dumbbell: "fitness", dumbbells: "fitness", yoga: "fitness",
  lab: "lab_equipment", labcoat: "lab_equipment", apron: "lab_equipment",
  ticket: "event_passes", tickets: "event_passes", pass: "event_passes", passes: "event_passes",
  accessories: "accessories", accessory: "accessories", watch: "accessories",
};

// Broad words that name a whole category ("electronics", "books"). Only these
// match every listing in the category; specific items ("laptop", "cycle") use
// the category as a ranking hint so "laptop" doesn't return every gadget.
const GENERIC_CATEGORY_WORDS = new Set([
  "electronics", "electronic", "gadget", "gadgets", "books", "textbooks", "stationery", "vehicle", "vehicles",
  "hostel", "clothes", "clothing", "sports", "sport", "fitness", "gym", "lab", "tickets", "passes",
  "accessories", "accessory",
]);

const isGenericCategoryWord = (token) => GENERIC_CATEGORY_WORDS.has(token) && Boolean(CATEGORY_ALIASES[token]);

const stemToken = (word) => {
  if (word.length > 4 && /(ches|shes|xes|sses)$/.test(word)) return word.slice(0, -2);
  if (word.length > 4 && word.endsWith("ies")) return `${word.slice(0, -3)}y`;
  if (word.length > 3 && word.endsWith("s") && !word.endsWith("ss")) return word.slice(0, -1);
  return word;
};

export const tokenizeSearchQuery = (query = "") =>
  [...new Set(
    String(query || "")
      .toLowerCase()
      // Drop prices ("₹3,000", "25k", "under 3000") but keep model numbers ("iphone 16").
      .replace(/(?:₹|\brs\.?|\binr)\s*\d[\d,]*(?:\.\d+)?\s*k?\b/g, " ")
      .replace(/\b\d[\d,]*(?:\.\d+)?\s*k\b/g, " ")
      .replace(/\b(under|below|above|over|between|and|to|within|upto|than|budget|of|is)\s+\d[\d,]*(?:\.\d+)?\b/g, "$1 ")
      .replace(/\b\d{1,3}(?:,\d{2,3})+\b/g, " ")
      .replace(/[^a-z0-9\s-]/g, " ")
      .split(/\s+/)
      .filter((word) => word.length >= 2 && !SEARCH_STOPWORDS.has(word))
  )].slice(0, 6);

export const categoryFromTokens = (tokens = []) => {
  for (const token of tokens) {
    if (CATEGORY_ALIASES[token]) return CATEGORY_ALIASES[token];
  }
  return null;
};

const normalizeCategory = (category) => {
  if (!category || typeof category !== "string") return null;
  const raw = category.trim().toLowerCase();
  const value = raw.replace(/[\s&-]+/g, "_").replace(/_+/g, "_");
  if (Object.values(PRODUCT_CATEGORIES).includes(value)) return value;
  const byLabel = Object.entries(PRODUCT_CATEGORY_LABELS).find(([, label]) => label.toLowerCase() === raw);
  return byLabel ? byLabel[0] : CATEGORY_ALIASES[value] || null;
};

const tokenPattern = (token) => {
  const stem = escapeRegex(stemToken(token));
  // Short tokens must start a word ("pen" shouldn't hit "open"); longer ones
  // may appear inside words ("cycle" should hit "bicycle").
  return stem.length <= 3 ? `\\b${stem}` : stem;
};

const scoreProduct = (product, tokens, categoryHint) => {
  const title = (product.title || "").toLowerCase();
  const description = (product.description || "").toLowerCase();
  const brand = String(product.attributes?.brand || "").toLowerCase();
  const category = (product.category || "").toLowerCase();
  let score = 0;
  let matched = 0;
  for (const token of tokens) {
    const re = new RegExp(tokenPattern(token), "i");
    const inTitle = re.test(title);
    const inBrand = re.test(brand);
    const inDesc = re.test(description);
    const inCategory = re.test(category) || (isGenericCategoryWord(token) && CATEGORY_ALIASES[token] === category);
    if (inTitle || inBrand || inDesc || inCategory) matched += 1;
    if (inTitle) score += 6;
    if (inBrand) score += 4;
    if (inCategory) score += 3;
    if (inDesc) score += 1;
  }
  if (tokens.length && matched === tokens.length) score += 8;
  if (categoryHint && category === categoryHint) score += 3;
  if (product.is_boosted) score += 1;
  return { score, matched };
};

const toNumberOrUndefined = (value) =>
  value === null || value === undefined || value === "" || !Number.isFinite(Number(value)) ? undefined : Number(value);

const LISTING_FIELDS = "title description category condition images selling_price original_price slug views_count is_boosted is_negotiable attributes createdAt";

export const toolDeclarations = [
  {
    name: "searchProducts",
    description: "Search for products based on query, category, price range, and condition.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        query: { type: Type.STRING, description: "Search query or keyword" },
        category: { type: Type.STRING, description: "Category of the product" },
        maxPrice: { type: Type.NUMBER, description: "Maximum selling price" },
        minPrice: { type: Type.NUMBER, description: "Minimum selling price" },
        condition: { type: Type.STRING, description: "Condition of the product" },
        sortBy: { type: Type.STRING, description: "Sort criteria", enum: ["newest", "price_low", "price_high", "most_viewed"] },
        limit: { type: Type.INTEGER, description: "Number of results to return (default 5)" }
      }
    }
  },
  {
    name: "getProductDetails",
    description: "Get full details of a specific product using its ID.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        productId: { type: Type.STRING, description: "The ID of the product" }
      },
      required: ["productId"]
    }
  },
  {
    name: "estimateFairPrice",
    description: "Estimate fair selling price based on category or keyword.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        category: { type: Type.STRING, description: "Category to estimate for" },
        keyword: { type: Type.STRING, description: "Keyword to narrow down estimation" }
      }
    }
  },
  {
    name: "getCategoryDemandStats",
    description: "Get demand statistics grouped by product category.",
    parameters: {
      type: Type.OBJECT,
      properties: {}
    }
  },
  {
    name: "generateListingDraft",
    description: "Generate a structured listing draft based on user input.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        itemDescription: { type: Type.STRING, description: "Description of the item" },
        condition: { type: Type.STRING, description: "Condition of the item" },
        originalPrice: { type: Type.NUMBER, description: "Original price of the item" },
        category: { type: Type.STRING, description: "Suggested category" }
      },
      required: ["itemDescription"]
    }
  },
  {
    name: "getTrendingProducts",
    description: "Get currently trending and boosted products.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        limit: { type: Type.INTEGER, description: "Number of products to return (default 6)" }
      }
    }
  },
  {
    name: "compareTwoProducts",
    description: "Compare two products by their IDs.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        productId1: { type: Type.STRING, description: "ID of the first product" },
        productId2: { type: Type.STRING, description: "ID of the second product" }
      },
      required: ["productId1", "productId2"]
    }
  },
  {
    name: "getBudgetBundle",
    description: "Get a bundle of affordable items within a specific total budget.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        totalBudget: { type: Type.NUMBER, description: "Total budget amount" },
        categories: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Categories to include in bundle" }
      },
      required: ["totalBudget"]
    }
  },
  {
    name: "getInspectionChecklist",
    description: "Get an inspection checklist for a specific product category.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        category: { type: Type.STRING, description: "Category of the product" }
      },
      required: ["category"]
    }
  },
  {
    name: "getSafetyTips",
    description: "Get safety tips for transactions or meetups.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        topic: { type: Type.STRING, description: "Topic like meetup, payment, scam, general" }
      }
    }
  },
  {
    name: "getPlatformGuide",
    description: "Get step-by-step instructions on how to use any feature of the Unideals website (e.g. how to sell, how to buy, how to boost, how to upgrade, how to wishlist, how to edit profile, how to report).",
    parameters: {
      type: Type.OBJECT,
      properties: {
        topic: {
          type: Type.STRING,
          description: "Topic of the guide (how_to_sell, how_to_buy, how_to_boost, how_to_upgrade, how_to_wishlist, how_to_profile_settings, how_to_report_safety, how_to_use_ai)"
        }
      },
      required: ["topic"]
    }
  },
  {
    name: "getTermsAndPolicies",
    description: "Get official Unideals Terms and Conditions, platform rules, prohibited items, eligibility criteria, and dispute policies.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        section: {
          type: Type.STRING,
          description: "Specific section id (eligibility, role, prohibited_items, safety_payments, listings_ownership, deal_workflow, liability_disputes, moderation_penalties, intellectual_property, governing_law, all)"
        }
      }
    }
  },
  {
    name: "getPolicyOrProcedure",
    description: "Get detailed policy or procedure information for any Unideals topic. Use for questions about returns, refunds, reviews, privacy, data rights, subscription rules, boost policies, moderation, disputes, account security, content rules, and any platform policy.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        topic: {
          type: Type.STRING,
          description: "Policy topic to retrieve. Options: returns_refunds, reviews_ratings, privacy_data, subscription_rules, boost_rules, moderation_penalties, dispute_resolution, account_security, content_photo_rules, deal_lifecycle, payment_safety, listing_price_rules, prohibited_items, eligibility, platform_liability, governing_law, subscription_upgrade_policy, founder_offer"
        }
      },
      required: ["topic"]
    }
  }
];

export const toolHandlers = {
  searchProducts: async (args = {}) => {
    const { query, condition, sortBy = "relevance" } = args;
    const limit = Math.min(Math.max(Number(args.limit) || 5, 1), 12);
    const maxPrice = toNumberOrUndefined(args.maxPrice);
    const minPrice = toNumberOrUndefined(args.minPrice);
    const tokens = tokenizeSearchQuery(query);
    const explicitCategory = normalizeCategory(args.category);
    const categoryHint = explicitCategory || categoryFromTokens(tokens);

    const extra = {};
    if (explicitCategory) extra.category = explicitCategory;
    if (condition && PRODUCT_CONDITION_LABELS[condition]) extra.condition = condition;
    if (maxPrice !== undefined || minPrice !== undefined) {
      extra.selling_price = {};
      if (maxPrice !== undefined) extra.selling_price.$lte = maxPrice;
      if (minPrice !== undefined) extra.selling_price.$gte = minPrice;
    }
    const filter = visibleListingFilter(extra);

    if (tokens.length) {
      // Any token may match; results are ranked below so listings matching
      // every word come first.
      filter.$or = tokens.flatMap((token) => {
        const regex = { $regex: tokenPattern(token), $options: "i" };
        const clause = [{ title: regex }, { description: regex }, { "attributes.brand": regex }, { category: regex }];
        if (isGenericCategoryWord(token) && !explicitCategory) clause.push({ category: CATEGORY_ALIASES[token] });
        return clause;
      });
    }

    const dbSort = {
      price_low: { selling_price: 1 },
      price_high: { selling_price: -1 },
      most_viewed: { views_count: -1 },
    }[sortBy] || { is_boosted: -1, createdAt: -1 };

    const candidates = await Product.find(filter)
      .sort(tokens.length ? { is_boosted: -1, createdAt: -1 } : dbSort)
      .limit(tokens.length ? 80 : limit)
      .select(LISTING_FIELDS)
      .lean();

    let ranked = candidates;
    let exact = true;
    if (tokens.length) {
      const scored = candidates.map((product) => ({ product, ...scoreProduct(product, tokens, categoryHint) }));
      const fullMatches = scored.filter((entry) => entry.matched === tokens.length);
      // With several words, prefer listings matching all of them; fall back to
      // partial matches only when nothing matches everything.
      const pool = fullMatches.length ? fullMatches : scored.filter((entry) => entry.matched > 0);
      exact = fullMatches.length > 0;
      const bySort = {
        price_low: (a, b) => a.product.selling_price - b.product.selling_price,
        price_high: (a, b) => b.product.selling_price - a.product.selling_price,
        most_viewed: (a, b) => (b.product.views_count || 0) - (a.product.views_count || 0),
      }[sortBy];
      pool.sort((a, b) =>
        bySort
          ? bySort(a, b) || b.score - a.score
          : b.score - a.score || new Date(b.product.createdAt) - new Date(a.product.createdAt)
      );
      ranked = pool.map((entry) => entry.product);
    }

    return {
      products: ranked.slice(0, limit).map(compactProduct),
      exact,
      total: ranked.length,
      category: categoryHint,
    };
  },

  getProductDetails: async (args) => {
    const { productId } = args;
    let product;

    const lookup = String(productId || "").match(/^[0-9a-fA-F]{24}$/) ? { _id: productId } : { slug: String(productId || "") };
    product = await Product.findOne(visibleListingFilter(lookup)).select(LISTING_FIELDS).lean();

    if (!product) throw new Error("Product not found");
    return { product: compactProduct(product) };
  },

  estimateFairPrice: async (args) => {
    const { keyword } = args;
    const category = normalizeCategory(args.category);
    const filter = visibleListingFilter(category ? { category } : {});
    const tokens = tokenizeSearchQuery(keyword);
    if (tokens.length) {
      filter.$and = tokens.map((token) => {
        const regex = { $regex: tokenPattern(token), $options: "i" };
        return { $or: [{ title: regex }, { description: regex }, { "attributes.brand": regex }] };
      });
    }

    const products = await Product.find(filter).select("selling_price").lean();

    if (!products.length) return { error: "Not enough data" };

    const prices = products.map(p => p.selling_price).sort((a, b) => a - b);
    const min = prices[0];
    const max = prices[prices.length - 1];
    const sum = prices.reduce((a, b) => a + b, 0);
    const average = Math.round(sum / prices.length);
    const median = prices[Math.floor(prices.length / 2)];

    return { low: min, fair: median, high: max, average, sampleSize: prices.length, category };
  },

  getCategoryDemandStats: async () => {
    const stats = await Product.aggregate([
      { $match: visibleListingFilter() },
      { $group: { _id: "$category", count: { $sum: 1 }, avgViews: { $avg: "$views_count" } } },
      { $sort: { count: -1 } }
    ]);
    return { stats };
  },

  generateListingDraft: async (args) => {
    const { itemDescription, condition, originalPrice, category } = args;

    const words = itemDescription.split(" ").slice(0, 5).join(" ");
    const title = `${words.charAt(0).toUpperCase() + words.slice(1)} - student owned, campus pickup`;

    const draft = {
      title,
      category: normalizeCategory(category) || "others",
      categoryLabel: PRODUCT_CATEGORY_LABELS[normalizeCategory(category)] || "Others",
      description: `Selling my ${itemDescription}.\nCondition: ${condition || "Used"}\n\nKey details:\n- [Add detail here]\n- [Add detail here]\n\nAvailable for immediate campus pickup!`,
      tags: itemDescription.split(" ").filter(w => w.length > 3).slice(0, 5),
      pricingAdvice: "Check similar items on campus for fair pricing."
    };

    return { draft };
  },

  getTrendingProducts: async (args) => {
    const limit = Math.min(Math.max(Number(args?.limit) || 6, 1), 12);
    const products = await Product.find(visibleListingFilter())
      .sort({ is_boosted: -1, views_count: -1, createdAt: -1 })
      .limit(limit)
      .select(LISTING_FIELDS)
      .lean();
    return { products: products.map(compactProduct) };
  },

  compareTwoProducts: async (args) => {
    const { productId1, productId2 } = args;
    const toLookup = (id) => (String(id || "").match(/^[0-9a-fA-F]{24}$/) ? { _id: id } : { slug: String(id || "") });

    const [p1, p2] = await Promise.all([
      Product.findOne(visibleListingFilter(toLookup(productId1))).select(LISTING_FIELDS).lean(),
      Product.findOne(visibleListingFilter(toLookup(productId2))).select(LISTING_FIELDS).lean(),
    ]);

    if (!p1 || !p2) throw new Error("One or both products not found");

    return { product1: compactProduct(p1), product2: compactProduct(p2) };
  },

  getBudgetBundle: async (args) => {
    const totalBudget = Math.max(Number(args.totalBudget) || 0, 0);
    const categories = Array.isArray(args.categories) && args.categories.length
      ? args.categories
      : ["hostel_essentials", "electronics", "study_material"];
    const products = [];
    let remainingBudget = totalBudget;

    for (const cat of categories) {
      if (remainingBudget <= 0) break;
      const category = normalizeCategory(cat);
      if (!category) continue;
      const cheapest = await Product.findOne(visibleListingFilter({
        category,
        selling_price: { $lte: remainingBudget },
      })).sort({ selling_price: 1 }).select(LISTING_FIELDS).lean();

      if (cheapest) {
        products.push(compactProduct(cheapest));
        remainingBudget -= cheapest.selling_price;
      }
    }

    const totalCost = totalBudget - remainingBudget;
    const budgetUsedPercent = totalBudget ? Math.round((totalCost / totalBudget) * 100) : 0;

    return { products, totalCost, remainingBudget, budgetUsedPercent };
  },

  getInspectionChecklist: async (args) => {
    const { category } = args;
    const checklists = {
      electronics: ["Check battery health", "Inspect screen for scratches/cracks", "Test charger and all ports", "Verify Wi-Fi/Bluetooth connectivity"],
      vehicles: ["Test brakes and gears", "Check tyre tread and pressure", "Inspect chain/belt", "Test lights and horn if applicable"],
      study_material: ["Check for missing pages", "Look for excessive highlighting or notes", "Verify edition/publication year"],
      hostel_essentials: ["Verify working condition", "Check cleanliness/hygiene", "Inspect for any physical damage"]
    };

    return {
      category,
      checklist: checklists[category] || ["Check overall condition", "Verify it matches description", "Test functionality if applicable"]
    };
  },

  getSafetyTips: async (args) => {
    const { topic = "general" } = args;
    const tips = {
      meetup: ["Always meet in public campus locations during daylight", "Take a friend with you if possible", "Inform someone about your meetup details"],
      payment: ["Prefer digital payments (UPI) at the time of exchange", "Do not pay anything in advance", "Verify payment confirmation on your own app"],
      scam: ["Beware of deals that seem too good to be true", "Do not click on suspicious QR codes for receiving money", "Avoid buyers/sellers who refuse to meet on campus"],
      general: ["Communicate only through the platform if possible", "Trust your instincts, walk away if something feels off", "Check the user's profile and reviews"]
    };

    return { topic, tips: tips[topic] || tips.general };
  },

  getPlatformGuide: async (args) => {
    const { topic } = args;
    const guide = STEP_BY_STEP_GUIDES.find((g) => g.topic === topic || g.topic.includes(topic));
    if (guide) {
      return { guide };
    }
    // Fallback: return all guide topics so Gemini can pick the right one
    return {
      availableTopics: STEP_BY_STEP_GUIDES.map(g => ({ topic: g.topic, title: g.title })),
      guide: {
        title: "Unideals Platform Guide",
        steps: [
          "Explore listings from the Home page.",
          "Use the Search bar or Categories to find student deals.",
          "Click 'Sell' at /upload to post your own item.",
          "Chat with sellers in-app to arrange a safe public meetup on campus!",
        ]
      }
    };
  },

  getTermsAndPolicies: async (args) => {
    const { section } = args;
    if (section && section !== "all") {
      const sec = TERMS_AND_CONDITIONS.sections.find((s) => s.id === section);
      if (sec) {
        return {
          summary: TERMS_AND_CONDITIONS.summary,
          section: sec
        };
      }
    }
    return {
      summary: TERMS_AND_CONDITIONS.summary,
      sections: TERMS_AND_CONDITIONS.sections
    };
  },

  getPolicyOrProcedure: async (args) => {
    const { topic } = args;

    const policies = {
      returns_refunds: {
        title: "Returns and Refunds Policy",
        summary: "Unideals does NOT process returns, refunds, or exchanges — it is a peer-to-peer marketplace.",
        details: [
          "Unideals does NOT process returns, refunds, or exchanges between students.",
          "ALWAYS inspect the item thoroughly BEFORE making payment — this is your only protection.",
          "Test electronics (power on, check all ports, test battery) before paying.",
          "If item doesn't match the listing: do NOT pay — walk away.",
          "Report fraudulent sellers via the in-app report/flag button.",
          "For serious fraud (theft, criminal scam): contact campus security or local police first.",
          "Email hi@unideals.in with full evidence for platform action against the seller.",
          "Unideals can suspend/ban fraudulent sellers but cannot recover funds.",
        ]
      },
      reviews_ratings: {
        title: "Reviews and Ratings Policy",
        summary: "Reviews are available only after a deal is marked 'Completed'. They must be honest and cannot be edited.",
        details: REVIEW_RATING_POLICY.rules,
      },
      privacy_data: {
        title: "Privacy Policy and Data Rights",
        summary: PRIVACY_POLICY.summary,
        sections: PRIVACY_POLICY.sections,
      },
      subscription_rules: {
        title: "Subscription Plans — Full Details",
        summary: SUBSCRIPTION_PLANS.philosophy,
        plans: {
          ...SUBSCRIPTION_PLANS.plans,
          pro: {
            ...SUBSCRIPTION_PLANS.plans.pro,
            price: "See current pricing at /price.",
            support: "Priority chat and support.",
          },
          pro_plus: {
            ...SUBSCRIPTION_PLANS.plans.pro_plus,
            price: "See current pricing at /price.",
            support: "Top chat and support priority.",
          },
        },
        boostAddons: SUBSCRIPTION_PLANS.boostAddons,
        upgradePolicy: SUBSCRIPTION_PLANS.upgradePolicy,
        founderOffer: "Current prices, account-specific offers, and purchase terms are displayed at /price.",
      },
      boost_rules: {
        title: "Boost Rules — Credits, Limits, Stacking, Rollover",
        summary: "Boosting places your listing at the top of campus search with a 'Boosted' badge for ~3x more views.",
        rules: SUBSCRIPTION_PLANS.boostRules,
        addons: SUBSCRIPTION_PLANS.boostAddons,
        planCredits: {
          free: creditLine(USER_TIER.BASE_USER),
          pro: creditLine(USER_TIER.PRO),
          pro_plus: creditLine(USER_TIER.PRO_PLUS),
        }
      },
      moderation_penalties: {
        title: "Moderation and Account Penalty Policy",
        summary: "Moderation team reviews flagged content within 2 hours.",
        penaltyLadder: [
          "1st violation: Warning issued + listing removed.",
          "2nd violation: Temporary suspension (7-30 days depending on severity).",
          "3rd violation or any serious offense: Permanent account ban.",
          "Permanently banned users cannot create new accounts.",
          "Appeals: email hi@unideals.in with evidence.",
          "Banned accounts forfeit subscription benefits — no refunds.",
        ],
        sectionRef: TERMS_AND_CONDITIONS.sections.find(s => s.id === "moderation_penalties"),
      },
      dispute_resolution: {
        title: "Dispute Resolution and Liability",
        summary: "Unideals is a Section 79 IT Act intermediary — platform liability is capped at ₹1,000.",
        details: TERMS_AND_CONDITIONS.sections.find(s => s.id === "liability_disputes")?.rules || [],
      },
      account_security: {
        title: "Account Security — Password, OAuth, Verification",
        summary: "Unideals uses email/password and Google OAuth2 for secure sign-in.",
        details: [
          "Password reset: Login page → Forgot Password → email reset link → set new password.",
          "Google OAuth users: no separate password — sign in with Google account.",
          "Email verification required for full access (listing, chat, wishlist, etc.).",
          "If verification email not received: check spam or request resend from login page.",
          "Account hacking/unauthorized access: contact hi@unideals.in immediately.",
          "Password change: Settings → Security (only for email-based accounts).",
          "Google users manage passwords via Google account settings.",
        ]
      },
      content_photo_rules: {
        title: "Content and Photo Rules for Listings",
        summary: "Listings must use real photos of the actual item. Stock images and internet photos are strictly prohibited.",
        details: [
          "Upload 1-3 REAL, clear photos of your ACTUAL item — no stock images or internet screenshots.",
          "Photos must clearly show the item's actual condition.",
          "Recommended: Front view, back/alternate angle, close-up of any wear/damage/accessories.",
          "For electronics: show the screen powered ON to prove functionality.",
          "For books: show cover, spine, and any highlighting or notes inside.",
          "Use natural daylight for best image quality.",
          "Maximum 3 images per listing.",
          "Listings with misleading or stock photos are removed by moderation.",
        ]
      },
      deal_lifecycle: {
        title: "Deal Lifecycle and Status System",
        summary: "Deals follow a structured lifecycle from negotiation to completion.",
        stages: TERMS_AND_CONDITIONS.sections.find(s => s.id === "deal_workflow")?.rules || [],
      },
      payment_safety: {
        title: "Payment Safety Rules",
        summary: "All payments must be made IN PERSON at the meetup, AFTER inspecting the item.",
        details: TERMS_AND_CONDITIONS.sections.find(s => s.id === "safety_payments")?.rules || [],
      },
      listing_price_rules: {
        title: "Listing Price Rules — Selling Price Cannot Exceed Original Price",
        summary: "Selling price on Unideals CANNOT exceed the original MRP or purchase price.",
        details: TERMS_AND_CONDITIONS.sections.find(s => s.id === "listings_ownership")?.rules || [],
      },
      prohibited_items: {
        title: "Prohibited Items and Banned Activities",
        summary: "Unideals strictly prohibits certain items and activities on the platform.",
        details: TERMS_AND_CONDITIONS.sections.find(s => s.id === "prohibited_items")?.rules || [],
      },
      eligibility: {
        title: "Eligibility Requirements — Who Can Use Unideals",
        summary: "Unideals is exclusively for students 18+ currently enrolled at recognized Indian colleges.",
        details: TERMS_AND_CONDITIONS.sections.find(s => s.id === "eligibility")?.rules || [],
      },
      platform_liability: {
        title: "Platform Liability and Legal Status",
        summary: "Unideals is a Section 79 IT Act intermediary. Platform liability is capped at ₹1,000.",
        details: TERMS_AND_CONDITIONS.sections.find(s => s.id === "liability_disputes")?.rules || [],
        legalSection: TERMS_AND_CONDITIONS.sections.find(s => s.id === "governing_law")?.rules || [],
      },
      governing_law: {
        title: "Governing Law and Jurisdiction",
        summary: "Unideals is governed by the laws of India. Disputes are subject to Indian courts.",
        details: TERMS_AND_CONDITIONS.sections.find(s => s.id === "governing_law")?.rules || [],
      },
      subscription_upgrade_policy: {
        title: "Subscription Upgrade and Billing Policy",
        summary: "Upgrades take effect immediately. Subscriptions are non-refundable. No downgrades.",
        details: SUBSCRIPTION_PLANS.upgradePolicy,
      },
      founder_offer: {
        title: "Founder Offer — Lifetime Access Details",
        summary: "Current prices, account-specific offers, and purchase terms are displayed at /price.",
        details: [
          "Current founder prices and eligibility are shown at /price.",
          "Review the offer terms displayed before checkout.",
          SUBSCRIPTION_PLANS.regularPricing?.foundersKeepLifetime ? "Founders keep lifetime access forever — guaranteed." : "",
        ].filter(Boolean),
      },
    };

    const policy = policies[topic];
    if (policy) {
      return { topic, policy };
    }

    // Unknown topic — return graceful fallback
    return {
      topic,
      policy: null,
      fallback: UNKNOWN_QUESTION_FALLBACK,
    };
  },
};
