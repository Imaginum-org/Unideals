import React, { useEffect, useState, useMemo } from "react";
import { Info, Sparkles, Trophy } from "lucide-react";
import Profile_left_part from "../components/Profile_left_part.jsx";
import LevelCard from "../components/LevelCard.jsx";
import BadgeCard from "../components/BadgeCard.jsx";
import RankGuideModal from "../components/RankGuideModal.jsx";
import { fetchMyBadges, recomputeBadges } from "../api/badgeApi.js";
import { BADGE_CATALOGUE, BADGE_MAP, getBadgeMeta } from "../../../Utils/badgeConfig.js";

const CATEGORIES = [
  { id: "all",           label: "All" },
  { id: "seller",        label: "Seller" },
  { id: "buyer",         label: "Buyer" },
  { id: "communication", label: "Communication" },
  { id: "trust",         label: "Trust" },
  { id: "milestone",     label: "Milestone" },
];

const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

export default function Achievements() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [recomputing, setRecomputing] = useState(false);
  const [activeCategory, setActiveCategory] = useState("all");
  const [error, setError] = useState(null);
  const [showGuideModal, setShowGuideModal] = useState(false);

  const loadBadges = async () => {
    try {
      setLoading(true);
      const res = await fetchMyBadges();
      if (res.data.success) setData(res.data.data);
    } catch (err) {
      setError("Failed to load your achievements.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadBadges(); }, []);

  const handleRecompute = async () => {
    try {
      setRecomputing(true);
      const res = await recomputeBadges();
      if (res.data.success) setData(res.data.data);
    } catch (_) {}
    finally { setRecomputing(false); }
  };

  // Build earned map: badge_id -> earned badge object
  const earnedMap = useMemo(() => {
    if (!data) return {};
    return Object.fromEntries((data.badges || []).map((b) => [b.badge_id, b]));
  }, [data]);

  // Build full grid: earned + locked badges for active category
  const badgeGrid = useMemo(() => {
    const all = BADGE_CATALOGUE.filter(
      (b) => activeCategory === "all" || b.category === activeCategory
    );

    return all.map((def) => {
      const earned = earnedMap[def.id];
      if (earned) {
        const isNew = earned.earned_at && Date.now() - new Date(earned.earned_at).getTime() < THREE_DAYS_MS;
        return { ...earned, badge_id: def.id, locked: false, isNew };
      }
      // Locked: find progress from locked_badges if available
      const lockInfo = (data?.locked_badges || []).find((l) => l.badge_id.startsWith(def.id));
      return {
        badge_id: def.id,
        tier: def.tiers[0]?.tier || "bronze",
        xp_granted: def.tiers[0]?.xp || 0,
        locked: true,
        progress: lockInfo?.progress || null,
        isNew: false,
      };
    });
  }, [data, earnedMap, activeCategory]);

  return (
    <div className="w-full h-full overflow-hidden dark:bg-[#131313] bg-[#F7F9FD] font-figtree">
      <div className="flex h-[calc(100vh-70px)]">
        {/* Left panel */}
        <div className="hidden md:block md:w-auto md:shrink-0 bg-white dark:bg-[#131313] xl:pt-2">
          <Profile_left_part />
        </div>

        {/* Main content */}
        <div className="h-full md:flex-1 overflow-y-auto no-scrollbar bg-[#F7F9FD] dark:bg-[#131313] p-6 lg:p-8 xl:px-[5.7rem] xl:py-6">
          <div className="max-w-5xl mx-auto space-y-6 pb-6">

            {/* Page header */}
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h1 className="text-xl font-extrabold text-gray-900 dark:text-white">Achievements</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Earn XP and unlock badges by being an active campus trader.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowGuideModal(true)}
                  className="text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/60 px-3 py-1.5 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors flex items-center gap-1.5 shadow-xs"
                >
                  <span className="w-4 h-4 rounded-full bg-indigo-600 text-white text-[10px] flex items-center justify-center font-black">!</span>
                  <span>How Ranks Work</span>
                </button>
                <button
                  onClick={handleRecompute}
                  disabled={recomputing || loading}
                  className="text-xs font-semibold text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-800 px-3 py-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-[#202020] transition-colors disabled:opacity-50"
                >
                  {recomputing ? "Syncing..." : "Sync Badges"}
                </button>
              </div>
            </div>

            {/* Level card */}
            {loading ? (
              <div className="h-40 rounded-2xl bg-white dark:bg-[#1c1c1c] animate-pulse border border-gray-100 dark:border-gray-800" />
            ) : error ? (
              <div className="text-sm text-red-500 p-4">{error}</div>
            ) : data ? (
              <LevelCard
                total_xp={data.total_xp}
                level={data.level}
                rank_title={data.rank_title}
                xp_to_next_level={data.xp_to_next_level}
                next_level={data.next_level}
                progress_percent={data.progress_percent}
                badge_count={(data.badges || []).length}
              />
            ) : null}

            {/* Category filter tabs */}
            <div className="flex gap-2 flex-wrap">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all duration-150 ${
                    activeCategory === cat.id
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20"
                      : "bg-white dark:bg-[#1c1c1c] text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:border-indigo-400 dark:hover:border-indigo-600"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Badge grid */}
            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-36 rounded-2xl bg-white dark:bg-[#1c1c1c] animate-pulse border border-gray-100 dark:border-gray-800"
                  />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {badgeGrid.map((b) => (
                  <BadgeCard key={b.badge_id} {...b} />
                ))}
              </div>
            )}

            {/* Empty state */}
            {!loading && badgeGrid.length === 0 && (
              <div className="text-center py-16 text-gray-400 dark:text-gray-600">
                <p className="text-4xl mb-3">🏅</p>
                <p className="text-sm font-medium">No badges in this category yet.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Ranks & Levels Guide Modal */}
      <RankGuideModal
        isOpen={showGuideModal}
        onClose={() => setShowGuideModal(false)}
        currentRank={data?.rank_title || "Seedling"}
        currentLevel={data?.level || 1}
        currentXp={data?.total_xp || 0}
      />
    </div>
  );
}
