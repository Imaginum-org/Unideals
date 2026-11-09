import { useEffect, useState } from "react";
import { ArrowRight, Check, Gift, Info, Lock, Medal, Rocket, Sparkles } from "lucide-react";
import { BADGE_CATALOGUE, LEVEL_REWARDS_GUIDE, RANK_CONFIG, RANK_TIERS_GUIDE } from "../../../utils/badgeConfig.js";
import RankGuideModal from "./RankGuideModal.jsx";
import { fetchMyRewards } from "../api/badgeApi.js";
import { cn } from "../../../utils/cn.js";

// "Campus King/Queen" are personalised names of the top "Campus Royale" tier.
const tierIndexFor = (rank) => {
  const name = /^Campus (King|Queen|Royale)$/.test(rank) ? "Campus Royale" : rank;
  const i = RANK_TIERS_GUIDE.findIndex((t) => t.title === name);
  return i < 0 ? 0 : i;
};

/**
 * Level hero for Achievements: rank emblem, level, XP progress to the next
 * level, the next milestone reward, key stats and the rank ladder.
 */
export default function LevelCard({
  total_xp = 0,
  level = 1,
  rank_title = "Seedling",
  xp_to_next_level = 0,
  next_level = 2,
  progress_percent = 0,
  badge_count = 0,
}) {
  const [showGuide, setShowGuide] = useState(false);
  const [boostCredits, setBoostCredits] = useState(null);
  const rank = RANK_CONFIG[rank_title] || RANK_CONFIG.Seedling;
  const tierIdx = tierIndexFor(rank_title);
  const nextReward = LEVEL_REWARDS_GUIDE.find((r) => r.level > level);
  const pct = Math.max(0, Math.min(100, Number(progress_percent) || 0));

  useEffect(() => {
    let cancelled = false;
    fetchMyRewards()
      .then((res) => !cancelled && res.data.success && setBoostCredits(res.data.data.boost_credits ?? 0))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const stats = [
    { icon: Sparkles, label: "Total XP", value: Number(total_xp).toLocaleString("en-IN") },
    { icon: Medal, label: "Badges", value: `${badge_count}/${BADGE_CATALOGUE.length}` },
    { icon: Rocket, label: "Boost credits", value: boostCredits === null ? "—" : boostCredits },
  ];

  return (
    <>
      <section className="overflow-hidden rounded-2xl border border-neutral-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] max-sm:-mx-4 max-sm:rounded-none max-sm:border-x-0 dark:border-neutral-800 dark:bg-[#1A1D20]">
        {/* Hero */}
        <div className="relative p-5 sm:p-6">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-28 opacity-[0.14]"
            style={{ background: `radial-gradient(70% 100% at 0% 0%, ${rank.color}, transparent 70%)` }}
          />
          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <span
                className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl text-[34px] shadow-sm ring-1 ring-black/5"
                style={{ background: rank.bg }}
                aria-hidden="true"
              >
                {rank.icon}
              </span>
              <div className="min-w-0">
                <p className="text-[12.5px] font-medium text-slate-500 dark:text-zinc-400">Level {level}</p>
                <h2 className="text-[24px] font-semibold leading-tight tracking-tight" style={{ color: rank.color }}>
                  {rank_title}
                </h2>
                <button
                  type="button"
                  onClick={() => setShowGuide(true)}
                  className="mt-0.5 inline-flex items-center gap-1 text-[12.5px] font-semibold text-[var(--accent-text)] hover:underline"
                >
                  <Info className="h-3.5 w-3.5" aria-hidden="true" />
                  How levels work
                </button>
              </div>
            </div>

            {nextReward && (
              <button
                type="button"
                onClick={() => setShowGuide(true)}
                className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-left transition-colors hover:border-amber-300 sm:max-w-[260px] dark:border-amber-900/50 dark:bg-amber-950/20"
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white text-amber-600 shadow-sm dark:bg-white/10 dark:text-amber-300">
                  <Gift className="h-[18px] w-[18px]" aria-hidden="true" />
                </span>
                <span className="min-w-0">
                  <span className="block text-[11.5px] font-medium text-amber-800/80 dark:text-amber-200/80">Next reward · Level {nextReward.level}</span>
                  <span className="block truncate text-[13px] font-semibold text-amber-900 dark:text-amber-100">{nextReward.grants.join(" · ")}</span>
                </span>
              </button>
            )}
          </div>

          {/* XP progress */}
          <div className="relative mt-5">
            <div className="mb-2 flex items-baseline justify-between gap-3 text-[13px]">
              <span className="font-semibold text-slate-900 dark:text-white">
                {Number(xp_to_next_level).toLocaleString("en-IN")} XP <span className="font-normal text-slate-500 dark:text-zinc-400">to Level {next_level}</span>
              </span>
              <span className="tabular-nums text-slate-500 dark:text-zinc-400">{pct}%</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-neutral-100 dark:bg-white/5" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
              <div className="h-full rounded-full transition-[width] duration-1000 ease-out" style={{ width: `${pct}%`, background: rank.color }} />
            </div>
          </div>
        </div>

        {/* Stats */}
        <dl className="grid grid-cols-3 divide-x divide-neutral-100 border-t border-neutral-100 dark:divide-neutral-800 dark:border-neutral-800">
          {stats.map(({ icon: Icon, label, value }) => (
            <div key={label} className="px-4 py-3 sm:px-6">
              <dt className="flex items-center gap-1.5 text-[12px] text-slate-500 dark:text-zinc-400">
                <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                {label}
              </dt>
              <dd className="mt-0.5 text-[17px] font-semibold tabular-nums text-slate-900 dark:text-white">{value}</dd>
            </div>
          ))}
        </dl>

        {/* Rank ladder */}
        <div className="border-t border-neutral-100 px-4 py-4 sm:px-6 dark:border-neutral-800">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[13px] font-semibold text-slate-900 dark:text-white">Rank ladder</p>
            <button type="button" onClick={() => setShowGuide(true)} className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-[var(--accent-text)] hover:underline">
              Perks <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
          <ol className="no-scrollbar -mx-1 flex overflow-x-auto px-1 pb-1">
            {RANK_TIERS_GUIDE.map((t, i) => {
              const done = i < tierIdx;
              const current = i === tierIdx;
              return (
                <li key={t.title} className="flex min-w-[96px] flex-1 flex-col items-center text-center" aria-current={current ? "step" : undefined}>
                  <div className="flex w-full items-center">
                    <span className={cn("h-0.5 flex-1", i === 0 ? "bg-transparent" : done || current ? "bg-[var(--accent)]" : "bg-neutral-200 dark:bg-neutral-700")} />
                    <span
                      className={cn(
                        "grid h-9 w-9 shrink-0 place-items-center rounded-full text-[17px] transition",
                        current ? "ring-2 ring-offset-2 ring-offset-white dark:ring-offset-[#1A1D20]" : "",
                        !done && !current && "opacity-50 grayscale",
                      )}
                      style={{ background: t.bg, ...(current ? { "--tw-ring-color": t.color } : {}) }}
                      title={`${t.title} · Level ${t.minLevel}+`}
                    >
                      {done ? <Check className="h-4 w-4" style={{ color: t.color }} strokeWidth={3} /> : t.icon}
                    </span>
                    <span className={cn("h-0.5 flex-1", i === RANK_TIERS_GUIDE.length - 1 ? "bg-transparent" : done ? "bg-[var(--accent)]" : "bg-neutral-200 dark:bg-neutral-700")} />
                  </div>
                  <span className={cn("mt-1.5 text-[11.5px] font-semibold", current ? "text-slate-900 dark:text-white" : "text-slate-500 dark:text-zinc-400")}>{t.title}</span>
                  <span className="flex items-center gap-0.5 text-[10.5px] text-slate-400 dark:text-zinc-500">
                    {!done && !current && <Lock className="h-2.5 w-2.5" aria-hidden="true" />}
                    Lv {t.minLevel}
                  </span>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      <RankGuideModal isOpen={showGuide} onClose={() => setShowGuide(false)} currentRank={rank_title} currentLevel={level} currentXp={total_xp} />
    </>
  );
}
