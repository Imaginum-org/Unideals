import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { BADGE_CATALOGUE, getBadgeMeta, rankName, RANK_TIERS_GUIDE } from "../../../../utils/badgeConfig.js";
import RankEmblem from "../RankEmblem.jsx";
import { cn } from "../../../../utils/cn.js";

/*
 * Achievement tracker for Overview: the rank road (Fresher → Campus Icon)
 * with emblems, badges unlocked per month over the last year, and the
 * badges closest to unlocking. Data: GET /api/badges/me.
 */

const MONTHS = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];
const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const TIER_COLOR = { bronze: "#F59E0B", silver: "#94A3B8", gold: "#EAB308", special: "#8B5CF6" };
const TIER_LABEL = { bronze: "Bronze", silver: "Silver", gold: "Gold", special: "Special" };

const tierIndexFor = (rank) => {
  const key = /^Campus (King|Queen|Royale)$/.test(rank) ? "Campus Royale" : rank;
  const i = RANK_TIERS_GUIDE.findIndex((t) => t.title === key);
  return i < 0 ? 0 : i;
};

export default function AchievementTracker({ data, loading }) {
  const [tip, setTip] = useState(null);
  const level = data?.level || 1;
  const rankKey = data?.rank_title || "Seedling";
  const tierIdx = tierIndexFor(rankKey);
  const tiers = RANK_TIERS_GUIDE;

  // Progress along the road: whole stations + how far through the current one.
  const roadPct = useMemo(() => {
    const t = tiers[tierIdx];
    const span = Math.max(1, (t.maxLevel >= 100 ? t.minLevel + 10 : t.maxLevel + 1) - t.minLevel);
    const within = Math.min(0.95, Math.max(0, (level - t.minLevel) / span));
    return tierIdx === tiers.length - 1 ? 100 : ((tierIdx + within) / (tiers.length - 1)) * 100;
  }, [level, tierIdx, tiers]);

  const timeline = useMemo(() => {
    const now = new Date();
    const cols = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      cols.push({ key: `${d.getFullYear()}-${d.getMonth()}`, m: d.getMonth(), badges: [] });
    }
    const byKey = new Map(cols.map((c) => [c.key, c]));
    (data?.badges || []).forEach((b) => {
      if (!b.earned_at) return;
      const d = new Date(b.earned_at);
      const meta = getBadgeMeta(b.badge_id);
      const col = byKey.get(`${d.getFullYear()}-${d.getMonth()}`);
      if (col && meta) col.badges.push({ ...b, meta });
    });
    return cols;
  }, [data]);
  const thisYear = timeline.reduce((n, c) => n + c.badges.length, 0);

  const closest = useMemo(
    () =>
      (data?.locked_badges || [])
        .filter((l) => l.progress?.required > 0)
        .map((l) => ({ ...l, meta: getBadgeMeta(l.badge_id), ratio: l.progress.current / l.progress.required }))
        .filter((l) => l.meta && l.ratio < 1)
        .sort((a, b) => b.ratio - a.ratio)
        .slice(0, 2),
    [data],
  );

  return (
    <section
      className="relative isolate overflow-hidden rounded-2xl border border-amber-200/60 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] max-sm:-mx-4 max-sm:rounded-none max-sm:border-x-0 dark:border-amber-900/30 dark:bg-[#1A1D20]"
      aria-label="Achievements"
    >
      {/* Background: warm gold glow + fine diagonal lines, fading out */}
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-[radial-gradient(90%_120%_at_100%_0%,rgba(251,191,36,0.16),transparent_60%)] dark:bg-[radial-gradient(90%_120%_at_100%_0%,rgba(251,191,36,0.10),transparent_60%)]" />
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 opacity-60 dark:opacity-25"
        style={{
          backgroundImage: "repeating-linear-gradient(135deg, rgba(217,119,6,0.07) 0 1px, transparent 1px 12px)",
          maskImage: "radial-gradient(70% 90% at 100% 0%, #000, transparent 70%)",
          WebkitMaskImage: "radial-gradient(70% 90% at 100% 0%, #000, transparent 70%)",
        }}
      />

      <div className="px-4 py-4 sm:px-5">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <RankEmblem title={rankKey} color={tiers[tierIdx].color} size={34} className="shrink-0 drop-shadow-sm" />
            <div className="min-w-0">
              <p className="text-[12px] font-medium text-amber-700/80 dark:text-amber-300/80">Achievements</p>
              <h2 className="truncate text-[15.5px] font-semibold text-slate-900 dark:text-white">
                {loading ? "Loading…" : `${rankName(rankKey)} · Level ${level}`}
              </h2>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-4 text-right">
            <p className="hidden text-[12px] text-slate-500 sm:block dark:text-zinc-400">
              <span className="font-semibold tabular-nums text-slate-900 dark:text-white">{Number(data?.total_xp || 0).toLocaleString("en-IN")}</span> XP
              <span className="mx-2 text-slate-300 dark:text-zinc-600">·</span>
              <span className="font-semibold tabular-nums text-slate-900 dark:text-white">{(data?.badges || []).length}</span>/{BADGE_CATALOGUE.length} badges
            </p>
            <Link to="/achievements" className="inline-flex items-center gap-1 text-[13px] font-semibold text-[var(--accent-text)] hover:underline">
              View <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </div>
        </div>

        {/* Rank road */}
        <div className="no-scrollbar -mx-1 mt-4 overflow-x-auto px-1">
          <div className="relative min-w-[480px]">
            <div className="absolute inset-x-[8.33%] top-[15px] h-[3px] rounded-full bg-slate-200/80 dark:bg-white/10" />
            <div
              className="absolute left-[8.33%] top-[15px] h-[3px] rounded-full bg-gradient-to-r from-amber-400 to-orange-500 transition-[width] duration-1000"
              style={{ width: `${(roadPct / 100) * 83.33}%` }}
            />
            <ol className="relative grid" style={{ gridTemplateColumns: `repeat(${tiers.length}, minmax(0, 1fr))` }}>
              {tiers.map((t, i) => {
                const done = i < tierIdx;
                const current = i === tierIdx;
                return (
                  <li key={t.title} className="flex flex-col items-center text-center" aria-current={current ? "step" : undefined}>
                    <RankEmblem
                      title={t.title}
                      color={t.color}
                      locked={!done && !current}
                      size={current ? 34 : 30}
                      className={cn("relative", current ? "-mt-0.5 drop-shadow-md" : "text-slate-400 dark:text-zinc-500")}
                    />
                    <span className={cn("mt-1 text-[11.5px] font-semibold", current ? "text-slate-900 dark:text-white" : done ? "text-slate-600 dark:text-zinc-300" : "text-slate-400 dark:text-zinc-500")}>
                      {t.name}
                    </span>
                    <span className="text-[10.5px] text-slate-400 dark:text-zinc-500">Lv {t.minLevel}+</span>
                  </li>
                );
              })}
            </ol>
          </div>
        </div>
      </div>

      {/* Badges by month + closest to unlock */}
      <div className="grid border-t border-amber-100/80 sm:grid-cols-[minmax(0,1fr)_240px] dark:border-white/5">
        <div className="px-4 py-3 sm:px-5">
          <div className="flex items-baseline justify-between">
            <p className="text-[12.5px] font-semibold text-slate-800 dark:text-zinc-100">Badges unlocked</p>
            <p className="text-[11.5px] text-slate-500 dark:text-zinc-400">{thisYear} in 12 months</p>
          </div>
          <div className="relative mt-2" onMouseLeave={() => setTip(null)}>
            <div className="grid grid-cols-12 items-end gap-1.5">
              {timeline.map((c, ci) => (
                <div key={c.key} className="flex flex-col items-center gap-1">
                  <div className="flex h-[30px] w-full flex-col-reverse items-center gap-[3px]">
                    {c.badges.length === 0 ? (
                      <span className="h-1.5 w-full max-w-[18px] rounded-[3px] bg-slate-100 dark:bg-white/[0.06]" />
                    ) : (
                      c.badges.slice(0, 4).map((b) => (
                        <span
                          key={b.badge_id}
                          onMouseEnter={() => setTip({ ci, b })}
                          className="h-1.5 w-full max-w-[18px] rounded-[3px]"
                          style={{ background: TIER_COLOR[b.tier] || TIER_COLOR.special }}
                        />
                      ))
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400 dark:text-zinc-500" title={MONTH_NAMES[c.m]}>
                    {MONTHS[c.m]}
                  </span>
                </div>
              ))}
            </div>
            {tip && (
              <div
                className="pointer-events-none absolute bottom-full z-10 mb-1 -translate-x-1/2 whitespace-nowrap rounded-lg bg-slate-900 px-2.5 py-1.5 text-[11.5px] text-white shadow-lg dark:bg-white dark:text-slate-900"
                style={{ left: `${((tip.ci + 0.5) / 12) * 100}%` }}
              >
                <span aria-hidden="true">{tip.b.meta.icon}</span> <span className="font-semibold">{tip.b.meta.name}</span>
                <span className="opacity-60"> · {TIER_LABEL[tip.b.tier] || "Badge"}</span>
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-amber-100/80 px-4 py-3 sm:border-l sm:border-t-0 sm:px-5 dark:border-white/5">
          <p className="text-[12.5px] font-semibold text-slate-800 dark:text-zinc-100">Closest to unlock</p>
          {closest.length === 0 ? (
            <p className="mt-1 text-[12px] text-slate-500 dark:text-zinc-400">List, sell and chat to unlock badges.</p>
          ) : (
            <ul className="mt-1.5 space-y-2">
              {closest.map((l) => (
                <li key={l.badge_id}>
                  <div className="flex items-baseline justify-between gap-2 text-[12px]">
                    <span className="truncate text-slate-700 dark:text-zinc-200">
                      <span aria-hidden="true">{l.meta.icon}</span> {l.meta.name}
                    </span>
                    <span className="shrink-0 tabular-nums text-slate-400">
                      {l.progress.current}/{l.progress.required}
                    </span>
                  </div>
                  <div className="mt-1 h-1 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
                    <div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500" style={{ width: `${Math.round(l.ratio * 100)}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
