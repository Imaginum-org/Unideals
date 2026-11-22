import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Activity, Info, Lock, TrendingUp } from "lucide-react";
import { getPriceInsights, useLabs } from "../../../services/labs.js";
import { cn } from "../../../utils/cn.js";

const inr = (n) => `₹${Number(n).toLocaleString("en-IN")}`;

// Demand levels: muted dots, never a loud badge. Notes describe what the
// numbers show, without promising an outcome.
const LEVEL = {
  high: { label: "High demand", dot: "bg-emerald-500", bars: 3, note: "Similar items are selling or getting buyer chats often on your campus." },
  moderate: { label: "Moderate demand", dot: "bg-amber-500", bars: 2, note: "Steady interest. A fair price helps you stand out." },
  low: { label: "Low demand", dot: "bg-slate-400", bars: 1, note: "Few recent sales or chats here. A lower price can help." },
  insufficient: { label: "Not enough activity yet", dot: "bg-slate-300 dark:bg-zinc-600", bars: 0, note: "Too few listings or sales in this category on your campus to judge." },
};

/** Waits for the seller to stop typing before asking the server. */
const useDebounced = (value, ms) => {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
};

function UseButton({ value, onUsePrice, current }) {
  if (!onUsePrice || value == null) return null;
  const applied = Number(current) === value;
  return (
    <button
      type="button"
      onClick={() => onUsePrice(value)}
      disabled={applied}
      className={cn(
        "h-8 shrink-0 rounded-lg border px-3 text-[12.5px] font-semibold transition-colors",
        applied
          ? "cursor-default border-transparent text-emerald-700 dark:text-emerald-400"
          : "border-neutral-200 bg-white text-[var(--accent-text)] hover:bg-[var(--accent-soft)] dark:border-neutral-700 dark:bg-transparent",
      )}
    >
      {applied ? "✓ Applied" : `Use ${inr(value)}`}
    </button>
  );
}

function Note({ children }) {
  return (
    <p className="mt-1.5 flex items-start gap-1.5 text-[11.5px] leading-relaxed text-slate-500 dark:text-zinc-400">
      <Info className="mt-px h-3 w-3 shrink-0" aria-hidden="true" />
      <span>{children}</span>
    </p>
  );
}

/**
 * Labs: price guide (Pro & Pro+) + demand (Pro+), under the price fields.
 *
 * Deliberately quiet: a thin card under "Your price", never louder than the
 * inputs. Wording matches what the number really is:
 *  - "Similar items sold for": real completed sales, enough of them.
 *  - "Similar listings ask about": asking prices or few samples (rough guide).
 *  - "Rough estimate": no campus data; rule of thumb from original price,
 *    condition and age (`estimate`).
 * Free accounts see a one-line locked hint.
 */
