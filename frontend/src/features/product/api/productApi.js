import axios from "../../../services/axiosInstance";

// GET PRODUCTS
export const getProducts = (params = {}) => {
  return axios.get("/api/product", {
    params,
  });
};

// GET PRODUCT BY ID
export const getProductById = (id) => {
  return axios.get(`/api/product/${id}`);
};

// GET USER PRODUCTS
export const getUserProducts = () => {
  return axios.get("/api/product/user/my-products");
};

// CREATE PRODUCT
export const createProduct = (data) => {
  return axios.post("/api/product", data);
};

// UPDATE PRODUCT
export const updateProduct = (productId, data) => {
  return axios.patch(`/api/product/${productId}`, data);
};

export const getDraftProducts = () => {
  return axios.get("/api/product/user/drafts");
};

// SAVE DRAFT
export const saveDraftProduct = (data) => {
  return axios.post("/api/product", {
    ...data,

    status: "draft",
  });
};

// DELETE PRODUCT
export const deleteProduct = (productId) => {
  return axios.delete(`/api/product/${productId}`);
};

// UNLIST PRODUCT
export const unlistProduct = (productId) => {
  return axios.patch(`/api/product/${productId}/unlist`);
};

// RELIST PRODUCT
export const relistProduct = (productId) => {
  return axios.patch(`/api/product/${productId}/relist`);
};
