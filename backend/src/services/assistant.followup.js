// Reads the conversation so follow-ups work in code, without the model:
//   "cheaper ones", "under 2000", "any in like new?", "what about dell"
//       → refine the last search, keeping its topic and earlier filters
//   "is it negotiable?", "tell me more about the 2nd one"
//       → that listing's details
//   "compare the first two", "which is better, 1st or 3rd?"
//       → side-by-side comparison
// Returns a plan (or null); assistant.service.js turns it into a reply.
import { categoryFromTokens, tokenizeSearchQuery } from "./assistant.tools.js";

const CONDITION_PATTERNS = [
  [/\b(?:brand[- ]new|sealed|unused|unopened)\b/i, "brand_new"],
  [/\b(?:like[- ]new|mint|almost new|barely used)\b/i, "like_new"],
  [/\b(?:gently used|good condition|lightly used)\b/i, "gently_used"],
];

const SORT_PATTERNS = [
  [/\b(?:cheaper|cheapest|lower price|less expensive|more affordable|lowest price)\b/i, "price_low"],
  [/\b(?:costlier|pricier|premium|high[- ]end|more expensive|better quality)\b/i, "price_high"],
  [/\b(?:newest|latest|most recent|just listed)\b/i, "newest"],
  [/\bmost viewed\b/i, "most_viewed"],
];

// Words that only steer a follow-up ("any other ones in like new?") and must
// not be mistaken for a new product to search for.
const FOLLOW_UP_FILLER = /\b(?:what|about|how|any|anything|ones?|more|else|other|others|options?|also|instead|only|those|these|them|got|with|in|show|me|similar|like|that|this|the|is|are|there|do|you|have|please|cheaper|cheapest|costlier|pricier|premium|newest|latest|recent|most|viewed|lower|lowest|less|expensive|affordable|price|condition|quality|better|brand|new|used|sealed|unused|unopened|mint|almost|barely|gently|lightly|good|high|end|just|listed|and|but|ok|okay|hmm|then|now)\b/gi;

const FOLLOW_UP_START = /^(?:and\s+|also\s+|ok(?:ay)?\s+|hmm\s+)?(?:show|find|give|any|got any|what about|how about|only|just)?\s*(?:cheaper|more affordable|similar|more like (?:that|this|these)|another|other ones?|others|those|these|under\s+₹?\s*\d|below\s+₹?\s*\d|for\s+₹?\s*\d|more options|anything else)\b|^(?:show more|more options|anything else)\b/i;
const WHAT_ABOUT_START = /^(?:and\s+|also\s+|ok(?:ay)?\s+)?(?:what|how) about\b|^(?:any|got any|do you have any)\b.*\b(?:in|with)\b/i;

// Questions about one specific listing.
const DETAIL_CUE = /\b(?:negotiable|negotiate|bargain|condition|details?|more about|tell me more|describe|description|seller|original price|mrp|bill|box|warranty|how old|age|still available|specs?|specifications|worth it|good deal|fair price|discount|images?|photos?|pics?|link|open it|view it)\b/i;
const COMPARE_CUE = /\b(?:compare|comparison|vs\.?|versus|difference|which (?:one )?is (?:better|cheaper|best)|which (?:one )?(?:should i|to) (?:buy|get|pick|choose)|better one)\b/i;
const PRONOUN_REF = /\b(?:it|this|that|this one|that one|the one)\b/i;
const PLURAL_REF = /\b(?:them|both|these two|those two|the two|first two|top two)\b/i;

const ORDINAL_WORDS = {
  first: 1, "1st": 1, second: 2, "2nd": 2, third: 3, "3rd": 3,
  fourth: 4, "4th": 4, fifth: 5, "5th": 5, sixth: 6, "6th": 6,
};

