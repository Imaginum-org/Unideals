import { useEffect, useState, useCallback, useRef, useMemo, Suspense, lazy } from "react";
import { Link } from "react-router-dom";
import Category from "../../../features/product/components/Category.jsx";
import ProductCard from "../../../features/product/components/ProductCard.jsx";
import { getBoostedProducts, getProducts } from "../api/productApi";
import { IoIosArrowForward } from "react-icons/io";
import { motion, useReducedMotion } from "framer-motion";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "../../../components/ui/toast.js";
// Celebration (and its canvas-confetti dep) loads only when shown.
// Below-the-fold feature bento: split out of the initial Home chunk.
const LazyPromoBento = lazy(() => import("../components/home/PromoBento.jsx"));

const LazyCelebration = lazy(
  () => import("../../../components/FirstListingCelebration.jsx"),
);
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";
import { CATEGORY_ITEMS } from "../constants/categories";
import { GIRLS_MODE_CATEGORY_ORDER } from "../constants/productOptions.js";
import { FiArrowRight } from "react-icons/fi";
import { useUser } from "../../../context/useUserContext.jsx";
import { ikCard } from "../../../utils/imageTransform.js";
import { productPath } from "../../../utils/productPath.js";
import { useCampus } from "../../../context/CampusContext.jsx";
import { useGirlsMode } from "../../../context/GirlsModeContext.jsx";
import GirlsEntryPill from "../../../components/ui/GirlsEntryPill.jsx";
import { CampusEmptyState } from "../../../components/ui/EmptyStates.jsx";
import BrandLoader from "../../../components/ui/BrandLoader.jsx";
import { loginWithGoogleOneTap } from "../../auth/api/authApi.js";

const HOME_GOOGLE_LOGIN_TRIGGER_KEY = "homeGoogleLoginTriggered";
const GOOGLE_ID_SCRIPT_ID = "google-identity-services-script";

// Home feed is a bounded preview: 8 first, 8 more, then View more.
// Full browsing with infinite scroll lives on /explore.
const HOME_PAGE_SIZE = 8;
const HOME_MAX_PAGES = 2;

// Word-by-word masked rise for the hero headline — cinematic entrance
// fit for a marketplace launch, runs once on mount.
const RevealWords = ({ text, delay = 0, reduceMotion }) => (
  <span aria-label={text}>
    {text.split(" ").map((word, i) => (
      <span
        key={`${word}-${i}`}
        className="inline-block overflow-hidden pb-[0.1em] -mb-[0.1em] align-bottom"
      >
        <motion.span
          className="inline-block will-change-transform"
          initial={reduceMotion ? { opacity: 0 } : { y: "115%", opacity: 0 }}
          animate={{ y: "0%", opacity: 1 }}
          transition={
            reduceMotion
              ? { duration: 0.2, delay }
              : {
                  duration: 0.75,
                  ease: [0.22, 1, 0.36, 1],
                  delay: delay + i * 0.07,
                }
          }
        >
          {word}
          {i < text.split(" ").length - 1 ? " " : ""}
        </motion.span>
      </span>
    ))}
  </span>
);

