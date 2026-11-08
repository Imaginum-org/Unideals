import { Link } from "react-router-dom";
import { CategoryArt } from "../../features/product/components/CategoryIcon.jsx";
import { cn } from "../../utils/cn.js";

/**
 * EmptyState — the one empty/no-results surface for product lists.
 *
 *   <EmptyState
 *     variant="campus" | "search" | "filters" | "listings" | "wishlist" | "orders"
 *     title="…" description="…"
 *     primaryAction={{ label, to | href | onClick, icon }}
 *     secondaryAction={{ … }}
 *     suggestions={[{ label, value, to }]}   // optional category chips
 *   />
 *
 * Illustrations reuse the flat category art so the empty states feel native
 * to the marketplace. Accent colours follow Girl Mode via .es-* classes
 * (see styles/index.css).
 */

/* ── Illustration building blocks (viewBox 0 0 220 150) ── */
const Backdrop = () => (
  <>
    <circle className="es-tint" cx="110" cy="80" r="62" />
    <circle cx="110" cy="80" r="74" fill="none" className="es-ring" strokeWidth="1" strokeDasharray="2 5" />
    <circle className="es-accent" cx="34" cy="44" r="3" opacity="0.5" />
    <circle className="es-accent" cx="192" cy="58" r="2.4" opacity="0.4" />
    <circle className="es-accent" cx="186" cy="124" r="3.2" opacity="0.3" />
    <path className="es-accent" d="M44 112l1.4 3 3 1.4-3 1.4-1.4 3-1.4-3-3-1.4 3-1.4z" opacity="0.55" />
  </>
);

/** Mini listing card: art tile, two text bars, price pill. */
const MiniCard = ({ x, y, rotate = 0, art, price = true, blank = false }) => (
  <g transform={`translate(${x} ${y}) rotate(${rotate} 28 36)`}>
    <rect x="0" y="2" width="56" height="72" rx="9" className="es-shadow" />
    <rect x="0" y="0" width="56" height="72" rx="9" className="es-card" />
    <rect x="5" y="5" width="46" height="34" rx="6" className="es-tile" />
    {art && !blank && (
      <g transform="translate(14 6) scale(0.58)">
        <CategoryArt value={art} />
      </g>
    )}
    <rect x="6" y="45" width="34" height="4.5" rx="2.25" className="es-bar" />
    <rect x="6" y="53" width="22" height="4.5" rx="2.25" className="es-bar es-bar--soft" />
    {price && <rect x="6" y="61.5" width="18" height="6" rx="3" className="es-accent" />}
  </g>
);

const PlusBadge = ({ cx, cy }) => (
  <g>
    <circle cx={cx} cy={cy} r="11" className="es-accent" />
    <circle cx={cx} cy={cy} r="11" fill="none" stroke="#fff" strokeWidth="2.5" />
    <path d={`M${cx - 4.5} ${cy}h9M${cx} ${cy - 4.5}v9`} stroke="#fff" strokeWidth="2.4" strokeLinecap="round" />
  </g>
);

