import { useId } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useTheme } from "../../context/ThemeContext.jsx";
import { cn } from "../../utils/cn.js";

/**
 * ThemeToggle — looks like the classic single icon button, but the icon
 * is a hand-built SVG that *redraws* itself on toggle:
 *
 * - moon -> sun: crescent spins/blurs away, then a gradient sun disc pops
 *   in and its 8 rounded rays draw themselves one after another.
 * - sun -> moon: rays retract, disc shrinks away, then a gradient crescent
 *   with a twinkling sparkle blooms back in.
 *
 * The page-wide color change is a slow circular reveal originating from
 * this button (View Transitions API, see ThemeContext + index.css).
 *
 * Props:
 * - size: "sm" (size-5) | "md" (size-6) | "responsive" (size-5 xl:size-6)
 * - variant: "default" | "glass" (glass keeps the moon pearl-white, for
 *   colored panels like the auth side card)
 * - className: extra classes on the button
 */
const RAYS = Array.from({ length: 8 }).map((_, i) => {
  const angle = (i * Math.PI) / 4 - Math.PI / 2;
  const x1 = 12 + Math.cos(angle) * 6.6;
  const y1 = 12 + Math.sin(angle) * 6.6;
  const x2 = 12 + Math.cos(angle) * 9.4;
  const y2 = 12 + Math.sin(angle) * 9.4;
  return { x1, y1, x2, y2 };
});

const SIZE_CLASS = {
  sm: "size-5",
  md: "size-6",
  responsive: "size-5 xl:size-6",
};

export default function ThemeToggle({
  size = "md",
  variant = "default",
  className,
}) {
  const { darkMode, toggleDarkMode } = useTheme();
  const reduceMotion = useReducedMotion();
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");

  const glass = variant === "glass";
  const sunGradId = `tt-sun-${uid}`;
  const moonGradId = `tt-moon-${uid}`;

  const drawTransition = (delay = 0) =>
    reduceMotion
      ? { duration: 0 }
      : { duration: 0.3, ease: "easeOut", delay };

  return (
    <motion.button
      type="button"
      onClick={toggleDarkMode}
      aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
      aria-pressed={darkMode}
      whileHover={reduceMotion ? undefined : { scale: 1.14, rotate: darkMode ? -10 : 10 }}
      whileTap={reduceMotion ? undefined : { scale: 0.86 }}
      transition={{ type: "spring", stiffness: 500, damping: 20 }}
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center rounded-full outline-none",
        "transition-transform duration-200",
        "focus-visible:ring-2 focus-visible:ring-[#3838EC] focus-visible:ring-offset-2",
        "dark:focus-visible:ring-offset-[#131313]",
        className,
      )}
    >
      <span className={cn("relative block", SIZE_CLASS[size] ?? SIZE_CLASS.md)}>
        <AnimatePresence initial={false} mode="wait">
          {!darkMode ? (
            /* ── Moon (light mode): gradient crescent + sparkle ── */
            <motion.svg
              key="moon"
              viewBox="0 0 24 24"
              className="absolute inset-0 size-full"
              initial={
                reduceMotion
                  ? { opacity: 0 }
                  : { opacity: 0, scale: 0.4, rotate: 100, filter: "blur(3px)" }
              }
              animate={{ opacity: 1, scale: 1, rotate: 0, filter: "blur(0px)" }}
              exit={
                reduceMotion
                  ? { opacity: 0 }
                  : { opacity: 0, scale: 0.4, rotate: -100, filter: "blur(3px)" }
              }
              transition={
                reduceMotion ? { duration: 0 } : { duration: 0.22, ease: "easeInOut" }
              }
              aria-hidden="true"
            >
              <defs>
                <linearGradient id={moonGradId} x1="0" y1="0" x2="1" y2="1">
                  {glass ? (
                    <>
                      <stop offset="0%" stopColor="#FFFFFF" />
                      <stop offset="100%" stopColor="#CBD6FF" />
                    </>
                  ) : (
                    <>
                      <stop offset="0%" stopColor="#6B6B8C" />
                      <stop offset="55%" stopColor="#3A3A55" />
                      <stop offset="100%" stopColor="#1E1E30" />
                    </>
                  )}
                </linearGradient>
              </defs>

              {/* crescent */}
              <path
                d="M20.4 13.4A8.4 8.4 0 1 1 10.6 3.6a.7.7 0 0 1 .92.92 6.9 6.9 0 0 0 7.96 7.96.7.7 0 0 1 .92.92Z"
                fill={`url(#${moonGradId})`}
              />
            </motion.svg>
          ) : (
            /* ── Sun (dark mode): gradient disc + drawn rays ── */
            <motion.svg
              key="sun"
              viewBox="0 0 24 24"
              fill="none"
              className="absolute inset-0 size-full"
              initial={
                reduceMotion
                  ? { opacity: 0 }
                  : { opacity: 0, scale: 0.4, rotate: -100, filter: "blur(3px)" }
              }
              animate={{ opacity: 1, scale: 1, rotate: 0, filter: "blur(0px)" }}
              exit={
                reduceMotion
                  ? { opacity: 0 }
                  : { opacity: 0, scale: 0.4, rotate: 100, filter: "blur(3px)" }
              }
              transition={
                reduceMotion ? { duration: 0 } : { duration: 0.22, ease: "easeInOut" }
              }
              aria-hidden="true"
            >
              <defs>
                <linearGradient id={sunGradId} x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#FFE58A" />
                  <stop offset="55%" stopColor="#FFC53D" />
                  <stop offset="100%" stopColor="#FF901F" />
                </linearGradient>
              </defs>

              {/* disc */}
              <motion.circle
                cx={12}
                cy={12}
                r={4.6}
                fill={`url(#${sunGradId})`}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={drawTransition(0.05)}
                style={{ transformOrigin: "12px 12px" }}
              />

              {/* rays draw one after another, clockwise from the top */}
              {RAYS.map((ray, i) => (
                <motion.line
                  key={i}
                  x1={ray.x1}
                  y1={ray.y1}
                  x2={ray.x2}
                  y2={ray.y2}
                  stroke="#FFB62E"
                  strokeWidth={2.1}
                  strokeLinecap="round"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  transition={drawTransition(0.08 + i * 0.03)}
                />
              ))}
            </motion.svg>
          )}
        </AnimatePresence>
      </span>
    </motion.button>
  );
}
