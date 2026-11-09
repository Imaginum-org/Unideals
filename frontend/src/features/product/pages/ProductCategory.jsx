import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import {
  PRODUCT_CATEGORY_OPTIONS,
  GIRLS_ONLY_CATEGORIES,
  orderCategoriesForGirls,
} from "../constants/productOptions.js";
import ProductCard from "../../../features/product/components/ProductCard.jsx";
import BrandLoader from "../../../components/ui/BrandLoader.jsx";
import {
  BROWSE_GRID,
  ResultsToolbar,
  BrowseHeader,
  BrowseError,
  CategoryRail,
  EndOfResults,
  MobileFilterButton,
  MobileFilterSheet,
  ProductGridSkeleton,
  SORT_OPTIONS,
  SortSelect,
} from "../components/browse/BrowseKit.jsx";
import FilterSidebar from "../components/browse/FilterSidebar.jsx";
import useBrowseFilters from "../components/browse/useBrowseFilters.js";
import { getBoostedProducts, getProducts } from "../api/productApi";
import { useCampus } from "../../../context/CampusContext.jsx";
import { useUser } from "../../../context/useUserContext.jsx";
import { useGirlsMode } from "../../../context/GirlsModeContext.jsx";
import GirlsEntryPill from "../../../components/ui/GirlsEntryPill.jsx";
import EmptyState from "../../../components/ui/EmptyState.jsx";
import { FiltersEmptyState } from "../../../components/ui/EmptyStates.jsx";
import { Plus, Search } from "lucide-react";

const PAGE_SIZE = 12;

