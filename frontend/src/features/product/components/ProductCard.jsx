import { memo, forwardRef, useState, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import { FaStar, FaHeart, FaRegHeart, FaCrown } from "react-icons/fa";
import { useWishlist } from "../../../context/WishlistContext.jsx";
import toast from "react-hot-toast";
import { IoLocationOutline } from "react-icons/io5";
import AvatarComponent from "../../../Components/common/AvatarComponent.jsx";
import { MdOutlineChatBubbleOutline } from "react-icons/md";

const FALLBACK_IMAGE = "/image10.png";
const INR_FORMATTER = new Intl.NumberFormat("en-IN");

// Helper function to get tier-specific styles (retained for your logic)
const getTierStyles = (tier) => {
  switch (tier) {
    case "pro_plus":
      return {
        cardBg: "bg-white dark:bg-[#18181B]",
        cardBorder: "border-2 border-[#FFD700]/80",
        cardShadow:
          "shadow-[0_4px_20px_rgba(255,215,0,0.15)] hover:shadow-[0_8px_30px_rgba(255,215,0,0.3)] z-10",
        badgeBg:
          "bg-gradient-to-r from-[#FFD700] to-[#FF8C00] text-black shadow-lg shadow-[#FFD700]/40",
        icon: <FaCrown className="animate-pulse" size={12} />,
      };
    case "pro":
      return {
        cardBg: "bg-white dark:bg-[#18181B]",
        cardBorder: "border-2 border-[#3838EC]/80",
        cardShadow:
          "shadow-[0_4px_20px_rgba(56,56,236,0.15)] hover:shadow-[0_8px_30px_rgba(56,56,236,0.3)] z-10",
        badgeBg:
          "bg-gradient-to-r from-[#3838EC] to-[#5C6DFF] text-white shadow-lg shadow-[#3838EC]/40",
        icon: <FaStar className="animate-pulse" size={10} />,
      };
    default:
      return {
        cardBg: "bg-white dark:bg-[#18181B]",
        cardBorder: "border border-zinc-200 dark:border-zinc-800",
        cardShadow:
          "shadow-[0_4px_18px_rgba(15,23,42,0.08)] hover:shadow-[0_10px_28px_rgba(15,23,42,0.12)]",
        badgeBg: "bg-zinc-800 text-white",
        icon: null,
      };
  }
};

const ProductCard = memo(
  forwardRef(
    ({ product, showRemoveButton = false, onRemove, onRemoveError }, ref) => {

      const { toggleWishlist, removeFromWishlist, isInWishlist } =
        useWishlist();
      const [loading, setLoading] = useState(false);

      // const productId = product?._id;

      // useEffect(() => {
      //   let isMounted = true;
      //   const checkWishlist = async () => {
      //     if (!productId) return;
      //     try {
      //       const inWish = await checkProductInWishlist(productId);
      //       if (isMounted) setInWishlist(inWish);
      //     } catch (error) {
      //       console.error("Wishlist check failed:", error);
      //     }
      //   };
      //   checkWishlist();
      //   return () => {
      //     isMounted = false;
      //   };
      // }, [productId, checkProductInWishlist]);

      if (!product) return null;

      const {
        _id,
        title,
        images,
        category,
        selling_price,
        original_price,
        location,
        seller_id,
        seller,
      } = product;

      const inWishlist = isInWishlist(_id);

      const isBoosted =
        product.is_boosted &&
        (!product.boost_expires_at ||
          new Date(product.boost_expires_at) > new Date());

      const sellerInfo = seller_id || seller;

      const currentTier = isBoosted ? product.boost_tier || "pro" : "regular";
      const tierStyles = getTierStyles(currentTier);
      const sellerAvatarUrl =
        sellerInfo?.avatar || sellerInfo?.profile_image || sellerInfo?.image;
      const sellerPlan =
        sellerInfo?.subscription ||
        (currentTier === "regular" ? "base_user" : currentTier);

      // Fallback seller rating for design match (can be replaced with dynamic data: sellerInfo?.rating)
      const sellerRating = sellerInfo?.rating ?? 4.9;

      const imageUrl = useMemo(() => {
        if (!images?.length) return FALLBACK_IMAGE;

        const firstImage = images[0];

        // Support both old and new schema during migration
        if (typeof firstImage === "string") {
          return firstImage;
        }

        return firstImage?.url || FALLBACK_IMAGE;
      }, [images]);

      const savings = useMemo(
        () =>
          original_price && original_price > selling_price
            ? original_price - selling_price
            : 0,
        [original_price, selling_price],
      );

      const formattedPrice = useMemo(
        () => ({
          selling: INR_FORMATTER.format(selling_price || 0),
          original: INR_FORMATTER.format(original_price || 0),
          savings: INR_FORMATTER.format(savings),
        }),
        [selling_price, original_price, savings],
      );

      const handleClick = useCallback(() => {
        window.scrollTo({ top: 0, behavior: "instant" });
      }, []);

      const handleWishlistClick = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (loading || !_id) return;
        setLoading(true);
        try {
          const updatedWishlist = await toggleWishlist(_id, product);

          toast.success(
            updatedWishlist ? "Added to Wishlist" : "Removed from Wishlist",
          );
        } catch (error) {
          toast.error("Failed to update wishlist");
        } finally {
          setLoading(false);
        }
      };

      const handleRemoveClick = async (e) => {
        e.preventDefault();
        e.stopPropagation();

        onRemove?.(_id);
        toast.success("Removed from Wishlist", {
          id: "wishlist-remove",
        });

        try {
          await removeFromWishlist(_id);
        } catch (error) {
          onRemoveError?.(_id);
          toast.error("Failed to remove from wishlist", {
            id: "wishlist-error",
          });
          console.error("Remove error:", error);
        }
      };

      const formattedCategory = category?.replaceAll("_", " ") ?? "Category";

      const sellerName = sellerInfo?.name || "Seller";

      const handleImageError = useCallback((e) => {
        e.currentTarget.onerror = null;
        e.currentTarget.src = FALLBACK_IMAGE;
      }, []);

      const formattedLocation = location || "VIT Vellore";

      return (
        <Link
          ref={ref}
          to={`/product/${_id}`}
          onClick={handleClick}
          className={`
group
relative
w-full
overflow-hidden
rounded-2xl
bg-white
font-figtree
select-none
transform-gpu
will-change-transform
transition-all
duration-300
ease-[cubic-bezier(0.22,1,0.36,1)]
${tierStyles.cardBg}
${tierStyles.cardBorder}
${tierStyles.cardShadow}
`}
        >
          {/* PADDED WRAPPER FOR EVERYTHING AS PER DESIGN */}
          <div className="p-3 flex flex-col h-full">
            {/* IMAGE SECTION */}
            <div className="relative w-full aspect-[6/5] overflow-hidden rounded-xl">
              <img
                loading="lazy"
                decoding="async"
                // fetchPriority="low"
                src={imageUrl}
                alt={title}
                onError={handleImageError}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-500
ease-[cubic-bezier(0.22,1,0.36,1)]
group-hover:scale-[1.05]"
              />

              {/* Chat Now Button */}
              <div
                className="
absolute
bottom-3
left-1/2
z-20

-translate-x-1/2

translate-y-8
opacity-0
scale-95

pointer-events-none

transition-all
duration-300
ease-out

group-hover:translate-y-0
group-hover:opacity-100
group-hover:scale-100
group-hover:pointer-events-auto
"
              >
                <Link
                  to={"/chat"}
                  className="
      rounded-lg
      bg-[#3838EC]
      px-5
      py-2.5
      text-xs
      xl:text-base
      2xl:text-sm
      font-semibold
      text-white
      shadow-lg
      transition-all
      duration-200
      hover:bg-[#2f2fd9]
      hover:scale-[1.04]
                  flex items-center justify-center gap-2
      active:scale-95
    "
                >
                  <MdOutlineChatBubbleOutline size={18} />
                  <span>Chat Now</span>
                </Link>
              </div>

              {/* DYNAMIC BOOSTED BADGE (Retained functionality, subtly styled) */}
              {isBoosted && (
                <div
                  className={`absolute top-2 left-2 rounded-md px-2 py-1 text-[9px] md:text-[10px] font-bold uppercase tracking-wider border border-white/20 backdrop-blur-sm flex items-center gap-1 z-10 ${tierStyles.badgeBg}`}
                >
                  {tierStyles.icon}
                  <span>{currentTier === "pro_plus" ? "Pro+" : "Boosted"}</span>
                </div>
              )}

              {/* WISHLIST BUTTON (Retained for functionality, placed top right) */}
              <div
                className="
absolute
top-3
right-3
z-20

translate-x-6
opacity-0
scale-90

pointer-events-none

transition-all
duration-300
ease-out

group-hover:translate-x-0
group-hover:opacity-100
group-hover:scale-100
group-hover:pointer-events-auto
"
              >
                <button
                  onClick={
                    showRemoveButton ? handleRemoveClick : handleWishlistClick
                  }
                  disabled={loading}
                  aria-label={
                    inWishlist ? "Remove from Wishlist" : "Add to Wishlist"
                  }
                  className="
      flex
      h-10
      w-10
      items-center
      justify-center

      rounded-full

      bg-[#FFFFFF]
      backdrop-blur-xl

      shadow-lg

      transition-all
      duration-200

      hover:scale-110
      active:scale-95
    "
                >
                  {inWishlist ? (
                    <FaHeart className="text-[#ef4444] text-lg" />
                  ) : (
                    <FaRegHeart className="text-zinc-500 text-lg" />
                  )}
                </button>
              </div>
            </div>

            {/* CONTENT SECTION */}
            <div className="mt-3 flex flex-col flex-grow">
              {/* CATEGORY (Plain text style matching image) */}
              <div className="text-[13px] md:text-base font-semibold text-[#3838EC] dark:text-[#5C6DFF] capitalize">
                {formattedCategory}
              </div>

              {/* TITLE */}
              <h3 className="mt-2 text-[16px] md:text-lg font-bold text-[#2D3339] dark:text-white min-h-[32px]  line-clamp-2">
                {title}
              </h3>

              {/* PRICE & DISCOUNT */}
              <div className="mt-2 flex items-end gap-2">
                <span className="text-[20px] md:text-lg xl:text-xl font-bold text-[#2A2A2A] dark:text-white">
                  ₹{formattedPrice.selling}
                </span>

                {savings > 0 && (
                  <>
                    <span className="text-[14px] md:text-[15px] font-medium text-[#ACACAC] line-through">
                      ₹{formattedPrice.original}
                    </span>
                    <div className="bg-[#008000] text-white text-[11px] md:text-[12px] font-medium px-2 py-0.5 md:py-1 rounded-md ml-1">
                      Save ₹{formattedPrice.savings}
                    </div>
                  </>
                )}
              </div>

              {/* DIVIDER */}
              <div className="my-3.5 h-px bg-[#EEF1F5] dark:bg-zinc-800" />

              {/* FOOTER (Avatar, Rating & Location) */}
              <div className="flex items-center justify-between mt-auto">
                {/* Left Side: Avatar & Name */}
                <div className="flex items-center gap-2">
                  <AvatarComponent
                    name={sellerName}
                    imageUrl={sellerAvatarUrl}
                    size="small"
                    // plan={sellerPlan}
                    className="shrink-0 h-6 w-6 md:h-7 md:w-7"
                  />
                  <span className="capitalize text-[13px] md:text-[14px] font-medium text-zinc-500 dark:text-zinc-400 line-clamp-1 max-w-[80px]">
                    {sellerName}
                  </span>

                  {/* Rating Badge */}
                  <div className="flex items-center gap-1 border border-[#E1E1E1] dark:border-zinc-700 rounded-full px-2 py-1 ml-1">
                    <FaStar className="text-yellow-400 text-[13px]" />
                    <span className="text-[13px] font-medium text-zinc-400">
                      {sellerRating}
                    </span>
                  </div>
                </div>

                {/* Right Side: Location */}
                {formattedLocation && (
                  <div className="flex items-center justify-center gap-1 text-[#A2ACB8] shrink-0">
                    <IoLocationOutline size={18} className="text-[#4A5565]" />
                    <span className="text-[12px] md:text-[14px] font-medium truncate max-w-[110px]">
                      {formattedLocation}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </Link>
      );
    },
  ),
);

ProductCard.displayName = "ProductCard";

export default ProductCard;
