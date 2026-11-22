import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { LayoutGrid, Plus, RotateCcw, Search, X } from "lucide-react";
import Seo from "../../../components/Seo.jsx";
import EmptyState from "../../../components/ui/EmptyState.jsx";
import Select from "../../../components/ui/Select.jsx";
import { cn } from "../../../utils/cn.js";
import {
  BrowseError,
  Breadcrumbs,
  EndOfResults,
  LoadMoreButton,
  ProductGridSkeleton,
} from "../../product/components/browse/BrowseKit.jsx";
import RentGate from "../components/RentGate.jsx";
import BlockSetupSheet from "../components/BlockSetupSheet.jsx";
import { RentCard, RequestCard, RequestGridSkeleton } from "../components/RentKit.jsx";
import { RENT_CATEGORIES } from "../constants/rentOptions.js";
import { getRentPosts, rentErrorMessage } from "../api/rentApi.js";

/*
 * The Rent & Borrow board. Same frame as Explore (breadcrumbs, title,
 * category rail, results toolbar, marketplace grid) so the rent zone feels
 * like a section of the app, not a separate site. Posting lives in the
 * header ("Post") and the tab bar's + button; activity lives in Profile.
 */

// No filter sidebar here (unlike Explore), so one more column at each size.
const OFFER_GRID = "grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 xl:gap-5 2xl:grid-cols-5 wide:grid-cols-6";
const REQUEST_GRID = "grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3 xl:gap-5 2xl:grid-cols-4";

const chip = (active) =>
  cn(
    "inline-flex h-10 shrink-0 items-center gap-2 rounded-full border pl-2 pr-4 text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)]",
    active
      ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent-text)] shadow-[0_6px_16px_-10px_var(--accent-ring)]"
      : "border-neutral-200 bg-white text-slate-600 hover:border-neutral-300 hover:text-slate-900 dark:border-neutral-800 dark:bg-[#1A1D20] dark:text-zinc-300 dark:hover:border-neutral-700 dark:hover:text-white",
  );