const Home = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isLoggedIn, loading: userLoading, fetchUserProfile, userDetails } = useUser();
  const { campusSlug } = useCampus();
  const reduceMotion = useReducedMotion();
  // Girls Corner 🌸 tab (?tab=girls). Eligible = female + admin/support only.
  // Male / other / logged-out get zero hint: no tabs, silent reset to "all".
  const [audienceTab, setAudienceTab] = useState(() => new URLSearchParams(location.search).get("tab") === "girls" ? "girls" : "all");
  const viewerGender = userDetails?.gender ?? null;
  const viewerRole = userDetails?.role ?? null;
  const canSeeGirls = isLoggedIn && (viewerGender === "female" || viewerRole === "admin" || viewerRole === "support");
  const { girlsMode, setGirlsMode } = useGirlsMode();

  // Pink mode <=> girls feed stay in sync for eligible viewers.
  useEffect(() => {
    if (!canSeeGirls) return;
    if (girlsMode && audienceTab !== "girls") {
      setAudienceTab("girls");
      setProducts([]); setPage(1); setHasMore(true); hasMoreRef.current = true;
      navigate("/?tab=girls", { replace: true });
    } else if (!girlsMode && audienceTab === "girls") {
      setGirlsMode(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [girlsMode, canSeeGirls]);

  // Ineligible viewers with a hand-crafted ?tab=girls: silently reset, no hint.
  useEffect(() => {
    if (!canSeeGirls && audienceTab === "girls") {
      setAudienceTab("all");
      setProducts([]); setPage(1); setHasMore(true); hasMoreRef.current = true;
      navigate("/", { replace: true });
      if (girlsMode) setGirlsMode(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canSeeGirls, audienceTab]);

  //STATE
  const [products, setProducts] = useState([]);
  const [boostedProducts, setBoostedProducts] = useState([]);
  const [page, setPage] = useState(1);
  const [showCelebration, setShowCelebration] = useState(false);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);

  // Hero: search box + four real listings with photos (boosted first).
  const [heroQuery, setHeroQuery] = useState("");
  const heroPicks = useMemo(() => {
    const seen = new Set();
    const imgOf = (p) => (typeof p?.images?.[0] === "string" ? p.images[0] : p?.images?.[0]?.url);
    return [...boostedProducts, ...products]
      .filter((p) => p?._id && imgOf(p) && !seen.has(p._id) && seen.add(p._id))
      .slice(0, 4)
      .map((p) => ({ _id: p._id, title: p.title, price: p.selling_price, image: ikCard(imgOf(p)), raw: p }));
  }, [boostedProducts, products]);
  const [error, setError] = useState(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const sliderRef = useRef(null);
  const fetchingRef = useRef(false);
  const hasMoreRef = useRef(true);
  // Guards late responses after a campus switch (no mixed-campus lists).
  const fetchCampusRef = useRef(null);
  const canSeeGirlsRef = useRef(canSeeGirls);
  useEffect(() => { canSeeGirlsRef.current = canSeeGirls; }, [canSeeGirls]);

  useEffect(() => {
    hasMoreRef.current = hasMore;
  }, [hasMore]);

  // Single audience-switch path for the Girls edge menu, so pink theme
  // + girls feed stay in sync through one tested flow.
  const handleAudienceTab = (t) => {
    setAudienceTab(t);
    setProducts([]);
    setPage(1);
    setHasMore(true);
    hasMoreRef.current = true;
    navigate(t === "girls" ? "/?tab=girls" : "/", { replace: true });
    if (t === "girls" && !girlsMode) setGirlsMode(true);
    if (t !== "girls" && girlsMode) setGirlsMode(false);
  };

  useEffect(() => {
    if (userLoading || isLoggedIn) return;
    if (!import.meta.env.VITE_GOOGLE_CLIENT_ID) {
      console.warn("VITE_GOOGLE_CLIENT_ID is required for Google One Tap.");
      return;
    }

    if (sessionStorage.getItem(HOME_GOOGLE_LOGIN_TRIGGER_KEY) === "true") {
      return;
    }

    let isActive = true;

    const handleCredentialResponse = async (response) => {
      try {
        await loginWithGoogleOneTap({
          credential: response.credential,
        });
        // Cookie-based session - HttpOnly cookies set by backend

        localStorage.setItem("isAuthenticated", "true");
        await fetchUserProfile({ force: true });
      } catch (err) {
        localStorage.removeItem("isAuthenticated");
        console.error("Google One Tap login failed:", err?.response?.data?.message || err?.message);
      }
    };

    const showOneTap = () => {
      if (!isActive || !window.google?.accounts?.id) return;

      sessionStorage.setItem(HOME_GOOGLE_LOGIN_TRIGGER_KEY, "true");
      window.google.accounts.id.initialize({
        client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
        callback: handleCredentialResponse,
        context: "signin",
        cancel_on_tap_outside: true,
        itp_support: true,
      });
      window.google.accounts.id.prompt();
    };

    const existingScript = document.getElementById(GOOGLE_ID_SCRIPT_ID);

    if (existingScript) {
      showOneTap();
    } else {
      const script = document.createElement("script");
      script.id = GOOGLE_ID_SCRIPT_ID;
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      script.onload = showOneTap;
      document.head.appendChild(script);
    }

    return () => {
      isActive = false;
      window.google?.accounts?.id?.cancel();
    };
  }, [fetchUserProfile, isLoggedIn, userLoading]);

  useEffect(() => {
    const listingCreated = location.state?.listingCreated;
    const isFirstListing = location.state?.isFirstListing;

    if (!listingCreated) return;

    if (isFirstListing) {
      setShowCelebration(true);
    } else {
      toast.success("Listing published successfully");
    }

    navigate(location.pathname, {
      replace: true,
      state: {},
    });
  }, [location, navigate]);

  // Girls Mode ON (eligible viewers) shows the curated girls rail: majors +
  // exclusives, most → least suitable. Everyone else sees only the classic
  // set in classic order — zero hint of the exclusives.
  const showGirlsCategories = audienceTab === "girls" && canSeeGirls;
  const categoryCards = useMemo(() => {
    const list = showGirlsCategories
      ? GIRLS_MODE_CATEGORY_ORDER.map((v) =>
          CATEGORY_ITEMS.find((c) => c.value === v),
        ).filter(Boolean)
      : CATEGORY_ITEMS.filter((category) => !category.girlsOnly);
    return list.map((category) => (
      <div key={category.value} className="flex-shrink-0 snap-start">
        <Category title={category.label} value={category.value} />
      </div>
    ));
  }, [showGirlsCategories]);

  const updateScrollButtons = () => {
    const slider = sliderRef.current;

    if (!slider) return;

    setCanScrollLeft(slider.scrollLeft > 5);

    setCanScrollRight(
      slider.scrollLeft < slider.scrollWidth - slider.clientWidth - 5,
    );
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!sliderRef.current) return;

      // Ignore when typing in inputs/textareas
      const tag = document.activeElement?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;

      if (e.key === "ArrowLeft") {
        scrollLeft();
      }

      if (e.key === "ArrowRight") {
        scrollRight();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  //FETCH — Home shows a bounded preview only: 8 + 8 (2 pages max), then
  // a View more button routes to /explore for the full infinite feed.
  // This keeps the footer reachable no matter how many listings exist.
  const fetchProducts = useCallback(async (pageNumber = 1, isRetry = false) => {
    if (fetchingRef.current) return;
    if (!hasMoreRef.current && !isRetry) return;
    if (!campusSlug) return;
    // Eligibility gate: never fetch girls feed for non-eligible (no leak).
    if (audienceTab === "girls" && !canSeeGirlsRef.current) {
      setInitialLoading(false);
      setLoading(false);
      return;
    }
    if (pageNumber > HOME_MAX_PAGES) {
      setHasMore(false);
      hasMoreRef.current = false;
      return;
    }

    try {
      fetchingRef.current = true;
      fetchCampusRef.current = campusSlug;

      setLoading(true);

      const res = await getProducts({
        page: pageNumber,
        limit: HOME_PAGE_SIZE,
        campus_slug: campusSlug,
        ...(audienceTab === "girls" ? { audience: "girls_only" } : {}),
      });

      // Campus switched mid-flight — drop this stale page entirely.
      if (fetchCampusRef.current !== campusSlug) return;

      const newProducts = res.data?.data || [];
      const pagination = res.data?.pagination || {};

      setProducts((prev) => {
        const existing = new Set(prev.map((p) => p._id));

        const filtered = newProducts.filter((p) => !existing.has(p._id));

        return [...prev, ...filtered];
      });

      setHasMore(
        pageNumber < HOME_MAX_PAGES &&
          (pagination.totalPages ? pageNumber < pagination.totalPages : false),
      );

      setPage(pageNumber);
    } catch {
      setError("Failed to load products");
    } finally {
      fetchingRef.current = false;
      setLoading(false);
      setInitialLoading(false);
    }
  }, [campusSlug, audienceTab]);

  useEffect(() => {
    const slider = sliderRef.current;

    if (!slider) return;

    updateScrollButtons();

    slider.addEventListener("scroll", updateScrollButtons);

    window.addEventListener("resize", updateScrollButtons);

    return () => {
      slider.removeEventListener("scroll", updateScrollButtons);
      window.removeEventListener("resize", updateScrollButtons);
    };
  }, []);

  // Girl Mode swaps the category set: always show the new rail from its
  // first card (the old scroll offset made it open mid-list). "instant"
  // bypasses the rail's CSS smooth-scroll so there's no visible slide.
  useEffect(() => {
    const slider = sliderRef.current;
    if (!slider) return;
    slider.scrollTo({ left: 0, behavior: "instant" });
    updateScrollButtons();
  }, [showGirlsCategories]);

  useEffect(() => {
    fetchProducts(1);
  }, [fetchProducts]);

  // Campus switch starts a clean feed — never append across campuses.
  useEffect(() => {
    setProducts([]);
    setPage(1);
    setHasMore(true);
    hasMoreRef.current = true;
  }, [campusSlug, audienceTab]);

  useEffect(() => {
    const fetchBoostedProducts = async () => {
      if (!campusSlug) return;
      // Girl Mode ON → only girls-only boosted (eligible viewers only).
      if (audienceTab === "girls" && !canSeeGirls) {
        setBoostedProducts([]);
        return;
      }
      try {
        const res = await getBoostedProducts({
          campus_slug: campusSlug,
          ...(audienceTab === "girls" ? { audience: "girls_only" } : {}),
        });
        const items = res.data?.data || [];
        // Client-side guard (server already filters): girls feed shows
        // ONLY girls-only boosted.
        setBoostedProducts(
          audienceTab === "girls" ? items.filter((p) => p.isGirlsOnly === true) : items,
        );
      } catch (err) {
        console.error("Failed to load boosted products", err);
      }
    };

    fetchBoostedProducts();
  }, [campusSlug, audienceTab, canSeeGirls]);

  const scrollLeft = () => {
    sliderRef.current?.scrollBy({
      left: -(sliderRef.current.clientWidth * 0.8),
      behavior: "smooth",
    });
  };

  const scrollRight = () => {
    sliderRef.current?.scrollBy({
      left: sliderRef.current.clientWidth * 0.8,
      behavior: "smooth",
    });
  };

  // AUTO-LOAD PAGE 2 — observer on the last card loads the second (and
  // final) page once. hasMore goes false after page 2, so the feed is
  // bounded and the footer stays reachable. Full browsing is on /explore.
  const observerRef = useRef();

  const lastProductRef = useCallback(
    (node) => {
      if (!hasMore) return;

      if (observerRef.current) observerRef.current.disconnect();

      observerRef.current = new IntersectionObserver(
        (entries) => {
          if (
            entries[0].isIntersecting &&
            !loading &&
            hasMore &&
            !fetchingRef.current
          ) {
            fetchProducts(page + 1);
          }
        },
        {
          rootMargin: "300px",
        },
      );

      if (node) observerRef.current.observe(node);
    },
    [hasMore, page, fetchProducts],
  );

  useEffect(() => {
    return () => observerRef.current?.disconnect();
  }, []);

  return (
    <motion.div className="w-full bg-[#F7F8FA] dark:bg-[#131313] relative">
      <div className="w-full px-5 sm:px-[4.5vw]">
      <div className="flex flex-col w-full max-w-[1380px] mx-auto">
        {/* Girls Corner edge menu — fixed to the right edge, girls + admins only */}
        <GirlsEntryPill tab={audienceTab} onChange={handleAudienceTab} />
        {/* Hero (marketplace pattern): flat brand colour, big confident type,
            search as the primary action, and real listings from this campus
            in a staggered photo grid. No gradients, glows or mock UI. */}
        <section className="brand-surface mx-auto mb-3 mt-3 w-full overflow-hidden rounded-xl text-white sm:mt-4 md:rounded-2xl">
          <div className="grid items-center gap-10 px-6 py-10 sm:px-10 sm:py-12 lg:min-h-[480px] lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:px-14 lg:py-14">
            <div className="font-figtree">
              <h1 className="text-[34px] font-bold leading-[1.02] tracking-[-0.035em] sm:text-[46px] lg:text-[56px]">
                <RevealWords text="Buy and sell" reduceMotion={reduceMotion} />
                <br />
                <RevealWords text="on campus." delay={0.15} reduceMotion={reduceMotion} />
              </h1>
              <motion.p
                initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: 0.3 }}
                className="mt-4 max-w-md text-[15px] leading-relaxed text-white/85 sm:text-[17px]"
              >
                Textbooks, gadgets, cycles and more from verified students near you.
              </motion.p>

              <motion.form
                initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: 0.4 }}
                onSubmit={(e) => {
                  e.preventDefault();
                  const q = heroQuery.trim();
                  navigate(q ? `/search?q=${encodeURIComponent(q)}` : "/explore");
                }}
                className="mt-7 flex max-w-lg items-center gap-2 rounded-2xl bg-white p-1.5 shadow-[0_12px_32px_-12px_rgba(2,6,23,0.45)]"
                role="search"
              >
                <svg viewBox="0 0 20 20" className="ml-3 h-5 w-5 shrink-0 text-slate-400" aria-hidden="true">
                  <circle cx="9" cy="9" r="6" fill="none" stroke="currentColor" strokeWidth="2" />
                  <path d="M13.5 13.5L17 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
                <input
                  type="search"
                  value={heroQuery}
                  onChange={(e) => setHeroQuery(e.target.value)}
                  placeholder="What are you looking for?"
                  aria-label="Search listings"
                  enterKeyHint="search"
                  className="h-11 min-w-0 flex-1 bg-transparent text-[15px] text-slate-900 outline-none placeholder:text-slate-400"
                />
                <button
                  type="submit"
                  className="h-11 shrink-0 rounded-xl bg-slate-900 px-5 text-[14px] font-semibold text-white transition-colors hover:bg-slate-800"
                >
                  Search
                </button>
              </motion.form>

              <p className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-[14px] text-white/80">
                <span>
                  Have something to sell?{" "}
                  <Link to="/upload" className="font-semibold text-white underline decoration-white/40 underline-offset-4 hover:decoration-white">
                    List it free
                  </Link>
                </span>
              </p>
            </div>

            {/* Real listings, staggered photo grid (lg+) */}
            {heroPicks.length >= 4 && (
              <div className="hidden w-full max-w-[400px] grid-cols-2 gap-3 justify-self-end lg:grid" aria-label="Listed on your campus">
                {heroPicks.map((p, i) => (
                  <div key={p._id} className={i % 2 === 1 ? "translate-y-6" : "-translate-y-3"}>
                  <motion.div
                    initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.2 + i * 0.08 }}
                  >
                    <Link
                      to={productPath(p.raw)}
                      className="group relative block aspect-square overflow-hidden rounded-2xl bg-white/10"
                    >
                      <img src={p.image} alt={p.title} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]" />
                      <span className="absolute bottom-2.5 left-2.5 rounded-lg bg-white px-2 py-1 text-[13px] font-bold text-slate-900 shadow-sm">
                        ₹{Number(p.price || 0).toLocaleString("en-IN")}
                      </span>
                    </Link>
                  </motion.div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
        </div>
      </div>

      <div className="w-full min-h-screen bg-[#F7F8FA] flex flex-col items-center px-5 sm:px-[4.5vw] pb-24 lg:pb-0 dark:bg-[#131313]">
        {/* Category section */}
        <div id="categories" className="flex w-full max-w-[1380px] mx-auto flex-col gap-2 lg:gap-4 xl:gap-6 lg:mt-8 mt-4 scroll-mt-20">
          <div>
            <h2 className="font-figtree text-lg font-semibold tracking-tight text-slate-900 md:text-2xl dark:text-white">
              Shop by Category
            </h2>
            {/* Phones get a shorter line so it never wraps. */}
            <p className="mt-0.5 truncate font-figtree text-[13px] text-slate-500 md:text-sm dark:text-zinc-400">
              <span className="sm:hidden">Textbooks, gadgets, cycles &amp; more</span>
              <span className="hidden sm:inline">Textbooks, gadgets, cycles and hostel must-haves, all from your campus.</span>
            </p>
          </div>
          {/* <div
            className="relative flex w-full gap-2 md:gap-4 lg:gap-6 items-center overflow-x-auto no-scrollbar cursor-grab select-none"
          > */}
          <div className="relative w-full">
            {canScrollLeft && (
              <button
                onClick={scrollLeft}
                aria-label="Scroll categories left"
                className="
            hidden
            lg:flex
            absolute
            left-2
            top-1/2
            -translate-y-1/2
            z-20
            h-11
            w-11
            items-center
            justify-center
            rounded-full
            bg-[#F7F8FA]/95
            dark:bg-neutral-900/95
            border
            border-gray-200
            dark:border-neutral-700
            shadow-lg
            backdrop-blur
            transition-all
            duration-300
            hover:scale-105
            hover:shadow-xl
        "
              >
                <FiChevronLeft className="text-xl text-black dark:text-white" />
              </button>
            )}
            <div
              ref={sliderRef}
              className="
              select-none
        flex
        gap-2
        md:gap-3
        lg:gap-4
        overflow-x-auto
        scroll-smooth
        snap-x
        overscroll-x-contain
        no-scrollbar
        py-2
        px-0.5
    "
              aria-label="Browse product categories"
            >
              {categoryCards}
            </div>

            {canScrollRight && (
              <button
                onClick={scrollRight}
                aria-label="Scroll categories right"
                className="
            hidden
            lg:flex
            absolute
            right-2
            top-1/2
            -translate-y-1/2
            z-20
            h-11
            w-11
            items-center
            justify-center
            rounded-full
            bg-[#F7F8FA]/95
            dark:bg-neutral-900/95
            border
            border-gray-200
            dark:border-neutral-700
            shadow-lg
            backdrop-blur
            transition-all
            duration-300
            hover:scale-105
            hover:shadow-xl
        "
              >
                <FiChevronRight className="text-xl text-black dark:text-white" />
              </button>
            )}
            <div
              className="
        hidden
        lg:block
        absolute
        right-0
        top-0
        bottom-0
        w-12
        bg-gradient-to-l
        from-[#F7F8FA]
        dark:from-[#131313]
        to-transparent
        pointer-events-none
        z-10
    "
            />
          </div>
        </div>

        {boostedProducts.length > 0 && (
          <section
            className="mx-auto mt-6 w-full max-w-[1380px] rounded-2xl border border-[var(--accent-soft-strong)] bg-gradient-to-b from-[var(--accent-soft)] via-[var(--accent-soft)] to-transparent p-4 sm:p-5 lg:mt-12 lg:p-6"
            aria-labelledby="deals-heading"
          >
            <div className="flex items-end justify-between gap-3">
              <div className="min-w-0">
                <h2
                  id="deals-heading"
                  className="flex items-center gap-2 font-figtree text-lg font-semibold tracking-tight text-slate-900 md:text-2xl dark:text-white"
                >
                  Limited time deals
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-2 py-0.5 text-[11.5px] font-semibold tracking-normal text-[var(--accent-text)] ring-1 ring-[var(--accent-soft-strong)] dark:bg-white/5">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--accent)]" aria-hidden="true" />
                    {boostedProducts.length} live
                  </span>
                </h2>
                <p className="mt-0.5 truncate font-figtree text-[13px] text-slate-500 md:text-sm dark:text-zinc-400">
                  <span className="sm:hidden">Boosted listings, ending soon</span>
                  <span className="hidden sm:inline">Boosted by sellers on your campus. Gone when the timer runs out.</span>
                </p>
              </div>
              <Link
                to={audienceTab === "girls" ? "/deals?tab=girls" : "/deals"}
                className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 font-figtree text-[13px] font-semibold text-slate-800 transition-colors hover:border-[var(--accent-ring)] hover:text-[var(--accent-text)] dark:border-neutral-700 dark:bg-[#1A1D20] dark:text-zinc-100"
              >
                View all
                <FiArrowRight aria-hidden="true" />
              </Link>
            </div>

            {/* Phones: swipeable rail; md+: same grid as Trending */}
            <div className="no-scrollbar -mx-4 mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-4 px-4 pb-1 sm:-mx-5 sm:scroll-px-5 sm:px-5 md:mx-0 md:grid md:grid-cols-3 md:gap-4 md:overflow-visible md:px-0 lg:grid-cols-4 xl:gap-5">
              {boostedProducts.slice(0, 4).map((product, i) => (
                <div
                  key={product._id}
                  className={`flex w-[min(46vw,220px)] shrink-0 snap-start md:w-auto ${i === 3 ? "md:hidden lg:flex" : ""}`}
                >
                  <ProductCard product={product} showBoostBar boostAccent={i % 2 === 0 ? "purple" : "orange"} />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Products section */}
        <div className="w-full max-w-[1380px] mx-auto lg:mt-12 mt-6 flex flex-col gap-4 lg:mb-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-figtree text-lg font-semibold tracking-tight text-slate-900 md:text-2xl dark:text-white">
                Trending Items
              </h2>
              <p className="mt-0.5 truncate font-figtree text-[13px] text-slate-500 md:text-sm dark:text-zinc-400">
                <span className="sm:hidden">Hot on your campus right now 🔥</span>
                <span className="hidden sm:inline">What students on your campus are checking out right now 🔥</span>
              </p>
            </div>
          </div>

          <div
            className="
      mt-2
      grid
      w-full
      grid-cols-2
      md:grid-cols-3
      lg:grid-cols-4
      2xl:grid-cols-4
      gap-2
      sm:gap-3
      md:gap-4
      lg:gap-4
      xl:gap-5
    "
          >
            {/* EMPTY STATE */}
            {!initialLoading && !loading && products.length === 0 && !error && (
              <div className="col-span-full py-4">
                <CampusEmptyState />
              </div>
            )}
            {products.map((product, index) => {
              const isLast = products.length === index + 1;
              return (
                <ProductCard
                  key={product._id}
                  product={product}
                  ref={isLast ? lastProductRef : null}
                />
              );
            })}

            {error && (
              <div className="col-span-full flex w-full flex-col items-center gap-3 py-6 text-center">
                <p className="w-full text-center text-red-500">{error}</p>
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    hasMoreRef.current = true;
                    setHasMore(true);
                    fetchProducts(products.length === 0 ? 1 : page + 1, true);
                  }}
                  className="rounded-lg bg-[#394FF1] px-5 py-2.5 text-sm font-bold text-white"
                >
                  Retry
                </button>
              </div>
            )}
          </div>

          {loading && (
            <div className="mt-8 flex w-full justify-center">
              <BrandLoader size="sm" label="Loading more products" />
            </div>
          )}

          {/* End-of-feed footer. Symmetric spacing: the same gap above it as
              the bento section keeps below it (mt-10 / lg:mt-14 each). */}
          {!initialLoading && !loading && !hasMore && products.length > 0 && (
            <div className="mt-10 flex w-full flex-col items-center gap-4 lg:mt-14">
              <p className="text-[13px] font-medium text-slate-400 dark:text-zinc-500">
                You&apos;re all caught up on the latest drops ✨
              </p>
              <div className="flex w-full max-w-xl items-center gap-4">
                <span aria-hidden="true" className="h-px flex-1 bg-gradient-to-r from-transparent to-neutral-200 dark:to-neutral-800" />
                <button
                  type="button"
                  onClick={() => navigate("/explore")}
                  className="es-secondary group inline-flex h-11 shrink-0 items-center gap-2 rounded-lg border border-neutral-200 bg-white pl-5 pr-4 text-sm font-semibold text-slate-800 shadow-[0_1px_2px_rgba(15,23,42,0.06)] transition-all duration-200 hover:-translate-y-px hover:border-[#3838EC]/40 hover:text-[#3838EC] hover:shadow-[0_8px_20px_-10px_rgba(56,56,236,0.45)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3838EC]/40 focus-visible:ring-offset-2 dark:border-neutral-700 dark:bg-[#1A1D20] dark:text-zinc-100 dark:hover:border-[#6D6DF5] dark:hover:text-white dark:focus-visible:ring-offset-[#131313]"
                >
                  View more products
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-[#3838EC]/10 text-[#3838EC] transition-transform duration-200 group-hover:translate-x-0.5 dark:bg-white/10 dark:text-white">
                    <IoIosArrowForward className="size-3.5" />
                  </span>
                </button>
                <span aria-hidden="true" className="h-px flex-1 bg-gradient-to-l from-transparent to-neutral-200 dark:to-neutral-800" />
              </div>
            </div>
          )}
        </div>

        {/* Feature bento — below the product feed */}
        <div className="w-full max-w-[1380px] mx-auto mt-10 lg:mt-14 mb-10 lg:mb-14">
          <Suspense fallback={<div className="min-h-[40vh]" aria-hidden="true" />}>
            <LazyPromoBento />
          </Suspense>
        </div>
      </div>

      {/* Mobile Sell lives in the bottom tab bar (MobileTabBar). */}

      {showCelebration && (
        <Suspense fallback={null}>
          <LazyCelebration onClose={() => setShowCelebration(false)} />
        </Suspense>
      )}
    </motion.div>
  );
};

export default Home;
