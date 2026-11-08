import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { PRODUCT_CATEGORY_OPTIONS, orderCategoriesForGirls } from "../constants/productOptions.js";
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
import { getProducts } from "../api/productApi";
import { useCampus } from "../../../context/CampusContext.jsx";
import { useUser } from "../../../context/useUserContext.jsx";
import { useGirlsMode } from "../../../context/GirlsModeContext.jsx";
import GirlsEntryPill from "../../../components/ui/GirlsEntryPill.jsx";
import { CampusEmptyState, FiltersEmptyState } from "../../../components/ui/EmptyStates.jsx";

const PAGE_SIZE = 12;

const ExplorePage = () => {
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
  }, []);

  // Any filter / campus / audience change starts a clean first page.
  useEffect(() => {
    observerRef.current?.disconnect();
    setPage(1);
    setProducts([]);
    setPagination(null);
    setError(null);
  }, [filters.filterKey, campusSlug, audienceTab]);

  useEffect(() => () => observerRef.current?.disconnect(), []);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!campusSlug) return;
      if (audienceTab === "girls" && !canSeeGirls) return;
      if (fetchingRef.current) return;
      const isPaging = page > 1;
      try {
        fetchingRef.current = true;
        if (isPaging) setLoadingMore(true);
        else setLoading(true);
        setError(null);
        const res = await getProducts({
          ...filters.apiParams,
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
  }, [filters.filterKey, campusSlug, page, retryKey, audienceTab, canSeeGirls]);

  const hasMore = pagination != null && pagination.totalPages > pagination.page;

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

  const railOptions =
    audienceTab === "girls" && canSeeGirls
      ? orderCategoriesForGirls(PRODUCT_CATEGORY_OPTIONS)
      : PRODUCT_CATEGORY_OPTIONS.filter((o) => !o.girlsOnly);
  const tabQuery = audienceTab === "girls" ? "?tab=girls" : "";

  const total = pagination?.total ?? null;
  const showSkeleton = (loading || !campusSlug) && products.length === 0 && !error;
  const clearAll = () => {
    filters.clearAll();
    setSheetOpen(false);
  };

  return (
    <div className="min-h-[100dvh] bg-[#F7F8FA] pb-24 font-figtree text-slate-900 dark:bg-[#131313] dark:text-white">
      <GirlsEntryPill tab={audienceTab} onChange={setAudienceTab} />

      <div className="mx-auto w-full max-w-[1380px] px-5 pt-5 sm:px-[4.5vw] lg:pt-8 2xl:px-0">
        <BrowseHeader
          breadcrumbs={[{ label: "Home", to: "/" }, { label: "Explore" }]}
          title="All listings"
          meta={`Everything students are selling at ${campusName}`}
        >
          <CategoryRail
            options={railOptions}
            activeValue={null}
            allTo={`/explore${tabQuery}`}
            linkFor={(value) => `/category/${value}${tabQuery}`}
          />
        </BrowseHeader>

        <div className="mt-6 flex gap-10 border-t border-neutral-200/80 pt-6 dark:border-neutral-800">
          <aside className="hidden w-[248px] shrink-0 lg:block">
            <div className="sticky top-24">
              <FilterSidebar filters={filters} priceBounds={priceBounds} />
            </div>
          </aside>

          <main className="min-w-0 flex-1">
            <ResultsToolbar
              shown={products.length}
              total={total}
              chips={filters.chips}
              onClearAll={clearAll}
              filterButton={<MobileFilterButton activeCount={filters.activeCount} onClick={() => setSheetOpen(true)} />}
              sort={<SortSelect value={filters.sort} onChange={filters.setSort} />}
            />

            {error && products.length === 0 ? (
              <BrowseError onRetry={() => setRetryKey((k) => k + 1)} />
            ) : showSkeleton ? (
              <ProductGridSkeleton count={9} className={BROWSE_GRID} />
            ) : (
              <div className={`${BROWSE_GRID} transition-opacity duration-200 ${loading && products.length > 0 ? "opacity-60" : ""}`}>
                {products.map((product, index) => (
                  <ProductCard
                    key={product._id}
                    product={product}
                    ref={products.length === index + 1 ? lastProductRef : null}
                  />
                ))}
              </div>
            )}

            {!loading && !error && products.length === 0 && campusSlug && (
              <div className="pt-2">
                {filters.hasFilters ? <FiltersEmptyState onClear={clearAll} /> : <CampusEmptyState browseTo="/" />}
              </div>
            )}

            {error && products.length > 0 && (
              <div className="mt-6">
                <BrowseError message="We couldn't load more listings." onRetry={() => setRetryKey((k) => k + 1)} />
              </div>
            )}
            {loadingMore && (
              <div className="mt-10 flex justify-center">
                <BrandLoader size="sm" label="Loading more listings" />
              </div>
            )}
            {!loading && !loadingMore && !hasMore && products.length > 0 && (
              <div className="mt-12">
                <EndOfResults label={`You've seen everything at ${campusName}`} cta={{ label: "Sell something", to: "/upload" }} />
              </div>
            )}
          </main>
        </div>
      </div>

      <MobileFilterSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onReset={clearAll}
        activeCount={filters.activeCount}
        resultLabel={total != null ? `Show ${total.toLocaleString("en-IN")} results` : "Show results"}
      >
        <FilterSidebar filters={filters} priceBounds={priceBounds} hideHeader />
      </MobileFilterSheet>
    </div>
  );
};

export default ExplorePage;
