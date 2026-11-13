import {
  TURN_BUDGET_MS,
  callGeminiWithFallback,
  isGeminiAvailable,
  parseJsonResponse,
} from "./assistant.gemini.js";
import {
  toolDeclarations,
  toolHandlers,
  runWithViewer,
  viewerCanSeeGirlsListings,
  tokenizeSearchQuery,
  categoryFromTokens,
} from "./assistant.tools.js";
import {
  findKnowledgeBaseAnswer,
  formatKnowledgeReply,
} from "./assistant.knowledge.js";
import { PRODUCT_CATEGORY_LABELS, PRODUCT_CONDITION_LABELS, USER_TIER } from "../config/constants.js";
import { getPricingForViewer } from "./payment.service.js";
import { PERSONA, composeReply, replyLanguage } from "./assistant.compose.js";
import { describeViewerContext, getViewerContext } from "./assistant.context.js";
import { planFollowUp } from "./assistant.followup.js";

// ── In-memory LRU reply cache for instant repeated-question responses ──
const CACHE_MAX = 120;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const _replyCache = new Map();

// `viewerKey` scopes a reply to one person. Gemini replies can mention the
// user's name or plan, so they are cached per viewer; deterministic replies
// (search results, knowledge base answers) carry nothing personal and are shared.
const cacheKey = (msg, viewerKey = "shared") =>
  `${viewerKey}|${viewerCanSeeGirlsListings() ? "g" : "p"}|${msg.trim().toLowerCase().replace(/\s+/g, " ")}`;

const getCachedReply = (msg, viewerKey) => {
  const key = cacheKey(msg, viewerKey);
  const entry = _replyCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL_MS) { _replyCache.delete(key); return null; }
  // Move to end (LRU)
  _replyCache.delete(key);
  _replyCache.set(key, entry);
  return entry.data;
};

const setCachedReply = (msg, data, viewerKey) => {
  const key = cacheKey(msg, viewerKey);
  if (_replyCache.size >= CACHE_MAX) {
    const oldest = _replyCache.keys().next().value;
    _replyCache.delete(oldest);
  }
  _replyCache.set(key, { data, ts: Date.now() });
};

const TRIP_ITEM_LIBRARY = {
  beach_trip: {
    label: "Beach / weekend trip essentials",
    items: ["sunscreen", "water bottle", "towel", "flip flops", "swimwear", "beach bag", "cap", "power bank", "dry bag", "mosquito repellent"],
  },
  trekking: {
    label: "Trekking / hiking essentials",
    items: ["water bottle", "trekking shoes", "backpack", "power bank", "poncho", "first aid kit", "sunglasses", "lightweight towel", "cap", "camping torch"],
  },
  road_trip: {
    label: "Road trip essentials",
    items: ["car charger", "travel pillow", "water bottle", "power bank", "phone mount", "towel", "first aid kit", "backpack", "sunglasses", "tissue box"],
  },
  business_trip: {
    label: "Business trip essentials",
    items: ["laptop sleeve", "power bank", "travel bag", "water bottle", "portable charger", "notebook", "usb cable", "bluetooth speaker", "headphones", "watch"],
  },
  college_trip: {
    label: "College / study trip essentials",
    items: ["water bottle", "notebook", "backpack", "adapter", "power bank", "pen drive", "sunglasses", "laptop sleeve", "towel", "small umbrella"],
  },
  backpacking: {
    label: "Backpacking essentials",
    items: ["backpack", "water bottle", "towel", "power bank", "socks", "sunglasses", "travel pouch", "small umbrella", "portable charger", "sleeping mat"],
  },
  hill_trip: {
    label: "Hill trip essentials",
    items: ["warm jacket", "water bottle", "backpack", "power bank", "woolen cap", "sunglasses", "umbrella", "trekking shoes", "blanket", "portable charger"],
  },
  exam_trip: {
    label: "Exam / study trip essentials",
    items: ["notebook", "pen", "water bottle", "backpack", "power bank", "exam pad", "calculator", "small umbrella", "towel", "headphones"],
  },
  office_trip: {
    label: "Office / work trip essentials",
    items: ["laptop sleeve", "power bank", "notebook", "file folder", "water bottle", "travel bag", "charger", "mouse", "earbuds", "umbrella"],
  },
  festival_trip: {
    label: "Festival trip essentials",
    items: ["water bottle", "small backpack", "power bank", "sunglasses", "portable speaker", "lightweight jacket", "cap", "travel pouch", "earbuds", "umbrellas"],
  },
  general_trip: {
    label: "General trip essentials",
    items: ["water bottle", "power bank", "backpack", "towel", "sunglasses", "travel pouch", "portable charger", "umbrella", "small toiletries kit", "phone charger"],
  },
};

const CATEGORY_RECOMMENDATION_LIBRARY = {
  books: {
    label: "Books and study essentials",
    queries: ["engineering books", "textbooks", "study notes", "reference book", "books for students", "novel", "exam notes"],
    keywords: ["book", "books", "textbook", "notes", "reference book", "study material", "lab manual", "novel", "exam notes"],
  },
  electronics: {
    label: "Electronics essentials",
    queries: ["power bank", "earbuds", "laptop", "mouse", "keyboard", "charger", "usb cable", "speaker", "monitor", "mobile stand"],
    keywords: ["electronics", "laptop", "phone", "charger", "power bank", "earbuds", "headphones", "speaker", "keyboard", "mouse", "monitor", "adapter"],
  },
  hostel: {
    label: "Hostel items",
    queries: ["hostel essentials", "mattress", "water bottle", "bucket", "towel", "study lamp", "fan", "portable cooler", "waste bin", "blanket"],
    keywords: ["hostel", "hostel essentials", "mattress", "blanket", "bucket", "towel", "study lamp", "fan", "bedside lamp", "water bottle", "cooler"],
  },
  bikes: {
    label: "Bikes and commuting items",
    queries: ["cycle", "bicycle", "helmet", "cycle lock", "bike lock", "helmet for cycling", "bike accessories", "bicycle basket"],
    keywords: ["bike", "bicycle", "cycle", "helmet", "bike lock", "cycle lock", "commuter bike", "helmet for bike", "bike accessories"],
  },
};

const detectTripType = (message = "") => {
  const text = message.toLowerCase();
  if (/\b(beach|goa|coast|sea|pool|resort|sun|sand)\b/.test(text)) return "beach_trip";
  if (/\b(trek|trekking|hike|hiking|camp|camping|mountain|forest|adventure)\b/.test(text)) return "trekking";
  if (/\b(road trip|drive|bike trip|car trip|long drive|travel by car|road journey)\b/.test(text)) return "road_trip";
  if (/\b(business|official|conference|work trip|seminar|client visit)\b/.test(text)) return "business_trip";
  if (/\b(college trip|study trip|fest trip|industrial visit|campus trip|event trip|excursion)\b/.test(text)) return "college_trip";
  if (/\b(backpacking|tour|vacation|journey|travel|trip\b)\b/.test(text)) return "backpacking";
  return "general_trip";
};