/** 0-based indexes of the listings a message points at ("the 2nd", "#3", "last one"). */
export const referencedIndexes = (text, count) => {
  const found = [];
  const add = (n) => {
    if (n >= 1 && n <= count && !found.includes(n - 1)) found.push(n - 1);
  };
  const lower = String(text).toLowerCase();
  for (const match of lower.matchAll(/\b(first|1st|second|2nd|third|3rd|fourth|4th|fifth|5th|sixth|6th)\b(?![-\w])/g)) {
    // "first two" means the first two listings, not "the first one".
    if (match[1] === "first" && /^\s+two\b/.test(lower.slice(match.index + match[0].length))) continue;
    add(ORDINAL_WORDS[match[1]]);
  }
  for (const match of lower.matchAll(/(?:#\s?|\b(?:no\.?|number|option|item|listing)\s?)(\d)\b/g)) add(Number(match[1]));
  if (/\b(?:the\s+)?last\s+(?:one|listing|item|option)\b/.test(lower)) add(count);
  return found;
};

const detectCondition = (text) => CONDITION_PATTERNS.find(([re]) => re.test(text))?.[1];
const detectSort = (text) => SORT_PATTERNS.find(([re]) => re.test(text))?.[1];

const newProductTokens = (text) =>
  tokenizeSearchQuery(String(text).replace(FOLLOW_UP_FILLER, " "));

/** The latest list of listings shown (the cards in the most recent reply that had any). */
export const latestShownList = (shownProducts = []) => {
  if (!shownProducts.length) return [];
  const groups = shownProducts.map((p) => (Number.isInteger(p.group) ? p.group : 0));
  const latest = Math.max(...groups);
  const seen = new Set();
  return shownProducts.filter((p, i) => {
    if (groups[i] !== latest || seen.has(String(p._id))) return false;
    seen.add(String(p._id));
    return true;
  });
};

const emptySearch = () => ({ tokens: [], maxPrice: undefined, minPrice: undefined, condition: undefined, sortBy: undefined });

/**
 * Applies one user message to the running search state. Returns
 * { state, refined } where refined says the message was a follow-up to the
 * previous search (rather than a new search or something unrelated).
 */
const applyMessage = (state, text, { isShoppingQuery, parsePriceConstraint }) => {
  const price = parsePriceConstraint(text);
  const condition = detectCondition(text);
  const sortBy = detectSort(text);
  const hasConstraint = price.maxPrice !== undefined || price.minPrice !== undefined || Boolean(condition) || Boolean(sortBy);
  const added = newProductTokens(text);
  const words = text.trim().split(/\s+/).length;

  if (state.tokens.length) {
    const merged = () => ({
      ...state,
      maxPrice: price.maxPrice ?? (price.minPrice !== undefined ? undefined : state.maxPrice),
      minPrice: price.minPrice ?? (price.maxPrice !== undefined ? undefined : state.minPrice),
      condition: condition || state.condition,
      sortBy: sortBy || state.sortBy,
    });
    // "what about dell?" adds a word to the topic; "what about books?" is a new topic.
    if (WHAT_ABOUT_START.test(text) && added.length && !categoryFromTokens(added)) {
      return { state: { ...merged(), tokens: [...new Set([...state.tokens, ...added])] }, refined: true };
    }
    if (!added.length && (FOLLOW_UP_START.test(text) || WHAT_ABOUT_START.test(text) || (hasConstraint && words <= 8))) {
      return { state: merged(), refined: true };
    }
  }

  if (isShoppingQuery(text)) {
    const tokens = tokenizeSearchQuery(text);
    if (tokens.length) {
      return {
        state: { tokens, maxPrice: price.maxPrice, minPrice: price.minPrice, condition, sortBy },
        refined: false,
      };
    }
  }
  // Questions, policies, small talk: the last search stays the topic.
  return { state, refined: false };
};

/**
 * Works out whether `message` depends on the conversation. `helpers` are the
 * service's own parsers (passed in to avoid a circular import).
 *
 * Plans:
 *   { kind: "search",  query, maxPrice, minPrice, condition, sortBy }
 *   { kind: "product", product }            one listing the student asked about
 *   { kind: "price",   product }            "is it a fair price?"
 *   { kind: "compare", products: [a, b] }
 *   { kind: "which",   products }           "it" with several listings on screen
 */
export const planFollowUp = ({ message, history = [], shownProducts = [] }, helpers) => {
  const text = String(message || "").trim();
  if (!text || text.length > 300) return null;

  // 1. References to listings already on screen.
  const latest = latestShownList(shownProducts);
  if (latest.length) {
    const indexes = referencedIndexes(text, latest.length);
    if (COMPARE_CUE.test(text) && latest.length >= 2) {
      const pair = indexes.length >= 2 ? indexes.slice(0, 2) : PLURAL_REF.test(text) || /\bfirst two\b/i.test(text) ? [0, 1] : null;
      if (pair) return { kind: "compare", products: pair.map((i) => latest[i]) };
    }
    const asksPrice = /\b(?:fair price|good deal|worth it|overpriced|too expensive|right price)\b/i.test(text);
    const shortAsk = text.split(/\s+/).length <= 8;
    if (indexes.length === 1 && (DETAIL_CUE.test(text) || shortAsk)) {
      return { kind: asksPrice ? "price" : "product", product: latest[indexes[0]] };
    }
    if (!indexes.length && PRONOUN_REF.test(text) && DETAIL_CUE.test(text)) {
      if (latest.length === 1) return { kind: asksPrice ? "price" : "product", product: latest[0] };
      return { kind: "which", products: latest.slice(0, 6) };
    }
  }

  // 2. Refining the previous search.
  let state = emptySearch();
  for (const entry of history) {
    if (entry.sender === "user" && entry.text) state = applyMessage(state, entry.text, helpers).state;
  }
  const { state: next, refined } = applyMessage(state, text, helpers);
  if (!refined) return null;
  return {
    kind: "search",
    query: next.tokens.join(" "),
    maxPrice: next.maxPrice,
    minPrice: next.minPrice,
    condition: next.condition,
    sortBy: next.sortBy,
  };
};
