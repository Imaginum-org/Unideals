import axios from "../../../services/axiosInstance";

export const getUserProfile = () => axios.get("/api/user/userProfile");

export const updateProfile = (data) =>
  axios.put("/api/user/updateProfile", data);

export const updateAvatar = (data) => axios.put("/api/user/updateAvatar", data);

export const removeAvatar = () => axios.delete("/api/user/removeAvatar");

export const deleteAccount = () => axios.delete("/api/user/deleteAccount");

export const createAddress = (data) => axios.post("/api/address", data);

export const getUserAddresses = () => axios.get("/api/address");

export const updateAddress = (id, data) =>
  axios.put(`/api/address/${id}`, data);

export const deleteAddress = (id) => axios.delete(`/api/address/${id}`);

export const setDefaultAddress = (id) => axios.patch(`/api/address/${id}`);
