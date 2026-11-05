import axios from "../../../services/axiosInstance";

export const searchProducts = (params = {}, config = {}) => {
  // Accepts a query string (legacy) or a params object
  // { q, page, limit, sort, category, condition, min_price, max_price }.
  const queryParams =
    typeof params === "string" ? { q: params } : params || {};
  return axios.get("/api/product/search", {
    params: queryParams,
    ...config,
  });
};

// Cheap autocomplete endpoint (title prefix, max 6) for the header dropdown.
export const getSearchSuggestions = (query, signal) => {
  return axios.get("/api/product/search-suggestions", {
    params: { q: query },
    signal,
  });
};

// Most-viewed listings for empty states (10-min server cache, per campus).
export const getTrendingProducts = (params = {}) => {
  return axios.get("/api/product/trending", { params });
};