const ILLUSTRATIONS = {
  // Nothing listed on campus yet: a fan of student listings + "be first".
  campus: () => (
    <>
      <Backdrop />
      <MiniCard x={40} y={46} rotate={-12} art="study_material" />
      <MiniCard x={124} y={46} rotate={12} art="vehicles" />
      <MiniCard x={82} y={34} art="electronics" />
      <PlusBadge cx={136} cy={36} />
    </>
  ),
  // Search returned nothing: magnifier over an empty card.
  search: () => (
    <>
      <Backdrop />
      <MiniCard x={70} y={40} rotate={-6} blank price={false} />
      <g>
        <circle cx="128" cy="78" r="24" className="es-card" />
        <circle cx="128" cy="78" r="24" fill="none" className="es-stroke" strokeWidth="6" />
        <path d="M145 96l15 15" className="es-stroke" strokeWidth="8" strokeLinecap="round" />
        <path d="M119 74c1.5-4 5-6 9-6" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity="0.9" />
        <path d="M120 84h16" className="es-stroke-soft" strokeWidth="3" strokeLinecap="round" />
      </g>
    </>
  ),
  // Filters too narrow: slider panel floating over a card.
  filters: () => (
    <>
      <Backdrop />
      <MiniCard x={56} y={44} rotate={-8} art="clothing" />
      <g transform="translate(98 50)">
        <rect x="0" y="2" width="72" height="62" rx="11" className="es-shadow" />
        <rect x="0" y="0" width="72" height="62" rx="11" className="es-card" />
        {[16, 31, 46].map((y, i) => (
          <g key={y}>
            <rect x="11" y={y - 2} width="50" height="4" rx="2" className="es-bar" />
            <rect x="11" y={y - 2} width={[30, 16, 40][i]} height="4" rx="2" className="es-accent" />
            <circle cx={11 + [30, 16, 40][i]} cy={y} r="5.5" fill="#fff" className="es-stroke" strokeWidth="2.5" />
          </g>
        ))}
      </g>
    </>
  ),
  // Seller has no listings: open box ready to fill.
  listings: () => (
    <>
      <Backdrop />
      <g transform="translate(62 44)">
        <path d="M8 38l40-16 40 16-40 16z" fill="#E59A2F" />
        <path d="M8 38v40l40 16V54z" fill="#F6B957" />
        <path d="M88 38v40L48 94V54z" fill="#E59A2F" />
        <path d="M8 38L-2 24l40-16 10 14z" fill="#F8C878" />
        <path d="M88 38l10-14-40-16-10 14z" fill="#F2AE52" />
        <rect x="26" y="66" width="16" height="4" rx="2" fill="#B9781F" opacity="0.55" />
      </g>
      <PlusBadge cx={150} cy={50} />
      <path className="es-accent" d="M70 36l2 4.4 4.4 2-4.4 2-2 4.4-2-4.4-4.4-2 4.4-2z" />
    </>
  ),
  // Wishlist empty: card + heart.
  wishlist: () => (
    <>
      <Backdrop />
      <MiniCard x={68} y={40} rotate={-6} art="accessories" />
      <g transform="translate(118 58)">
        <circle cx="20" cy="20" r="22" className="es-card" />
        <circle cx="20" cy="20" r="22" fill="none" className="es-ring-solid" strokeWidth="1.5" />
        <path d="M20 31l-9.2-8.6a6 6 0 0 1 9.2-7.6 6 6 0 0 1 9.2 7.6z" className="es-heart" />
      </g>
    </>
  ),
  // No orders: chat bubbles + receipt.
  orders: () => (
    <>
      <Backdrop />
      <g transform="translate(60 40)">
        <rect x="0" y="2" width="58" height="76" rx="8" className="es-shadow" />
        <rect x="0" y="0" width="58" height="76" rx="8" className="es-card" />
        <rect x="9" y="12" width="28" height="5" rx="2.5" className="es-bar" />
        <rect x="9" y="24" width="40" height="4" rx="2" className="es-bar es-bar--soft" />
        <rect x="9" y="33" width="34" height="4" rx="2" className="es-bar es-bar--soft" />
        <path d="M9 50h40" className="es-stroke-soft" strokeWidth="1.2" strokeDasharray="3 3" />
        <rect x="9" y="58" width="22" height="7" rx="3.5" className="es-accent" />
      </g>
      <g transform="translate(118 46)">
        <path d="M4 0h38a8 8 0 0 1 8 8v16a8 8 0 0 1-8 8H18l-9 8v-8H4a8 8 0 0 1-8-8V8a8 8 0 0 1 8-8z" className="es-accent" />
        <circle cx="13" cy="16" r="2.6" fill="#fff" />
        <circle cx="23" cy="16" r="2.6" fill="#fff" />
        <circle cx="33" cy="16" r="2.6" fill="#fff" />
      </g>
      <g transform="translate(128 86)">
        <path d="M42 0H8a8 8 0 0 0-8 8v12a8 8 0 0 0 8 8h22l8 7v-7h4a8 8 0 0 0 8-8V8a8 8 0 0 0-8-8z" className="es-card" />
        <path d="M42 0H8a8 8 0 0 0-8 8v12a8 8 0 0 0 8 8h22l8 7v-7h4a8 8 0 0 0 8-8V8a8 8 0 0 0-8-8z" fill="none" className="es-ring-solid" strokeWidth="1.5" />
        <path d="M16 14l5 5 9-9" fill="none" className="es-stroke" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </>
  ),
};

