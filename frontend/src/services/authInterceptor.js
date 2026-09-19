import axios from "axios";
import instance from "./axiosInstance";
import { getRefreshTokenUrl } from "../features/auth/api/authApi";

let isRefreshing = false;
let refreshSubscribers = [];

const onRefreshed = () => {
  refreshSubscribers.forEach((callback) => callback());
  refreshSubscribers = [];
};

const onRefreshFailed = (err) => {
  refreshSubscribers.forEach((callback) => callback(err));
  refreshSubscribers = [];
};

const addRefreshSubscriber = (callback) => {
  refreshSubscribers.push(callback);
};

const clearStoredAuth = () => {
  localStorage.removeItem("isAuthenticated");
  localStorage.removeItem("cachedUserDetails");
  // Legacy cleanup
  localStorage.removeItem("accessToken");
};

const notifyAccountBlocked = (payload = {}) => {
  window.dispatchEvent(
    new CustomEvent("unideals:account-blocked", {
      detail: {
        message:
          payload.message ||
          "Your account access has been restricted. Please contact support.",
        status: payload.accountStatus,
      },
    }),
  );
};

instance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const responseData = error.response?.data;

    if (error.response?.status === 403 && responseData?.accountBlocked) {
      clearStoredAuth();
      notifyAccountBlocked(responseData);
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          addRefreshSubscriber((refreshErr) => {
            if (refreshErr) {
              reject(refreshErr);
              return;
            }
            // Cookies refreshed - retry with credentials (no Bearer needed)
            resolve(instance(originalRequest));
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const response = await axios.post(
          getRefreshTokenUrl(),
          {},
          { withCredentials: true },
        );

        if (response.data?.success) {
          isRefreshing = false;
          onRefreshed();

          return instance(originalRequest);
        }

        throw new Error("Refresh failed");
      } catch (err) {
        isRefreshing = false;
        onRefreshFailed(err);
        clearStoredAuth();

        if (err.response?.data?.accountBlocked) {
          notifyAccountBlocked(err.response.data);
        }

        return Promise.reject(err);
      }
    }

    return Promise.reject(error);
  },
);

// Cookie-based auth: withCredentials sends HttpOnly cookies automatically.
// No Authorization header is set to avoid XSS theft of long-lived tokens.
instance.interceptors.request.use((config) => {
  return config;
});

export default instance;
