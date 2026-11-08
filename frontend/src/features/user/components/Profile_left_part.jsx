import { Link, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
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
import { ChevronLeft, Crown, Menu, Trophy } from "lucide-react";
import BrandLoader from "../../../components/ui/BrandLoader.jsx";
import { useUser } from "../../../context/useUserContext.jsx";
import AvatarComponent from "../../../components/common/AvatarComponent.jsx";
import { useChatUnread } from "../../../services/chatUnread.js";
import { useNotification } from "../../../context/NotificationContext.jsx";

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
              <span className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-md bg-[#3838EC]/10 px-1 text-[11px] font-semibold tabular-nums text-[#3838EC] dark:bg-[#3838EC]/25 dark:text-[#B4B6FF]">
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
// Having it inside caused React to reset state (including isCollapsed) on every
// navigation because the component reference changed each render.
const NavItem = ({ path, label, icon: Icon, badge, isCollapsed, pathname }) => {
  const iconRef = useRef(null);
  const tooltip = useCollapsedTooltip(isCollapsed);
  const isActive =
    pathname === path ||
    (path === "/profile" && pathname === "/profileoverview");

  return (
    <Link
      to={path}
      className="block w-full rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3838EC]/50"
      aria-label={isCollapsed ? label : undefined}
      aria-current={isActive ? "page" : undefined}
      onFocus={tooltip.showNow}
      onBlur={tooltip.hide}
      onClick={tooltip.hide}
    >
      <SidebarTooltip
        anchorRect={tooltip.rect}
        instant={tooltip.instant}
        label={label}
        badge={badge}
      />
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
        className={`relative flex items-center rounded-xl py-2.5 transition-all duration-300 cursor-pointer ${
          isCollapsed ? "justify-center px-2" : "px-4"
        } ${
          isActive
            ? isCollapsed
              ? "bg-[#EEEAFE] text-[#3838EC]"
              : "bg-[#3838EC] text-white shadow-md shadow-blue-500/20"
            : "text-[#64707D] dark:text-[#AAB9C5] hover:bg-gray-100 dark:hover:bg-[#1c1c1c] hover:text-gray-900 dark:hover:text-white"
        }`}
      >
        <Icon
          ref={iconRef}
          size={17}
          className={isActive && !isCollapsed ? "text-white" : ""}
          strokeWidth={isActive ? 2.5 : 1.5}
        />

        {!isCollapsed && (
          <span
            className={`ml-2.5 text-[14px] ${isActive ? "font-semibold" : "font-medium"}`}
          >
            {label}
          </span>
        )}

        {badge !== undefined && badge > 0 && (
          <span
            className={`absolute flex items-center justify-center rounded-full text-[10px] font-bold ${
              isCollapsed
                ? "h-[1.05rem] w-[1.05rem] right-[0.2rem] top-[0.2rem]"
                : "h-5 w-5 right-4"
            } ${
              isActive ? "bg-[#F7F8FA] text-[#364EF2]" : "bg-red-500 text-white"
            }`}
          >
            {badge}
          </span>
        )}
      </div>
    </Link>
  );
};

// Collapse preference survives navigation. Every page renders its own
// sidebar instance, so plain component state reset to "expanded" on each
// tab switch. The choice lives in module memory (instant, no flash) and
// localStorage (survives reloads).
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
    // storage unavailable — in-memory preference still applies
  }
};

// Message tab auto-collapses the menu to give the chat room. This is a
// per-tab override only: it never overwrites the saved preference, so
// leaving chat restores whatever the user had chosen.
const isChatPath = (path) => path === "/chat" || path.startsWith("/chat/");