/** Category chips, styled like the marketplace CategoryRail. */
function CategoryChips({ value, onChange }) {
  const options = [{ value: "", label: "All", Icon: LayoutGrid }, ...RENT_CATEGORIES];
  return (
    <div className="-mx-5 overflow-x-auto px-5 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden">
      <div className="flex gap-2 py-1" role="group" aria-label="Categories">
        {options.map(({ value: v, label, Icon }) => {
          const active = value === v;
          return (
            <button key={v || "all"} type="button" aria-pressed={active} onClick={() => onChange(v)} className={chip(active)}>
              <span className={cn("grid h-7 w-7 place-items-center rounded-full", active ? "bg-white dark:bg-white/10" : "bg-[#F4F5F9] dark:bg-white/5")}>
                <Icon className="h-3.5 w-3.5" strokeWidth={2.2} aria-hidden="true" />
              </span>
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Available / Requests: a plain segmented pill, the same language as the
 * chat inbox filters (dark fill for the selected one). Counts are for the
 * current block; open requests keep an amber count so they're noticed.
 */
function BoardSwitch({ value, counts, onChange, className }) {
  const options = [
    { value: "offer", label: "Available" },
    { value: "request", label: "Requests" },
  ];
  return (
    <div
      role="tablist"
      aria-label="Board"
      className={cn(
        "grid grid-cols-2 gap-1 rounded-full border border-neutral-200 bg-white p-1 shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:border-neutral-700 dark:bg-[#1A1D20]",
        className,
      )}
    >
      {options.map(({ value: v, label }) => {
        const active = value === v;
        const count = counts[v];
        const attention = !active && v === "request" && count && count !== "0";
        return (
          <button
            key={v}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(v)}
            className={cn(
              "inline-flex h-10 items-center justify-center gap-2 rounded-full px-5 text-[14px] font-semibold outline-none transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)]",
              active
                ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                : "text-slate-600 hover:bg-neutral-100 hover:text-slate-900 dark:text-zinc-300 dark:hover:bg-white/5 dark:hover:text-white",
            )}
          >
            {label}
            {count != null && (
              <span
                className={cn(
                  "min-w-5 rounded-full px-1.5 text-center text-[12px] font-semibold tabular-nums leading-5",
                  active
                    ? "bg-white/15 text-white dark:bg-slate-900/10 dark:text-slate-900"
                    : attention
                      ? "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300"
                      : "bg-neutral-100 text-slate-500 dark:bg-white/10 dark:text-zinc-400",
                )}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function Board({ rent }) {
  const [params, setParams] = useSearchParams();
  const kind = params.get("tab") === "requests" ? "request" : "offer";
  const category = params.get("category") || "";
  const q = params.get("q") || "";
  const [query, setQuery] = useState(q);
  const [profile, setProfile] = useState(rent.profile);
  const [setupOpen, setSetupOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const reqId = useRef(0);
  const [counts, setCounts] = useState({ offer: null, request: null });

  const myBlock = profile?.block || null;
  const scope = myBlock && params.get("block") !== "all" ? "mine" : "all";
  const blockFilter = scope === "mine" ? myBlock : "all";
  const campusName = rent.config?.campus?.name || "your campus";

  // First visit: ask for the block before anything else.
  useEffect(() => {
    if (rent.profile && !rent.profile.isSetUp) setSetupOpen(true);
  }, [rent.profile]);

  const update = useCallback(
    (patch) => {
      const next = new URLSearchParams(params);
      for (const [k, v] of Object.entries(patch)) {
        if (v === null || v === "" || v === undefined) next.delete(k);
        else next.set(k, v);
      }
      setParams(next, { replace: true });
    },
    [params, setParams],
  );

  // Debounced search into the URL.
  useEffect(() => {
    const t = setTimeout(() => {
      if (q !== query.trim()) update({ q: query.trim() || null });
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const load = useCallback(
    async (pageNo, append) => {
      const id = ++reqId.current;
      setLoading(true);
      setError(null);
      try {
        const data = await getRentPosts({ kind, page: pageNo, block: blockFilter, category: category || undefined, q: q || undefined });
        if (id !== reqId.current) return;
        setItems((prev) => (append ? [...prev, ...data.items] : data.items));
        setHasMore(data.hasMore);
        setPage(pageNo);
      } catch (err) {
        if (id === reqId.current) setError(rentErrorMessage(err, "We couldn't load the board right now."));
      } finally {
        if (id === reqId.current) setLoading(false);
      }
    },
    [kind, blockFilter, category, q],
  );

  useEffect(() => {
    load(1, false);
  }, [load]);

  // Counts on the Available / Requests switch (whole block, no filters).
  useEffect(() => {
    let cancelled = false;
    const countOf = (data) => `${data.items.length}${data.hasMore ? "+" : ""}`;
    Promise.all(
      ["offer", "request"].map((k) =>
        getRentPosts({ kind: k, page: 1, block: blockFilter })
          .then(countOf)
          .catch(() => null),
      ),
    ).then(([offer, request]) => !cancelled && setCounts({ offer, request }));
    return () => {
      cancelled = true;
    };
  }, [blockFilter]);

  const isRequests = kind === "request";
  const filtered = Boolean(category || q);
  const where = scope === "mine" ? myBlock : "all blocks";
  const showSkeleton = loading && items.length === 0 && !error;
  const allBlocks = scope === "mine" ? { label: "All blocks", onClick: () => update({ block: "all" }) } : undefined;

  const empty = filtered
    ? {
        variant: "filters",
        title: q ? `Nothing matches “${q}”` : "Nothing in this category yet",
        description: scope === "mine" ? "Try another category, or look across all blocks." : "Try another category or a shorter search.",
        primaryAction: {
          label: "Clear filters",
          icon: RotateCcw,
          onClick: () => {
            setQuery("");
            update({ category: null, q: null });
          },
        },
        secondaryAction: allBlocks,
      }
    : isRequests
      ? {
          variant: "search",
          title: scope === "mine" ? `No requests in ${myBlock} right now` : "No requests right now",
          description: "When someone needs an iron, a charger or a racket, it shows up here. Need something yourself? Ask, and your block gets a ping.",
          primaryAction: { label: "Ask for something", to: "/rent/new?kind=request", icon: Plus },
          secondaryAction: allBlocks,
        }
      : {
          variant: "listings",
          title: scope === "mine" ? `Nothing to borrow in ${myBlock} yet` : "Nothing to borrow yet",
          description: "Got a racket, an iron or a kettle you rarely use? Rent it out or lend it, and people near you can borrow it tonight.",
          primaryAction: { label: "Post an item", to: "/rent/new", icon: Plus },
          secondaryAction: allBlocks,
        };

  const noun = isRequests ? (items.length === 1 ? "request" : "requests") : items.length === 1 ? "item" : "items";
  const allBlocksHref = `/rent?${new URLSearchParams({ ...Object.fromEntries(params), block: "all" })}`;

  return (
    <div className="min-h-[100dvh] bg-[#F7F8FA] pb-24 font-figtree text-slate-900 dark:bg-[#131313] dark:text-white">
      <Seo title="Rent & Borrow | Unideals" robots="noindex,nofollow" />

      <div className="mx-auto w-full max-w-[calc(var(--page-max)+9vw)] px-5 pt-5 sm:px-[4.5vw] lg:pt-8 2xl:max-w-[var(--page-max)] 2xl:px-0">
        <header>
          <Breadcrumbs items={[{ label: "Home", to: "/" }, { label: "Rent & Borrow" }]} />
          {/* Title on the left, the Available / Requests switch at the end of the same line */}
          <div className="mt-2.5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between md:gap-8">
            <div className="min-w-0">
              <h1 className="text-[24px] font-semibold tracking-tight sm:text-[28px]">Rent & Borrow</h1>
              <p className="mt-1 text-[13.5px] text-slate-500 sm:text-sm dark:text-zinc-400">
                Rent, borrow or pick up things from students at {campusName}.
              </p>
            </div>
            <BoardSwitch
              value={kind}
              counts={counts}
              onChange={(v) => update({ tab: v === "request" ? "requests" : null })}
              className="w-full md:w-[300px] md:shrink-0"
            />
          </div>
          <div className="mt-5">
            <CategoryChips value={category} onChange={(v) => update({ category: v || null })} />
          </div>
        </header>

        <div className="mt-6 border-t border-neutral-200/80 pt-6 dark:border-neutral-800">
          <div className="mb-5 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="min-h-5 text-[13px] text-slate-500 dark:text-zinc-400" aria-live="polite">
              {!showSkeleton && (
                <>
                  {items.length > 0 ? (
                    <>
                      Showing <span className="font-semibold tabular-nums text-slate-800 dark:text-zinc-100">{items.length}</span>
                      {hasMore ? "+" : ""} {noun} in{" "}
                    </>
                  ) : (
                    "Looking in "
                  )}
                  <span className="font-semibold text-slate-800 dark:text-zinc-100">{where}</span>
                  {myBlock && (
                    <>
                      {" · "}
                      <button type="button" onClick={() => setSetupOpen(true)} className="font-semibold text-[var(--accent-text)] hover:underline">
                        Change your block
                      </button>
                    </>
                  )}
                </>
              )}
            </p>
            <div className="flex w-full items-center gap-2 sm:w-auto">
              <label className="relative min-w-0 flex-1 sm:w-64 sm:flex-none">
                <span className="sr-only">Search</span>
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value.slice(0, 60))}
                  placeholder={isRequests ? "Search requests" : "Search items"}
                  className="h-10 w-full rounded-lg border border-neutral-200 bg-white pl-9 pr-8 text-[13.5px] text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent-soft)] dark:border-neutral-700 dark:bg-[#1A1D20] dark:text-white"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery("")}
                    aria-label="Clear search"
                    className="absolute right-2 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-full text-slate-400 hover:bg-neutral-100 hover:text-slate-700 dark:hover:bg-white/10"
                  >
                    <X className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                )}
              </label>
              {myBlock && (
                <Select
                  variant="toolbar"
                  align="right"
                  prefix="Show"
                  value={scope}
                  onChange={(v) => update({ block: v === "all" ? "all" : null })}
                  options={[
                    { value: "mine", label: myBlock },
                    { value: "all", label: "All blocks" },
                  ]}
                  ariaLabel="Which blocks"
                  className="shrink-0"
                />
              )}
            </div>
          </div>

          {error && items.length === 0 ? (
            <BrowseError message={error} onRetry={() => load(1, false)} />
          ) : showSkeleton ? (
            isRequests ? (
              <RequestGridSkeleton count={6} className={REQUEST_GRID} />
            ) : (
              <ProductGridSkeleton count={8} className={OFFER_GRID} />
            )
          ) : items.length === 0 ? (
            <EmptyState {...empty} className="mt-2" />
          ) : (
            <div className={cn(isRequests ? REQUEST_GRID : OFFER_GRID, "transition-opacity duration-200", loading && "opacity-60")}>
              {items.map((post) => (isRequests ? <RequestCard key={post.id} post={post} /> : <RentCard key={post.id} post={post} />))}
            </div>
          )}

          {items.length > 0 && hasMore && (
            <div className="mt-10 flex justify-center">
              <LoadMoreButton onClick={() => load(page + 1, true)} loading={loading} />
            </div>
          )}
          {items.length > 0 && !hasMore && !loading && (
            <div className="mt-12">
              <EndOfResults
                label={scope === "mine" ? `That's everything in ${myBlock}` : "You've seen everything"}
                cta={scope === "mine" ? { label: "See all blocks", to: allBlocksHref } : undefined}
              />
            </div>
          )}
        </div>
      </div>

      <BlockSetupSheet
        open={setupOpen}
        onOpenChange={setSetupOpen}
        blocks={rent.blocks}
        profile={profile}
        firstRun={!profile?.isSetUp}
        onSaved={(saved) => {
          setProfile(saved);
          rent.refresh();
          update({ block: null });
        }}
      />
    </div>
  );
}

export default function RentHome() {
  return <RentGate>{(rent) => <Board rent={rent} />}</RentGate>;
}
