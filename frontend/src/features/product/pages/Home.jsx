import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { Link } from "react-router-dom";
import Category from "../../../features/product/components/Category.jsx";
import ProductCard from "../../../features/product/components/ProductCard.jsx";
import { getBoostedProducts, getProducts } from "../api/productApi";
import { FaPlus } from "react-icons/fa6";
import { IoIosArrowForward } from "react-icons/io";
import { motion } from "framer-motion";
import { useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import FirstListingCelebration from "../../../Components/FirstListingCelebration.jsx";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";
import { CATEGORY_ITEMS } from "../constants/categories";
import { FiArrowRight } from "react-icons/fi";

const Home = () => {
  const location = useLocation();
  const navigate = useNavigate();

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

  useEffect(() => {
    hasMoreRef.current = hasMore;
  }, [hasMore]);

  useEffect(() => {
    const listingCreated = location.state?.listingCreated;
    const isFirstListing = location.state?.isFirstListing;

    if (!listingCreated) return;

    if (isFirstListing) {
      setShowCelebration(true);
    } else {
      toast.success("🎉 Listing published successfully");
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
          <Category title={category.label} imageSrc={category.icon} />
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

  //FETCH
  const fetchProducts = useCallback(async (pageNumber = 1) => {
    if (fetchingRef.current) return;
    if (!hasMoreRef.current) return;

    try {
      fetchingRef.current = true;

      setLoading(true);

      const res = await getProducts({
        page: pageNumber,
        limit: 10,
      });

      const newProducts = res.data?.data || [];
      const pagination = res.data?.pagination || {};

      setProducts((prev) => {
        const existing = new Set(prev.map((p) => p._id));

        const filtered = newProducts.filter((p) => !existing.has(p._id));

        return [...prev, ...filtered];
      });

      setHasMore(
        pagination.totalPages ? pageNumber < pagination.totalPages : false,
      );

      setPage(pageNumber);
    } catch (err) {
      setError("Failed to load products");
      console.log(err);
    } finally {
      fetchingRef.current = false;
      setLoading(false);
      setInitialLoading(false);
    }
  }, []);

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

  useEffect(() => {
    const fetchBoostedProducts = async () => {
      try {
        const res = await getBoostedProducts();
        setBoostedProducts(res.data?.data || []);
      } catch (err) {
        console.error("Failed to load boosted products", err);
      }
    };

    fetchBoostedProducts();
  }, []);

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

  // INFINITE SCROLL
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

  return (
    <motion.div className="w-full bg-white dark:bg-[#131313] relative">
      <div className="flex flex-col">
        {/* Blue banner code */}
        <motion.div
          className="relative w-[91vw] mx-auto mt-4 mb-3
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

          {/* <img
            width={170}
            src="\assets\circle.png"
            alt="image"
            className="absolute bottom-0 xl:left-72 lg:left-48 md:left-40 md:bottom-[-1.3vh] lg:bottom-0 hidden md:block "
          /> */}

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
                Unlock Deals, Share Essentials,{" "}
                <br className="hidden md:block" />
                Simplify Campus Living!
              </h1>
              <h1 className="md:hidden lg:text-[2.5vw] xl:text-[2.2vw] md:text-[2.7vw] text-[0.85rem] font-extrabold leading-tight font-figtree">
                Unlock Deals, Essentials, <br className="hidden md:block" />
                Simplify Campus Living!
              </h1>

              <p className="hidden text-center md:block lg:text-[1.7vw] tracking-wide xl:text-lg md:text-[2vw] text-[0.7rem] lg:leading-7 md:leading-5  text-gray-200 font-medium mt-4 font-figtree">
                Your trusted platform to simplify student life
                <br className="hidden sm:block" /> Buy, sell and connect easily!
              </p>
              <Link
                to="/upload"
                className="bg-white text-[#2D3339] font-bold rounded-md md:py-2 xl:py-2 lg:py-[0.5vh] xl:px-7 lg:px-7 xl:text-lg lg:text-lg md:text-base text-xs lg:mt-4 xl:mt-8 md:mt-4 mt-3 shadow-md py-[0.7vh] px-4 font-figtree duration-500 ease-in-out flex items-center justify-center gap-2"
              >
                <span>Sell Now</span>
                <FiArrowRight />
              </Link>
            </div>
          </div>
        </motion.div>

        {/* White banner*/}
        <motion.div className="pt-3 pb-3 md:pb-5 md:pt-5 lg:pb-5 lg:pt-5 pr-[2vw] lg:pr-0 ml-[4vw] lg:ml-[4.5vw] lg:mr-[4.5vw] mr-[4vw] rounded-md md:rounded-xl text-white flex items-center justify-between relative overflow-hidden shadow-[14.361501693725586px_10.258214950561523px_30px_0px_rgba(0,0,0,0.06)] dark:bg-[#1A1D20]">
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

      <div className="w-full min-h-screen bg-white flex flex-col items-center pl-[4.5vw] pr-[4.5vw] pb-24 lg:pb-0 dark:bg-[#131313]">
        {/* Category section */}
        <div className="flex w-full max-w-[1380px] mx-auto flex-col gap-2 lg:gap-4 xl:gap-6 lg:mt-12 mt-5">
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
            bg-white/95
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
        snap-mandatory
        overscroll-x-contain
        no-scrollbar
        py-2
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
            bg-white/95
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
        from-white
        dark:from-[#131313]
        to-transparent
        pointer-events-none
        z-10
    "
            />
          </div>
        </div>

        {boostedProducts.length > 0 && (
          <div className="w-full max-w-[1380px] mx-auto lg:mt-12 mt-6 rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 via-white to-amber-50/70 px-3 py-4 md:px-5 md:py-6 dark:border-indigo-900/50 dark:from-indigo-950/25 dark:via-[#18181B] dark:to-amber-950/10">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] md:text-xs font-semibold uppercase tracking-wide text-[#394FF1] dark:text-blue-400">
                  Featured
                </p>
                <h1 className="font-semibold xl:font-medium font-figtree md:tracking-wide dark:text-white lg:text-[2vw] xl:text-[1.7vw] md:text-[2.1vw] text-sm">
                  Boosted Products
                </h1>
              </div>

              <Link
                to="/category/boosted-products"
                className="inline-flex shrink-0 items-center gap-1 rounded-full border border-[#394FF1]/20 bg-white px-3 py-2 text-[11px] font-semibold text-[#394FF1] shadow-sm transition hover:border-[#394FF1]/40 hover:bg-indigo-50 md:text-sm dark:bg-zinc-900 dark:text-blue-300 dark:hover:bg-zinc-800"
              >
                View all
                <IoIosArrowForward className="text-sm" />
              </Link>
            </div>

            <div
              className="
    mt-4
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
              {boostedProducts.map((product) => (
                <ProductCard key={product._id} product={product} />
              ))}
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
            {!initialLoading && products.length === 0 && (
              <div className="w-full text-center mt-10 text-gray-500">
                No products listed yet
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
              <p className="w-full text-center text-red-500 mt-4">{error}</p>
            )}
          </div>

          {loading && (
            <p className="w-full text-center mt-4 text-gray-500">
              Loading more products...
            </p>
          )}

          {!hasMore && products.length > 0 && (
            <p className="w-full text-center mt-4 text-gray-400">
              {/* No more products */}
            </p>
          )}
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
        <FirstListingCelebration onClose={() => setShowCelebration(false)} />
      )}
    </motion.div>
  );
};

export default Home;
