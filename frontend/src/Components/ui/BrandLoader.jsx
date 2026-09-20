import React from "react";

// BrandLoader — the single loader for the whole app.
//
// Draws the Unideals "U" brand mark with a premium draw-on loop
// (dashoffset 1000 -> 0 -> hold -> back, 2.2s indefinite) in the brand
// indigo gradient, plus a subtle scale pulse. Pass `path` to trace a
// different mark later without touching call sites.
//
// Props:
//   size: "xs" (16, buttons) | "sm" (24) | "md" (48, default) |
//         "lg" (96) | "full" (fullscreen centered overlay)
//   tone: "brand" (default) | "white" (on colored buttons/badges)
//   label: optional visible caption under the mark
//   className: extra classes for the wrapper
//
// Respects prefers-reduced-motion (renders a static mark).
const SIZE_PX = {
  xs: 16,
  sm: 24,
  md: 48,
  lg: 96,
};

// Clean single-stroke "U" brand letterform (100x100 viewBox).
const DEFAULT_MARK_PATH =
  "M22 14 V58 Q22 86 50 86 Q78 86 78 58 V14";

const BrandLoader = ({
  size = "md",
  tone = "brand",
  label = "",
  path = DEFAULT_MARK_PATH,
  className = "",
  fullScreen = false,
}) => {
  const px = SIZE_PX[size] || SIZE_PX.md;
  const isFull = size === "full" || fullScreen;
  const stroke = tone === "white" ? "#FFFFFF" : "url(#brandLoaderGradient)";
  const labelId = React.useId();

  const mark = (
    <div
      className={`flex flex-col items-center justify-center gap-3 ${className}`}
      role="status"
      aria-live="polite"
      aria-label={label || "Loading"}
    >
      <div
        className="animate-[brandLoaderPulse_2.2s_ease-in-out_infinite]"
        style={{ width: isFull ? 96 : px, height: isFull ? 96 : px }}
      >
        <svg
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="h-full w-full overflow-visible"
          aria-hidden="true"
        >
          <defs>
            <linearGradient
              id="brandLoaderGradient"
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
          {/* Soft glow behind the stroke */}
          <path
            d={path}
            fill="none"
            stroke={tone === "white" ? "#FFFFFF" : "#3838EC"}
            strokeWidth="7"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.18"
            style={{ filter: "blur(6px)" }}
          />
          {/* Draw-on loop */}
          <path
            d={path}
            pathLength="1000"
            fill="none"
            stroke={stroke}
            strokeWidth="7"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="1000"
            strokeDashoffset="1000"
          >
            <animate
              attributeName="stroke-dashoffset"
              values="1000;0;0;1000"
              keyTimes="0;0.42;0.78;1"
              dur="2.2s"
              repeatCount="indefinite"
            />
          </path>
        </svg>
      </div>
      {label ? (
        <p
          id={labelId}
          className="text-sm font-medium text-slate-500 dark:text-slate-400 font-figtree"
        >
          {label}
        </p>
      ) : (
        <span className="sr-only">Loading</span>
      )}
      <style>{`
        @keyframes brandLoaderPulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.06); opacity: 0.92; }
        }
        @media (prefers-reduced-motion: reduce) {
          .animate-\\[brandLoaderPulse_2\\.2s_ease-in-out_infinite\\] {
            animation: none;
          }
        }
      `}</style>
    </div>
  );

  if (isFull) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-white dark:bg-[#131313]">
        {mark}
      </div>
    );
  }

  return mark;
};

export default React.memo(BrandLoader);
