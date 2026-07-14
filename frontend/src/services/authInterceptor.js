import axios from "axios";
import instance from "./axiosInstance";
import { getRefreshTokenUrl } from "../features/auth/api/authApi";

let isRefreshing = false;
let refreshSubscribers = [];

const onRefreshed = (token) => {
  refreshSubscribers.forEach((callback) => callback(token));
  refreshSubscribers = [];
};

const addRefreshSubscriber = (callback) => {
  refreshSubscribers.push(callback);
};

const clearStoredAuth = () => {
  localStorage.removeItem("isAuthenticated");
  localStorage.removeItem("cachedUserDetails");
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
        return new Promise((resolve) => {
          addRefreshSubscriber((token) => {
            originalRequest.headers["Authorization"] = `Bearer ${token}`;
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

        if (response.data.success) {
          const { accessToken } = response.data.data;
          if (accessToken) {
            localStorage.setItem("accessToken", accessToken);
          }

          isRefreshing = false;
          onRefreshed(accessToken);

          return instance(originalRequest);
        }
      } catch (err) {
        clearStoredAuth();

        if (err.response?.data?.accountBlocked) {
          notifyAccountBlocked(err.response.data);
        }

        isRefreshing = false;

        return Promise.reject(err);
      }
    }

    return Promise.reject(error);
  },
);

instance.interceptors.request.use((config) => {
  const accessToken = localStorage.getItem("accessToken");

  if (accessToken && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }

  return config;
});

export default instance;
