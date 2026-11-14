import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Activity, Info, Lock, Sparkles, TrendingUp } from "lucide-react";
import { getPriceInsights, useLabs } from "../../../services/labs.js";
import { cn } from "../../../utils/cn.js";

const inr = (n) => `₹${Number(n).toLocaleString("en-IN")}`;

const LEVEL = {
  high: {
    label: "High demand",
    cls: "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900",
    bars: 3,
    note: "Items in this category are selling or getting buyer chats quickly on your campus.",
  },
  moderate: {
    label: "Moderate demand",
    cls: "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900",
    bars: 2,
    note: "Steady interest. A fair price helps you stand out.",
  },
  low: {
    label: "Low demand",
    cls: "bg-slate-100 text-slate-600 ring-slate-200 dark:bg-white/5 dark:text-zinc-300 dark:ring-white/10",
    bars: 1,
    note: "Few recent sales or chats. Pricing a little lower or boosting can help.",
  },
  insufficient: {
    label: "Not enough activity yet",
    cls: "bg-slate-100 text-slate-500 ring-slate-200 dark:bg-white/5 dark:text-zinc-400 dark:ring-white/10",
    bars: 0,
    note: "Too few listings or sales in this category on your campus to judge demand.",
  },
};

const CONFIDENCE = {
  high: "High confidence",
  medium: "Medium confidence",
  low: "Low confidence",
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

function Shell({ children, locked = false }) {
  return (
    <section
      className={cn(
        "rounded-2xl border p-4 sm:p-5",
        locked
          ? "border-dashed border-neutral-300 bg-white/60 dark:border-neutral-700 dark:bg-white/[0.02]"
          : "border-[var(--accent-soft-strong)] bg-[var(--accent-soft)]/60 dark:bg-[var(--accent-soft)]/30",
      )}
      aria-label="Smart price suggestions"
    >
      {children}
    </section>
  );
}

function Badge({ children }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-wide text-[var(--accent-text)] ring-1 ring-[var(--accent-soft-strong)] dark:bg-white/10">
      <Sparkles className="h-3 w-3" aria-hidden="true" />
      {children}
    </span>
  );
}

function UseButton({ value, onUsePrice, current }) {
  if (!onUsePrice || value == null) return null;
  const applied = Number(current) === value;
  return (
    <button
      type="button"
      onClick={() => onUsePrice(value)}
      disabled={applied}
      className="h-9 shrink-0 rounded-lg bg-[var(--accent)] px-3.5 text-[13px] font-medium text-white transition-colors hover:bg-[var(--accent-hover)] disabled:cursor-default disabled:bg-emerald-600"
    >
      {applied ? "Applied" : `Use ${inr(value)}`}
    </button>
  );
}

/**
 * Labs: Smart price suggestions (Pro & Pro+) + Demand meter (Pro+).
 * The suggestion is for THIS item: the seller's original price × what
 * comparable items on their campus resell for (condition-adjusted, real
 * sales preferred). `estimate` is the offline rule-of-thumb shown, clearly
 * labelled, when there isn't enough campus data. Free accounts see a quiet
 * locked teaser that links to plans.
 */
