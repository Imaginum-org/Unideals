import axios from "../../../services/axiosInstance";

export const getUserProfile = () => axios.get("/api/user/userProfile");

export const updateProfile = (data) =>
  axios.put("/api/user/updateProfile", data);

export const updateAvatar = (data) => axios.put("/api/user/updateAvatar", data);

export const removeAvatar = () => axios.delete("/api/user/removeAvatar");

export const deleteAccount = (data = {}) =>
  axios.delete("/api/user/deleteAccount", { data });

export const createPickupSpot = (data) => axios.post("/api/pickup-spots", data);

export const getUserPickupSpots = () => axios.get("/api/pickup-spots");

export const updatePickupSpot = (id, data) =>
  axios.put(`/api/pickup-spots/${id}`, data);

export const deletePickupSpot = (id) => axios.delete(`/api/pickup-spots/${id}`);

export const setPrimaryPickupSpot = (id) =>
  axios.patch(`/api/pickup-spots/${id}/primary`);
