import {
  memo,
  forwardRef,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { Link } from "react-router-dom";
import { FaStar, FaHeart, FaRegHeart, FaCrown } from "react-icons/fa";
import { useWishlist } from "../../../context/useWishlist.js";
import toast from "react-hot-toast";
import { IoLocationOutline, IoEyeOutline } from "react-icons/io5";
import AvatarComponent from "../../../Components/common/AvatarComponent.jsx";

const FALLBACK_IMAGE = "/image10.png";

// Helper function to get tier-specific styles with Custom Hex Colors
const getTierStyles = (tier) => {
  switch (tier) {
    case "pro_plus":
      return {
        cardBg:
          "bg-gradient-to-b from-[#FFD700]/10 to-white dark:from-[#FFD700]/10 dark:to-[#18181B]",
        cardBorder: "border-2 border-[#FFD700]/80",
        cardShadow:
          "shadow-[0_4px_20px_rgba(255,215,0,0.15)] hover:shadow-[0_8px_30px_rgba(255,215,0,0.3)] z-10",
        badgeBg:
          "bg-gradient-to-r from-[#FFD700] to-[#FF8C00] text-black shadow-lg shadow-[#FFD700]/40",
        categoryTag:
          "bg-[#FFD700]/20 text-[#FF8C00] dark:bg-[#FFD700]/10 dark:text-[#FFD700]",
        footerBorder: "border-[#FFD700]/30 dark:border-[#FFD700]/20",
        icon: <FaCrown className="animate-pulse" size={12} />,
      };
    case "pro":
      return {
        cardBg:
          "bg-gradient-to-b from-[#3838EC]/10 to-white dark:from-[#3838EC]/10 dark:to-[#18181B]",
        cardBorder: "border-2 border-[#3838EC]/80",
        cardShadow:
          "shadow-[0_4px_20px_rgba(56,56,236,0.15)] hover:shadow-[0_8px_30px_rgba(56,56,236,0.3)] z-10",
        badgeBg:
          "bg-gradient-to-r from-[#3838EC] to-[#5C6DFF] text-white shadow-lg shadow-[#3838EC]/40",
        categoryTag:
          "bg-[#3838EC]/10 text-[#3838EC] dark:bg-[#3838EC]/20 dark:text-[#5C6DFF]",
        footerBorder: "border-[#3838EC]/20 dark:border-[#3838EC]/30",
        icon: <FaStar className="animate-pulse" size={10} />,
      };
    default:
      return {
        cardBg: "bg-white dark:bg-[#18181B]",
        cardBorder: "border border-zinc-200 dark:border-zinc-800",
        cardShadow: "shadow-sm hover:shadow-2xl",
        badgeBg: "bg-zinc-800 text-white", // Fallback
        categoryTag: "bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600",
        footerBorder: "border-zinc-200 dark:border-zinc-800",
        icon: null,
      };
  }
};

const ProductCard = memo(
  forwardRef(
    ({ product, showRemoveButton = false, onRemove, onRemoveError }, ref) => {
      const { toggleWishlist, removeFromWishlist, checkProductInWishlist } =
        useWishlist();
      const [inWishlist, setInWishlist] = useState(false);
      const [loading, setLoading] = useState(false);

      const productId = product?._id;

      useEffect(() => {
        let isMounted = true;
        const checkWishlist = async () => {
          if (!productId) return;
          try {
            const inWish = await checkProductInWishlist(productId);
            if (isMounted) setInWishlist(inWish);
          } catch (error) {
            console.error("Wishlist check failed:", error);
          }
        };
        checkWishlist();
        return () => {
          isMounted = false;
        };
      }, [productId, checkProductInWishlist]);

      if (!product) return null;

      const {
        _id,
        title,
        images,
        category,
        selling_price,
        original_price,
        location,
        createdAt,
        seller_id,
        seller,
        views_count,
        attributes = {},
      } = product;

      const { usage_duration } = attributes;

      const isBoosted =
        product.is_boosted &&
        (!product.boost_expires_at ||
          new Date(product.boost_expires_at) > new Date());

      const sellerInfo = seller_id || seller;

      // Default to "pro" if boosted but no tier is specified
      const currentTier = isBoosted ? product.boost_tier || "pro" : "regular";
      const styles = getTierStyles(currentTier);
      const sellerAvatarUrl =
        sellerInfo?.avatar || sellerInfo?.profile_image || sellerInfo?.image;
      const sellerPlan =
        sellerInfo?.subscription ||
        (currentTier === "regular" ? "base_user" : currentTier);

      const imageUrl = useMemo(
        () => (images?.length ? images[0] : FALLBACK_IMAGE),
        [images],
      );
      const discountPercentage = useMemo(
        () =>
          original_price && original_price > selling_price
            ? Math.round(
                ((original_price - selling_price) / original_price) * 100,
              )
            : 0,
        [original_price, selling_price],
      );

      const handleClick = useCallback(() => {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }, []);

      const handleWishlistClick = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (loading || !_id) return;
        setLoading(true);
        try {
          const result = await toggleWishlist(_id, product);
          setInWishlist(result);
          toast.success(result ? "Added to Wishlist" : "Removed from Wishlist");
        } catch (error) {
          toast.error("Failed to update wishlist");
        } finally {
          setLoading(false);
        }
      };

      const getRelativeTime = (date) => {
        if (!date) return "";
        const diffInSeconds = Math.floor((new Date() - new Date(date)) / 1000);
        const minutes = Math.floor(diffInSeconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) return `${days}d ago`;
        if (hours > 0) return `${hours}h ago`;
        if (minutes > 0) return `${minutes}m ago`;
        return "Just now";
      };

      const handleRemoveClick = async (e) => {
        e.preventDefault();
        e.stopPropagation();

        setInWishlist(false);
        onRemove?.(_id);
        toast.success("Removed from Wishlist", {
          id: "wishlist-remove",
        });

        try {
          await removeFromWishlist(_id);
        } catch (error) {
          setInWishlist(true);
          onRemoveError?.(_id);
          toast.error("Failed to remove from wishlist", {
            id: "wishlist-error",
          });
          console.error("Remove error:", error);
        }
      };

      const usageLabel = {
        less_than_one_month: "Like New",
        one_to_three_months: "1-3 Months Used",
        three_to_six_months: "3-6 Months Used",
        six_to_twelve_months: "6-12 Months Used",
        more_than_one_year: "1+ Year Used",
      };

      return (
        <Link
          ref={ref}
          to={`/product/${_id}`}
          onClick={handleClick}
          className={`group relative rounded-[16px] md:rounded-[20px] overflow-hidden transition-all duration-300 xl:w-[17vw] lg:w-[21vw] md:w-[28vw] w-[43vw] hover:-translate-y-1.5 ${styles.cardBg} ${styles.cardBorder} ${styles.cardShadow}`}
        >
          {/* IMAGE WITH PADDED WRAPPER */}
          <div className="w-full p-2 md:p-2.5 pb-0">
            <div className="relative w-full aspect-[4/3] overflow-hidden rounded-[12px] md:rounded-[16px]">
              <img
                src={imageUrl}
                alt={title}
                onError={(e) => {
                  e.currentTarget.src = FALLBACK_IMAGE;
                }}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />

              <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />

              {discountPercentage > 0 && (
                <div className="absolute top-2 left-2 md:top-2.5 md:left-2.5 bg-emerald-500 text-white text-[9px] md:text-[11px] font-bold px-2 py-1 md:px-2.5 md:py-1 rounded-full z-10">
                  {discountPercentage}% OFF
                </div>
              )}

              {/* DYNAMIC BOOSTED BADGE */}
              {isBoosted && (
                <div
                  className={`absolute ${discountPercentage > 0 ? "top-8 md:top-10" : "top-2 md:top-2.5"} left-2 md:left-2.5 rounded-full px-2 py-1 md:px-2.5 md:py-1 text-[8px] md:text-[9px] font-bold uppercase tracking-wider border border-white/20 backdrop-blur-sm flex items-center gap-1 z-10 ${styles.badgeBg}`}
                >
                  {styles.icon}
                  <span>
                    {currentTier === "pro_plus" ? "Pro+ Boost" : "Boosted"}
                  </span>
                </div>
              )}

              {usage_duration && (
                <div className="absolute bottom-2 left-2 md:bottom-2.5 md:left-2.5 bg-white/95 backdrop-blur-md px-2 py-1 md:px-2.5 md:py-1 rounded-full text-[9px] md:text-[10px] font-semibold text-zinc-800">
                  {usageLabel[usage_duration]}
                </div>
              )}

              <button
                onClick={showRemoveButton ? handleRemoveClick : handleWishlistClick}
                disabled={loading}
                className="absolute top-2 right-2 md:top-2.5 md:right-2.5 h-8 w-8 md:h-9 md:w-9 rounded-full bg-white/95 backdrop-blur-md flex items-center justify-center shadow-lg z-10"
              >
                {inWishlist ? (
                  <FaHeart className="text-pink-500 text-sm" />
                ) : (
                  <FaRegHeart className="text-zinc-500 text-sm" />
                )}
              </button>
            </div>
          </div>

          {/* CONTENT */}
          <div className="p-2.5 md:p-3">
            {/* CATEGORY */}
            <div
              className={`inline-flex px-2 py-0.5 md:px-2 md:py-0.5 rounded-full text-[8px] md:text-[9px] font-semibold uppercase tracking-wider ${styles.categoryTag}`}
            >
              {category?.replaceAll("_", " ")}
            </div>

            {/* TITLE */}
            <h3 className="mt-1.5 text-[14px] md:text-[15px] leading-tight font-bold text-zinc-900 dark:text-white line-clamp-2 min-h-[38px] md:min-h-[42px]">
              {title}
            </h3>

            {/* PRICE */}
            <div className="mt-1">
              <div className="flex items-end gap-1.5">
                <span className="text-[17px] md:text-[19px] font-semibold text-zinc-900 dark:text-white">
                  ₹{Number(selling_price).toLocaleString()}
                </span>
              </div>
            </div>

            {/* FOOTER */}
            <div className={`mt-2 pt-2 border-t ${styles.footerBorder}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <AvatarComponent
                    name={sellerInfo?.name || "Seller"}
                    imageUrl={sellerAvatarUrl}
                    size="small"
                    plan={sellerPlan}
                    className="shrink-0 h-5 w-5 md:h-6 md:w-6"
                  />
                  <div>
                    <p className="text-[10px] md:text-[11px] font-semibold text-zinc-900 dark:text-white line-clamp-1">
                      {sellerInfo?.name || "Seller"}
                    </p>
                    <p className="text-[8px] md:text-[9px] text-zinc-500">
                      {getRelativeTime(createdAt)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 text-zinc-500 shrink-0">
                  <IoEyeOutline size={12} />
                  <span className="text-[9px] md:text-[10px]">{views_count || 0}</span>
                </div>
              </div>

              {location && (
                <div className="flex items-center gap-1 mt-1.5 text-zinc-500">
                  <IoLocationOutline size={12} />
                  <span className="text-[9px] md:text-[10px] truncate">{location}</span>
                </div>
              )}
            </div>
          </div>
        </Link>
      );
    },
  ),
);

ProductCard.displayName = "ProductCard";

export default ProductCard;