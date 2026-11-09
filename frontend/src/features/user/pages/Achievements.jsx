import { useEffect, useState, useMemo } from "react";
import { Info, Sparkles, Target, Trophy } from "lucide-react";
import { AccountLayout, CARD, ErrorState, TabBar, btnSecondary } from "../components/account/AccountKit.jsx";
import LevelCard from "../components/LevelCard.jsx";
import BadgeCard from "../components/BadgeCard.jsx";
import RankGuideModal from "../components/RankGuideModal.jsx";
import { fetchMyBadges } from "../api/badgeApi.js";
import { BADGE_CATALOGUE, BADGE_MAP } from "../../../utils/badgeConfig.js";

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
  const [activeCategory, setActiveCategory] = useState("all");
  const [error, setError] = useState(null);
  const [showGuideModal, setShowGuideModal] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        setLoading(true);
        const res = await fetchMyBadges();
        if (!cancelled && res.data.success) setData(res.data.data);
      } catch {
        if (!cancelled) setError("Failed to load your achievements.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, []);


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

  const earnedBadges = badgeGrid.filter((b) => !b.locked);
  const lockedBadges = badgeGrid
    .filter((b) => b.locked)
    .sort((a, b) => {
      const pa = a.progress?.required ? a.progress.current / a.progress.required : 0;
      const pb = b.progress?.required ? b.progress.current / b.progress.required : 0;
      return pb - pa;
    });

  const reload = () => {
    setError(null);
    setLoading(true);
    fetchMyBadges()
      .then((res) => {
        if (res.data.success) setData(res.data.data);
      })
      .catch(() => setError("Failed to load your achievements."))
      .finally(() => setLoading(false));
  };

  const earnedIn = (cat) =>
    (data?.badges || []).filter((b) => cat === "all" || (b.category || BADGE_MAP[b.badge_id]?.category) === cat).length;

  return (
    <AccountLayout
      seoTitle="Achievements | Unideals"
      width="xl"
      title="Achievements"
      description="From Fresher to Campus Icon. Trade on campus to level up."
      actions={
        // Badges refresh server-side when this page opens (no manual sync).
        <button type="button" onClick={() => setShowGuideModal(true)} className={btnSecondary}>
          <Info className="h-4 w-4" aria-hidden="true" />
          How ranks work
        </button>
      }
    >
      <div className="space-y-5">
        {loading ? (
          <div className="browse-shimmer h-44 rounded-2xl bg-neutral-100 dark:bg-white/5" />
        ) : error ? (
          <ErrorState message={error} onRetry={reload} />
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

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <TabBar
            ariaLabel="Badge category"
            tabs={CATEGORIES.map((c) => ({ value: c.id, label: c.label, count: data ? earnedIn(c.id) : 0 }))}
            value={activeCategory}
            onChange={setActiveCategory}
          />
        </div>

        {loading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="browse-shimmer h-36 rounded-2xl bg-neutral-100 dark:bg-white/5" />
            ))}
          </div>
        ) : badgeGrid.length > 0 ? (
          <div className="space-y-6">
            {earnedBadges.length > 0 && (
              <section>
                <h2 className="mb-3 flex items-center gap-2 text-[14px] font-semibold text-slate-900 dark:text-white">
                  <Trophy className="h-4 w-4 text-amber-500" aria-hidden="true" />
                  Earned
                  <span className="text-[12.5px] font-normal text-slate-400">{earnedBadges.length}</span>
                </h2>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
                  {earnedBadges.map((b) => (
                    <BadgeCard key={b.badge_id} {...b} />
                  ))}
                </div>
              </section>
            )}
            {lockedBadges.length > 0 && (
              <section>
                <h2 className="mb-3 flex items-center gap-2 text-[14px] font-semibold text-slate-900 dark:text-white">
                  <Target className="h-4 w-4 text-[var(--accent-text)]" aria-hidden="true" />
                  Up next
                  <span className="text-[12.5px] font-normal text-slate-400">{lockedBadges.length}</span>
                </h2>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
                  {lockedBadges.map((b) => (
                    <BadgeCard key={b.badge_id} {...b} />
                  ))}
                </div>
              </section>
            )}
          </div>
        ) : (
          <div className={`${CARD} px-6 py-12 text-center`}>
            <Sparkles className="mx-auto h-7 w-7 text-slate-300 dark:text-zinc-600" aria-hidden="true" />
            <p className="mt-2 text-[14px] font-medium text-slate-500 dark:text-zinc-400">No badges in this category yet.</p>
          </div>
        )}
      </div>

      <RankGuideModal
        isOpen={showGuideModal}
        onClose={() => setShowGuideModal(false)}
        currentRank={data?.rank_title || "Seedling"}
        currentLevel={data?.level || 1}
        currentXp={data?.total_xp || 0}
      />
    </AccountLayout>
  );
}