export default function PriceInsights({ category, condition, originalPrice, estimate, currentPrice, onUsePrice }) {
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
  }, [enabled, category, condition, original]);

  if (!category || labsLoading) return null;

  if (!enabled) {
    return (
      <Shell locked>
        <div className="flex items-start gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-neutral-100 text-slate-500 dark:bg-white/5 dark:text-zinc-400">
            <Lock className="h-4 w-4" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="text-[14px] font-semibold text-slate-900 dark:text-white">Smart price suggestions</p>
            <p className="mt-0.5 text-[13px] text-slate-500 dark:text-zinc-400">
              See what similar items actually sell for on your campus. Early access for Pro and Pro Plus.
            </p>
            <Link to="/price" className="mt-2 inline-block text-[13px] font-semibold text-[var(--accent-text)] hover:underline">
              See plans →
            </Link>
          </div>
        </div>
      </Shell>
    );
  }

  const s = data?.suggestion;
  const level = data?.demand ? LEVEL[data.demand.level] || LEVEL.insufficient : null;
  const basisLine = data?.enoughData
    ? data.basis === "sold"
      ? `Based on ${data.samples} completed ${data.samples === 1 ? "sale" : "sales"} of similar items at your campus.`
      : `Based on ${data.samples} similar listings at your campus (asking prices; no recent sales yet).`
    : null;

  return (
    <Shell>
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-[14px] font-semibold text-slate-900 dark:text-white">
          <TrendingUp className="h-4 w-4 text-[var(--accent-text)]" aria-hidden="true" />
          Smart price suggestion
        </p>
        <Badge>Early access</Badge>
      </div>

      {state === "loading" && (
        <div className="mt-3 space-y-2" aria-hidden="true">
          <div className="browse-shimmer h-6 w-40 rounded bg-white/70 dark:bg-white/5" />
          <div className="browse-shimmer h-4 w-64 max-w-full rounded bg-white/70 dark:bg-white/5" />
        </div>
      )}

      {state === "error" && (
        <p className="mt-2 text-[13px] text-slate-500 dark:text-zinc-400">Couldn&apos;t load campus prices right now.</p>
      )}

      {state === "ready" && data && (
        <>
          {data.enoughData && s ? (
            /* Market-based suggestion for this item */
            <>
              <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-[12px] font-medium text-slate-500 dark:text-zinc-400">Suggested price</p>
                  <p className="text-[26px] font-bold leading-tight tracking-tight text-slate-900 dark:text-white">{inr(s.suggested)}</p>
                  <p className="mt-0.5 text-[13px] text-slate-600 dark:text-zinc-300">
                    Fair range <strong className="font-semibold">{inr(s.low)}</strong> to{" "}
                    <strong className="font-semibold">{inr(s.high)}</strong>
                  </p>
                </div>
                <UseButton value={s.suggested} onUsePrice={onUsePrice} current={currentPrice} />
              </div>
              <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11.5px] text-slate-500 dark:text-zinc-400">
                <span>{basisLine}</span>
                {data.confidence && (
                  <span className="rounded-full bg-white px-1.5 py-px font-medium text-slate-600 ring-1 ring-slate-200 dark:bg-white/5 dark:text-zinc-300 dark:ring-white/10">
                    {CONFIDENCE[data.confidence]}
                  </span>
                )}
              </p>
            </>
          ) : data.enoughData && !s ? (
            /* Market data exists, but we need their original price for a number */
            <p className="mt-2 text-[13px] leading-relaxed text-slate-600 dark:text-zinc-300">
              Items like this on your campus resell for{" "}
              <strong className="font-semibold">{data.ratio.low}–{data.ratio.high}%</strong> of their original price.{" "}
              <span className="text-slate-500 dark:text-zinc-400">Enter the original price to get your suggested price.</span>
            </p>
          ) : estimate ? (
            /* Not enough campus data: clearly-labelled rule-of-thumb estimate */
            <>
              <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-[12px] font-medium text-slate-500 dark:text-zinc-400">Estimate</p>
                  <p className="text-[26px] font-bold leading-tight tracking-tight text-slate-900 dark:text-white">{inr(estimate)}</p>
                </div>
                <UseButton value={estimate} onUsePrice={onUsePrice} current={currentPrice} />
              </div>
              <p className="mt-2 flex items-start gap-1.5 text-[11.5px] text-slate-500 dark:text-zinc-400">
                <Info className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                Not enough similar items on your campus yet, so this is a typical resale estimate from the original price, condition and age.
              </p>
            </>
          ) : (
            <p className="mt-2 text-[13px] text-slate-600 dark:text-zinc-300">
              Not enough similar items on your campus yet. Enter the original price above for an estimate.
            </p>
          )}

          {/* Demand meter (Pro+) */}
          {data.demand ? (
            <div className="mt-4 border-t border-black/5 pt-3 dark:border-white/10">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="flex items-center gap-2 text-[13px] font-semibold text-slate-900 dark:text-white">
                  <Activity className="h-4 w-4 text-[var(--accent-text)]" aria-hidden="true" />
                  Demand meter
                </p>
                <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11.5px] font-semibold ring-1", level.cls)}>
                  {level.bars > 0 && (
                    <span className="flex items-end gap-0.5" aria-hidden="true">
                      {[1, 2, 3].map((b) => (
                        <span key={b} className={cn("w-1 rounded-sm bg-current", b <= level.bars ? "opacity-100" : "opacity-25")} style={{ height: 4 + b * 3 }} />
                      ))}
                    </span>
                  )}
                  {level.label}
                </span>
              </div>
              <p className="mt-1.5 text-[12.5px] text-slate-600 dark:text-zinc-300">{level.note}</p>
              <p className="mt-1 text-[11.5px] text-slate-500 dark:text-zinc-400">
                On your campus: {data.demand.live} live now · {data.demand.sales30} sold and {data.demand.chats30} buyer{" "}
                {data.demand.chats30 === 1 ? "chat" : "chats"} in the last 30 days
              </p>
            </div>
          ) : (
            <p className="mt-3 text-[12px] text-slate-500 dark:text-zinc-400">
              <Lock className="mr-1 inline h-3 w-3 align-[-1px]" aria-hidden="true" />
              Demand meter is part of Pro Plus early access.{" "}
              <Link to="/price" className="font-semibold text-[var(--accent-text)] hover:underline">Upgrade</Link>
            </p>
          )}
        </>
      )}
    </Shell>
  );
}
