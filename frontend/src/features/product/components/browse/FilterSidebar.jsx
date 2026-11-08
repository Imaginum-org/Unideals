import { useEffect, useMemo, useState } from "react";
import { Check } from "lucide-react";
import PriceRangeSlider from "../../../../components/ui/PriceRangeSlider.jsx";
import { PRODUCT_CONDITION_OPTIONS } from "../../constants/productOptions.js";
import { POSTED_OPTIONS, formatINR } from "./useBrowseFilters.js";
import { cn } from "../../../../utils/cn.js";

/* ── Section shell ─────────────────────────────────────────────────── */
function Section({ title, onClear, children, first = false }) {
  return (
    <section className={cn("py-5", !first && "border-t border-neutral-200/80 dark:border-neutral-800")}>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-[13.5px] font-semibold text-slate-900 dark:text-zinc-100">{title}</h3>
        {onClear && (
          <button
            type="button"
            onClick={onClear}
            className="text-[12.5px] font-medium text-[var(--accent-text)] hover:underline"
          >
            Clear
          </button>
        )}
      </div>
      {children}
    </section>
  );
}

/* ── Price ─────────────────────────────────────────────────────────────
   Empty Min/Max = no limit (bounds shown as placeholders). The slider and
   the inputs edit one draft; it applies on slider release, Enter, blur or
   the Apply button (visible only while the draft differs). Quick ranges
   only list bands where this campus actually has listings. */
const PRESETS = [
  { lo: null, hi: 500 },
  { lo: 500, hi: 2000 },
  { lo: 2000, hi: 10000 },
  { lo: 10000, hi: null },
];

const presetLabel = ({ lo, hi }) =>
  lo == null ? `Under ${formatINR(hi)}` : hi == null ? `${formatINR(lo)} & above` : `${formatINR(lo)} – ${formatINR(hi)}`;

const digits = (v) => String(v ?? "").replace(/[^\d]/g, "").slice(0, 8);