export default function PriceInsights({ category, condition, originalPrice, purchaseDate, estimate, currentPrice, onUsePrice }) {
  const { has, loading: labsLoading } = useLabs();
  const enabled = has("price_insights");
  const original = useDebounced(Number(originalPrice) >= 50 ? Number(originalPrice) : null, 450);
  const [data, setData] = useState(null);
  const [state, setState] = useState("idle"); // idle | loading | ready | error

  useEffect(() => {
    if (!enabled || !category) return undefined;
    let cancelled = false;
    setState((s) => (s === "ready" ? "ready" : "loading"));
    getPriceInsights({
      category,
      ...(condition ? { condition } : {}),
      ...(original ? { originalPrice: String(original) } : {}),
      ...(/^\d{4}-\d{2}-\d{2}$/.test(purchaseDate || "") ? { purchaseDate } : {}),
    })
      .then((d) => {
        if (cancelled) return;
        setData(d);
        setState("ready");
      })
      .catch(() => !cancelled && setState("error"));
    return () => {
      cancelled = true;
    };
  }, [enabled, category, condition, original, purchaseDate]);

  if (!category || labsLoading) return null;

  if (!enabled) {
    return (
      <p className="flex items-center gap-1.5 text-[12px] text-slate-500 dark:text-zinc-400">
        <Lock className="h-3 w-3 shrink-0" aria-hidden="true" />
        <span>
          See what similar items sell for on your campus with Pro.{" "}
          <Link to="/price" className="font-semibold text-[var(--accent-text)] hover:underline">
            See plans
          </Link>
        </span>
      </p>
    );
  }

  const s = data?.suggestion;
  const level = data?.demand ? LEVEL[data.demand.level] || LEVEL.insufficient : null;
  // Only completed sales with enough samples are called "sold for".
  const solid = data?.basis === "sold" && data?.confidence && data.confidence !== "low";
  const adjusted = data?.ageAdjusted ? "condition and age" : "condition";

  return (
    <section
      aria-label="Price guide"
      className="rounded-xl border border-neutral-200 bg-neutral-50/60 px-3.5 py-3 dark:border-neutral-800 dark:bg-white/[0.02]"
    >
      <p className="flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-wide text-slate-500 dark:text-zinc-400">
        <TrendingUp className="h-3.5 w-3.5" aria-hidden="true" />
        Price guide
        <span className="rounded-full px-1.5 text-[10px] font-semibold normal-case tracking-normal text-slate-400 ring-1 ring-neutral-200 dark:text-zinc-500 dark:ring-neutral-700">
          Early access
        </span>
      </p>

      {state === "loading" && (
        <div className="mt-2.5 space-y-1.5" aria-hidden="true">
          <div className="browse-shimmer h-4 w-44 rounded bg-neutral-200/70 dark:bg-white/5" />
          <div className="browse-shimmer h-3 w-64 max-w-full rounded bg-neutral-200/70 dark:bg-white/5" />
        </div>
      )}

      {state === "error" && <p className="mt-2 text-[12.5px] text-slate-500 dark:text-zinc-400">Couldn&apos;t load campus prices right now.</p>}

      {state === "ready" && data && (
        <>
          {data.enoughData && s ? (
            <>
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                <p className="text-[13px] text-slate-600 dark:text-zinc-300">
                  {solid ? "Similar items sold for" : "Similar listings ask about"}{" "}
                  <span className="text-[15px] font-semibold tabular-nums text-slate-900 dark:text-white">{inr(s.suggested)}</span>
                  <span className="text-slate-500 dark:text-zinc-400">
                    {" "}
                    (usually {inr(s.low)}–{inr(s.high)})
                  </span>
                </p>
                <UseButton value={s.suggested} onUsePrice={onUsePrice} current={currentPrice} />
              </div>
              <Note>
                {solid
                  ? `From ${data.samples} completed sales on your campus, adjusted for your item's ${adjusted}.`
                  : data.basis === "sold"
                    ? `From only ${data.samples} completed sales on your campus, adjusted for ${adjusted}. Treat it as a rough guide.`
                    : `From ${data.samples} asking prices on your campus (no recent sales yet), adjusted for ${adjusted}. Asking prices aren't sale prices, so treat it as a rough guide.`}
              </Note>
            </>
          ) : data.enoughData && !s ? (
            <p className="mt-2 text-[12.5px] leading-relaxed text-slate-600 dark:text-zinc-300">
              Similar items on your campus go for about{" "}
              <strong className="font-semibold">
                {data.ratio.low}–{data.ratio.high}%
              </strong>{" "}
              of their original price. Add the original price for a number.
            </p>
          ) : estimate ? (
            <>
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                <p className="text-[13px] text-slate-600 dark:text-zinc-300">
                  Rough estimate{" "}
                  <span className="text-[15px] font-semibold tabular-nums text-slate-900 dark:text-white">{inr(estimate)}</span>
                </p>
                <UseButton value={estimate} onUsePrice={onUsePrice} current={currentPrice} />
              </div>
              <Note>Not enough similar items on your campus yet. This is a general rule of thumb from the original price, condition and age.</Note>
            </>
          ) : (
            <p className="mt-2 text-[12.5px] text-slate-500 dark:text-zinc-400">
              Not enough similar items on your campus yet. Add the original price for a rough estimate.
            </p>
          )}

          {/* Demand (Pro+): one compact row */}
          {data.demand ? (
            <div className="mt-2.5 border-t border-neutral-200 pt-2.5 dark:border-neutral-800">
              <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px] text-slate-600 dark:text-zinc-300">
                <Activity className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                <span className="font-semibold text-slate-700 dark:text-zinc-200">Demand</span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="flex items-end gap-0.5" aria-hidden="true">
                    {[1, 2, 3].map((b) => (
                      <span
                        key={b}
                        className={cn("w-1 rounded-sm", b <= level.bars ? level.dot : "bg-neutral-200 dark:bg-neutral-700")}
                        style={{ height: 3 + b * 3 }}
                      />
                    ))}
                  </span>
                  {level.label}
                </span>
              </p>
              <p className="mt-1 text-[11.5px] leading-relaxed text-slate-500 dark:text-zinc-400">
                {level.note} Last 30 days: {data.demand.sales30} sold, {data.demand.chats30} buyer{" "}
                {data.demand.chats30 === 1 ? "chat" : "chats"}, {data.demand.live} other{" "}
                {data.demand.live === 1 ? "listing" : "listings"} live now.
              </p>
            </div>
          ) : (
            <p className="mt-2.5 border-t border-neutral-200 pt-2.5 text-[11.5px] text-slate-500 dark:border-neutral-800 dark:text-zinc-400">
              <Lock className="mr-1 inline h-3 w-3 align-[-1px]" aria-hidden="true" />
              Campus demand is part of Pro Plus.{" "}
              <Link to="/price" className="font-semibold text-[var(--accent-text)] hover:underline">
                Upgrade
              </Link>
            </p>
          )}
        </>
      )}
    </section>
  );
}
