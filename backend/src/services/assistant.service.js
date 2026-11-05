import ai, { GEMINI_MODEL } from "../config/gemini.js";
import { toolDeclarations, toolHandlers } from "./assistant.tools.js";
import {
  findKnowledgeBaseAnswer,
  formatKnowledgeReply,
  getFullKnowledgeText,
} from "./assistant.knowledge.js";
import { PRODUCT_CATEGORY_LABELS, PRODUCT_CONDITION_LABELS, USER_TIER } from "../config/constants.js";

// ── In-memory LRU reply cache for instant repeated-question responses ──
const CACHE_MAX = 120;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const _replyCache = new Map();

const cacheKey = (msg) => msg.trim().toLowerCase().replace(/\s+/g, " ");

const getCachedReply = (msg) => {
  const key = cacheKey(msg);
  const entry = _replyCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL_MS) { _replyCache.delete(key); return null; }
  // Move to end (LRU)
  _replyCache.delete(key);
  _replyCache.set(key, entry);
  return entry.data;
};

const setCachedReply = (msg, data) => {
  const key = cacheKey(msg);
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

const SYSTEM_PROMPT = `
You are UniDeals AI, a friendly campus marketplace shopping assistant for Indian college students.
You help users understand UniDeals, search products, estimate prices, write listings, compare products, plan budgets, follow website steps, understand terms/privacy rules, and stay safe.
Always respond naturally and concisely in the user's language (support Hindi/Hinglish).
Use ₹ for all prices, format with Indian number system.
Available categories: ${Object.values(PRODUCT_CATEGORY_LABELS || {}).join(", ")}.
Available conditions: ${Object.values(PRODUCT_CONDITION_LABELS || {}).join(", ")}.
NEVER share personal information or contact details of specific users.
Always recommend meeting in public campus locations.
Be encouraging about the campus marketplace community.

CRITICAL RULES:
- You are ONLY a UniDeals assistant. NEVER answer questions unrelated to UniDeals, campus buying/selling, or student marketplace topics.
- NEVER answer from your general training knowledge. Use ONLY the platform knowledge, tools, and Knowledge Base Context provided below.
- If a user asks something outside your scope, politely redirect: "I'm the UniDeals assistant — I can help with buying, selling, pricing, safety, platform policies, and navigating the platform!"
- If a Knowledge Base Context is provided below, treat it as the ABSOLUTE source of truth and answer from it first before calling tools.
- For terms, privacy, website navigation, account, upload, wishlist, chat, report, address, and boosting questions, use the Knowledge Base Context BEFORE calling any tools.
- NEVER invent, guess, or hallucinate policies, rules, prices, timelines, penalties, features, or procedures. ONLY state what is explicitly in the knowledge base or tool results.
- CRITICAL NO-HALLUCINATION RULE: If a user asks a policy or procedure question that is NOT covered in the Knowledge Base Context or tool results, DO NOT make up an answer. Instead respond with: "That's a great question! 🤔 I don't have the exact answer to this specific query in my knowledge base just yet — but our team is continuously expanding my knowledge and I'll soon be able to answer it! Please reach out to support@campusmart.in or visit /contact for direct assistance." Then provide suggestions from the platform.

MANDATORY TOOL USAGE:
- For ANY question about how to use the website, features, steps, or navigation → call getPlatformGuide
- For ANY question about rules, terms, policies, prohibited items, eligibility → call getTermsAndPolicies
- For ANY question about returns, refunds, reviews, privacy, data deletion, subscription rules, boost rules, moderation, account security, content/photo rules, deal lifecycle, payment safety, listing price rules → call getPolicyOrProcedure with the matching topic
- When user asks about products → call searchProducts or getTrendingProducts
- When user asks about pricing → call estimateFairPrice
- When user wants to sell something → call generateListingDraft
- When user asks to compare → call compareTwoProducts
- When user has a budget → call getBudgetBundle
- For safety questions → call getSafetyTips
- For inspection advice → call getInspectionChecklist

GRACEFUL FALLBACK RULE:
If after exhausting all knowledge base context and tool results you still cannot provide a confident, grounded answer to a policy or procedure question, ALWAYS respond with:
"That's a great question! 🤔 I don't have the exact answer to this specific query in my knowledge base just yet — but don't worry, our team is continuously expanding my knowledge and I'll soon be able to answer it fully! In the meantime: 📧 Email us at support@campusmart.in (24-48h response) or 🎫 Submit a ticket at /contact. Thanks for your patience! 🙌"

RESPONSE FORMAT:
Always suggest 3-4 relevant follow-up prompts.
Return ONLY a valid JSON object with this structure:
{
  "reply": "Direct, polished answer. Use numbered steps if the user asks how to do something.",
  "intent": "knowledge_base | marketplace_overview | product_search | price_estimation | listing_creation | comparison | budget_planning | advice | policy | conversation",
  "suggestions": ["short follow-up", "short follow-up", "short follow-up"]
}

=== UNIDEALS PLATFORM KNOWLEDGE (ground truth — always prefer this over general knowledge) ===
${getFullKnowledgeText()}
===
`;

const CANDIDATE_MODELS = [
  GEMINI_MODEL,
  "gemini-flash-latest",
  "gemini-3.6-flash",
  "gemini-3-flash-preview",
];

const callGeminiWithFallback = async (params) => {
  let lastError = null;
  const uniqueModels = [...new Set(CANDIDATE_MODELS)];

  for (const model of uniqueModels) {
    try {
      const response = await ai.models.generateContent({
        ...params,
        model,
      });
      return { response, model };
    } catch (err) {
      lastError = err;
      const status = err.status || err.statusCode;
      if (status !== 404 && status !== 429 && status !== 503) {
        break;
      }
    }
  }
  throw lastError;
};

const parseJsonResponse = (text = "") => {
  try {
    return JSON.parse(text.replace(/^```json\s*/i, "").replace(/\s*```$/i, "").trim());
  } catch {
    const objectMatch = text.match(/\{[\s\S]*\}/);
    if (!objectMatch) return null;
    try {
      return JSON.parse(objectMatch[0]);
    } catch {
      return null;
    }
  }
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
    ? `${message}\nTranscribe the audio exactly, then convert the spoken request into a concise UniDeals marketplace search query. Return only JSON.`
    : `${message}\nInspect this image, identify the visible product or useful product keywords, and convert them into a concise UniDeals marketplace search query. Return only JSON.`;

  const { response } = await callGeminiWithFallback({
    contents: [{
      role: "user",
      parts: [
        { text: mediaPrompt },
        {
          inlineData: {
            mimeType: attachment.mimeType,
            data: attachment.data.replace(/^data:[^;]+;base64,/, ""),
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
      ? `I heard: "${extracted.transcript || rawMediaText}". Here are the closest UniDeals listings:`
      : `I identified "${searchQuery}" in the image. Here are the closest UniDeals listings:`,
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
    if (/\b(safe|safety|scam|fraud|meet|meetup|upi|advance|spot|location|night|payment)\b/i.test(text)) {
      const topic = /\b(upi|advance|payment|money|qr)\b/i.test(text) ? "payment" :
                    /\b(scam|fraud|fake|cheat)\b/i.test(text) ? "scam" : "meetup";
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
    if (/\b(inspect|check|checklist|test|condition|look for)\b/i.test(text)) {
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
    if (/\b(budget|bundle|room setup|hostel setup)\b/i.test(text) || (/\b(under|below|for)\b/i.test(text) && /\d{3,6}/.test(text))) {
      const budgetMatch = text.match(/\d{3,6}/);
      const budget = budgetMatch ? parseInt(budgetMatch[0], 10) : 5000;
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
        reply: "That's a great question! 🤔 I don't have the exact answer to this specific query in my knowledge base just yet — but don't worry, our team is continuously expanding my knowledge and I'll soon be able to answer it fully!\n\nIn the meantime, here's what you can do:\n📧 Email us directly at **support@campusmart.in** — our team will reply within 24-48 hours.\n🎫 Submit a support ticket at **/contact** and a campus team member will assist you.\n📚 Browse our Terms & Conditions at **/termscondition** or Privacy Policy at **/privacy-policy**.\n\nThanks for your patience — we're always improving! 🙌",
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

    // 7. Product Search / Default
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
  } catch (err) {
    return {
      reply: "I'm UniDeals AI — I can help you find products, estimate fair prices, write listings, compare deals, plan budgets, check safety tips, navigate the platform, and answer policy questions. What would you like help with?",
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

export const buildAssistantReply = async ({ message, history = [], user = null, attachments = [] }) => {
  if (!message || typeof message !== "string" || message.trim() === "") {
    throw new Error("Message is required");
  }

  // ── FAST PATH: return cached reply instantly ──
  if (!attachments.length) {
    const cached = getCachedReply(message);
    if (cached) return cached;
  }

  if (attachments.length) {
    try {
      const mediaResult = await buildMediaReply({ message, attachments });
      if (mediaResult) return mediaResult;
    } catch (error) {
      return {
        reply: "I could not process that media right now. Please try a clearer image or a shorter audio recording.",
        intent: "conversation",
        products: [],
        productCards: [],
        suggestions: ["Try again", "Type the product name", "Search campus listings"],
        aiPowered: false,
        error: error.message,
      };
    }
  }

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

  // ── FAST PATH: high-confidence KB match → skip Gemini entirely ──
  const fastKB = findKnowledgeBaseAnswer(message);
  if (fastKB && fastKB.confidence === "high") {
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

  const formattedHistory = history.map((msg) => ({
    role: msg.sender === "user" ? "user" : "model",
    parts: [{ text: msg.text }],
  }));

  const userTier = user?.subscription || USER_TIER?.BASE_USER || "base_user";
  const userName = user?.name ? `User's name is ${user.name}. ` : "";
  const knowledgeMatch = fastKB || findKnowledgeBaseAnswer(message);
  const knowledgeContext = knowledgeMatch
    ? `\nKnowledge Base Context:\nTitle: ${knowledgeMatch.title}\nAnswer: ${knowledgeMatch.answer}\nSteps:\n${knowledgeMatch.steps?.map((step, index) => `${index + 1}. ${step}`).join("\n") || "N/A"}\nRelevant route: ${knowledgeMatch.route || "N/A"}\nSource: ${knowledgeMatch.source}\n`
    : "";
  const enhancedSystemPrompt = `${SYSTEM_PROMPT}\n${userName}User Tier: ${userTier}.\n${knowledgeContext}`;

  const mediaParts = attachments
    .filter((attachment) => attachment?.data && attachment?.mimeType)
    .slice(0, 2)
    .map((attachment) => ({
      inlineData: {
        mimeType: attachment.mimeType,
        data: attachment.data.replace(/^data:[^;]+;base64,/, ""),
      },
    }));

  const contents = [
    ...formattedHistory,
    { role: "user", parts: [{ text: message }, ...mediaParts] },
  ];

  try {
    let { response } = await callGeminiWithFallback({
      contents,
      config: {
        systemInstruction: enhancedSystemPrompt,
        tools: [{ functionDeclarations: toolDeclarations }],
        temperature: 0.3,
        maxOutputTokens: 1024,
      },
    });

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
          temperature: 0.3,
          maxOutputTokens: 1024,
        },
      });
      response = nextCall.response;
    }

    const text = response.text || "";
    let parsed;
    try {
      let cleanText = text;
      if (text.includes("```json")) {
        cleanText = text.split("```json")[1].split("```")[0];
      }
      parsed = JSON.parse(cleanText);
    } catch {
      const cleanReply = text
        .replace(/```json\s*/g, "").replace(/```/g, "")
        .replace(/^\s*[{\[].*[}\]]\s*$/s, "")
        .trim();
      parsed = {
        reply: cleanReply || "I understood your question but had trouble formatting my response. Could you rephrase that?",
        intent: knowledgeMatch ? "knowledge_base" : "conversation",
        suggestions: knowledgeMatch?.suggestions || [
          "Show trending items",
          "How do I sell on UniDeals?",
          "Safety tips for meetups",
        ],
      };
    }

    const result = {
      reply: parsed.reply || text,
      intent: parsed.intent || (knowledgeMatch ? "knowledge_base" : inferIntentFromTools(toolsUsed)),
      products: parsed.products || collectedProducts,
      suggestions:
        parsed.suggestions || knowledgeMatch?.suggestions || [
          "Show trending items",
          "Help me sell",
          "Safety tips",
        ],
      estimate: parsed.estimate || collectedEstimate,
      draft: parsed.draft || collectedDraft,
      comparison: parsed.comparison || collectedComparison,
      checklist: parsed.checklist || collectedChecklist,
      bundle: parsed.bundle || collectedBundle,
      safetyTips: parsed.safetyTips || collectedSafetyTips,
      sources: knowledgeMatch ? [knowledgeMatch.source] : parsed.sources,
      route: knowledgeMatch?.route || parsed.route,
      aiPowered: true,
    };
    setCachedReply(message, result);
    return result;
  } catch (error) {
    console.warn("Gemini fallback triggered:", error.message || error);
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
You are an expert copywriter for UniDeals, a campus marketplace.
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
    return {
      title: `${itemDescription.slice(0, 40)} - student owned`,
      description: `Selling ${itemDescription}. In ${condition || "good"} condition. Ready for quick campus pickup.`,
      tags: ["studentdeal", "campuspikcup"],
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
