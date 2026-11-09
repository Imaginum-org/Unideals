import { RotateCcw, TriangleAlert } from "lucide-react";
import Profile_left_part from "../Profile_left_part.jsx";
import Seo from "../../../../components/Seo.jsx";
import MobileAppBar, { useAppScreen } from "../../../../components/layout/MobileAppBar.jsx";
import { cn } from "../../../../utils/cn.js";

/*
 * Shared shell + building blocks for every account (profile) tab.
 * Same surface language as the product and sell pages: white cards on the
 * soft page background, neutral borders, --accent* tokens (Girl Mode and
 * dark mode theme everything). Phones: no sidebar (MobileAccountMenu covers
 * navigation), flush full-width cards.
 */

export const CARD =
  "rounded-2xl border border-neutral-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:border-neutral-800 dark:bg-[#1A1D20]";
export const FLUSH_ON_PHONE = "max-sm:-mx-4 max-sm:rounded-none max-sm:border-x-0 max-sm:shadow-none";

const WIDTHS = { md: "max-w-3xl", lg: "max-w-4xl", xl: "max-w-5xl", full: "max-w-6xl" };

/**
 * <AccountLayout title description actions width seoTitle>…</AccountLayout>
 *
 * `bare`  skips the page header (pages that render their own hero).
 * `root`  the Profile tab's home (Overview): keeps the site header on
 *         phones. Every other tab is a pushed screen there: native app
 *         bar with back to Profile, site header hidden, large title
 *         folded into the bar.
 * `mobileTitle` / `mobileAction` / `backTo` tune that app bar.
 */
export function AccountLayout({
  title,
  description,
  actions,
  width = "lg",
  seoTitle,
  bare = false,
  root = false,
  mobileTitle,
  mobileAction,
  backTo = "/profile",
  children,
}) {
  useAppScreen(!root);
  const barTitle = mobileTitle || title;
  return (
    <>
      {seoTitle && <Seo title={seoTitle} robots="noindex,nofollow" />}
      <div className="w-full bg-[#F7F9FD] font-figtree text-slate-900 dark:bg-[#131313] dark:text-white">
        <div className="flex md:h-[calc(100dvh-var(--header-h))]">
          <aside className="hidden shrink-0 md:block">
            <Profile_left_part />
          </aside>
          {/* `relative` keeps absolutely positioned descendants (e.g. sr-only labels)
              inside the scroll pane; otherwise they stretch the document and the
              whole page scrolls instead of just this column. */}
          <main className="relative min-w-0 flex-1 md:h-full md:overflow-y-auto">
            {!root && barTitle && <MobileAppBar title={barTitle} backTo={backTo} action={mobileAction} />}
            <div className={cn("mx-auto w-full px-4 pb-12 pt-4 sm:px-6 sm:pt-6 lg:px-8 lg:pt-8", WIDTHS[width] || WIDTHS.lg)}>
              {!bare && (title || actions) && (
                <PageHeader title={title} description={description} actions={actions} titleOnPhone={root || !barTitle} />
              )}
              {children}
            </div>
          </main>
        </div>
      </div>
    </>
  );
}

