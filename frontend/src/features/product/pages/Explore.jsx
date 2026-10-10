import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import PriceRangeSlider from "../../../components/ui/PriceRangeSlider.jsx";
import { useSearchParams } from "react-router-dom";
import { PRODUCT_CONDITION_OPTIONS } from "../constants/productOptions.js";
import ProductCard from "../../../features/product/components/ProductCard.jsx";
import BrandLoader from "../../../components/ui/BrandLoader.jsx";
import { getProducts } from "../api/productApi";
import { FaFilter, FaTimes } from "react-icons/fa";
import { Link } from "react-router-dom";
import { useCampus } from "../../../context/CampusContext.jsx";

const EXPLORE_PAGE_SIZE = 10;

const ExplorePage = () => {
  const { campusSlug } = useCampus();
  const [searchParams, setSearchParams] = useSearchParams();

  // Filters live in the URL (shareable, back/forward-safe) — local state is
  // only the live slider thumb position while dragging.
  const rawCondition = searchParams.get("condition") || "";
  const rawSort = searchParams.get("sort") || "recommended";
  const rawMin = searchParams.get("min") || "";
  const rawMax = searchParams.get("max") || "";

  const validConditions = useMemo(
    () => new Set(PRODUCT_CONDITION_OPTIONS.map((c) => c.value)),
    [],
  );
  const validSorts = useMemo(
    () => new Set(["recommended", "latest", "price_low", "price_high"]),
    [],
  );
  const selectedCondition = validConditions.has(rawCondition) ? rawCondition : "";
  const sortBy = validSorts.has(rawSort) ? rawSort : "recommended";

  // Numeric price validation: >= 0, min <= max. Invalid → inline error, no fetch.
  const parsedMin = rawMin === "" ? null : Number(rawMin);
  const parsedMax = rawMax === "" ? null : Number(rawMax);
  const priceInvalid =
    (rawMin !== "" && (!Number.isFinite(parsedMin) || parsedMin < 0)) ||
    (rawMax !== "" && (!Number.isFinite(parsedMax) || parsedMax < 0)) ||
    (parsedMin != null && parsedMax != null && parsedMin > parsedMax);
  const minPrice = priceInvalid ? "" : rawMin;
  const maxPrice = priceInvalid ? "" : rawMax;

  const [open, setOpen] = useState(false);

  const [products, setProducts] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [filterMeta, setFilterMeta] = useState({ price: { min: 0, max: 0 } });
  const [error, setError] = useState(null);
  const [retryKey, setRetryKey] = useState(0);

  const [sliderValue, setSliderValue] = useState([0, 0]);

  // Guards: stop in-flight paging work on unmount / filter change.
  const fetchingRef = useRef(false);
  const observerRef = useRef(null);

  const SORT_OPTIONS = [
    { value: "recommended", label: "Recommended" },
    { value: "latest", label: "Latest" },
    { value: "price_low", label: "Price: Low to High" },
    { value: "price_high", label: "Price: High to Low" },
  ];

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, []);

  // Filter/campus change starts a clean feed — never append across scopes.
  // Paging state resets here; the fetch effect below picks up page 1.
  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect();
    setPage(1);
    setProducts([]);
    setPagination(null);
    setError(null);
  }, [selectedCondition, sortBy, minPrice, maxPrice, campusSlug]);

  useEffect(() => {
    return () => {
      if (observerRef.current) observerRef.current.disconnect();
    };
  }, []);

  // FETCH — server filters + server pagination (limit 10). Page 1 replaces,
  // later pages append with _id dedup. Cancelled responses are dropped so a
  // slow page can never overwrite a newer filter/campus scope.
  useEffect(() => {
    let cancelled = false;
    const fetchExploreProducts = async () => {
      if (!campusSlug || priceInvalid) return;
      if (fetchingRef.current) return;
      const isPaging = page > 1;
      try {
        fetchingRef.current = true;
        if (isPaging) setLoadingMore(true);
        else setLoading(true);
        setError(null);

        const params = {
          sort: sortBy,
          page,
          limit: EXPLORE_PAGE_SIZE,
          campus_slug: campusSlug,
        };
        if (selectedCondition) params.condition = selectedCondition;
        if (minPrice !== "") params.min_price = minPrice;
        if (maxPrice !== "") params.max_price = maxPrice;

        const res = await getProducts(params);
        if (cancelled) return;
        const items = res.data?.data || [];
        setProducts((prev) => {
          if (!isPaging) return items;
          const seen = new Set(prev.map((p) => p._id));
          return [...prev, ...items.filter((p) => !seen.has(p._id))];
        });
        setPagination(res.data?.pagination || null);
        let meta = res.data?.filterMeta || { price: { min: 0, max: 0 } };
        // Degenerate slider (min == max) can never move — widen it.
        if (meta.price.max <= meta.price.min) {
          meta = {
            ...meta,
            price: { min: meta.price.min, max: meta.price.min + 1000 },
          };
        }
        setFilterMeta(meta);
        if (minPrice === "" && maxPrice === "") {
          setSliderValue([meta.price.min, meta.price.max]);
        }
      } catch {
        if (!cancelled) setError("Failed to load products");
      } finally {
        fetchingRef.current = false;
        if (!cancelled) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    };

    fetchExploreProducts();
    return () => {
      cancelled = true;
    };
  }, [
    selectedCondition,
    sortBy,
    minPrice,
    maxPrice,
    campusSlug,
    page,
    retryKey,
    priceInvalid,
  ]);

  const hasMore =
    pagination != null && pagination.totalPages > pagination.page;

  // INFINITE SCROLL — observer on the last card auto-pages (10 at a time).
  // Bounded by hasMore; fetchingRef prevents double-fire. setPage uses the
  // closure value (not functional form) so rapid re-fires collapse to a
  // single increment and a page can never be skipped. _id dedup on append
  // additionally guards against overlap duplicates.
  const lastProductRef = useCallback(
    (node) => {
      if (observerRef.current) observerRef.current.disconnect();
      if (!node || !hasMore) return;
      observerRef.current = new IntersectionObserver(
        (entries) => {
          if (
            entries[0].isIntersecting &&
            !fetchingRef.current
          ) {
            setPage(page + 1);
          }
        },
        { rootMargin: "320px" },
      );
      observerRef.current.observe(node);
    },
    [hasMore, page],
  );

  //HANDLERS — write-through to the URL (replace, no history spam).
  const updateParams = useCallback(
    (updates) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          for (const [key, value] of Object.entries(updates)) {
            if (value === "" || value === null || value === undefined) {
              next.delete(key);
            } else {
              next.set(key, String(value));
            }
          }
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  // Slider commits once on release (no request flood while dragging).
  const commitPriceRange = useCallback(
    (value) => {
      const [lo, hi] = value;
      const { min, max } = filterMeta.price;
      updateParams({
        min: lo <= min ? "" : lo,
        max: hi >= max ? "" : hi,
      });
    },
    [filterMeta.price, updateParams],
  );

  const hasActiveFilters =
    selectedCondition !== "" ||
    sortBy !== "recommended" ||
    minPrice !== "" ||
    maxPrice !== "";

  const handleClear = () => {
    setSearchParams({}, { replace: true });
    setSliderValue([filterMeta.price.min, filterMeta.price.max]);
    setOpen(false);
  };

  const SidebarContent = () => (
    <div className="flex flex-col gap-5 font-figtree">
      <div>
        <h4 className="font-bold mb-6 text-zinc-900 dark:text-white text-sm">Price Range</h4>
        <div className="px-2">
          <PriceRangeSlider
            min={filterMeta.price.min}
            max={filterMeta.price.max}
            value={sliderValue}
            onChange={setSliderValue}
            onAfterChange={commitPriceRange}
            minDistance={50}
          />
        </div>
        <div className="flex justify-between mt-4 text-[10px] text-zinc-400 font-bold uppercase">
          <div className="flex flex-col">
            <span>Min</span>
            <span className="text-zinc-800 dark:text-zinc-200">
              ₹{sliderValue[0].toLocaleString("en-IN")}
            </span>
          </div>
          <div className="flex flex-col items-end">
            <span>Max</span>
            <span className="text-zinc-800 dark:text-zinc-200">
              {sliderValue[1] >= filterMeta.price.max
                ? "₹" + filterMeta.price.max.toLocaleString("en-IN") + "+"
                : "₹" + sliderValue[1].toLocaleString("en-IN")}
            </span>
          </div>
        </div>
      </div>

      <div>
        <h4 className="font-bold mb-3 text-zinc-900 dark:text-white text-sm">Condition</h4>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => updateParams({ condition: "" })}
            className={`px-4 py-2 rounded-lg border text-xs font-semibold transition-all ${
              selectedCondition === ""
                ? "border-[#394FF1] bg-blue-50 text-[#394FF1] dark:bg-blue-900/20"
                : "border-zinc-200 dark:border-zinc-700 text-zinc-500"
            }`}
          >
            All
          </button>

          {PRODUCT_CONDITION_OPTIONS.map((condition) => (
            <button
              key={condition.value}
              onClick={() => updateParams({ condition: condition.value })}
              className={`px-4 py-2 rounded-lg border text-xs font-semibold transition-all ${
                selectedCondition === condition.value
                  ? "border-[#394FF1] bg-blue-50 text-[#394FF1] dark:bg-blue-900/20"
                  : "border-zinc-200 dark:border-zinc-700 text-zinc-500"
              }`}
            >
              {condition.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <h4 className="font-bold mb-3 text-zinc-900 dark:text-white text-sm">Sort By</h4>
        <div className="flex flex-col gap-3">
          {SORT_OPTIONS.map((option) => (
            <label
              key={option.value}
              className="flex items-center gap-3 p-3 border border-zinc-200 rounded-xl cursor-pointer dark:border-zinc-800"
            >
              <input
                type="radio"
                name="sort"
                checked={sortBy === option.value}
                onChange={() => updateParams({ sort: option.value })}
                className="size-4 accent-[#394FF1]"
              />

              <span
                className={`text-xs ${
                  sortBy === option.value
                    ? "font-bold text-zinc-900 dark:text-white"
                    : "text-zinc-500"
                }`}
              >
                {option.label}
              </span>
            </label>
          ))}
        </div>
      </div>

      <button
        onClick={handleClear}
        className="mt-4 text-[#61758A] font-bold text-sm hover:underline"
      >
        Clear Filters
      </button>
    </div>
  );

  return (
    <div className="min-h-[100dvh] flex flex-col bg-[#F7F8FA] dark:bg-[#121212] text-black dark:text-white">
      <div className="flex flex-1 px-4 lg:px-11">
        <aside className="hidden lg:block w-[340px] flex-shrink-0 my-6 rounded-3xl bg-[#F7F8FA] dark:bg-[#131313] px-8 py-9 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.3)] border border-zinc-100 dark:border-zinc-800/50 h-fit sticky top-6 self-start">
          <h2 className="text-2xl font-bold mb-8 text-zinc-900 dark:text-white font-figtree">
            Filters
          </h2>
          <SidebarContent />
        </aside>

        <main className="flex-1 bg-transparent p-4 md:p-8 lg:pl-12 min-w-0">
          <div className="max-w-[1100px] mx-auto">
            <div className="mb-6">
              <h1 className="text-lg lg:text-xl xl:text-3xl font-bold capitalize text-[#121417] dark:text-white font-figtree">
                Explore all products
              </h1>

              {loading && products.length === 0 && (
                <div className="flex justify-center py-8">
                  <BrandLoader size="md" label="Loading products…" />
                </div>
              )}
              {error && products.length === 0 && (
                <div className="mt-4 flex flex-col items-start gap-3">
                  <p className="text-red-500">{error}</p>
                  <button
                    onClick={() => setRetryKey((k) => k + 1)}
                    className="rounded-xl bg-[#394FF1] px-5 py-2.5 text-sm font-bold text-white"
                  >
                    Retry
                  </button>
                </div>
              )}
              {!campusSlug && (
                <div className="flex justify-center py-8">
                  <BrandLoader size="md" label="Loading campus…" />
                </div>
              )}
              {priceInvalid && (
                <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600 ring-1 ring-red-100 dark:bg-red-950/20 dark:text-red-300 dark:ring-red-900/40">
                  Invalid price range — min and max must be numbers ≥ 0 and min
                  ≤ max. Clear the price filter to browse.
                </p>
              )}

              {!loading && !error && !priceInvalid && campusSlug && (
                <p className="text-xs xl:text-base font-figtree text-zinc-400 mt-1">
                  Showing {products.length}
                  {pagination != null && ` of ${pagination.total.toLocaleString("en-IN")}`} products
                  {" "}on your campus
                </p>
              )}
            </div>

            {/* ACTIVE FILTER CHIPS */}
            {hasActiveFilters && (
              <div className="mb-6 flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-zinc-400">
                  Active filters:
                </span>
                {selectedCondition && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#394FF1]/10 py-1.5 pl-3 pr-2 text-xs font-bold text-[#394FF1]">
                    {PRODUCT_CONDITION_OPTIONS.find(
                      (c) => c.value === selectedCondition,
                    )?.label || selectedCondition}
                    <button
                      onClick={() => updateParams({ condition: "" })}
                      aria-label="Remove condition filter"
                      className="flex h-4 w-4 items-center justify-center rounded-full text-xs leading-none hover:bg-[#394FF1]/20"
                    >
                      <FaTimes size={10} />
                    </button>
                  </span>
                )}
                {(minPrice !== "" || maxPrice !== "") && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#394FF1]/10 py-1.5 pl-3 pr-2 text-xs font-bold text-[#394FF1]">
                    ₹{minPrice || "0"} – {maxPrice ? `₹${maxPrice}` : "∞"}
                    <button
                      onClick={() => {
                        updateParams({ min: "", max: "" });
                        setSliderValue([
                          filterMeta.price.min,
                          filterMeta.price.max,
                        ]);
                      }}
                      aria-label="Remove price filter"
                      className="flex h-4 w-4 items-center justify-center rounded-full text-xs leading-none hover:bg-[#394FF1]/20"
                    >
                      <FaTimes size={10} />
                    </button>
                  </span>
                )}
                {sortBy !== "recommended" && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#394FF1]/10 py-1.5 pl-3 pr-2 text-xs font-bold text-[#394FF1]">
                    {SORT_OPTIONS.find((s) => s.value === sortBy)?.label || sortBy}
                    <button
                      onClick={() => updateParams({ sort: "" })}
                      aria-label="Remove sort filter"
                      className="flex h-4 w-4 items-center justify-center rounded-full text-xs leading-none hover:bg-[#394FF1]/20"
                    >
                      <FaTimes size={10} />
                    </button>
                  </span>
                )}
              </div>
            )}

            {error && products.length > 0 && (
              <div className="mb-4 flex flex-col items-start gap-3">
                <p className="text-red-500">{error}</p>
                <button
                  onClick={() => setRetryKey((k) => k + 1)}
                  className="rounded-xl bg-[#394FF1] px-5 py-2.5 text-sm font-bold text-white"
                >
                  Retry
                </button>
              </div>
            )}

            <div
              className={`grid grid-cols-2 md:grid-cols-3 gap-2 lg:gap-6 pb-6 transition-opacity duration-200 ${
                loading && products.length > 0 ? "opacity-60" : ""
              }`}
            >
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
            </div>
            {!loading && !error && !priceInvalid && products.length === 0 && campusSlug && (
              <div className="pb-20 text-center">
                <p className="text-sm text-zinc-500">
                  {hasActiveFilters
                    ? "No products match these filters."
                    : "No products listed yet on this campus."}
                </p>
                {hasActiveFilters ? (
                  <button
                    onClick={handleClear}
                    className="mt-3 rounded-xl bg-[#394FF1] px-5 py-2.5 text-sm font-bold text-white"
                  >
                    Clear filters
                  </button>
                ) : (
                  <Link
                    to="/upload"
                    className="mt-3 inline-block rounded-xl bg-[#394FF1] px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-500/30 transition hover:bg-[#2f3fd6]"
                  >
                    List a product
                  </Link>
                )}
              </div>
            )}
            {loadingMore && (
              <div className="flex justify-center pb-20">
                <BrandLoader size="sm" label="Loading more products…" />
              </div>
            )}
            {!loading && !loadingMore && !hasMore && products.length > 0 && (
              <p className="w-full text-center pb-20 text-sm text-zinc-400 dark:text-zinc-500">
                You&apos;ve seen everything on this campus 🎉
              </p>
            )}
          </div>
        </main>
      </div>

      <button
        onClick={() => setOpen(true)}
        aria-label="Open filters"
        className="lg:hidden fixed bottom-[max(1.5rem,env(safe-area-inset-bottom))] right-6 z-40 bg-[#394FF1] text-white p-4 rounded-full shadow-2xl scale-110 active:scale-95 transition-transform"
      >
        <FaFilter />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          ></div>
          <div className="absolute bottom-0 left-0 right-0 bg-[#F7F8FA] dark:bg-[#131313] rounded-t-[32px] p-8 pb-[max(2rem,env(safe-area-inset-bottom))] max-h-[90dvh] overflow-y-auto no-scrollbar shadow-2xl">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">Filters</h2>
              <button
                onClick={() => setOpen(false)}
                className="p-2 bg-zinc-100 dark:bg-zinc-800 rounded-full"
                aria-label="Close filters"
              >
                <FaTimes className="text-zinc-500" />
              </button>
            </div>
            <SidebarContent />
            <button
              onClick={() => setOpen(false)}
              className="w-full bg-[#394FF1] text-white py-4 rounded-2xl font-bold mt-8 shadow-lg shadow-blue-500/30"
            >
              Apply Filters
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExplorePage;
