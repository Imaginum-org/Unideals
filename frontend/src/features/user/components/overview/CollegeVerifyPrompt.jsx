import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { Clock3, ShieldCheck, TrendingUp, X } from "lucide-react";
import { TickIcon } from "../../../../components/common/VerifiedTick.jsx";
import { btnPrimary, btnSecondary } from "../account/AccountKit.jsx";
import { cn } from "../../../../utils/cn.js";

/*
 * One-time nudge on the Overview page: "get your verified tick".
 * Shown once per account on this device (dismissed or acted on, it never
 * comes back; the grey tick and the "Needs your attention" row remain).
 * Bottom sheet on phones, centred dialog from sm up.
 */

const seenKey = (userId) => `unideals:college-verify-prompt:${userId}`;
const hasSeen = (userId) => {
  try {
    return window.localStorage.getItem(seenKey(userId)) === "1";
  } catch {
    // Storage blocked (private mode): don't nag on every visit.
    return true;
  }
};
const markSeen = (userId) => {
  try {
    window.localStorage.setItem(seenKey(userId), "1");
  } catch {
    /* ignore */
  }
};

const POINTS = [
  { icon: ShieldCheck, text: "A verified tick next to your name that every buyer sees" },
  { icon: TrendingUp, text: "Buyers trust verified students more, so your items sell faster" },
  { icon: Clock3, text: "Takes a minute: we email a code to your college address" },
];

export default function CollegeVerifyPrompt({ userId }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const primaryRef = useRef(null);

  useEffect(() => {
    if (!userId || hasSeen(userId)) return undefined;
    // Let the page settle first so it doesn't feel like an interstitial.
    const t = setTimeout(() => setOpen(true), 900);
    return () => clearTimeout(t);
  }, [userId]);

  useEffect(() => {
    if (!open) return undefined;
    markSeen(userId);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const prevFocus = document.activeElement;
    primaryRef.current?.focus({ preventScroll: true });
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
      prevFocus?.focus?.({ preventScroll: true });
    };
  }, [open, userId]);

  if (!open) return null;

  const close = () => setOpen(false);

  return createPortal(
    <div
      className="fixed inset-0 z-[999] flex items-end justify-center bg-black/50 backdrop-blur-sm animate-[tickTip_160ms_ease-out] sm:items-center sm:px-4"
      onClick={close}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="college-prompt-title"
        aria-describedby="college-prompt-desc"
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-[420px] overflow-hidden rounded-t-3xl border border-neutral-200 bg-white pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl sm:rounded-3xl sm:pb-6 dark:border-neutral-800 dark:bg-[#1A1D20]"
      >
        <button
          type="button"
          onClick={close}
          aria-label="Close"
          className="absolute right-3 top-3 z-10 grid h-9 w-9 place-items-center rounded-full text-slate-400 transition-colors hover:bg-black/5 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)] dark:hover:bg-white/10 dark:hover:text-white"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>

        {/* Header: the tick itself, softly lit */}
        <div className="relative grid place-items-center bg-gradient-to-b from-emerald-50 to-white px-6 pb-2 pt-8 dark:from-emerald-950/30 dark:to-[#1A1D20]">
          <span
            aria-hidden="true"
            className="absolute left-1/2 top-4 h-24 w-24 -translate-x-1/2 rounded-full bg-emerald-500/20 blur-2xl"
          />
          <TickIcon verified className="relative h-14 w-14 drop-shadow-[0_6px_14px_rgba(5,150,105,0.35)]" />
        </div>

        <div className="px-5 sm:px-6">
          <h2 id="college-prompt-title" className="mt-3 text-center text-[18px] font-semibold tracking-tight text-slate-900 dark:text-white">
            Get your verified tick
          </h2>
          <p id="college-prompt-desc" className="mx-auto mt-1.5 max-w-[320px] text-center text-[13.5px] leading-relaxed text-slate-500 dark:text-zinc-400">
            Verify your college email once to show buyers you&apos;re a real student on campus.
          </p>

          <ul className="mt-5 space-y-3">
            {POINTS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-start gap-3 text-[13.5px] leading-snug text-slate-700 dark:text-zinc-200">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-emerald-50 text-emerald-600 ring-1 ring-inset ring-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900/60">
                  <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                </span>
                <span className="pt-1">{text}</span>
              </li>
            ))}
          </ul>

          <p className="mt-4 text-center text-[11.5px] text-slate-400 dark:text-zinc-500">
            You still sign in with your usual email. We never show your college address to anyone.
          </p>

          <div className="mt-5 grid grid-cols-1 gap-2.5 min-[360px]:grid-cols-2">
            <button type="button" onClick={close} className={cn(btnSecondary, "h-11 max-[359px]:order-2")}>
              Maybe later
            </button>
            <button
              ref={primaryRef}
              type="button"
              onClick={() => {
                close();
                navigate("/settings?tab=verification");
              }}
              className={cn(btnPrimary, "h-11")}
            >
              Verify now
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