function Profile_left_part() {
  const { userDetails, loading, isLoggedIn } = useUser();
  const { unreadCount: notifUnread } = useNotification();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const onChat = isChatPath(pathname);
  const [isCollapsed, setIsCollapsed] = useState(() =>
    onChat ? true : savedCollapsed,
  );

  // Same instance across a route change (if a layout keeps it mounted):
  // re-apply the rule for the new tab.
  useEffect(() => {
    setIsCollapsed(onChat ? true : savedCollapsed);
  }, [onChat]);

  const toggleTip = useCollapsedTooltip(isCollapsed);

  const toggleCollapsed = () => {
    setIsCollapsed((current) => {
      const next = !current;
      // On the Message tab the toggle is temporary (chat-only override);
      // everywhere else it becomes the remembered preference.
      if (!onChat) persistCollapsed(next);
      return next;
    });
    toggleTip.hide();
  };
  // Live chat unread (same counters the chat list renders) — hidden at 0.
  const chatUnread = useChatUnread(isLoggedIn);

  // Badge polling lives in the shared store (services/chatUnread.js).

  // Redirect to login only when the session is definitively gone:
  // not loading AND explicitly logged out. A transient null userDetails
  // (e.g. profile refetch in flight after a silent refresh) must not
  // bounce the user to /login.
  useEffect(() => {
    if (!loading && !isLoggedIn && !userDetails) {
      navigate("/login");
    }
  }, [loading, isLoggedIn, userDetails, navigate]);

  if (loading) {
    return (
      <div className="h-full w-[4.9rem] bg-[#F7F8FA] dark:bg-[#131313]">
        <BrandLoader size="full" className="!min-h-0" />
      </div>
    );
  }

  // MENU CONFIGURATIONS
  const mainMenu = [
    { path: "/profile", label: "Overview", icon: DashboardIcon },
    { path: "/chat", label: "Message", icon: MessageCircleIcon, badge: chatUnread },
    { path: "/notification", label: "Notification", icon: BellIcon, badge: notifUnread },
    { path: "/myorders", label: "Orders", icon: BoxIcon },
    { path: "/productlisted", label: "My Listings", icon: ShoppingBagIcon },
    { path: "/wishlist", label: "Wishlist", icon: HeartIcon },
    { path: "/achievements", label: "Achievements", icon: Trophy },
  ];

  const accountMenu = [
    { path: "/subscription", label: "Subscription", icon: Crown },
    { path: "/settings", label: "Settings", icon: Settings01Icon },
    { path: "/contact", label: "Help and Support", icon: ContactIcon },
    { path: "/termscondition", label: "Terms and Privacy", icon: FolderIcon },
  ];

  return (
    <div
      className={`h-full flex flex-col font-figtree relative border-r border-gray-100 bg-[#F7F8FA] transition-[width] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] dark:border-gray-800/50 dark:bg-[#131313] ${
        isCollapsed
          ? "w-[4.9rem]"
          : "w-[12.6rem] lg:w-[14.7rem] xl:w-[17.15rem] xl:max-w-[17.15rem]"
      }`}
    >
      {/* Scrollable Menu Area */}
      <div className="flex-1 overflow-y-auto no-scrollbar px-2">
        {/* Top Profile Section */}
        <div
          className={`relative flex items-center px-2 transition-[padding] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] mb-3 ${
            isCollapsed
              ? "justify-center border-b-0 py-4"
              : "border-b border-gray-200 py-[1.35rem] dark:border-gray-800/50"
          }`}
        >
          <div className="relative">
            <AvatarComponent
              name={userDetails?.name || "User"}
              imageUrl={userDetails?.avatar?.url}
              plan={userDetails?.subscription} role={userDetails?.role} isOwn
              showBadge
              className="rounded-full bg-blue-50 dark:bg-gray-800"
              size="xmedium"
            />
          </div>
          <div
            className={`ml-3 min-w-0 flex-col overflow-hidden transition-all duration-300 ${
              isCollapsed
                ? "pointer-events-none hidden w-0 opacity-0"
                : "flex w-auto opacity-100"
            }`}
          >
            <h2 className="text-[0.95rem] font-semibold text-gray-900 dark:text-white leading-tight">
              {userDetails?.name || "User"}
            </h2>
            <p className="text-xs font-medium text-[#94A3B8] dark:text-gray-500 mt-0.5">
              {(userDetails?.campus_id &&
                typeof userDetails.campus_id === "object" &&
                userDetails.campus_id.name) ||
                userDetails?.college ||
                "Set campus"}
            </p>
          </div>
          <button
            type="button"
            ref={toggleTip.ref}
            onClick={toggleCollapsed}
            onMouseEnter={toggleTip.show}
            onMouseLeave={toggleTip.hide}
            onFocus={toggleTip.showNow}
            onBlur={toggleTip.hide}
            className={`ml-auto flex shrink-0 items-center justify-center text-[#8292A6] transition-all duration-200 hover:text-[#3838EC] dark:text-[#AAB9C5] dark:hover:text-white ${
              isCollapsed
                ? "absolute left-1/2 top-[4.35rem] h-10 w-10 -translate-x-1/2 rounded-xl border border-gray-100 bg-[#F7F8FA] shadow-sm hover:border-[#DDD8FF] hover:bg-[#F5F2FF] dark:border-gray-800 dark:bg-[#171717] dark:hover:bg-[#1c1c1c]"
                : "h-8 w-8 rounded-lg hover:bg-gray-100 dark:hover:bg-[#1c1c1c]"
            }`}
            aria-label={
              isCollapsed ? "Expand profile menu" : "Collapse profile menu"
            }
            title={isCollapsed ? undefined : "Collapse"}
          >
            <SidebarTooltip
              anchorRect={toggleTip.rect}
              instant={toggleTip.instant}
              label="Expand menu"
            />
            {isCollapsed ? (
              <Menu size={21} strokeWidth={2} />
            ) : (
              <ChevronLeft size={21} strokeWidth={2.2} />
            )}
          </button>
        </div>

        {/* Main Menu */}
        <nav
          className={`flex flex-col gap-1 transition-[padding] duration-300 ${
            isCollapsed ? "pt-9" : ""
          }`}
        >
          {mainMenu.map((item) => (
            <NavItem
              key={item.path}
              {...item}
              isCollapsed={isCollapsed}
              pathname={pathname}
            />
          ))}
        </nav>

        <div
          className={`w-full h-px bg-gray-200 dark:bg-gray-800 ${
            isCollapsed ? "my-2" : "my-3.5"
          }`}
        ></div>

        {/* Account Menu */}
        <div className={`mb-2 px-4 ${isCollapsed ? "hidden" : ""}`}>
          <h3 className="text-xs font-bold tracking-wider text-gray-400 dark:text-gray-500 uppercase">
            Account
          </h3>
        </div>
        <nav className="flex flex-col gap-1.5 pb-4">
          {accountMenu.map((item) => (
            <NavItem
              key={item.path}
              {...item}
              isCollapsed={isCollapsed}
              pathname={pathname}
            />
          ))}
        </nav>
      </div>

      {/* Bottom Branding (Sticky at bottom of sidebar) */}
      <div className="bg-[#F7F8FA] dark:bg-[#131313] border-t pt-4 border-gray-100 dark:border-gray-800/50 pb-4">
        <div className="flex items-center justify-center">
          {/* Bag Icon */}
          <div className="flex items-center justify-center">
            <img
              src="/logo.svg"
              alt="Unideals logo"
              className="h-8 w-8 object-contain"
            />
          </div>
          {/* Logo Text */}
          <div
            className={`items-center overflow-hidden text-[1.1rem] font-bold tracking-tight transition-all duration-300 ${
              isCollapsed ? "hidden w-0 opacity-0" : "flex w-auto opacity-100"
            }`}
          >
            <span className="text-[#012436] dark:text-white mt-[0.3rem]">
              Unideals
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Profile_left_part;
