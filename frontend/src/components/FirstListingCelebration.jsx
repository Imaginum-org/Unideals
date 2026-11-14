import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight, X } from "lucide-react";
import { useCampus } from "../context/CampusContext.jsx";
import { productPath } from "../utils/productPath.js";
import { ikCard } from "../utils/imageTransform.js";

/*
 * First-listing celebration (shown once, on Home, after a new seller's first
 * listing goes live). Shows their actual listing, the Freshers' Drop badge
 * they just unlocked, and two clear next steps. Confetti in the brand colour
 * (pink in Girl Mode), skipped for reduced motion. Never auto-closes: ✕,
 * Escape, backdrop click or either button.
 */

const inr = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

const readAccent = () => {
  if (typeof window === "undefined") return "#3838ec";
  const v = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim();
  return v || "#3838ec";
};

export default function FirstListingCelebration({ listing = null, onClose }) {
  const reduceMotion = useReducedMotion();
  const { campus } = useCampus();
  const closeRef = useRef(null);
  const campusName = campus?.name || campus?.short_name || "your campus";
  const href = listing?._id ? productPath(listing) : null;

  // Escape to close, lock page scroll, focus the close button.
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose?.();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  // One celebratory burst + short side streams, in the brand colour.
  useEffect(() => {
    if (reduceMotion) return undefined;
    let cancelled = false;
    const accent = readAccent();
    const colors = [accent, "#ffffff", "#FBBF24", "#34D399"];
    import("canvas-confetti").then(({ default: confetti }) => {
      if (cancelled) return;
      confetti({ particleCount: 110, spread: 75, startVelocity: 38, origin: { y: 0.55 }, colors, scalar: 0.9, zIndex: 100000 });
      const end = Date.now() + 1200;
      const stream = () => {
        if (cancelled) return;
        confetti({ particleCount: 2, angle: 60, spread: 50, origin: { x: 0, y: 0.7 }, colors, zIndex: 100000 });
        confetti({ particleCount: 2, angle: 120, spread: 50, origin: { x: 1, y: 0.7 }, colors, zIndex: 100000 });
        if (Date.now() < end) requestAnimationFrame(stream);
      };
      stream();
    });
    return () => {
      cancelled = true;
    };
  }, [reduceMotion]);

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[99999] flex items-end justify-center bg-slate-950/50 px-0 backdrop-blur-[2px] sm:items-center sm:px-4"
        onClick={onClose}
      >
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-labelledby="first-listing-title"
          onClick={(e) => e.stopPropagation()}
          initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="relative w-full max-w-[400px] overflow-hidden rounded-t-2xl border border-neutral-200/80 bg-white shadow-[0_30px_80px_-20px_rgba(15,23,42,0.45)] sm:rounded-2xl dark:border-neutral-800 dark:bg-[#1A1D20]"
        >
          {/* Listing preview on a soft brand wash */}
          <div className="relative bg-[var(--accent-soft)] px-5 pb-5 pt-12">
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-lg text-slate-500 transition-colors hover:bg-white/70 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)] dark:text-zinc-400 dark:hover:bg-white/10 dark:hover:text-white"
            >
              <X className="h-[18px] w-[18px]" />
            </button>

            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: 14, rotate: -3 }}
              animate={{ opacity: 1, y: 0, rotate: -2 }}
              transition={{ delay: 0.15, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="mx-auto w-[210px] overflow-hidden rounded-xl border border-white bg-white shadow-[0_18px_36px_-16px_rgba(15,23,42,0.45)] dark:border-white/10 dark:bg-[#1f2226]"
            >
              <div className="relative aspect-[4/3] bg-neutral-100 dark:bg-white/5">
                {listing?.image ? (
                  <img src={ikCard(listing.image)} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="grid h-full w-full place-items-center">
                    <img src="/fav.svg" alt="" className="h-12 w-12 rounded-xl" />
                  </div>
                )}
                <span className="absolute left-2 top-2 inline-flex items-center gap-1.5 rounded-full bg-white/95 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 shadow-sm">
                  <span className="relative flex h-1.5 w-1.5">
                    {!reduceMotion && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-60" />}
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  </span>
                  Live
                </span>
              </div>
              {listing?.title && (
                <div className="px-3 py-2.5">
                  <p className="truncate text-[13px] font-medium text-slate-900 dark:text-white">{listing.title}</p>
                  {listing.selling_price != null && (
                    <p className="text-[13px] font-semibold text-slate-900 dark:text-white">{inr(listing.selling_price)}</p>
                  )}
                </div>
              )}
            </motion.div>
          </div>

          {/* Message */}
          <div className="px-6 pb-6 pt-5">
            <p className="text-[12.5px] font-medium text-[var(--accent-text)]">First listing, done</p>
            <h2 id="first-listing-title" className="mt-1 font-figtree text-[22px] font-semibold tracking-tight text-slate-900 dark:text-white">
              You&apos;re officially a seller.
            </h2>
            <p className="mt-1.5 text-[14px] leading-relaxed text-slate-600 dark:text-zinc-400">
              It&apos;s live on {campusName}. Now we wait for the &ldquo;is this still available?&rdquo; texts.
            </p>

            {/* Badge just unlocked (first_listing: Freshers' Drop, +30 XP) */}
            <div className="mt-4 flex items-center gap-3 rounded-xl border border-amber-200/70 bg-amber-50/70 px-3.5 py-2.5 dark:border-amber-900/50 dark:bg-amber-950/20">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white text-[18px] shadow-sm ring-1 ring-amber-100 dark:bg-white/10 dark:ring-amber-900/50" aria-hidden="true">
                📦
              </span>
              <span className="min-w-0">
                <span className="block text-[13.5px] font-semibold text-slate-900 dark:text-white">Freshers&apos; Drop unlocked</span>
                <span className="block text-[12.5px] text-slate-500 dark:text-zinc-400">+30 XP added to your profile</span>
              </span>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-11 items-center justify-center rounded-xl border border-neutral-200 bg-white text-[14px] font-medium text-slate-900 transition-colors hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)] dark:border-neutral-700 dark:bg-transparent dark:text-white dark:hover:bg-white/5"
              >
                Keep browsing
              </button>
              {href ? (
                <Link
                  to={href}
                  onClick={onClose}
                  className="group inline-flex h-11 items-center justify-center gap-1.5 rounded-xl bg-[var(--accent)] text-[14px] font-medium text-white transition-colors hover:bg-[var(--accent-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#1A1D20]"
                >
                  View listing
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                </Link>
              ) : (
                <Link
                  to="/productlisted"
                  onClick={onClose}
                  className="inline-flex h-11 items-center justify-center rounded-xl bg-[var(--accent)] text-[14px] font-medium text-white transition-colors hover:bg-[var(--accent-hover)]"
                >
                  My listings
                </Link>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body,
  );
}
