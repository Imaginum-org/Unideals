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

  // Load from localStorage
  useEffect(() => {
    try {
      const cachedUser = localStorage.getItem("cachedUserDetails");
      const authStatus = localStorage.getItem("isAuthenticated");

      if (cachedUser) {
        try {
          setUserDetails(JSON.parse(cachedUser));
        } catch (err) {
          console.error("Invalid cached user JSON:", err);
          localStorage.removeItem("cachedUserDetails");
        }
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
    localStorage.removeItem("accessToken");
  }, []);

  // Fetch user profile
  const fetchUserProfile = useCallback(async () => {
    if (hasFetchedRef.current) return Boolean(userDetails);

    const authStatus = localStorage.getItem("isAuthenticated");
    if (authStatus !== "true") return false;

    hasFetchedRef.current = true;

    try {
      setLoading(true);

      const response = await axios.get("/api/user/userProfile");

      if (response.data.success) {
        const user = response.data.user;

        setUserDetails(user);
        setIsLoggedIn(true);

        // cache
        localStorage.setItem("cachedUserDetails", JSON.stringify(user));
        localStorage.setItem("isAuthenticated", "true");

        return true;
      }

      return false;
    } catch (error) {
      if (error.response?.status === 401) {
        clearUserData();
      } else {
        console.error("Fetch user error:", error);
      }

      return false;
    } finally {
      setLoading(false);
    }
  }, [clearUserData, userDetails]);

  // Auto-fetch
  useEffect(() => {
    if (isLoggedIn && !userDetails) {
      fetchUserProfile();
    }
  }, [isLoggedIn, userDetails, fetchUserProfile]);

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
