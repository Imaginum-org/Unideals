import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { HiXMark, HiArrowRight, HiCheckBadge } from "react-icons/hi2";

const FirstListingCelebration = ({ onClose }) => {
  useEffect(() => {
    const duration = 3000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 2,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ["#3838EC", "#8B8BFF", "#1F1F8F"],
      });

      confetti({
        particleCount: 2,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ["#3838EC", "#8B8BFF", "#1F1F8F"],
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };

    confetti({
      particleCount: 180,
      spread: 120,
      startVelocity: 35,
      origin: { y: 0.6 },
      colors: ["#3838EC", "#8B8BFF", "#1F1F8F"],
    });

    frame();

    const timer = setTimeout(() => {
      onClose?.();
    }, 6000);

    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="first-listing-heading"
        className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/55 backdrop-blur-sm px-4"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 28 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 12 }}
          transition={{ type: "spring", stiffness: 220, damping: 22 }}
          className="relative w-full max-w-[420px] overflow-hidden rounded-2xl bg-white shadow-[0_30px_80px_-16px_rgba(56,56,236,0.28)] border border-slate-900/[0.06]"
        >
          {/* Top accent bar */}
          <div className="h-[3px] w-full bg-[#3838EC]" />

          {/* Header row: brand mark + close */}
          <div className="flex items-center justify-between px-6 pt-5">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[#3838EC] text-[13px] font-bold text-white">
              U
            </div>
            <button
              onClick={onClose}
              aria-label="Close"
              className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
            >
              <HiXMark size={18} />
            </button>
          </div>

          {/* Top: celebration content */}
          <div className="px-8 pb-8 pt-4 text-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.4, rotate: -20 }}
              animate={{ opacity: 1, scale: 1, rotate: -8 }}
              transition={{
                delay: 0.15,
                type: "spring",
                stiffness: 320,
                damping: 14,
              }}
              className="mx-auto mb-6 inline-flex items-center gap-1.5 rounded-md border-[3px] border-double border-[#3838EC] px-4 py-1.5 font-mono text-xs font-bold uppercase tracking-[0.15em] text-[#3838EC]"
            >
              <HiCheckBadge size={16} />
              Listed
            </motion.div>

            <h2
              id="first-listing-heading"
              className="text-[28px] font-bold leading-tight tracking-tight text-slate-900"
            >
              You&apos;re live.
            </h2>

            <p className="mx-auto mt-3 max-w-[300px] text-[15px] leading-relaxed text-slate-500">
              Your first listing just went up on{" "}
              <span className="font-semibold text-[#3838EC]">Unideals</span>.
              Students can now find it, view it, and reach out.
            </p>
          </div>

          {/* Perforated tear line */}
          <div className="relative border-t-2 border-dashed border-slate-200">
            <div className="absolute -left-3 -top-3 h-6 w-6 rounded-full bg-slate-100 shadow-[inset_0_1px_3px_rgba(15,23,42,0.12)]" />
            <div className="absolute -right-3 -top-3 h-6 w-6 rounded-full bg-slate-100 shadow-[inset_0_1px_3px_rgba(15,23,42,0.12)]" />
          </div>

          {/* Receipt stub */}
          <div className="space-y-2.5 bg-slate-50/70 px-8 py-5 font-mono text-[13px] tabular-nums">
            <div className="flex items-baseline justify-between">
              <span className="text-[11px] uppercase tracking-wide text-slate-400">
                Status
              </span>
              <span className="inline-flex items-center gap-1.5 font-semibold text-[#3838EC]">
                <motion.span
                  animate={{ opacity: [1, 0.4, 1] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className="h-1.5 w-1.5 rounded-full bg-[#3838EC]"
                />
                Live
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-[11px] uppercase tracking-wide text-slate-400">
                Visible to
              </span>
              <span className="font-semibold text-slate-700">All students</span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-[11px] uppercase tracking-wide text-slate-400">
                Listing
              </span>
              <span className="font-semibold text-slate-700">No. 001</span>
            </div>
          </div>

          {/* CTA */}
          <div className="px-8 pb-8 pt-6">
            <motion.button
              whileHover={{ scale: 1.015 }}
              whileTap={{ scale: 0.985 }}
              onClick={onClose}
              className="relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-lg bg-[#3838EC] py-3.5 text-[15px] font-semibold text-white shadow-[0_8px_20px_-6px_rgba(56,56,236,0.55)] transition-colors hover:bg-[#2F2FCB]"
            >
              <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/25" />
              Continue exploring
              <HiArrowRight size={16} />
            </motion.button>
            <p className="mt-3 text-center text-xs text-slate-400">
              Closes automatically in a few seconds
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default FirstListingCelebration;
