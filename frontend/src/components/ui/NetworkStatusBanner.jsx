import { useEffect, useRef, useState } from "react";
import { Signal, Wifi, WifiOff, X } from "lucide-react";
import { getNetworkMonitor } from "../../services/networkStatus.js";
import { cn } from "../../utils/cn.js";

/*
 * Tells the user when their own connection is the problem.
 *   offline  stays up until the connection is back (with "Try again").
 *   slow     stays up until the link is fast again; can be hidden for a
 *            few minutes.
 *   back     "Back online" for a moment after recovering, then gone.
 * Not a modal: the page stays usable. Phones: top edge (clear of the tab
 * bar, the + button and the assistant). sm+: bottom-left. Below dialogs.
 * Renders nothing at all while the network is fine.
 */

const SNOOZE_MS = 3 * 60 * 1000;
const BACK_MS = 2500;

const COPY = {
  offline: {
    icon: WifiOff,
    title: "You're offline",
    body: "Check your Wi-Fi or mobile data. We'll reconnect automatically.",
  },
  slow: {
    icon: Signal,
    title: "Your internet connection is slow",
    body: "Unideals is working fine, but pages may take longer to load on your network.",
  },
  back: {
    icon: Wifi,
    title: "Back online",
    body: "Your connection is working again.",
  },
};

export default function NetworkStatusBanner() {
  const monitor = getNetworkMonitor();
  const [view, setView] = useState(() => {
    const s = monitor?.getState();
    return s === "offline" || s === "slow" ? s : null;
  });
  const [retrying, setRetrying] = useState(false);
  const snoozeUntil = useRef(0);
  const backTimer = useRef(null);

  useEffect(() => {
    if (!monitor) return undefined;
    const unsub = monitor.subscribe((next, prev) => {
      clearTimeout(backTimer.current);
      if (next === "offline") setView("offline");
      else if (next === "slow") setView(Date.now() < snoozeUntil.current ? null : "slow");
      else if (prev === "offline") {
        setView("back");
        backTimer.current = setTimeout(() => setView(null), BACK_MS);
      } else setView(null);
    });
    return () => {
      unsub();
      clearTimeout(backTimer.current);
    };
  }, [monitor]);

  if (!view) return null;

  const c = COPY[view];
  const Icon = c.icon;
  const tone =
    view === "offline"
      ? "bg-slate-900 text-white dark:bg-zinc-800"
      : view === "slow"
        ? "bg-amber-50 text-amber-900 ring-1 ring-amber-200 dark:bg-amber-950/80 dark:text-amber-100 dark:ring-amber-800/60"
        : "bg-emerald-600 text-white";

  const retry = async () => {
    setRetrying(true);
    try {
      await monitor?.retryNow();
    } finally {
      setRetrying(false);
    }
  };

  return (
    <div
      className={cn(
        "pointer-events-none fixed inset-x-0 z-[990] flex justify-center px-3 sm:justify-start sm:px-5",
        "top-[calc(env(safe-area-inset-top)+8px)] sm:bottom-5 sm:top-auto",
      )}
    >
      <div
        role={view === "offline" ? "alert" : "status"}
        aria-live={view === "offline" ? "assertive" : "polite"}
        data-network-banner={view}
        className={cn(
          "pointer-events-auto flex w-full max-w-[420px] items-start gap-3 rounded-2xl px-4 py-3 shadow-[0_12px_32px_-10px_rgba(15,23,42,0.45)]",
          "max-sm:animate-[netInTop_180ms_ease-out] sm:animate-[netIn_180ms_ease-out] motion-reduce:!animate-none",
          tone,
        )}
      >
        <span className="mt-0.5 shrink-0">
          <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[13.5px] font-semibold leading-snug">{c.title}</p>
          <p className={cn("mt-0.5 text-[12.5px] leading-snug", view === "slow" ? "text-amber-800/90 dark:text-amber-200/80" : "text-white/75")}>
            {c.body}
          </p>
        </div>
        {view === "offline" && (
          <button
            type="button"
            onClick={retry}
            disabled={retrying}
            className="-my-0.5 shrink-0 self-center rounded-lg bg-white/10 px-3 py-1.5 text-[12.5px] font-semibold text-white transition-colors hover:bg-white/20 disabled:opacity-60"
          >
            {retrying ? "Checking…" : "Try again"}
          </button>
        )}
        {view === "slow" && (
          <button
            type="button"
            onClick={() => {
              snoozeUntil.current = Date.now() + SNOOZE_MS;
              setView(null);
            }}
            aria-label="Hide for now"
            className="-mr-1.5 -mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-lg text-amber-700 hover:bg-amber-100 dark:text-amber-200 dark:hover:bg-white/10"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
