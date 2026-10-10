import { useEffect, useState, useCallback, useRef, useMemo, Suspense, lazy } from "react";
import { Link } from "react-router-dom";
import Category from "../../../features/product/components/Category.jsx";
import ProductCard from "../../../features/product/components/ProductCard.jsx";
import { getBoostedProducts, getProducts } from "../api/productApi";
import { FaPlus } from "react-icons/fa6";
import { IoIosArrowForward } from "react-icons/io";
import { motion, useReducedMotion } from "framer-motion";
import { useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
// Celebration (and its canvas-confetti dep) loads only when shown.
const LazyCelebration = lazy(
  () => import("../../../components/FirstListingCelebration.jsx"),
);
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";
import { CATEGORY_ITEMS } from "../constants/categories";
import { FiArrowRight } from "react-icons/fi";
import { useUser } from "../../../context/useUserContext.jsx";
import { useCampus } from "../../../context/CampusContext.jsx";
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
  const { isLoggedIn, loading: userLoading, fetchUserProfile } = useUser();
  const { campusSlug } = useCampus();
  const reduceMotion = useReducedMotion();

  //STATE
  const [products, setProducts] = useState([]);
  const [boostedProducts, setBoostedProducts] = useState([]);
  const [page, setPage] = useState(1);
  const [showCelebration, setShowCelebration] = useState(false);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const sliderRef = useRef(null);
  const fetchingRef = useRef(false);
  const hasMoreRef = useRef(true);
  // Guards late responses after a campus switch (no mixed-campus lists).
  const fetchCampusRef = useRef(null);

  useEffect(() => {
    hasMoreRef.current = hasMore;
  }, [hasMore]);

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
        await fetchUserProfile();
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

  const categoryCards = useMemo(
    () =>
      CATEGORY_ITEMS.map((category) => (
        <div key={category.value} className="flex-shrink-0 snap-start">
          <Category title={category.label} value={category.value} />
        </div>
      )),
    [],
  );

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
  }, [campusSlug]);

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

  useEffect(() => {
    fetchProducts(1);
  }, [fetchProducts]);

  // Campus switch starts a clean feed — never append across campuses.
  useEffect(() => {
    setProducts([]);
    setPage(1);
    setHasMore(true);
    hasMoreRef.current = true;
  }, [campusSlug]);

  useEffect(() => {
    const fetchBoostedProducts = async () => {
      if (!campusSlug) return;
      try {
        const res = await getBoostedProducts({ campus_slug: campusSlug });
        setBoostedProducts(res.data?.data || []);
      } catch (err) {
        console.error("Failed to load boosted products", err);
      }
    };

    fetchBoostedProducts();
  }, [campusSlug]);

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
      <div className="w-full pl-[4.5vw] pr-[4.5vw]">
      <div className="flex flex-col w-full max-w-[1380px] mx-auto">
        {/* Blue banner code */}
        <motion.div
          className="relative w-full mx-auto mt-4 mb-3
    flex
    rounded-lg md:rounded-xl
    min-h-[22vh]
    sm:min-h-[35vh]
    md:min-h-[25vh]
    lg:min-h-[22vh]
    xl:h-[46vh]
    2xl:min-h-[40vh]
    shadow-[0_8px_20px_rgba(0,0,0,0.15)]
    overflow-hidden
    bg-cover
    bg-center
    bg-no-repeat"
          style={{
            backgroundImage: "url('/banner_bg.webp')",
          }}
        >
          {/* Black Overlay for text */}
          {/* <div className="absolute inset-0 bg-gradient-to-r from-black/40 to-black/10 z-0" /> */}

          {/* Left Image */}
          <div
            className="absolute left-6 lg:left-12 xl:left-20 top-72 -translate-y-1/2
   w-24 md:w-36 lg:w-44 xl:w-80
   z-10 pointer-events-none -scale-x-100 -rotate-12"
          >
            <motion.img
              src="/fan.webp"
              alt="Left Decoration"
              className="w-full h-auto block"
              animate={{ y: [0, -14, 0] }}
              transition={{
                duration: 4,
                ease: "easeInOut",
                repeat: Infinity,
                repeatType: "loop",
              }}
            />
          </div>

          {/* Right Image */}
          <div
            className="absolute right-6 lg:right-12 xl:right-20 top-72 -translate-y-1/2
   w-24 md:w-36 lg:w-44 xl:w-96
   z-10 pointer-events-none -rotate-12"
          >
            <motion.img
              src="/bag_banner.webp"
              alt="Right Decoration"
              className="w-full h-auto block"
              animate={{ y: [0, -16, 0] }}
              transition={{
                duration: 4.6,
                ease: "easeInOut",
                repeat: Infinity,
                repeatType: "loop",
                delay: 0.6,
              }}
            />
          </div>

          <div className="relative z-10 flex h-full w-full items-center justify-center px-5">
            {/* Left Content */}
            <div className="text-white max-w-4xl text-center flex flex-col items-center font-figtree">
              <h1 className="hidden md:block lg:text-[2.5vw] xl:text-4xl md:text-[2.7vw] text-[0.85rem] font-extrabold leading-tight font-figtree tracking-wider">
                <RevealWords
                  text="Unlock Deals, Share Essentials,"
                  reduceMotion={reduceMotion}
                />{" "}
                <br className="hidden md:block" />
                <RevealWords
                  text="Simplify Campus Living!"
                  delay={0.28}
                  reduceMotion={reduceMotion}
                />
              </h1>
              <h1 className="md:hidden lg:text-[2.5vw] xl:text-[2.2vw] md:text-[2.7vw] text-[0.85rem] font-extrabold leading-tight font-figtree">
                <RevealWords
                  text="Unlock Deals, Essentials,"
                  reduceMotion={reduceMotion}
                />{" "}
                <br className="hidden md:block" />
                <RevealWords
                  text="Simplify Campus Living!"
                  delay={0.21}
                  reduceMotion={reduceMotion}
                />
              </h1>

              <motion.p
                initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={
                  reduceMotion
                    ? { duration: 0.2, delay: 0.3 }
                    : { duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.55 }
                }
                className="hidden text-center md:block lg:text-[1.7vw] tracking-wide xl:text-lg md:text-[2vw] text-[0.7rem] lg:leading-7 md:leading-5  text-gray-200 font-medium mt-4 font-figtree"
              >
                Your trusted platform to simplify student life
                <br className="hidden sm:block" /> Buy, sell and connect easily!
              </motion.p>
              <motion.span
                initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 18, scale: 0.94 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={
                  reduceMotion
                    ? { duration: 0.2, delay: 0.4 }
                    : {
                        type: "spring",
                        stiffness: 260,
                        damping: 22,
                        delay: 0.75,
                      }
                }
                className="inline-flex lg:mt-4 xl:mt-8 md:mt-4 mt-3"
              >
              <Link
                to="/upload"
                className="bg-white text-[#2D3339] font-bold rounded-md md:py-2 xl:py-2 lg:py-[0.5vh] xl:px-7 lg:px-7 xl:text-lg lg:text-lg md:text-base text-xs shadow-md py-[0.7vh] px-4 font-figtree duration-500 ease-in-out flex items-center justify-center gap-2"
              >
                <span>Sell Now</span>
                <FiArrowRight />
              </Link>
              </motion.span>
            </div>
          </div>
        </motion.div>
        </div>
      </div>

      <div className="w-full min-h-screen bg-[#F7F8FA] flex flex-col items-center pl-[4.5vw] pr-[4.5vw] pb-24 lg:pb-0 dark:bg-[#131313]">
        {/* Category section */}
        <div id="categories" className="flex w-full max-w-[1380px] mx-auto flex-col gap-2 lg:gap-4 xl:gap-6 lg:mt-8 mt-4 scroll-mt-20">
          <div>
            <h2 className="font-semibold text-black dark:text-white text-lg md:text-2xl font-figtree">
              Shop by Category
            </h2>
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
        gap-3
        md:gap-5
        lg:gap-6
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
          <div className="w-full max-w-[1380px] mx-auto mt-6 lg:mt-12 overflow-hidden rounded-2xl bg-[#2E4BFF]">
            <h2 className="px-4 md:px-6 pt-2.5 md:pt-3 text-white font-bold text-lg md:text-xl font-figtree">
              Limited Time Deals
            </h2>

            <div className="mt-2.5 md:mt-3 rounded-t-2xl bg-white p-3 md:p-4 dark:bg-[#18181B]">
            <div
              className="
    grid
    w-full
    grid-cols-2
    lg:grid-cols-4
    gap-2
    sm:gap-3
    md:gap-4
    lg:gap-4
    xl:gap-5
  "
            >
              {boostedProducts.slice(0, 4).map((product, i) => (
                <ProductCard
                  key={product._id}
                  product={product}
                  showBoostBar
                  boostAccent={i % 2 === 0 ? "purple" : "orange"}
                />
              ))}
            </div>
            </div>
          </div>
        )}

        {/* Products section */}
        <div className="w-full max-w-[1380px] mx-auto lg:mt-12 mt-6 flex flex-col gap-4 lg:mb-6">
          <h1 className="font-semibold text-[#000000] font-figtree dark:text-white lg:text-[2vw] xl:text-2xl md:text-[2.1vw] text-sm">
            Trending Items
          </h1>

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
              <div className="col-span-full flex w-full flex-col items-center gap-3 py-10 text-center">
                <p className="text-gray-500 dark:text-gray-400">
                  No products listed yet on this campus.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <Link
                    to="/upload"
                    className="rounded-xl bg-[#394FF1] px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-500/30 transition hover:bg-[#2f3fd6]"
                  >
                    List a product
                  </Link>
                  <a
                    href="#categories"
                    className="rounded-xl border border-zinc-200 px-5 py-2.5 text-sm font-bold text-zinc-600 transition hover:border-[#394FF1] hover:text-[#394FF1] dark:border-zinc-700 dark:text-zinc-300"
                  >
                    Browse categories
                  </a>
                </div>
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
                  className="rounded-xl bg-[#394FF1] px-5 py-2.5 text-sm font-bold text-white"
                >
                  Retry
                </button>
              </div>
            )}
          </div>

          {loading && (
            <p
              role="status"
              aria-live="polite"
              className="w-full text-center mt-4 text-gray-500"
            >
              Loading more products...
            </p>
          )}

          {!initialLoading && !loading && !hasMore && products.length > 0 && (
            <div className="flex w-full justify-center mt-4 pb-6">
              <button
                type="button"
                onClick={() => navigate("/explore")}
                className="flex items-center gap-2 rounded-lg bg-[#3838EC] px-4 lg:px-5 py-2 text-base font-medium text-[#FCFCFC] transition-all duration-200 hover:scale-[1.02]"
              >
                <span>View more products</span>
                <IoIosArrowForward className="size-3" />
              </button>
            </div>
          )}
        </div>

        {/* Boost banner — sits below Trending (after View more) */}
        <div className="w-full max-w-[1380px] mx-auto mt-3 lg:mt-6 mb-8 lg:mb-12">
        <motion.div className="pt-3 pb-3 md:pb-5 md:pt-5 lg:pb-5 lg:pt-5 pr-[2vw] lg:pr-0 rounded-md md:rounded-xl text-white flex items-center justify-between relative overflow-hidden shadow-[14.361501693725586px_10.258214950561523px_30px_0px_rgba(0,0,0,0.06)] dark:bg-[#1A1D20]">
          {/* Background Image */}
          <img
            src="/assets/Group_114.png"
            alt="background"
            className="absolute bottom-9 right-[-14vw] lg:right-[-7vw] z-0 w-[46vw] md:w-[38vw] lg:w-[32vw] xl:w-[24vw] h-auto md:bottom-11 lg:bottom-14 md:right-[-14vw]"
          />

          {/* White Banner Container */}
          <motion.div className="w-full h-full text-black rounded-lg flex md:leading-tight leading-snug">
            {/* Left Text Section */}
            <div className="flex flex-col lg:pl-14 pl-6 w-3/4 justify-center md:pl-10">
              <motion.h1 className="font-extrabold text-[clamp(0.65rem,1.3vw,1.4rem)] md:text-[1rem] lg:text-[1.1rem] text-black font-figtree dark:text-[#B2B2B2] tracking-tight xl:tracking-normal xl:text-[1.3rem]">
                Sell Faster on Unideals
              </motion.h1>
              <motion.h1 className="text-[#364EF2] font-extrabold md:font-bold md:text-[1.2rem] lg:text-[1.3rem] tracking-tight text-[0.7rem] font-figtree lg:mt-1 dark:text-white uppercase xl:text-[1.5rem]">
                Make Your Listing Stand Out
              </motion.h1>
              <motion.h3 className="hidden md:block text-[clamp(0.85rem,1.4vw,1.2rem)] lg:text-[1rem] text-black tracking-tight font-medium font-figtree dark:text-[#C9C9C9] xl:text-[1.2rem]">
                Increase exposure and connect with interested buyers faster.
              </motion.h3>
              <motion.h3 className="md:hidden text-[clamp(0.55rem,1.4vw,1.2rem)] text-black font-medium font-figtree dark:text-[#C9C9C9]">
                Reach more interested buyers and sell faster
              </motion.h3>
            </div>

            {/* Right Price Section */}
            <div className="flex items-end w-1/3 lg:gap-3 xl:gap-3 gap-2 justify-end lg:pr-12 pr-2 pt-3 md:pt-4">
              <motion.div className="text-right flex flex-col">
                <h1 className="text-black/85 lg:text-[1rem] xl:text-[1.1rem] text-[0.5rem] font-medium font-figtree md:text-sm dark:text-[#CBCBCB]">
                  Boost my
                </h1>
                <span className="lg:text-[1.4rem] md:text-[1.3rem] xl:text-2xl font-semibold text-[0.75rem] text-black font-figtree md:text-2xl mt-[-0.4vh] xl:text-[1.5rem] lg:mt-[-0.3vh] dark:text-white">
                  Product
                </span>
              </motion.div>

              {/* Arrow Button */}
              <motion.div>
                <Link
                  to={"/price"}
                  className="rounded-full bg-[#394FF1] lg:p-[0.5vw] xl:p-[0.4vw] md:p-[0.6rem] text-white lg:text-2xl flex justify-center items-center z-20 hover:scale-110 transition-transform p-[0.2rem] mb-[0.2vh] lg:mb-0 md:mb-[0.3vh] text-sm dark:bg-[#394FF1] dark:text-white"
                >
                  <IoIosArrowForward />
                </Link>
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
        </div>
      </div>

      {/* Mobile Floating Sell Button */}
      <Link
        to="/upload"
        aria-label="Sell Product"
        className="
          sm:hidden
          fixed
          left-1/2
          -translate-x-1/2
          bottom-[max(1rem,env(safe-area-inset-bottom))]
          z-50
          flex
          items-center
          gap-2 rounded-lg bg-[#3838EC]
          px-5
          py-3
          text-base
          font-semibold
          text-white
          shadow-[0_8px_30px_rgba(0,0,0,0.18)]
          transition-all
          duration-200
          active:scale-95
        "
      >
        <span>Sell</span>
        <FaPlus className="size-3" />
      </Link>

      {showCelebration && (
        <Suspense fallback={null}>
          <LazyCelebration onClose={() => setShowCelebration(false)} />
        </Suspense>
      )}
    </motion.div>
  );
};

export default Home;
