import { memo, forwardRef, useState, useEffect, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import { FaStar, FaCrown } from "react-icons/fa";
import { Heart } from "lucide-react";
import { useWishlist } from "../../../context/WishlistContext.jsx";
import { useCampus } from "../../../context/CampusContext.jsx";
import { ikCard, ikCardSrcSet } from "../../../utils/imageTransform.js";
import { isPlanLimitError } from "../../../services/planLimit.js";
import { toast } from "../../../components/ui/toast.js";
import { IoLocationOutline } from "react-icons/io5";
import AvatarComponent from "../../../components/common/AvatarComponent.jsx";
import { MdOutlineChatBubbleOutline } from "react-icons/md";
import HotDealChip from "../../../components/ui/HotDealChip.jsx";
import { isHotDeal } from "../../../utils/hotDeal.js";
import { useNavigate } from "react-router-dom";
import { productPath } from "../../../utils/productPath.js";
import { useUser } from "../../../context/useUserContext.jsx";
import { TickIcon } from "../../../components/common/VerifiedTick.jsx";

const FALLBACK_IMAGE = "/logo.svg";

// Boosted top-bar accents (Limited Time Deals language). Alternates
// purple/orange down a rail; trending cards derive it stably from _id.
const BOOST_ACCENTS = {
  purple: {
    label: "text-[var(--accent-text)]",
    tintBg: "bg-[var(--accent-soft)]",
    tintText: "text-[var(--accent-text)]",
  },
  orange: {
    label: "text-[var(--accent-text)]",
    tintBg: "bg-[var(--accent-soft)]",
    tintText: "text-[var(--accent-text)]",
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
        cardBg: "bg-white dark:bg-[#18181B]",
        cardBorder: "border border-[#E2E6FB] dark:border-indigo-900/50",
        cardHoverBorder:
          "hover:border-[#C7D2FE] dark:hover:border-indigo-800",
        cardShadow:
          "shadow-[0_1px_2px_rgba(15,23,42,0.05)] hover:-translate-y-0.5 hover:shadow-[0_16px_32px_-14px_rgba(15,23,42,0.22)]",
        badgeBg:
          "bg-gradient-to-r from-[#FFD700] to-[#FF8C00] text-black shadow-lg shadow-[#FFD700]/40",
        icon: <FaCrown className="animate-pulse" size={12} />,
      };
    case "pro":
      return {
        cardBg: "bg-white dark:bg-[#18181B]",
        cardBorder: "border border-[#E2E6FB] dark:border-indigo-900/50",
        cardHoverBorder:
          "hover:border-[#C7D2FE] dark:hover:border-indigo-800",
        cardShadow:
          "shadow-[0_1px_2px_rgba(15,23,42,0.05)] hover:-translate-y-0.5 hover:shadow-[0_16px_32px_-14px_rgba(15,23,42,0.22)]",
        badgeBg:
          "bg-gradient-to-r from-[#3838EC] to-[#5C6DFF] text-white shadow-lg shadow-[#3838EC]/40",
        icon: <FaStar className="animate-pulse" size={10} />,
      };
    default:
      return {
        cardBg: "bg-white dark:bg-[#18181B]",
        cardBorder: "border border-slate-200/80 dark:border-zinc-800",
        cardHoverBorder:
          "hover:border-[#D4D4D8] dark:hover:border-zinc-600",
        cardShadow:
          "shadow-[0_1px_2px_rgba(15,23,42,0.05)] hover:-translate-y-0.5 hover:shadow-[0_16px_32px_-14px_rgba(15,23,42,0.22)]",
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
      const { userDetails } = useUser();
      const [loading, setLoading] = useState(false);
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


      // Plan badge shown beside the seller name (no longer on the avatar).
      const planBadge =
        sellerInfo?.subscription === "pro_plus"
          ? { label: "PRO+", cls: "bg-gradient-to-r from-[#FFD700] to-[#FF8C00] text-black" }
          : sellerInfo?.subscription === "pro"
            ? { label: "PRO", cls: "bg-[#3838EC] text-white" }
            : null;

      // Only show a rating badge when the backend provides a real one —
      // never a hardcoded number.
      // rating is { avg, count } (buyer ratings); older payloads sent a number.
      const sellerRating =
        typeof sellerInfo?.rating === "number"
          ? sellerInfo.rating
          : sellerInfo?.rating?.count > 0
            ? Number(sellerInfo.rating.avg).toFixed(1)
            : null;

      // Chat Now opens this listing's thread with its seller (same deep link
      // as the product page). Guests sign in first and come straight back.
      const sellerIdStr = String(
        (typeof seller_id === "object" && seller_id !== null ? seller_id._id : seller_id) || sellerInfo?._id || "",
      );
      const isOwnListing = Boolean(userDetails?._id && sellerIdStr && String(userDetails._id) === sellerIdStr);
      const openChat = () => {
        if (isOwnListing) {
          navigate(productPath(product));
          return;
        }
        const href = sellerIdStr
          ? `/chat?seller=${encodeURIComponent(sellerIdStr)}&product=${encodeURIComponent(_id || "")}`
          : `/chat?product=${encodeURIComponent(_id || "")}`;
        if (!userDetails?._id) {
          navigate("/login", { state: { from: href } });
          return;
        }
        navigate(href);
      };

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

      const rawImage = typeof images?.[0] === "string" ? images[0] : images?.[0]?.url;
      const imageSrcSet = useMemo(() => ikCardSrcSet(rawImage), [rawImage]);

      const savings = useMemo(
        () =>
          original_price && original_price > selling_price
            ? original_price - selling_price
            : 0,
        [original_price, selling_price],
      );

      // Whole-number discount for the image badge ("53% off").
      const discountPct =
        savings > 0 && original_price > 0
          ? Math.round((savings / original_price) * 100)
          : 0;

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
          // Wishlist cap hit: the app-wide plan dialog is already open.
          if (!isPlanLimitError(error)) toast.error(message);
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
        e.currentTarget.removeAttribute("srcset");
        e.currentTarget.src = FALLBACK_IMAGE;
      }, []);

      const formattedLocation =
        location || campus?.name || campus?.short_name || "";

      if (!product) return null;

      return (
        <>
        <Link
          ref={ref}
          to={productPath(product)}
          onClick={handleClick}
          className={`
group
relative
w-full
overflow-hidden
rounded-2xl
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
          {/* Inset layout: 8px frame around the image, content on a 4/8/12 rhythm */}
          <div className="flex h-full flex-col p-2">
            {/* BOOSTED TOP BAR — rocket + live countdown. Rendered only
                where showBoostBar is set (Limited Time Deals rail); the
                trending feed marks boosted cards with the subtle border
                alone so every card keeps identical height and normal cards
                never inherit stretch slack above the footer.
                Scales down on small cards: emoji + "Ends" prefix join at
                larger widths so the row never overflows a narrow card. */}
            {isBoosted && showBoostBar && (
              <div className="mb-2 flex min-w-0 items-center justify-between gap-1 px-1.5 pt-1 sm:gap-2">
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
                {/* Countdown is seller-only: buyers see "Boosted", only the
                    listing's owner sees when their boost ends. */}
                {endsIn && isOwnListing && (
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
            <div className="pc-media relative w-full aspect-[6/5] overflow-hidden rounded-xl">
              <img
                loading="lazy"
                decoding="async"
                fetchPriority="low"
                src={imageUrl}
                srcSet={imageSrcSet}
                sizes="(min-width: 1024px) 320px, (min-width: 768px) 33vw, 50vw"
                alt={title}
                onError={handleImageError}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-500
ease-[cubic-bezier(0.22,1,0.36,1)]
group-hover:scale-[1.05]"
              />

              {/* Hot deal: server-granted, time-boxed (see utils/hotDeal.js).
                  Top-left, opposite the wishlist heart. */}
              {isHotDeal(product) && (
                <HotDealChip className="pointer-events-none absolute left-2.5 top-2.5 z-20" />
              )}

              {/* Chat with seller: centred pill that slides up over the
                  photo on hover (desktop); phones open the listing instead. */}
              <div className="pointer-events-none absolute inset-x-0 bottom-3 z-20 flex translate-y-4 scale-95 justify-center opacity-0 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-y-0 group-hover:scale-100 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:scale-100 group-focus-within:opacity-100">
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    openChat();
                  }}
                  // Same look as the navbar Sell button.
                  className="pc-chat pointer-events-none flex items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-[var(--accent)] px-4 py-2 font-medium text-[#FCFCFC] hover:bg-[var(--accent-hover)] shadow-[0_10px_24px_-10px_var(--accent-ring)] transition-all duration-200 hover:scale-[1.02] focus:outline-none focus-visible:ring-2 focus-visible:ring-white group-hover:pointer-events-auto group-focus-within:pointer-events-auto active:scale-[0.98]"
                >
                  <MdOutlineChatBubbleOutline className="size-[1.15em]" aria-hidden="true" />
                  <span>{isOwnListing ? "View listing" : "Chat with seller"}</span>
                </button>
              </div>

              {/* BOOSTED STATE is signalled by the top bar above (rocket +
                  live countdown) instead of a photo overlay, so the card
                  matches the Limited Time Deals design exactly. */}

              {/* WISHLIST — always visible on touch; on desktop it reveals on
                  hover, and stays put once the item is saved. */}
              <div
                className={`absolute right-2.5 top-2.5 z-20 transition-all duration-300 ease-out ${
                  inWishlist
                    ? ""
                    : "md:pointer-events-none md:translate-x-3 md:-translate-y-3 md:scale-90 md:opacity-0 md:group-hover:pointer-events-auto md:group-hover:translate-x-0 md:group-hover:translate-y-0 md:group-hover:scale-100 md:group-hover:opacity-100 md:group-focus-within:pointer-events-auto md:group-focus-within:translate-x-0 md:group-focus-within:translate-y-0 md:group-focus-within:scale-100 md:group-focus-within:opacity-100"
                }`}
              >
                <button
                  type="button"
                  onClick={
                    showRemoveButton ? handleRemoveClick : handleWishlistClick
                  }
                  disabled={loading}
                  aria-label={
                    inWishlist ? "Remove from Wishlist" : "Add to Wishlist"
                  }
                  aria-pressed={inWishlist}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-white/95 shadow-[0_4px_12px_-4px_rgba(15,23,42,0.3)] ring-1 ring-black/5 backdrop-blur-md transition-all duration-200 hover:bg-white hover:shadow-[0_6px_16px_-4px_rgba(15,23,42,0.35)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3838EC]/50 active:scale-90 disabled:opacity-70 dark:bg-zinc-900/90 dark:ring-white/10 dark:hover:bg-zinc-900"
                >
                  {inWishlist ? (
                    <Heart className="h-[17px] w-[17px] fill-rose-500 text-rose-500" strokeWidth={2} aria-hidden="true" />
                  ) : (
                    <Heart className="h-[17px] w-[17px] text-slate-600 dark:text-zinc-300" strokeWidth={2} aria-hidden="true" />
                  )}
                </button>
              </div>
            </div>

            {/* CONTENT SECTION */}
            <div className="pc-content flex flex-grow flex-col px-1.5 pb-1 pt-3">
              {/* CATEGORY — quiet eyebrow label (title + price lead) */}
              <div className="flex min-w-0 items-center gap-2">
                <div className="pc-cat truncate font-semibold tracking-[0.01em] text-[var(--accent)] capitalize">
                  {formattedCategory}
                </div>
                {/* Girls Corner 🌸 text badge (never color-only, a11y) */}
                {product?.isGirlsOnly && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-pink-100 px-2 py-0.5 text-[10px] font-bold text-pink-700 ring-1 ring-pink-200 dark:bg-pink-950/60 dark:text-pink-200 dark:ring-pink-900">
                    🌸 Girls Only
                  </span>
                )}
              </div>

              {/* TITLE */}
              {/* Price sits right under the title; the footer's mt-auto keeps
                  footers aligned across a row. */}
              <h3 className="pc-title mt-1 font-semibold leading-[1.3] tracking-[-0.01em] text-slate-900 dark:text-white line-clamp-2">
                {title}
              </h3>

              {/* PRICE · MRP · Save N% on one line. On narrow cards the struck
                  MRP hides first so price and chip never wrap or clip. */}
              <div className="mt-2 flex min-w-0 items-center gap-2">
                <span className="pc-price shrink-0 whitespace-nowrap font-bold leading-none tabular-nums tracking-tight text-slate-950 dark:text-white">
                  ₹{formattedPrice.selling}
                </span>
                {savings > 0 && (
                  <>
                    <span className={`${String(formattedPrice.selling).length > 5 ? "pc-mrp pc-mrp-long" : "pc-mrp"} pc-mrp-text min-w-0 truncate font-medium tabular-nums text-slate-400 line-through decoration-slate-300 dark:text-zinc-500 dark:decoration-zinc-600`}>
                      ₹{formattedPrice.original}
                    </span>
                    {discountPct > 0 && (
                      <span
                        title={`You save ₹${formattedPrice.savings}`}
                        // Same chip as the product page's "Save N%".
                        className="pc-save inline-flex shrink-0 items-center whitespace-nowrap rounded-md bg-emerald-700 font-medium tabular-nums text-white dark:bg-emerald-600"
                      >
                        Save {discountPct}%
                      </span>
                    )}
                  </>
                )}
              </div>

              {/* FOOTER (Avatar, Rating & Location) */}
              <div className="mt-auto pt-4">
              <div className="flex min-w-0 items-center gap-2 border-t border-slate-100 pt-3 dark:border-zinc-800">
                {/* Left Side: Avatar & Name */}
                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                  <AvatarComponent
                    name={sellerName}
                    imageUrl={sellerAvatarUrl}
                    size="small"
                    className="shrink-0 h-6 w-6"
                  />
                  {/* Fills the free space and ends with "…" (a hard max-width used to
                      clip long names mid-letter, e.g. "Priyadarshin"). */}
                  <span className="pc-meta min-w-0 truncate capitalize font-medium text-slate-600 dark:text-zinc-300">
                    {sellerName}
                  </span>
                  {/* Verified student tick, then plan badge, right of the name */}
                  {sellerInfo?.is_college_verified && (
                    <span title="Verified student" className="shrink-0">
                      <TickIcon className="h-4 w-4" />
                      <span className="sr-only">Verified student</span>
                    </span>
                  )}
                  {planBadge && (
                    <span className={`shrink-0 rounded-full px-1.5 py-[3px] text-[9px] font-extrabold leading-none ${planBadge.cls}`}>
                      {planBadge.label}
                    </span>
                  )}

                  {/* Rating Badge (real data only) */}
                  {sellerRating !== null && (
                    <div className="ml-0.5 flex shrink-0 items-center gap-0.5 rounded-md bg-amber-50 px-1.5 py-0.5 ring-1 ring-inset ring-amber-100 dark:bg-amber-500/10 dark:ring-amber-500/20">
                      <FaStar className="text-amber-400 text-[10px]" />
                      <span className="pc-meta-sm font-semibold tabular-nums text-amber-700 dark:text-amber-300">
                        {sellerRating}
                      </span>
                    </div>
                  )}
                </div>

                {/* Right Side: Location */}
                {formattedLocation && (
                  <div className="flex shrink-0 items-center justify-center gap-1 text-slate-500 dark:text-zinc-400">
                    <IoLocationOutline size={14} className="text-slate-400 dark:text-zinc-500" />
                    <span className="pc-loc pc-meta-sm font-medium truncate max-w-[110px]">
                      {formattedLocation}
                    </span>
                  </div>
                )}
              </div>
              </div>
            </div>
          </div>
        </Link>
      </>
      );
    },
  ),
);

ProductCard.displayName = "ProductCard";

export default ProductCard;