export function PageHeader({ title, description, actions, className, titleOnPhone = true }) {
  return (
    <header className={cn("mb-4 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="min-w-0">
        <h1 className={cn("text-[22px] font-semibold tracking-tight text-slate-900 sm:text-[26px] dark:text-white", !titleOnPhone && "max-sm:sr-only")}>
          {title}
        </h1>
        {description && <p className="mt-1 text-[13.5px] text-slate-500 max-sm:mt-0 dark:text-zinc-400">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2 max-sm:[&>*]:flex-1">{actions}</div>}
    </header>
  );
}

/** Titled card. `padded={false}` for lists that run edge to edge. */
export function Panel({ title, description, icon: Icon, actions, padded = true, className, bodyClassName, children }) {
  return (
    <section className={cn(CARD, FLUSH_ON_PHONE, "overflow-hidden", className)}>
      {(title || actions) && (
        <div className="flex items-start justify-between gap-3 border-b border-neutral-100 px-4 py-3.5 sm:px-5 dark:border-neutral-800">
          <div className="flex min-w-0 items-start gap-2.5">
            {Icon && (
              <Icon className="h-4 w-4 shrink-0 mt-0.5 text-slate-400 dark:text-zinc-500" aria-hidden="true" />
            )}
            <div className="min-w-0">
              <h2 className="text-[15px] font-semibold tracking-tight text-slate-900 dark:text-white">{title}</h2>
              {description && <p className="mt-0.5 text-[12.5px] text-slate-500 dark:text-zinc-400">{description}</p>}
            </div>
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className={cn(padded && "p-4 sm:p-5", bodyClassName)}>{children}</div>
    </section>
  );
}

// `tone` is accepted for compatibility; tiles are neutral now.
// eslint-disable-next-line no-unused-vars
export function StatTile({ label, value, icon: Icon, hint, tone, className }) {
  return (
    <div className={cn(CARD, "flex items-start gap-3 p-4", className)}>
      {Icon && (
        <Icon className="h-[18px] w-[18px] shrink-0 text-slate-400 dark:text-zinc-500" aria-hidden="true" />
      )}
      <div className="min-w-0">
        <p className="truncate text-[12.5px] font-medium text-slate-500 dark:text-zinc-400">{label}</p>
        <p className="mt-0.5 text-[20px] font-semibold leading-tight tracking-tight tabular-nums text-slate-900 dark:text-white">{value}</p>
        {hint && <p className="mt-0.5 truncate text-[12px] text-slate-400 dark:text-zinc-500">{hint}</p>}
      </div>
    </div>
  );
}

/**
 * Segmented filter tabs with optional counts. Scrolls horizontally on
 * narrow screens instead of wrapping.
 */
export function TabBar({ tabs, value, onChange, ariaLabel = "Filter", className, stretch = false }) {
  return (
    <div className={cn("-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0", className)}>
      <div
        role="tablist"
        aria-label={ariaLabel}
        className={cn("inline-flex gap-1 rounded-lg bg-neutral-100 p-1 dark:bg-white/5", stretch && "max-sm:flex max-sm:w-full")}
      >
        {tabs.map((t) => {
          const active = t.value === value;
          return (
            <button
              key={t.value}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onChange(t.value)}
              className={cn(
                "inline-flex h-8 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-3 text-[13px] font-semibold transition-colors",
                stretch && "max-sm:h-9 max-sm:flex-1",
                active
                  ? "bg-white text-slate-900 shadow-sm dark:bg-[#1A1D20] dark:text-white"
                  : "text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-zinc-200",
              )}
            >
              {t.label}
              {t.count > 0 && (
                <span
                  className={cn(
                    "rounded-full px-1.5 text-[11px] tabular-nums",
                    active ? "bg-[var(--accent-soft)] text-[var(--accent-text)]" : "bg-neutral-200/70 text-slate-500 dark:bg-white/10 dark:text-zinc-400",
                  )}
                >
                  {t.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function ErrorState({ message = "Something went wrong.", onRetry, className }) {
  return (
    <div role="alert" className={cn(CARD, "flex flex-col items-center gap-3 px-6 py-10 text-center", className)}>
      <TriangleAlert className="h-5 w-5 shrink-0 text-red-500" aria-hidden="true" />
      <div>
        <p className="text-[15px] font-semibold text-slate-900 dark:text-white">Couldn&apos;t load this</p>
        <p className="mt-1 text-[13px] text-slate-500 dark:text-zinc-400">{message}</p>
      </div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex h-9 items-center gap-2 rounded-lg bg-[var(--accent)] px-4 text-[13.5px] font-semibold text-white transition-colors hover:bg-[var(--accent-hover)]"
        >
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
          Try again
        </button>
      )}
    </div>
  );
}

/** Row skeletons for list pages. */
export function ListSkeleton({ rows = 4, className }) {
  const bar = "browse-shimmer rounded-full bg-neutral-100 dark:bg-white/5";
  return (
    <div className={cn("flex flex-col gap-3", className)} aria-hidden="true">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className={cn(CARD, "flex items-center gap-4 p-4")}>
          <div className="browse-shimmer h-16 w-16 shrink-0 rounded-xl bg-neutral-100 dark:bg-white/5" />
          <div className="flex-1 space-y-2">
            <div className={cn(bar, "h-3.5 w-1/2")} />
            <div className={cn(bar, "h-3 w-1/3")} />
          </div>
          <div className={cn(bar, "h-4 w-14")} />
        </div>
      ))}
    </div>
  );
}

/** Primary / secondary button classes shared across tabs. */
export const btnPrimary =
  "inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-[var(--accent)] px-4 text-[13.5px] font-semibold text-white shadow-sm transition-colors hover:bg-[var(--accent-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)] disabled:cursor-not-allowed disabled:opacity-60";
export const btnSecondary =
  "inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-neutral-200 bg-white px-3.5 text-[13.5px] font-semibold text-slate-700 transition-colors hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)] disabled:cursor-not-allowed disabled:opacity-60 dark:border-neutral-700 dark:bg-[#1A1D20] dark:text-zinc-200 dark:hover:bg-white/5";
export const btnDanger =
  "inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-neutral-200 bg-white px-3.5 text-[13.5px] font-semibold text-red-600 transition-colors hover:border-red-200 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-neutral-700 dark:bg-[#1A1D20] dark:text-red-400 dark:hover:bg-red-950/20";
