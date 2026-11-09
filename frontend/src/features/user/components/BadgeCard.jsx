import { useEffect, useState } from "react";
import { Check, Lock, Sparkles, X } from "lucide-react";
import { getBadgeMeta, TIER_STYLES } from "../../../utils/badgeConfig.js";
import { cn } from "../../../utils/cn.js";

const TIER_DOT = { bronze: "#CD7F32", silver: "#9CA3AF", gold: "#F5B301", special: "#6366F1" };

/**
 * One badge, earned or locked. Earned: colour icon, tier, XP. Locked: muted
 * icon with progress (or the first requirement). Tap for details.
 */
export default function BadgeCard({ badge_id, tier = "bronze", earned_at = null, xp_granted = 0, locked = false, progress = null, isNew = false }) {
  const [open, setOpen] = useState(false);
  const meta = getBadgeMeta(badge_id);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  if (!meta) return null;
  const tierStyle = TIER_STYLES[tier] || TIER_STYLES.special;
  const earnedDate = earned_at
    ? new Date(earned_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
    : null;
  const pct = progress?.required ? Math.min(100, Math.round((progress.current / progress.required) * 100)) : 0;
  const reachedIdx = locked ? -1 : meta.tiers.findIndex((t) => t.tier === tier);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "group relative flex w-full flex-col rounded-2xl border bg-white p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-md dark:bg-[#1A1D20]",
          locked ? "border-dashed border-neutral-300 dark:border-neutral-700" : "border-neutral-200/80 dark:border-neutral-800",
        )}
      >
        {isNew && !locked && (
          <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-[var(--accent)] px-1.5 py-0.5 text-[10px] font-bold text-white">
            <Sparkles className="h-2.5 w-2.5" aria-hidden="true" /> New
          </span>
        )}
        {locked && <Lock className="absolute right-3 top-3 h-3.5 w-3.5 text-slate-400 dark:text-zinc-500" aria-label="Locked" />}

        <span
          className={cn("grid h-12 w-12 place-items-center rounded-xl text-[26px] ring-1 ring-black/5", locked && "grayscale opacity-60")}
          style={{ background: locked ? "#F3F4F6" : meta.color.bg }}
          aria-hidden="true"
        >
          {meta.icon}
        </span>
        <p className="mt-3 truncate text-[14px] font-semibold text-slate-900 dark:text-white">{meta.name}</p>

        {locked ? (
          progress?.required ? (
            <div className="mt-2">
              <div className="h-1.5 overflow-hidden rounded-full bg-neutral-100 dark:bg-white/5">
                <div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${pct}%` }} />
              </div>
              <p className="mt-1 text-[11.5px] tabular-nums text-slate-500 dark:text-zinc-400">
                {progress.current}/{progress.required} {progress.unit}
              </p>
            </div>
          ) : (
            <p className="mt-1 line-clamp-2 text-[12px] text-slate-500 dark:text-zinc-400">{meta.tiers[0]?.label}</p>
          )
        ) : (
          <div className="mt-2 flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700 dark:bg-white/5 dark:text-zinc-200">
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: TIER_DOT[tier] || TIER_DOT.special }} />
              {tierStyle.label}
            </span>
            <span className="text-[11.5px] font-semibold text-[var(--accent-text)]">+{xp_granted} XP</span>
          </div>
        )}
      </button>

      {open && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center sm:p-4" onClick={() => setOpen(false)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-label={meta.name}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-sm rounded-t-3xl border border-neutral-200 bg-white p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-2xl sm:rounded-3xl dark:border-neutral-800 dark:bg-[#1A1D20]"
          >
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-neutral-100 hover:text-slate-700 dark:hover:bg-white/5 dark:hover:text-white"
            >
              <X className="h-[18px] w-[18px]" />
            </button>
            <div className="flex flex-col items-center text-center">
              <span
                className={cn("grid h-20 w-20 place-items-center rounded-2xl text-[44px] ring-1 ring-black/5", locked && "grayscale opacity-60")}
                style={{ background: meta.color.bg, boxShadow: locked ? "none" : tierStyle.glow }}
                aria-hidden="true"
              >
                {meta.icon}
              </span>
              <h2 className="mt-4 text-[18px] font-semibold text-slate-900 dark:text-white">{meta.name}</h2>
              <p className="mt-1 text-[13px] text-slate-500 dark:text-zinc-400">{meta.description}</p>
              <p className="mt-2 text-[12px] font-medium text-slate-400 dark:text-zinc-500">
                {locked ? "Not earned yet" : earnedDate ? `Earned ${earnedDate}` : "Earned"}
              </p>
            </div>

            <ul className="mt-5 space-y-1.5">
              {meta.tiers.map((t, i) => {
                const reached = reachedIdx >= i;
                return (
                  <li
                    key={t.tier}
                    className={cn(
                      "flex items-center justify-between gap-3 rounded-xl px-3 py-2 text-[12.5px]",
                      reached ? "bg-emerald-50 dark:bg-emerald-950/30" : "bg-neutral-50 dark:bg-white/[0.03]",
                    )}
                  >
                    <span className="flex min-w-0 items-center gap-2 text-slate-700 dark:text-zinc-200">
                      {reached ? (
                        <Check className="h-3.5 w-3.5 shrink-0 text-emerald-600" strokeWidth={3} />
                      ) : (
                        <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: TIER_DOT[t.tier] || TIER_DOT.special }} />
                      )}
                      <span className="truncate">{t.label}</span>
                    </span>
                    <span className="shrink-0 font-semibold text-[var(--accent-text)]">+{t.xp} XP</span>
                  </li>
                );
              })}
            </ul>

            {locked && progress?.required ? (
              <div className="mt-4">
                <div className="mb-1 flex justify-between text-[12px] text-slate-500 dark:text-zinc-400">
                  <span>Progress</span>
                  <span className="tabular-nums">
                    {progress.current}/{progress.required}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-neutral-100 dark:bg-white/5">
                  <div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${pct}%` }} />
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </>
  );
}