const normalizeProductQuestion = (message = "") => {
  const text = message.toLowerCase();
  return text
    .replace(/\b(do you have|is there|are there|show me|find me|recommend me|recommend|suggest|look for|want|need|i need|i am looking for|can you show|can you find|present on the website|available on website|on the app|on the website)\b/gi, " ")
    .replace(/\b(product|item|things|stuff|on website|website|app|here|right now)\b/gi, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

const getSynonymsForQuery = (query = "") => {
  const q = query.toLowerCase().trim();
  const synonyms = new Set([q]);

  if (/\bpower bank\b/.test(q) || /\bportable charger\b/.test(q) || /\bcharger\b/.test(q)) {
    synonyms.add("power bank");
    synonyms.add("portable charger");
    synonyms.add("battery pack");
  }
  if (/\bwater bottle\b/.test(q) || /\bbottle\b/.test(q)) {
    synonyms.add("water bottle");
    synonyms.add("steel bottle");
    synonyms.add("hydration bottle");
  }
  if (/\bbackpack\b/.test(q) || /\btravel bag\b/.test(q) || /\bbag\b/.test(q)) {
    synonyms.add("backpack");
    synonyms.add("travel bag");
    synonyms.add("daypack");
  }
  if (/\bheadphones\b/.test(q) || /\bearbuds\b/.test(q)) {
    synonyms.add("headphones");
    synonyms.add("earbuds");
    synonyms.add("bluetooth headphones");
  }
  if (/\bnotebook\b/.test(q) || /\bcopy\b/.test(q) || /\bregister\b/.test(q)) {
    synonyms.add("notebook");
    synonyms.add("study notebook");
    synonyms.add("copybook");
  }
  if (/\bshoes\b/.test(q) || /\bwalking shoes\b/.test(q) || /\btrekking shoes\b/.test(q)) {
    synonyms.add("trekking shoes");
    synonyms.add("sports shoes");
    synonyms.add("walking shoes");
  }
  if (/\bumbrella\b/.test(q) || /\bsmall umbrella\b/.test(q)) {
    synonyms.add("umbrella");
    synonyms.add("compact umbrella");
  }
  if (/\bcharger\b/.test(q) || /\badapter\b/.test(q)) {
    synonyms.add("charger");
    synonyms.add("usb charger");
    synonyms.add("travel adapter");
  }
  if (/\bcycle\b/.test(q) || /\bbicycle\b/.test(q)) {
    synonyms.add("cycle");
    synonyms.add("bicycle");
    synonyms.add("bike");
  }
  if (/\bhostel\b/.test(q) || /\broom essentials\b/.test(q)) {
    synonyms.add("hostel essentials");
    synonyms.add("room essentials");
    synonyms.add("hostel items");
  }

  return [...synonyms].filter(Boolean);
};

const detectCategoryFromMessage = (message = "") => {
  const text = message.toLowerCase();
  if (/\b(book|books|textbook|notes|reference book|study material|exam notes|novel)\b/.test(text)) return "books";
  if (/\b(electronics|laptop|power bank|charger|headphones|earbuds|speaker|monitor|keyboard|mouse|adapter|phone)\b/.test(text)) return "electronics";
  if (/\b(hostel|room essentials|mattress|water bottle|bucket|towel|lamp|fan|cooler|blanket|study lamp)\b/.test(text)) return "hostel";
  if (/\b(bike|bicycle|cycle|helmet|cycle lock|bike lock|commuter bike|ride)\b/.test(text)) return "bikes";
  return null;
};

const rankRecommendations = (items = [], query = "", categoryHint = null) => {
  const normalizedQuery = (query || "").toLowerCase();
  const tokens = new Set(normalizedQuery.split(/\s+/).filter(Boolean));

  return [...items].sort((a, b) => {
    const scoreA = (() => {
      const titleA = (a.title || "").toLowerCase();
      const descA = (a.description || "").toLowerCase();
      const catA = (a.category || "").toLowerCase();
      let score = 0;

      if (categoryHint && catA.includes(categoryHint)) score += 18;
      if (titleA.includes(normalizedQuery)) score += 22;
      if (descA.includes(normalizedQuery)) score += 12;
      for (const token of tokens) {
        if (titleA.includes(token)) score += 4;
        if (descA.includes(token)) score += 2;
      }
      if (a.is_boosted) score += 8;
      if (a.condition === "brand_new") score += 6;
      if (a.condition === "like_new") score += 4;
      if (a.condition === "gently_used") score += 2;
      if (Number(a.selling_price) <= 2000) score += 6;
      if (Number(a.selling_price) > 2000 && Number(a.selling_price) <= 8000) score += 4;
      if (Number(a.views_count || 0) > 50) score += 3;
      return score;
    })();

    const scoreB = (() => {
      const titleB = (b.title || "").toLowerCase();
      const descB = (b.description || "").toLowerCase();
      const catB = (b.category || "").toLowerCase();
      let score = 0;

      if (categoryHint && catB.includes(categoryHint)) score += 18;
      if (titleB.includes(normalizedQuery)) score += 22;
      if (descB.includes(normalizedQuery)) score += 12;
      for (const token of tokens) {
        if (titleB.includes(token)) score += 4;
        if (descB.includes(token)) score += 2;
      }
      if (b.is_boosted) score += 8;
      if (b.condition === "brand_new") score += 6;
      if (b.condition === "like_new") score += 4;
      if (b.condition === "gently_used") score += 2;
      if (Number(b.selling_price) <= 2000) score += 6;
      if (Number(b.selling_price) > 2000 && Number(b.selling_price) <= 8000) score += 4;
      if (Number(b.views_count || 0) > 50) score += 3;
      return score;
    })();

    if (scoreA !== scoreB) return scoreB - scoreA;
    return Number(a.selling_price || 0) - Number(b.selling_price || 0);
  });
};

const buildCategoryRecommendation = async (message = "") => {
  const category = detectCategoryFromMessage(message) || "electronics";
  const library = CATEGORY_RECOMMENDATION_LIBRARY[category] || CATEGORY_RECOMMENDATION_LIBRARY.electronics;
  const directQuery = normalizeProductQuestion(message) || library.queries[0];

  const queries = [...new Set([directQuery, ...library.queries])].filter(Boolean).slice(0, 6);
  const productCards = [];

  for (const query of queries) {
    try {
      const res = await toolHandlers.searchProducts({ query, limit: 2 });
      const items = res?.products || [];
      for (const item of items) {
        const key = item._id || `${item.title}-${item.category}`;
        if (!productCards.some((p) => (p._id || `${p.title}-${p.category}`) === key)) {
          productCards.push(item);
        }
      }
      if (productCards.length >= 6) break;
    } catch (err) {
      // ignore per-query lookup failure and continue
    }
  }

  const ranked = rankRecommendations(productCards, directQuery, category);

  return {
    category,
    label: library.label,
    productCards: ranked.slice(0, 6),
    missing: ranked.length === 0,
    query: directQuery,
  };
};

const recommendSimilarIfMissing = async (query = "") => {
  const normalized = (query || "").trim();
  if (!normalized) return { products: [], missing: true };

  const synonyms = getSynonymsForQuery(normalized);
  let productPool = [];
  for (const term of synonyms) {
    const result = await toolHandlers.searchProducts({ query: term, limit: 3 });
    const found = result?.products || [];
    if (found.length) {
      productPool = [...productPool, ...found];
    }
  }

  const unique = Array.from(new Map((productPool || []).map((p) => [p._id || `${p.title}-${p.category}`, p])).values());
  return { products: unique.slice(0, 6), missing: unique.length === 0 };
};

const buildTripPackingPlan = async (message = "") => {
  const tripType = detectTripType(message);
  const tripPlan = TRIP_ITEM_LIBRARY[tripType] || TRIP_ITEM_LIBRARY.general_trip;

  const available = [];
  const missing = [];

  try {
    for (const item of tripPlan.items) {
      const res = await toolHandlers.searchProducts({ query: item, limit: 2 });
      const found = res?.products || [];
      if (found.length) {
        available.push({ item, products: found.slice(0, 2) });
      } else {
        missing.push(item);
      }
    }
  } catch (err) {
    // If the DB is inaccessible, still return the planned items instead of failing the whole response.
    missing.push(...tripPlan.items);
  }

  const rankedProducts = rankRecommendations(
    available.flatMap((entry) => entry.products),
    message,
    tripType
  );

  return {
    tripType,
    label: tripPlan.label,
    available,
    missing,
    products: rankedProducts.slice(0, 8),
  };
};

const buildAvailabilityResponse = async (message = "") => {
  const rawQuery = normalizeProductQuestion(message);
  if (!rawQuery) return null;

  try {
    const productResults = await toolHandlers.searchProducts({ query: rawQuery, limit: 4 });
    const foundProducts = productResults?.products || [];

    if (foundProducts.length) {
      return {
        status: "present",
        query: rawQuery,
        products: foundProducts.slice(0, 4),
      };
    }

    const similar = await recommendSimilarIfMissing(rawQuery);
    return {
      status: "missing",
      query: rawQuery,
      products: similar.products || [],
      missing: similar.missing,
    };
  } catch (err) {
    return {
      status: "missing",
      query: rawQuery,
      products: [],
      missing: true,
    };
  }
};


// ── Direct product search ──
// Shopping questions ("cycles under ₹3,000", "laptop", "any power bank?") are
// answered straight from the database: it's faster than a model round trip
// and the listings shown are always real.

const parseAmount = (value = "", suffix = "") => {
  const amount = Number(String(value).replace(/,/g, ""));
  if (!Number.isFinite(amount)) return undefined;
  return /^k$/i.test(suffix) ? amount * 1000 : amount;
};

export const parsePriceConstraint = (message = "") => {
  const text = String(message).toLowerCase();
  const num = String.raw`(?:₹|rs\.?|inr)?\s*(\d[\d,]*(?:\.\d+)?)\s*(k)?\b`;
  const between = text.match(new RegExp(String.raw`(?:between|from)\s+${num}\s*(?:and|to|-)\s*${num}`));
  if (between) {
    const a = parseAmount(between[1], between[2]);
    const b = parseAmount(between[3], between[4]);
    if (a !== undefined && b !== undefined) return { minPrice: Math.min(a, b), maxPrice: Math.max(a, b) };
  }
  const max = text.match(new RegExp(String.raw`(?:under|below|less than|within|upto|up to|max(?:imum)?|budget(?: of| is)?|<=?)\s*${num}`))
    || text.match(new RegExp(String.raw`${num}\s*(?:se kam|ke andar|or less|max)`));
  const min = text.match(new RegExp(String.raw`(?:above|over|more than|at least|min(?:imum)?|>=?)\s*${num}`));
  return {
    maxPrice: max ? parseAmount(max[1], max[2]) : undefined,
    minPrice: min ? parseAmount(min[1], min[2]) : undefined,
  };
};

const NOT_SHOPPING_PATTERN = /\b(sell|selling|sold|list my|post my|upload|worth|estimate|fair price|valuation|how much (?:is|should|can|will|do)|scam|scams|safe|safety|policy|policies|refund|return|terms|privacy|boost|boosts|boosting|subscription|subscriptions|plan|plans|report|account|password|login|sign ?up|verify|verification|inspect|inspection|checklist|compare|trip|travel|packing|bundle|how (?:do|to|can|does)|what is|what are|why|who)\b/i;

// Greetings, thanks, goodbyes and acknowledgements. Matched on the whole
// message so "hi, need a cycle" still goes to search.
const SMALL_TALK_PATTERN = /^(?:(?:hi+|hello+|hey+|hlo|helo|yo|sup|wassup|namaste|namaskar|good (?:morning|afternoon|evening|night))(?:\s+(?:there|everyone|all|bro|bhai|dude|unideals|ai|team))?|how are you(?: doing)?|kaise ho|kya haal(?: hai)?|thanks?(?: a lot| so much| bro| bhai)?|thank (?:you|u)(?: so much| very much)?|thanku|thnx|thx|ty|shukriya|dhanyavad|bye+|bye bye|goodbye|see you|see ya|cya|ok(?:ay)?(?: bye| thanks| thank you)?|okk+|cool|nice|great|got it|alright)[\s!.?,😊👋🙏👍]*$/i;

export const isSmallTalk = (message = "") => SMALL_TALK_PATTERN.test(String(message).trim());

const firstNameOf = (user) => String(user?.name || "").trim().split(/\s+/)[0] || "";

const smallTalkReply = (message, user) => {
  const text = String(message).trim().toLowerCase();
  const name = firstNameOf(user);
  const base = { intent: "conversation", products: [], productCards: [], aiPowered: false };
  if (/^(?:thanks?|thank|thanku|thnx|thx|ty|shukriya|dhanyavad)/.test(text)) {
    return {
      ...base,
      reply: `Anytime${name ? `, ${name}` : ""}! 😊 Shout if you need anything else.`,
      suggestions: ["Show trending items", "Help me sell something", "Safety tips for meetups"],
    };
  }
  if (/^(?:bye|goodbye|see you|see ya|cya|ok(?:ay)? bye|good night)/.test(text)) {
    return {
      ...base,
      reply: `Bye${name ? ` ${name}` : ""}! 👋 Happy dealing, and stay safe at meetups.`,
      suggestions: ["Show trending items", "How does Unideals work?"],
    };
  }
  if (/^(?:ok|okk|cool|nice|great|got it|alright)/.test(text)) {
    return {
      ...base,
      reply: "👍 Anything else I can help you find or sell?",
      suggestions: ["Show trending items", "Help me sell something", "Check a fair price"],
    };
  }
  if (/^(?:how are you|kaise ho|kya haal)/.test(text)) {
    return {
      ...base,
      reply: `Doing great, thanks for asking${name ? `, ${name}` : ""}! 😄 Looking for something on campus today, or planning to sell?`,
      suggestions: ["Show trending items", "Help me sell something", "Find a laptop under ₹30000"],
    };
  }
  const hello = /^namaste|^namaskar/.test(text) ? "Namaste" : "Hey";
  return {
    ...base,
    reply: `${hello}${name ? ` ${name}` : " there"}! 👋 What are you after today? I can find listings on your campus, price something you want to sell, or help with a deal.`,
    suggestions: ["Show trending items", "Help me sell something", "How does Unideals work?", "Safety tips"],
  };
};

// "Show trending items" / "what's popular" with no specific product.
const TRENDING_PATTERN = /\b(?:trending|popular|what'?s hot|hot right now|most viewed|best ?sellers?)\b/i;
const TRENDING_FILLER = /^(?:trending|popular|hot|latest|new|best|top|deals?|items?|listings?|products?|stuff|things|now|today|right|campus|viewed|most)$/i;

const isTrendingRequest = (message = "") => {
  if (!TRENDING_PATTERN.test(message)) return false;
  const tokens = tokenizeSearchQuery(message);
  return tokens.every((token) => TRENDING_FILLER.test(token));
};
const SHOPPING_VERB_PATTERN = /\b(find|search|show|looking for|look for|need|want|buy|get me|do you have|have any|any|available|in stock|recommend|suggest|cheap|cheaper|cheapest|affordable|under|below|budget|chahiye|dikhao)\b/i;

export const isShoppingQuery = (message = "") => {
  const text = String(message).trim();
  if (!text || NOT_SHOPPING_PATTERN.test(text)) return false;
  const tokens = tokenizeSearchQuery(text);
  if (!tokens.length) return false;
  const { maxPrice, minPrice } = parsePriceConstraint(text);
  if (maxPrice !== undefined || minPrice !== undefined) return true;
  if (SHOPPING_VERB_PATTERN.test(text)) return true;
  // Bare product names: "laptop", "hero cycle", "casio fx-991"
  return text.split(/\s+/).length <= 4 && !/\?$/.test(text);
};

const formatRupees = (value) => `₹${Number(value || 0).toLocaleString("en-IN")}`;

const buildDirectSearchReply = async (message) => {
  const { maxPrice, minPrice } = parsePriceConstraint(message);
  const wantsCheap = /\b(cheap|cheaper|cheapest|affordable|budget|low price|lowest)\b/i.test(message);
  const sortBy = wantsCheap ? "price_low" : "relevance";
  const tokens = tokenizeSearchQuery(message);
  const label = tokens.join(" ");
  const priceText = maxPrice !== undefined && minPrice !== undefined
    ? ` between ${formatRupees(minPrice)} and ${formatRupees(maxPrice)}`
    : maxPrice !== undefined
      ? ` under ${formatRupees(maxPrice)}`
      : minPrice !== undefined
        ? ` above ${formatRupees(minPrice)}`
        : "";

  const result = await toolHandlers.searchProducts({ query: message, maxPrice, minPrice, sortBy, limit: 6 });
  const base = {
    intent: "product_search",
    searchQuery: label,
    aiPowered: false,
  };

  if (result.products.length) {
    const lead = result.exact
      ? `Found ${result.total > result.products.length ? `${result.total}+` : result.products.length} listing${result.products.length === 1 ? "" : "s"} for **${label}**${priceText}.`
      : `No exact match for **${label}**${priceText}, but these come close:`;
    return {
      ...base,
      reply: `${lead}${result.exact ? " Tap one to see details and chat with the seller." : ""}`,
      products: result.products,
      productCards: result.products,
      suggestions: [
        wantsCheap ? `Newest ${label}` : `Cheapest ${label}`,
        `What should I check before buying ${label}?`,
        `Fair price for ${label}`,
      ],
    };
  }

  // Nothing in budget: show the closest options just above it.
  if (maxPrice !== undefined) {
    const above = await toolHandlers.searchProducts({ query: message, minPrice: maxPrice, sortBy: "price_low", limit: 4 });
    if (above.products.length) {
      return {
        ...base,
        reply: `Nothing for **${label}**${priceText} right now. The cheapest options just above your budget:`,
        products: above.products,
        productCards: above.products,
        missingItems: [label],
        suggestions: [`Show all ${label}`, `Fair price for ${label}`, "Show trending items"],
      };
    }
  }

  const trending = await toolHandlers.getTrendingProducts({ limit: 4 });
  return {
    ...base,
    intent: "product_recommendation",
    reply: `I couldn't find **${label}**${priceText} on campus right now. New listings come in daily, so check back soon. Meanwhile, here's what's popular:`,
    products: trending.products,
    productCards: trending.products,
    missingItems: [label],
    suggestions: ["Show trending items", "Find affordable electronics", "Help me sell an item"],
  };
};

// ── Sell / fair-price quick actions ──
const SELL_REQUEST_PATTERN = /\b(help me sell|i want to sell|i wanna sell|sell my|sell an?|selling my|list my|post my|create a listing|draft a listing|write a listing)\b/i;
const PRICE_CHECK_PATTERN = /\b(fair price|price check|check (?:a |the )?price|what(?:'s| is) (?:a )?(?:fair|good|right) price|how much (?:should|can|is|will)|worth|resale value)\b/i;
const ACTION_FILLER = new Set(["help", "write", "create", "draft", "post", "check", "fair", "worth", "resale", "value", "should", "charge", "ask", "my", "old"]);

const itemFromMessage = (message = "") =>
  tokenizeSearchQuery(message).filter((token) => !ACTION_FILLER.has(token)).join(" ");

const buildSellReply = async (message) => {
  const item = itemFromMessage(message);
  if (!item) {
    return {
      reply: "Happy to help you sell! What are you selling? Tell me the item and its condition, e.g. *\"my Hero cycle, 1 year old\"*.",
      intent: "listing_creation",
      suggestions: ["Sell my cycle", "Sell my engineering books", "Sell my laptop"],
      route: "/upload",
      routeLabel: "Start a listing",
      aiPowered: false,
    };
  }
  const [{ draft }, estimate] = await Promise.all([
    toolHandlers.generateListingDraft({
      itemDescription: item,
      category: categoryFromTokens(tokenizeSearchQuery(item)) || undefined,
    }),
    toolHandlers.estimateFairPrice({ keyword: item }).catch(() => null),
  ]);
  const hasEstimate = estimate && !estimate.error;
  return {
    reply: `Here's a starter listing for your **${item}**. Add 1–3 real photos and the condition, then post it.${hasEstimate ? ` Similar listings on campus go for around **${formatRupees(estimate.fair)}**.` : ""}`,
    intent: "listing_creation",
    draft,
    estimate: hasEstimate ? estimate : null,
    suggestions: ["What photos should I take?", `Fair price for ${item}`, "How do boosts work?"],
    route: "/upload",
    routeLabel: "Start a listing",
    aiPowered: false,
  };
};

const buildPriceCheckReply = async (message) => {
  const item = itemFromMessage(message);
  if (!item) {
    return {
      reply: "Sure! Which item should I price? Tell me what it is (and its condition if you can), and I'll compare it with live campus listings.",
      intent: "price_estimation",
      suggestions: ["Fair price for a used cycle", "Fair price for a laptop", "Fair price for engineering books"],
      aiPowered: false,
    };
  }
  const estimate = await toolHandlers.estimateFairPrice({ keyword: item });
  if (!estimate || estimate.error) {
    return {
      reply: `There aren't enough **${item}** listings on campus yet to estimate a fair price. A good rule of thumb: 50–70% of the original price for items in good condition, lower for visible wear.`,
      intent: "price_estimation",
      suggestions: [`Help me sell my ${item}`, "Show trending items", "Fair price for a laptop"],
      aiPowered: false,
    };
  }
  return {
    reply: `Based on **${estimate.sampleSize}** campus listing${estimate.sampleSize === 1 ? "" : "s"}, a fair price for **${item}** is around **${formatRupees(estimate.fair)}**.`,
    intent: "price_estimation",
    estimate,
    suggestions: [`Show ${item} listings`, `Help me sell my ${item}`, "What should I check before buying?"],
    aiPowered: false,
  };
};

// Persona and tone are shared with the reply writer (assistant.compose.js).
// ── Follow-ups that depend on the conversation (see assistant.followup.js) ──

const conditionText = (condition) =>
  condition ? ` in ${String(PRODUCT_CONDITION_LABELS[condition] || condition).toLowerCase()} condition` : "";

const priceRangeText = ({ maxPrice, minPrice }) =>
  maxPrice !== undefined && minPrice !== undefined
    ? ` between ${formatRupees(minPrice)} and ${formatRupees(maxPrice)}`
    : maxPrice !== undefined
      ? ` under ${formatRupees(maxPrice)}`
      : minPrice !== undefined
        ? ` above ${formatRupees(minPrice)}`
        : "";

// Everything the writer may say about one listing.
const listingFacts = (p) =>
  [
    `Listing: ${p.title}`,
    `Price: ${formatRupees(p.selling_price)}${p.original_price > p.selling_price ? ` (original price ${formatRupees(p.original_price)})` : ""}`,
    p.conditionLabel ? `Condition: ${p.conditionLabel}` : "",
    `Negotiable: ${p.is_negotiable ? "yes, the seller accepts offers" : "no, fixed price"}`,
    p.brand ? `Brand: ${p.brand}` : "",
    p.categoryLabel ? `Category: ${p.categoryLabel}` : "",
    p.views_count ? `Views: ${p.views_count}` : "",
    p.description ? `Seller's description: ${String(p.description).replace(/\s+/g, " ").slice(0, 600)}` : "",
  ].filter(Boolean).join("\n");

const listingGone = {
  reply: "That listing isn't available anymore (it may have been sold or removed). Want me to find similar ones?",
  intent: "product_details",
  suggestions: ["Show similar items", "Show trending items"],
  aiPowered: false,
};

const fetchListing = async (id) => {
  try {
    return (await toolHandlers.getProductDetails({ productId: String(id) })).product;
  } catch {
    return null;
  }
};

const buildFollowUpSearchReply = async (plan) => {
  const label = plan.query;
  const filters = `${priceRangeText(plan)}${conditionText(plan.condition)}`;
  const sortBy = plan.sortBy || "relevance";
  const search = (overrides = {}) =>
    toolHandlers.searchProducts({
      query: plan.query,
      maxPrice: plan.maxPrice,
      minPrice: plan.minPrice,
      condition: plan.condition,
      sortBy,
      limit: 6,
      ...overrides,
    });
  const base = { intent: "product_search", searchQuery: label, aiPowered: false };
  const chips = [plan.sortBy === "price_low" ? `Newest ${label}` : `Cheapest ${label}`, "Compare the first two", "Is the first one negotiable?"];

  const exact = await search();
  if (exact.products.length) {
    const lead = plan.sortBy === "price_low" ? "Most affordable" : plan.sortBy === "price_high" ? "Top-end" : "Here are";
    return {
      ...base,
      reply: `${lead} **${label}** listings${filters}${exact.exact ? "" : " (closest matches)"}:`,
      products: exact.products,
      productCards: exact.products,
      suggestions: chips,
    };
  }

  // Nothing matches every filter: drop the condition first, then the budget.
  const relaxed = plan.condition ? await search({ condition: undefined }) : { products: [] };
  if (relaxed.products.length) {
    return {
      ...base,
      reply: `No **${label}**${filters} right now. These match everything except the condition:`,
      products: relaxed.products,
      productCards: relaxed.products,
      missingItems: [`${label}${filters}`],
      suggestions: chips,
    };
  }
  if (plan.maxPrice !== undefined) {
    const above = await search({ condition: undefined, maxPrice: undefined, minPrice: plan.maxPrice, sortBy: "price_low", limit: 4 });
    if (above.products.length) {
      return {
        ...base,
        reply: `No **${label}**${filters} right now. The cheapest ones just above that budget:`,
        products: above.products,
        productCards: above.products,
        missingItems: [`${label}${filters}`],
        suggestions: [`Show all ${label}`, `Fair price for ${label}`, "Show trending items"],
      };
    }
  }
  return {
    ...base,
    reply: `I couldn't find any **${label}**${filters} on campus right now. New listings come in daily, so check back soon.`,
    products: [],
    missingItems: [`${label}${filters}`],
    suggestions: ["Show trending items", "Find something else", "Help me sell something"],
  };
};

const buildListingDetailsReply = async (ref) => {
  const p = await fetchListing(ref._id);
  if (!p) return listingGone;
  const was = p.original_price > p.selling_price ? ` (was ${formatRupees(p.original_price)})` : "";
  const summary = String(p.description || "").replace(/\s+/g, " ").trim();
  return {
    reply: `**${p.title}**: ${formatRupees(p.selling_price)}${was}${p.conditionLabel ? `, ${p.conditionLabel.toLowerCase()}` : ""}. ${p.is_negotiable ? "The seller is open to offers." : "The price is fixed."}${summary ? `\n${summary.slice(0, 220)}${summary.length > 220 ? "…" : ""}` : ""}`,
    intent: "product_details",
    products: [p],
    productCards: [p],
    facts: `Details of the listing the student is asking about:\n${listingFacts(p)}\nAnswer their exact question from these details. If the details don't cover it, say so and suggest asking the seller in chat.`,
    route: `/product/${p._id}`,
    routeLabel: "View listing",
    suggestions: ["Is it a fair price?", "What should I check before buying?", "Show similar items"],
    aiPowered: false,
  };
};

const buildListingPriceReply = async (ref) => {
  const p = await fetchListing(ref._id);
  if (!p) return listingGone;
  const keyword = tokenizeSearchQuery(p.title).slice(0, 3).join(" ");
  const estimate = keyword ? await toolHandlers.estimateFairPrice({ keyword, category: p.category }).catch(() => null) : null;
  // The estimate needs listings other than this one to mean anything.
  const usable = estimate && !estimate.error && estimate.sampleSize > 1;
  let verdict = "There aren't enough similar listings on campus to compare it with yet. Check the original price and condition, and offer 10-20% less if it's negotiable.";
  if (usable) {
    const diff = p.selling_price - estimate.fair;
    verdict = Math.abs(diff) <= estimate.fair * 0.1
      ? `That's right around the campus fair price of **${formatRupees(estimate.fair)}**.`
      : diff > 0
        ? `That's about **${formatRupees(diff)}** above the campus fair price of **${formatRupees(estimate.fair)}**, so there's room to negotiate.`
        : `That's about **${formatRupees(-diff)}** below the campus fair price of **${formatRupees(estimate.fair)}**, a good deal.`;
  }
  return {
    reply: `**${p.title}** is listed at **${formatRupees(p.selling_price)}**${p.original_price > p.selling_price ? ` (original ${formatRupees(p.original_price)})` : ""}. ${verdict}`,
    intent: "price_estimation",
    products: [p],
    productCards: [p],
    estimate: usable ? estimate : null,
    facts: `The listing being priced:\n${listingFacts(p)}`,
    route: `/product/${p._id}`,
    routeLabel: "View listing",
    suggestions: ["Is it negotiable?", "What should I check before buying?", "Show similar items"],
    aiPowered: false,
  };
};

const buildCompareReply = async ([a, b]) => {
  const [p1, p2] = await Promise.all([fetchListing(a._id), fetchListing(b._id)]);
  if (!p1 || !p2) return listingGone;
  const cheaper = p1.selling_price <= p2.selling_price ? p1 : p2;
  const pricier = cheaper === p1 ? p2 : p1;
  const diff = pricier.selling_price - cheaper.selling_price;
  const verdict = diff === 0
    ? `Both cost ${formatRupees(p1.selling_price)}, so compare condition and what's included.`
    : `**${cheaper.title}** is ${formatRupees(diff)} cheaper than **${pricier.title}**.`;
  return {
    reply: `**${p1.title}** (${formatRupees(p1.selling_price)}${p1.conditionLabel ? `, ${p1.conditionLabel.toLowerCase()}` : ""}) vs **${p2.title}** (${formatRupees(p2.selling_price)}${p2.conditionLabel ? `, ${p2.conditionLabel.toLowerCase()}` : ""}). ${verdict}`,
    intent: "comparison",
    comparison: { product1: p1, product2: p2, verdict: verdict.replace(/\*\*/g, "") },
    facts: `Listing A:\n${listingFacts(p1)}\n\nListing B:\n${listingFacts(p2)}\nA side-by-side comparison card is shown.`,
    suggestions: [`Is the ${cheaper === p1 ? "first" : "second"} one negotiable?`, "What should I check before buying?", "Show similar items"],
    aiPowered: false,
  };
};

const buildWhichListingReply = (products) => ({
  reply: `Which one do you mean?\n${products.map((p, i) => `${i + 1}. ${p.title} — ${formatRupees(p.selling_price)}`).join("\n")}`,
  intent: "clarify",
  suggestions: products.slice(0, 3).map((_, i) => `Tell me more about the ${["1st", "2nd", "3rd"][i]} one`),
  aiPowered: false,
  composeMode: false,
});

const buildFollowUpReply = (plan) => {
  switch (plan.kind) {
    case "search": return buildFollowUpSearchReply(plan);
    case "product": return buildListingDetailsReply(plan.product);
    case "price": return buildListingPriceReply(plan.product);
    case "compare": return buildCompareReply(plan.products);
    case "which": return buildWhichListingReply(plan.products);
    default: return null;
  }
};

const SYSTEM_PROMPT = `
${PERSONA}

What you help with: finding listings, fair prices, selling and writing listings, comparing items, budgets, how to use the website, the platform's terms and privacy rules, and staying safe at meetups.
Available categories: ${Object.values(PRODUCT_CATEGORY_LABELS || {}).join(", ")}.
Available conditions: ${Object.values(PRODUCT_CONDITION_LABELS || {}).join(", ")}.

Facts and honesty:
- Unideals rules, policies, prices, plan details, timelines and procedures come ONLY from the Knowledge Base Context, the student context or tool results. Never guess them.
- If a policy or procedure question isn't covered, say honestly that you're not sure about that one, and that the team can confirm at hi@unideals.in or /contact. One sentence, no drama.
- General buying and selling know-how (what specs matter, what to inspect, how to negotiate politely, what's a reasonable condition for the price) can come from common knowledge, as long as you don't present it as an Unideals rule.
- If something is clearly unrelated to students buying, selling or using the marketplace (homework, coding, news, politics), don't answer it: in one warm line say it's not your thing and offer something nearby you can help with.
- Never share personal details or contact info of other users. Always suggest meeting in a public campus spot and inspecting before paying.
- Current subscription prices and offers come from live plan pricing; point to /price rather than guessing.

Tools (call them instead of guessing):
- How to use the website, features, steps, navigation → getPlatformGuide
- Rules, terms, prohibited items, eligibility → getTermsAndPolicies
- Returns, refunds, reviews, privacy, data deletion, subscription or boost rules, moderation, account security, photo rules, deal lifecycle, payment safety, listing price rules → getPolicyOrProcedure with the matching topic
- Products → searchProducts or getTrendingProducts. Prices → estimateFairPrice. Selling → generateListingDraft. Comparing → compareTwoProducts (listings shown earlier in the chat are listed below with their ids). Budget → getBudgetBundle. Safety → getSafetyTips. Inspection → getInspectionChecklist.

Platform basics you can rely on:
- Eligibility: 18+ currently enrolled Indian university students with a verified college email. One account per person.
- Unideals is an intermediary (Section 79 IT Act): it doesn't hold money, run escrow or deliver. Liability capped at ₹1,000.
- Safety: meet in public campus spots in daylight, inspect before paying, UPI or cash at the meetup only, never pay advance or token money, beware reverse QR scams.
- Listing rules: price can't exceed the original MRP, max 3 real photos (no stock images), honest condition.

Return ONLY a JSON object:
{
  "reply": "your reply, following the style above",
  "intent": "knowledge_base | marketplace_overview | product_search | price_estimation | listing_creation | comparison | budget_planning | advice | policy | conversation",
  "suggestions": ["2-4 short follow-ups the student might tap next, in their language"]
}
`;

const isPlanPricingQuestion = (message) =>
  /\b(?:price|pricing|cost|how much|offer|charge)\b/i.test(message) &&
  /\b(?:pro|pro plus|pro\+|subscription|plan|boost|founder|membership)\b/i.test(message);

const isSupportedAssistantMessage = (message) => {
  const text = message?.trim();
  if (!text) return false;
  if (/\b(?:ignore|disregard|forget|override|bypass)\b.{0,80}\b(?:rules?|instructions?|prompts?|guardrails?)\b/i.test(text)) {
    return false;
  }

  if (/^(?:hi|hello|hey|good morning|good afternoon|good evening|thanks|thank you|bye)[!.? ]*$/i.test(text)) {
    return true;
  }
  if (/\b(?:who are you|what can you do|what do you help with)\b/i.test(text)) {
    return true;
  }
  if (SELL_REQUEST_PATTERN.test(text) || PRICE_CHECK_PATTERN.test(text)) {
    return true;
  }
  const knowledgeMatch = findKnowledgeBaseAnswer(text);
  const hasPlatformContext =
    /\b(?:unideals|campus[- ]?mart|campus marketplace|marketplace|listing|seller|buyer|transaction|payment|upi|wishlist|boost|subscription|student email|verified student|meetup|pickup location)\b/i.test(text);
  if (
    (knowledgeMatch && (knowledgeMatch.id !== "terms_overview" || hasPlatformContext)) ||
    isPlanPricingQuestion(text)
  ) {
    return true;
  }
  if (/\b(?:unideals|campus[- ]?mart|campus marketplace|marketplace|listing|seller|buyer|wishlist|boost|subscription|plan|terms|privacy|support|refund|return|deal|transaction|payment|pickup|meetup|verification|student email|safety|scam|qr code|report|account|profile|moderation|chat)\b/i.test(text)) {
    return true;
  }

  if (/\b(?:sell|list for sale|list my|list this|create a listing|draft a listing)\b/i.test(text)) {
    return true;
  }

  const hasProduct = /\b(?:items?|products?|listings?|laptops?|phones?|tablets?|electronics?|headphones?|chargers?|books?|textbooks?|cycles?|bicycles?|bikes?|furniture|clothing|shoes|bags?|backpacks?|cameras?|keyboards?|mice|helmets?|calculators?|monitors?|chairs?|tables?|bottles?|lamps?|hostel essentials|lab equipment|event passes|trip|travel|packing|bundle|essentials)\b/i.test(text);
  const hasMarketplaceAction = /\b(?:find|finding|search|searching|show|recommend|compare|comparing|buy|buying|bought|purchase|purchasing|sell|selling|list|listing|estimate|price|pricing|priced|cost|worth|budget|under|below|cheaper|cheap|similar|available|looking for|need|want|how much|plan|second[- ]hand|used|inspect|check|tips|advice|keep in mind|negotiate|negotiating|deal)\b/i.test(text);
  return hasProduct && hasMarketplaceAction;
};

const buildMediaSearchQueries = (value = "") => {
  const cleaned = value
    .replace(/\b(search|find|show|recommend|identify|this|image|picture|photo|product|item|please|i want|i need|can you|give me|under|below|within)\b/gi, " ")
    .replace(/₹?\s*\d[\d,]*/g, " ")
    .replace(/[^a-zA-Z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const words = cleaned.split(" ").filter((word) => word.length > 2);
  const queries = new Set([cleaned]);

  for (let index = 0; index < words.length - 1; index += 1) {
    queries.add(`${words[index]} ${words[index + 1]}`);
  }
  words.forEach((word) => queries.add(word));
  return [...queries].filter((query) => query.length >= 2).slice(0, 8);
};

const buildMediaReply = async ({ message, attachments = [] }) => {
  const attachment = attachments.find((item) => item?.data && item?.mimeType);
  if (!attachment) return null;

  const isAudio = attachment.mimeType.startsWith("audio/");
  const mediaPrompt = isAudio
    ? `${message}\nTranscribe the audio exactly, then convert the spoken request into a concise Unideals marketplace search query. Return only JSON.`
    : `${message}\nInspect this image, identify the visible product or useful product keywords, and convert them into a concise Unideals marketplace search query. Return only JSON.`;

  const { response } = await callGeminiWithFallback({
    contents: [{
      role: "user",
      parts: [
        { text: mediaPrompt },
        {
          inlineData: {
            mimeType: attachment.mimeType,
            data: attachment.data.replace(/^data:[^,]*;base64,/i, ""),
          },
        },
      ],
    }],
    config: {
      systemInstruction: isAudio
        ? "You transcribe user audio and turn it into a product search."
        : "You identify products in images and turn them into a product search.",
      responseMimeType: "application/json",
      temperature: 0.1,
      maxOutputTokens: 300,
    },
  });

  const responseText = typeof response.text === "function" ? response.text() : response.text;
  const extracted = parseJsonResponse(responseText || "") || {};
  const rawMediaText = String(
    extracted.searchQuery || extracted.query || extracted.transcript || responseText || ""
  ).trim();
  const searchQueries = buildMediaSearchQueries(rawMediaText);
  const searchQuery = searchQueries[0] || rawMediaText;
  if (!searchQuery) {
    return {
      reply: isAudio
        ? "I could not understand the audio clearly. Please record it again and mention the product you want to find."
        : "I could not identify a searchable product in that image. Try a clearer photo with the item centered.",
      intent: "product_search",
      products: [],
      productCards: [],
      suggestions: ["Try another photo", "Say the product name", "Search campus listings"],
      aiPowered: true,
    };
  }

  const productPool = [];
  for (const query of searchQueries) {
    try {
      const result = await toolHandlers.searchProducts({ query, limit: 4 });
      productPool.push(...(result?.products || []));
    } catch {
      // Continue with shorter candidate queries when one search fails.
    }
  }
  const uniqueProducts = [...new Map(productPool.map((product) => [
    product._id || `${product.title}-${product.category}`,
    product,
  ])).values()];
  const products = rankRecommendations(
    uniqueProducts,
    searchQuery,
    detectCategoryFromMessage(rawMediaText)
  ).slice(0, 8);

  return {
    reply: isAudio
      ? `I heard: "${extracted.transcript || rawMediaText}". Here are the closest Unideals listings:`
      : `I identified "${searchQuery}" in the image. Here are the closest Unideals listings:`,
    intent: products.length ? "product_search" : "product_recommendation",
    products,
    productCards: products,
    recommendations: products,
    missingItems: products.length ? [] : [searchQuery],
    detectedQuery: searchQuery,
    transcript: isAudio ? extracted.transcript || rawMediaText : undefined,
    suggestions: ["Show similar items", "Find a cheaper option", "Search another product"],
    aiPowered: true,
  };
};

const inferIntentFromTools = (toolsUsed) => {
  if (toolsUsed.has("searchProducts") || toolsUsed.has("getTrendingProducts")) return "product_search";
  if (toolsUsed.has("estimateFairPrice")) return "price_estimation";
  if (toolsUsed.has("generateListingDraft")) return "listing_creation";
  if (toolsUsed.has("compareTwoProducts")) return "comparison";
  if (toolsUsed.has("getBudgetBundle")) return "budget_planning";
  if (toolsUsed.has("getInspectionChecklist") || toolsUsed.has("getSafetyTips")) return "advice";
  if (toolsUsed.has("getTermsAndPolicies") || toolsUsed.has("getPolicyOrProcedure") || toolsUsed.has("getPlatformGuide")) return "policy";
  return "conversation";
};

// Intelligent local fallback if Gemini API is temporarily rate-limited or unavailable
const fallbackLocalSearch = async (message) => {
  try {
    const text = message.toLowerCase();
    const knowledgeMatch = findKnowledgeBaseAnswer(message);

    if (knowledgeMatch) {
      return {
        reply: formatKnowledgeReply(knowledgeMatch),
        intent: "knowledge_base",
        suggestions: knowledgeMatch.suggestions,
        sources: [knowledgeMatch.source],
        route: knowledgeMatch.route,
        aiPowered: false,
      };
    }

    // 1. Safety / Scam / Meetup / UPI questions
    if (/\b(safe|safety|scam|scams|fraud|frauds|fake|cheat|cheats|meet|meetup|meetups|upi|advance|spot|location|night|payment|payments)\b/i.test(text)) {
      const topic = /\b(upi|advance|payment|payments|money|qr)\b/i.test(text) ? "payment" :
                    /\b(scam|scams|fraud|frauds|fake|cheat|cheats)\b/i.test(text) ? "scam" : "meetup";
      const tipsRes = await toolHandlers.getSafetyTips({ topic });
      return {
        reply: "🛡️ Here are important campus safety and transaction guidelines:\n• Never send advance payments on UPI before inspecting the item in person.\n• Always meet at well-lit, populated campus hubs (e.g. Library Gate, Main Canteen, Student Center).\n• Test and inspect the item thoroughly before making the final payment.",
        intent: "advice",
        safetyTips: tipsRes,
        suggestions: [
          "What should I check before buying a cycle?",
          "What should I inspect for laptops?",
          "Show trending items",
        ],
      };
    }

    // 2. Inspection / Checklist questions
    if (/\b(inspect|check|checklist|test|condition|look for|keep in mind|before buying|second[- ]hand)\b/i.test(text)) {
      let category = "general";
      if (/\b(laptop|phone|monitor|keyboard|electronic|tab|gadget|charger)\b/i.test(text)) category = "electronics";
      else if (/\b(cycle|bike|bicycle|scooter)\b/i.test(text)) category = "vehicles";
      else if (/\b(book|notes|study|textbook|drafter)\b/i.test(text)) category = "study_material";
      else if (/\b(mattress|kettle|cooler|fan|bed|hostel)\b/i.test(text)) category = "hostel_essentials";

      const checklistRes = await toolHandlers.getInspectionChecklist({ category });
      return {
        reply: `✅ Here is an inspection checklist for ${category.replace("_", " ")} items on campus:`,
        intent: "advice",
        checklist: checklistRes,
        suggestions: [
          "Is it safe to pay on UPI before meeting?",
          "Estimate price for my cycle",
          "Show trending deals",
        ],
      };
    }

    // 3. Price / Estimate / Valuation questions
    if (/\b(price|worth|estimate|fair|how much|cost|value|resale)\b/i.test(text)) {
      let category = undefined;
      if (/\b(laptop|phone|monitor|keyboard|electronics)\b/i.test(text)) category = "electronics";
      else if (/\b(cycle|bike|bicycle)\b/i.test(text)) category = "vehicles";
      else if (/\b(book|books|notes)\b/i.test(text)) category = "study_material";
      else if (/\b(cooler|kettle|mattress|fan)\b/i.test(text)) category = "hostel_essentials";

      const keywordMatch = text.replace(/\b(how|much|is|a|used|for|what|fair|price|worth|estimate|cost|value|can|i|sell|my)\b/gi, "").trim();
      const estimateRes = await toolHandlers.estimateFairPrice({ category, keyword: keywordMatch });

      if (estimateRes && !estimateRes.error) {
        return {
          reply: `💰 Based on current campus listings, here is the fair price estimate for "${keywordMatch || category}":`,
          intent: "price_estimation",
          estimate: estimateRes,
          suggestions: [
            "Help me write a listing for this",
            "What should I inspect before buying?",
            "Show similar items",
          ],
        };
      }
    }

    // 4. Listing / Sell draft questions
    if (/\b(list|listing|sell|draft|write|post|upload)\b/i.test(text)) {
      const rawDesc = message.replace(/\b(help|me|write|a|listing|to|sell|draft|create|for|my)\b/gi, "").trim();
      const draftRes = await toolHandlers.generateListingDraft({ itemDescription: rawDesc || "Campus item" });
      return {
        reply: "📝 Here is a pre-formatted listing draft ready for campus posting:",
        intent: "listing_creation",
        draft: draftRes.draft,
        suggestions: [
          "Estimate a fair price for this",
          "What photos should I take?",
          "Show trending items",
        ],
      };
    }

    // 5. Budget Bundle questions
    if (/\b(budget|bundle|room setup|hostel setup)\b/i.test(text)) {
      const parsedBudget = parsePriceConstraint(text).maxPrice
        ?? parseAmount(text.match(/(\d[\d,]*)\s*(k)?\b/i)?.[1], text.match(/(\d[\d,]*)\s*(k)?\b/i)?.[2]);
      const budget = parsedBudget && parsedBudget > 0 ? parsedBudget : 5000;
      const bundleRes = await toolHandlers.getBudgetBundle({ totalBudget: budget });
      return {
        reply: `🎒 Here is a curated budget bundle within ₹${budget.toLocaleString("en-IN")}:`,
        intent: "budget_planning",
        bundle: bundleRes,
        suggestions: [
          "Find electronics under 5000",
          "Safety tips for meetups",
          "How to inspect used items",
        ],
      };
    }

    // 6. Policy / Procedure question detection — return graceful fallback if no KB match
    const isPolicyQuestion = /\b(policy|rule|rules|allowed|prohibited|banned|illegal|can i|is it allowed|what happens|procedure|legal|return|refund|moderation|suspension|ban|account ban|penalty|terms|conditions|privacy|gdpr|dpdp|data|subscription|upgrade|boost|credits|rollover|review policy|dispute|liability|governing law|section 79|intermediary|eligible|eligibility|age limit|minor|18|college required|verification required|who can use|can i sell|what is not allowed)\b/i.test(text);

    if (isPolicyQuestion && !knowledgeMatch) {
      return {
        reply: "That's a great question! 🤔 I don't have the exact answer to this specific query in my knowledge base just yet — but don't worry, our team is continuously expanding my knowledge and I'll soon be able to answer it fully!\n\nIn the meantime, here's what you can do:\n📧 Email us directly at **hi@unideals.in** — our team will reply within 24-48 hours.\n🎫 Submit a support ticket at **/contact** and a campus team member will assist you.\n📚 Browse our Terms & Conditions at **/termscondition** or Privacy Policy at **/privacy-policy**.\n\nThanks for your patience — we're always improving! 🙌",
        intent: "policy",
        route: "/contact",
        suggestions: [
          "What are the platform rules?",
          "Is advance UPI payment safe?",
          "How do I report a suspicious seller?",
          "Contact support",
        ],
        aiPowered: false,
      };
    }

    // 7. Product Search — only when query indicates intent to find, buy, or browse items
    const isProductIntent = /\b(find|show|search|need|want|buy|looking for|cheap|under|below|price|laptop|cycle|bike|bicycle|book|books|phone|mobile|monitor|keyboard|kettle|mattress|cooler|calculator|headphones|earphones|clothes|shoes|bag|backpack|sports|fitness|available|in stock|recommend|suggest|product|products|item|items|listing|listings)\b/i.test(text);

    if (isProductIntent) {
      const cleanedQuery = text.replace(/\b(find|show|search|need|want|buy|looking|for|me|please|best|cheap|affordable|recommend|suggest|are|there|any)\b/gi, "").trim();
      const searchRes = await toolHandlers.searchProducts({ query: cleanedQuery || text, limit: 4 });
      const products = searchRes.products?.length ? searchRes.products : (await toolHandlers.getTrendingProducts({ limit: 4 })).products;

      return {
        reply: searchRes.products?.length
          ? `Here are active campus listings matching "${cleanedQuery || text}":`
          : "Here are some popular active listings on campus:",
        intent: "product_search",
        products: products || [],
        suggestions: [
          "Find electronics under 5000",
          "Estimate price for my cycle",
          "Help me sell my books",
          "Safety tips for meetups",
        ],
      };
    }

    // 8. General conversational / Helpful redirect (Never return random product cards for general queries!)
    return {
      reply: "I'm Unideals AI — your campus marketplace assistant! 🎓\n\nI can help you with:\n• 🔍 Finding campus products, electronics, cycles, and books\n• 💰 Estimating fair selling prices\n• 📝 Writing product listings\n• 🛡️ Campus safety tips and scam avoidance\n• 📖 Platform rules, policies, and procedures\n\nHow can I help you today?",
      intent: "conversation",
      suggestions: [
        "How do I avoid scams?",
        "What are the platform rules?",
        "Find a cycle under ₹3000",
        "How do I sell an item?",
      ],
    };
  } catch (err) {
    return {
      reply: "I'm Unideals AI — I can help you find products, estimate fair prices, write listings, compare deals, plan budgets, check safety tips, navigate the platform, and answer policy questions. What would you like help with?",
      intent: "conversation",
      suggestions: [
        "Find a cycle under ₹3000",
        "Help me sell my books",
        "How do I boost my listing?",
        "Safety tips for campus meetups",
      ],
    };
  }
};

export const buildAssistantReply = (params = {}) =>
  runWithViewer(params.user, () => buildAssistantReplyForViewer(params));

// "show cheaper ones", "compare them": only meaningful with the previous turn.
const FOLLOW_UP_PATTERN = /^(and\s+)?(show|find|give|any|what about|how about)?\s*(cheaper|more affordable|similar|more like that|another|other ones?|those|these|the blue one|the black one|under\s+\d+|below\s+\d+|for\s+\d+)\b|^(tell me more|show more|more options|anything else|which one|compare them)\b/i;

const PROMPT_INJECTION_PATTERN = /\b(?:ignore|disregard|forget|override|bypass)\b.{0,80}\b(?:rules?|instructions?|prompts?|guardrails?)\b/i;

const sanitizeHistory = (history) =>
  (Array.isArray(history) ? history : [])
    .filter((entry) => (entry?.sender === "user" || entry?.sender === "assistant") && typeof entry.text === "string")
    .slice(-8);

// Used when Gemini can't write a redirect itself (down, or a manipulation attempt).
const offTopicReply = (user) => {
  const name = firstNameOf(user);
  return {
    reply: `That one's a bit outside my lane${name ? `, ${name}` : ""}. I'm best with campus deals: finding something, pricing an item, selling, or staying safe at a meetup. What do you need?`,
    intent: "out_of_scope",
    products: [],
    suggestions: ["Find a campus listing", "Check a fair price", "Help me sell something"],
    aiPowered: false,
  };
};

/**
 * One assistant turn: builds a draft from the facts (search, knowledge base,
 * pricing...), then lets the reply writer turn it into a human reply in the
 * student's language. `onText` streams the reply as it's written; the
 * returned object is always the final reply.
 */
const buildAssistantReplyForViewer = async ({
  message,
  history = [],
  user = null,
  attachments = [],
  shownProducts = [],
  clientShownProducts = [],
  onText,
  signal,
}) => {
  if (!message || typeof message !== "string" || message.trim() === "") {
    throw Object.assign(new Error("Message is required"), { statusCode: 400 });
  }
  const deadline = Date.now() + TURN_BUDGET_MS;
  const safeHistory = sanitizeHistory(history);
  const isFollowUp = FOLLOW_UP_PATTERN.test(message.trim());
  // Follow-ups resolved from the conversation ("cheaper ones", "is it
  // negotiable?", "compare the first two"). Guests' shown listings come from
  // the client, so they're only used here: every id is re-fetched from the
  // database, and their titles never reach the model's prompt.
  const followUpPlan = attachments.length
    ? null
    : planFollowUp(
        { message, history: safeHistory, shownProducts: shownProducts.length ? shownProducts : clientShownProducts },
        { isShoppingQuery, parsePriceConstraint },
      );
  // Final replies can mention the student's name, listings or plan, so they
  // are cached per person (see cacheKey). Follow-ups depend on the last turn.
  const viewerKey = user?._id ? `u:${user._id}` : "guest";
  const cacheable = !attachments.length && !isFollowUp && !followUpPlan;
  if (cacheable) {
    const cached = getCachedReply(message, viewerKey);
    if (cached) return cached;
  }

  const context = await getViewerContext(user);
  let draft = null;
  if (followUpPlan) {
    try {
      draft = await buildFollowUpReply(followUpPlan);
    } catch (error) {
      console.warn("[Assistant] Follow-up failed, using the normal route:", error.message || error);
    }
  }
  if (!draft) {
    draft = await buildDraftReply({ message, safeHistory, user, attachments, deadline, context, shownProducts, isFollowUp });
  }

  let result = draft;
  if (!draft.writtenByModel && draft.composeMode !== false) {
    let composed = null;
    try {
      composed = await composeReply({
        message,
        draft,
        context,
        history: safeHistory,
        mode: draft.composeMode || "rewrite",
        deadline,
        signal,
        onText,
      });
    } catch (error) {
      // Failed mid-stream: the final reply (the draft) replaces what was sent.
      console.warn("[Assistant] Reply writer failed mid-stream:", error.message || error);
    }
    if (composed?.reply) {
      result = {
        ...draft,
        reply: composed.reply,
        suggestions: composed.suggestions?.length ? composed.suggestions : draft.suggestions,
        aiPowered: true,
        model: composed.model,
      };
    }
  }
  const { writtenByModel, composeMode, facts, ...final } = result;
  if (cacheable && final.aiPowered) setCachedReply(message, final, viewerKey);
  return final;
};

const buildDraftReply = async ({ message, safeHistory, user, attachments, deadline, context, shownProducts, isFollowUp }) => {
  // Greetings, thanks and goodbyes: answer before any search logic (short
  // messages would otherwise be treated as product names).
  if (!attachments.length && isSmallTalk(message)) {
    return { ...smallTalkReply(message, user), composeMode: "smalltalk" };
  }

  // Resolve short follow-ups against the latest concrete user request. Without
  // this, deterministic search paths treat “show cheaper ones” as a literal query.
  const latestRequest = [...safeHistory].reverse().find((entry) => entry.sender === "user" && entry.text.trim())?.text.trim();
  const hasMarketplaceFollowUpContext = isFollowUp && latestRequest && isSupportedAssistantMessage(latestRequest);

  if (
    !attachments.length &&
    !isSupportedAssistantMessage(message) &&
    !hasMarketplaceFollowUpContext
  ) {
    // A bare product name ("iphone", "casio calculator") isn't off-topic.
    if (isShoppingQuery(message)) {
      try {
        const direct = await toolHandlers.searchProducts({ query: message, limit: 6 });
        // Known product words get a "not found + alternatives" answer even with
        // zero hits; unknown words only count as a search when something matches.
        if (direct.products.length || categoryFromTokens(tokenizeSearchQuery(message))) {
          return await buildDirectSearchReply(message);
        }
      } catch (error) {
        console.warn("[Assistant] Direct search failed:", error.message || error);
      }
    }
    // Manipulation attempts never reach the model.
    if (PROMPT_INJECTION_PATTERN.test(message) || !isGeminiAvailable()) {
      return { ...offTopicReply(user), composeMode: false };
    }
    // Anything else (general buying advice, odd phrasings) goes to Gemini,
    // which answers related questions and warmly redirects unrelated ones.
    return answerWithGemini({ message, safeHistory, user, attachments, deadline, context, shownProducts, offTopic: true });
  }

  if (!attachments.length && isPlanPricingQuestion(message)) {
    const pricing = getPricingForViewer(user);
    const formatPrice = (plan) =>
      plan ? `₹${Number(plan.amount).toLocaleString("en-IN")}` : "not currently available";
    const pricingType = pricing.subscriptionType === "founder" ? "one-time founder" : "current";
    return {
      reply: `Current ${pricingType} plan prices: Free is ₹0, Pro is ${formatPrice(pricing.plans.pro)}, and Pro+ is ${formatPrice(pricing.plans.pro_plus)}. Check the pricing page for plan details and any offer available to your account.`,
      intent: "knowledge_base",
      suggestions: ["Compare plan features", "How do boosts work?", "How do I upgrade?"],
      route: "/price",
      sources: ["Live plan pricing"],
      aiPowered: false,
    };
  }

  const resolvedMessage = isFollowUp && latestRequest
    ? `${message.trim()} (continuing the request about: ${latestRequest})`
    : message;

  if (isFollowUp && latestRequest && /\b(cheaper|more affordable|under\s+\d+|below\s+\d+|for\s+\d+)\b/i.test(message)) {
    const productQuery = latestRequest
      .replace(/\b(show|find|search|looking for|available|do you have|can you find|recommend|suggest|some|any|products?|items?|please|under|below|less than|up to|budget|for)\b/gi, " ")
      .replace(/[₹,\d]/g, " ").replace(/\s+/g, " ").trim();
    const priorBudget = latestRequest.match(/(?:under|below|less than|up to|₹)\s*([\d,]+)/i)?.[1]?.replace(/,/g, "");
    const followBudget = message.match(/(?:under|below|for|₹)\s*([\d,]+)/i)?.[1]?.replace(/,/g, "");
    try {
      const result = await toolHandlers.searchProducts({
        query: productQuery,
        maxPrice: followBudget ? Number(followBudget) : priorBudget ? Number(priorBudget) : undefined,
        sortBy: /cheaper|affordable/i.test(message) ? "price_low" : "newest",
        limit: 6,
      });
      if (result.products.length) {
        return {
          reply: `Here are ${/cheaper|affordable/i.test(message) ? "the most affordable" : "matching"} ${productQuery || "campus"} listings, using your previous search for context:`,
          intent: "product_search", products: result.products, productCards: result.products,
          suggestions: ["Show similar items", "What should I check before buying?", "Find another category"], aiPowered: false,
        };
      }
    } catch (error) {
      console.warn("[Assistant] Follow-up search failed:", error.message || error);
    }
  }

  // Contextual responses must not reuse a cache entry created for a different turn.
  // ── FAST PATH: return cached reply instantly ──
  if (!attachments.length) {
    const cached = isFollowUp ? null : getCachedReply(message);
    if (cached) return cached;
  }

  if (attachments.length) {
    try {
      const mediaResult = await buildMediaReply({ message, attachments });
      if (mediaResult) return mediaResult;
    } catch (error) {
      // Logged here only; internal error text never goes to the client.
      console.warn("[Assistant] Media reply failed:", error.message || error);
      return {
        reply: "I could not process that media right now. Please try a clearer image or a shorter audio recording.",
        intent: "conversation",
        products: [],
        productCards: [],
        suggestions: ["Try again", "Type the product name", "Search campus listings"],
        aiPowered: false,
      };
    }
  }

  if (!attachments.length && !isFollowUp && isTrendingRequest(message)) {
    try {
      const { products } = await toolHandlers.getTrendingProducts({ limit: 6 });
      return {
        reply: products.length
          ? "Here's what's getting the most attention on campus right now:"
          : "Nothing is trending yet. New listings come in daily, so check back soon!",
        intent: "product_search",
        products,
        productCards: products,
        suggestions: ["Find something under ₹1000", "Help me sell something", "Safety tips for meetups"],
        aiPowered: false,
      };
    } catch (error) {
      console.warn("[Assistant] Trending lookup failed:", error.message || error);
    }
  }

  if (!attachments.length && !isFollowUp && isShoppingQuery(message)) {
    try {
      const direct = await buildDirectSearchReply(message);
      setCachedReply(message, direct);
      return direct;
    } catch (error) {
      console.warn("[Assistant] Direct search failed:", error.message || error);
    }
  }

  if (!attachments.length && !isFollowUp && (SELL_REQUEST_PATTERN.test(message) || PRICE_CHECK_PATTERN.test(message))) {
    try {
      const quick = SELL_REQUEST_PATTERN.test(message)
        ? await buildSellReply(message)
        : await buildPriceCheckReply(message);
      setCachedReply(message, quick);
      return quick;
    } catch (error) {
      console.warn("[Assistant] Quick action failed:", error.message || error);
    }
  }

  message = resolvedMessage;
  const categoryRecommendationIntent = /\b(recommend|suggest|show me|find me|find|suggest products|need products|what should i buy|best items|best products|good items|essentials)\b/i.test(message) &&
    /\b(book|books|study material|electronics|laptop|hostel|hostel essentials|bike|bikes|bicycle|bicycles|cycle|cycles|safety gear|travel|trip|packing|essentials)\b/i.test(message);

  if (categoryRecommendationIntent) {
    const categoryRec = await buildCategoryRecommendation(message);
    const result = {
      reply: categoryRec.productCards.length
        ? `I found a few relevant recommendations in the ${categoryRec.label.toLowerCase()} category for your search:`
        : `I could not find a direct match in the ${categoryRec.label.toLowerCase()} category, but here are similar recommendations you can consider:`,
      intent: "product_recommendation",
      products: categoryRec.productCards,
      productCards: categoryRec.productCards,
      category: categoryRec.category,
      missingItems: categoryRec.missing ? [categoryRec.query] : [],
      recommendations: categoryRec.productCards,
      suggestions: [
        "Show me electronics under ₹5000",
        "Recommend hostel items for a hostel room",
        "Find a bike helmet",
        "Plan items for a hill trip",
      ],
      aiPowered: false,
    };
    setCachedReply(message, result);
    return result;
  }

  const tripPlanningIntent = /\b(trip|travel|vacation|journey|backpacking|beach|trek|hiking|camping|road trip|business trip|college trip|packing|pack list|what should i carry|what all do i need|hill trip|exam trip|office trip|festival trip)\b/i.test(message) && /\b(need|items|things|carry|pack|essentials|bring|recommend|suggest)\b/i.test(message);

  if (tripPlanningIntent) {
    const tripPlan = await buildTripPackingPlan(message);
    const rankedProducts = rankRecommendations(tripPlan.products || [], message, detectTripType(message));
    const reply = `For a ${tripPlan.label.toLowerCase()}, these are the useful essentials to carry:\n${tripPlan.available.map((entry) => `• ${entry.item} — available on campus`).join("\n") || "• No exact matches found on the site for this trip type yet."}\n${tripPlan.missing.length ? `\nMissing from the current marketplace: ${tripPlan.missing.join(", ")}. I can suggest alternatives or you can tell me the exact item you want to search.` : "\nEverything for this trip type looks broadly available on campus right now."}`;

    const result = {
      reply,
      intent: "trip_planning",
      products: rankedProducts,
      productCards: rankedProducts,
      missingItems: tripPlan.missing,
      recommendations: rankedProducts,
      suggestions: [
        "Show me items for a beach trip",
        "Find a power bank",
        "Recommend travel essentials under ₹2000",
        "Show me similar items if not present",
      ],
      aiPowered: false,
    };
    setCachedReply(message, result);
    return result;
  }

  const productCheckIntent = /\b(do you have|is there|are there|show me|find me|available|present|in stock|on the website|on the app|have|need|looking for|recommend something similar|similar to|like)\b/i.test(message) && /\b(item|product|bag|bottle|charger|headphones|power bank|backpack|laptop|phone|watch|shoes|towel|sunscreen|notebook|speaker|camera|umbrella|books|cycle|helmet|mattress|lamp|keyboard|mouse)\b/i.test(message);

  if (productCheckIntent) {
    const availability = await buildAvailabilityResponse(message);
    if (!availability) {
      const generic = await fallbackLocalSearch(message);
      setCachedReply(message, generic);
      return generic;
    }

    if (availability.status === "present") {
      const rankedProducts = rankRecommendations(availability.products || [], availability.query, detectCategoryFromMessage(availability.query));
      const result = {
        reply: `Yes — I found matching products on the website for "${availability.query}":`,
        intent: "product_search",
        products: rankedProducts,
        productCards: rankedProducts,
        recommendations: rankedProducts,
        suggestions: [
          "Show me similar items",
          "Help me buy within my budget",
          "What should I check before buying?",
        ],
        aiPowered: false,
      };
      setCachedReply(message, result);
      return result;
    }

    const rankedProducts = rankRecommendations(availability.products || [], availability.query, detectCategoryFromMessage(availability.query));
    const result = {
      reply: `I could not find a direct match for "${availability.query}" on the current website, but here are similar alternatives that may fit your need:`,
      intent: "product_recommendation",
      products: rankedProducts,
      productCards: rankedProducts,
      recommendations: rankedProducts,
      missingItems: availability.missing ? [availability.query] : [],
      suggestions: [
        "Recommend a different budget option",
        "Find something similar for a trip",
        "Help me shortlist the best one",
      ],
      aiPowered: false,
    };
    setCachedReply(message, result);
    return result;
  }

  // ── FAST PATH: high or medium confidence KB match → skip Gemini entirely (serves in ~3ms) ──
  const fastKB = findKnowledgeBaseAnswer(message);
  if (fastKB && (fastKB.confidence === "high" || fastKB.confidence === "medium")) {
    const fastResult = {
      reply: formatKnowledgeReply(fastKB),
      intent: "knowledge_base",
      suggestions: fastKB.suggestions,
      sources: [fastKB.source],
      route: fastKB.route,
      aiPowered: false,
    };
    setCachedReply(message, fastResult);
    return fastResult;
  }

  return answerWithGemini({ message, safeHistory, user, attachments, deadline, context, shownProducts, knowledgeMatch: fastKB });
};

const describeShownProducts = (products = []) =>
  products.length
    ? `\nListings shown earlier in this chat (use these ids for compareTwoProducts or getProductDetails):\n${products
        .slice(-8)
        .map((p, i) => `${i + 1}. ${p.title} — ₹${Number(p.selling_price || 0).toLocaleString("en-IN")} (id: ${p._id})`)
        .join("\n")}\n`
    : "";

// The open-ended path: Gemini with function tools writes the whole reply.
const answerWithGemini = async ({ message, safeHistory, user, attachments, deadline, context, shownProducts = [], knowledgeMatch: fastKB = null, offTopic = false }) => {
  // ── CIRCUIT BREAKER: If Gemini is in rate-limit cooldown, serve local search instantly ──
  if (!isGeminiAvailable()) {
    console.log("[Assistant] Gemini API is in rate-limit cooldown. Serving immediate local fallback.");
    const localFallback = await fallbackLocalSearch(message);
    setCachedReply(message, localFallback);
    return localFallback;
  }

  const formattedHistory = safeHistory.map((msg) => ({
    role: msg.sender === "user" ? "user" : "model",
    parts: [{ text: msg.text.slice(0, 2000) }],
  }));

  const userTier = user?.subscription || USER_TIER?.BASE_USER || "base_user";
  const userName = user?.name ? `User's name is ${user.name}. ` : "";
  const knowledgeMatch = fastKB || (offTopic ? null : findKnowledgeBaseAnswer(message));
  const knowledgeContext = knowledgeMatch
    ? `\nKnowledge Base Context:\nTitle: ${knowledgeMatch.title}\nAnswer: ${knowledgeMatch.answer}\nSteps:\n${knowledgeMatch.steps?.map((step, index) => `${index + 1}. ${step}`).join("\n") || "N/A"}\nRelevant route: ${knowledgeMatch.route || "N/A"}\nSource: ${knowledgeMatch.source}\n`
    : "";
  const enhancedSystemPrompt = `${SYSTEM_PROMPT}\n${userName}User Tier: ${userTier}.\nAbout the student (use only when it genuinely helps):\n${describeViewerContext(context)}\n${describeShownProducts(shownProducts)}${knowledgeContext}\nReply in: ${replyLanguage(message.replace(/ \(continuing the request about:.*\)$/, ""))}\n`;

  const mediaParts = attachments
    .filter((attachment) => attachment?.data && attachment?.mimeType)
    .slice(0, 2)
    .map((attachment) => ({
      inlineData: {
        mimeType: attachment.mimeType,
        data: attachment.data.replace(/^data:[^,]*;base64,/i, ""),
      },
    }));

  const contents = [
    ...formattedHistory,
    { role: "user", parts: [{ text: message }, ...mediaParts] },
  ];

  try {
    let { response, model: usedModel } = await callGeminiWithFallback({
      contents,
      config: {
        systemInstruction: enhancedSystemPrompt,
        tools: [{ functionDeclarations: toolDeclarations }],
        temperature: 0.6,
        maxOutputTokens: 1024,
      },
    }, { deadline });

    const MAX_TOOL_ROUNDS = 2;
    let rounds = 0;
    const toolsUsed = new Set();

    let collectedProducts = null;
    let collectedEstimate = null;
    let collectedDraft = null;
    let collectedComparison = null;
    let collectedChecklist = null;
    let collectedBundle = null;
    let collectedSafetyTips = null;

    while (
      response.functionCalls &&
      response.functionCalls.length > 0 &&
      rounds < MAX_TOOL_ROUNDS
    ) {
      rounds++;
      const functionCallResults = [];

      for (const call of response.functionCalls) {
        toolsUsed.add(call.name);
        const handler = toolHandlers[call.name];
        let result;
        try {
          result = handler
            ? await handler(call.args || {})
            : { error: "Unknown tool" };

          if (call.name === "searchProducts" || call.name === "getTrendingProducts")
            collectedProducts = result.products;
          if (call.name === "estimateFairPrice") collectedEstimate = result;
          if (call.name === "generateListingDraft") collectedDraft = result.draft;
          if (call.name === "compareTwoProducts") collectedComparison = result;
          if (call.name === "getInspectionChecklist") collectedChecklist = result;
          if (call.name === "getBudgetBundle") collectedBundle = result;
          if (call.name === "getSafetyTips") collectedSafetyTips = result;
        } catch (err) {
          result = { error: err.message };
        }
        functionCallResults.push({
          name: call.name,
          response: result,
        });
      }

      contents.push({
        role: "model",
        parts: response.candidates[0].content.parts,
      });
      contents.push({
        role: "user",
        parts: functionCallResults.map((r) => ({
          functionResponse: { name: r.name, response: r.response },
        })),
      });

      const nextCall = await callGeminiWithFallback({
        contents,
        config: {
          systemInstruction: enhancedSystemPrompt,
          tools: [{ functionDeclarations: toolDeclarations }],
          temperature: 0.6,
          maxOutputTokens: 1024,
        },
      }, { deadline });
      response = nextCall.response;
      usedModel = nextCall.model;
    }

    const text = response.text || "";
    // The JSON object may come fenced, bare, or after a sentence of prose
    // (seen with Groq's models); take the object wherever it is.
    let parsed = parseJsonResponse(text);
    if (!parsed || typeof parsed.reply !== "string") {
      const cleanReply = text
        .replace(/```json\s*/g, "").replace(/```/g, "")
        .replace(/\{[\s\S]*\}\s*$/, "")
        // ...or a JSON object cut off mid-way (output limit reached).
        .replace(/\{\s*"reply"[\s\S]*$/, "")
        .trim();
      parsed = {
        reply: cleanReply || "I understood your question but had trouble formatting my response. Could you rephrase that?",
        intent: knowledgeMatch ? "knowledge_base" : "conversation",
        suggestions: knowledgeMatch?.suggestions || [
          "Show trending items",
          "How do I sell on Unideals?",
          "Safety tips for meetups",
        ],
      };
    }

    const result = {
      reply: parsed.reply || text,
      intent: parsed.intent || (knowledgeMatch ? "knowledge_base" : inferIntentFromTools(toolsUsed)),
      products: collectedProducts || [],
      suggestions:
        parsed.suggestions || knowledgeMatch?.suggestions || [
          "Show trending items",
          "Help me sell",
          "Safety tips",
        ],
      estimate: collectedEstimate && !collectedEstimate.error ? collectedEstimate : null,
      draft: parsed.draft || collectedDraft,
      comparison: collectedComparison,
      checklist: collectedChecklist,
      bundle: collectedBundle,
      safetyTips: collectedSafetyTips,
      sources: knowledgeMatch ? [knowledgeMatch.source] : parsed.sources,
      route: knowledgeMatch?.route || parsed.route,
      aiPowered: true,
      model: usedModel,
      // Already in the persona's voice: the reply writer skips it.
      writtenByModel: true,
    };
    return result;
  } catch (error) {
    console.warn("Gemini fallback triggered:", error.message || error);
    if (offTopic) return { ...offTopicReply(user), composeMode: false };
    return await fallbackLocalSearch(message);
  }
};

export const buildEnhanceListingReply = async ({
  itemDescription,
  condition,
  originalPrice,
  category,
}) => {
  const prompt = `
You are an expert copywriter for Unideals, a campus marketplace.
Enhance the following item details into a highly compelling, structured product listing for college students.
Item Description: ${itemDescription}
Condition: ${condition || "Not specified"}
Original Price: ${originalPrice ? "₹" + originalPrice : "Not specified"}
Category: ${category || "Not specified"}

Return ONLY a JSON object with this structure:
{
  "title": "Catchy title",
  "description": "Engaging description with bullet points",
  "suggestedPrice": "Fair price based on condition/original price",
  "tags": ["tag1", "tag2"]
}
`;

  try {
    const { response } = await callGeminiWithFallback({
      contents: prompt,
      config: {
        temperature: 0.7,
      },
    });

    const text = response.text || "";
    let cleanText = text;
    if (text.includes("```json")) {
      cleanText = text.split("```json")[1].split("```")[0];
    }
    return JSON.parse(cleanText);
  } catch (error) {
    const item = String(itemDescription || "Item").trim();
    return {
      title: `${item.slice(0, 40)} - student owned`,
      description: `Selling ${item}. In ${condition || "good"} condition. Ready for quick campus pickup.`,
      tags: ["studentdeal", "campuspickup"],
    };
  }
};

export const buildNegotiationAdvice = async ({
  productId,
  askingPrice,
  offerPrice,
  userRole,
}) => {
  const prompt = `
You are a negotiation expert on a campus marketplace.
Product ID: ${productId}
Asking Price: ₹${askingPrice}
Offer Price: ₹${offerPrice}
User Role: ${userRole} (buyer or seller)

Provide friendly, actionable advice on how to respond to this offer.
Keep it under 3 sentences and suggest a fair counter-offer if applicable.
`;

  try {
    const { response } = await callGeminiWithFallback({
      contents: prompt,
      config: {
        temperature: 0.5,
      },
    });

    return { advice: response.text };
  } catch (error) {
    return { advice: "Try to find a middle ground that works for both of you." };
  }
};
