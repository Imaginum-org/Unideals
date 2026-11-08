import axios from "../../../services/axiosInstance";
import { cachedRequest, invalidateRequests, requestKey } from "../../../services/requestCache.js";

// Read endpoints are briefly cached (services/requestCache.js) so back/forward
// navigation and hover-prefetch are instant; every product mutation below
// clears the product cache so owners always see their change immediately.
const FEED_TTL = 45 * 1000;
const DETAIL_TTL = 30 * 1000;
const PRODUCT_PREFIX = "/api/product";
const mutate = (promise) =>
  promise.then((res) => {
    invalidateRequests(PRODUCT_PREFIX);
    return res;
  });

// GET PRODUCTS
export const getProducts = (params = {}) => {
  return cachedRequest(requestKey("/api/product", params), FEED_TTL, () =>
    axios.get("/api/product", { params }),
  );
};

// Girls Corner 🌸 feed — same endpoint, audience param (no new route).
export const getGirlsCornerProducts = (params = {}) => {
  return getProducts({ ...params, audience: "girls_only" });
};

export const getBoostedProducts = (params = {}) => {
  return cachedRequest(requestKey("/api/product/boosted", params), FEED_TTL, () =>
    axios.get("/api/product/boosted", { params }),
  );
};

export const getBoostSummary = () => {
  return axios.get("/api/boost/me/summary");
};

// GET PRODUCT BY ID
// AbortSignals are deliberately NOT forwarded into the shared request: one
// caller unmounting must not cancel the response another caller (or the
// hover-prefetch) is waiting for. Callers still ignore stale results.
export const getProductById = (id, params = {}, { fresh = false } = {}) => {
  const url = `/api/product/${id}`;
  if (fresh) invalidateRequests(requestKey(url, params));
  return cachedRequest(requestKey(url, params), DETAIL_TTL, () => axios.get(url, { params }));
};

// Warm the detail cache (card hover / touchstart) so opening it is instant.
export const prefetchProduct = (id, params = {}) => getProductById(id, params).catch(() => {});

// GET USER PRODUCTS
export const getUserProducts = () => {
  return axios.get("/api/product/user/my-products");
};

// CREATE PRODUCT
export const createProduct = (data) => {
  return mutate(axios.post("/api/product", data));
};

// UPDATE PRODUCT
export const updateProduct = (productId, data) => {
  return mutate(axios.patch(`/api/product/${productId}`, data));
};

export const getDraftProducts = () => {
  return axios.get("/api/product/user/drafts");
};

// SAVE DRAFT
export const saveDraftProduct = (data) => {
  return mutate(axios.post("/api/product", {
    ...data,

    status: "draft",
  }));
};

// DELETE PRODUCT
export const deleteProduct = (productId) => {
  return mutate(axios.delete(`/api/product/${productId}`));
};

// UNLIST PRODUCT
export const unlistProduct = (productId) => {
  return mutate(axios.patch(`/api/product/${productId}/unlist`));
};

// RELIST PRODUCT
export const relistProduct = (productId) => {
  return mutate(axios.patch(`/api/product/${productId}/relist`));
};

// MARK SOLD — PATCH /api/product/:id/sold (owner only, listed → sold)
export const markProductSold = (productId) => {
  return mutate(axios.patch(`/api/product/${productId}/sold`));
};

export const boostProduct = (productId) => {
  return mutate(axios.post(`/api/boost/products/${productId}`));
};
