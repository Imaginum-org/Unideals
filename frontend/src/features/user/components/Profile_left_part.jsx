import { Link, useLocation, useNavigate } from "react-router-dom";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  DashboardIcon,
  MessageCircleIcon,
  BellIcon,
  BoxIcon,
  ShoppingBagIcon,
  HeartIcon,
  ContactIcon,
  FolderIcon,
} from "@animateicons/react/lucide";
import { Settings01Icon } from "@animateicons/react/huge";
import { ArrowUpRight, CircleHelp, Crown, PanelLeftClose, PanelLeftOpen, Sparkles, Trophy } from "lucide-react";
import BrandLoader from "../../../components/ui/BrandLoader.jsx";
import { useUser } from "../../../context/useUserContext.jsx";
import AvatarComponent from "../../../components/common/AvatarComponent.jsx";
import { useChatUnread } from "../../../services/chatUnread.js";
import { useNotification } from "../../../context/NotificationContext.jsx";
import { cn } from "../../../utils/cn.js";

// ─── Collapsed-mode tooltip ───
// Production-style rail tooltip: theme-matched surface (same panel language
// as the header dropdowns), compact type, hairline border, soft layered
// shadow. Rendered in a portal at a fixed position because the menu area
// scrolls (overflow-y-auto) and would clip an in-place tooltip.
const SidebarTooltip = ({ anchorRect, label, badge, instant = false }) =>
  createPortal(
    <AnimatePresence>
      {anchorRect && (
        <motion.div
          key={label}
          role="tooltip"
          initial={instant ? false : { opacity: 0, x: -4 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, transition: { duration: 0.08 } }}
          transition={{ duration: 0.14, ease: [0.16, 1, 0.3, 1] }}
          style={{
            position: "fixed",
            top: anchorRect.top + anchorRect.height / 2,
            left: anchorRect.right + 10,
            translateY: "-50%",
          }}
          className="pointer-events-none z-[1000] font-figtree"
        >
          <div className="flex items-center gap-2 whitespace-nowrap rounded-lg border border-neutral-200/90 bg-white px-2.5 py-[0.4rem] text-[12.5px] font-medium leading-none text-[#0F172A] shadow-[0_8px_24px_-6px_rgba(15,23,42,0.16),0_2px_6px_-2px_rgba(15,23,42,0.08)] dark:border-neutral-800 dark:bg-[#1A1D20] dark:text-[#E6E8EB] dark:shadow-[0_10px_28px_-8px_rgba(0,0,0,0.7)]">
            <span>{label}</span>
            {badge > 0 && (
              <span className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-md bg-[var(--accent-soft)] px-1 text-[11px] font-semibold tabular-nums text-[var(--accent-text)]">
                {badge > 99 ? "99+" : badge}
              </span>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );

// Delay grouping (Radix/Linear behaviour): the first tooltip waits briefly
// so a cursor merely passing over the rail doesn't flash labels; once one
// is open, moving to the next icon swaps instantly with no re-animation.
const TOOLTIP_OPEN_DELAY_MS = 140;
const TOOLTIP_WARM_WINDOW_MS = 400;
let lastTooltipClosedAt = 0;
let anyTooltipOpen = false;

const useCollapsedTooltip = (enabled) => {
  const ref = useRef(null);
  const timerRef = useRef(null);
  const openRef = useRef(false);
  const [state, setState] = useState(null); // { rect, instant }

  const reveal = (instant) => {
    if (!ref.current) return;
    openRef.current = true;
    anyTooltipOpen = true;
    setState({ rect: ref.current.getBoundingClientRect(), instant });
  };

  // immediate = keyboard focus (no delay; focus is deliberate).
  const show = (immediate = false) => {
    if (!enabled || !ref.current) return;
    clearTimeout(timerRef.current);
    const warm =
      anyTooltipOpen || Date.now() - lastTooltipClosedAt < TOOLTIP_WARM_WINDOW_MS;
    if (warm || immediate === true) {
      reveal(warm);
    } else {
      timerRef.current = setTimeout(() => reveal(false), TOOLTIP_OPEN_DELAY_MS);
    }
  };

  const hide = () => {
    clearTimeout(timerRef.current);
    if (openRef.current) {
      openRef.current = false;
      anyTooltipOpen = false;
      lastTooltipClosedAt = Date.now();
    }
    setState(null);
  };

  useEffect(() => {
    if (!enabled) hide();
  }, [enabled]);

  useEffect(() => () => {
    clearTimeout(timerRef.current);
    if (openRef.current) {
      anyTooltipOpen = false;
      lastTooltipClosedAt = Date.now();
    }
  }, []);

  useEffect(() => {
    if (!state) return undefined;
    window.addEventListener("scroll", hide, true);
    window.addEventListener("resize", hide);
    return () => {
      window.removeEventListener("scroll", hide, true);
      window.removeEventListener("resize", hide);
    };
  }, [state]);

  return {
    ref,
    rect: enabled && state ? state.rect : null,
    instant: Boolean(state?.instant),
    show: () => show(false),
    showNow: () => show(true),
    hide,
  };
};

// ─── NavItem defined OUTSIDE the parent so hooks are stable across renders ───
const NavItem = ({ path, label, icon: Icon, badge, isCollapsed, pathname }) => {
  const iconRef = useRef(null);
  const tooltip = useCollapsedTooltip(isCollapsed);
  const isActive =
    pathname === path ||
    (path === "/profile" && pathname === "/profileoverview") ||
    (path !== "/profile" && pathname.startsWith(`${path}/`));

  return (
    <Link
      to={path}
      className="block w-full rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)]"
      aria-label={isCollapsed ? label : undefined}
      aria-current={isActive ? "page" : undefined}
      onFocus={tooltip.showNow}
      onBlur={tooltip.hide}
      onClick={tooltip.hide}
    >
      <SidebarTooltip anchorRect={tooltip.rect} instant={tooltip.instant} label={label} badge={badge} />
      <div
        ref={tooltip.ref}
        onMouseEnter={() => {
          iconRef.current?.startAnimation?.();
          tooltip.show();
        }}
        onMouseLeave={() => {
          iconRef.current?.stopAnimation?.();
          tooltip.hide();
        }}
        className={cn(
          "relative flex h-9 items-center rounded-lg transition-colors duration-150",
          isCollapsed ? "justify-center" : "gap-2.5 px-2.5",
          isActive
            ? "bg-[var(--accent-soft)] text-[var(--accent-text)]"
            : "text-slate-600 hover:bg-neutral-100 hover:text-slate-900 dark:text-zinc-400 dark:hover:bg-white/5 dark:hover:text-white",
        )}
      >
        {/* Active indicator bar (expanded) */}
        {isActive && !isCollapsed && (
          <span aria-hidden="true" className="absolute -left-2 top-1.5 bottom-1.5 w-[3px] rounded-r-full bg-[var(--accent)]" />
        )}
        <Icon ref={iconRef} size={17} strokeWidth={isActive ? 2.25 : 1.75} className="shrink-0" />
        {!isCollapsed && (
          <span className={cn("min-w-0 flex-1 truncate text-[13.5px]", isActive ? "font-semibold" : "font-medium")}>{label}</span>
        )}
        {badge > 0 &&
          (isCollapsed ? (
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white dark:ring-[#16181B]" aria-hidden="true" />
          ) : (
            <span
              className={cn(
                "inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold tabular-nums",
                isActive ? "bg-[var(--accent)] text-white" : "bg-red-500 text-white",
              )}
            >
              {badge > 99 ? "99+" : badge}
            </span>
          ))}
      </div>
    </Link>
  );
};

function NavGroup({ title, items, isCollapsed, pathname }) {
  return (
    <div className="mt-4 first:mt-0">
      {isCollapsed ? (
        <div className="mx-auto mb-2 h-px w-6 bg-neutral-200 dark:bg-neutral-800" aria-hidden="true" />
      ) : (
        <p className="mb-1.5 px-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-zinc-500">{title}</p>
      )}
      <nav aria-label={title} className="flex flex-col gap-0.5">
        {items.map((item) => (
          <NavItem key={item.path} {...item} isCollapsed={isCollapsed} pathname={pathname} />
        ))}
      </nav>
    </div>
  );
}

// Collapse preference survives navigation. Every page renders its own
// sidebar instance, so the choice lives in module memory (instant, no
// flash) and localStorage (survives reloads).
const COLLAPSE_KEY = "unideals-profile-menu-collapsed";
let savedCollapsed = (() => {
  try {
    return localStorage.getItem(COLLAPSE_KEY) === "1";
  } catch {
    return false;
  }
})();

const persistCollapsed = (value) => {
  savedCollapsed = value;
  try {
    localStorage.setItem(COLLAPSE_KEY, value ? "1" : "0");
  } catch {
    // storage unavailable: in-memory preference still applies
  }
};

// Messages auto-collapses the menu to give the chat room. Per-tab override
// only: it never overwrites the saved preference.
const isChatPath = (path) => path === "/chat" || path.startsWith("/chat/");

const PLAN_LABEL = { pro: "Pro", pro_plus: "Pro+" };

function Profile_left_part() {
  const { userDetails, loading, isLoggedIn } = useUser();
  const { unreadCount: notifUnread } = useNotification();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const onChat = isChatPath(pathname);
  const [isCollapsed, setIsCollapsed] = useState(() => (onChat ? true : savedCollapsed));

  useEffect(() => {
    setIsCollapsed(onChat ? true : savedCollapsed);
  }, [onChat]);

  const toggleTip = useCollapsedTooltip(isCollapsed);
  const profileTip = useCollapsedTooltip(isCollapsed);

  const toggleCollapsed = useCallback(() => {
    setIsCollapsed((current) => {
      const next = !current;
      if (!onChat) persistCollapsed(next);
      return next;
    });
    toggleTip.hide();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onChat]);

  // "[" toggles the sidebar (Linear-style), ignored while typing.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== "[" || e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target;
      if (t?.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(t?.tagName)) return;
      toggleCollapsed();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggleCollapsed]);

  const chatUnread = useChatUnread(isLoggedIn);

  // Redirect to login only when the session is definitively gone.
  useEffect(() => {
    if (!loading && !isLoggedIn && !userDetails) navigate("/login");
  }, [loading, isLoggedIn, userDetails, navigate]);

  const widthClass = isCollapsed ? "w-[4.25rem]" : "w-60 xl:w-64";

  if (loading) {
    return (
      <div className={cn("h-full border-r border-neutral-200/80 bg-white dark:border-neutral-800 dark:bg-[#16181B]", widthClass)}>
        <BrandLoader size="full" className="!min-h-0" />
      </div>
    );
  }

  const groups = [
    {
      title: "Activity",
      items: [
        { path: "/profile", label: "Overview", icon: DashboardIcon },
        { path: "/chat", label: "Messages", icon: MessageCircleIcon, badge: chatUnread },
        { path: "/notification", label: "Notifications", icon: BellIcon, badge: notifUnread },
        { path: "/myorders", label: "Orders", icon: BoxIcon },
        { path: "/productlisted", label: "My listings", icon: ShoppingBagIcon },
        { path: "/wishlist", label: "Wishlist", icon: HeartIcon },
        { path: "/achievements", label: "Achievements", icon: Trophy },
      ],
    },
    {
      title: "Account",
      items: [
        { path: "/subscription", label: "Subscription", icon: Crown },
        { path: "/settings", label: "Settings", icon: Settings01Icon },
      ],
    },
    {
      title: "Support",
      items: [
        { path: "/faq", label: "FAQ", icon: CircleHelp },
        { path: "/contact", label: "Help & support", icon: ContactIcon },
        { path: "/termscondition", label: "Terms & privacy", icon: FolderIcon },
      ],
    },
  ];

  const campusName =
    (userDetails?.campus_id && typeof userDetails.campus_id === "object" && userDetails.campus_id.name) ||
    userDetails?.college ||
    "Set your campus";
  const plan = PLAN_LABEL[userDetails?.subscription];
  const showUpgrade = !isCollapsed && !plan && userDetails?.role !== "admin";

  return (
    <div
      className={cn(
        "relative flex h-full flex-col border-r border-neutral-200/80 bg-white font-figtree transition-[width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] dark:border-neutral-800 dark:bg-[#16181B]",
        widthClass,
      )}
    >
      {/* Profile */}
      <div className={cn("border-b border-neutral-100 dark:border-neutral-800", isCollapsed ? "px-2 py-3" : "px-3 py-3")}>
        <Link
          to="/profile"
          ref={profileTip.ref}
          onMouseEnter={profileTip.show}
          onMouseLeave={profileTip.hide}
          onFocus={profileTip.showNow}
          onBlur={profileTip.hide}
          aria-label={isCollapsed ? `${userDetails?.name || "Profile"} — overview` : undefined}
          className={cn(
            "flex items-center rounded-xl transition-colors hover:bg-neutral-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)] dark:hover:bg-white/5",
            isCollapsed ? "justify-center p-1" : "gap-3 p-2",
          )}
        >
          <SidebarTooltip anchorRect={profileTip.rect} instant={profileTip.instant} label={userDetails?.name || "Profile"} />
          <AvatarComponent
            name={userDetails?.name || "User"}
            imageUrl={userDetails?.avatar?.url}
            plan={userDetails?.subscription}
            role={userDetails?.role}
            isOwn
            showBadge
            size="xmedium"
          />
          {!isCollapsed && (
            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 items-center gap-1.5">
                <p className="truncate text-[14px] font-semibold text-slate-900 dark:text-white">{userDetails?.name || "User"}</p>
                {plan && (
                  <span className="shrink-0 rounded-md bg-[var(--accent-soft)] px-1.5 py-px text-[10.5px] font-bold text-[var(--accent-text)]">
                    {plan}
                  </span>
                )}
              </div>
              <p className="truncate text-[12px] text-slate-500 dark:text-zinc-400">{campusName}</p>
            </div>
          )}
        </Link>
      </div>

      {/* Navigation */}
      <div className={cn("no-scrollbar flex-1 overflow-y-auto py-3", isCollapsed ? "px-2" : "px-3")}>
        {groups.map((g) => (
          <NavGroup key={g.title} {...g} isCollapsed={isCollapsed} pathname={pathname} />
        ))}

        {showUpgrade && (
          <Link
            to="/price"
            className="mt-5 block rounded-xl border border-[var(--accent-soft-strong)] bg-[var(--accent-soft)] p-3 transition-colors hover:border-[var(--accent-ring)]"
          >
            <p className="flex items-center gap-1.5 text-[13px] font-semibold text-slate-900 dark:text-white">
              <Sparkles className="h-4 w-4 text-[var(--accent-text)]" aria-hidden="true" />
              Upgrade to Pro
            </p>
            <p className="mt-1 text-[12px] leading-relaxed text-slate-600 dark:text-zinc-400">
              More listings, monthly boosts and higher search ranking.
            </p>
            <span className="mt-2 inline-flex items-center gap-1 text-[12px] font-semibold text-[var(--accent-text)]">
              See plans
              <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
          </Link>
        )}
      </div>

      {/* Collapse control */}
      <div className={cn("border-t border-neutral-100 dark:border-neutral-800", isCollapsed ? "p-2" : "p-3")}>
        <button
          type="button"
          ref={toggleTip.ref}
          onClick={toggleCollapsed}
          onMouseEnter={toggleTip.show}
          onMouseLeave={toggleTip.hide}
          onFocus={toggleTip.showNow}
          onBlur={toggleTip.hide}
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-keyshortcuts="["
          className={cn(
            "flex h-9 w-full items-center rounded-lg text-[13px] font-medium text-slate-500 transition-colors hover:bg-neutral-100 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)] dark:text-zinc-400 dark:hover:bg-white/5 dark:hover:text-white",
            isCollapsed ? "justify-center" : "gap-2.5 px-2.5",
          )}
        >
          <SidebarTooltip anchorRect={toggleTip.rect} instant={toggleTip.instant} label="Expand sidebar  [" />
          {isCollapsed ? (
            <PanelLeftOpen className="h-[17px] w-[17px]" aria-hidden="true" />
          ) : (
            <>
              <PanelLeftClose className="h-[17px] w-[17px]" aria-hidden="true" />
              <span className="flex-1 text-left">Collapse</span>
              <kbd className="rounded border border-neutral-200 px-1.5 text-[11px] font-medium text-slate-400 dark:border-neutral-700 dark:text-zinc-500">
                [
              </kbd>
            </>
          )}
        </button>
      </div>
    </div>
  );
}

export default Profile_left_part;
