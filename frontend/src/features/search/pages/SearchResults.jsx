import { useSearchParams } from "react-router-dom";
import { useCallback, useEffect, useState } from "react";

import PriceRangeSlider from "../../../components/ui/PriceRangeSlider.jsx";

import ProductCard from "../../product/components/ProductCard";
import BrandLoader from "../../../components/ui/BrandLoader.jsx";
import { searchProducts, getTrendingProducts } from "../api/searchApi";
import { CATEGORY_ITEMS } from "../../product/constants/categories.js";

import { FaFilter, FaTimes } from "react-icons/fa";
import { useCampus } from "../../../context/CampusContext.jsx";

const PRICE_MIN = 0;
const PRICE_MAX = 100000;

// Backend condition enum values (must match server whitelist).
const CONDITIONS = [
  { value: "", label: "All" },
  { value: "brand_new", label: "Brand New" },
  { value: "like_new", label: "Like New" },
  { value: "gently_used", label: "Gently Used" },
  { value: "well_used", label: "Well Used" },
  { value: "for_parts_or_not_working", label: "For Parts" },
];

const SORTS = [
  { value: "relevant", label: "Most Relevant" },
  { value: "latest", label: "Latest" },
  { value: "price_low", label: "Price: Low to High" },
  { value: "price_high", label: "Price: High to Low" },
];

