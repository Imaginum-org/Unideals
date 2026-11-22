import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  CalendarDays,
  ChevronDown,
  Check,
  Clock3,
  Copy,
  Eye,
  Flag,
  Handshake,
  Hash,
  Heart,
  Hourglass,
  Info,
  Layers,
  LayoutList,
  Mail,
  MapPin,
  MoreHorizontal,
  MessageSquareText,
  Package,
  Palette,
  Pencil,
  ShieldCheck,
  Tag,
  Wallet,
  X,
} from "lucide-react";
import { FaTelegram, FaWhatsapp } from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";
import { getProductById, getProducts, recordProductView } from "../api/productApi";
import ProductCard from "../components/ProductCard.jsx";
import ProductGallery from "../components/ProductGallery.jsx";
import ImageLightbox from "../components/ImageLightbox.jsx";
import { Breadcrumbs, ProductGridSkeleton } from "../components/browse/BrowseKit.jsx";
import {
  PRODUCT_CATEGORY_OPTIONS,
  PRODUCT_CONDITION_OPTIONS,
  PRODUCT_PAYMENT_OPTIONS,
  PRODUCT_USAGE_OPTIONS,
} from "../constants/productOptions.js";
import AvatarComponent from "../../../components/common/AvatarComponent.jsx";
import VerifiedTick from "../../../components/common/VerifiedTick.jsx";
import EmptyState from "../../../components/ui/EmptyState.jsx";
import { isPlanLimitError } from "../../../services/planLimit.js";
import ReportUserModal from "../../chat/components/ReportUserModal.jsx";
import Seo from "../../../components/Seo.jsx";
import { canonicalFor } from "../../../components/seo/routeSeo.js";
import { productJsonLd } from "../../../components/seo/productJsonLd.js";
import { toast } from "../../../components/ui/toast.js";
import { useWishlist } from "../../../context/WishlistContext";
import { useCampus } from "../../../context/CampusContext.jsx";
import { useUser } from "../../../context/useUserContext.jsx";
import useSafeTimeout from "../../../hooks/useSafeTimeout.js";
import { ikThumb } from "../../../utils/imageTransform.js";
import { cn } from "../../../utils/cn.js";
import { normalizeMultiline } from "../../../utils/text.js";
import { isHotDeal } from "../../../utils/hotDeal.js";
import { productPath } from "../../../utils/productPath.js";
import { isSpecHidden } from "../utils/listingSmarts.js";
import { rankName } from "../../../utils/badgeConfig.js";
import HotDealChip from "../../../components/ui/HotDealChip.jsx";

/*
 * Product detail page.
 *
 * Layout (lg+): content column (gallery → description → specs → pickup) and
 * a sticky summary column (price, actions, seller). Below lg the columns
 * flatten (display: contents) and sections are re-ordered shopping-app
 * style: photos → summary → seller → description → specs → pickup.
 *
 * Colours come from the --accent* tokens so Girl Mode and dark mode theme
 * the page the same way they theme the browse pages.
 */

const FALLBACK_IMAGE = "/logo.svg";

/* ── Formatting helpers (never throw, "" when empty) ── */

const inr = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

const labelFrom = (options, value) => {
  const v = String(value || "").trim();
  if (!v) return "";
  return options.find((o) => o.value === v)?.label || v.replaceAll("_", " ");
};

const formatDate = (raw, opts = { day: "numeric", month: "short", year: "numeric" }) => {
  if (!raw) return "";
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("en-IN", opts);
};

const relativeTime = (raw) => {
  if (!raw) return "";
  const diff = Math.max(0, Date.now() - new Date(raw).getTime());
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (days >= 30) return formatDate(raw);
  if (days > 0) return `${days} day${days > 1 ? "s" : ""} ago`;
  if (hours > 0) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
  if (minutes > 0) return `${minutes} min ago`;
  return "just now";
};

const PLAN_LABEL = { pro: "Pro", pro_plus: "Pro+" };

const PAYMENT_LABEL = { cash: "Cash", upi: "UPI", both: "Cash or UPI" };

const SAFETY_TIPS = [
  "Meet at a busy campus spot, ideally in daylight.",
  "Check the item properly before you pay.",
  "Pay at pickup by cash or UPI. Never pay in advance.",
  "Keep the conversation in Unideals chat.",
];

/* ── Shared surfaces ── */

const CARD =
  "rounded-2xl border border-neutral-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:border-neutral-800 dark:bg-[#1A1D20]";
// Phones: sections run edge to edge, separated by the page background
// (native shopping-app pattern) instead of floating cards with margins.
const FLUSH_ON_PHONE = "max-sm:-mx-4 max-sm:rounded-none max-sm:border-x-0 max-sm:shadow-none";

/* Soft tints: a hint of colour per section so the details column isn't monochrome. */
const TINTS = {
  indigo: "bg-indigo-50 text-indigo-600 ring-indigo-100 dark:bg-indigo-950/50 dark:text-indigo-300 dark:ring-indigo-900/60",
  violet: "bg-violet-50 text-violet-600 ring-violet-100 dark:bg-violet-950/50 dark:text-violet-300 dark:ring-violet-900/60",
  emerald: "bg-emerald-50 text-emerald-600 ring-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-300 dark:ring-emerald-900/60",
  sky: "bg-sky-50 text-sky-600 ring-sky-100 dark:bg-sky-950/50 dark:text-sky-300 dark:ring-sky-900/60",
  rose: "bg-rose-50 text-rose-500 ring-rose-100 dark:bg-rose-950/50 dark:text-rose-300 dark:ring-rose-900/60",
};

/* A titled block inside the shared details card. Spacing + type do the work; no borders. */
function Section({ title, icon: Icon, tone = "indigo", action, className, children }) {
  return (
    <section className={cn("px-4 py-5 sm:px-6 sm:py-6", className)}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2.5 text-[16px] font-semibold tracking-tight text-slate-900 sm:text-[17px] dark:text-white">
          {Icon && (
            <span className={cn("grid h-7 w-7 shrink-0 place-items-center rounded-lg ring-1 ring-inset", TINTS[tone])} aria-hidden="true">
              <Icon className="h-4 w-4" />
            </span>
          )}
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function Chip({ tone = "neutral", size = "md", className, children, ...rest }) {
  // Quiet, compact tags (Linear/Stripe style): neutral surface, colour used sparingly.
  const tones = {
    neutral: "bg-white text-slate-700 ring-neutral-200 dark:bg-white/[0.04] dark:text-zinc-300 dark:ring-white/10",
    accent: "bg-[var(--accent-soft)] text-[var(--accent-text)] ring-transparent",
    success: "bg-emerald-50 text-emerald-700 ring-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900/60",
    warning: "bg-amber-50 text-amber-800 ring-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900/60",
    pink: "bg-pink-50 text-pink-700 ring-pink-100 dark:bg-pink-950/40 dark:text-pink-200 dark:ring-pink-900/60",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-md font-medium ring-1 ring-inset",
        size === "sm" ? "h-5 px-1.5 text-[10.5px]" : "h-6 px-2 text-[12px] capitalize",
        tones[tone],
        className,
      )}
      {...rest}
    >
      {children}
    </span>
  );
}

