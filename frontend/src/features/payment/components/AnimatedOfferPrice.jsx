import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

/**
 * Price that "drops" from the list price to an offer price:
 * list price shows → gets struck through → the number counts down to the
 * offer price → small pop + "Save ₹X" badge. Instant for reduced motion.
 *
 * Display only — the server computes the real charge.
 */
export default function AnimatedOfferPrice({
  amount,
  baseAmount,
  delay = 450,
  duration = 900,
  className = "",
  badge = "Girls Founder offer",
  suffix = null,
}) {
  const hasOffer = Number(baseAmount) > Number(amount);
  const reduceMotion = useReducedMotion();
  const [shown, setShown] = useState(hasOffer && !reduceMotion ? baseAmount : amount);
  const [phase, setPhase] = useState(hasOffer && !reduceMotion ? "idle" : "done");
  const rafRef = useRef(0);

  useEffect(() => {
    if (!hasOffer || reduceMotion) {
      setShown(amount);
      setPhase("done");
      return undefined;
    }
    setShown(baseAmount);
    setPhase("idle");
    const start = window.setTimeout(() => {
      setPhase("counting");
      const t0 = performance.now();
      const tick = (now) => {
        const p = Math.min(1, (now - t0) / duration);
        // easeOutCubic
        const eased = 1 - Math.pow(1 - p, 3);
        setShown(Math.round(baseAmount - (baseAmount - amount) * eased));
        if (p < 1) {
          rafRef.current = requestAnimationFrame(tick);
        } else {
          setPhase("done");
        }
      };
      rafRef.current = requestAnimationFrame(tick);
    }, delay);
    // Safety net: if animation frames are throttled (background tab,
    // low-power mode, some webviews), never leave the list price showing —
    // snap to the final price once the animation window has passed.
    const finish = window.setTimeout(() => {
      cancelAnimationFrame(rafRef.current);
      setShown(amount);
      setPhase("done");
    }, delay + duration + 400);
    return () => {
      window.clearTimeout(start);
      window.clearTimeout(finish);
      cancelAnimationFrame(rafRef.current);
    };
  }, [amount, baseAmount, hasOffer, reduceMotion, delay, duration]);

  if (!hasOffer) {
    return (
      <span className={`text-3xl font-extrabold tracking-normal text-slate-950 dark:text-white font-figtree ${className}`}>
        ₹{amount}
      </span>
    );
  }

  const struck = phase !== "idle";
  return (
    <span className="inline-flex flex-col items-start gap-1.5">
      <span className="inline-flex items-end gap-2">
        <motion.span
          key={phase === "done" ? "final" : "live"}
          initial={phase === "done" && !reduceMotion ? { scale: 1.18 } : false}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 420, damping: 14 }}
          className={`text-3xl font-extrabold tabular-nums tracking-normal font-figtree ${
            struck ? "text-[#DB2777] dark:text-pink-300" : "text-slate-950 dark:text-white"
          } ${className}`}
          aria-label={`₹${amount}, was ₹${baseAmount}`}
        >
          ₹{shown}
        </motion.span>
        <AnimatePresence>
          {struck && (
            <motion.span
              initial={reduceMotion ? false : { opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              className="relative pb-1 text-base font-semibold text-slate-400 font-figtree"
              aria-hidden="true"
            >
              ₹{baseAmount}
              <motion.span
                initial={reduceMotion ? false : { scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
                className="absolute left-0 right-0 top-1/2 h-[2px] origin-left -rotate-6 rounded-full bg-[#EC4899]"
              />
            </motion.span>
          )}
        </AnimatePresence>
        {suffix ? (
          <span className="pb-1 text-xs font-medium text-slate-500 dark:text-[#D7D7D7] font-figtree">
            {suffix}
          </span>
        ) : null}
      </span>
      <AnimatePresence>
        {phase === "done" && (
          <motion.span
            initial={reduceMotion ? false : { opacity: 0, y: 6, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: "spring", stiffness: 380, damping: 22 }}
            className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-[#F472B6] to-[#DB2777] px-2.5 py-1 text-[10.5px] font-bold text-white shadow-[0_6px_16px_-6px_rgba(219,39,119,0.7)] font-figtree"
          >
            🌸 {badge} · Save ₹{baseAmount - amount}
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}
