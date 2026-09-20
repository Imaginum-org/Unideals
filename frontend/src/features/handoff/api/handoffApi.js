import axios from "../../../services/axiosInstance";

const HANDOFF_BASE_PATH = "/api/handoff";

// POST /api/handoff — desktop creates a pairing session (auth).
export const createHandoffSession = () => {
  return axios.post(`${HANDOFF_BASE_PATH}`);
};

// GET /api/handoff/:code — desktop polls for new phone photos (auth).
export const getHandoffStatus = (code) => {
  return axios.get(`${HANDOFF_BASE_PATH}/${code}`);
};

// POST /api/handoff/:code/photos?k=<secret> — phone uploads (QR-secret
// auth, no login). Multipart FormData with `photos` files.
export const uploadHandoffPhotos = (code, secret, formData, onProgress) => {
  return axios.post(
    `${HANDOFF_BASE_PATH}/${code}/photos`,
    formData,
    {
      params: { k: secret },
      headers: { "Content-Type": "multipart/form-data" },
      timeout: 120000,
      onUploadProgress: onProgress,
    },
  );
};
