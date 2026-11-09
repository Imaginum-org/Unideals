import axios from "../../../services/axiosInstance";

// Buyer rates the seller of a completed deal (once).
export const rateSeller = (conversationId, rating, comment = "") =>
  axios.post("/api/reviews", { conversationId, rating, comment });

// My rating summary as a seller: { avg, count, distribution, recent }.
export const fetchMyRatings = () => axios.get("/api/reviews/me");

// Overview numbers: earnings, spend, deals waiting, rating.
export const fetchMyInsights = () => axios.get("/api/user/insights");
