import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import axios from "../services/axiosInstance";

const WishlistContext = createContext(null);

const isAuthenticated = () => {
  try {
    return localStorage.getItem("isAuthenticated") === "true";
  } catch {
    return false;
  }
};

// Same shape axios errors have, so every caller's existing
// `status === 401 → login` branch handles guests unchanged.
const authRequiredError = () => {
  const err = new Error("Please log in to use your wishlist");
  err.response = { status: 401, data: { message: "Please log in to use your wishlist", code: "AUTH_REQUIRED" } };
  return err;
};

export const WishlistProvider = ({ children }) => {
  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(false);

  /**
   * Fetch complete wishlist from backend.
   * Backend supports ?page=&limit= (defaults page=1, limit=20, max 50).
   * No-arg call preserves the legacy shape (first page).
   */
  const fetchWishlist = useCallback(async (page = 1, limit = 50) => {
    // Skip when not logged in to avoid 401 spam on public pages
    try {
      if (localStorage.getItem("isAuthenticated") !== "true") return;
    } catch {
      return;
    }
    try {
      setLoading(true);

      const response = await axios.get("/api/wishlist", {
        params: { page, limit },
      });

      if (response.data.success) {
        setWishlist(response.data.data || []);
      }
    } catch {
      // 401 handled by interceptor; keep previous wishlist
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Load wishlist once when provider mounts
   */
  useEffect(() => {
    fetchWishlist();
  }, [fetchWishlist]);

  /**
   * O(1) lookup
   */
  const wishlistIds = useMemo(() => {
    return new Set(
      wishlist.map((item) => (typeof item === "string" ? item : item?._id)),
    );
  }, [wishlist]);

  /**
   * Check if product exists in wishlist
   */
  const isInWishlist = useCallback(
    (productId) => (productId ? wishlistIds.has(productId) : false),
    [wishlistIds],
  );

  /**
   * Toggle Wishlist - optimistic with rollback on failure
   */
  const toggleWishlist = useCallback(async (productId, productData = null) => {
    // Guests: fail fast with a 401-shaped error BEFORE the optimistic flip,
    // so the button never shows "Saved" while we redirect to login.
    if (!isAuthenticated()) throw authRequiredError();

    const wasIn = wishlistIds.has(productId);
    // Optimistic update
    setWishlist((prev) => {
      if (wasIn) {
        return prev.filter((item) => {
          const id = typeof item === "string" ? item : item?._id;
          return id !== productId;
        });
      }
      return productData ? [...prev, productData] : [...prev, productId];
    });
    try {
      const response = await axios.post("/api/wishlist/toggle", {
        productId,
      });

      if (!response.data?.success) throw new Error("Toggle failed");

      const isWishlisted = response.data.data.isInWishlist;

      // Reconcile with server truth
      setWishlist((prev) => {
        if (isWishlisted && !wasIn) return prev;
        if (!isWishlisted && wasIn) return prev;
        // Server disagrees - revert to server state below via fetch
        return prev;
      });

      return isWishlisted;
    } catch (originalError) {
      // Undo just this product's flip (a captured snapshot would clobber
      // concurrent optimistic updates from other cards). This runs even
      // when the refetch below is skipped, e.g. the session expired.
      setWishlist((prev) => {
        const has = prev.some((item) => (typeof item === "string" ? item : item?._id) === productId);
        if (wasIn && !has) return productData ? [...prev, productData] : [...prev, productId];
        if (!wasIn && has) {
          return prev.filter((item) => (typeof item === "string" ? item : item?._id) !== productId);
        }
        return prev;
      });
      // Then reconcile with the server when we still have a session.
      fetchWishlist().catch(() => {});
      throw originalError;
    }
  }, [wishlistIds, fetchWishlist]);

  /**
   * Remove directly - optimistic with rollback
   */
  const removeFromWishlist = useCallback(async (productId) => {
    const previous = wishlist;
    setWishlist((prev) =>
      prev.filter((item) => {
        const id = typeof item === "string" ? item : item?._id;
        return id !== productId;
      }),
    );
    try {
      await axios.post("/api/wishlist/remove", {
        productId,
      });
    } catch (originalError) {
      try {
        await fetchWishlist();
      } catch {
        setWishlist(previous);
      }
      throw originalError;
    }
  }, [wishlist, fetchWishlist]);

  const value = {
    wishlist,
    wishlistIds,
    loading,
    fetchWishlist,
    toggleWishlist,
    removeFromWishlist,
    isInWishlist,
    setWishlist,
  };

  return (
    <WishlistContext.Provider value={value}>
      {children}
    </WishlistContext.Provider>
  );
};

export const useWishlist = () => {
  const context = useContext(WishlistContext);

  if (!context) {
    throw new Error("useWishlist must be used inside WishlistProvider");
  }

  return context;
};
