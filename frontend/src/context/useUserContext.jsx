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
      if (error.response?.status === 401 || error.response?.status === 403) {
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
