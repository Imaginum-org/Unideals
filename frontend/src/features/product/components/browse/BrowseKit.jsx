import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  RotateCcw,
  SlidersHorizontal,
  TriangleAlert,
  X,
} from "lucide-react";
import CategoryIcon from "../CategoryIcon.jsx";
import { cn } from "../../../../utils/cn.js";
import Select from "../../../../components/ui/Select.jsx";

/*
 * Shared browse UI for Explore + Category pages.
 *
 * Every piece is a module-level component (never defined inside a page
 * render), so filter controls keep their identity across renders — the old
 * inline `SidebarContent` remounted on every state change, interrupting
 * price-slider drags. Accent colours come from the --accent* CSS tokens, so
 * Girl Mode and dark mode theme everything automatically.
 */

// One grid for every browse page (Explore, Category, Search).
export const BROWSE_GRID = "grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:gap-5 2xl:grid-cols-4";

export const SORT_OPTIONS = [
  { value: "recommended", label: "Recommended" },
  { value: "latest", label: "Newest first" },
  { value: "price_low", label: "Price: Low to High" },
  { value: "price_high", label: "Price: High to Low" },
];


/* ── Breadcrumbs ── */
export function Breadcrumbs({ items }) {
  return (
    <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1 text-[13px] font-medium text-slate-400 dark:text-zinc-500">
      {items.map((item, i) => {
        const last = i === items.length - 1;
        return (
          <span key={item.label} className={cn("flex items-center gap-1", last ? "min-w-0" : "shrink-0")}>
            {item.to && !last ? (
              <Link to={item.to} className="transition-colors hover:text-slate-700 dark:hover:text-zinc-200">
                {item.label}
              </Link>
            ) : (
              <span aria-current={last ? "page" : undefined} className={cn(last && "truncate text-slate-600 dark:text-zinc-300")}>
                {item.label}
              </span>
            )}
            {!last && <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />}
          </span>
        );
      })}
    </nav>
  );
}

