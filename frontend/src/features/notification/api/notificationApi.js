import axios from "../../../services/axiosInstance.js";

export const notificationApi = {
  getNotifications: async () => {
    const res = await axios.get("/api/notifications");
    return res.data;
  },

  markRead: async (id) => {
    const res = await axios.patch(`/api/notifications/${id}/read`);
    return res.data;
  },

  markAllRead: async () => {
    const res = await axios.patch("/api/notifications/read-all");
    return res.data;
  },

  trackClick: async (id) => {
    const res = await axios.post(`/api/notifications/${id}/click`);
    return res.data;
  },

  dismiss: async (id) => {
    const res = await axios.delete(`/api/notifications/${id}`);
    return res.data;
  },
};