const SearchResults = () => {
  const [params, setParams] = useSearchParams();
  const { campusSlug, refreshDirectory } = useCampus();

  const query = params.get("q") || "";
  const page = Math.max(1, Number.parseInt(params.get("page") || "1", 10) || 1);
  const rawMin = params.get("min") || "";
  const rawMax = params.get("max") || "";
  const rawCondition = params.get("condition") || "";
  const rawCategory = params.get("category") || "";
  const rawSort = params.get("sort") || "relevant";

  // Whitelist invalid filter values → default (never send junk to backend).
  const validConditions = new Set(CONDITIONS.map((c) => c.value));
  const validSorts = new Set(SORTS.map((s) => s.value));
  const validCategories = new Set(CATEGORY_ITEMS.map((c) => c.value));
  const condition = validConditions.has(rawCondition) ? rawCondition : "";
  const category = validCategories.has(rawCategory) ? rawCategory : "";
  const sort = validSorts.has(rawSort) ? rawSort : "relevant";

  // Numeric price validation: >= 0, min <= max. Invalid → inline error, no fetch.
  const parsedMin = rawMin === "" ? null : Number(rawMin);
  const parsedMax = rawMax === "" ? null : Number(rawMax);
  const priceInvalid =
    (rawMin !== "" && (!Number.isFinite(parsedMin) || parsedMin < 0)) ||
    (rawMax !== "" && (!Number.isFinite(parsedMax) || parsedMax < 0)) ||
    (parsedMin != null &&
      parsedMax != null &&
      parsedMin > parsedMax);
  const minPrice = priceInvalid ? "" : rawMin;
  const maxPrice = priceInvalid ? "" : rawMax;

  const [open, setOpen] = useState(false);

  const [products, setProducts] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [retryKey, setRetryKey] = useState(0);
  const [trending, setTrending] = useState([]);
  const [trendingLoading, setTrendingLoading] = useState(false);

  // Local slider state mirrors URL only after commit (drag floods router).
  const [sliderValue, setSliderValue] = useState([
    minPrice !== "" ? Number(minPrice) : PRICE_MIN,
    maxPrice !== "" ? Number(maxPrice) : PRICE_MAX,
  ]);

  useEffect(() => {
    setSliderValue([
      minPrice !== "" ? Number(minPrice) : PRICE_MIN,
      maxPrice !== "" ? Number(maxPrice) : PRICE_MAX,
    ]);
  }, [minPrice, maxPrice]);

  const updateParams = useCallback(
    (updates, resetPage = true) => {
      const next = new URLSearchParams(params);
      for (const [key, value] of Object.entries(updates)) {
        if (value === "" || value === null || value === undefined) {
          next.delete(key);
        } else {
          next.set(key, String(value));
        }
      }
      if (resetPage) next.delete("page");
      setParams(next, { replace: false });
    },
    [params, setParams],
  );

  // FETCH SEARCH RESULTS — refires on any URL param change so filters,
  // sort, and pagination are shareable and survive back/forward.
  useEffect(() => {
    let cancelled = false;
    const fetchSearchResults = async () => {
      if (!campusSlug || priceInvalid) return;
      const isPaging = page > 1;
      try {
        if (isPaging) setLoadingMore(true);
        else {
          setLoading(true);
          setProducts([]);
        }
        setError(null);
        const res = await searchProducts({
          q: query.slice(0, 100),
          page,
          limit: 20,
          sort,
          ...(category ? { category } : {}),
          ...(condition ? { condition } : {}),
          ...(minPrice !== "" ? { min_price: minPrice } : {}),
          ...(maxPrice !== "" ? { max_price: maxPrice } : {}),
          campus_slug: campusSlug,
        });

        if (cancelled) return;
        const items = res.data?.products || [];
        const paging = res.data?.pagination || null;
        // Dedup Load-more by _id: paging overlap must never duplicate cards.
        setProducts((prev) => {
          if (!isPaging) return items;
          const seen = new Set(prev.map((p) => p._id));
          const fresh = items.filter((p) => !seen.has(p._id));
          return [...prev, ...fresh];
        });
        setPagination(paging);
      } catch {
        if (!cancelled) setError("Failed to load search results");
      } finally {
        if (!cancelled) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    };

    if (query) fetchSearchResults();
    else {
      setProducts([]);
      setPagination(null);
      setLoading(false);
    }
    return () => {
      cancelled = true;
    };
  }, [query, page, sort, category, condition, minPrice, maxPrice, campusSlug, retryKey, priceInvalid]);

  // Trending fallback for empty query only (server-cached). Filtered zero
  // results show "No matches, clear filters" instead — never trending.
  useEffect(() => {
    let cancelled = false;
    const needsTrending = !query;
    if (!needsTrending || trending.length > 0 || !campusSlug) return;
    setTrendingLoading(true);
    getTrendingProducts({ campus_slug: campusSlug })
      .then((res) => {
        if (!cancelled) setTrending(res.data?.data || []);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setTrendingLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [query, trending.length, campusSlug]);

  const handleClear = () => {
    setParams({ q: query }, { replace: false });
    setOpen(false);
  };

  const commitPriceRange = (value) => {
    const [lo, hi] = value;
    updateParams({
      min: lo <= PRICE_MIN ? "" : lo,
      max: hi >= PRICE_MAX ? "" : hi,
    });
  };

  const hasMore =
    pagination != null && pagination.totalPages > pagination.page;

  const FilterChip = ({ label, onClear }) => (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#394FF1]/10 py-1.5 pl-3 pr-2 text-xs font-bold text-[#394FF1]">
      {label}
      <button
        onClick={onClear}
        aria-label={`Remove filter ${label}`}
        className="flex h-4 w-4 items-center justify-center rounded-full text-xs leading-none hover:bg-[#394FF1]/20"
      >
        <FaTimes size={10} />
      </button>
    </span>
  );

  // SIDEBAR
  const SidebarContent = () => (
    <div className="flex flex-col gap-5 font-robotoFlex">
      <div>
        <h4 className="font-bold mb-6 text-zinc-900 dark:text-white text-sm">Price Range</h4>
        <div className="px-2">
          <PriceRangeSlider
            min={PRICE_MIN}
            max={PRICE_MAX}
            step={1000}
            value={sliderValue}
            onChange={(value) => setSliderValue(value)}
            onAfterChange={commitPriceRange}
            minDistance={1000}
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
              {sliderValue[1] >= PRICE_MAX
                ? "₹1L+"
                : `₹${sliderValue[1].toLocaleString("en-IN")}`}
            </span>
          </div>
        </div>
      </div>

      <div>
        <h4 className="font-bold mb-3 text-zinc-900 dark:text-white text-sm">Condition</h4>
        <div className="flex flex-wrap gap-2">
          {CONDITIONS.map((c) => (
            <button
              key={c.value || "all"}
              onClick={() => updateParams({ condition: c.value })}
              className={`px-4 py-2 border rounded-lg text-xs font-bold transition-all ${
                condition === c.value
                  ? "border-[#394FF1] text-[#394FF1] bg-blue-50 dark:bg-blue-900/10"
                  : "border-zinc-200 dark:border-zinc-800 text-zinc-500"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <h4 className="font-bold mb-3 text-zinc-900 dark:text-white text-sm">Sort By</h4>
        <div className="flex flex-col gap-3">
          {SORTS.map((opt) => (
            <label
              key={opt.value}
              className="flex items-center gap-3 p-3 border border-zinc-200 rounded-xl cursor-pointer dark:border-zinc-800"
            >
              <input
                type="radio"
                name="sort"
                checked={sort === opt.value}
                onChange={() => updateParams({ sort: opt.value })}
                className="size-4 accent-[#394FF1]"
              />
              <span
                className={`text-xs ${
                  sort === opt.value
                    ? "font-bold text-zinc-900 dark:text-white"
                    : "text-zinc-500"
                }`}
              >
                {opt.label}
              </span>
            </label>
          ))}
        </div>
      </div>

      <button
        onClick={handleClear}
        className="mt-4 text-[#61758A] font-bold text-sm hover:underline self-start"
      >
        Clear Filters
      </button>
    </div>
  );

  return (
    <div className="min-h-[100dvh] flex flex-col bg-[#F7F8FA] dark:bg-[#121212]">
      <div className="flex flex-1 px-4 lg:px-11">
        {/* SIDEBAR */}
        <aside className="hidden lg:block w-[340px] flex-shrink-0 my-6 rounded-3xl bg-[#F7F8FA] dark:bg-[#131313] px-8 py-9 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.3)] border border-zinc-100 dark:border-zinc-800/50 h-fit sticky top-6 self-start">
          <h2 className="text-2xl font-bold mb-8 text-zinc-900 dark:text-white font-robotoFlex">
            Filters
          </h2>
          <SidebarContent />
        </aside>

        {/* MAIN CONTENT */}
        <main className="flex-1 bg-transparent p-4 md:p-8 lg:pl-12 min-w-0">
          <div className="max-w-[1100px] mx-auto">
            <div className="mb-6">
              <h1 className="text-lg lg:text-xl xl:text-3xl font-bold text-[#121417] dark:text-white font-manrope">
                {query ? "Search Results" : "Explore"}
              </h1>

              {query ? (
                <p className="text-sm text-zinc-400 mt-1">
                  {pagination != null && !loading ? (
                    <>
                      <span className="text-[#394FF1] font-semibold">
                        {pagination.total.toLocaleString("en-IN")}
                      </span>{" "}
                      result{pagination.total === 1 ? "" : "s"} for{" "}
                    </>
                  ) : (
                    <>Showing results for </>
                  )}
                  <span className="text-[#394FF1] font-semibold">"{query}"</span>
                </p>
              ) : (
                <p className="text-sm text-zinc-400 mt-1">
                  Type to search, or browse what others are viewing.
                </p>
              )}

              {!campusSlug ? (
                <div className="flex flex-col items-center gap-3 py-8">
                  <BrandLoader size="md" label="Loading campus…" />
                  <button
                    onClick={() => {
                      refreshDirectory?.();
                      setRetryKey((k) => k + 1);
                    }}
                    className="rounded-xl bg-[#394FF1] px-5 py-2.5 text-sm font-bold text-white"
                  >
                    Retry
                  </button>
                </div>
              ) : null}
              {priceInvalid ? (
                <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600 ring-1 ring-red-100 dark:bg-red-950/20 dark:text-red-300 dark:ring-red-900/40">
                  Invalid price range — min and max must be numbers ≥ 0 and min
                  ≤ max. Clear the price filter to search.
                </p>
              ) : null}
              {loading && (
                <div className="flex justify-center py-8">
                  <BrandLoader size="md" label="Searching…" />
                </div>
              )}
              {error && (
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
              {!loading &&
                !error &&
                !priceInvalid &&
                query &&
                products.length === 0 && (
                  <div className="mt-2">
                    <p className="text-gray-500">
                      {condition ||
                      category ||
                      minPrice !== "" ||
                      maxPrice !== "" ||
                      sort !== "relevant"
                        ? "No matches for these filters."
                        : "No results found. Try different keywords."}
                    </p>
                    {condition ||
                    category ||
                    minPrice !== "" ||
                    maxPrice !== "" ||
                    sort !== "relevant" ? (
                      <button
                        onClick={handleClear}
                        className="mt-3 rounded-xl bg-[#394FF1] px-5 py-2.5 text-sm font-bold text-white"
                      >
                        Clear filters
                      </button>
                    ) : null}
                  </div>
                )}
            </div>

              {/* CATEGORY PILLS + ACTIVE FILTER CHIPS */}
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <button
                  onClick={() => updateParams({ category: "" })}
                  className={`rounded-full px-4 py-2 text-xs font-bold transition ${
                    !category
                      ? "bg-[#394FF1] text-white shadow-md shadow-blue-500/30"
                      : "border border-zinc-200 bg-[#F7F8FA] text-zinc-500 dark:border-zinc-800 dark:bg-[#1A1D20] dark:text-zinc-400"
                  }`}
                >
                  All
                </button>
                {CATEGORY_ITEMS.map((cat) => (
                  <button
                    key={cat.value}
                    onClick={() => updateParams({ category: cat.value })}
                    className={`rounded-full px-4 py-2 text-xs font-bold transition ${
                      category === cat.value
                        ? "bg-[#394FF1] text-white shadow-md shadow-blue-500/30"
                        : "border border-zinc-200 bg-[#F7F8FA] text-zinc-500 dark:border-zinc-800 dark:bg-[#1A1D20] dark:text-zinc-400"
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {(condition || sort !== "relevant" || minPrice !== "" || maxPrice !== "" || category) && (
                <div className="mb-6 flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold text-zinc-400">
                    Active filters:
                  </span>
                  {category && (
                    <FilterChip
                      label={CATEGORY_ITEMS.find((c) => c.value === category)?.label || category}
                      onClear={() => updateParams({ category: "" })}
                    />
                  )}
                  {condition && (
                    <FilterChip
                      label={CONDITIONS.find((c) => c.value === condition)?.label || condition}
                      onClear={() => updateParams({ condition: "" })}
                    />
                  )}
                  {(minPrice !== "" || maxPrice !== "") && (
                    <FilterChip
                      label={`₹${minPrice || "0"} – ${maxPrice ? `₹${maxPrice}` : "∞"}`}
                      onClear={() => updateParams({ min: "", max: "" })}
                    />
                  )}
                  {sort !== "relevant" && (
                    <FilterChip
                      label={SORTS.find((s) => s.value === sort)?.label || sort}
                      onClear={() => updateParams({ sort: "" })}
                    />
                  )}
                </div>
              )}

              {/* PRODUCT GRID */}
              {!loading && products.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 lg:gap-6 pb-6">
                  {products.map((product) => (
                    <ProductCard key={product._id} product={product} />
                  ))}
                </div>
              )}

            {/* LOAD MORE */}
            {!loading && !error && hasMore && (
              <div className="flex justify-center pb-20">
                <button
                  onClick={() => updateParams({ page: page + 1 }, false)}
                  disabled={loadingMore}
                  className="rounded-2xl bg-[#394FF1] px-8 py-3 text-sm font-bold text-white shadow-lg shadow-blue-500/30 transition hover:bg-[#2f3fd6] disabled:opacity-60"
                >
                  {loadingMore ? "Loading…" : "Load more results"}
                </button>
              </div>
            )}
            {loadingMore && (
              <div className="flex justify-center pb-20">
                <BrandLoader size="sm" />
              </div>
            )}

            {/* TRENDING FALLBACK — only when there is no query */}
            {!loading &&
              !error &&
              !query &&
              (trendingLoading || trending.length > 0) && (
                <div className="pb-20">
                  <h2 className="text-lg font-bold text-[#121417] dark:text-white mb-4">
                    Trending on campus
                  </h2>
                  {trendingLoading ? (
                    <div className="flex justify-center py-8">
                      <BrandLoader size="sm" />
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 lg:gap-6">
                      {trending.map((product) => (
                        <ProductCard key={product._id} product={product} />
                      ))}
                    </div>
                  )}
                </div>
              )}
            {!loading && products.length > 0 && <div className="pb-20" />}
          </div>
        </main>
      </div>

      {/* MOBILE FILTER BUTTON */}
      <button
        onClick={() => setOpen(true)}
        className="lg:hidden fixed bottom-[max(1.5rem,env(safe-area-inset-bottom))] right-6 z-40 bg-[#394FF1] text-white p-4 rounded-full shadow-2xl scale-110 active:scale-95 transition-transform"
        aria-label="Open filters"
      >
        <FaFilter />
      </button>

      {/* MOBILE FILTER DRAWER */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          ></div>

          <div className="absolute bottom-0 left-0 right-0 bg-[#F7F8FA] dark:bg-[#131313] rounded-t-[32px] p-8 pb-[max(2rem,env(safe-area-inset-bottom))] max-h-[90dvh] overflow-y-auto no-scrollbar shadow-2xl">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-bold dark:text-white">Filters</h2>

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

export default SearchResults;