const ActionButton = ({ action, primary }) => {
  if (!action?.label) return null;
  const Icon = action.icon;
  const className = cn(
    "inline-flex h-10 items-center justify-center gap-2 rounded-lg px-5 text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#1A1D20]",
    primary
      ? "es-primary bg-[#3838EC] text-white shadow-[0_8px_20px_-8px_rgba(56,56,236,0.65)] hover:-translate-y-px hover:bg-[#2F2FD9] focus-visible:ring-[#3838EC]/50"
      : "es-secondary border border-neutral-200 bg-white text-slate-700 hover:border-[#3838EC]/40 hover:text-[#3838EC] focus-visible:ring-[#3838EC]/40 dark:border-neutral-700 dark:bg-transparent dark:text-zinc-200 dark:hover:border-[#6D6DF5] dark:hover:text-white",
  );
  const content = (
    <>
      {Icon ? <Icon className="h-4 w-4" strokeWidth={2.4} aria-hidden="true" /> : null}
      {action.label}
    </>
  );
  if (action.to) {
    return (
      <Link to={action.to} className={className}>
        {content}
      </Link>
    );
  }
  if (action.href) {
    return (
      <a href={action.href} className={className}>
        {content}
      </a>
    );
  }
  return (
    <button type="button" onClick={action.onClick} className={className}>
      {content}
    </button>
  );
};

export default function EmptyState({
  variant = "campus",
  title,
  description,
  primaryAction,
  secondaryAction,
  suggestions,
  suggestionsLabel = "Popular on campus",
  className,
}) {
  const Illustration = ILLUSTRATIONS[variant] || ILLUSTRATIONS.campus;
  return (
    <div
      role="status"
      className={cn(
        "es-surface relative mx-auto flex w-full max-w-2xl flex-col items-center overflow-hidden rounded-3xl border border-neutral-200/80 bg-white px-6 pb-9 pt-7 text-center font-figtree shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:px-10 dark:border-neutral-800 dark:bg-[#1A1D20]",
        className,
      )}
    >
      {/* Soft brand glow behind the illustration */}
      <div
        aria-hidden="true"
        className="es-glow pointer-events-none absolute inset-x-0 top-0 h-48 bg-[radial-gradient(60%_100%_at_50%_0%,rgba(56,56,236,0.08),transparent_70%)]"
      />

      <svg
        viewBox="0 0 220 150"
        className="relative h-auto w-[200px] sm:w-[244px]"
        aria-hidden="true"
      >
        <Illustration />
      </svg>

      <h3 className="relative mt-4 text-lg font-semibold tracking-tight text-[#0F172A] sm:text-xl dark:text-white">
        {title}
      </h3>
      {description ? (
        <p className="relative mt-2 max-w-md text-sm leading-relaxed text-slate-500 dark:text-zinc-400">
          {description}
        </p>
      ) : null}

      {(primaryAction || secondaryAction) && (
        <div className="relative mt-6 flex flex-wrap items-center justify-center gap-3">
          <ActionButton action={primaryAction} primary />
          <ActionButton action={secondaryAction} />
        </div>
      )}

      {suggestions?.length ? (
        <div className="relative mt-7 w-full border-t border-neutral-100 pt-5 dark:border-neutral-800">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400 dark:text-zinc-500">
            {suggestionsLabel}
          </p>
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            {suggestions.map((s) => (
              <Link
                key={s.label}
                to={s.to}
                className="es-chip inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white py-1.5 pl-1.5 pr-3 text-[13px] font-medium text-slate-600 transition-colors hover:border-[#3838EC]/40 hover:text-[#3838EC] dark:border-neutral-700 dark:bg-transparent dark:text-zinc-300 dark:hover:text-white"
              >
                <svg viewBox="0 0 48 48" className="h-5 w-5" aria-hidden="true">
                  <CategoryArt value={s.value} />
                </svg>
                {s.label}
              </Link>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
