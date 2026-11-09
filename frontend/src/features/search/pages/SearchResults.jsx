import { useSearchParams } from "react-router-dom";
import { useCallback, useEffect, useRef, useState } from "react";

import ProductCard from "../../product/components/ProductCard";
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
  SortSelect,
} from "../../product/components/browse/BrowseKit.jsx";
import FilterSidebar from "../../product/components/browse/FilterSidebar.jsx";
import useBrowseFilters from "../../product/components/browse/useBrowseFilters.js";
import { searchProducts, getTrendingProducts } from "../api/searchApi";
import { CATEGORY_ITEMS } from "../../product/constants/categories.js";
import { useCampus } from "../../../context/CampusContext.jsx";
import { FiltersEmptyState, SearchEmptyState } from "../../../components/ui/EmptyStates.jsx";

const PAGE_SIZE = 12;

const SORTS = [
  { value: "relevant", label: "Most relevant" },
  { value: "latest", label: "Newest first" },
  { value: "price_low", label: "Price: Low to High" },
  { value: "price_high", label: "Price: High to Low" },
];

const SearchResults = () => {
  const [params, setParams] = useSearchParams();
  const { campusSlug, campus, refreshDirectory } = useCampus();
  const campusName = campus?.name || campus?.short_name || "your campus";

  const query = (params.get("q") || "").trim();
  const rawCategory = params.get("category") || "";
  const category = CATEGORY_ITEMS.some((c) => c.value === rawCategory && !c.girlsOnly) ? rawCategory : "";

  const filters = useBrowseFilters({ sortOptions: SORTS, defaultSort: "relevant", preserve: ["q", "category"] });

  const [sheetOpen, setSheetOpen] = useState(false);
  const [products, setProducts] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [priceBounds, setPriceBounds] = useState({ min: 0, max: 0 });
  const [error, setError] = useState(null);
  const [retryKey, setRetryKey] = useState(0);
  const [trending, setTrending] = useState([]);
  const [trendingLoading, setTrendingLoading] = useState(false);
  const fetchingRef = useRef(false);
  const observerRef = useRef(null);

  useEffect(() => {
    observerRef.current?.disconnect();
    setPage(1);
    setProducts([]);
    setPagination(null);
    setError(null);
  }, [query, category, filters.filterKey, campusSlug]);

  useEffect(() => () => observerRef.current?.disconnect(), []);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!campusSlug || !query || fetchingRef.current) return;
      const isPaging = page > 1;
      try {
        fetchingRef.current = true;
        if (isPaging) setLoadingMore(true);
        else setLoading(true);
        setError(null);
        const res = await searchProducts({
          ...filters.apiParams,
          q: query.slice(0, 100),
          page,
          limit: PAGE_SIZE,
          sort: filters.sort,
          ...(category ? { category } : {}),
          campus_slug: campusSlug,
        });
        if (cancelled) return;
        const items = res.data?.products || [];
        setProducts((prev) => {
          if (!isPaging) return items;
          const seen = new Set(prev.map((p) => p._id));
          return [...prev, ...items.filter((p) => !seen.has(p._id))];
        });
        setPagination(res.data?.pagination || null);
        const price = res.data?.filterMeta?.price;
        if (price) setPriceBounds(price);
      } catch {
        if (!cancelled) setError("Failed to load search results");
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
  }, [query, category, filters.filterKey, campusSlug, page, retryKey]);

  // Empty query: show what's trending instead of a blank page.
  useEffect(() => {
    let cancelled = false;
    if (query || trending.length > 0 || !campusSlug) return undefined;
    setTrendingLoading(true);
    getTrendingProducts({ campus_slug: campusSlug })
      .then((res) => !cancelled && setTrending(res.data?.data || []))
      .catch(() => {})
      .finally(() => !cancelled && setTrendingLoading(false));
    return () => {
      cancelled = true;
    };
  }, [query, trending.length, campusSlug]);

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

  const searchHref = (updates) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(updates)) {
      if (v === "" || v == null) next.delete(k);
      else next.set(k, String(v));
    }
    return `/search?${next.toString()}`;
  };

  const chips = [
    category && {
      key: "category",
      label: CATEGORY_ITEMS.find((c) => c.value === category)?.label || category,
      onRemove: () => filters.update({ category: "" }),
    },
    ...filters.chips,
  ].filter(Boolean);

  const total = pagination?.total ?? null;
  const clearAll = () => {
    setParams(query ? { q: query } : {}, { replace: true });
    setSheetOpen(false);
  };

  return (
    <div className="min-h-[100dvh] bg-[#F7F8FA] pb-24 font-figtree text-slate-900 dark:bg-[#131313] dark:text-white">
      <div className="mx-auto w-full max-w-[1380px] px-5 pt-5 sm:px-[4.5vw] lg:pt-8 2xl:px-0">
        <BrowseHeader
          breadcrumbs={[{ label: "Home", to: "/" }, { label: "Search" }]}
          title={query ? <>“{query}”</> : "Search"}
          meta={
            query
              ? `Search results at ${campusName}`
              : "Use the search bar to find textbooks, gadgets, cycles and more."
          }
        >
          {query && (
            <CategoryRail
              options={CATEGORY_ITEMS.filter((c) => !c.girlsOnly)}
              activeValue={category || null}
              allTo={searchHref({ category: "" })}
              linkFor={(value) => searchHref({ category: value })}
            />
          )}
        </BrowseHeader>

        {!campusSlug ? (
          <div className="mt-8">
            <BrowseError
              message="We couldn't load your campus."
              onRetry={() => {
                refreshDirectory?.();
                setRetryKey((k) => k + 1);
              }}
            />
          </div>
        ) : query ? (
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
                noun={total === 1 ? "result" : "results"}
                chips={chips}
                onClearAll={clearAll}
                filterButton={<MobileFilterButton activeCount={filters.activeCount} onClick={() => setSheetOpen(true)} />}
                sort={<SortSelect value={filters.sort} options={SORTS} onChange={filters.setSort} />}
              />

              {error && products.length === 0 ? (
                <BrowseError message="We couldn't load search results." onRetry={() => setRetryKey((k) => k + 1)} />
              ) : loading && products.length === 0 ? (
                <ProductGridSkeleton count={9} className={BROWSE_GRID} />
              ) : (
                products.length > 0 && (
                  <div className={BROWSE_GRID}>
                    {products.map((product, index) => (
                      <ProductCard
                        key={product._id}
                        product={product}
                        ref={products.length === index + 1 ? lastProductRef : null}
                      />
                    ))}
                  </div>
                )
              )}

              {!loading && !error && products.length === 0 && (
                <div className="pt-2">
                  {filters.hasFilters || category ? (
                    <FiltersEmptyState onClear={clearAll} />
                  ) : (
                    <SearchEmptyState query={query} />
                  )}
                </div>
              )}

              {error && products.length > 0 && (
                <div className="mt-6">
                  <BrowseError message="We couldn't load more results." onRetry={() => setRetryKey((k) => k + 1)} />
                </div>
              )}
              {loadingMore && (
                <div className="mt-10 flex justify-center">
                  <BrandLoader size="sm" label="Loading more results" />
                </div>
              )}
              {!loading && !loadingMore && !error && !hasMore && products.length > 0 && (
                <div className="mt-12">
                  <EndOfResults label="That's everything matching your search" cta={{ label: "Explore all listings", to: "/explore" }} />
                </div>
              )}
            </main>
          </div>
        ) : (
          (trendingLoading || trending.length > 0) && (
            <section className="mt-6 border-t border-neutral-200/80 pt-6 dark:border-neutral-800">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Trending at {campusName}</h2>
              <p className="mt-0.5 text-sm text-slate-500 dark:text-zinc-400">What students are checking out right now.</p>
              <div className="mt-5">
                {trendingLoading ? (
                  <ProductGridSkeleton count={8} className={BROWSE_GRID} />
                ) : (
                  <div className={BROWSE_GRID}>
                    {trending.map((product) => (
                      <ProductCard key={product._id} product={product} />
                    ))}
                  </div>
                )}
              </div>
            </section>
          )
        )}
      </div>

      {query && (
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

export default SearchResults;