function PriceFilter({ bounds, minPrice, maxPrice, onApply }) {
  const { min: bMin, max: bMax } = bounds;
  const ready = bMax > 0 && bMax > bMin;
  const [lo, setLo] = useState(minPrice != null ? String(minPrice) : "");
  const [hi, setHi] = useState(maxPrice != null ? String(maxPrice) : "");

  // Re-sync when the applied filter changes elsewhere (chip ×, Clear all, back button).
  useEffect(() => {
    setLo(minPrice != null ? String(minPrice) : "");
    setHi(maxPrice != null ? String(maxPrice) : "");
  }, [minPrice, maxPrice]);

  const appliedLo = minPrice != null ? String(minPrice) : "";
  const appliedHi = maxPrice != null ? String(maxPrice) : "";
  const dirty = lo !== appliedLo || hi !== appliedHi;
  const reversed = lo !== "" && hi !== "" && Number(lo) > Number(hi);

  const apply = (a = lo, b = hi) => {
    if (a === appliedLo && b === appliedHi) return;
    onApply(a === "" ? null : Number(a), b === "" ? null : Number(b));
  };

  const clamp = (n) => Math.min(bMax, Math.max(bMin, n));
  const sliderValue = [lo === "" ? bMin : clamp(Number(lo)), hi === "" ? bMax : clamp(Number(hi))];
  const toDraft = ([a, b]) => [a <= bMin ? "" : String(a), b >= bMax ? "" : String(b)];

  const presets = useMemo(
    () => (ready ? PRESETS.filter((p) => (p.lo ?? 0) < bMax && (p.hi ?? Infinity) > bMin) : []),
    [ready, bMin, bMax],
  );
  const isPresetActive = (p) => (p.lo ?? null) === (minPrice ?? null) && (p.hi ?? null) === (maxPrice ?? null);

  const input = (label, value, setValue, placeholder) => (
    <label className="min-w-0 flex-1">
      <span className="sr-only">{label} price</span>
      <span className="flex h-10 items-center rounded-lg border border-neutral-200 bg-white px-3 transition-colors focus-within:border-[var(--accent)] focus-within:ring-2 focus-within:ring-[var(--accent-ring)] dark:border-neutral-700 dark:bg-[#131313]">
        <span className="mr-1 text-[13px] text-slate-400">₹</span>
        <input
          inputMode="numeric"
          value={value}
          placeholder={placeholder}
          onChange={(e) => setValue(digits(e.target.value))}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              apply();
            }
          }}
          onBlur={() => apply()}
          aria-label={`${label} price`}
          className="w-full min-w-0 bg-transparent text-[14px] font-medium tabular-nums text-slate-900 outline-none placeholder:font-normal placeholder:text-slate-400 dark:text-zinc-100"
        />
      </span>
    </label>
  );

  return (
    <div>
      <div className="flex items-center gap-2">
        {input("Minimum", lo, setLo, "Min")}
        <span className="text-slate-300 dark:text-zinc-600" aria-hidden="true">–</span>
        {input("Maximum", hi, setHi, "Max")}
      </div>

      {ready && (
        <div className="mt-4 px-1.5">
          <PriceRangeSlider
            min={bMin}
            max={bMax}
            value={sliderValue}
            onChange={(v) => {
              const [a, b] = toDraft(v);
              setLo(a);
              setHi(b);
            }}
            onAfterChange={(v) => {
              const [a, b] = toDraft(v);
              apply(a, b);
            }}
            minDistance={Math.min(50, Math.max(1, Math.floor((bMax - bMin) / 20)))}
          />
          <div className="mt-2 flex justify-between text-[11.5px] tabular-nums text-slate-400 dark:text-zinc-500">
            <span>{formatINR(bMin)}</span>
            <span>{formatINR(bMax)}</span>
          </div>
        </div>
      )}

      {reversed && (
        <p className="mt-2 text-[12px] text-amber-600 dark:text-amber-400">Min is above max. We&apos;ll swap them.</p>
      )}

      {dirty && (
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()} // keep input blur from double-applying
          onClick={() => apply()}
          className="mt-3 h-9 w-full rounded-lg bg-[var(--accent)] text-[13px] font-semibold text-white transition-colors hover:bg-[var(--accent-hover)]"
        >
          Apply price
        </button>
      )}

      {presets.length > 1 && (
        <div className="mt-4 space-y-0.5" role="radiogroup" aria-label="Quick price ranges">
          {presets.map((p) => {
            const active = isPresetActive(p);
            return (
              <button
                key={presetLabel(p)}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => (active ? onApply(null, null) : onApply(p.lo, p.hi))}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-[13.5px] transition-colors",
                  active
                    ? "font-medium text-[var(--accent-text)]"
                    : "text-slate-600 hover:bg-neutral-100 dark:text-zinc-300 dark:hover:bg-white/5",
                )}
              >
                <Radio on={active} />
                {presetLabel(p)}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Radio({ on }) {
  return (
    <span
      className={cn(
        "grid h-4 w-4 shrink-0 place-items-center rounded-full border transition-colors",
        on ? "border-[var(--accent)]" : "border-neutral-300 dark:border-neutral-600",
      )}
      aria-hidden="true"
    >
      {on && <span className="h-2 w-2 rounded-full bg-[var(--accent)]" />}
    </span>
  );
}

function Checkbox({ on }) {
  return (
    <span
      className={cn(
        "grid h-4 w-4 shrink-0 place-items-center rounded-[5px] border transition-colors",
        on ? "border-[var(--accent)] bg-[var(--accent)] text-white" : "border-neutral-300 dark:border-neutral-600",
      )}
      aria-hidden="true"
    >
      {on && <Check className="h-3 w-3" strokeWidth={3.2} />}
    </span>
  );
}

/* ── Sidebar ───────────────────────────────────────────────────────── */
export default function FilterSidebar({ filters, priceBounds, hideHeader = false }) {
  const { conditions, minPrice, maxPrice, posted, offersOnly } = filters;
  return (
    <div className="font-figtree">
      {!hideHeader && (
        <div className="flex items-center justify-between pb-1">
          <h2 className="text-[15px] font-semibold text-slate-900 dark:text-white">Filters</h2>
          {filters.activeCount > 0 && (
            <button
              type="button"
              onClick={filters.clearAll}
              className="text-[13px] font-medium text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white"
            >
              Clear all
            </button>
          )}
        </div>
      )}

      <Section
        title="Price"
        first
        onClear={minPrice != null || maxPrice != null ? () => filters.setPrice(null, null) : null}
      >
        <PriceFilter bounds={priceBounds} minPrice={minPrice} maxPrice={maxPrice} onApply={filters.setPrice} />
      </Section>

      <Section
        title="Condition"
        onClear={conditions.length ? () => filters.update({ condition: "" }) : null}
      >
        <div className="space-y-0.5">
          {PRODUCT_CONDITION_OPTIONS.map((c) => {
            const on = conditions.includes(c.value);
            return (
              <button
                key={c.value}
                type="button"
                role="checkbox"
                aria-checked={on}
                onClick={() => filters.toggleCondition(c.value)}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-[13.5px] transition-colors hover:bg-neutral-100 dark:hover:bg-white/5",
                  on ? "font-medium text-slate-900 dark:text-white" : "text-slate-600 dark:text-zinc-300",
                )}
              >
                <Checkbox on={on} />
                {c.label}
              </button>
            );
          })}
        </div>
      </Section>

      <Section title="Posted" onClear={posted ? () => filters.setPosted("") : null}>
        <div className="space-y-0.5" role="radiogroup" aria-label="Posted within">
          {POSTED_OPTIONS.map((o) => {
            const on = posted === o.value;
            return (
              <button
                key={o.value || "any"}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => filters.setPosted(o.value)}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-[13.5px] transition-colors hover:bg-neutral-100 dark:hover:bg-white/5",
                  on ? "font-medium text-slate-900 dark:text-white" : "text-slate-600 dark:text-zinc-300",
                )}
              >
                <Radio on={on} />
                {o.label}
              </button>
            );
          })}
        </div>
      </Section>

      <Section title="Deal">
        <button
          type="button"
          role="switch"
          aria-checked={offersOnly}
          onClick={() => filters.setOffersOnly(!offersOnly)}
          className="flex w-full items-center justify-between gap-3 rounded-lg px-2 py-1.5 text-left"
        >
          <span>
            <span className="block text-[13.5px] text-slate-700 dark:text-zinc-200">Open to offers</span>
            <span className="block text-[12px] text-slate-400 dark:text-zinc-500">Sellers accepting a lower price</span>
          </span>
          <span
            className={cn(
              "relative h-5 w-9 shrink-0 rounded-full transition-colors",
              offersOnly ? "bg-[var(--accent)]" : "bg-neutral-300 dark:bg-neutral-600",
            )}
            aria-hidden="true"
          >
            <span
              className={cn(
                "absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform",
                offersOnly && "translate-x-4",
              )}
            />
          </span>
        </button>
      </Section>
    </div>
  );
}
