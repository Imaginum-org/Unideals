import axios from "../../../services/axiosInstance";

// Public campus directory (active only, cached server-side).
export const getCampuses = () => axios.get("/api/campuses");

// Set the logged-in user's campus (onboarding gate + Settings change).
// Returns the updated user; live listings migrate server-side.
export const setMyCampus = (campus_slug) =>
  axios.put("/api/user/updateProfile", { campus_slug });
