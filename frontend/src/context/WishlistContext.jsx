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

export const WishlistProvider = ({ children }) => {
  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(false);

  /**
   * Fetch complete wishlist from backend
   */
  const fetchWishlist = useCallback(async () => {
    // Skip when not logged in to avoid 401 spam on public pages
    try {
      if (localStorage.getItem("isAuthenticated") !== "true") return;
    } catch {
      return;
    }
    try {
      setLoading(true);

      const response = await axios.get("/api/wishlist");

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
    const previous = wishlist;
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
      // Rollback optimistic change, then re-throw the ORIGINAL error so
      // callers keep response data (message, code like WISHLIST_LIMIT).
      setWishlist(previous);
      throw originalError;
    }
  }, [wishlist, wishlistIds]);

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
      setWishlist(previous);
      throw originalError;
    }
  }, [wishlist]);

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