/* Status callout: neutral surface, a tinted icon tile carries the tone,
   bold title + muted explanation. */
function Notice({ tone = "warning", icon: Icon = Info, title, children }) {
  const tiles = {
    warning: "bg-amber-50 text-amber-600 ring-amber-100 dark:bg-amber-950/50 dark:text-amber-300 dark:ring-amber-900/60",
    neutral: "bg-neutral-100 text-slate-500 ring-neutral-200 dark:bg-white/5 dark:text-zinc-400 dark:ring-white/10",
    pink: "bg-pink-50 text-pink-600 ring-pink-100 dark:bg-pink-950/50 dark:text-pink-300 dark:ring-pink-900/60",
  };
  return (
    <div
      role="status"
      className="flex items-start gap-3 rounded-xl border border-neutral-200 bg-white p-3 dark:border-neutral-800 dark:bg-white/[0.02]"
    >
      <span className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-lg ring-1 ring-inset", tiles[tone])} aria-hidden="true">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 pt-px">
        {title && <p className="text-[13px] font-semibold leading-5 text-slate-900 dark:text-white">{title}</p>}
        <p className="text-[12.5px] leading-5 text-slate-500 dark:text-zinc-400">{children}</p>
      </div>
    </div>
  );
}

const iconBtn =
  "inline-flex h-9 items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 text-[13px] font-medium text-slate-600 transition-colors hover:border-[var(--accent-ring)] hover:text-[var(--accent-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)] dark:border-neutral-700 dark:bg-[#1A1D20] dark:text-zinc-300";

/* Escape-to-close + body scroll lock for the page's dialogs. */
function useDialog(open, onClose) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === "Escape" && onClose();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);
}

/* Schema.org Product markup so search engines can show price/availability. */
function useProductJsonLd(product, enabled) {
  useEffect(() => {
    if (!enabled || !product?._id) return undefined;
    const el = document.createElement("script");
    el.type = "application/ld+json";
    el.dataset.pdp = "1";
    el.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Product",
      name: product.title,
      description: String(product.description || "").replace(/\s+/g, " ").trim().slice(0, 500),
      image: (product.images || []).map((i) => i?.url).filter(Boolean),
      category: product.category,
      ...(product.attributes?.brand ? { brand: { "@type": "Brand", name: product.attributes.brand } } : {}),
      offers: {
        "@type": "Offer",
        priceCurrency: "INR",
        price: Number(product.selling_price || 0),
        availability:
          String(product.status || "listed") === "listed"
            ? "https://schema.org/InStock"
            : "https://schema.org/SoldOut",
        itemCondition:
          product.condition === "brand_new"
            ? "https://schema.org/NewCondition"
            : "https://schema.org/UsedCondition",
        url: `${window.location.origin}${productPath(product)}`,
      },
    });
    document.head.appendChild(el);
    return () => el.remove();
  }, [product, enabled]);
}

/* ── Page ── */

