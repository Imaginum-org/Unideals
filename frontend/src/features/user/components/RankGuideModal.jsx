import { useEffect, useState } from "react";
import { ArrowRight, Check, Gift, X } from "lucide-react";
import { LEVEL_REWARDS_GUIDE, RANK_TIERS_GUIDE, XP_ACTIVITIES_GUIDE, rankName, xpToNextLevel } from "../../../utils/badgeConfig.js";
import { cn } from "../../../utils/cn.js";

const TABS = [
  { id: "ranks", label: "Ranks" },
  { id: "xp", label: "Earn XP" },
  { id: "rewards", label: "Level rewards" },
];

const tierIndexFor = (rank) => {
  const key = /^Campus (King|Queen|Royale)$/.test(rank) ? "Campus Royale" : rank;
  const i = RANK_TIERS_GUIDE.findIndex((t) => t.title === key);
  return i < 0 ? 0 : i;
};

/**
 * How levels and ranks work: your status, a 3-step explainer, then the
 * rank ladder, ways to earn XP and level rewards (data mirrors the backend
 * badge + reward services).
 */
export default function RankGuideModal({ isOpen, onClose, currentRank = "Seedling", currentLevel = 1, currentXp = 0 }) {
  const [tab, setTab] = useState("ranks");
  const tierIdx = tierIndexFor(currentRank);
  const toNext = xpToNextLevel(currentXp);

  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (e) => e.key === "Escape" && onClose?.();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) setTab("ranks");
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="How levels and ranks work"
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[90dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-neutral-200 bg-white shadow-2xl font-figtree sm:rounded-3xl dark:border-neutral-800 dark:bg-[#1A1D20]"
      >
        {/* Header */}
        <div className="border-b border-neutral-100 px-5 pb-4 pt-5 dark:border-neutral-800">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-[17px] font-semibold text-slate-900 dark:text-white">How levels &amp; ranks work</h2>
              <p className="mt-0.5 text-[13px] text-slate-500 dark:text-zinc-400">
                You&apos;re <span className="font-semibold text-slate-800 dark:text-zinc-100">Level {currentLevel}</span> ·{" "}
                <span className="font-semibold text-slate-800 dark:text-zinc-100">{rankName(currentRank)}</span> ·{" "}
                {Number(toNext).toLocaleString("en-IN")} XP to Level {currentLevel + 1}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-400 hover:bg-neutral-100 hover:text-slate-700 dark:hover:bg-white/5 dark:hover:text-white"
            >
              <X className="h-[18px] w-[18px]" />
            </button>
          </div>

          {/* 3 steps */}
          <ol className="mt-4 grid grid-cols-3 gap-2 text-center">
            {[
              { title: "Be active", text: "List, buy, sell, chat" },
              { title: "Earn XP", text: "XP raises your level" },
              { title: "Rank up", text: "New ranks give rewards" },
            ].map(({ title, text }, i) => (
              <li key={title} className="relative rounded-xl bg-neutral-50 px-2 py-3 dark:bg-white/[0.03]">
                <span className="block text-[20px] font-semibold leading-none tabular-nums text-[var(--accent-text)]" aria-hidden="true">
                  {i + 1}
                </span>
                <p className="mt-1.5 text-[12.5px] font-semibold text-slate-900 dark:text-white">{title}</p>
                <p className="text-[11px] leading-tight text-slate-500 dark:text-zinc-400">{text}</p>
                {i < 2 && (
                  <ArrowRight className="absolute -right-2 top-1/2 z-10 hidden h-3.5 w-3.5 -translate-y-1/2 text-slate-300 sm:block dark:text-zinc-600" aria-hidden="true" />
                )}
              </li>
            ))}
          </ol>

          {/* Tabs */}
          <div role="tablist" aria-label="Guide sections" className="mt-4 flex gap-1 rounded-lg bg-neutral-100 p-1 dark:bg-white/5">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={tab === t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  "h-8 flex-1 rounded-md text-[13px] font-semibold transition-colors",
                  tab === t.id ? "bg-white text-slate-900 shadow-sm dark:bg-[#1A1D20] dark:text-white" : "text-slate-500 hover:text-slate-800 dark:text-zinc-400",
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="overflow-y-auto px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {tab === "ranks" && (
            <ul className="space-y-2">
              {RANK_TIERS_GUIDE.map((t, i) => {
                const done = i < tierIdx;
                const current = i === tierIdx;
                return (
                  <li
                    key={t.title}
                    className={cn(
                      "rounded-xl border p-3.5",
                      current ? "border-[var(--accent)] bg-[var(--accent-soft)]" : "border-neutral-200/80 dark:border-neutral-800",
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-xl text-[20px]", !done && !current && "opacity-60 grayscale")}
                        style={{ background: t.bg }}
                        aria-hidden="true"
                      >
                        {t.icon}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                          <p className="text-[14.5px] font-semibold text-slate-900 dark:text-white">{t.name}</p>
                          <span className="text-[12px] text-slate-500 dark:text-zinc-400">
                            Level {t.minLevel}
                            {t.maxLevel < 100 ? `–${t.maxLevel}` : "+"}
                          </span>
                          {current && (
                            <span className="rounded-full bg-[var(--accent)] px-2 py-px text-[10.5px] font-semibold text-white">You&apos;re here</span>
                          )}
                          {done && (
                            <span className="inline-flex items-center gap-0.5 text-[11.5px] font-semibold text-emerald-600 dark:text-emerald-400">
                              <Check className="h-3 w-3" strokeWidth={3} /> Reached
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 text-[12.5px] text-slate-500 dark:text-zinc-400">{t.about}</p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {t.rewards.map((r) => (
                            <span
                              key={r}
                              className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-[11.5px] font-medium text-slate-700 ring-1 ring-neutral-200 dark:bg-white/5 dark:text-zinc-200 dark:ring-white/10"
                            >
                              <Gift className="h-3 w-3 text-amber-500" aria-hidden="true" />
                              {r}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
              <li className="px-1 pt-1 text-[12px] text-slate-400 dark:text-zinc-500">Rank rewards are added to your account automatically when you reach the rank.</li>
            </ul>
          )}

          {tab === "xp" && (
            <div>
              <ul className="divide-y divide-neutral-100 overflow-hidden rounded-xl border border-neutral-200/80 dark:divide-neutral-800 dark:border-neutral-800">
                {XP_ACTIVITIES_GUIDE.map((a) => (
                  <li key={a.action} className="flex items-center justify-between gap-3 px-3.5 py-3">
                    <div className="min-w-0">
                      <p className="text-[13.5px] font-medium text-slate-900 dark:text-white">{a.action}</p>
                      <p className="truncate text-[12px] text-slate-500 dark:text-zinc-400">{a.note}</p>
                    </div>
                    <span className="shrink-0 rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-[12px] font-semibold tabular-nums text-[var(--accent-text)]">
                      {a.xp}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-[12px] text-slate-400 dark:text-zinc-500">Your XP and badges refresh automatically when you open Achievements.</p>
            </div>
          )}

          {tab === "rewards" && (
            <ul className="space-y-1.5">
              {LEVEL_REWARDS_GUIDE.map((r) => {
                const reached = currentLevel >= r.level;
                return (
                  <li
                    key={r.level}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-3.5 py-2.5",
                      reached ? "bg-emerald-50 dark:bg-emerald-950/20" : "bg-neutral-50 dark:bg-white/[0.03]",
                    )}
                  >
                    <span
                      className={cn(
                        "grid h-9 w-9 shrink-0 place-items-center rounded-lg text-[12.5px] font-bold tabular-nums",
                        reached ? "bg-emerald-500 text-white" : "bg-white text-slate-600 ring-1 ring-neutral-200 dark:bg-white/5 dark:text-zinc-300 dark:ring-white/10",
                      )}
                    >
                      {reached ? <Check className="h-4 w-4" strokeWidth={3} /> : r.level}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13.5px] font-medium text-slate-900 dark:text-white">
                        Level {r.level} <span className="font-normal text-slate-500 dark:text-zinc-400">· {r.label}</span>
                      </p>
                      <p className="truncate text-[12px] text-slate-600 dark:text-zinc-300">{r.grants.join(" · ")}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
