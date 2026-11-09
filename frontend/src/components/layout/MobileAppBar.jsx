import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, X } from "lucide-react";
import { cn } from "../../utils/cn.js";

/**
 * Phones: a pushed screen takes over the top of the viewport (site header
 * hidden via html[data-app-screen], see index.css), like native apps.
 * Ref-counted so overlapping screens during route transitions never strip
 * the attribute from the screen that's still mounted.
 */
let appScreenCount = 0;
export function useAppScreen(enabled = true) {
  useEffect(() => {
    if (!enabled) return undefined;
    const root = document.documentElement;
    appScreenCount += 1;
    root.setAttribute("data-app-screen", "");
    return () => {
      appScreenCount = Math.max(0, appScreenCount - 1);
      if (appScreenCount === 0) root.removeAttribute("data-app-screen");
    };
  }, [enabled]);
}

/**
 * Sticky top app bar (phones only, sm:hidden). Back (or close) on the
 * left, title centred, an optional action on the right, optional content
 * (e.g. a progress bar) underneath. Safe-area aware.
 *
 *   <MobileAppBar title="Orders" backTo="/profile" action={<button…/>} />
 */
export default function MobileAppBar({ title, subtitle, backTo, onBack, closeIcon = false, action, children, className }) {
  const navigate = useNavigate();
  const goBack = () => {
    if (onBack) return onBack();
    if (backTo) return navigate(backTo);
    if (window.history.length > 1) return navigate(-1);
    return navigate("/");
  };
  const BackIcon = closeIcon ? X : ChevronLeft;

  return (
    <div
      className={cn(
        "sticky top-0 z-40 border-b border-neutral-200/80 bg-white/90 pt-[env(safe-area-inset-top)] backdrop-blur-xl sm:hidden dark:border-neutral-800 dark:bg-[#16181B]/90",
        className,
      )}
    >
      <div className="grid h-12 grid-cols-[3rem_minmax(0,1fr)_auto] items-center px-1">
        <button
          type="button"
          onClick={goBack}
          aria-label={closeIcon ? "Close" : "Back"}
          className="grid h-11 w-11 place-items-center rounded-full text-slate-700 active:bg-neutral-100 dark:text-zinc-200 dark:active:bg-white/10"
        >
          <BackIcon className="h-[22px] w-[22px]" aria-hidden="true" />
        </button>
        <div className="min-w-0 text-center">
          <p className="truncate text-[16px] font-semibold leading-tight text-slate-900 dark:text-white">{title}</p>
          {subtitle && <p className="truncate text-[11.5px] font-medium leading-tight text-slate-500 dark:text-zinc-400">{subtitle}</p>}
        </div>
        <div className="flex min-w-[3rem] items-center justify-end pr-2">{action}</div>
      </div>
      {children}
    </div>
  );
}
