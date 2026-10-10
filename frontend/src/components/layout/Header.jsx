import { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { GrLocation } from "react-icons/gr";
import { CiSearch } from "react-icons/ci";
import { IoNotificationsOutline } from "react-icons/io5";
import ThemeToggle from "../ui/ThemeToggle.jsx";
import Wordmark from "../ui/Wordmark.jsx";
import { FiMessageSquare } from "react-icons/fi";
import { FiSettings } from "react-icons/fi";
import { FaPlus } from "react-icons/fa6";
import { FaStar } from "react-icons/fa";
import { LuMessageSquare } from "react-icons/lu";
import { LuUserRound } from "react-icons/lu";
import { LuPackage } from "react-icons/lu";
import { LuCircleHelp } from "react-icons/lu";
import { LuShield } from "react-icons/lu";
import { LuBell } from "react-icons/lu";
import { LuLock } from "react-icons/lu";
import { LuCheck } from "react-icons/lu";
import { LuTrophy } from "react-icons/lu";
import { BsBoxSeam } from "react-icons/bs";
import { BsLightningChargeFill } from "react-icons/bs";
import { IoIosHeartEmpty } from "react-icons/io";
import { MdOutlineLogout } from "react-icons/md";
import { IoChevronBackOutline } from "react-icons/io5";
import AvatarComponent from "../common/AvatarComponent.jsx";
import { useUser } from "../../context/useUserContext.jsx";
import { useCampus } from "../../context/CampusContext.jsx";
import { ikFirstThumb } from "../../utils/imageTransform.js";
import { logoutUser } from "../../features/auth/api/authApi.js";
import useDebounce from "../../features/search/hooks/useDebounce";
import { searchProducts, getTrendingProducts } from "../../features/search/api/searchApi";
import SearchDropdown from "../../features/search/components/SearchDropdown";
import { toast } from "react-hot-toast";
import { levelProgress, xpToNextLevel } from "../../utils/badgeConfig.js";
import {
  latestFirst,
  loadNotifications,
  markStoredAllRead,
  markStoredRead,
  unreadCountOf,
} from "../../features/notification/data/notifications.js";

const ProfileDropdown = ({
  userDetails,
  userLoading,
  onClose,
  onLogout,
  mobile = false,
}) => {
  const campus = userDetails?.campus_id;
  const campusLabel =
    (campus && typeof campus === "object" ? campus.name : null) ||
    userDetails?.college ||
    userDetails?.campus ||
    null;
  const soldCount = userDetails?.soldCount ?? userDetails?.stats?.sold ?? 0;

  const menuGroups = [
    [
      { to: "/profile", icon: <LuUserRound />, label: "My Profile" },
      { to: "/productlisted", icon: <LuPackage />, label: "My Listings" },
      { to: "/myorders", icon: <BsBoxSeam />, label: "Orders" },
      { to: "/wishlist", icon: <IoIosHeartEmpty />, label: "Wishlist" },
      { to: "/achievements", icon: <LuTrophy />, label: "Achievements" },
      { to: "/chat", icon: <FiMessageSquare />, label: "Messages" },
      { to: "/notification", icon: <LuBell />, label: "Notifications" },
    ],
    [
      { to: "/settings", icon: <FiSettings />, label: "Settings" },
      { to: "/contact", icon: <LuCircleHelp />, label: "Help Center" },
      {
        to: "/privacy-policy",
        icon: <LuShield />,
        label: "Privacy & Security",
      },
    ],
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.98 }}
      transition={{
        duration: 0.18,
        ease: [0.22, 1, 0.36, 1],
      }}
      className={`
        absolute
        -right-3
        top-full
        z-50
        mt-2.5
        max-h-[calc(100vh-6rem)]
        ${mobile ? "w-[min(calc(100vw-2rem),276px)]" : "w-[286px]"}
        overflow-y-auto
        overflow-x-hidden
        rounded-2xl
        border
        border-neutral-200
        bg-[#F7F8FA]
        shadow-[0_14px_34px_rgba(15,23,42,0.12)]
        dark:border-neutral-800
        dark:bg-[#1A1D20]
        sm:-right-4
      `}
    >
      <div className="px-[17px] pb-[13px] pt-[17px]">
        <div className="flex items-center gap-[13px]">
          <AvatarComponent
            name={userDetails?.name}
            imageUrl={userDetails?.avatar?.url}
            size="xmedium"
            plan={userDetails?.subscription}
            isLoading={userLoading}
            className="shrink-0 rounded-full"
            showBadge
          />

          <div className="min-w-0">
            <h1 className="truncate text-[15px] font-semibold leading-tight text-[#1F2937] dark:text-white">
              {userDetails?.name || "User"}
            </h1>

            <p className="truncate text-[13px] leading-4 text-neutral-400 dark:text-neutral-500">
              {userDetails?.email || ""}
            </p>

            <div className="mt-0.5 flex min-w-0 items-center gap-1 text-[13px] font-medium text-[#4B45FF] dark:text-[#A5B0FF]">
              <GrLocation className="size-3 shrink-0" />
              <span className="truncate">{campusLabel || "Set campus"}</span>
            </div>
          </div>
        </div>

        <div className="mt-[13px] flex flex-wrap items-center gap-x-[11px] gap-y-1 border-t border-neutral-200 pt-[11px] text-[13px] dark:border-neutral-800">
          <div className="flex min-w-0 items-center gap-1">
            <FaStar className="size-3 shrink-0 text-[#FFB000]" />
            <span className="font-semibold text-[#4B5563] dark:text-neutral-100">
              5
            </span>
            <span className="text-neutral-400">trust</span>
          </div>

          <div className="h-3.5 w-px bg-neutral-200 dark:bg-neutral-700" />

          <div className="flex min-w-0 items-center gap-1">
            <BsLightningChargeFill className="size-3 shrink-0 text-[#4B45FF]" />
            <span className="font-semibold text-[#111827] dark:text-neutral-100">
              100%
            </span>
            <span className="text-neutral-400">response</span>
          </div>

          <div className="h-3.5 w-px bg-neutral-200 dark:bg-neutral-700" />

          <div className="whitespace-nowrap text-neutral-400">
            <span className="font-semibold text-[#9CA3AF] dark:text-neutral-300">
              {soldCount}
            </span>{" "}
            sold
          </div>
        </div>
      </div>

      {/* ── Gamification XP Strip ── */}
      {(() => {
        const g = userDetails?.gamification;
        if (!g) return null;
        const rankIcons = { Seedling: "🌱", Explorer: "🔵", Dealer: "⚡", Hustler: "🔥", Legend: "💎", "Campus King": "👑", "Campus Queen": "👑", "Campus Royale": "👑" };
        const rankColors = { Seedling: "#22C55E", Explorer: "#06B6D4", Dealer: "#6366F1", Hustler: "#F97316", Legend: "#F59E0B", "Campus King": "#7C3AED", "Campus Queen": "#EC4899", "Campus Royale": "#8B5CF6" };
        const rank = g.rank_title || "Seedling";
        const level = g.level || 1;
        const totalXp = g.total_xp || 0;
        const progress = Math.min(g.progress_percent ?? levelProgress(totalXp), 100);
        const xpToNext = g.xp_to_next_level ?? xpToNextLevel(totalXp);
        const badgeCount = (g.badges || []).length;
        const rankColor = rankColors[rank] || "#6366F1";
        const rankIcon = rankIcons[rank] || "⚡";
        return (
          <Link
            to="/achievements"
            onClick={onClose}
            className="mx-[13px] mb-[7px] block rounded-xl border border-neutral-200 dark:border-neutral-700 bg-gradient-to-r from-[#F7F8FA] to-[#F7F8FA] dark:from-neutral-800/60 dark:to-neutral-800 px-3 py-2.5 hover:border-indigo-300 dark:hover:border-indigo-700 transition-all duration-200 group"
          >
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5">
                <span className="text-base leading-none">{rankIcon}</span>
                <span className="text-[12px] font-extrabold" style={{ color: rankColor }}>{rank}</span>
                <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black bg-neutral-100 dark:bg-neutral-700 text-neutral-500 dark:text-neutral-300">
                  Lv. {level}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[10px] font-bold text-neutral-400">{totalXp.toLocaleString("en-IN")} XP</span>
                {badgeCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300">
                    {badgeCount} 🏅
                  </span>
                )}
              </div>
            </div>
            <div className="w-full h-1.5 rounded-full bg-neutral-200 dark:bg-neutral-700 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${progress}%`, background: `linear-gradient(90deg, ${rankColor}99, ${rankColor})` }}
              />
            </div>
            {xpToNext > 0 && (
              <p className="text-[9px] text-neutral-400 mt-1 text-right font-medium">
                {xpToNext.toLocaleString("en-IN")} XP to next level →
              </p>
            )}
          </Link>
        );
      })()}

      {menuGroups.map((group, groupIndex) => (
        <div
          key={groupIndex}
          className="border-t border-neutral-200 py-1.5 dark:border-neutral-800"
        >
          {group.map(({ to, icon, label }) => (
            <Link
              key={label}
              to={to}
              onClick={onClose}
              className="flex items-center gap-[13px] px-[17px] py-[9px] text-[13px] font-medium text-[#4B5563] transition-colors duration-200 hover:bg-[#4B45FF]/10 hover:text-[#2E40DC] active:bg-[#4B45FF]/[0.15] dark:text-neutral-200 dark:hover:bg-[#4B45FF]/20 dark:hover:text-[#C3C9FF] dark:active:bg-[#4B45FF]/25"
            >
              <span className="text-[17px] text-[#9CA3AF] dark:text-neutral-400">
                {icon}
              </span>
              <span>{label}</span>
            </Link>
          ))}
        </div>
      ))}

      <button
        onClick={onLogout}
        className="group flex w-full items-center gap-[13px] border-t border-neutral-200 px-[17px] py-[13px] text-[13px] font-medium text-[#4B5563] transition-colors duration-200 hover:bg-red-50 hover:text-red-500 active:bg-red-50 dark:border-neutral-800 dark:text-neutral-200 dark:hover:bg-red-950/20 dark:hover:text-red-400 dark:active:bg-red-950/20"
      >
        <MdOutlineLogout className="text-[17px] text-[#9CA3AF] transition-colors duration-200 group-hover:text-red-500 dark:text-neutral-400" />
        <span>Sign Out</span>
      </button>
    </motion.div>
  );
};

