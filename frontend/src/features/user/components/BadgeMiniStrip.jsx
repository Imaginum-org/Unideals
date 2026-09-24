import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Info, HelpCircle, ChevronRight, Sparkles } from "lucide-react";
import { getBadgeMeta, RANK_CONFIG, TIER_STYLES } from "../../../Utils/badgeConfig.js";
import RankGuideModal from "./RankGuideModal.jsx";

/**
 * BadgeMiniStrip — compact level/badge widget for the Overview page.
 *
 * Props:
 *   gamification {object} — { total_xp, level, rank_title, badges, progress_percent, xp_to_next_level, next_level }
 *   loading      {boolean}
 */
export default function BadgeMiniStrip({ gamification, loading = false }) {
  const [showGuideModal, setShowGuideModal] = useState(false);

  if (loading) {
    return (
      <div className="bg-white dark:bg-[#1c1c1c] rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-800 animate-pulse">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-3" />
        <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-full mb-2" />
        <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-2/3" />
      </div>
    );
  }

  const {
    total_xp = 0,
    level = 1,
    rank_title = "Seedling",
    badges = [],
    progress_percent = 0,
    xp_to_next_level = 0,
    next_level = 2,
  } = gamification || {};

  const rank = RANK_CONFIG[rank_title] || RANK_CONFIG["Seedling"];
  const topBadges = badges.slice(0, 4);

  return (
    <>
      <div className="bg-white dark:bg-[#1c1c1c] rounded-2xl px-5 py-4 shadow-sm border border-gray-100 dark:border-gray-800 relative overflow-hidden group hover:border-indigo-100 dark:hover:border-indigo-950/50 transition-all">
        {/* Background glow */}
        <div
          className="absolute top-0 right-0 w-36 h-36 rounded-full blur-3xl opacity-15 pointer-events-none transition-opacity duration-300 group-hover:opacity-25"
          style={{ background: rank.color }}
        />

        <div className="relative">
          {/* Row 1: Rank + Info Icon + Level */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <span className="text-2xl w-9 h-9 flex items-center justify-center rounded-xl bg-gray-50 dark:bg-[#252525] shadow-sm shrink-0">
                {rank.icon}
              </span>
              <div>
                <div className="flex items-center gap-1.5">
                  <p className="text-[11px] text-gray-400 uppercase tracking-wider font-semibold">
                    Rank
                  </p>
                  {/* Exclamation / Info Guide Button */}
                  <button
                    type="button"
                    onClick={() => setShowGuideModal(true)}
                    className="w-4 h-4 rounded-full bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-[10px] font-black transition-all hover:scale-110 shadow-xs"
                    title="How do Ranks & Levels work? Click to view guide"
                    aria-label="How do Ranks and Levels work?"
                  >
                    !
                  </button>
                </div>
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-extrabold leading-tight" style={{ color: rank.color }}>
                    {rank_title}
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowGuideModal(true)}
                    className="text-[10px] text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 underline decoration-dotted font-medium transition-colors"
                  >
                    (Guide)
                  </button>
                </div>
              </div>
            </div>

            <div className="text-right">
              <div className="flex items-center justify-end gap-1">
                <p className="text-[11px] text-gray-400 uppercase tracking-wider font-semibold">
                  Level
                </p>
                <button
                  type="button"
                  onClick={() => setShowGuideModal(true)}
                  className="text-gray-300 hover:text-indigo-500 transition-colors"
                  title="View Level & XP Guide"
                >
                  <Info size={12} />
                </button>
              </div>
              <p className="text-2xl font-black leading-none mt-0.5" style={{ color: rank.color }}>
                {level}
              </p>
            </div>
          </div>

          {/* Row 2: XP Progress bar */}
          <div className="mb-3">
            <div className="w-full h-2.5 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-1000 ease-out"
                style={{
                  width: `${progress_percent}%`,
                  background: `linear-gradient(90deg, ${rank.color}aa, ${rank.color})`,
                  boxShadow: `0 0 8px ${rank.color}40`,
                }}
              />
            </div>
            <div className="flex items-center justify-between text-[10px] text-gray-400 mt-1">
              <span>{total_xp.toLocaleString("en-IN")} Total XP</span>
              <span className="font-semibold text-gray-500 dark:text-gray-400">
                {xp_to_next_level.toLocaleString("en-IN")} XP to Lv.{next_level}
              </span>
            </div>
          </div>

          {/* Row 3: Badge count + mini icons + link */}
          <div className="flex items-center gap-3 pt-1 border-t border-gray-50 dark:border-gray-800/60">
            <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">
              {badges.length > 0 ? `${badges.length} Badges` : "No badges yet"}
            </span>

            {/* Mini badge icons */}
            <div className="flex items-center gap-1.5 flex-1 overflow-hidden">
              {topBadges.map((b) => {
                const m = getBadgeMeta(b.badge_id);
                const ts = TIER_STYLES[b.tier] || TIER_STYLES.special;
                if (!m) return null;
                return (
                  <span
                    key={b.badge_id}
                    title={`${m.name} (${ts.label})`}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-sm shadow-xs shrink-0"
                    style={{ background: m.color.bg }}
                  >
                    {m.icon}
                  </span>
                );
              })}
              {badges.length > 4 && (
                <span className="text-xs text-gray-400 font-medium shrink-0">
                  +{badges.length - 4} more
                </span>
              )}
            </div>

            <Link
              to="/achievements"
              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline shrink-0 flex items-center gap-0.5"
            >
              View All
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M7 17L17 7M17 7H7M17 7v10"/>
              </svg>
            </Link>
          </div>
        </div>
      </div>

      {/* Guide Modal */}
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

