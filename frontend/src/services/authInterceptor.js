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

const notifySessionExpired = () => {
  window.dispatchEvent(new CustomEvent("unideals:session-expired"));
};

// Auth endpoints report credential problems with their own status codes —
// a 401 here means "wrong password", not "session dead". Never spend the
// refresh token on them: it would rotate sessions on every failed login
// and could wipe a valid session when the refresh then fails.
const isAuthEndpoint = (url = "") =>
  /\/api\/auth\/(login|register|refresh-token|google|verify-email|forgot-password|reset-password|resend-verification|check-verification)/.test(
    String(url || ""),
  );

// True when the request carries its own capability credential instead of
// the user session (case-insensitive — axios may store AxiosHeaders or a
// plain object depending on where the error was raised).
const hasCapabilityAuth = (headers) => {
  if (!headers) return false;
  if (typeof headers.get === "function") {
    return Boolean(headers.get("x-handoff-secret"));
  }
  return Object.keys(headers).some(
    (key) =>
      key.toLowerCase() === "x-handoff-secret" && Boolean(headers[key]),
  );
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

    // [SITE-LOCK] testing gate — delete this block to remove the lock.
    // Server says the browser has no gate cookie (cleared, expired, or
    // faked localStorage). Drop the local flag and re-lock the UI — never
    // retry, the request can't succeed without unlocking.
    if (
      error.response?.status === 403 &&
      responseData?.code === "SITE_LOCKED"
    ) {
      try {
        localStorage.removeItem("unideals_site_unlocked");
      } catch {
        // ignore
      }
      window.dispatchEvent(new CustomEvent("unideals:site-locked"));
      return Promise.reject(error);
    }
    // [/SITE-LOCK]

    if (error.response?.status === 403 && responseData?.accountBlocked) {
      clearStoredAuth();
      notifyAccountBlocked(responseData);
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      // Never attempt a silent refresh for auth endpoints themselves:
      // their 401s are credential errors, not expired sessions.
      if (isAuthEndpoint(originalRequest?.url)) {
        return Promise.reject(error);
      }
      // Capability-token requests (e.g. phone photo handoff via the
      // x-handoff-secret header) authenticate with a single-use secret,
      // not the user session. A 401 here means a bad/expired QR link —
      // attempting a cookie refresh would 401 on a cookie-less phone and
      // fire a bogus "session expired" toast. Let the caller handle it
      // (PhoneUpload shows its own "scan a fresh QR" message).
      if (hasCapabilityAuth(originalRequest.headers)) {
        return Promise.reject(error);
      }
      // A 401 without a response (network down) or a 429 (rate limited)
      // must never wipe the session — the cookies may be perfectly fine.
      if (!error.response) {
        return Promise.reject(error);
      }
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

        if (err.response?.data?.accountBlocked) {
          clearStoredAuth();
          notifyAccountBlocked(err.response.data);
          return Promise.reject(err);
        }

        // Only a hard 401 from the refresh endpoint means the session is
        // truly dead (expired/revoked refresh token). Rate limits (429),
        // network blips, or 5xx keep the local session: the cookies may
        // still be valid and the next attempt can succeed.
        if (err.response?.status === 401) {
          clearStoredAuth();
          // Background session probes (initial page-load profile check)
          // must never bounce guests to /login — they were never logged
          // in. Only user-initiated requests trigger the redirect.
          if (!originalRequest._silentProbe) {
            notifySessionExpired();
          }
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