const ProductDescription = () => {
  const { toggleWishlist, isInWishlist } = useWishlist();
  const { campus, campusSlug } = useCampus();
  const { userDetails, isLoggedIn } = useUser();
  const { id } = useParams();
  const navigate = useNavigate();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notAtCampus, setNotAtCampus] = useState(false);
  const [activeImage, setActiveImage] = useState("");
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [reportTarget, setReportTarget] = useState(null); // null | "product" | "user"
  const [reportBusy, setReportBusy] = useState(false);
  const [wishlistLoading, setWishlistLoading] = useState(false);
  const [similarProducts, setSimilarProducts] = useState([]);
  const [similarLoading, setSimilarLoading] = useState(false);
  const productRef = useRef(null);
  productRef.current = product;

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [id]);

  // Product
  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    // The URL was just rewritten from the legacy id to this product's slug
    // (see below): same listing, so don't refetch or flash a skeleton.
    const shown = productRef.current;
    if (shown && (shown.slug === id || shown._id === id)) return undefined;

    const fetchProduct = async () => {
      if (!campusSlug) {
        // Campus still resolving: stop the skeleton so Retry can show.
        setLoading(false);
        return;
      }
      setLoading(true);
      setNotAtCampus(false);
      setProduct(null);
      try {
        const res = await getProductById(id, { campus_slug: campusSlug }, { signal: controller.signal });
        if (cancelled) return;
        const fetched = res?.data?.data;
        setProduct(fetched);
        setActiveImage(fetched?.images?.[0]?.url || "");
      } catch (error) {
        if (cancelled) return;
        // Cross-campus direct links resolve to CAMPUS_MISMATCH (404).
        if (error?.response?.data?.code === "CAMPUS_MISMATCH") setNotAtCampus(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchProduct();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [id, campusSlug]);

  // Record ONE view per page open (StrictMode-safe). The server dedupes per
  // viewer per 24h, ignores owners/bots, and may grant the Hot deal tag;
  // reflect its answer so the count on screen matches what was stored.
  const viewedRef = useRef(null);
  useEffect(() => {
    if (!product?._id || !campusSlug || viewedRef.current === product._id) return;
    viewedRef.current = product._id;
    recordProductView(product._id, { campus_slug: campusSlug })
      .then((res) => {
        const d = res?.data?.data;
        if (!d?.counted) return;
        setProduct((prev) =>
          prev && prev._id === product._id
            ? { ...prev, views_count: d.views_count, hot_until: d.hot_until || prev.hot_until }
            : prev,
        );
      })
      .catch(() => {});
  }, [product?._id, campusSlug]);

  // Canonical URL: old /product/<id> links (and ids from chat/orders) swap
  // to the slug form in place, keeping the query string, with no extra
  // history entry.
  useEffect(() => {
    if (!product?.slug || id === product.slug) return;
    navigate(`${productPath(product)}${window.location.search}`, { replace: true });
  }, [product, id, navigate]);

  // Similar listings (best-effort; the section hides when empty)
  useEffect(() => {
    let cancelled = false;
    if (!product?.category || !campusSlug) return undefined;
    setSimilarLoading(true);
    getProducts({ category: product.category, campus_slug: campusSlug })
      .then((res) => {
        if (cancelled) return;
        setSimilarProducts((res?.data?.data || []).filter((p) => p._id !== product._id).slice(0, 4));
      })
      .catch(() => !cancelled && setSimilarProducts([]))
      .finally(() => !cancelled && setSimilarLoading(false));
    return () => {
      cancelled = true;
    };
  }, [product?.category, product?._id, campusSlug]);

  /* ── Derived state ── */

  const myId = useMemo(() => {
    if (userDetails?._id) return String(userDetails._id);
    try {
      const cached = localStorage.getItem("cachedUserDetails");
      return cached ? String(JSON.parse(cached)?._id || "") : "";
    } catch {
      return "";
    }
  }, [userDetails?._id]);

  const seller = product?.seller_id || {};
  const sellerId = seller?._id ? String(seller._id) : "";
  const isOwner = Boolean(myId && sellerId && myId === sellerId);

  // Girls Corner: non-eligible viewers never chat on girls-only listings.
  const viewerCanSeeGirls =
    userDetails?.gender === "female" || userDetails?.role === "admin" || userDetails?.role === "support";
  const girlsBlocked = Boolean(product?.isGirlsOnly) && !viewerCanSeeGirls && !isOwner;

  const status = String(product?.status || "listed").toLowerCase();
  const isAvailable = ["listed", "active"].includes(status) && !product?.is_deleted;
  // Reserved by a confirmed deal for someone else. The reserving buyer keeps
  // their Chat CTA; cancelling the deal flips this back automatically.
  const reservedByOther = Boolean(
    isAvailable && product?.reservation?.reserved && String(product?.reservation?.buyerId || "") !== myId,
  );
  const availabilityLabel = isAvailable
    ? "Available"
    : status === "sold" || status === "delivered" || product?.is_deleted
      ? "Sold"
      : status === "unlisted"
        ? "Unlisted"
        : status.charAt(0).toUpperCase() + status.slice(1);

  const selling = Number(product?.selling_price || 0);
  const original = Number(product?.original_price || 0);
  const hasDiscount = original > selling && selling > 0;
  const savePct = hasDiscount ? Math.round(((original - selling) / original) * 100) : 0;

  const savesCount =
    product?.wishlist_count ??
    product?.wishlisted_count ??
    (Array.isArray(product?.wishlist) ? product.wishlist.length : null) ??
    product?.saves_count ??
    null;

  const inWishlist = isInWishlist(product?._id);
  const categoryLabel = labelFrom(PRODUCT_CATEGORY_OPTIONS, product?.category);
  const conditionLabel = labelFrom(PRODUCT_CONDITION_OPTIONS, product?.condition);
  const paymentLabel =
    PAYMENT_LABEL[product?.payment_preference] || labelFrom(PRODUCT_PAYMENT_OPTIONS, product?.payment_preference);

  const chatHref = sellerId
    ? `/chat?seller=${encodeURIComponent(sellerId)}&product=${encodeURIComponent(product?._id || "")}`
    : "/chat";

  const shareUrl = product?._id
    ? `${window.location.origin}${productPath(product)}${campusSlug ? `?campus_slug=${encodeURIComponent(campusSlug)}` : ""}`
    : "";

  /* ── Gallery ── */

  const images = useMemo(
    () => (product?.images?.length > 0 ? product.images.map((img) => img.url) : [FALLBACK_IMAGE]),
    [product],
  );
  const foundIndex = images.findIndex((img) => img === activeImage);
  const currentImageIndex = foundIndex >= 0 ? foundIndex : 0;

  const goToImage = useCallback(
    (next) => {
      if (!images.length) return;
      setActiveImage(images[((next % images.length) + images.length) % images.length]);
    },
    [images],
  );
  const goToPreviousImage = useCallback(() => goToImage(currentImageIndex - 1), [goToImage, currentImageIndex]);
  const goToNextImage = useCallback(() => goToImage(currentImageIndex + 1), [goToImage, currentImageIndex]);

  // Arrow keys page the inline gallery; the lightbox and dialogs own the
  // keyboard while open, and typing in a field never moves the photo.
  useEffect(() => {
    const onKey = (e) => {
      if (isLightboxOpen || showShareMenu || reportTarget) return;
      const tag = e.target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || e.target?.isContentEditable) return;
      if (e.key === "ArrowLeft") goToPreviousImage();
      if (e.key === "ArrowRight") goToNextImage();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goToPreviousImage, goToNextImage, isLightboxOpen, showShareMenu, reportTarget]);

  useProductJsonLd(product, Boolean(product && !product.isGirlsOnly));

  /* ── Actions ── */

  const handleWishlistClick = async (e) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    if (!product?._id || wishlistLoading) return;
    setWishlistLoading(true);
    try {
      const added = await toggleWishlist(product._id, product);
      toast.success(added ? "Saved to wishlist" : "Removed from wishlist", { id: "wishlist-toast" });
    } catch (error) {
      const message = error?.response?.data?.message || error?.message || "Failed to update wishlist";
      // Only a real 401 means "log in"; message text is never trusted for this.
      if (error?.response?.status === 401) {
        navigate("/login", { state: { from: `${window.location.pathname}${window.location.search}` } });
        toast.error("Please log in to use your wishlist");
        return;
      }
      // Wishlist cap: the app-wide plan dialog is already open.
      if (!isPlanLimitError(error)) toast.error(message, { id: "wishlist-error" });
    } finally {
      setWishlistLoading(false);
    }
  };

  const openShare = async () => {
    // Phones get the native share sheet; desktop gets our dialog.
    const coarse = typeof window !== "undefined" && window.matchMedia?.("(pointer: coarse)").matches;
    if (coarse && navigator.share) {
      try {
        await navigator.share({ title: product?.title, text: `${product?.title} · ${inr(selling)} on Unideals`, url: shareUrl });
        return;
      } catch (err) {
        if (err?.name === "AbortError") return;
      }
    }
    setShowShareMenu(true);
  };

  // Reports reuse chat's ReportUserModal: "product" → /api/report/product,
  // "user" → /api/report/user (seller). Both endpoints require login.
  const openReport = (target) => {
    if (!isLoggedIn) {
      navigate("/login", { state: { from: `${window.location.pathname}${window.location.search}` } });
      toast.error(target === "user" ? "Please log in to report a seller" : "Please log in to report a listing");
      return;
    }
    setReportTarget(target);
  };

  const closeReport = useCallback(() => setReportTarget(null), []);

  const submitReport = async (reason, description) => {
    const isUser = reportTarget === "user";
    const targetId = isUser ? sellerId : product?._id;
    if (!targetId) return;
    setReportBusy(true);
    try {
      const { default: axios } = await import("../../../services/axiosInstance.js");
      await axios.post(`/api/report/${isUser ? "user" : "product"}/${targetId}`, {
        reason,
        description: isUser
          ? `${description} (Reported from listing: ${product?.title || product?._id})`
          : description,
      });
      setReportTarget(null);
      toast.success(isUser ? "Report sent. Our team will check it out." : "Thanks. Our team will review this listing.");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not submit report");
    } finally {
      setReportBusy(false);
    }
  };

  /* ── States ── */

  if (loading) return <ProductPageSkeleton />;

  if (!product) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center bg-[#F7F9FD] px-4 py-12 font-figtree dark:bg-[#131313]">
        <EmptyState
          variant="search"
          title={
            !campusSlug
              ? "Pick your campus to view this listing"
              : notAtCampus
                ? "Not available at your campus"
                : "This listing isn't available"
          }
          description={
            !campusSlug
              ? "We couldn't tell which campus marketplace to load."
              : notAtCampus
                ? "This listing belongs to another campus marketplace."
                : "It may have been sold, removed or the link is incorrect."
          }
          primaryAction={{ label: "Explore listings", to: "/explore" }}
          secondaryAction={
            !campusSlug
              ? { label: "Retry", onClick: () => window.location.reload() }
              : { label: "Back to home", to: "/" }
          }
        />
      </div>
    );
  }

  const specs = [
    { icon: Layers, label: "Condition", value: isSpecHidden(product?.category, "condition") ? "" : conditionLabel },
    { icon: Tag, label: "Brand", value: String(product?.attributes?.brand || "").trim() },
    { icon: Palette, label: "Colour", value: isSpecHidden(product?.category, "color") ? "" : String(product?.attributes?.color || "").trim() },
    { icon: Hourglass, label: "Used for", value: isSpecHidden(product?.category, "usage") ? "" : labelFrom(PRODUCT_USAGE_OPTIONS, product?.attributes?.usage_duration) },
    { icon: CalendarDays, label: "Purchased", value: formatDate(product?.attributes?.purchase_date) },
    { icon: Package, label: "Quantity", value: product?.quantity ? `${product.quantity} available` : "" },
    { icon: Wallet, label: "Payment", value: paymentLabel },
    { icon: Handshake, label: "Price", value: product?.is_negotiable === false ? "Fixed" : "Negotiable" },
    { icon: Clock3, label: "Listed on", value: formatDate(product?.createdAt) },
  ].filter((s) => s.value);

  const pickup = product?.pickup_address_snapshot || {};

  return (
    <>
      <Seo
        title={
          product?.title
            ? `${product.title}${product.selling_price != null ? ` for ₹${Number(product.selling_price).toLocaleString("en-IN")}` : ""} | Unideals`
            : "Product | Unideals"
        }
        description={product?.description ? String(product.description).replace(/\s+/g, " ").trim().slice(0, 160) : "View this campus listing on Unideals."}
        robots={product?.isGirlsOnly ? "noindex,nofollow" : "index,follow"}
        canonical={product?._id && !product?.isGirlsOnly ? canonicalFor(productPath(product)) : undefined}
        image={product?.images?.[0]?.url || undefined}
        type="product"
        jsonLd={product?._id && !product?.isGirlsOnly ? productJsonLd(product, canonicalFor(productPath(product))) : undefined}
      />

      <motion.main
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="min-h-screen w-full bg-[#F7F9FD] pb-[calc(6rem+env(safe-area-inset-bottom))] font-figtree dark:bg-[#131313] sm:pb-0"
      >
        <div className="mx-auto w-full max-w-[calc(var(--page-max)+9vw)] px-4 sm:px-[4.5vw] sm:pt-4 2xl:max-w-[var(--page-max)] 2xl:px-0">
          {/* Breadcrumbs (sm+; phones open straight onto the photo) */}
          <div className="hidden sm:block">
          <Breadcrumbs
            items={[
              { label: "Home", to: "/" },
              ...(product?.category ? [{ label: categoryLabel, to: `/category/${product.category}` }] : []),
              { label: product?.title || "Listing" },
            ]}
          />
          </div>

          <div className="grid grid-cols-1 gap-2 sm:mt-4 sm:gap-5 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-6 xl:grid-cols-[minmax(0,1fr)_420px] xl:gap-8">
            {/* ── Content column ── */}
            <div className="flex min-w-0 flex-col gap-5 max-lg:contents">
              <div className={cn(CARD, "p-0 max-lg:order-1 max-sm:-mx-4 max-sm:rounded-none max-sm:border-0 max-sm:bg-transparent max-sm:shadow-none sm:p-3")}>
                <ProductGallery
                  images={images}
                  activeIndex={currentImageIndex}
                  onSelect={goToImage}
                  onPrev={goToPreviousImage}
                  onNext={goToNextImage}
                  onOpen={() => setIsLightboxOpen(true)}
                  onShare={openShare}
                />
              </div>

              {/* Details: one calm surface, sections split by hairlines (no nested boxes). */}
              <div className={cn(CARD, FLUSH_ON_PHONE, "divide-y divide-neutral-200/80 max-lg:order-4 dark:divide-neutral-800")}>
                <DescriptionSection text={product?.description} />

                {specs.length > 0 && (
                  <Section title="Specifications" icon={LayoutList} tone="violet">
                    <dl className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3 sm:gap-x-8">
                      {specs.map(({ label, value }) => (
                        <div key={label} className="min-w-0">
                          <dt className="text-[12.5px] text-slate-500 dark:text-zinc-400">{label}</dt>
                          <dd
                            className="mt-1 truncate text-[14.5px] font-medium text-slate-900 first-letter:uppercase dark:text-zinc-100"
                            title={String(value)}
                          >
                            {value}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </Section>
                )}

                <Section title="Pickup & safety" icon={MapPin} tone="emerald">
                  <div className="grid gap-5 sm:grid-cols-2 sm:gap-8">
                    <InfoTile icon={Building2} tone="sky" label="Campus" value={product?.campus_id?.name || campus?.name || "Campus marketplace"} />
                    <InfoTile
                      icon={MapPin}
                      tone="rose"
                      label="Meetup spot"
                      value={pickup.address_line || "Shared in chat"}
                      sub={[pickup.city, pickup.state].filter(Boolean).join(", ")}
                    />
                  </div>
                  {pickup.additional_info && (
                    <p className="mt-5 break-words text-[14px] leading-relaxed text-slate-600 dark:text-zinc-300">
                      <span className="font-medium text-slate-900 dark:text-zinc-100">Seller note: </span>
                      {pickup.additional_info}
                    </p>
                  )}
                  <div className="mt-6 rounded-xl bg-emerald-50/60 p-4 sm:p-5 dark:bg-emerald-950/20">
                    <p className="flex items-center gap-2 text-[13.5px] font-semibold text-slate-900 dark:text-white">
                      <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                      Safe campus exchange
                    </p>
                    <ul className="mt-3 grid gap-x-8 gap-y-2.5 sm:grid-cols-2">
                      {SAFETY_TIPS.map((tip) => (
                        <li key={tip} className="flex items-start gap-2.5 text-[13.5px] leading-5 text-slate-600 dark:text-zinc-300">
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" strokeWidth={2.25} aria-hidden="true" />
                          {tip}
                        </li>
                      ))}
                    </ul>
                  </div>
                </Section>
              </div>
            </div>

            {/* ── Summary column (sticky on desktop) ── */}
            <aside className="flex min-w-0 flex-col gap-4 max-lg:contents lg:sticky lg:top-[calc(var(--header-h,4.75rem)+1rem)] lg:self-start">
              <div className={cn(CARD, FLUSH_ON_PHONE, "p-4 max-lg:order-2 max-sm:border-t-0 sm:p-6")}>
                {/* Badges */}
                <div className="flex flex-wrap items-center gap-2">
                  {isHotDeal(product) && <HotDealChip size="md" />}
                  {product?.category && (
                    <Link to={`/category/${product.category}`} className="transition-opacity hover:opacity-80">
                      <Chip tone="accent">{categoryLabel}</Chip>
                    </Link>
                  )}
                  {conditionLabel && !isSpecHidden(product?.category, "condition") && <Chip>{conditionLabel}</Chip>}
                  <Chip>
                    <span
                      className={cn(
                        "h-1.5 w-1.5 rounded-full",
                        reservedByOther ? "bg-amber-500" : isAvailable ? "bg-emerald-500" : "bg-slate-400",
                      )}
                      aria-hidden="true"
                    />
                    {reservedByOther ? "Reserved" : availabilityLabel}
                  </Chip>
                  {product?.isGirlsOnly && <Chip tone="pink">🌸 Girls only</Chip>}
                </div>

                <h1 className="mt-3 break-words text-[20px] font-semibold leading-snug tracking-tight text-slate-900 sm:mt-3.5 sm:text-[26px] sm:leading-tight dark:text-white">
                  {product?.title}
                </h1>

                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] text-slate-500 dark:text-zinc-400">
                  <span className="inline-flex items-center gap-1">
                    <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
                    Listed {relativeTime(product?.createdAt)}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                    {Number(product?.views_count || 0).toLocaleString("en-IN")} views
                  </span>
                  {savesCount !== null && (
                    <span className="inline-flex items-center gap-1">
                      <Heart className="h-3.5 w-3.5" aria-hidden="true" />
                      {savesCount} saves
                    </span>
                  )}
                </div>

                {/* Price */}
                <div className="mt-4 rounded-xl bg-neutral-50 p-3.5 sm:mt-5 sm:p-4 dark:bg-white/[0.03]">
                  <div className="flex flex-wrap items-end gap-x-3 gap-y-1">
                    <span className="text-[26px] font-bold leading-none tracking-tight text-slate-900 sm:text-[30px] dark:text-white">
                      {inr(selling)}
                    </span>
                    {hasDiscount && (
                      <span className="pb-0.5 text-[15px] font-medium text-slate-400 line-through dark:text-zinc-500">
                        {inr(original)}
                      </span>
                    )}
                    {savePct > 0 && (
                      // Styled like the header's Sell button: solid fill, white text.
                      <span className="mb-0.5 inline-flex h-7 items-center whitespace-nowrap rounded-lg bg-emerald-700 px-2.5 text-[13px] font-medium text-white dark:bg-emerald-600">
                        Save {savePct}%
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-[12.5px] text-slate-500 dark:text-zinc-400">
                    {hasDiscount && <>You save {inr(original - selling)} · </>}
                    {product?.is_negotiable === false ? "Fixed price" : "Price negotiable"}
                    {paymentLabel && <> · {paymentLabel}</>}
                  </p>
                </div>

                {/* Status notices */}
                <div className="mt-4 space-y-2 empty:hidden">
                  {!isAvailable && (
                    <Notice tone="neutral" icon={Package} title={`${availabilityLabel}`}>
                      This listing isn&apos;t accepting buyers anymore.
                    </Notice>
                  )}
                  {reservedByOther && (
                    <Notice tone="warning" icon={Hourglass} title="Reserved for another buyer">
                      If their deal falls through, it&apos;ll be available again.
                    </Notice>
                  )}
                  {girlsBlocked && (
                    <Notice tone="pink" icon={ShieldCheck} title="Girls-only listing">
                      Only girls can chat with this seller.
                      {!isLoggedIn && " Log in to continue."}
                    </Notice>
                  )}
                </div>

                {/* Actions (phones use the docked bar) */}
                <div className="mt-5 hidden sm:block">
                  {isOwner ? (
                    <OwnerActions productId={product._id} />
                  ) : (
                    <div className="flex flex-col gap-2.5">
                      <PrimaryCta
                        isAvailable={isAvailable}
                        reservedByOther={reservedByOther}
                        girlsBlocked={girlsBlocked}
                        chatHref={chatHref}
                        className="h-12 w-full"
                      />
                      <div className="grid grid-cols-2 gap-2.5">
                        <WishlistButton inWishlist={inWishlist} loading={wishlistLoading} onClick={handleWishlistClick} withLabel />
                        <ReportButton onClick={() => openReport("product")}>
                          Report listing
                        </ReportButton>
                      </div>
                    </div>
                  )}
                </div>

                {/* Phones: Save + Chat live in the docked bar, Report stays here */}
                {!isOwner && (
                  <ReportButton onClick={() => openReport("product")} className="mt-4 sm:hidden">
                    Report listing
                  </ReportButton>
                )}

                <p className="mt-4 flex items-start gap-2 text-[12px] leading-relaxed text-slate-500 dark:text-zinc-400">
                  <ShieldCheck className="mt-px h-4 w-4 shrink-0 text-emerald-500" aria-hidden="true" />
                  Meet on campus and pay at pickup. Never pay in advance.
                </p>
              </div>

              <SellerCard
                seller={seller}
                stats={product?.seller_stats}
                isOwner={isOwner}
                onReport={sellerId ? () => openReport("user") : undefined}
                className="max-lg:order-3"
              />
            </aside>
          </div>

          {/* Similar listings */}
          {(similarLoading || similarProducts.length > 0) && (
            <section className="mb-8 mt-8 sm:mb-12 sm:mt-12">
              <div className="mb-5 flex items-end justify-between gap-4">
                <div className="min-w-0">
                  <h2 className="text-[18px] font-semibold tracking-tight text-slate-900 sm:text-[20px] dark:text-white">
                    More in {categoryLabel || "this category"}
                  </h2>
                  <p className="mt-0.5 text-[13px] text-slate-500 dark:text-zinc-400">
                    Similar listings on {campus?.name || "your campus"}
                  </p>
                </div>
                {product?.category && (
                  <Link
                    to={`/category/${product.category}`}
                    className="inline-flex shrink-0 items-center gap-1.5 text-[13.5px] font-semibold text-[var(--accent-text)] hover:underline"
                  >
                    View all
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                )}
              </div>
              {similarLoading ? (
                <ProductGridSkeleton count={4} className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 xl:gap-5" />
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 xl:gap-5">
                  {similarProducts.map((p) => (
                    <ProductCard key={p._id} product={p} />
                  ))}
                </div>
              )}
            </section>
          )}
          {!similarLoading && similarProducts.length === 0 && <div className="h-6 sm:h-12" />}
        </div>

        {/* Docked action bar (phones) */}
        <div className="fixed inset-x-0 bottom-0 z-50 border-t border-neutral-200/80 bg-white/90 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl sm:hidden dark:border-neutral-800 dark:bg-[#16181B]/90">
          <div className="flex items-center gap-2.5">
            <div className="min-w-0 shrink-0 pr-1">
              <p className="text-[11px] font-medium leading-none text-slate-500 dark:text-zinc-400">
                {hasDiscount ? <span className="line-through">{inr(original)}</span> : "Price"}
              </p>
              <p className="mt-1 text-[19px] font-bold leading-none tracking-tight text-slate-900 dark:text-white">{inr(selling)}</p>
            </div>
            {isOwner ? (
              <Link
                to={`/upload/${product._id}`}
                className="flex h-12 min-w-0 flex-1 items-center justify-center gap-2 rounded-lg bg-[var(--accent)] text-[15px] font-medium text-white active:scale-[0.98]"
              >
                <Pencil className="h-[18px] w-[18px]" aria-hidden="true" />
                Edit listing
              </Link>
            ) : (
              <>
                <WishlistButton inWishlist={inWishlist} loading={wishlistLoading} onClick={handleWishlistClick} />
                <PrimaryCta
                  isAvailable={isAvailable}
                  reservedByOther={reservedByOther}
                  girlsBlocked={girlsBlocked}
                  chatHref={chatHref}

                  className="h-12 min-w-0 flex-1"
                />
              </>
            )}
          </div>
        </div>

        <ShareSheet
          open={showShareMenu}
          onClose={() => setShowShareMenu(false)}
          product={product}
          shareUrl={shareUrl}
          campusName={campus?.name}
        />
        <ReportUserModal
          open={Boolean(reportTarget)}
          targetType={reportTarget === "user" ? "user" : "product"}
          userName={seller?.name}
          title={reportTarget === "user" ? seller?.name || "this seller" : product?.title}
          submitting={reportBusy}
          onClose={closeReport}
          onSubmit={submitReport}
        />
        <ImageLightbox
          open={isLightboxOpen}
          images={images}
          index={currentImageIndex}
          onClose={() => setIsLightboxOpen(false)}
          onIndexChange={goToImage}
        />
      </motion.main>
    </>
  );
};

export default ProductDescription;

/* ── Building blocks ── */

function PrimaryCta({ isAvailable, reservedByOther, girlsBlocked, chatHref, className }) {
  const base = "inline-flex items-center justify-center gap-2 rounded-lg px-4 text-[15px] font-medium";
  if (reservedByOther || girlsBlocked || !isAvailable) {
    const label = reservedByOther ? "Reserved" : girlsBlocked ? "Girls only" : "No longer available";
    return (
      <div
        aria-disabled="true"
        className={cn(base, "cursor-not-allowed bg-neutral-100 text-slate-500 dark:bg-white/5 dark:text-zinc-400", className)}
      >
        {label}
      </div>
    );
  }
  return (
    <Link
      to={chatHref}
      className={cn(
        base,
        "bg-[var(--accent)] text-white shadow-sm transition-colors hover:bg-[var(--accent-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)] focus-visible:ring-offset-2 active:scale-[0.99] dark:focus-visible:ring-offset-[#1A1D20]",
        className,
      )}
    >
      <MessageSquareText className="h-[18px] w-[18px]" aria-hidden="true" />
      Chat with seller
    </Link>
  );
}

// One shape for the secondary actions (Save, Report listing) so they sit
// side by side as an identical pair; only colour/state differs.
const SECONDARY_BTN =
  "inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg border px-3 text-[13.5px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)] disabled:opacity-60";
const SECONDARY_IDLE =
  "border-neutral-200 bg-white text-slate-600 dark:border-neutral-700 dark:bg-[#1A1D20] dark:text-zinc-300";

function ReportButton({ onClick, className, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        SECONDARY_BTN,
        SECONDARY_IDLE,
        "hover:border-red-200 hover:text-red-600 dark:hover:border-red-900/60 dark:hover:text-red-400",
        className,
      )}
    >
      <Flag className="h-[18px] w-[18px]" aria-hidden="true" />
      {children}
    </button>
  );
}

function WishlistButton({ inWishlist, loading, onClick, withLabel = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      aria-pressed={inWishlist}
      aria-label={inWishlist ? "Remove from wishlist" : "Save to wishlist"}
      className={cn(
        withLabel
          ? SECONDARY_BTN
          : "inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border transition-colors active:scale-95 disabled:opacity-60",
        inWishlist
          ? "border-pink-200 bg-pink-50 text-pink-600 dark:border-pink-900/60 dark:bg-pink-950/30 dark:text-pink-300"
          : cn(SECONDARY_IDLE, "hover:border-pink-200 hover:text-pink-600 dark:hover:border-pink-900/60 dark:hover:text-pink-300"),
      )}
    >
      <Heart className={cn("h-[18px] w-[18px]", inWishlist && "fill-current")} aria-hidden="true" />
      {withLabel && (inWishlist ? "Saved" : "Save")}
    </button>
  );
}

function OwnerActions({ productId }) {
  const shortId = String(productId || "").slice(-8).toUpperCase();
  const copyId = async () => {
    try {
      await navigator.clipboard.writeText(String(productId));
      toast.success("Listing ID copied");
    } catch {
      toast.error("Could not copy");
    }
  };
  return (
    <div className="flex flex-col gap-2.5">
      <p className="flex items-center gap-2 text-[12.5px] text-slate-500 dark:text-zinc-400">
        <BadgeCheck className="h-4 w-4 shrink-0 text-[var(--accent-text)]" aria-hidden="true" />
        <span>
          <span className="font-semibold text-slate-800 dark:text-zinc-200">Your listing</span>
          <span aria-hidden="true"> · </span>
          buyers see a Chat button here
        </span>
      </p>
      <Link
        to={`/upload/${productId}`}
        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[var(--accent)] text-[14.5px] font-medium text-white shadow-sm transition-colors hover:bg-[var(--accent-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#1A1D20]"
      >
        <Pencil className="h-[18px] w-[18px]" aria-hidden="true" />
        Edit listing
      </Link>
      <Link to="/productlisted" className={cn(iconBtn, "h-11 justify-center")}>
        <LayoutList className="h-4 w-4" aria-hidden="true" />
        Manage my listings
      </Link>
      <button
        type="button"
        onClick={copyId}
        className="inline-flex items-center justify-center gap-1.5 text-[12px] font-medium text-slate-400 transition-colors hover:text-slate-600 dark:text-zinc-500 dark:hover:text-zinc-300"
        title="Share this with support if you need help with this listing"
      >
        <Hash className="h-3.5 w-3.5" aria-hidden="true" />
        Listing ID {shortId}
        <Copy className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </div>
  );
}

function SellerCard({ seller, stats, isOwner, onReport, className }) {
  const plan = PLAN_LABEL[seller?.subscription];
  const level = seller?.gamification?.level;
  const rank = seller?.gamification?.rank_title ? rankName(seller.gamification.rank_title) : null;
  const memberSince = formatDate(seller?.createdAt, { month: "short", year: "numeric" });
  const activeListings = stats?.active_listings;

  const ratingCount = Number(seller?.rating?.count) || 0;
  // One quiet stats strip: value on top, label below.
  const facts = [
    { label: ratingCount ? `Rating (${ratingCount})` : "Rating", value: ratingCount ? `★ ${Number(seller.rating.avg).toFixed(1)}` : "New" },
    Number.isFinite(activeListings) && { label: activeListings === 1 ? "Listing" : "Listings", value: activeListings },
    level && { label: rank || "Level", value: `Lvl ${level}` },
  ].filter(Boolean);
  const cols = { 1: "grid-cols-1", 2: "grid-cols-2", 3: "grid-cols-3" }[facts.length];

  return (
    <section className={cn(CARD, FLUSH_ON_PHONE, "p-4 sm:p-6", className)} aria-label="Seller">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[13px] font-semibold text-slate-900 dark:text-white">{isOwner ? "Your seller profile" : "About the seller"}</h2>
        {!isOwner && onReport && (
          <button
            type="button"
            onClick={onReport}
            aria-label="Report seller"
            className="-mr-2 inline-flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-[12.5px] font-medium text-slate-500 transition-colors hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)] dark:text-zinc-400 dark:hover:bg-red-950/30 dark:hover:text-red-400"
          >
            <Flag className="h-3.5 w-3.5" aria-hidden="true" />
            Report
          </button>
        )}
      </div>

      <div className="mt-3 flex items-center gap-3">
        <AvatarComponent
          name={seller?.name || "Seller"}
          imageUrl={seller?.avatar?.url}
          plan={seller?.subscription}
          role={seller?.role}
          showBadge
          size="medium"
        />
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-1.5">
            <p className="truncate text-[15px] font-semibold text-slate-900 dark:text-white">{seller?.name || "Campus seller"}</p>
            <VerifiedTick verified={Boolean(seller?.is_college_verified)} size="md" />
            {plan && <Chip tone="accent" size="sm">{plan}</Chip>}
          </div>
          <p className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-1.5 text-[12.5px] text-slate-500 dark:text-zinc-400">
            <span>Campus member</span>
            {memberSince && (
              <>
                <span aria-hidden="true" className="text-slate-300 dark:text-zinc-600">·</span>
                <span className="whitespace-nowrap">Joined {memberSince}</span>
              </>
            )}
          </p>
        </div>
      </div>

      {facts.length > 0 && (
        <dl className={cn("mt-5 grid gap-4 border-t border-neutral-200/80 pt-4 dark:border-neutral-800", cols)}>
          {facts.map((f) => (
            <div key={f.label} className="flex min-w-0 flex-col-reverse">
              <dt className="mt-0.5 max-w-full truncate text-[11.5px] text-slate-500 dark:text-zinc-400">{f.label}</dt>
              <dd className="max-w-full truncate text-[15px] font-semibold tabular-nums text-slate-900 dark:text-white">{f.value}</dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}

function InfoTile({ icon: Icon, tone = "sky", label, value, sub }) {
  return (
    <div className="flex min-w-0 items-start gap-3">
      <span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-lg ring-1 ring-inset", TINTS[tone])} aria-hidden="true">
        <Icon className="h-[18px] w-[18px]" />
      </span>
      <div className="min-w-0">
        <p className="text-[12.5px] text-slate-500 dark:text-zinc-400">{label}</p>
        <p className="mt-0.5 break-words text-[14.5px] font-medium text-slate-900 first-letter:uppercase dark:text-white">{value}</p>
        {sub && <p className="mt-0.5 break-words text-[13px] text-slate-500 first-letter:uppercase dark:text-zinc-400">{sub}</p>}
      </div>
    </div>
  );
}

function DescriptionSection({ text, className }) {
  const [expanded, setExpanded] = useState(false);
  const [overflowing, setOverflowing] = useState(false);
  const bodyRef = useRef(null);
  const sectionRef = useRef(null);

  // Old listings may still carry padding; normalise for display. New and
  // edited listings are already stored clean.
  const body = useMemo(() => normalizeMultiline(String(text || "")), [text]);
  const paragraphs = useMemo(() => (body ? body.split("\n\n") : []), [body]);

  // Clamp by rendered height, not character count: catches walls of short
  // lines and long text alike, and re-checks when the column resizes.
  useLayoutEffect(() => {
    const el = bodyRef.current;
    if (!el || expanded) return undefined;
    const measure = () => setOverflowing(el.scrollHeight > el.clientHeight + 2);
    measure();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    ro?.observe(el);
    return () => ro?.disconnect();
  }, [body, expanded]);

  const toggle = () => {
    setExpanded((open) => {
      // Collapsing a long text: bring the section back into view.
      if (open) {
        const top = sectionRef.current?.getBoundingClientRect().top ?? 0;
        if (top < 0) sectionRef.current.scrollIntoView({ block: "start", behavior: "smooth" });
      }
      return !open;
    });
  };

  const clamped = !expanded;

  return (
    <div ref={sectionRef} className={cn("scroll-mt-[calc(var(--header-h,4.75rem)+1rem)]", className)}>
    <Section title="About this item" icon={Info} tone="indigo">
      {body ? (
        <>
          <div className="relative">
            <div
              ref={bodyRef}
              id="pdp-description"
              className={cn(
                "space-y-3 text-[14.5px] leading-[1.75] text-slate-600 dark:text-zinc-300",
                clamped && "max-h-[13.5rem] overflow-hidden",
              )}
            >
              {paragraphs.map((para, i) => (
                <p key={i} className="whitespace-pre-line break-words [overflow-wrap:anywhere]">
                  {para}
                </p>
              ))}
            </div>
            {clamped && overflowing && (
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-white to-transparent dark:from-[#1A1D20]"
              />
            )}
          </div>
          {(overflowing || expanded) && (
            <button
              type="button"
              onClick={toggle}
              aria-expanded={expanded}
              aria-controls="pdp-description"
              className="mt-3 inline-flex items-center gap-1 text-[13.5px] font-semibold text-[var(--accent-text)] hover:underline"
            >
              {expanded ? "Show less" : "Read full description"}
              <ChevronDown className={cn("h-4 w-4 transition-transform", expanded && "rotate-180")} aria-hidden="true" />
            </button>
          )}
        </>
      ) : (
        <p className="text-[14px] text-slate-500 dark:text-zinc-400">The seller hasn&apos;t added a description. Ask them in chat.</p>
      )}
    </Section>
    </div>
  );
}

function ProductPageSkeleton() {
  const bar = "browse-shimmer rounded-full bg-neutral-100 dark:bg-white/5";
  return (
    <div className="min-h-screen bg-[#F7F9FD] font-figtree dark:bg-[#131313]" aria-busy="true" aria-label="Loading listing">
      <div className="mx-auto w-full max-w-[calc(var(--page-max)+9vw)] px-4 pt-4 sm:px-[4.5vw] 2xl:max-w-[var(--page-max)] 2xl:px-0">
        <div className={cn(bar, "h-3.5 w-56")} />
        <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-6 xl:grid-cols-[minmax(0,1fr)_420px] xl:gap-8">
          <div className="flex flex-col gap-5">
            <div className={cn(CARD, "p-3")}>
              <div className="browse-shimmer h-[300px] w-full rounded-xl bg-neutral-100 sm:h-[380px] lg:h-[420px] xl:h-[460px] dark:bg-white/5" />
              <div className="mt-3 flex gap-2">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="browse-shimmer h-16 w-16 rounded-lg bg-neutral-100 dark:bg-white/5" />
                ))}
              </div>
            </div>
            <div className={cn(CARD, "hidden space-y-3 p-6 lg:block")}>
              <div className={cn(bar, "h-4 w-40")} />
              <div className={cn(bar, "h-3 w-full")} />
              <div className={cn(bar, "h-3 w-11/12")} />
              <div className={cn(bar, "h-3 w-2/3")} />
            </div>
          </div>
          <div className="flex flex-col gap-4">
            <div className={cn(CARD, "space-y-4 p-6")}>
              <div className="flex gap-2">
                <div className={cn(bar, "h-6 w-20")} />
                <div className={cn(bar, "h-6 w-16")} />
              </div>
              <div className={cn(bar, "h-6 w-4/5")} />
              <div className={cn(bar, "h-3 w-1/2")} />
              <div className="browse-shimmer h-20 rounded-xl bg-neutral-100 dark:bg-white/5" />
              <div className="browse-shimmer h-12 rounded-lg bg-neutral-100 dark:bg-white/5" />
            </div>
            <div className={cn(CARD, "flex items-center gap-3 p-6")}>
              <div className="browse-shimmer h-11 w-11 rounded-full bg-neutral-100 dark:bg-white/5" />
              <div className="flex-1 space-y-2">
                <div className={cn(bar, "h-3.5 w-1/2")} />
                <div className={cn(bar, "h-3 w-1/3")} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Share dialog (desktop; phones use the native share sheet) ── */

function ShareSheet({ open, onClose, product, shareUrl, campusName }) {
  const safeTimeout = useSafeTimeout();
  const [copied, setCopied] = useState(false);
  const canNativeShare = typeof navigator !== "undefined" && typeof navigator.share === "function";
  useDialog(open, onClose);

  const title = product?.title || "Listing on Unideals";
  const price = inr(product?.selling_price);
  const shareText = `Found this on Unideals${campusName ? ` (${campusName})` : ""}: ${title}, ${price}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      safeTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy link");
    }
  };

  const openExternal = (url) => {
    window.open(url, "_blank", "noopener,noreferrer");
    onClose();
  };

  const nativeShare = async () => {
    try {
      await navigator.share({ title, text: shareText, url: shareUrl });
      onClose();
    } catch {
      /* cancelled */
    }
  };

  const targets = [
    {
      key: "whatsapp",
      label: "WhatsApp",
      icon: <FaWhatsapp className="h-[22px] w-[22px]" />,
      tone: "bg-[#25D366]/10 text-[#1DA851] dark:bg-[#25D366]/15 dark:text-[#4ADE80]",
      onClick: () => openExternal(`https://wa.me/?text=${encodeURIComponent(`${shareText}\n${shareUrl}`)}`),
    },
    {
      key: "telegram",
      label: "Telegram",
      icon: <FaTelegram className="h-[22px] w-[22px]" />,
      tone: "bg-[#3390EC]/10 text-[#2A82DA] dark:bg-[#3390EC]/15 dark:text-[#60A5FA]",
      onClick: () =>
        openExternal(`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`),
    },
    {
      key: "x",
      label: "X",
      icon: <FaXTwitter className="h-[19px] w-[19px]" />,
      tone: "bg-neutral-100 text-slate-900 dark:bg-white/10 dark:text-white",
      onClick: () =>
        openExternal(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`),
    },
    {
      key: "email",
      label: "Email",
      icon: <Mail className="h-[20px] w-[20px]" />,
      tone: "bg-neutral-100 text-slate-700 dark:bg-white/10 dark:text-zinc-200",
      onClick: () => {
        window.location.href = `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(`${shareText}\n\n${shareUrl}`)}`;
        onClose();
      },
    },
    ...(canNativeShare
      ? [
          {
            key: "more",
            label: "More",
            icon: <MoreHorizontal className="h-[20px] w-[20px]" />,
            tone: "bg-neutral-100 text-slate-700 dark:bg-white/10 dark:text-zinc-200",
            onClick: nativeShare,
          },
        ]
      : []),
  ];

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[999] flex items-end justify-center md:items-center" role="dialog" aria-modal="true" aria-labelledby="share-sheet-title">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-950/45 backdrop-blur-[2px]"
          />
          <motion.div
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 24, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="relative w-full overflow-hidden rounded-t-2xl border border-neutral-200/80 bg-white shadow-[0_24px_64px_-16px_rgba(15,23,42,0.4)] md:mx-4 md:w-[440px] md:rounded-2xl dark:border-neutral-800 dark:bg-[#1A1D20]"
          >
            {/* Header */}
            <div className="flex items-center justify-between gap-3 border-b border-neutral-200/80 px-5 py-4 dark:border-neutral-800">
              <h3 id="share-sheet-title" className="text-[15px] font-semibold text-slate-900 dark:text-white">
                Share listing
              </h3>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="-mr-1.5 grid h-8 w-8 place-items-center rounded-lg text-slate-500 transition-colors hover:bg-neutral-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)] dark:text-zinc-400 dark:hover:bg-white/5 dark:hover:text-white"
              >
                <X className="h-[18px] w-[18px]" />
              </button>
            </div>

            <div className="px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4">
              {/* What's being shared */}
              <div className="flex items-center gap-3">
                <img
                  src={product?.images?.[0]?.url ? ikThumb(product.images[0].url) : FALLBACK_IMAGE}
                  alt=""
                  className="h-12 w-12 shrink-0 rounded-lg object-cover ring-1 ring-black/5 dark:ring-white/10"
                />
                <div className="min-w-0">
                  <p className="truncate text-[14px] font-medium text-slate-900 dark:text-white">{title}</p>
                  <p className="truncate text-[13px] text-slate-500 dark:text-zinc-400">
                    <span className="font-semibold text-slate-900 dark:text-white">{price}</span>
                    {campusName ? <> · {campusName}</> : null}
                  </p>
                </div>
              </div>

              {/* Link + copy (primary action) */}
              <label htmlFor="share-link" className="mt-5 block text-[12.5px] font-medium text-slate-500 dark:text-zinc-400">
                Listing link
              </label>
              <div className="mt-1.5 flex items-center gap-2">
                <input
                  id="share-link"
                  readOnly
                  value={shareUrl}
                  onFocus={(e) => e.target.select()}
                  className="h-10 min-w-0 flex-1 rounded-lg border border-neutral-200 bg-neutral-50 px-3 text-[13px] text-slate-700 outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-ring)] dark:border-neutral-700 dark:bg-white/[0.03] dark:text-zinc-300"
                />
                <button
                  type="button"
                  onClick={copy}
                  className={`inline-flex h-10 shrink-0 items-center gap-1.5 rounded-lg px-3.5 text-[13px] font-medium text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#1A1D20] ${
                    copied ? "bg-emerald-600" : "bg-[var(--accent)] hover:bg-[var(--accent-hover)]"
                  }`}
                  aria-live="polite"
                >
                  {copied ? <Check className="h-4 w-4" strokeWidth={2.5} /> : <Copy className="h-4 w-4" />}
                  {copied ? "Copied" : "Copy link"}
                </button>
              </div>

              {/* Share targets */}
              <p className="mt-5 text-[12.5px] font-medium text-slate-500 dark:text-zinc-400">Share to</p>
              <div className="mt-2.5 flex flex-wrap gap-x-2 gap-y-3">
                {targets.map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={t.onClick}
                    className="group flex w-[64px] flex-col items-center gap-1.5 rounded-xl py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)]"
                  >
                    <span className={`grid h-12 w-12 place-items-center rounded-full transition-transform group-hover:-translate-y-0.5 ${t.tone}`}>
                      {t.icon}
                    </span>
                    <span className="text-[12px] text-slate-600 dark:text-zinc-300">{t.label}</span>
                  </button>
                ))}
              </div>

              <p className="mt-4 border-t border-neutral-200/80 pt-3.5 text-[12px] text-slate-500 dark:border-neutral-800 dark:text-zinc-400">
                {product?.isGirlsOnly
                  ? "Girls-only listing: only girls on this campus can open it."
                  : "Anyone on your campus with this link can view the listing."}
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