const CategoryPage = () => {
  const { categoryName } = useParams();
  const { campusSlug, campus } = useCampus();
  const campusName = campus?.name || campus?.short_name || "your campus";
  const [searchParams, setSearchParams] = useSearchParams();
  const { userDetails, isLoggedIn } = useUser();
  const { girlsMode, setGirlsMode } = useGirlsMode();
  const audienceTab = searchParams.get("tab") === "girls" ? "girls" : "all";
  const viewerGender = userDetails?.gender ?? null;
  const viewerRole = userDetails?.role ?? null;
  const canSeeGirls =
    isLoggedIn && (viewerGender === "female" || viewerRole === "admin" || viewerRole === "support");
  const setAudienceTab = (t) => {
    const next = new URLSearchParams(searchParams);
    if (t === "girls") next.set("tab", "girls");
    else next.delete("tab");
    setSearchParams(next, { replace: true });
    if (t === "girls" && !girlsMode) setGirlsMode(true);
    if (t !== "girls" && girlsMode) setGirlsMode(false);
  };
  // Pink mode <=> girls feed sync; ineligible ?tab=girls silently reset.
  useEffect(() => {
    if (!canSeeGirls) {
      if (audienceTab === "girls") {
        const next = new URLSearchParams(searchParams);
        next.delete("tab");
        setSearchParams(next, { replace: true });
      }
      if (girlsMode) setGirlsMode(false);
      return;
    }
    if (girlsMode && audienceTab !== "girls") {
      const next = new URLSearchParams(searchParams);
      next.set("tab", "girls");
      setSearchParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [girlsMode, canSeeGirls]);

  const isBoostedPage = categoryName === "boosted-products";

  // Slug mapping (both ways): kebab-case or canonical value.
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
  const isGirlsOnlyCategory = !isBoostedPage && GIRLS_ONLY_CATEGORIES.includes(categoryValue);
  const girlsCategoryLocked = isGirlsOnlyCategory && !(audienceTab === "girls" && canSeeGirls);
  const visibleCategoryOptions =
    audienceTab === "girls" && canSeeGirls
      ? orderCategoriesForGirls(PRODUCT_CATEGORY_OPTIONS)
      : PRODUCT_CATEGORY_OPTIONS.filter((o) => !o.girlsOnly);
  const categoryOption = PRODUCT_CATEGORY_OPTIONS.find((o) => o.value === categoryValue);
  const prettyLabel = isBoostedPage
    ? "Boosted listings"
    : (categoryOption?.label || categoryName || "").replaceAll("_", " ");
  const categoryDescription = isBoostedPage
    ? "Featured by sellers right now"
    : categoryOption?.description || "";

  const filters = useBrowseFilters({ sortOptions: SORT_OPTIONS, defaultSort: "recommended", preserve: ["tab"] });

  const [sheetOpen, setSheetOpen] = useState(false);
  const [products, setProducts] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [priceBounds, setPriceBounds] = useState({ min: 0, max: 0 });
  const [error, setError] = useState(null);
  const [retryKey, setRetryKey] = useState(0);
  const fetchingRef = useRef(false);
  const observerRef = useRef(null);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [categoryValue]);

  // The boosted page loads once and filters client-side, so its fetch must
  // not re-run on filter changes.
  const serverFilterKey = isBoostedPage ? "boosted" : filters.filterKey;

  useEffect(() => {
    observerRef.current?.disconnect();
    setPage(1);
    setProducts([]);
    setPagination(null);
    setError(null);
  }, [categoryValue, serverFilterKey, campusSlug, audienceTab]);

  useEffect(() => () => observerRef.current?.disconnect(), []);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!campusSlug || isUnknownCategory || girlsCategoryLocked) return;
      if (audienceTab === "girls" && !canSeeGirls) return;
      if (fetchingRef.current) return;
      const isPaging = page > 1;
      try {
        fetchingRef.current = true;
        if (isPaging) setLoadingMore(true);
        else setLoading(true);
        setError(null);

        if (isBoostedPage) {
          const res = await getBoostedProducts({
            campus_slug: campusSlug,
            ...(audienceTab === "girls" ? { audience: "girls_only" } : {}),
          });
          if (cancelled) return;
          const items = res.data?.data || [];
          setProducts(audienceTab === "girls" ? items.filter((p) => p.isGirlsOnly === true) : items);
          const prices = items.map((p) => Number(p.selling_price)).filter(Number.isFinite);
          setPriceBounds({ min: prices.length ? Math.min(...prices) : 0, max: prices.length ? Math.max(...prices) : 0 });
          return;
        }

        const res = await getProducts({
          ...filters.apiParams,
          category: categoryValue,
          sort: filters.sort,
          page,
          limit: PAGE_SIZE,
          campus_slug: campusSlug,
          ...(audienceTab === "girls" ? { audience: "girls_only" } : {}),
        });
        if (cancelled) return;
        const items = res.data?.data || [];
        setProducts((prev) => {
          if (!isPaging) return items;
          const seen = new Set(prev.map((p) => p._id));
          return [...prev, ...items.filter((p) => !seen.has(p._id))];
        });
        setPagination(res.data?.pagination || null);
        const price = res.data?.filterMeta?.price;
        if (price) setPriceBounds(price);
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
    run();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryValue, isUnknownCategory, serverFilterKey, campusSlug, page, retryKey, audienceTab, canSeeGirls, girlsCategoryLocked]);

  // Boosted page: same facets, applied client-side.
  const visibleProducts = useMemo(() => {
    if (!isBoostedPage) return products;
    const { conditions, minPrice, maxPrice, posted, offersOnly, sort } = filters;
    const cutoff = posted ? Date.now() - Number(posted) * 864e5 : null;
    const list = products.filter(
      (p) =>
        (!conditions.length || conditions.includes(p.condition)) &&
        (minPrice == null || Number(p.selling_price) >= minPrice) &&
        (maxPrice == null || Number(p.selling_price) <= maxPrice) &&
        (!cutoff || new Date(p.createdAt).getTime() >= cutoff) &&
        (!offersOnly || p.is_negotiable === true),
    );
    if (sort === "price_low") list.sort((a, b) => a.selling_price - b.selling_price);
    else if (sort === "price_high") list.sort((a, b) => b.selling_price - a.selling_price);
    else if (sort === "latest") list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return list;
  }, [products, isBoostedPage, filters]);

  const hasMore = !isBoostedPage && pagination != null && pagination.totalPages > pagination.page;
  const lastProductRef = useCallback(
    (node) => {
      observerRef.current?.disconnect();
      if (!node || !hasMore) return;
      observerRef.current = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting && !fetchingRef.current) setPage(page + 1);
        },
        { rootMargin: "320px" },
      );
      observerRef.current.observe(node);
    },
    [hasMore, page],
  );

  const tabQuery = audienceTab === "girls" ? "?tab=girls" : "";
  const total = isBoostedPage ? visibleProducts.length : pagination?.total ?? null;
  const showSkeleton = (loading || !campusSlug) && visibleProducts.length === 0 && !error;
  const clearAll = () => {
    filters.clearAll();
    setSheetOpen(false);
  };

  return (
    <div className="min-h-[100dvh] bg-[#F7F8FA] pb-24 font-figtree text-slate-900 dark:bg-[#131313] dark:text-white">
      {!isUnknownCategory && <GirlsEntryPill tab={audienceTab} onChange={setAudienceTab} />}

      <div className="mx-auto w-full max-w-[1380px] px-5 pt-5 sm:px-[4.5vw] lg:pt-8 2xl:px-0">
        {isUnknownCategory ? (
          <div className="pt-8">
            <EmptyState
              variant="search"
              title="Category not found"
              description={`We couldn't find “${categoryName}”. It may have been renamed. Pick a category below or explore everything on campus.`}
              primaryAction={{ label: "Explore all listings", to: "/explore", icon: Search }}
              secondaryAction={{ label: "Back to Home", to: "/" }}
            />
          </div>
        ) : (
          <>
            <BrowseHeader
              breadcrumbs={[
                { label: "Home", to: "/" },
                { label: "Explore", to: `/explore${tabQuery}` },
                { label: prettyLabel },
              ]}
              title={<span className="capitalize">{prettyLabel}</span>}
              meta={categoryDescription ? `${categoryDescription} · ${campusName}` : campusName}
            >
              <CategoryRail
                options={visibleCategoryOptions}
                activeValue={isBoostedPage ? "__boosted__" : categoryValue}
                allTo={`/explore${tabQuery}`}
                linkFor={(value) => `/category/${value}${tabQuery}`}
              />
            </BrowseHeader>

            {girlsCategoryLocked ? (
              <div className="pt-8">
                <EmptyState
                  variant="wishlist"
                  title="Girls Corner exclusive 🌸"
                  description={`“${prettyLabel}” is a girls-only category. Only accounts set as Female can see these listings, in Girl Mode.`}
                  primaryAction={
                    canSeeGirls
                      ? { label: "Turn on Girl Mode", onClick: () => setAudienceTab("girls") }
                      : { label: "Explore all listings", to: "/explore" }
                  }
                />
              </div>
            ) : (
              <div className="mt-6 flex gap-10 border-t border-neutral-200/80 pt-6 dark:border-neutral-800">
                <aside className="hidden w-[248px] shrink-0 lg:block">
                  <div className="sticky top-24">
                    <FilterSidebar filters={filters} priceBounds={priceBounds} />
                  </div>
                </aside>

                <main className="min-w-0 flex-1">
                  <ResultsToolbar
                    shown={visibleProducts.length}
                    total={total}
                    chips={filters.chips}
                    onClearAll={clearAll}
                    filterButton={<MobileFilterButton activeCount={filters.activeCount} onClick={() => setSheetOpen(true)} />}
                    sort={<SortSelect value={filters.sort} onChange={filters.setSort} />}
                  />

                  {error && visibleProducts.length === 0 ? (
                    <BrowseError onRetry={() => setRetryKey((k) => k + 1)} />
                  ) : showSkeleton ? (
                    <ProductGridSkeleton count={9} className={BROWSE_GRID} />
                  ) : (
                    <div className={`${BROWSE_GRID} transition-opacity duration-200 ${loading && products.length > 0 ? "opacity-60" : ""}`}>
                      {visibleProducts.map((product, index) => (
                        <ProductCard
                          key={product._id}
                          product={product}
                          ref={visibleProducts.length === index + 1 ? lastProductRef : null}
                        />
                      ))}
                    </div>
                  )}

                  {!loading && !error && campusSlug && visibleProducts.length === 0 && (
                    <div className="pt-2">
                      {filters.hasFilters ? (
                        <FiltersEmptyState
                          onClear={clearAll}
                          secondaryAction={{ label: "Explore all listings", to: `/explore${tabQuery}` }}
                        />
                      ) : (
                        <EmptyState
                          variant="campus"
                          title={`Nothing in ${prettyLabel} yet`}
                          description="No one on your campus has listed here yet. Got something that fits? List it and be the first buyers see."
                          primaryAction={{ label: "List an item", to: "/upload", icon: Plus }}
                          secondaryAction={{ label: "Explore all listings", to: `/explore${tabQuery}` }}
                        />
                      )}
                    </div>
                  )}

                  {error && visibleProducts.length > 0 && (
                    <div className="mt-6">
                      <BrowseError message="We couldn't load more listings." onRetry={() => setRetryKey((k) => k + 1)} />
                    </div>
                  )}
                  {loadingMore && (
                    <div className="mt-10 flex justify-center">
                      <BrandLoader size="sm" label="Loading more listings" />
                    </div>
                  )}
                  {!loading && !loadingMore && !error && !hasMore && visibleProducts.length > 0 && (
                    <div className="mt-12">
                      <EndOfResults
                        label={`That's every ${isBoostedPage ? "boosted listing" : `${prettyLabel.toLowerCase()} listing`} for now`}
                        cta={{ label: "Explore all listings", to: `/explore${tabQuery}` }}
                      />
                    </div>
                  )}
                </main>
              </div>
            )}
          </>
        )}
      </div>

      {!isUnknownCategory && !girlsCategoryLocked && (
        <MobileFilterSheet
          open={sheetOpen}
          onClose={() => setSheetOpen(false)}
          onReset={clearAll}
          activeCount={filters.activeCount}
          resultLabel={total != null ? `Show ${total.toLocaleString("en-IN")} results` : "Show results"}
        >
          <FilterSidebar filters={filters} priceBounds={priceBounds} hideHeader />
        </MobileFilterSheet>
      )}
    </div>
  );
};

export default CategoryPage;
