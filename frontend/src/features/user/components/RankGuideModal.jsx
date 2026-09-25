import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  X,
  Sparkles,
  Zap,
  CheckCircle2,
  Lock,
  ChevronRight,
  Info,
  Shield,
  Crown,
  ArrowRight,
} from "lucide-react";
import { RANK_TIERS_GUIDE, XP_ACTIVITIES_GUIDE } from "../../../Utils/badgeConfig.js";

/**
 * RankGuideModal — comprehensive, gamified guide explaining all 6 ranks,
 * level criteria, XP requirements, perks, and how users can earn XP on Unideals.
 */
export default function RankGuideModal({
  isOpen,
  onClose,
  currentRank = "Seedling",
  currentLevel = 1,
  currentXp = 0,
}) {
  const [activeTab, setActiveTab] = useState("roadmap"); // "roadmap" | "earn"

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 sm:p-6 animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-[#181818] rounded-3xl max-w-2xl w-full shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden flex flex-col max-h-[88vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative px-6 py-5 sm:px-8 sm:py-6 border-b border-gray-100 dark:border-gray-800 bg-gradient-to-r from-indigo-50/70 via-purple-50/40 to-pink-50/60 dark:from-indigo-950/20 dark:via-purple-950/20 dark:to-pink-950/20">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/30 shrink-0 text-xl">
                🏆
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg sm:text-xl font-extrabold text-gray-900 dark:text-white">
                    Ranks & Levels Guide
                  </h2>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300">
                    Unideals XP
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                  Climb tiers from Seedling to Campus Royale to unlock perks & badges.
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-white/80 dark:bg-gray-800/80 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 flex items-center justify-center hover:bg-white dark:hover:bg-gray-800 transition-colors shadow-sm"
              aria-label="Close modal"
            >
              <X size={18} />
            </button>
          </div>

          {/* Current Status Pill Bar */}
          <div className="mt-4 bg-white/90 dark:bg-[#202020] rounded-xl p-3 border border-indigo-100/80 dark:border-gray-800 flex items-center justify-between gap-3 flex-wrap text-xs shadow-sm">
            <div className="flex items-center gap-2">
              <span className="text-gray-500 dark:text-gray-400 font-medium">Your Status:</span>
              <span className="font-extrabold text-indigo-600 dark:text-indigo-400">
                {currentRank} (Lv. {currentLevel})
              </span>
            </div>
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300 font-semibold">
              <span>{Number(currentXp).toLocaleString("en-IN")} Total XP</span>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => setActiveTab("roadmap")}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                activeTab === "roadmap"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20"
                  : "bg-white/80 dark:bg-gray-800/60 text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-800"
              }`}
            >
              <Crown size={14} />
              Rank Roadmap (6 Tiers)
            </button>
            <button
              onClick={() => setActiveTab("earn")}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                activeTab === "earn"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20"
                  : "bg-white/80 dark:bg-gray-800/60 text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-800"
              }`}
            >
              <Zap size={14} />
              Ways to Earn XP
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 sm:p-8 overflow-y-auto no-scrollbar space-y-4">
          {activeTab === "roadmap" ? (
            <div className="space-y-4">
              <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                <Info size={14} className="text-indigo-500 shrink-0" />
                <span>Your level is calculated using XP: <code className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 font-semibold">Level = √(XP / 50)</code></span>
              </div>

              {/* Ranks list */}
              <div className="space-y-3">
                {RANK_TIERS_GUIDE.map((tier) => {
                  const isCurrent =
                    tier.title.toLowerCase() === currentRank.toLowerCase() ||
                    (tier.altTitles &&
                      tier.altTitles.some(
                        (t) => t.toLowerCase() === currentRank.toLowerCase()
                      ));
                  const isUnlocked = currentLevel >= tier.minLevel;

                  return (
                    <div
                      key={tier.title}
                      className={`relative rounded-2xl p-4 sm:p-5 border transition-all duration-200 ${
                        isCurrent
                          ? "border-2 border-indigo-500 bg-indigo-50/20 dark:bg-indigo-950/20 shadow-md ring-2 ring-indigo-500/20"
                          : isUnlocked
                          ? "border-gray-200 dark:border-gray-700 bg-white dark:bg-[#202020]"
                          : "border-gray-100 dark:border-gray-800 bg-gray-50/70 dark:bg-[#1a1a1a]/60 opacity-80"
                      }`}
                    >
                      {/* Top banner */}
                      <div className="flex items-start justify-between gap-3 mb-2.5">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-sm shrink-0"
                            style={{ background: tier.bg }}
                          >
                            {tier.icon}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3
                                className="text-base font-extrabold"
                                style={{ color: tier.color }}
                              >
                                {tier.title}
                              </h3>
                              {isCurrent && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-600 text-white shadow-sm">
                                  Your Current Rank
                                </span>
                              )}
                              {!isUnlocked && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 flex items-center gap-1">
                                  <Lock size={10} /> Locked
                                </span>
                              )}
                            </div>
                            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                              {tier.tagline}
                            </p>
                          </div>
                        </div>

                        {/* Level & XP requirement pill */}
                        <div className="text-right shrink-0">
                          <span
                            className="inline-block px-2.5 py-1 rounded-lg text-xs font-bold"
                            style={{ background: tier.bg, color: tier.color }}
                          >
                            Lv. {tier.minLevel}{tier.maxLevel < 100 ? `–${tier.maxLevel}` : "+"}
                          </span>
                          <p className="text-[10px] text-gray-400 font-medium mt-0.5">
                            {tier.minXp.toLocaleString("en-IN")}+ XP
                          </p>
                        </div>
                      </div>

                      <p className="text-xs text-gray-600 dark:text-gray-300 mb-3">
                        {tier.description}
                      </p>

                      {/* Perks */}
                      <div className="space-y-1.5 pt-2 border-t border-gray-100 dark:border-gray-800">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                          Tier Perks & Rewards
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                          {tier.perks.map((perk, i) => (
                            <div
                              key={i}
                              className="flex items-center gap-1.5 text-xs text-gray-700 dark:text-gray-300"
                            >
                              <CheckCircle2
                                size={13}
                                className="shrink-0"
                                style={{ color: tier.color }}
                              />
                              <span className="truncate">{perk}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 border border-amber-200/60 dark:border-amber-900/30 rounded-2xl p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0">
                  <Sparkles size={20} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                    Every campus trade fuels your level!
                  </h4>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Perform actions on Unideals to earn XP automatically. Badges also grant bonus XP!
                  </p>
                </div>
              </div>

              {/* Grid of activities */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {XP_ACTIVITIES_GUIDE.map((act, i) => (
                  <div
                    key={i}
                    className="p-3.5 rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-[#202020] flex items-start gap-3 hover:border-indigo-200 dark:hover:border-indigo-900 transition-colors"
                  >
                    <span className="text-2xl shrink-0">{act.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-0.5">
                        <h4 className="text-xs font-bold text-gray-900 dark:text-white truncate">
                          {act.action}
                        </h4>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 shrink-0">
                          {act.xp}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400">
                        {act.note}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 sm:px-8 sm:py-5 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-[#141414] flex items-center justify-between gap-4">
          <Link
            to="/achievements"
            onClick={onClose}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            <span>??</span>
            View All Badges & Milestones
            <ArrowRight size={13} />
          </Link>

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-gray-900 hover:bg-gray-800 dark:bg-white dark:hover:bg-gray-100 text-white dark:text-gray-900 text-xs font-bold transition-colors"
          >
            Got it!
          </button>
        </div>
      </div>
    </div>
  );
}
