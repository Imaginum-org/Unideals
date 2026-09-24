import React, { useState } from "react";
import { getBadgeMeta, TIER_STYLES } from "../../../Utils/badgeConfig.js";

/**
 * BadgeCard — displays a single badge in earned or locked state.
 *
 * Props:
 *   badge_id    {string}  — e.g. "power_seller"
 *   tier        {string}  — "bronze" | "silver" | "gold" | "special"
 *   earned_at   {string}  — ISO date string (null if locked)
 *   xp_granted  {number}
 *   locked      {boolean}
 *   progress    {object}  — { current, required, unit } for locked badges
 *   isNew       {boolean} — show sparkle pulse if earned within 3 days
 */
export default function BadgeCard({
  badge_id,
  tier = "bronze",
  earned_at = null,
  xp_granted = 0,
  locked = false,
  progress = null,
  isNew = false,
}) {
  const [showModal, setShowModal] = useState(false);
  const meta = getBadgeMeta(badge_id);
  if (!meta) return null;

  const tierStyle = TIER_STYLES[tier] || TIER_STYLES.special;
  const earnedDate = earned_at
    ? new Date(earned_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
    : null;

  return (
    <>
      {/* Card */}
      <button
        onClick={() => setShowModal(true)}
        className={`
          relative group text-left w-full rounded-2xl p-4 border transition-all duration-200
          ${locked
            ? "border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#1a1a1a] opacity-60 grayscale cursor-pointer hover:opacity-80"
            : "border-gray-100 dark:border-gray-800 bg-white dark:bg-[#1c1c1c] hover:scale-[1.02] hover:-translate-y-0.5 cursor-pointer"
          }
          ${isNew ? "animate-pulse-border" : ""}
        `}
        style={
          locked
            ? {}
            : { boxShadow: `0 2px 12px ${tierStyle.glow?.split("rgba")[1] ? "rgba" + tierStyle.glow.split("rgba")[1].split(")")[0] + ", 0.15)" : "transparent"}` }
        }
      >
        {/* Tier ribbon */}
        {!locked && (
          <div
            className="absolute top-0 right-0 px-2 py-0.5 rounded-bl-xl rounded-tr-xl text-[10px] font-bold text-white"
            style={{ background: tierStyle.gradient }}
          >
            {tierStyle.label}
          </div>
        )}

        {/* Lock icon */}
        {locked && (
          <div className="absolute top-2 right-2 text-gray-400 dark:text-gray-600">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 1C9.24 1 7 3.24 7 6v2H5a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V10a2 2 0 0 0-2-2h-2V6c0-2.76-2.24-5-5-5zm0 2c1.66 0 3 1.34 3 3v2H9V6c0-1.66 1.34-3 3-3zm0 10a2 2 0 1 1 0 4 2 2 0 0 1 0-4z"/>
            </svg>
          </div>
        )}

        {/* New sparkle */}
        {isNew && !locked && (
          <span className="absolute -top-1 -left-1 text-base">✨</span>
        )}

        {/* Icon */}
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl mb-3 shadow-sm"
          style={{ background: locked ? "#F3F4F6" : meta.color.bg }}
        >
          {meta.icon}
        </div>

        {/* Name */}
        <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{meta.name}</p>

        {/* Sublabel */}
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
          {locked && progress
            ? `${progress.current} / ${progress.required} ${progress.unit}`
            : locked
            ? "Keep going to unlock"
            : earnedDate
            ? `Earned ${earnedDate}`
            : "Earned"}
        </p>

        {/* XP chip */}
        {!locked && (
          <div className="mt-2 inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full"
            style={{ background: tierStyle.bg, color: tierStyle.text }}>
            +{xp_granted} XP
          </div>
        )}
      </button>

      {/* Modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={() => setShowModal(false)}
        >
          <div
            className="bg-white dark:bg-[#1c1c1c] rounded-3xl p-8 max-w-sm w-full shadow-2xl border border-gray-100 dark:border-gray-800"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Big icon */}
            <div className="flex justify-center mb-4">
              <div
                className="w-20 h-20 rounded-2xl flex items-center justify-center text-5xl shadow-md"
                style={{ background: meta.color.bg, boxShadow: locked ? "none" : tierStyle.glow }}
              >
                {meta.icon}
              </div>
            </div>

            {/* Tier badge */}
            {!locked && (
              <div className="flex justify-center mb-3">
                <span
                  className="px-3 py-1 rounded-full text-xs font-bold text-white"
                  style={{ background: tierStyle.gradient }}
                >
                  {tierStyle.label} Tier
                </span>
              </div>
            )}

            <h2 className="text-xl font-extrabold text-center text-gray-900 dark:text-white mb-2">
              {meta.name}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-4">
              {meta.description}
            </p>

            {/* Tiers list */}
            <div className="space-y-2 mb-4">
              {meta.tiers.map((t) => (
                <div
                  key={t.tier}
                  className="flex items-center justify-between text-xs rounded-xl px-3 py-2 bg-gray-50 dark:bg-[#252525]"
                >
                  <span className="text-gray-600 dark:text-gray-300">{t.label}</span>
                  <span className="font-bold text-indigo-600 dark:text-indigo-400">+{t.xp} XP</span>
                </div>
              ))}
            </div>

            {earnedDate && (
              <p className="text-xs text-center text-gray-400 mb-4">Earned on {earnedDate}</p>
            )}

            {locked && progress && (
              <div className="mb-4">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Progress</span>
                  <span>{progress.current} / {progress.required}</span>
                </div>
                <div className="w-full h-2 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-indigo-500"
                    style={{ width: `${Math.min(100, (progress.current / progress.required) * 100)}%` }}
                  />
                </div>
              </div>
            )}

            <button
              onClick={() => setShowModal(false)}
              className="w-full py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
