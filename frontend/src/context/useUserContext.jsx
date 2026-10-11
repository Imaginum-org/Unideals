import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";

import axios from "../services/axiosInstance.js";

const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [userDetails, setUserDetails] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const hasFetchedRef = useRef(false);

  const safeParse = (raw) => {
    try {
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  };

  // Load from localStorage (non-sensitive cache only).
  // accessToken is no longer used - auth relies on HttpOnly cookies.
  // Clear any legacy token to reduce XSS theft window.
  useEffect(() => {
    try {
      const cachedUser = safeParse(localStorage.getItem("cachedUserDetails"));
      const authStatus = localStorage.getItem("isAuthenticated");

      // Migration: drop legacy Bearer tokens stored in localStorage
      localStorage.removeItem("accessToken");

      if (cachedUser?._id) {
        setUserDetails(cachedUser);
      } else if (cachedUser) {
        localStorage.removeItem("cachedUserDetails");
      }

      if (authStatus === "true") {
        setIsLoggedIn(true);
      }
    } catch (err) {
      console.error("Error reading cache:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Update user
  const updateUserDetails = useCallback((updatedFields) => {
    setUserDetails((prev) => {
      if (!prev) return prev;

      const updated = { ...prev, ...updatedFields };

      try {
        localStorage.setItem("cachedUserDetails", JSON.stringify(updated));
      } catch (err) {
        console.error("Error caching updated user:", err);
      }

      return updated;
    });
  }, []);

  // Clear user
  const clearUserData = useCallback(() => {
    setUserDetails(null);
    setIsLoggedIn(false);
    hasFetchedRef.current = false;

    localStorage.removeItem("cachedUserDetails");
    localStorage.removeItem("isAuthenticated");
    // Legacy cleanup - no longer written, but may exist from older builds
    localStorage.removeItem("accessToken");
  }, []);

  // Fetch user profile - cookie-based (withCredentials). Works even without
  // isAuthenticated flag so cookie-only sessions recover after cache clear.
  const fetchUserProfile = useCallback(async () => {
    if (hasFetchedRef.current) return Boolean(userDetails?._id);

    hasFetchedRef.current = true;

    try {
      setLoading(true);

      const response = await axios.get("/api/user/userProfile");

      if (response.data.success) {
        const user = response.data.user;

        setUserDetails(user);
        setIsLoggedIn(true);

        // cache non-sensitive profile only
        try {
          localStorage.setItem("cachedUserDetails", JSON.stringify(user));
          localStorage.setItem("isAuthenticated", "true");
        } catch {
          // quota errors ignored
        }

        return true;
      }

      return false;
    } catch (error) {
      const status = error.response?.status;
      if (status === 401) {
        // 401 here already passed through the refresh interceptor: the
        // refresh endpoint itself returned 401, so the session is truly
        // dead (expired/revoked). Clear it.
        clearUserData();
      } else if (status === 403 && !error.response?.data?.accountBlocked) {
        // Non-block 403s (e.g. unverified email, CSRF/origin rejection)
        // are not session death — keep the user cached so a retry or
        // verification can recover without forcing a re-login.
        hasFetchedRef.current = false;
        console.error("Fetch user error:", error?.message || error);
      } else if (status === 403) {
        clearUserData();
      } else {
        // Network/server error - allow retry later
        hasFetchedRef.current = false;
        console.error("Fetch user error:", error?.message || error);
      }

      return false;
    } finally {
      setLoading(false);
    }
  }, [clearUserData, userDetails?._id]);

  // Auto-fetch on mount when cache suggests login OR always try once
  // via cookies to recover sessions. Single attempt only.
  useEffect(() => {
    const authStatus = localStorage.getItem("isAuthenticated");
    if ((authStatus === "true" || !hasFetchedRef.current) && !userDetails) {
      // Only auto-fetch if we haven't tried yet
      if (!hasFetchedRef.current) {
        fetchUserProfile();
      }
    }
  }, [userDetails, fetchUserProfile]);

  // Cross-tab sync: logging out in one tab clears sessions everywhere.
  useEffect(() => {
    const onStorage = (event) => {
      if (event.key === "isAuthenticated" && event.newValue !== "true") {
        clearUserData();
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [clearUserData]);

  // Session keeper: proactively refresh ~1 minute before the 15-minute
  // access token expires so users never hit a 401 mid-click. Idle tabs
  // stay quiet (no timer churn); activity resets the countdown. On tab
  // focus, refresh immediately if a refresh isn't already in flight.
  // A failed keeper refresh never clears state — only a hard 401 from the
  // refresh endpoint (handled in the interceptor) means session death.
  useEffect(() => {
    if (!isLoggedIn) return undefined;

    const KEEP_ALIVE_MS = 14 * 60 * 1000;
    let timer = null;
    let disposed = false;

    const keepAlive = async () => {
      try {
        const { refreshToken } = await import(
          "../features/auth/api/authApi.js"
        );
        await refreshToken();
      } catch {
        // Swallow: interceptor owns session-death decisions.
      }
      if (!disposed && localStorage.getItem("isAuthenticated") === "true") {
        timer = window.setTimeout(keepAlive, KEEP_ALIVE_MS);
      }
    };

    const poke = () => {
      if (timer) window.clearTimeout(timer);
      timer = window.setTimeout(keepAlive, KEEP_ALIVE_MS);
    };

    const onFocus = () => {
      poke();
    };

    timer = window.setTimeout(keepAlive, KEEP_ALIVE_MS);
    window.addEventListener("focus", onFocus);

    return () => {
      disposed = true;
      if (timer) window.clearTimeout(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, [isLoggedIn]);

  return (
    <UserContext.Provider
      value={{
        userDetails,
        isLoggedIn,
        loading,
        fetchUserProfile,
        updateUserDetails,
        clearUserData,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

// Safe hook
export const useUser = () => {
  const context = useContext(UserContext);

  if (!context) {
    throw new Error("useUser must be used within UserProvider");
  }

  return context;
};
