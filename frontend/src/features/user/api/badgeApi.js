import axiosInstance from "../../../services/axiosInstance.js";

/** Fetch current user's gamification data (XP, level, rank, badges). */
export const fetchMyBadges = () => axiosInstance.get("/badges/me");

/** Trigger a full recompute of badges for the current user. */
export const recomputeBadges = () => axiosInstance.post("/badges/compute");

/** Fetch the campus XP leaderboard. */
export const fetchLeaderboard = (limit = 20) =>
  axiosInstance.get("/badges/leaderboard", { params: { limit } });
