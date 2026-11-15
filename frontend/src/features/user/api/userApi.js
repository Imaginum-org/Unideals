import axios from "../../../services/axiosInstance";

export const getUserProfile = () => axios.get("/api/user/userProfile");

export const updateProfile = (data) =>
  axios.put("/api/user/updateProfile", data);

// Multipart: the requested gender plus a photo of the college ID card.
export const requestGenderChange = (requestedGender, idCardFile, { onUploadProgress } = {}) => {
  const form = new FormData();
  form.append("requestedGender", requestedGender);
  form.append("idCard", idCardFile, idCardFile.name || "college-id.jpg");
  return axios.post("/api/user/requestGenderChange", form, { onUploadProgress, timeout: 60000 });
};

// Withdraws a pending request; the server deletes the ID photo.
export const cancelGenderChange = () => axios.delete("/api/user/genderChangeRequest");

export const getGenderChangeStatus = () =>
  axios.get("/api/user/genderChangeStatus");

export const updateChatSettings = (data) =>
  axios.put("/api/user/chatSettings", data);

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

// College email verification (blue tick).
export const getCollegeVerification = () => axios.get("/api/user/college-verification");
export const sendCollegeOtp = (email) => axios.post("/api/user/college-verification/send-otp", { email });
export const verifyCollegeOtp = (code) => axios.post("/api/user/college-verification/verify", { code });
