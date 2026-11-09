import axios from "../../../services/axiosInstance";
import { cachedRequest, requestKey } from "../../../services/requestCache.js";

// Read-only endpoints share the short-lived request cache: re-running the
// same search (back button, retyping a query, header + results page asking
// at once) costs no extra round-trip or DB aggregation.
const SEARCH_TTL = 45 * 1000;
const SUGGEST_TTL = 60 * 1000;
const TRENDING_TTL = 2 * 60 * 1000; // server caches 5 min; reopening the search re-checks

export const searchProducts = (params = {}) => {
  // Accepts a query string (legacy) or a params object
  // { q, page, limit, sort, category, condition, min_price, max_price }.
  const queryParams =
    typeof params === "string" ? { q: params } : params || {};
  const url = "/api/product/search";
  return cachedRequest(requestKey(url, queryParams), SEARCH_TTL, () =>
    axios.get(url, { params: queryParams }),
  );
};

// Cheap autocomplete endpoint (title prefix, max 6) for the header dropdown.
// Cached per query: backspacing / retyping the same prefix is free.
// (The signal is not forwarded into the shared request; callers already
// discard out-of-order results.)
export const getSearchSuggestions = (query) => {
  const url = "/api/product/search-suggestions";
  const params = { q: query };
  return cachedRequest(requestKey(url, params), SUGGEST_TTL, () => axios.get(url, { params }));
};

// Trending listings (views + freshness + plan rank) for empty states, 5-min server cache per campus.
export const getTrendingProducts = (params = {}) => {
  const url = "/api/product/trending";
  return cachedRequest(requestKey(url, params), TRENDING_TTL, () => axios.get(url, { params }));
};
