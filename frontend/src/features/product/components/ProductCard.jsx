import { memo, forwardRef, useState, useEffect, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import { FaStar, FaHeart, FaRegHeart, FaCrown } from "react-icons/fa";
import { useWishlist } from "../../../context/WishlistContext.jsx";
import { useCampus } from "../../../context/CampusContext.jsx";
import { ikCard } from "../../../utils/imageTransform.js";
import LimitModal from "../../../components/ui/LimitModal.jsx";
import toast from "react-hot-toast";
import { IoLocationOutline } from "react-icons/io5";
import AvatarComponent from "../../../components/common/AvatarComponent.jsx";
import { MdOutlineChatBubbleOutline } from "react-icons/md";
import { useNavigate } from "react-router-dom";

const FALLBACK_IMAGE = "/logo.svg";

// Boosted top-bar accents (Limited Time Deals language). Alternates
// purple/orange down a rail; trending cards derive it stably from _id.
const BOOST_ACCENTS = {
  purple: {
    label: "text-[#7C3AED]",
    tintBg: "bg-[#EDE9FE]",
    tintText: "text-[#6D28D9]",
  },
  orange: {
    label: "text-[#EA580C]",
    tintBg: "bg-[#FEF3C7]",
    tintText: "text-[#B45309]",
  },
};

const pad2 = (n) => String(n).padStart(2, "0");

// "Ends : 03h:42m" countdown against boost_expires_at. Null when the
// boost already lapsed (backend only serves active ones — defensive).
const formatEndsIn = (expiresAt) => {
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (!Number.isFinite(ms) || ms <= 0) return null;
  const totalMin = Math.floor(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h >= 48) return `${Math.floor(h / 24)}d : ${pad2(h % 24)}h`;
  return `${pad2(h)}h:${pad2(m)}m`;
};

const accentForProduct = (productId, override) => {
  if (override === "purple" || override === "orange") return override;
  let hash = 0;
  for (const ch of String(productId || "")) hash = (hash * 31 + ch.charCodeAt(0)) % 997;
  return hash % 2 === 0 ? "purple" : "orange";
};
const INR_FORMATTER = new Intl.NumberFormat("en-IN");

// Helper function to get tier-specific styles (retained for your logic)
const getTierStyles = (tier) => {
  switch (tier) {
    case "pro_plus":
      return {
        cardBg: "bg-[#F7F8FA] dark:bg-[#18181B]",
        cardBorder: "border-2 border-[#FFD700]/80",
        cardHoverBorder:
          "hover:border-[#E5CF8A] dark:hover:border-[#8a6d1f]",
        cardShadow:
          "shadow-[0_4px_20px_rgba(255,215,0,0.15)] hover:shadow-[0_8px_30px_rgba(255,215,0,0.3)] z-10",
        badgeBg:
          "bg-gradient-to-r from-[#FFD700] to-[#FF8C00] text-black shadow-lg shadow-[#FFD700]/40",
        icon: <FaCrown className="animate-pulse" size={12} />,
      };
    case "pro":
      return {
        cardBg: "bg-[#F7F8FA] dark:bg-[#18181B]",
        cardBorder: "border-2 border-[#3838EC]/80",
        cardHoverBorder:
          "hover:border-[#A5B4FC] dark:hover:border-[#4338CA]",
        cardShadow:
          "shadow-[0_4px_20px_rgba(56,56,236,0.15)] hover:shadow-[0_8px_30px_rgba(56,56,236,0.3)] z-10",
        badgeBg:
          "bg-gradient-to-r from-[#3838EC] to-[#5C6DFF] text-white shadow-lg shadow-[#3838EC]/40",
        icon: <FaStar className="animate-pulse" size={10} />,
      };
    default:
      return {
        cardBg: "bg-[#F7F8FA] dark:bg-[#18181B]",
        cardBorder: "border border-zinc-200 dark:border-zinc-800",
        cardHoverBorder:
          "hover:border-[#D4D4D8] dark:hover:border-zinc-600",
        cardShadow:
          "shadow-[0_4px_18px_rgba(15,23,42,0.08)] hover:shadow-[0_10px_28px_rgba(15,23,42,0.12)]",
        badgeBg: "bg-zinc-800 text-white",
        icon: null,
      };
  }
};

const ProductCard = memo(
  forwardRef(
    (
      {
        product,
        showRemoveButton = false,
        onRemove,
        onRemoveError,
        // Optional accent override for the boosted top bar ("purple"|"orange").
        // Defaults to a stable per-product pick so trending + deals match.
        boostAccent,
        // Render the "🚀 Boosted + Ends" top bar. True only in the Limited
        // Time Deals rail — everywhere else a boosted card keeps the same
        // height as a normal one (subtle border only), so grid rows never
        // stretch and normal cards never inherit slack above the footer.
        showBoostBar = false,
      },
      ref,
    ) => {
      const { toggleWishlist, removeFromWishlist, isInWishlist } =
        useWishlist();
      const { campus } = useCampus();
      const [loading, setLoading] = useState(false);
      const [limitInfo, setLimitInfo] = useState(null);
      const navigate = useNavigate();

      // Hooks must run unconditionally (rules-of-hooks): the null guard
      // lives after all hooks, just before render.
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
      } = product || {};

      const inWishlist = isInWishlist(_id);

      const isBoosted =
        product?.is_boosted &&
        (!product.boost_expires_at ||
          new Date(product.boost_expires_at) > new Date());

      // Live "Ends" countdown (30s tick, only while the bar is shown).
      const [, setTick] = useState(0);
      useEffect(() => {
        if (!isBoosted || !showBoostBar) return;
        const id = window.setInterval(() => setTick((t) => t + 1), 30000);
        return () => window.clearInterval(id);
      }, [isBoosted, showBoostBar]);

      const boostAccentKey = accentForProduct(_id, boostAccent);
      const boostAccentStyles = BOOST_ACCENTS[boostAccentKey];
      const endsIn = isBoosted ? formatEndsIn(product?.boost_expires_at) : null;

      const sellerInfo =
        typeof seller_id === "object" && seller_id !== null
          ? seller_id
          : seller;

      const currentTier = isBoosted ? product?.boost_tier || "pro" : "regular";

      const tierStyles = getTierStyles(currentTier);

      const sellerAvatarUrl =
        sellerInfo?.avatar?.url ||
        sellerInfo?.profile_image ||
        sellerInfo?.image;

      const sellerPlan =
        sellerInfo?.subscription ||
        (currentTier === "regular" ? "base_user" : currentTier);

      // Only show a rating badge when the backend provides a real one —
      // never a hardcoded number.
      const sellerRating =
        typeof sellerInfo?.rating === "number" ? sellerInfo.rating : null;

      const imageUrl = useMemo(() => {
        if (!images?.length) return FALLBACK_IMAGE;

        const firstImage = images[0];

        // Support both old and new schema during migration.
        // Sized ImageKit variant: cards never need full-res uploads.
        if (typeof firstImage === "string") {
          return ikCard(firstImage);
        }

        return firstImage?.url ? ikCard(firstImage.url) : FALLBACK_IMAGE;
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
        window.scrollTo({ top: 0, behavior: "auto" });
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
          const status = error?.response?.status;
          const code = error?.response?.data?.code;
          const message =
            error?.response?.data?.message ||
            error?.message ||
            "Please login to add wishlist";
          // Guests: send to login with returnTo (path + search preserved).
          if (
            status === 401 ||
            /login|auth|unauthor/i.test(message)
          ) {
            const returnTo = `${window.location.pathname}${window.location.search}`;
            navigate("/login", { state: { from: returnTo } });
            toast.error("Please log in to use your wishlist");
            return;
          }
          // Wishlist cap hit: upgrade modal instead of a dead-end toast.
          if (code === "WISHLIST_LIMIT" || /wishlist limit/i.test(message)) {
            setLimitInfo({ message });
          } else {
            toast.error(message);
          }
        } finally {
          setLoading(false);
        }
      };

      const handleRemoveClick = async (e) => {
        e.preventDefault();
        e.stopPropagation();

        // Single toast only after the server confirms (no optimistic double-toast).
        try {
          await removeFromWishlist(_id);
          onRemove?.(_id);
          toast.success("Removed from Wishlist", {
            id: "wishlist-remove",
          });
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

      const formattedLocation =
        location || campus?.name || campus?.short_name || "";

      if (!product) return null;

      return (
        <>
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
bg-[#F7F8FA]
font-figtree
select-none
transform-gpu
will-change-transform
transition-all
duration-300
ease-[cubic-bezier(0.22,1,0.36,1)]
${tierStyles.cardBg}
${isBoosted && currentTier === "regular"
  ? "border border-[#E2E6FB] hover:border-[#C7D2FE] dark:border-indigo-900/50 dark:hover:border-indigo-800"
  : `${tierStyles.cardBorder} ${tierStyles.cardHoverBorder}`}
${tierStyles.cardShadow}
`}
        >
          {/* PADDED WRAPPER FOR EVERYTHING AS PER DESIGN */}
          <div className="p-3 flex flex-col h-full">
            {/* BOOSTED TOP BAR — rocket + live countdown. Rendered only
                where showBoostBar is set (Limited Time Deals rail); the
                trending feed marks boosted cards with the subtle border
                alone so every card keeps identical height and normal cards
                never inherit stretch slack above the footer.
                Scales down on small cards: emoji + "Ends" prefix join at
                larger widths so the row never overflows a narrow card. */}
            {isBoosted && showBoostBar && (
              <div className="mb-2 flex min-w-0 items-center justify-between gap-1 sm:gap-2">
                <span
                  className={`inline-flex min-w-0 items-center gap-1 text-[11px] font-extrabold sm:text-[13px] ${boostAccentStyles.label}`}
                >
                  <span
                    aria-hidden="true"
                    className="hidden text-[13px] leading-none min-[380px]:inline"
                  >
                    🚀
                  </span>
                  <span className="truncate">Boosted</span>
                </span>
                {endsIn && (
                  <span
                    className={`shrink-0 rounded-md px-1.5 py-0.5 text-[9px] font-bold tabular-nums sm:px-2 sm:py-1 sm:text-[10px] ${boostAccentStyles.tintBg} ${boostAccentStyles.tintText}`}
                  >
                    <span className="hidden sm:inline">Ends : </span>
                    {endsIn}
                  </span>
                )}
              </div>
            )}
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
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    navigate("/chat");
                  }}
                  className="
      rounded-lg
      bg-[#3838EC]
              px-3 sm:px-5
      py-2.5
              text-[11px] sm:text-xs
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
      whitespace-nowrap
      active:scale-95
    "
                >
                  <MdOutlineChatBubbleOutline size={18} />
                  <span>Chat Now</span>
                </button>
              </div>

              {/* BOOSTED STATE is signalled by the top bar above (rocket +
                  live countdown) instead of a photo overlay, so the card
                  matches the Limited Time Deals design exactly. */}

              {/* WISHLIST BUTTON — always visible on touch (mobile),
                  hover-reveal on desktop */}
              <div
                className="
absolute
top-3
right-3
z-20

translate-x-0
opacity-100
pointer-events-auto

md:translate-x-6
md:opacity-0
md:scale-90
md:pointer-events-none

transition-all
duration-300
ease-out

md:group-hover:translate-x-0
md:group-hover:opacity-100
md:group-hover:scale-100
md:group-hover:pointer-events-auto
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

      bg-[#F7F8FA]
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
              <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 min-w-0">
                <span className="text-[19px] md:text-lg xl:text-xl font-bold text-[#2A2A2A] dark:text-white whitespace-nowrap">
                  ₹{formattedPrice.selling}
                </span>

                {savings > 0 && (
                  <>
                    <span className="text-[13px] md:text-[15px] font-medium text-[#ACACAC] line-through whitespace-nowrap">
                      ₹{formattedPrice.original}
                    </span>
                    <div className="bg-[#008000] text-white text-[11px] md:text-[12px] font-medium px-2 py-0.5 md:py-1 rounded-md whitespace-nowrap">
                      Save ₹{formattedPrice.savings}
                    </div>
                  </>
                )}
              </div>

              {/* DIVIDER */}
              <div className="mt-3 mb-2 h-px bg-[#EEF1F5] dark:bg-zinc-800" />

              {/* FOOTER (Avatar, Rating & Location) */}
              <div className="flex items-center gap-1.5 mt-auto min-w-0">
                {/* Left Side: Avatar & Name */}
                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                  <AvatarComponent
                    name={sellerName}
                    imageUrl={sellerAvatarUrl}
                    size="small"
                    plan={sellerPlan}
                    showBadge
                    className="shrink-0 h-6 w-6 md:h-7 md:w-7"
                  />
                  <span className="capitalize text-[13px] md:text-[14px] font-medium text-zinc-500 dark:text-zinc-400 line-clamp-1 min-w-0 max-w-[56px] sm:max-w-[80px]">
                    {sellerName}
                  </span>

                  {/* Rating Badge (real data only) */}
                  {sellerRating !== null && (
                    <div className="flex shrink-0 items-center gap-1 border border-[#E1E1E1] dark:border-zinc-700 rounded-full px-1.5 sm:px-2 py-1 ml-0.5 sm:ml-1">
                      <FaStar className="text-yellow-400 text-[13px]" />
                      <span className="text-[13px] font-medium text-zinc-400">
                        {sellerRating}
                      </span>
                    </div>
                  )}
                </div>

                {/* Right Side: Location */}
                {formattedLocation && (
                  <div className="flex items-center justify-center gap-1 text-[#A2ACB8] shrink-0">
                    <IoLocationOutline size={16} className="text-[#4A5565] md:h-[18px] md:w-[18px]" />
                    <span className="hidden md:block text-[12px] md:text-[14px] font-medium truncate max-w-[110px]">
                      {formattedLocation}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </Link>
        {limitInfo && (
          <LimitModal
            title="Wishlist is full"
            message={limitInfo.message}
            onClose={() => setLimitInfo(null)}
          />
        )}
      </>
      );
    },
  ),
);

ProductCard.displayName = "ProductCard";

export default ProductCard;
