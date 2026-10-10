import React from "react";
import {
  motion,
  AnimatePresence,
  MotionConfig,
  useDragControls,
} from "framer-motion";
import { X } from "lucide-react";
import { LOGO_PATHS, LOGO_VIEWBOX } from "./BrandLoader.jsx";
import { useToasts, dismissToast } from "./toast.js";

/**
 * Unideals Toast host + visuals (the `toast()` API lives in ./toast.js).
 *
 * Design language: Figtree, rounded-2xl card, light #F7F8FA / dark
 * #1A1D20 glass, brand-indigo accents, per-type animated SVG icon —
 * the actual Unideals logo mark draws itself on info toasts, check
 * and cross draw on success/error. Progress hairline, pause-on-hover,
 * aria-live announcements, reduced-motion respected.
 */

/* --------------------------- icons --------------------------- */

const ICON_META = {
  success: {
    tile: "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-400/15 dark:text-emerald-300",
    bar: "bg-emerald-500",
  },
  error: {
    tile: "bg-red-500/10 text-red-500 dark:bg-red-400/15 dark:text-red-300",
    bar: "bg-red-500",
  },
  info: {
    tile: "bg-[#4A3CFF]/10 text-[#4A3CFF] dark:bg-[#8FA2FF]/15 dark:text-[#A5B0FF]",
    bar: "bg-[#4A3CFF]",
  },
};

function ToastIcon({ type }) {
  if (type === "success") {
    return (
      <svg
        viewBox="0 0 24 24"
        className="size-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path
          d="M4.5 12.5l5 5L19.5 7"
          pathLength={1}
          className="toast-draw"
          style={{ animationDelay: "0.05s" }}
        />
      </svg>
    );
  }
  if (type === "error") {
    return (
      <svg
        viewBox="0 0 24 24"
        className="size-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.8"
        strokeLinecap="round"
        aria-hidden="true"
      >
        <path
          d="M6 6l12 12"
          pathLength={1}
          className="toast-draw"
          style={{ animationDelay: "0.05s" }}
        />
        <path
          d="M18 6L6 18"
          pathLength={1}
          className="toast-draw"
          style={{ animationDelay: "0.2s" }}
        />
      </svg>
    );
  }
  // info/default: the Unideals mark sketches itself, stroke first.
  return (
    <svg
      viewBox={LOGO_VIEWBOX}
      className="size-5 overflow-visible"
      fill="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient
          id="toastLogoGradient"
          x1="0"
          y1="0"
          x2="100"
          y2="100"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#3838EC" />
          <stop offset="100%" stopColor="#5C6DFF" />
        </linearGradient>
      </defs>
      {LOGO_PATHS.map((item, index) => (
        <g key={index} transform={item.transform}>
          <path
            d={item.d}
            pathLength={1}
            stroke="url(#toastLogoGradient)"
            strokeWidth="30"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="toast-draw-logo"
            style={{ animationDelay: `${0.05 + index * 0.18}s` }}
          />
        </g>
      ))}
    </svg>
  );
}

/* --------------------------- item --------------------------- */

function ToastItem({ toast: t }) {
  // No hover interference by design: the timer and progress bar run
  // straight through — hovering never pauses, freezes, or restarts them.
  React.useEffect(() => {
    const id = setTimeout(() => dismissToast(t.id), t.duration);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const meta = ICON_META[t.type] || ICON_META.info;
  // Drag is opt-in per gesture and starts ONLY from the content area —
  // never from the close button — so a press on ✕ can never be
  // swallowed by pointer capture + drag session.
  const dragControls = useDragControls();

  return (
    <motion.div
      layout
      role="status"
      initial={{ opacity: 0, y: -72, scale: 0.9, filter: "blur(6px)" }}
      animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
      exit={{ opacity: 0, y: -56, scale: 0.93, filter: "blur(4px)" }}
      transition={{ type: "spring", stiffness: 420, damping: 30, mass: 0.9 }}
      drag="y"
      dragListener={false}
      dragControls={dragControls}
      dragConstraints={{ top: 0, bottom: 0 }}
      dragElastic={0.45}
      onDragEnd={(_, info) => {
        if (info.offset.y < -60) dismissToast(t.id);
      }}
      className="pointer-events-auto relative w-full max-w-sm overflow-hidden rounded-2xl border border-[#ECEEF3] bg-white/95 py-2.5 pl-2.5 pr-10 shadow-[0_20px_48px_-16px_rgba(23,27,80,0.35)] backdrop-blur active:cursor-grabbing dark:border-neutral-800 dark:bg-[#1A1D20]/95 dark:shadow-[0_20px_48px_-16px_rgba(0,0,0,0.8)]"
    >
      <div
        onPointerDown={(e) => dragControls.start(e)}
        className="flex cursor-grab items-center gap-3 touch-none select-none"
      >
        <span
          className={`grid size-8 shrink-0 place-items-center rounded-[10px] ${meta.tile}`}
        >
          <ToastIcon type={t.type} />
        </span>
        <p className="min-w-0 flex-1 break-words text-[13px] font-semibold leading-5 text-[#1F2937] dark:text-zinc-100">
          {t.message}
        </p>
      </div>
      <button
        type="button"
        onClick={() => dismissToast(t.id)}
        aria-label="Dismiss notification"
        className="absolute right-2 top-2 grid size-7 cursor-pointer place-items-center rounded-lg text-zinc-400 transition hover:bg-black/5 hover:text-zinc-600 active:scale-90 dark:text-zinc-500 dark:hover:bg-white/10 dark:hover:text-zinc-200"
      >
        <X size={15} />
      </button>
      <div className="absolute inset-x-0 bottom-0 h-[3px] bg-black/[0.06] dark:bg-white/10">
        <span
          className={`toast-progress block h-full w-full ${meta.bar}`}
          style={{ animationDuration: `${t.duration}ms` }}
        />
      </div>
    </motion.div>
  );
}

/* --------------------------- host --------------------------- */

export function Toaster() {
  const toasts = useToasts();
  return (
    <MotionConfig reducedMotion="user">
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 top-3 z-[9999] flex flex-col items-center gap-2 px-4 font-figtree sm:top-4"
      >
        <AnimatePresence mode="popLayout">
          {toasts.map((t) => (
            <ToastItem key={t.id} toast={t} />
          ))}
        </AnimatePresence>
      </div>
      <style>{`
        @keyframes toast-draw-in {
          from { stroke-dashoffset: 1; }
          to { stroke-dashoffset: 0; }
        }
        .toast-draw, .toast-draw-logo {
          stroke-dasharray: 1;
          stroke-dashoffset: 1;
          animation: toast-draw-in 0.45s ease-out forwards;
        }
        .toast-draw-logo { animation-duration: 0.9s; }
        .toast-progress {
          transform-origin: left;
          animation-name: toast-progress-shrink;
          animation-timing-function: linear;
          animation-fill-mode: forwards;
        }
        @keyframes toast-progress-shrink {
          from { transform: scaleX(1); }
          to { transform: scaleX(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          .toast-draw, .toast-draw-logo { animation-duration: 0.01s; }
          .toast-progress { animation: none; }
        }
      `}</style>
    </MotionConfig>
  );
}
