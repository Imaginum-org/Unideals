import axios from "../../../services/axiosInstance";

const HANDOFF_BASE_PATH = "/api/handoff";

// POST /api/handoff — desktop creates a pairing session (auth).
// maxFiles caps how many more photos the phone may send (hybrid slots).
export const createHandoffSession = (maxFiles) => {
  return axios.post(`${HANDOFF_BASE_PATH}`, { max_files: maxFiles });
};

// GET /api/handoff/:code — desktop polls for new phone photos (auth).
export const getHandoffStatus = (code) => {
  return axios.get(`${HANDOFF_BASE_PATH}/${code}`);
};

// POST /api/handoff/:code/photos — phone uploads (QR-secret auth via
// header, no login). Secret stays out of the URL (history/logs/Referer).
// Multipart FormData with `photos` files.
export const uploadHandoffPhotos = (code, secret, formData, onProgress) => {
  return axios.post(
    `${HANDOFF_BASE_PATH}/${code}/photos`,
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
        "x-handoff-secret": secret,
      },
      timeout: 120000,
      onUploadProgress: onProgress,
    },
  );
};
