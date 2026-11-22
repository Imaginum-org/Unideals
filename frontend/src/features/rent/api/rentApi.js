import axios from "../../../services/axiosInstance";
import { cachedRequest, invalidateRequests, requestKey } from "../../../services/requestCache.js";

// Rent & Borrow API. Reads are briefly cached; every write clears the rent
// cache so lists and details show the change at once.
const PREFIX = "/api/rent";
const BOARD_TTL = 20 * 1000;
const DETAIL_TTL = 10 * 1000;

const unwrap = (promise) => promise.then((res) => res.data?.data);
const mutate = (promise) =>
  promise.then((res) => {
    invalidateRequests(PREFIX);
    return res.data?.data;
  });

/** Always resolves; `{ enabled: false }` when the feature is off or unreachable. */
export const fetchRentConfig = (params = {}) =>
  cachedRequest(requestKey(`${PREFIX}/config`, params), 5 * 60 * 1000, () => axios.get(`${PREFIX}/config`, { params }))
    .then((res) => res.data?.data || { enabled: false })
    .catch(() => ({ enabled: false }));

export const updateRentProfile = (body) => mutate(axios.put(`${PREFIX}/me/profile`, body));

// ---- Posts ----
export const getRentPosts = (params = {}) =>
  unwrap(cachedRequest(requestKey(`${PREFIX}/posts`, params), BOARD_TTL, () => axios.get(`${PREFIX}/posts`, { params })));

export const getMyRentPosts = () =>
  unwrap(cachedRequest(`${PREFIX}/posts/mine`, BOARD_TTL, () => axios.get(`${PREFIX}/posts/mine`)));

export const getRentPost = (id, { fresh = false } = {}) => {
  const url = `${PREFIX}/posts/${id}`;
  if (fresh) invalidateRequests(url);
  return unwrap(cachedRequest(url, DETAIL_TTL, () => axios.get(url)));
};

export const createRentPost = (body) => mutate(axios.post(`${PREFIX}/posts`, body));
export const updateRentPost = (id, body) => mutate(axios.patch(`${PREFIX}/posts/${id}`, body));
export const setRentPostStatus = (id, status) => mutate(axios.patch(`${PREFIX}/posts/${id}/status`, { status }));
export const deleteRentPost = (id) => mutate(axios.delete(`${PREFIX}/posts/${id}`));
export const reportRentPost = (id, reason) => mutate(axios.post(`${PREFIX}/posts/${id}/report`, { reason }));

// ---- Bookings ----
export const createRentBooking = (postId, body) => mutate(axios.post(`${PREFIX}/posts/${postId}/bookings`, body));

export const getRentBookings = (params = {}) =>
  unwrap(cachedRequest(requestKey(`${PREFIX}/bookings`, params), BOARD_TTL, () => axios.get(`${PREFIX}/bookings`, { params })));

export const getRentBooking = (id, { fresh = false } = {}) => {
  const url = `${PREFIX}/bookings/${id}`;
  if (fresh) invalidateRequests(url);
  return unwrap(cachedRequest(url, DETAIL_TTL, () => axios.get(url)));
};

/** action: accept | decline | cancel | handover | return | rate */
export const rentBookingAction = (id, action, body) => mutate(axios.post(`${PREFIX}/bookings/${id}/${action}`, body));


/** Server message (incl. validation details) for a failed call. */
export const rentErrorMessage = (error, fallback = "Something went wrong. Try again.") => {
  const data = error?.response?.data;
  if (data?.errors?.length) return data.errors[0].message || data.message || fallback;
  return data?.message || fallback;
};
