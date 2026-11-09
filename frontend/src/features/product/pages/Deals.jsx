import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import ProductCard from "../components/ProductCard.jsx";
import { BROWSE_GRID, BrowseError, BrowseHeader, EndOfResults, ProductGridSkeleton } from "../components/browse/BrowseKit.jsx";
import { getBoostedProducts } from "../api/productApi";
import { useCampus } from "../../../context/CampusContext.jsx";
import Seo from "../../../components/Seo.jsx";

/*
 * Limited time deals: every boosted listing on this campus, soonest to end
 * first. Linked from the Home rail's "View all".
 */
export default function Deals() {
  const { campusSlug, campus } = useCampus();
  const [params] = useSearchParams();
  const girls = params.get("tab") === "girls";
  const campusName = campus?.name || campus?.short_name || "your campus";
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    if (!campusSlug) return;
    setLoading(true);
    setError(false);
    try {
      const res = await getBoostedProducts({ campus_slug: campusSlug, limit: 48, ...(girls ? { audience: "girls_only" } : {}) });
      const list = (res.data?.data || []).filter((p) => (girls ? p.isGirlsOnly === true : true));
      // Ending soonest first: that's what makes them "limited time".
      list.sort((a, b) => new Date(a.boost_expires_at) - new Date(b.boost_expires_at));
      setItems(list);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [campusSlug, girls]);

  // Arriving from the Home rail mid-page: always start at the top.
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="min-h-[100dvh] bg-[#F7F8FA] pb-24 font-figtree text-slate-900 dark:bg-[#131313] dark:text-white">
      <Seo title="Limited time deals | Unideals" />
      <div className="mx-auto w-full max-w-[1380px] px-5 pt-5 sm:px-[4.5vw] lg:pt-8 2xl:px-0">
        <BrowseHeader
          breadcrumbs={[{ label: "Home", to: "/" }, { label: "Limited time deals" }]}
          title="Limited time deals"
          meta={
            loading
              ? `Boosted listings at ${campusName}`
              : `${items.length} boosted listing${items.length === 1 ? "" : "s"} at ${campusName}, ending soonest first`
          }
        />

        <div className="mt-6">
          {error ? (
            <BrowseError onRetry={load} />
          ) : loading ? (
            <ProductGridSkeleton count={8} className={BROWSE_GRID} />
          ) : items.length === 0 ? (
            <div className="rounded-2xl border border-neutral-200/80 bg-white px-6 py-12 text-center dark:border-neutral-800 dark:bg-[#1A1D20]">
              <p className="text-[15px] font-semibold">No deals running right now</p>
              <p className="mt-1 text-[13.5px] text-slate-500 dark:text-zinc-400">Check back soon, or boost one of your own listings to feature it here.</p>
            </div>
          ) : (
            <>
              <div className={BROWSE_GRID}>
                {items.map((p, i) => (
                  <ProductCard key={p._id} product={p} showBoostBar boostAccent={i % 2 === 0 ? "purple" : "orange"} />
                ))}
              </div>
              <div className="mt-10">
                <EndOfResults label="That's every deal right now" cta={{ label: "Browse all listings", to: "/explore" }} />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