/* ── Category chip rail (horizontal, active chip auto-centred) ── */
export function CategoryRail({ options, activeValue, allTo, linkFor }) {
  const railRef = useRef(null);
  const [edges, setEdges] = useState({ left: false, right: false });

  // Scroll affordance: arrows + edge fades only on the side(s) with more
  // chips (same pattern as the Home category row).
  const updateEdges = () => {
    const el = railRef.current;
    if (!el) return;
    setEdges({
      left: el.scrollLeft > 4,
      right: el.scrollLeft < el.scrollWidth - el.clientWidth - 4,
    });
  };

  useEffect(() => {
    const el = railRef.current?.querySelector('[data-active="true"]');
    el?.scrollIntoView({ block: "nearest", inline: "center", behavior: "instant" });
    updateEdges();
  }, [activeValue]);

  useEffect(() => {
    const el = railRef.current;
    if (!el) return undefined;
    updateEdges();
    el.addEventListener("scroll", updateEdges, { passive: true });
    window.addEventListener("resize", updateEdges);
    return () => {
      el.removeEventListener("scroll", updateEdges);
      window.removeEventListener("resize", updateEdges);
    };
  }, []);

  const scrollBy = (dir) =>
    railRef.current?.scrollBy({ left: dir * railRef.current.clientWidth * 0.7, behavior: "smooth" });

  const arrow =
    "absolute top-1/2 z-10 hidden h-8 w-8 -translate-y-1/2 place-items-center rounded-full border border-neutral-200 bg-white text-slate-600 shadow-[0_4px_12px_-4px_rgba(15,23,42,0.18)] transition-colors hover:text-slate-900 sm:grid dark:border-neutral-700 dark:bg-[#1A1D20] dark:text-zinc-300 dark:hover:text-white";
  const mask =
    edges.left && edges.right
      ? "[mask-image:linear-gradient(to_right,transparent,black_48px,black_calc(100%-48px),transparent)]"
      : edges.left
        ? "[mask-image:linear-gradient(to_right,transparent,black_48px)]"
        : edges.right
          ? "[mask-image:linear-gradient(to_left,transparent,black_48px)]"
          : "";

  const chip = (active) =>
    cn(
      "inline-flex h-10 shrink-0 items-center gap-2 rounded-full border pl-2 pr-4 text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)]",
      active
        ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent-text)] shadow-[0_6px_16px_-10px_var(--accent-ring)]"
        : "border-neutral-200 bg-white text-slate-600 hover:border-neutral-300 hover:text-slate-900 dark:border-neutral-800 dark:bg-[#1A1D20] dark:text-zinc-300 dark:hover:border-neutral-700 dark:hover:text-white",
    );

  return (
    <div className="relative -mx-1">
      {edges.left && (
        <button type="button" onClick={() => scrollBy(-1)} aria-label="Scroll categories left" className={cn(arrow, "left-1")}>
          <ChevronLeft className="h-4 w-4" />
        </button>
      )}
      {edges.right && (
        <button type="button" onClick={() => scrollBy(1)} aria-label="Scroll categories right" className={cn(arrow, "right-1")}>
          <ChevronRight className="h-4 w-4" />
        </button>
      )}
      <div
        ref={railRef}
        className={cn("no-scrollbar flex gap-2 overflow-x-auto scroll-smooth px-1 py-1", mask)}
        aria-label="Categories"
      >
        <Link to={allTo} data-active={!activeValue} aria-current={!activeValue ? "page" : undefined} className={chip(!activeValue)}>
          <span className="grid h-7 w-7 place-items-center rounded-full bg-[var(--accent-soft)] text-[var(--accent-text)]">
            <LayoutGrid className="h-3.5 w-3.5" strokeWidth={2.4} />
          </span>
          All
        </Link>
        {options.map((o) => {
          const active = o.value === activeValue;
          return (
            <Link
              key={o.value}
              to={linkFor(o.value)}
              data-active={active}
              aria-current={active ? "page" : undefined}
              className={chip(active)}
            >
              <span className={cn("grid h-7 w-7 place-items-center rounded-full", active ? "bg-white dark:bg-white/10" : "bg-[#F4F5F9] dark:bg-white/5")}>
                <CategoryIcon value={o.value} className="h-5 w-5" />
              </span>
              {o.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

/* ── Sort select (native for accessibility, styled) ── */
export function SortSelect({ value, onChange, options = SORT_OPTIONS }) {
  return (
    <Select
      variant="toolbar"
      align="right"
      prefix="Sort by"
      value={value}
      onChange={onChange}
      options={options}
      ariaLabel="Sort listings"
      className="min-w-0 flex-1 sm:flex-none"
      triggerClassName="w-full"
    />
  );
}

/* ── Active filter chips ── */
export function ActiveFilterChips({ chips, onClearAll }) {
  if (!chips.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      {chips.map((c) => (
        <span
          key={c.key}
          className="inline-flex h-8 items-center gap-1 rounded-full border border-[var(--accent-soft-strong)] bg-[var(--accent-soft)] pl-3 pr-1 text-[13px] font-medium text-[var(--accent-text)]"
        >
          {c.label}
          <button
            type="button"
            onClick={c.onRemove}
            aria-label={`Remove ${c.label}`}
            className="grid h-6 w-6 place-items-center rounded-full transition-colors hover:bg-[var(--accent-soft-strong)]"
          >
            <X className="h-3.5 w-3.5" strokeWidth={2.4} />
          </button>
        </span>
      ))}
      <button
        type="button"
        onClick={onClearAll}
        className="ml-1 text-[13px] font-semibold text-slate-500 underline-offset-4 hover:text-slate-800 hover:underline dark:text-zinc-400 dark:hover:text-white"
      >
        Clear all
      </button>
    </div>
  );
}

/* ── Page header ──────────────────────────────────────────────────
   Plain and informative, same language as the account pages: breadcrumb,
   title, one line of context. The category rail (navigation) sits under
   it. No decoration that doesn't carry information. */
export function BrowseHeader({ breadcrumbs, title, meta, children }) {
  return (
    <header>
      {breadcrumbs && <Breadcrumbs items={breadcrumbs} />}
      <h1 className="mt-2.5 truncate text-[24px] font-semibold tracking-tight text-slate-900 sm:text-[28px] dark:text-white">
        {title}
      </h1>
      {meta && <p className="mt-1 text-[13.5px] text-slate-500 sm:text-sm dark:text-zinc-400">{meta}</p>}
      {children && <div className="mt-5">{children}</div>}
    </header>
  );
}

/* ── Results toolbar: count on the left, Filters (mobile) + Sort on the
   right, active filter chips underneath. Sort lives next to the grid it
   controls (marketplace convention), not up in the page header. */
export function ResultsToolbar({ shown, total, noun = "listings", chips = [], onClearAll, filterButton, sort }) {
  return (
    <div className="mb-5 flex flex-col gap-3">
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="min-h-5 text-[13px] text-slate-500 dark:text-zinc-400" aria-live="polite">
          {shown > 0 && (
            <>
              Showing <span className="font-semibold tabular-nums text-slate-800 dark:text-zinc-100">{shown.toLocaleString("en-IN")}</span>
              {total != null && total > shown && (
                <>
                  {" "}of <span className="font-semibold tabular-nums text-slate-800 dark:text-zinc-100">{total.toLocaleString("en-IN")}</span>
                </>
              )}{" "}
              {noun}
            </>
          )}
        </p>
        {(filterButton || sort) && (
          <div className="flex w-full items-center gap-2 sm:w-auto">
            {filterButton}
            {sort}
          </div>
        )}
      </div>
      <ActiveFilterChips chips={chips} onClearAll={onClearAll} />
    </div>
  );
}

/* ── Loading skeleton grid (mirrors ProductCard) ── */
export function ProductGridSkeleton({ count = 8, className }) {
  return (
    <div className={className} aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="rounded-2xl border border-neutral-100 bg-white p-3 dark:border-neutral-800 dark:bg-[#1A1D20]">
          <div className="browse-shimmer aspect-[6/5] w-full rounded-xl bg-neutral-100 dark:bg-white/5" />
          <div className="browse-shimmer mt-3 h-3 w-1/3 rounded-full bg-neutral-100 dark:bg-white/5" />
          <div className="browse-shimmer mt-2.5 h-4 w-4/5 rounded-full bg-neutral-100 dark:bg-white/5" />
          <div className="browse-shimmer mt-2 h-4 w-1/2 rounded-full bg-neutral-100 dark:bg-white/5" />
          <div className="mt-4 flex items-center gap-2">
            <div className="browse-shimmer h-6 w-6 rounded-full bg-neutral-100 dark:bg-white/5" />
            <div className="browse-shimmer h-3 w-1/3 rounded-full bg-neutral-100 dark:bg-white/5" />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Inline error card ── */
export function BrowseError({ message = "We couldn't load listings right now.", onRetry }) {
  return (
    <div role="alert" className="flex flex-col items-center gap-3 rounded-2xl border border-red-100 bg-red-50/60 px-6 py-8 text-center dark:border-red-900/40 dark:bg-red-950/20">
      <span className="grid h-10 w-10 place-items-center rounded-full bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-300">
        <TriangleAlert className="h-5 w-5" />
      </span>
      <div>
        <p className="text-[15px] font-semibold text-slate-900 dark:text-white">Something went wrong</p>
        <p className="mt-1 text-sm text-slate-500 dark:text-zinc-400">{message} Check your connection and try again.</p>
      </div>
      <button
        type="button"
        onClick={onRetry}
        className="mt-1 inline-flex h-10 items-center gap-2 rounded-lg bg-[var(--accent)] px-5 text-sm font-semibold text-white transition-colors hover:bg-[var(--accent-hover)]"
      >
        <RotateCcw className="h-4 w-4" />
        Try again
      </button>
    </div>
  );
}

/* ── Load more + end of results ── */
export function LoadMoreButton({ onClick, loading, remaining }) {
  return (
    <div className="flex w-full max-w-xl items-center gap-4 self-center">
      <span aria-hidden="true" className="h-px flex-1 bg-gradient-to-r from-transparent to-neutral-200 dark:to-neutral-800" />
      <button
        type="button"
        onClick={onClick}
        disabled={loading}
        className="group inline-flex h-11 shrink-0 items-center gap-2 rounded-lg border border-neutral-200 bg-white pl-5 pr-4 text-sm font-semibold text-slate-800 shadow-[0_1px_2px_rgba(15,23,42,0.06)] transition-all duration-200 hover:-translate-y-px hover:border-[var(--accent)] hover:text-[var(--accent-text)] disabled:opacity-60 dark:border-neutral-700 dark:bg-[#1A1D20] dark:text-zinc-100"
      >
        {loading ? "Loading…" : remaining > 0 ? `Load more (${remaining.toLocaleString("en-IN")} left)` : "Load more"}
        <span className="grid h-6 w-6 place-items-center rounded-full bg-[var(--accent-soft)] text-[var(--accent-text)] transition-transform group-hover:translate-y-0.5">
          <ChevronDown className="h-3.5 w-3.5" strokeWidth={2.6} />
        </span>
      </button>
      <span aria-hidden="true" className="h-px flex-1 bg-gradient-to-l from-transparent to-neutral-200 dark:to-neutral-800" />
    </div>
  );
}

export function EndOfResults({ label = "You've seen everything here", cta }) {
  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <p className="text-[13px] font-medium text-slate-400 dark:text-zinc-500">{label} ✨</p>
      {cta ? (
        <Link
          to={cta.to}
          className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[var(--accent-text)] hover:underline"
        >
          {cta.label}
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      ) : null}
    </div>
  );
}

/* ── Mobile filter trigger + bottom sheet ── */
export function MobileFilterButton({ activeCount, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-10 shrink-0 items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3.5 text-sm font-semibold text-slate-800 shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:border-neutral-800 dark:bg-[#1A1D20] dark:text-zinc-100 lg:hidden"
    >
      <SlidersHorizontal className="h-4 w-4" />
      Filters
      {activeCount > 0 && (
        <span className="grid h-5 min-w-5 place-items-center rounded-full bg-[var(--accent)] px-1.5 text-[11px] font-bold text-white">
          {activeCount}
        </span>
      )}
    </button>
  );
}

export function MobileFilterSheet({ open, onClose, onReset, activeCount, resultLabel, children }) {
  useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[80] lg:hidden" role="dialog" aria-modal="true" aria-label="Filters">
          <motion.div
            className="absolute inset-0 bg-slate-950/40 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="absolute inset-x-0 bottom-0 flex max-h-[88dvh] flex-col rounded-t-3xl bg-white shadow-2xl dark:bg-[#1A1D20]"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 380, damping: 38 }}
          >
            <div className="mx-auto mt-2.5 h-1.5 w-10 rounded-full bg-neutral-200 dark:bg-neutral-700" />
            <div className="flex items-center justify-between px-5 pb-2 pt-3">
              <span className="text-base font-semibold text-slate-900 dark:text-white">Filters</span>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close filters"
                className="grid h-9 w-9 place-items-center rounded-full bg-neutral-100 text-slate-500 dark:bg-white/10 dark:text-zinc-300"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 pb-4">{children}</div>
            <div className="flex items-center gap-3 border-t border-neutral-100 px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 dark:border-neutral-800">
              <button
                type="button"
                onClick={onReset}
                disabled={!activeCount}
                className="h-12 rounded-lg px-4 text-sm font-semibold text-slate-600 disabled:opacity-40 dark:text-zinc-300"
              >
                Reset
              </button>
              <button
                type="button"
                onClick={onClose}
                className="h-12 flex-1 rounded-lg bg-[var(--accent)] text-sm font-semibold text-white shadow-[0_10px_24px_-12px_var(--accent-ring)] transition-colors hover:bg-[var(--accent-hover)]"
              >
                {resultLabel}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
