import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";

import axios from "../services/axiosInstance.js";
import { invalidateRequests } from "../services/requestCache.js";

const UserContext = createContext();


// localStorage is readable by any script on the page, so persist only what
// the UI needs for an instant first paint. Phone, chat settings, wishlist,
// gender-change requests etc. stay in memory and are refetched each visit.
const CACHEABLE_FIELDS = [
  "_id", "name", "email", "avatar", "role", "subscription", "gender",
  "campus_id", "is_email_verified", "createdAt", "college", "campus",
];
const toCacheable = (user) => {
  if (!user || typeof user !== "object") return user;
  const out = {};
  for (const key of CACHEABLE_FIELDS) if (user[key] !== undefined) out[key] = user[key];
  if (user.gamification) {
    const { level, rank_title, total_xp } = user.gamification;
    out.gamification = { level, rank_title, total_xp };
  }
  return out;
};

/**
 * Wipe account-scoped leftovers on an EXPLICIT logout / account deletion,
 * so on a shared or library computer the next person doesn't see this
 * user's listing draft, searches or chat/notification state. Not called on
 * session expiry (a half-written listing must survive a re-login). Device
 * prefs (theme, campus, sidebar width) are kept.
 */
export const clearAccountScopedStorage = () => {
  try {
    ["unideals-product-draft", "recentSearches", "unideals-notifications-read", "unideals-last-payment"].forEach((k) =>
      localStorage.removeItem(k),
    );
    Object.keys(localStorage)
      .filter((k) => k.startsWith("unideals-offer-hint:"))
      .forEach((k) => localStorage.removeItem(k));
    sessionStorage.removeItem("contactLastSent");
    sessionStorage.removeItem("unideals-assistant-chat");
  } catch {
    // storage unavailable (private mode): nothing to clear
  }
};

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
        // Migration: older builds cached the full profile (phone, location,
        // token metadata). Rewrite it trimmed.
        const trimmed = toCacheable(cachedUser);
        localStorage.setItem("cachedUserDetails", JSON.stringify(trimmed));
        setUserDetails(trimmed);
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
        localStorage.setItem("cachedUserDetails", JSON.stringify(toCacheable(updated)));
      } catch (err) {
        console.error("Error caching updated user:", err);
      }

      return updated;
    });
  }, []);

  // Clear user
  // Feed / detail responses depend on who is asking (campus, gender, role).
  // Drop cached API reads whenever the identity, campus or gender changes.
  const identityKey = userDetails
    ? `${userDetails._id}|${userDetails.campus_id?._id || userDetails.campus_id || ""}|${userDetails.gender || ""}|${userDetails.role || ""}`
    : "guest";
  const identityRef = useRef(identityKey);
  useEffect(() => {
    if (identityRef.current !== identityKey) {
      identityRef.current = identityKey;
      invalidateRequests();
    }
  }, [identityKey]);

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
  // Pass { force: true } after an explicit login (email/Google/One Tap):
  // the mount probe already set hasFetchedRef, which would otherwise make
  // this return stale `false` without fetching and leave the user looking
  // logged-out until a reload.
  const fetchUserProfile = useCallback(async ({ force = false } = {}) => {
    if (force) {
      hasFetchedRef.current = false;
    }
    if (hasFetchedRef.current) return Boolean(userDetails?._id);

    hasFetchedRef.current = true;

    try {
      setLoading(true);

      // _silentProbe: this is a background session check, not a user
      // action. If there is no session, the interceptor must NOT fire
      // "session-expired" (which would bounce guests browsing public
      // pages to /login). See authInterceptor.js.
      const response = await axios.get("/api/user/userProfile", {
        _silentProbe: true,
      });

      if (response.data.success) {
        const user = response.data.user;

        setUserDetails(user);
        setIsLoggedIn(true);

        // cache non-sensitive profile only
        try {
          localStorage.setItem("cachedUserDetails", JSON.stringify(toCacheable(user)));
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
