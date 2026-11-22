import * as rent from "../services/rent.service.js";
import * as bookings from "../services/rentBooking.service.js";
import * as rentAdmin from "../services/rentAdmin.service.js";
import { forwardServiceError, successResponse } from "../utils/response.js";

// Wraps a handler: (req) => [message, data, status?]
const handle = (fn) => async (req, res, next) => {
  try {
    const [message, data, status = 200, pagination = null] = await fn(req);
    return successResponse(res, message, data, status, pagination);
  } catch (error) {
    return forwardServiceError(error, next);
  }
};

// ---- Config + profile ----

// GET /api/rent/config (optional auth; always 200 so the client can hide the UI)
export const getConfig = handle(async (req) => ["Rent config", await rent.getRentConfig(req)]);

// GET /api/rent/me/profile
export const getProfile = handle(async (req) => ["Rent profile", await rent.getMyProfile(req.user)]);

// PUT /api/rent/me/profile { block?, alerts? }
export const updateProfile = handle(async (req) => [
  "Rent profile saved",
  await rent.updateMyProfile(req.user, req.body, req.rentConfig),
]);

// ---- Posts ----

// GET /api/rent/posts?kind&block&category&mode&q&page
export const listPosts = handle(async (req) => ["Rent posts", await rent.listPosts(req.user, req.query)]);

// GET /api/rent/posts/mine
export const listMyPosts = handle(async (req) => ["Your rent posts", await rent.listMyPosts(req.user)]);

// POST /api/rent/posts
export const createPost = handle(async (req) => [
  "Posted",
  await rent.createPost(req.user, req.body, req.rentConfig),
  201,
]);

// GET /api/rent/posts/:id
export const getPost = handle(async (req) => ["Rent post", await rent.getPost(req.user, req.params.id)]);

// PATCH /api/rent/posts/:id
export const updatePost = handle(async (req) => [
  "Post updated",
  await rent.updatePost(req.user, req.params.id, req.body, req.rentConfig),
]);

// PATCH /api/rent/posts/:id/status { status: active|paused }
export const setPostStatus = handle(async (req) => [
  "Post updated",
  await rent.setPostStatus(req.user, req.params.id, req.body.status),
]);

// DELETE /api/rent/posts/:id
export const deletePost = handle(async (req) => ["Post removed", await rent.deletePost(req.user, req.params.id)]);

// POST /api/rent/posts/:id/report { reason? }
export const reportPost = handle(async (req) => [
  "Thanks, we'll take a look",
  await rent.reportPost(req.user, req.params.id, req.body.reason),
]);

// ---- Bookings ----

// POST /api/rent/posts/:id/bookings { note?, quantity?, return_by?, price? }
export const createBooking = handle(async (req) => [
  "Request sent",
  await bookings.createBooking(req.user, req.params.id, req.body),
  201,
]);

// GET /api/rent/bookings?role=lending|borrowing&state=open|closed
export const listBookings = handle(async (req) => ["Rent bookings", await bookings.listBookings(req.user, req.query)]);

// GET /api/rent/bookings/:id
export const getBooking = handle(async (req) => ["Rent booking", await bookings.getBooking(req.user, req.params.id)]);

export const acceptBooking = handle(async (req) => ["Accepted", await bookings.acceptBooking(req.user, req.params.id)]);

export const declineBooking = handle(async (req) => [
  "Declined",
  await bookings.declineBooking(req.user, req.params.id, req.body.reason),
]);

export const cancelBooking = handle(async (req) => [
  "Cancelled",
  await bookings.cancelBooking(req.user, req.params.id, req.body.reason),
]);

export const confirmHandover = handle(async (req) => [
  "Marked as handed over",
  await bookings.confirmHandover(req.user, req.params.id),
]);

export const confirmReturn = handle(async (req) => [
  "Marked as returned",
  await bookings.confirmReturn(req.user, req.params.id),
]);

export const rateBooking = handle(async (req) => [
  "Thanks for rating",
  await bookings.rateBooking(req.user, req.params.id, req.body.stars),
]);

export const addMessage = handle(async (req) => [
  "Sent",
  await bookings.addMessage(req.user, req.params.id, req.body.text),
  201,
]);

// ---- Staff (/api/admin/rent) ----

export const adminListCampuses = handle(async (req) => [
  "Rent campus settings",
  await rentAdmin.listCampusConfigs(req.campusScope),
]);

export const adminUpdateCampus = handle(async (req) => [
  "Rent settings saved",
  await rentAdmin.updateCampusConfig({
    campusId: req.params.campusId,
    input: req.body,
    actor: req.user,
    scope: req.campusScope,
  }),
]);

export const adminListPosts = handle(async (req) => {
  const { items, pagination } = await rentAdmin.listPostsForStaff({ scope: req.campusScope, query: req.query });
  return ["Rent posts", items, 200, pagination];
});

export const adminModeratePost = handle(async (req) => [
  req.body.action === "hide" ? "Post hidden" : "Post restored",
  await rentAdmin.moderatePost({
    postId: req.params.id,
    action: req.body.action,
    reason: req.body.reason,
    actor: req.user,
    scope: req.campusScope,
  }),
]);
