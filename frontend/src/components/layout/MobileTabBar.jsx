import { memo, useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Compass, House, MessageCircle, Plus, UserRound } from "lucide-react";
import { useUser } from "../../context/useUserContext.jsx";
import { useChatUnread } from "../../services/chatUnread.js";
import { cn } from "../../utils/cn.js";

// Native-app style bottom navigation for phones (< sm, matching the
// header's mobile breakpoint). Five thumb-reachable destinations with the
// primary action (Sell) in the centre.
//
// Hidden where it would get in the way:
//  • task flows with their own bottom actions (listing form, product page
//    CTA bar, phone photo hand-off),
//  • an open chat thread (Chat sets html[data-chat-thread]),
//  • while the on-screen keyboard is up (it would otherwise ride on top of
//    the keyboard on Android because the viewport resizes).

const HIDE_PREFIXES = ["/upload", "/product/", "/p/"];

export const TAB_BAR_HEIGHT = 64; // px, excluding the safe-area inset

const useKeyboardOpen = () => {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return undefined;
    const check = () => {
      const active = document.activeElement;
      const typing =
        active &&
        (active.tagName === "INPUT" || active.tagName === "TEXTAREA" || active.isContentEditable);
      setOpen(Boolean(typing) && vv.height < window.innerHeight * 0.8);
    };
    vv.addEventListener("resize", check);
    window.addEventListener("focusin", check);
    window.addEventListener("focusout", check);
    return () => {
      vv.removeEventListener("resize", check);
      window.removeEventListener("focusin", check);
      window.removeEventListener("focusout", check);
    };
  }, []);
  return open;
};

export const shouldShowTabBar = (pathname = "") =>
  !HIDE_PREFIXES.some((p) => pathname.startsWith(p));

// Account sub-pages (settings, orders, …) keep the Profile tab highlighted.
const ACCOUNT_PREFIXES = [
  "/profile", "/settings", "/myorders", "/productlisted", "/wishlist", "/notification",
  "/achievements", "/badge", "/subscription", "/contact", "/termscondition",
];

function Tab({ to, label, icon: Icon, badge = 0, end = false, activeFor, children }) {
  const { pathname } = useLocation();
  const forced = activeFor ? activeFor(pathname) : null;
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive: navActive }) => {
        const isActive = forced ?? navActive;
        return (
        cn(
          "group relative flex min-w-0 flex-1 flex-col items-center justify-center gap-1 pt-1.5 text-[10.5px] font-medium tracking-[0.01em] transition-colors",
          isActive
            ? "text-[var(--accent-text)]"
            : "text-slate-500 active:text-slate-800 dark:text-zinc-400 dark:active:text-white",
        ));
      }}
    >
      {({ isActive: navActive }) => {
        const isActive = forced ?? navActive;
        return (
        <>
          <span
            className={cn(
              "relative grid h-7 w-12 place-items-center rounded-full transition-colors",
              isActive && "bg-[var(--accent-soft)]",
            )}
          >
            {children || <Icon className="h-[21px] w-[21px]" strokeWidth={isActive ? 2.3 : 1.9} aria-hidden="true" />}
            {badge > 0 && (
              <span className="absolute -top-0.5 right-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-[#FF3B30] px-1 text-[9.5px] font-bold leading-none text-white ring-2 ring-white dark:ring-[#16181B]">
                {badge > 99 ? "99+" : badge}
              </span>
            )}
          </span>
          <span className="max-w-full truncate leading-none [@media(max-height:480px)]:sr-only">{label}</span>
        </>
        );
      }}
    </NavLink>
  );
}

function MobileTabBar() {
  const { pathname } = useLocation();
  const { isLoggedIn, userDetails } = useUser();
  const unread = useChatUnread(isLoggedIn);
  const keyboardOpen = useKeyboardOpen();

  if (!shouldShowTabBar(pathname) || keyboardOpen) return null;

  const avatar = userDetails?.avatar?.url || userDetails?.avatar;

  return (
    <nav
      aria-label="Primary"
      className="mobile-tabbar fixed inset-x-0 bottom-0 z-[60] border-t border-neutral-200/80 bg-white/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl supports-[backdrop-filter]:bg-white/80 sm:hidden dark:border-neutral-800 dark:bg-[#16181B]/90 dark:supports-[backdrop-filter]:bg-[#16181B]/80"
    >
      <div className="mx-auto flex h-16 max-w-md items-stretch px-1 [@media(max-height:480px)]:h-12">
        <Tab to="/" end label="Home" icon={House} />
        <Tab to="/explore" label="Explore" icon={Compass} />

        {/* Primary action */}
        <div className="flex flex-1 items-center justify-center">
          <NavLink
            to="/upload"
            aria-label="Sell an item"
            className="grid h-12 w-12 place-items-center rounded-2xl bg-[var(--accent)] [@media(max-height:480px)]:h-10 [@media(max-height:480px)]:w-10 [@media(max-height:480px)]:rounded-xl text-white shadow-[0_8px_20px_-6px_var(--accent-ring)] transition-transform duration-150 active:scale-95"
          >
            <Plus className="h-6 w-6" strokeWidth={2.4} aria-hidden="true" />
          </NavLink>
        </div>

        <Tab to={isLoggedIn ? "/chat" : "/login"} label="Chats" icon={MessageCircle} badge={unread} />
        {isLoggedIn ? (
          <Tab
            to="/profile"
            label="Profile"
            icon={UserRound}
            activeFor={(path) => ACCOUNT_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`))}
          >
            {typeof avatar === "string" && avatar ? (
              <img
                src={avatar}
                alt=""
                className="h-[23px] w-[23px] rounded-full object-cover ring-1 ring-black/5"
                loading="lazy"
                decoding="async"
              />
            ) : null}
          </Tab>
        ) : (
          <Tab to="/login" label="Log in" icon={UserRound} />
        )}
      </div>
    </nav>
  );
}

export default memo(MobileTabBar);
