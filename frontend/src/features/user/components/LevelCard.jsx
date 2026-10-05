import React, { useState, useEffect } from "react";
import { Info } from "lucide-react";
import { RANK_CONFIG, LEVEL_REWARDS_GUIDE } from "../../../Utils/badgeConfig.js";
import RankGuideModal from "./RankGuideModal.jsx";
import { fetchMyRewards } from "../api/badgeApi.js";

/**
 * LevelCard — displays user's XP, level, rank, progress bar,
 * boost credit balance, and next milestone reward preview.
 *
 * Props:
 *   total_xp         {number}
 *   level            {number}
 *   rank_title       {string}
 *   xp_to_next_level {number}
 *   next_level       {number}
 *   progress_percent {number}
 *   badge_count      {number}
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
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [boostCredits, setBoostCredits] = useState(null);
  const rank = RANK_CONFIG[rank_title] || RANK_CONFIG["Seedling"];

  // Fetch boost credits balance
  useEffect(() => {
    let cancelled = false;
    fetchMyRewards()
      .then((res) => {
        if (!cancelled && res.data.success) {
          setBoostCredits(res.data.data.boost_credits ?? 0);
        }
      })
      .catch(() => {}); // non-critical, just display enhancement
    return () => { cancelled = true; };
  }, []);

  // Find the next level reward the user hasn't reached yet
  const nextReward = LEVEL_REWARDS_GUIDE.find((r) => r.level > level);

  return (
    <>
      <div
        className="relative overflow-hidden rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm"
        style={{ background: "var(--level-card-bg, white)" }}
      >
        {/* Background glow blob */}
        <div
          className="absolute -top-10 -right-10 w-48 h-48 rounded-full opacity-20 blur-3xl pointer-events-none"
          style={{ background: rank.color }}
        />

        <div className="relative p-6 dark:bg-[#1c1c1c]">
          {/* Top row: rank icon + title + level */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <span
                className="text-3xl w-12 h-12 flex items-center justify-center rounded-xl shadow-sm"
                style={{ background: rank.bg }}
              >
                {rank.icon}
              </span>
              <div>
                <div className="flex items-center gap-1.5">
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold uppercase tracking-wider">
                    Current Rank
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowGuideModal(true)}
                    className="w-4 h-4 rounded-full bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-[10px] font-black transition-transform hover:scale-110"
                    title="View Ranks & Level Guide"
                  >
                    !
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <h2
                    className="text-lg font-extrabold leading-tight"
                    style={{ color: rank.color }}
                  >
                    {rank_title}
                  </h2>
                  <button
                    type="button"
                    onClick={() => setShowGuideModal(true)}
                    className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:underline flex items-center gap-0.5"
                  >
                    (Rank Guide)
                  </button>
                </div>
              </div>
            </div>

            <div className="text-right">
              <div className="flex items-center justify-end gap-1">
                <p className="text-xs text-gray-400">Level</p>
                <button
                  type="button"
                  onClick={() => setShowGuideModal(true)}
                  className="text-gray-300 hover:text-indigo-500 transition-colors"
                  title="Level Info"
                >
                  <Info size={12} />
                </button>
              </div>
              <p
                className="text-3xl font-black leading-none"
                style={{ color: rank.color }}
              >
                {level}
              </p>
            </div>
          </div>

          {/* XP Progress bar */}
          <div className="mb-3">
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1.5">
              <span className="font-medium">{total_xp.toLocaleString("en-IN")} XP</span>
              <span className="font-semibold text-gray-700 dark:text-gray-300">
                {xp_to_next_level.toLocaleString("en-IN")} XP to Lv.{next_level}
              </span>
            </div>

            <div className="w-full h-3 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-1000 ease-out"
                style={{
                  width: `${progress_percent}%`,
                  background: `linear-gradient(90deg, ${rank.color}cc, ${rank.color})`,
                  boxShadow: `0 0 8px ${rank.color}66`,
                }}
              />
            </div>

            <div className="flex items-center justify-between text-xs text-gray-400 mt-1">
              <span>{progress_percent}% to Level {next_level}</span>
              <button
                type="button"
                onClick={() => setShowGuideModal(true)}
                className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
              >
                How to earn XP?
              </button>
            </div>
          </div>

          {/* Boost credits + next reward row */}
          <div className="flex items-center gap-3 py-2.5 px-3 mb-3 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40">
            <div className="flex items-center gap-1.5">
              <span className="text-base">🚀</span>
              <div>
                <p className="text-[10px] text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide leading-none">
                  Boost Credits
                </p>
                <p className="text-sm font-extrabold text-indigo-600 dark:text-indigo-400 leading-tight">
                  {boostCredits === null ? "—" : boostCredits}
                </p>
              </div>
            </div>
            {nextReward && (
              <>
                <div className="w-px h-8 bg-indigo-200 dark:bg-indigo-800 mx-1" />
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide leading-none">
                    Next Reward at Lv.{nextReward.level}
                  </p>
                  <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 leading-tight truncate">
                    {nextReward.grants.join(" · ")}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowGuideModal(true)}
                  className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 shrink-0 hover:underline"
                >
                  All →
                </button>
              </>
            )}
          </div>

          {/* Footer stats */}
          <div className="flex items-center gap-2 pt-3 border-t border-gray-100 dark:border-gray-800">
            <span className="text-base">🏅</span>
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              {badge_count} Badge{badge_count !== 1 ? "s" : ""} earned
            </span>
            <button
              onClick={() => setShowGuideModal(true)}
              className="ml-auto text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
            >
              <span>Explore All 6 Ranks</span>
              <span>→</span>
            </button>
          </div>
        </div>
      </div>

      <RankGuideModal
        isOpen={showGuideModal}
        onClose={() => setShowGuideModal(false)}
        currentRank={rank_title}
        currentLevel={level}
        currentXp={total_xp}
      />
    </>
  );
}
