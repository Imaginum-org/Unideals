import { useState, useEffect, useCallback, useMemo } from "react";
import PriceRangeSlider from "../../../components/ui/PriceRangeSlider.jsx";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import {
  PRODUCT_CATEGORY_OPTIONS,
  PRODUCT_CONDITION_OPTIONS,
} from "../constants/productOptions.js";
import ProductCard from "../../../features/product/components/ProductCard.jsx";
import BrandLoader from "../../../components/ui/BrandLoader.jsx";
import { getBoostedProducts, getProducts } from "../api/productApi";
import { FaFilter, FaTimes } from "react-icons/fa";
import { useCampus } from "../../../context/CampusContext.jsx";

const CategoryPage = () => {
  const { categoryName } = useParams();
  const navigate = useNavigate();
  const { campusSlug } = useCampus();
  const [searchParams, setSearchParams] = useSearchParams();
  const isBoostedPage = categoryName === "boosted-products";

  // Slug mapping (both ways): URL may carry kebab-case (study-material) or
  // the canonical value (study_material) — both resolve to the same option.
  const categoryValue = (() => {
    if (isBoostedPage) return "boosted-products";
    const raw = (categoryName || "").toLowerCase();
    const values = new Set(PRODUCT_CATEGORY_OPTIONS.map((o) => o.value));
    if (values.has(raw)) return raw;
    const underscored = raw.replace(/-/g, "_");
    if (values.has(underscored)) return underscored;
    return null;
  })();
  const isUnknownCategory = !isBoostedPage && !categoryValue;
  const categoryLabel =
    PRODUCT_CATEGORY_OPTIONS.find((o) => o.value === categoryValue)?.label ||
    categoryName;

  // Filters live in the URL (shareable, back/forward-safe) — local state is
  // only the live slider thumb position while dragging.
  const selectedCondition = searchParams.get("condition") || "";
  const sortBy = searchParams.get("sort") || "recommended";
  const minPrice = searchParams.get("min") || "";
  const maxPrice = searchParams.get("max") || "";

  const [open, setOpen] = useState(false);

  const [products, setProducts] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [filterMeta, setFilterMeta] = useState({
    price: {
      min: 0,
      max: 0,
    },
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [retryKey, setRetryKey] = useState(0);

  const [sliderValue, setSliderValue] = useState([0, 0]);

  const SORT_OPTIONS = [
    {
      value: "recommended",
      label: "Recommended",
    },
    {
      value: "latest",
      label: "Latest",
    },
    {
      value: "price_low",
      label: "Price: Low to High",
    },
    {
      value: "price_high",
      label: "Price: High to Low",
    },
  ];

  useEffect(() => {
    window.scrollTo({
      top: 0,
      behavior: "auto",
    });
  }, []);

  // FETCH PRODUCTS — server filters for normal categories; the boosted
  // rail is small, so it loads once and filters client-side (instant).
  // Pagination: limit 20 + Load more (dedup by _id).
  useEffect(() => {
    setPage(1);
    setProducts([]);
    setPagination(null);
  }, [categoryValue, isBoostedPage, selectedCondition, sortBy, minPrice, maxPrice, campusSlug]);

  useEffect(() => {
    let cancelled = false;
    const fetchCategoryProducts = async () => {
      if (!campusSlug || isUnknownCategory) return;
      const isPaging = page > 1;
      try {
        if (isPaging) setLoadingMore(true);
        else setLoading(true);
        setError(null);

        if (isBoostedPage) {
          const res = await getBoostedProducts({ campus_slug: campusSlug });
          if (cancelled) return;
          const items = res.data?.data || [];
          setProducts(items);
          const prices = items
            .map((p) => Number(p.selling_price))
            .filter((n) => Number.isFinite(n));
          let bounds = {
            min: prices.length ? Math.min(...prices) : 0,
            max: prices.length ? Math.max(...prices) : 0,
          };
          // Degenerate slider (min == max) can never move — widen it.
          if (bounds.max <= bounds.min) bounds = { min: bounds.min, max: bounds.min + 1000 };
          setFilterMeta({ price: bounds });
          if (minPrice === "" && maxPrice === "") {
            setSliderValue([bounds.min, bounds.max]);
          }
          return;
        }

        const params = {
          category: categoryValue,
          sort: sortBy,
          page,
          limit: 20,
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
        let meta = res.data?.filterMeta || {
          price: {
            min: 0,
            max: 0,
          },
        };
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
        if (!cancelled) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    };

    fetchCategoryProducts();
    return () => {
      cancelled = true;
    };
  }, [
    categoryValue,
    isUnknownCategory,
    isBoostedPage,
    selectedCondition,
    sortBy,
    minPrice,
    maxPrice,
    campusSlug,
    page,
    retryKey,
  ]);

  // Boosted rail: instant client-side filtering over the loaded items.
  const visibleProducts = useMemo(() => {
    if (!isBoostedPage) return products;
    let list = [...products];
    if (selectedCondition) {
      list = list.filter((p) => p.condition === selectedCondition);
    }
    if (minPrice !== "") {
      list = list.filter((p) => Number(p.selling_price) >= Number(minPrice));
    }
    if (maxPrice !== "") {
      list = list.filter((p) => Number(p.selling_price) <= Number(maxPrice));
    }
    if (sortBy === "price_low") {
      list.sort((a, b) => a.selling_price - b.selling_price);
    } else if (sortBy === "price_high") {
      list.sort((a, b) => b.selling_price - a.selling_price);
    } else if (sortBy === "latest") {
      list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }
    return list;
  }, [products, isBoostedPage, selectedCondition, minPrice, maxPrice, sortBy]);

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

  const handleCategoryChange = (e) => {
    const value = e.target.value;
    if (value) {
      // Canonical values are already URL-safe — navigate with the value
      // as-is so kebab and underscore URLs stay consistent.
      // Navigating to a bare path drops existing filter params —
      // a fresh category always starts unfiltered.
      navigate(`/category/${value}`);
    }
  };

  const SidebarContent = () => (
    <div className="flex flex-col gap-5 font-figtree">
      <div>
        <h4 className="font-bold mb-3 text-zinc-900 dark:text-white text-sm">Category</h4>
        <select
          value={isBoostedPage ? "boosted-products" : categoryValue || ""}
          onChange={handleCategoryChange}
          className="w-full p-2 border border-zinc-200 rounded-lg bg-[#F7F8FA] text-zinc-900 dark:bg-transparent dark:border-zinc-700 dark:text-zinc-200 outline-none appearance-none cursor-pointer"
        >
          {isBoostedPage && (
            <option
              value="boosted-products"
              className="bg-[#F7F8FA] text-zinc-900 dark:bg-zinc-900 dark:text-zinc-200"
            >
              Boosted Products
            </option>
          )}
          {PRODUCT_CATEGORY_OPTIONS.map((category) => (
            <option
              key={category.value}
              value={category.value}
              className="bg-[#F7F8FA] text-zinc-900 dark:bg-zinc-900 dark:text-zinc-200"
            >
              {category.label}
            </option>
          ))}
        </select>
      </div>

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
            {isUnknownCategory ? (
              <div className="flex flex-col items-center py-16 text-center">
                <p className="text-5xl">🧭</p>
                <h1 className="mt-4 text-xl font-bold text-[#0F172A] dark:text-white">
                  Category not found
                </h1>
                <p className="mt-2 text-sm text-[#64748B] dark:text-gray-400">
                  We couldn&apos;t find “{categoryName}”. Browse a valid
                  category instead.
                </p>
                <button
                  onClick={() => navigate("/")}
                  className="mt-6 rounded-xl bg-[#394FF1] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#2829D8]"
                >
                  Back to Home
                </button>
              </div>
            ) : (
            <>
            <div className="mb-6">
              <h1 className="text-lg lg:text-xl xl:text-3xl font-bold capitalize text-[#121417] dark:text-white font-figtree">
                {isBoostedPage
                  ? "Boosted Products"
                  : (categoryLabel || "").replaceAll("_", " ")}
              </h1>

              {loading && products.length === 0 && (
                <div className="flex justify-center py-8">
                  <BrandLoader size="md" label="Loading products…" />
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

              <p className="text-xs xl:text-base font-figtree text-zinc-400 mt-1">
                Showing {visibleProducts.length} products in{" "}
                <span className="text-[#394FF1] font-semibold capitalize">
                  {isBoostedPage
                    ? "boosted products"
                    : (categoryLabel || "").replaceAll("_", " ")}
                </span>
              </p>
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

            {error && products.length === 0 && (
              <p className="text-red-500">{error}</p>
            )}

            <div
              className={`grid grid-cols-2 md:grid-cols-3 gap-2 lg:gap-6 pb-6 transition-opacity duration-200 ${
                loading && products.length > 0 ? "opacity-60" : ""
              }`}
            >
              {visibleProducts.map((product) => (
                <ProductCard key={product._id} product={product} />
              ))}
            </div>
            {!loading && !error && visibleProducts.length === 0 && (
              <div className="pb-20 text-center">
                <p className="text-sm text-zinc-500">
                  No products match these filters.
                </p>
                <button
                  onClick={handleClear}
                  className="mt-3 rounded-xl bg-[#394FF1] px-5 py-2.5 text-sm font-bold text-white"
                >
                  Clear filters
                </button>
              </div>
            )}
            {/* Pagination: limit 20 + Load more (server page, dedup'd) */}
            {!isBoostedPage &&
              !loading &&
              !error &&
              pagination != null &&
              pagination.totalPages > page && (
                <div className="flex justify-center pb-20">
                  <button
                    onClick={() => setPage((p) => p + 1)}
                    disabled={loadingMore}
                    className="rounded-2xl bg-[#394FF1] px-8 py-3 text-sm font-bold text-white shadow-lg shadow-blue-500/30 transition hover:bg-[#2f3fd6] disabled:opacity-60"
                  >
                    {loadingMore ? "Loading…" : "Load more"}
                  </button>
                </div>
              )}
            {loadingMore && (
              <div className="flex justify-center pb-20">
                <BrandLoader size="sm" />
              </div>
            )}
            </>
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

export default CategoryPage;
