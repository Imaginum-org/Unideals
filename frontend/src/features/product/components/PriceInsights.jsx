import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Activity, Lock, Sparkles, TrendingUp } from "lucide-react";
import { getPriceInsights, useLabs } from "../../../services/labs.js";
import { cn } from "../../../utils/cn.js";

const inr = (n) => `₹${Number(n).toLocaleString("en-IN")}`;

const LEVEL = {
  high: { label: "High demand", cls: "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900", bars: 3 },
  moderate: { label: "Moderate demand", cls: "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900", bars: 2 },
  low: { label: "Low demand", cls: "bg-slate-100 text-slate-600 ring-slate-200 dark:bg-white/5 dark:text-zinc-300 dark:ring-white/10", bars: 1 },
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

/**
 * Labs: Smart price suggestions (Pro & Pro+) + Demand meter (Pro+).
 * Free accounts see a quiet locked teaser that links to plans.
 */
export default function PriceInsights({ category, condition, onUsePrice }) {
  const { has, loading: labsLoading } = useLabs();
  const enabled = has("price_insights");
  const [data, setData] = useState(null);
  const [state, setState] = useState("idle"); // idle | loading | ready | error

  useEffect(() => {
    if (!enabled || !category) return undefined;
    let cancelled = false;
    setState("loading");
    getPriceInsights({ category, ...(condition ? { condition } : {}) })
      .then((d) => {
        if (cancelled) return;
        setData(d);
        setState("ready");
      })
      .catch(() => !cancelled && setState("error"));
    return () => {
      cancelled = true;
    };
  }, [enabled, category, condition]);

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
              See what similar items list and sell for on your campus. Early access for Pro and Pro Plus.
            </p>
            <Link to="/price" className="mt-2 inline-block text-[13px] font-semibold text-[var(--accent-text)] hover:underline">
              See plans →
            </Link>
          </div>
        </div>
      </Shell>
    );
  }

  const price = data?.price;
  const level = data?.demand ? LEVEL[data.demand.level] : null;

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
          {data.enoughData && price ? (
            <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-[12px] font-medium text-slate-500 dark:text-zinc-400">Suggested price</p>
                <p className="text-[26px] font-bold leading-tight tracking-tight text-slate-900 dark:text-white">{inr(price.suggested)}</p>
                <p className="mt-0.5 text-[13px] text-slate-600 dark:text-zinc-300">
                  Most list between <strong className="font-semibold">{inr(price.low)}</strong> and{" "}
                  <strong className="font-semibold">{inr(price.high)}</strong>
                  {data.soldPrice ? <> · usually sells near <strong className="font-semibold">{inr(data.soldPrice.median)}</strong></> : null}
                </p>
              </div>
              {onUsePrice && (
                <button
                  type="button"
                  onClick={() => onUsePrice(price.suggested)}
                  className="h-9 rounded-lg bg-[var(--accent)] px-3.5 text-[13px] font-semibold text-white transition-colors hover:bg-[var(--accent-hover)]"
                >
                  Use {inr(price.suggested)}
                </button>
              )}
            </div>
          ) : (
            <p className="mt-2 text-[13px] text-slate-600 dark:text-zinc-300">
              Not enough similar listings on your campus yet to suggest a price. You&apos;re early, so set what feels fair.
            </p>
          )}
          {data.enoughData && price && (
            <p className="mt-2 text-[11.5px] text-slate-400 dark:text-zinc-500">
              Based on {price.samples} {data.scope === "condition" ? "same-condition" : "similar"} listings at your campus in the last 6 months.
            </p>
          )}

          {/* Demand meter (Pro+) */}
          {data.demand ? (
            <div className="mt-4 border-t border-black/5 pt-3 dark:border-white/10">
              <div className="flex items-center justify-between gap-2">
                <p className="flex items-center gap-2 text-[13px] font-semibold text-slate-900 dark:text-white">
                  <Activity className="h-4 w-4 text-[var(--accent-text)]" aria-hidden="true" />
                  Demand meter
                </p>
                <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11.5px] font-semibold ring-1", level.cls)}>
                  <span className="flex items-end gap-0.5" aria-hidden="true">
                    {[1, 2, 3].map((b) => (
                      <span key={b} className={cn("w-1 rounded-sm bg-current", b <= level.bars ? "opacity-100" : "opacity-25")} style={{ height: 4 + b * 3 }} />
                    ))}
                  </span>
                  {level.label}
                </span>
              </div>
              <p className="mt-1.5 text-[12.5px] text-slate-600 dark:text-zinc-300">
                {data.demand.activeListings} live · {data.demand.soldLast30} sold in the last 30 days · ~{data.demand.avgViews} views per new listing
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
