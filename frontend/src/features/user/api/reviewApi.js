import axios from "../../../services/axiosInstance";

// Rate the other side of a completed deal (once): the buyer rates the
// seller, the seller rates the buyer. The server works out which side.
export const rateDeal = (conversationId, rating, comment = "") =>
  axios.post("/api/reviews", { conversationId, rating, comment });
// Older name, same call.
export const rateSeller = rateDeal;

// Completed deals I still have to rate (drives the rating popup).
export const fetchPendingReviews = () => axios.get("/api/reviews/pending");

// Ratings I've received (as buyer and seller): { avg, count, distribution, recent }.
export const fetchMyRatings = () => axios.get("/api/reviews/me");

// Overview numbers: earnings, spend, deals waiting, rating.
export const fetchMyInsights = () => axios.get("/api/user/insights");
