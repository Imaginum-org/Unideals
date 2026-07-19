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
    try {
      setLoading(true);

      const response = await axios.get("/api/wishlist");

      if (response.data.success) {
        setWishlist(response.data.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch wishlist:", error);
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
      wishlist.map((item) => (typeof item === "string" ? item : item._id)),
    );
  }, [wishlist]);

  /**
   * Check if product exists in wishlist
   */
  const isInWishlist = useCallback(
    (productId) => wishlistIds.has(productId),
    [wishlistIds],
  );

  /**
   * Toggle Wishlist
   */
  const toggleWishlist = useCallback(async (productId, productData = null) => {
    const response = await axios.post("/api/wishlist/toggle", {
      productId,
    });

    if (!response.data.success) return false;

    const isWishlisted = response.data.data.isInWishlist;

    setWishlist((prev) => {
      if (isWishlisted) {
        const exists = prev.some((item) => {
          const id = typeof item === "string" ? item : item._id;
          return id === productId;
        });

        if (exists) return prev;

        return productData ? [...prev, productData] : [...prev, productId];
      }

      return prev.filter((item) => {
        const id = typeof item === "string" ? item : item._id;
        return id !== productId;
      });
    });

    return isWishlisted;
  }, []);

  /**
   * Remove directly
   */
  const removeFromWishlist = useCallback(async (productId) => {
    await axios.post("/api/wishlist/remove", {
      productId,
    });

    setWishlist((prev) =>
      prev.filter((item) => {
        const id = typeof item === "string" ? item : item._id;
        return id !== productId;
      }),
    );
  }, []);

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