const CampusDropdown = ({ campuses, activeSlug, onPick, alignClass }) => (
  <motion.div
    initial={{ opacity: 0, y: 8, scale: 0.98 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    exit={{ opacity: 0, y: 8, scale: 0.98 }}
    transition={{
      duration: 0.18,
      ease: [0.22, 1, 0.36, 1],
    }}
    role="listbox"
    aria-label="Choose a campus to browse"
    className={`
          absolute
          top-full
          z-50
          mt-2
          overflow-hidden
          rounded-2xl
          border
          border-[#EEF1F5]
          bg-[#F7F8FA]
          p-1.5
          dark:border-neutral-800
          dark:bg-[#1A1D20]
          ${alignClass || "left-0 w-60"}
        `}
  >
    <p className="px-3 pb-1.5 pt-2 text-[10px] font-bold uppercase tracking-[0.12em] text-neutral-400 dark:text-neutral-500">
      Browse campus
    </p>
    {(campuses || []).map((c) => {
      const isActive = activeSlug === c.slug;
      return (
        <button
          key={c.slug}
          type="button"
          role="option"
          aria-selected={isActive}
          onClick={() => onPick(c.slug)}
          className={`
              flex
              w-full
              items-center
              gap-3
              rounded-xl
              px-3
              py-2.5
              text-left
              transition-colors
              duration-150
              ${
                isActive
                  ? "bg-[#4B45FF]/10 dark:bg-[#4B45FF]/20"
                    : "hover:bg-[#4B45FF]/10 dark:hover:bg-[#4B45FF]/20"
              }
            `}
        >
          <GrLocation
            className={`
                                  size-4
                                  shrink-0
                                  ${
                                    isActive
                                      ? "text-[#4B45FF] dark:text-[#A5B0FF]"
                                      : "text-neutral-400 dark:text-neutral-500"
                                  }
                                `}
          />

          <span className="min-w-0 flex-1 leading-tight">
            <span
              className={`
                                    block
                                    truncate
                                    text-[13px]
                                    font-semibold
                                    ${
                                      isActive
                                        ? "text-[#2E40DC] dark:text-[#C3C9FF]"
                                        : "text-[#090A0B] dark:text-white"
                                    }
                                  `}
            >
              {c.name}
            </span>
            <span className="mt-0.5 block truncate text-[11px] font-medium text-neutral-400 dark:text-neutral-500">
              {[c.city, c.state].filter(Boolean).join(", ") || "India"}
            </span>
          </span>

          {isActive && (
            <LuCheck
              size={14}
              strokeWidth={3}
              className="shrink-0 text-[#4B45FF] dark:text-[#A5B0FF]"
            />
          )}
        </button>
      );
    })}
  </motion.div>
);

// Notification dropdown — same panel language as the profile menu:
// bordered rounded-2xl card, icon rows, unread dots, footer action.
const NotifDropdown = ({ items, unread, onOpen, onMarkAll, onViewAll }) => (
  <motion.div
    initial={{ opacity: 0, y: 8, scale: 0.98 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    exit={{ opacity: 0, y: 8, scale: 0.98 }}
    transition={{
      duration: 0.18,
      ease: [0.22, 1, 0.36, 1],
    }}
    role="menu"
    aria-label="Notifications"
    className="
        absolute
        -right-3
        top-full
        z-50
        mt-2.5
        max-h-[calc(100vh-6rem)]
        w-[340px]
        max-w-[calc(100vw-2rem)]
        overflow-hidden
        rounded-2xl
        border
        border-neutral-200
        bg-[#F7F8FA]
        shadow-[0_14px_34px_rgba(15,23,42,0.12)]
        dark:border-neutral-800
        dark:bg-[#1A1D20]
        sm:-right-4
      "
  >
    <div className="flex items-center justify-between gap-2 px-4 pb-2 pt-3.5">
      <p className="flex items-center gap-2 text-[15px] font-bold text-[#1F2937] dark:text-white">
        Notifications
        {unread > 0 && (
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#FF3B30] px-1.5 text-[11px] font-bold text-white">
            {unread}
          </span>
        )}
      </p>
      <button
        type="button"
        onClick={onMarkAll}
        disabled={unread === 0}
        className="text-[12px] font-bold text-[#4B45FF] transition hover:text-[#2E40DC] disabled:cursor-not-allowed disabled:opacity-40 dark:text-[#A5B0FF]"
      >
        Mark all read
      </button>
    </div>

    {items.length === 0 ? (
      <p className="px-4 pb-4 pt-1 text-center text-[13px] font-medium text-neutral-400 dark:text-neutral-500">
        You&apos;re caught up 🎉
      </p>
    ) : (
      <div className="max-h-[320px] overflow-y-auto px-2 pb-1">
        {items.map((n) => {
          const Icon = n.icon;
          return (
            <button
              key={n.id}
              type="button"
              role="menuitem"
              onClick={() => onOpen(n)}
              className={`
                flex
                w-full
                items-start
                gap-3
                rounded-xl
                px-3
                py-2.5
                text-left
                transition-colors
                duration-150
                ${
                  n.unread
                    ? "bg-[#4B45FF]/[0.07] hover:bg-[#4B45FF]/[0.12] dark:bg-[#4B45FF]/15 dark:hover:bg-[#4B45FF]/25"
                  : "hover:bg-[#4B45FF]/10 dark:hover:bg-[#4B45FF]/20"
                }
              `}
            >
              <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-[#EEF1FF] dark:bg-white/10">
                {Icon && (
                  <Icon size={16} strokeWidth={2} className={n.iconColor} />
                )}
              </span>
              <span className="min-w-0 flex-1 leading-tight">
                <span className="flex items-start justify-between gap-2">
                  <span className="truncate text-[13px] font-semibold text-[#090A0B] dark:text-white">
                    {n.title}
                  </span>
                  {n.unread && (
                    <span
                      className={`mt-1 size-2 shrink-0 rounded-full ${n.dotColor}`}
                    />
                  )}
                </span>
                <span className="mt-0.5 block truncate text-[12px] font-medium text-neutral-400 dark:text-neutral-500">
                  {n.description}
                </span>
                <span className="mt-1 block text-[11px] font-bold text-neutral-400 dark:text-neutral-500">
                  {n.time}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    )}

    <div className="border-t border-neutral-200 p-2 dark:border-neutral-800">
      <button
        type="button"
        onClick={onViewAll}
        className="w-full rounded-xl bg-[#4B45FF]/10 px-4 py-2.5 text-[13px] font-bold text-[#2E40DC] transition-colors duration-150 hover:bg-[#4B45FF]/20 dark:bg-[#4B45FF]/20 dark:text-[#C3C9FF]"
      >
        View all notifications
      </button>
    </div>
  </motion.div>
);

const Header = () => {
  const {
    userDetails,
    isLoggedIn,
    loading: userLoading,
    fetchUserProfile,
    clearUserData,
  } = useUser();

  // Campus marketplace scope (locked for members — changed only via
  // Settings; guests may switch their browse campus freely).
  const {
    campus: activeCampus,
    campusSlug,
    campuses,
    selectCampus,
  } = useCampus();
  const [showCampusDropdown, setShowCampusDropdown] = useState(false);
  const [showMobileCampus, setShowMobileCampus] = useState(false);

  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [resultsTotal, setResultsTotal] = useState(null);
  const [matchedCategories, setMatchedCategories] = useState([]);
  const [trending, setTrending] = useState([]);
  const [trendingLoading, setTrendingLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showmenu, setShowmenu] = useState(false);
  const [unreadCount, setUnreadCount] = useState(() =>
    unreadCountOf(loadNotifications()),
  );
  const [showNotif, setShowNotif] = useState(false);
  const [notifItems, setNotifItems] = useState([]);
  const notifRef = useRef(null);
  const chatBadge = 1;
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [cube, setCube] = useState({ step: 0, faces: [0, 1, 2, 3] });
  const reduceMotion = useReducedMotion();
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [recentSearches, setRecentSearches] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [showHeader, setShowHeader] = useState(true);

  const lastScrollY = useRef(0);
  const scrollStartY = useRef(0);
  const lastDirection = useRef(null);
  // Delayed dropdown close: tracked so focus/unmount can cancel it before
  // it swallows an in-flight suggestion click.
  const blurTimerRef = useRef(null);

  useEffect(() => {
    const timerRef = blurTimerRef;
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, []);

  useEffect(() => {
    try {
      const storedSearches = localStorage.getItem("recentSearches");

      if (storedSearches) {
        const parsed = JSON.parse(storedSearches);
        if (Array.isArray(parsed)) {
          setRecentSearches(
            parsed
              .filter((s) => typeof s === "string")
              .map((s) => s.slice(0, 100))
              .slice(0, 5),
          );
        }
      }
    } catch {
      try {
        localStorage.removeItem("recentSearches");
      } catch {
        // ignore
      }
    }
  }, []);

  const placeholderWords = [
    "Electronics",
    "Study Material",
    "Hostel Essentials",
    "Clothing",
    "Accessories",
    "Lab Equipment",
    "Sports",
    "Fitness",
    "Vehicle",
    "Event Passes",
    "Others",
  ];

  const mobileCategories = [
    {
      label: "Electronics",
      slug: "electronics",
    },
    {
      label: "Study Material",
      slug: "study_material",
    },
    {
      label: "Hostel Essentials",
      slug: "hostel_essentials",
    },
    {
      label: "Clothing",
      slug: "clothing",
    },
    {
      label: "Accessories",
      slug: "accessories",
    },
    {
      label: "Lab Equipment",
      slug: "lab_equipment",
    },
    {
      label: "Sports",
      slug: "sports",
    },
    {
      label: "Fitness",
      slug: "fitness",
    },
    {
      label: "Vehicles",
      slug: "vehicles",
    },
    {
      label: "Event Passes",
      slug: "event_passes",
    },
  ];

  const debouncedQuery = useDebounce(query, 300);

  const navigate = useNavigate();
  const location = useLocation();

  const menuRefMobile = useRef(null);
  const menuRefDesktop = useRef(null);
  const campusRef = useRef(null);
  const campusRefMobile = useRef(null);
  const searchInputRef = useRef(null);

  useEffect(() => {
    if (isLoggedIn && !userDetails) {
      fetchUserProfile();
    }
  }, [isLoggedIn, userDetails, fetchUserProfile]);

  useEffect(() => {
    const path = location.pathname;

    if (path.startsWith("/search") || path.startsWith("/product")) {
      setSearch("");
      setQuery("");
      setResults([]);
      setShowDropdown(false);
    }
  }, [location.pathname]);
  useEffect(() => {
    if (debouncedQuery.trim().length < 2) {
      setResults([]);
      setResultsTotal(null);
      setMatchedCategories([]);
      setHasSearched(false);
      return;
    }

    // AbortController + request id: a slow earlier response must never
    // overwrite fresher results (classic keystroke race).
    const controller = new AbortController();
    let stale = false;

    const fetch = async () => {
      try {
        setSearchLoading(true);

        // Full /search engine (limit 6) so the dropdown shares ranking,
        // prices, categories, and totals with the results page.
        const res = await searchProducts(
          {
            q: debouncedQuery.trim().slice(0, 100),
            limit: 6,
            ...(campusSlug ? { campus_slug: campusSlug } : {}),
          },
          { signal: controller.signal },
        );

        if (stale) return;
        setResults(res.data?.products || []);
        setResultsTotal(res.data?.pagination?.total ?? null);
        setMatchedCategories(res.data?.matchedCategories || []);
        setSelectedIndex(-1);
        setHasSearched(true);
      } catch (err) {
        if (stale || err?.code === "ERR_CANCELED" || err?.name === "CanceledError") {
          return;
        }
        setResults([]);
        setResultsTotal(null);
        setMatchedCategories([]);
      } finally {
        if (!stale) setSearchLoading(false);
      }
    };

    fetch();
    return () => {
      stale = true;
      controller.abort();
    };
  }, [debouncedQuery, campusSlug]);

  // Trending for the empty-query dropdown state (fetched once, lazily).
  const ensureTrending = () => {
    if (trending.length > 0 || trendingLoading) return;
    setTrendingLoading(true);
    getTrendingProducts(campusSlug ? { campus_slug: campusSlug } : undefined)
      .then((res) => setTrending(res.data?.data || []))
      .catch(() => {})
      .finally(() => setTrendingLoading(false));
  };

  // Sync trending with the active campus: a switch drops stale picks and
  // refetches for the new marketplace.
  useEffect(() => {
    setTrending([]);
    setTrendingLoading(true);
    getTrendingProducts(campusSlug ? { campus_slug: campusSlug } : undefined)
      .then((res) => setTrending(res.data?.data || []))
      .catch(() => {})
      .finally(() => setTrendingLoading(false));
  }, [campusSlug]);

  // True 3D cube: the 4 side faces each carry a word and the whole cube
  // steps forward 90° every interval. The face rotating to the back is
  // re-inked with the upcoming word while hidden, so all 11 words cycle
  // through one continuous cube. At step s the front face is s % 4 and
  // the back face is (s + 2) % 4, which next fronts at s + 2.
  useEffect(() => {
    const total = placeholderWords.length;
    const interval = setInterval(() => {
      setCube((prev) => {
        const ns = prev.step + 1;
        const next = [...prev.faces];
        next[(ns + 2) % 4] = (ns + 2) % total;
        return { step: ns, faces: next };
      });
    }, 2600);

    return () => {
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!showmenu) return;

    const handleOutsideInteraction = (event) => {
      const target = event.target;
      const insideAnyMenu =
        (menuRefMobile.current && menuRefMobile.current.contains(target)) ||
        (menuRefDesktop.current && menuRefDesktop.current.contains(target));
      if (!insideAnyMenu) {
        setShowmenu(false);
      }
    };

    const handleScroll = () => {
      setShowmenu(false);
    };

    document.addEventListener("mousedown", handleOutsideInteraction);

    window.addEventListener("scroll", handleScroll, {
      passive: true,
    });

    return () => {
      document.removeEventListener("mousedown", handleOutsideInteraction);

      window.removeEventListener("scroll", handleScroll);
    };
  }, [showmenu]);

  const refreshNotifs = () => {
    const list = loadNotifications();
    setNotifItems(latestFirst(list).slice(0, 5));
    setUnreadCount(unreadCountOf(list));
  };

  const toggleNotif = () => {
    if (!showNotif) refreshNotifs();
    setShowNotif((prev) => !prev);
  };

  const openNotif = (item) => {
    markStoredRead(item.id);
    setNotifItems((current) =>
      current.map((n) => (n.id === item.id ? { ...n, unread: false } : n)),
    );
    setUnreadCount((c) => Math.max(0, c - (item.unread ? 1 : 0)));
    setShowNotif(false);
    navigate(item.actionPath);
  };

  const markAllNotifRead = () => {
    markStoredAllRead();
    setNotifItems((current) => current.map((n) => ({ ...n, unread: false })));
    setUnreadCount(0);
  };

  // Keep badge/count in sync when returning from the Notifications page
  // (Header persists across route changes).
  useEffect(() => {
    refreshNotifs();
  }, [location.pathname]);

  // Notification dropdown: close on outside click, Escape, or scroll.
  useEffect(() => {
    if (!showNotif) return;

    const handleOutsideNotif = (event) => {
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setShowNotif(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === "Escape") setShowNotif(false);
    };

    const handleScroll = () => {
      setShowNotif(false);
    };

    document.addEventListener("mousedown", handleOutsideNotif);
    document.addEventListener("keydown", handleEscape);
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      document.removeEventListener("mousedown", handleOutsideNotif);
      document.removeEventListener("keydown", handleEscape);
      window.removeEventListener("scroll", handleScroll);
    };
  }, [showNotif]);

  // Location dropdowns (desktop + mobile): close on outside click or Escape.
  useEffect(() => {
    if (!showCampusDropdown && !showMobileCampus) return;

    const handleOutsideCampus = (event) => {
      const inDesktop =
        campusRef.current && campusRef.current.contains(event.target);
      const inMobile =
        campusRefMobile.current && campusRefMobile.current.contains(event.target);
      if (!inDesktop && !inMobile) {
        setShowCampusDropdown(false);
        setShowMobileCampus(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setShowCampusDropdown(false);
        setShowMobileCampus(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideCampus);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleOutsideCampus);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [showCampusDropdown, showMobileCampus]);

  useEffect(() => {
    if (!showMobileSearch) return;

    const scrollY = window.scrollY;

    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.left = "0";
    document.body.style.right = "0";
    document.body.style.width = "100%";

    return () => {
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.left = "";
      document.body.style.right = "";
      document.body.style.width = "";

      window.scrollTo(0, scrollY);
    };
  }, [showMobileSearch]);

  useEffect(() => {
    let ticking = false;

    const HIDE_DISTANCE = 18;
    const SHOW_DISTANCE = 18;

    const handleScroll = () => {
      const currentY = window.scrollY;

      if (!ticking) {
        requestAnimationFrame(() => {
          if (currentY <= 80) {
            setShowHeader(true);
            scrollStartY.current = currentY;
            lastDirection.current = null;
            lastScrollY.current = currentY;
            ticking = false;
            return;
          }

          const direction = currentY > lastScrollY.current ? "down" : "up";

          // Direction changed
          if (direction !== lastDirection.current) {
            lastDirection.current = direction;
            scrollStartY.current = currentY;
          }

          const travelled = Math.abs(currentY - scrollStartY.current);

          if (direction === "down" && travelled >= HIDE_DISTANCE) {
            setShowHeader(false);

            setShowmenu(false);
            setShowCampusDropdown(false);
            setShowDropdown(false);
          }

          if (direction === "up" && travelled >= SHOW_DISTANCE) {
            setShowHeader(true);
          }

          lastScrollY.current = currentY;
          ticking = false;
        });

        ticking = true;
      }
    };

    window.addEventListener("scroll", handleScroll, {
      passive: true,
    });

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const isMac = /Mac|iPhone|iPad/.test(navigator.platform);

  useEffect(() => {
    const handleShortcut = (e) => {
      // Don't trigger while typing in another input
      const tag = e.target.tagName;

      if (tag === "INPUT" || tag === "TEXTAREA" || e.target.isContentEditable) {
        return;
      }

      const isMac = /Mac|iPhone|iPad/.test(navigator.platform);

      const pressed =
        (isMac && e.metaKey && e.key.toLowerCase() === "k") ||
        (!isMac && e.ctrlKey && e.key.toLowerCase() === "k");

      if (!pressed) return;

      e.preventDefault();

      searchInputRef.current?.focus();
      searchInputRef.current?.select();

      setShowDropdown(true);
    };

    document.addEventListener("keydown", handleShortcut);

    return () => {
      document.removeEventListener("keydown", handleShortcut);
    };
  }, []);

  const handleMenu = () => {
    setShowmenu((prev) => !prev);
  };

  const handleSearchBar = (e) => {
    setSearch(e.target.value);
    setQuery(e.target.value);
    setShowDropdown(true);
  };

  const goToLogin = () => navigate("/login");
  const goToSignup = () => navigate("/signup");

  const saveRecentSearch = (searchTerm) => {
    const clean = String(searchTerm || "").trim().slice(0, 100);
    if (!clean) return;

    // Functional update: rapid consecutive saves never clobber each other.
    setRecentSearches((prev) => {
      const updatedSearches = [
        clean,
        ...prev.filter(
          (item) => item.toLowerCase() !== clean.toLowerCase(),
        ),
      ].slice(0, 5);

      try {
        localStorage.setItem("recentSearches", JSON.stringify(updatedSearches));
      } catch {
        // Quota/private-mode: in-memory list still works for the session.
      }

      return updatedSearches;
    });
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
    try {
      localStorage.removeItem("recentSearches");
    } catch {
      // ignore
    }
  };

  // Suggestion click also persists the typed query for recents.
  const handleSuggestionSelect = () => {
    const q = query.trim().slice(0, 100);
    if (q) saveRecentSearch(q);
    setShowDropdown(false);
  };

  const handleLogoutClick = async () => {
    try {
      const response = await logoutUser();

      if (response.data.success) {
        clearUserData();
        setShowmenu(false);

        toast.success("Logged out successfully");

        navigate("/");
      }
    } catch (err) {
      console.error(err);
      toast.error("Logout failed");
    }
  };

  return (
    <>
      <nav
        className={`
    sticky
    top-0
    z-50
    px-3
    pt-3
    sm:px-6
    dark:bg-transparent
    font-figtree
    transition-transform
    duration-300
    ease-[cubic-bezier(0.22,1,0.36,1)]
    ${showHeader ? "translate-y-0" : "-translate-y-full"}
  `}
      >
        <div className="mx-auto flex h-14 w-full max-w-[1380px] min-w-0 items-center justify-between rounded-2xl border border-[#ECEEF3] bg-[#F7F8FA] px-3 sm:h-16 sm:px-5 shadow-[0_10px_36px_-16px_rgba(23,27,80,0.22)] dark:border-neutral-800 dark:bg-[#1A1D20] dark:shadow-[0_10px_36px_-16px_rgba(0,0,0,0.7)]">
          {/* Mobile Navbar — single row: brand + icon actions */}
          <div className="flex w-full min-w-0 items-center justify-between gap-2 sm:hidden">
            <div className="flex min-w-0 flex-1 items-center justify-between gap-1">
            <Link
              to="/"
              aria-label="Unideals home"
              className="flex h-10 shrink-0 items-center"
            >
              <Wordmark
                fontSize={16}
                fontWeight={500}
                letterSpacing={0}
                className="text-[#000000] dark:text-white"
              />
            </Link>

            <div className="flex min-w-0 shrink-0 items-center gap-1">
              <ThemeToggle size="sm" />

              {isLoggedIn && (
                <button
                  onClick={() => navigate("/notification")}
                  className="relative rounded-full p-2 transition-transform duration-200 active:scale-95"
                  aria-label="Notifications"
                >
                  <IoNotificationsOutline
                    size={22}
                    className="text-[#090A0B] dark:text-neutral-300"
                  />
                  {unreadCount > 0 && (
                    <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#FF3B30] px-1 text-[10px] font-bold text-white">
                      {unreadCount}
                    </span>
                  )}
                </button>
              )}

              <button
                onClick={() => {
                  setShowMobileSearch(true);
                  setShowDropdown(false);
                }}
                className="rounded-full p-2 transition-transform duration-200 active:scale-95"
                aria-label="Open Search"
              >
                <CiSearch
                  size={22}
                  className="text-[#090A0B] dark:text-neutral-300"
                />
              </button>

              {activeCampus &&
                (isLoggedIn ? (
                  <span
                    title="Your campus marketplace. Change it in Settings."
                    className="rounded-full p-2"
                  >
                    <GrLocation
                      size={22}
                      className="text-[#2E4BFF] dark:text-[#A5B0FF]"
                    />
                  </span>
                ) : (
                  <span className="relative" ref={campusRefMobile}>
                    <button
                      type="button"
                      onClick={() => setShowMobileCampus((prev) => !prev)}
                      title="Choose a campus to browse"
                      aria-expanded={showMobileCampus}
                      aria-haspopup="listbox"
                      aria-label="Choose a campus to browse"
                      className="block rounded-full p-2 transition-transform duration-200 active:scale-95"
                    >
                      <GrLocation
                        size={22}
                        className="text-[#2E4BFF] dark:text-[#A5B0FF]"
                      />
                    </button>

                    <AnimatePresence>
                      {showMobileCampus && (
                        <CampusDropdown
                          campuses={campuses}
                          activeSlug={activeCampus.slug}
                          alignClass="right-0 w-64 max-w-[calc(100vw-3rem)]"
                          onPick={(slug) => {
                            selectCampus(slug);
                            setShowMobileCampus(false);
                          }}
                        />
                      )}
                    </AnimatePresence>
                  </span>
                ))}

              {isLoggedIn ? (
                <div className="relative" ref={menuRefMobile}>
                  <button
                    onClick={handleMenu}
                    className="transition-transform duration-200 active:scale-95"
                    aria-label="Open Menu"
                  >
                    <AvatarComponent
                      name={userDetails?.name}
                      imageUrl={userDetails?.avatar?.url}
                      size="small"
                      plan={userDetails?.subscription}
                      isLoading={userLoading}
                      className="rounded-full"
                      showBadge
                    />
                  </button>

                  <AnimatePresence>
                    {showmenu && (
                      <ProfileDropdown
                        userDetails={userDetails}
                        userLoading={userLoading}
                        onClose={() => setShowmenu(false)}
                        onLogout={handleLogoutClick}
                        mobile
                      />
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <div className="relative" ref={menuRefMobile}>
                  <button
                    onClick={handleMenu}
                    className="
      flex
      h-8
      w-8
      items-center
      justify-center
      rounded-full
      bg-neutral-100
      dark:bg-neutral-800
    "
                  >
                    <LuUserRound className="text-lg text-neutral-700 dark:text-neutral-200" />
                  </button>

                  <AnimatePresence>
                    {showmenu && (
                      <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.98 }}
                        transition={{
                          duration: 0.18,
                          ease: [0.22, 1, 0.36, 1],
                        }}
                        className="
          absolute
          -right-3
          top-full
          z-50
          mt-3
          w-[220px]
          overflow-hidden
          rounded-2xl
          border
          border-neutral-200
          bg-[#F7F8FA]
          shadow-2xl
          dark:border-neutral-800
          dark:bg-[#1A1D20]
          sm:-right-4
        "
                      >
                        <div className="p-3">
                          <button
                            onClick={() => {
                              setShowmenu(false);
                              goToLogin();
                            }}
                            className="
              mb-2
              w-full
              rounded-xl
              bg-[#1E1E1E]
              px-4
              py-3
              text-sm
              font-medium
              text-white
              dark:bg-white
              dark:text-black
            "
                          >
                            Login
                          </button>

                          <button
                            onClick={() => {
                              setShowmenu(false);
                              goToSignup();
                            }}
                            className="
              w-full
              rounded-xl
              border
              border-neutral-200
              px-4
              py-3
              text-sm
              font-medium
              text-neutral-700
              dark:border-neutral-700
              dark:text-neutral-200
            "
                          >
                            Sign Up
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>
            </div>
          </div>

          <AnimatePresence>
            {showMobileSearch && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                transition={{
                  duration: 0.2,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className="
        fixed
        inset-0
        z-[100]
        bg-[#F7F8FA]
        dark:bg-[#131313]
        sm:hidden
      "
              >
                {/* Header */}
                <div className="flex h-14 items-center gap-3 border-b border-neutral-200 px-4 dark:border-neutral-800">
                  <button
                    onClick={() => {
                      setShowMobileSearch(false);
                      setShowDropdown(false);
                    }}
                    className="transition-transform duration-200 active:scale-95 dark:text-white"
                  >
                    <IoChevronBackOutline size={22} />
                  </button>

                  {/* Search Input */}
                  <div className="relative flex-1">
                    <input
                      type="text"
                      role="combobox"
                      aria-expanded={showDropdown && query.trim().length > 0}
                      aria-label="Search products"
                      value={search}
                      onChange={(e) => {
                        handleSearchBar(e);

                        if (e.target.value.trim()) {
                          setShowDropdown(true);
                        } else {
                          setShowDropdown(false);
                        }
                      }}
                      onFocus={() => {
                        ensureTrending();
                        setShowDropdown(true);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Escape") {
                          setShowDropdown(false);
                          setSelectedIndex(-1);
                          return;
                        }
                        if (e.key === "Enter") {
                          const trimmedQuery = query.trim();

                          if (!trimmedQuery) {
                            navigate("/");
                            setShowMobileSearch(false);
                            setShowDropdown(false);
                            return;
                          }

                          saveRecentSearch(trimmedQuery);
                          navigate(
                            `/search?q=${encodeURIComponent(trimmedQuery)}`,
                          );
                          setShowDropdown(false);
                        }
                      }}
                      className="
    h-10
    w-full
    rounded-full
    border
    border-[#EEF1F5]
    bg-neutral-100
    pl-4
    pr-10
    text-sm
    outline-none
    focus:border-[#2E40DC]
    dark:border-neutral-700
    dark:bg-[#1A1D20]
    dark:text-white
  "
                      placeholder="Search products..."
                    />
                    <CiSearch
                      size={18}
                      className="
              absolute
              right-3
              top-1/2
              -translate-y-1/2
              text-[#090A0B]
            "
                    />
                  </div>
                </div>

                {/* Results */}
                <div className="h-[calc(100vh-56px)] overflow-y-auto bg-[#F7F8FA] dark:bg-[#131313]">
                  {showDropdown && query.trim() ? (
                    <SearchDropdown
                      results={results}
                      total={resultsTotal}
                      matchedCategories={matchedCategories}
                      trending={trending}
                      recentSearches={recentSearches}
                      onClearRecents={clearRecentSearches}
                      loading={searchLoading}
                      query={query}
                      mobile
                      hasSearched={hasSearched}
                      selectedIndex={selectedIndex}
                      setSelectedIndex={setSelectedIndex}
                      onSelect={handleSuggestionSelect}
                    />
                  ) : (
                    <div className="px-4 py-5">
                      {/* Categories */}
                      <div>
                        <h2 className="mb-3 text-sm font-semibold text-[#090A0B] dark:text-white">
                          Categories
                        </h2>

                        <div className="flex flex-wrap gap-2">
                          {mobileCategories.map((category) => (
                            <button
                              key={category}
                              onClick={() => {
                                navigate(`/category/${category.slug}`);

                                setShowMobileSearch(false);
                                setShowDropdown(false);
                              }}
                              className="
                rounded-full
                border
                border-neutral-200
                bg-[#F7F8FA]
                px-4
                py-2
                text-sm
                font-medium
                text-neutral-700
                transition-colors
                duration-200
                active:bg-neutral-100
                dark:border-neutral-700
                dark:bg-[#1A1D20]
                dark:text-neutral-200
              "
                            >
                              {category.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Recent Searches */}
                      <div className="mt-8">
                        <div className="mb-3 flex items-center justify-between">
                          <h2 className="text-sm font-semibold text-[#090A0B] dark:text-white">
                            Recent Searches
                          </h2>
                          {recentSearches.length > 0 && (
                            <button
                              onClick={clearRecentSearches}
                              className="text-xs font-semibold text-blue-500 hover:underline"
                            >
                              Clear
                            </button>
                          )}
                        </div>

                        <div className="flex flex-col">
                          {recentSearches.map((item) => (
                            <button
                              key={item}
                              onClick={() => {
                                saveRecentSearch(item);

                                navigate(
                                  `/search?q=${encodeURIComponent(item)}`,
                                );

                                setShowMobileSearch(false);
                                setShowDropdown(false);
                              }}
                              className="
                flex
                items-center
                gap-3
                rounded-xl
                px-3
                py-3
                text-left
                text-sm
                text-neutral-700
                transition-colors
                duration-200
                active:bg-neutral-100
                dark:text-neutral-300
                dark:active:bg-neutral-800
              "
                            >
                              <CiSearch className="text-neutral-400" />
                              {item}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Trending on campus */}
                      {trending.length > 0 && (
                        <div className="mt-8">
                          <h2 className="mb-3 text-sm font-semibold text-[#090A0B] dark:text-white">
                            Trending on campus
                          </h2>
                          <div className="flex flex-col">
                            {trending.slice(0, 4).map((item) => (
                              <button
                                key={item._id}
                                onClick={() => {
                                  navigate(`/product/${item._id}`);
                                  setShowMobileSearch(false);
                                  setShowDropdown(false);
                                }}
                                className="
                flex
                items-center
                gap-3
                rounded-xl
                px-3
                py-2.5
                text-left
                text-sm
                text-neutral-700
                transition-colors
                duration-200
                active:bg-neutral-100
                dark:text-neutral-300
                dark:active:bg-neutral-800
              "
                              >
                                <img
                                  src={ikFirstThumb(item.images?.[0])}
                                  alt={item.title || "Product"}
                                  loading="lazy"
                                  className="h-10 w-10 rounded-lg object-cover"
                                />
                                <span className="min-w-0 flex-1 truncate font-medium">
                                  {item.title}
                                </span>
                                {item.selling_price != null && (
                                  <span className="shrink-0 text-xs font-bold text-[#394FF1]">
                                    ₹
                                    {Number(item.selling_price).toLocaleString(
                                      "en-IN",
                                    )}
                                  </span>
                                )}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Desktop Navbar — single locked row: logo | campus | search | icons | sell+avatar.
              Nothing wraps or drops at any width: fixed items are shrink-0
              with truncation, only the search field flexes. */}
          <div className="hidden w-full min-w-0 flex-nowrap items-center gap-2 sm:flex md:gap-3 lg:gap-4">
            {/* Logo — SVG wordmark; hovering morphs the U into the logo mark */}
            <Link
              to="/"
              aria-label="Unideals home"
              className="flex h-11 shrink-0 items-center"
            >
              <Wordmark
                fontSize={19}
                fontWeight={700}
                letterSpacing={-0.5}
                className="text-[#000000] dark:text-white"
              />
            </Link>

            <span
              aria-hidden="true"
              className="h-6 w-px mx-1 shrink-0 bg-[#ECEEF3] dark:bg-neutral-800"
            />

            {/* Campus — pill; locked for members (opens Settings), switchable for guests */}
            {activeCampus ? (
              <div className="relative min-w-0 max-w-[38vw] shrink-0 sm:max-w-[210px] lg:max-w-none" ref={campusRef}>
                {isLoggedIn ? (
                  <div title="Your campus marketplace. Change it in Settings.">
                    <div
                      className="
      flex
      cursor-default
      items-center
      min-w-0
      gap-2
      rounded-xl
      bg-[#F3F4F6]
      px-4
      py-2.5
      dark:bg-neutral-800
    "
                    >
                      <GrLocation className="size-[18px] shrink-0 text-[#2E4BFF] dark:text-[#A5B0FF]" />

                      <span className="hidden min-w-0 flex-1 truncate whitespace-nowrap text-sm font-semibold text-[#111111] lg:block dark:text-white">
                        {activeCampus.name}
                      </span>

                      <LuLock
                        size={12}
                        className="hidden shrink-0 text-neutral-400 md:block dark:text-neutral-500"
                      />
                    </div>
                  </div>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => setShowCampusDropdown((prev) => !prev)}
                      title="Choose a campus to browse"
                      aria-expanded={showCampusDropdown}
                      aria-haspopup="listbox"
                      className="
      group
      flex
      w-full
      min-w-0
      items-center
      gap-2
      rounded-xl
      bg-[#F3F4F6]
      px-4
      py-2.5
      transition-colors
      duration-200
      hover:bg-[#ECEEF4]
      dark:bg-neutral-800
      dark:hover:bg-neutral-700
    "
                    >
                      <GrLocation className="size-[18px] shrink-0 text-[#2E4BFF] dark:text-[#A5B0FF]" />

                      <span className="hidden min-w-0 flex-1 truncate whitespace-nowrap text-sm font-semibold text-[#111111] lg:block dark:text-white">
                        {activeCampus.name}
                      </span>

                      <svg
                        className={`h-3.5 w-3.5 shrink-0 text-neutral-500 transition-transform duration-200 group-hover:text-[#2E4BFF] dark:text-neutral-400 ${
                          showCampusDropdown ? "rotate-180" : ""
                        }`}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2.5}
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </button>

                    <AnimatePresence>
                      {showCampusDropdown && (
                        <CampusDropdown
                          campuses={campuses}
                          activeSlug={activeCampus.slug}
                          onPick={(slug) => {
                            selectCampus(slug);
                            setShowCampusDropdown(false);
                          }}
                        />
                      )}
                    </AnimatePresence>
                  </>
                )}
              </div>
            ) : (
              ""
            )}

            {/* Search */}
            <div
              className="data-search-dropdown relative w-full min-w-0 max-w-[220px] flex-1 sm:max-w-[180px] md:max-w-[220px] lg:max-w-[320px] xl:ml-2 xl:max-w-[420px]"
              data-search-dropdown
            >
              <CiSearch
                size={20}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#111111] dark:text-neutral-300"
              />
              <input
                ref={searchInputRef}
                type="text"
                role="combobox"
                aria-expanded={showDropdown && query.trim().length > 0}
                aria-controls="search-suggestions"
                aria-label="Search products"
                value={search}
                onChange={handleSearchBar}
                onKeyDown={(e) => {
                  const visibleResults = results.slice(0, 5);

                  if (e.key === "Escape") {
                    setShowDropdown(false);
                    setSelectedIndex(-1);
                    return;
                  }

                  if (e.key === "ArrowDown") {
                    setShowDropdown(true);
                    e.preventDefault();

                    if (!visibleResults.length) return;

                    setSelectedIndex((prev) =>
                      prev < visibleResults.length - 1 ? prev + 1 : prev,
                    );

                    return;
                  }

                  if (e.key === "ArrowUp") {
                    e.preventDefault();

                    if (!visibleResults.length) return;

                    setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));

                    return;
                  }

                  if (e.key === "Enter") {
                    e.preventDefault();

                    if (
                      selectedIndex >= 0 &&
                      selectedIndex < visibleResults.length
                    ) {
                      navigate(`/product/${visibleResults[selectedIndex]._id}`);
                      setShowDropdown(false);
                      return;
                    }

                    const trimmedQuery = query.trim();

                    if (!trimmedQuery) {
                      navigate("/");
                      setShowDropdown(false);
                      return;
                    }

                    saveRecentSearch(trimmedQuery);

                    navigate(`/search?q=${encodeURIComponent(trimmedQuery)}`);

                    setShowDropdown(false);
                  }
                }}
                onBlur={(e) => {
                  if (e.relatedTarget?.closest("[data-search-dropdown]")) {
                    return;
                  }

                  if (blurTimerRef.current) {
                    window.clearTimeout(blurTimerRef.current);
                  }
                  blurTimerRef.current = window.setTimeout(
                    () => setShowDropdown(false),
                    150,
                  );
                }}
                onFocus={() => {
                  if (blurTimerRef.current) {
                    window.clearTimeout(blurTimerRef.current);
                    blurTimerRef.current = null;
                  }
                  ensureTrending();
                  setShowDropdown(true);
                }}
                className="h-11 w-full min-w-0 rounded-xl border border-transparent
bg-[#F3F4F6]
dark:bg-neutral-800
pl-11 pr-4 text-sm text-[#111111]
outline-none
transition-colors
duration-200
placeholder:text-[#9AA0AE]
hover:bg-[#ECEEF2]
focus:bg-[#F7F8FA] focus:ring-4 focus:ring-[#3838EC]/10
dark:text-white dark:placeholder:text-neutral-500 dark:hover:bg-neutral-700 dark:focus:bg-[#1A1D20] dark:focus:ring-[#3838EC]/20
lg:pr-24"
              />

              {search === "" && (
                <span className="pointer-events-none absolute left-11 top-1/2 flex max-w-[calc(100%-4rem)] -translate-y-1/2 items-center gap-1 truncate text-sm lg:max-w-[calc(100%-7rem)]">
                  <span className="shrink-0 text-[#9AA0AE] dark:text-neutral-500">
                    Search for
                  </span>

                  {/* True 3D cube: all four side faces carry a word and the
                      whole cube steps forward — front face rolls away over
                      the top edge while the next face rolls up from below. */}
                  <span className="relative inline-flex min-w-0 [perspective:600px]">
                    {reduceMotion ? (
                      <span className="truncate font-medium text-[#2E4BFF] dark:text-[#8FA2FF]">
                        {placeholderWords[cube.faces[0]]}
                      </span>
                    ) : (
                      <motion.span
                        animate={{ rotateX: -90 * cube.step }}
                        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                        className="relative block h-[22px] w-[128px] [transform-style:preserve-3d]"
                      >
                        {[0, 1, 2, 3].map((face) => (
                          <span
                            key={face}
                            aria-hidden={face !== cube.step % 4}
                            className="absolute inset-0 flex items-center overflow-hidden [backface-visibility:hidden]"
                            style={{
                              transform: `rotateX(${face * 90}deg) translateZ(11px)`,
                            }}
                          >
                            <span className="truncate font-medium text-[#2E4BFF] dark:text-[#8FA2FF]">
                              {placeholderWords[cube.faces[face]]}
                            </span>
                          </span>
                        ))}
                      </motion.span>
                    )}
                  </span>
                </span>
              )}

              {search === "" && (
                <div className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 items-center gap-1 rounded-md bg-[#F7F8FA] py-[3px] pl-1.5 pr-1.5 shadow-[0_1px_2px_rgba(23,27,80,0.12)] ring-1 ring-[#E3E6EC] lg:flex dark:bg-[#232323] dark:shadow-none dark:ring-neutral-700">
                  {isMac ? (
                    <>
                      <kbd className="font-sans text-[10px] font-semibold leading-none text-neutral-400 dark:text-neutral-500">
                        ⌘
                      </kbd>
                      <kbd className="font-sans text-[10px] font-semibold leading-none text-neutral-400 dark:text-neutral-500">
                        K
                      </kbd>
                    </>
                  ) : (
                    <>
                      <kbd className="font-sans text-[10px] font-semibold uppercase leading-none tracking-wide text-neutral-400 dark:text-neutral-500">
                        Ctrl
                      </kbd>
                      <span className="h-2.5 w-px bg-[#E3E6EC] dark:bg-neutral-700" />
                      <kbd className="font-sans text-[10px] font-semibold leading-none text-neutral-400 dark:text-neutral-500">
                        K
                      </kbd>
                    </>
                  )}
                </div>
              )}

              {showDropdown && (
                <SearchDropdown
                  results={results}
                  total={resultsTotal}
                  matchedCategories={matchedCategories}
                  trending={trending}
                  recentSearches={recentSearches}
                  onClearRecents={clearRecentSearches}
                  loading={searchLoading || trendingLoading}
                  query={query}
                  hasSearched={hasSearched}
                  selectedIndex={selectedIndex}
                  setSelectedIndex={setSelectedIndex}
                  onSelect={handleSuggestionSelect}
                />
              )}
            </div>

            {/* Actions */}
            <div className="flex min-w-0 flex-1 items-center">
              {isLoggedIn ? (
                <>
                  <div className="flex min-w-0 flex-1 items-center justify-end gap-1 pr-1 sm:gap-2 lg:gap-3 xl:gap-4">
                    <span
                      aria-hidden="true"
                      className="mr-1 hidden h-6 w-px bg-[#ECEEF3] md:block dark:bg-neutral-800"
                    />

                    <ThemeToggle />

                    <div className="relative shrink-0" ref={notifRef}>
                      <button
                        onClick={toggleNotif}
                        className="relative rounded-full p-2 transition-colors duration-200 hover:bg-[#F3F4F6] dark:hover:bg-neutral-800"
                        aria-label="Notifications"
                        aria-expanded={showNotif}
                      >
                        <IoNotificationsOutline className="size-[22px] text-[#111111] dark:text-neutral-200" />

                        {unreadCount > 0 && (
                          <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#FF3B30] px-1 text-[10px] font-bold text-white">
                            {unreadCount}
                          </span>
                        )}
                      </button>

                      <AnimatePresence>
                        {showNotif && (
                          <NotifDropdown
                            items={notifItems}
                            unread={unreadCount}
                            onOpen={openNotif}
                            onMarkAll={markAllNotifRead}
                            onViewAll={() => {
                              setShowNotif(false);
                              navigate("/notification");
                            }}
                          />
                        )}
                      </AnimatePresence>
                    </div>

                    <Link
                      to="/chat"
                      className="relative shrink-0 rounded-full p-2 transition-colors duration-200 hover:bg-[#F3F4F6] dark:hover:bg-neutral-800"
                      aria-label="Chat"
                    >
                      <LuMessageSquare className="size-[22px] text-[#111111] dark:text-neutral-200" />

                      {chatBadge > 0 && (
                        <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#2E4BFF] px-1 text-[10px] font-bold text-white">
                          {chatBadge}
                        </span>
                      )}
                    </Link>

                    <span
                      aria-hidden="true"
                      className="mr-1 hidden h-6 w-px bg-[#dbdde0] sm:mr-2 md:block lg:mr-3 xl:mr-4 dark:bg-neutral-800"
                    />
                  </div>

                  <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
                  <Link
                    to="/upload"
                    className="flex shrink-0 items-center gap-2 rounded-lg bg-[#3838EC] px-3 py-2 text-sm font-medium text-[#FCFCFC] transition-all duration-200 hover:scale-[1.02] md:px-4 md:text-base lg:px-5"
                  >
                      <span>Sell</span>
                      <FaPlus className="size-3" />
                    </Link>

                    <div className="relative shrink-0" ref={menuRefDesktop}>
                      <button
                        onClick={handleMenu}
                        aria-label="Open profile menu"
                        aria-expanded={showmenu}
                        className="flex items-center gap-0.5 rounded-full p-0.5 transition-colors duration-200 hover:bg-[#F3F4F6] dark:hover:bg-neutral-800"
                      >
                        <AvatarComponent
                          name={userDetails?.name}
                          imageUrl={userDetails?.avatar?.url}
                          size="medium"
                          plan={userDetails?.subscription}
                          isLoading={userLoading}
                          className="rounded-full"
                          showBadge
                        />
                        <svg
                          className={`h-4 w-4 shrink-0 text-neutral-500 transition-transform duration-200 dark:text-neutral-400 ${
                            showmenu ? "rotate-180" : ""
                          }`}
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={2.5}
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                      </button>

                      <AnimatePresence>
                        {showmenu && (
                          <ProfileDropdown
                            userDetails={userDetails}
                            userLoading={userLoading}
                            onClose={() => setShowmenu(false)}
                            onLogout={handleLogoutClick}
                          />
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
                    <ThemeToggle className="mr-4 sm:mr-5" />

                    <button
                      onClick={goToSignup}
                      className="text-base lg:text-base md:text-sm font-medium text-[#090A0B] transition-colors duration-200 hover:text-black dark:text-neutral-300 dark:hover:text-white"
                    >
                      Sign up
                    </button>

                    <button
                      onClick={goToLogin}
                      className="rounded-xl bg-[#1E1E1E] px-6 xl:px-7 py-2 text-base lg:text-base md:text-sm font-medium text-white transition-all duration-200 hover:scale-[1.01] dark:bg-white dark:text-black"
                    >
                      Login
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>
    </>
  );
};

export default Header;
