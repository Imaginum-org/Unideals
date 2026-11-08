import { useEffect, useId, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Check, ChevronsRight } from "lucide-react";
import { useGirlsMode } from "../../context/GirlsModeContext.jsx";
import { useUser } from "../../context/useUserContext.jsx";
import { cn } from "../../utils/cn.js";

/**
 * Girls Corner 🌸 right-edge drawer — the ONLY Girls Corner entry.
 * Rendered ONLY for logged-in girls + admins (zero DOM otherwise).
 *
 * - Edge handle (flower + vertical "Girl Mode" label) attached to the panel;
 *   both slide together like one drawer. Collapsed: only the handle shows.
 * - Panel: pink hero with an animated college-girl character (waves, blinks,
 *   hair sways, hearts float — CSS keyframes in styles/index.css, disabled
 *   for reduced motion), then perks and the on/off switch.
 * - Expanded by default; starts collapsed / auto-collapses when Girl Mode is
 *   on so the pink feed isn't covered. Escape or » also collapse it.
 * - The switch drives the page's audience-tab handler (`tab` / `onChange`),
 *   so theme + feed flip together, including a reliable OFF.
 * - The wrapper is click-through (see comment in render).
 */

/** Cherry-blossom mark: 5 soft petals, rosy centre, golden stamens. */
function FlowerIcon({ size = 28, onDark = false }) {
  const gid = `girlsPetal-${useId().replace(/:/g, "")}`;
  const petals = [0, 72, 144, 216, 288];
  const stamens = [
    [16, 11.8],
    [20.1, 14.6],
    [18.5, 19.4],
    [13.5, 19.4],
    [11.9, 14.6],
  ];
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" className="block">
      <defs>
        <radialGradient id={gid} cx="50%" cy="32%" r="78%">
          <stop offset="0%" stopColor="#FFF7FB" />
          <stop offset="55%" stopColor="#FBD3E8" />
          <stop offset="100%" stopColor={onDark ? "#FBCFE8" : "#F9A8D4"} />
        </radialGradient>
      </defs>
      {petals.map((a) => (
        <g key={a} transform={`rotate(${a} 16 16)`}>
          <path
            d="M16 15.2C12.4 11.6 11.4 6 14 3.4 15.5 1.9 17.6 1.9 19 3.4 21.6 6 20.6 11.6 16 15.2Z"
            fill={`url(#${gid})`}
            stroke={onDark ? "#FFFFFF" : "#F472B6"}
            strokeOpacity={onDark ? 0.75 : 1}
            strokeWidth="0.9"
          />
          <line x1="16" y1="13.8" x2="16" y2="6.2" stroke="#DB2777" strokeWidth="0.8" strokeLinecap="round" opacity="0.55" />
        </g>
      ))}
      {stamens.map(([cx, cy], i) => (
        <g key={i}>
          <line x1="16" y1="16" x2={cx} y2={cy} stroke="#FFF7ED" strokeWidth="0.9" />
          <circle cx={cx} cy={cy} r="1.15" fill="#FDE68A" stroke="#D97706" strokeWidth="0.55" />
        </g>
      ))}
      <circle cx="16" cy="16" r="2.3" fill="#EC4899" />
      <circle cx="16" cy="16" r="0.9" fill="#FCE7F3" />
    </svg>
  );
}

const HEART = "M0 3.2C0 .9 1.7-.6 3.4-.6 4.6-.6 5.6.1 6 1 6.4.1 7.4-.6 8.6-.6 10.3-.6 12 .9 12 3.2 12 6.4 8.4 8.9 6 10.8 3.6 8.9 0 6.4 0 3.2Z";
const SPARKLE = "M0-6L1.6-1.6 6 0 1.6 1.6 0 6-1.6 1.6-6 0-1.6-1.6Z";

/**
 * Animated college-girl character (viewBox 0 0 300 150, right half).
 * Waves, blinks, hair sways; hearts drift up and sparkles twinkle.
 */
function CollegeGirlScene() {
  const skin = "#FFD9C2";
  const skinShade = "#F6C1A3";
  const hair = "#3A1E2B";
  const cardigan = "#F472B6";
  const cardiganDeep = "#EC4899";
  return (
    <svg
      viewBox="0 0 300 150"
      className="absolute inset-0 h-full w-full"
      preserveAspectRatio="xMaxYMax meet"
      aria-hidden="true"
    >
      {/* Soft blobs */}
      <circle className="gm-blob" cx="252" cy="36" r="52" fill="#FBCFE8" opacity="0.55" />
      <circle className="gm-blob" cx="300" cy="128" r="58" fill="#F9A8D4" opacity="0.35" />

      {/* Chat bubble with heart (girls-only chat) */}
      {/* Bubble sits above-left of her head, tail pointing at her */}
      <g transform="translate(152 12)">
        <path d="M6 0h32a6 6 0 0 1 6 6v12a6 6 0 0 1-6 6h-5v7l-8-7H6a6 6 0 0 1-6-6V6a6 6 0 0 1 6-6z" fill="#FFFFFF" />
        <path d={HEART} transform="translate(16 7) scale(0.95)" fill="#EC4899" />
      </g>

      {/* Floating hearts + twinkles */}
      <g transform="translate(244 112) scale(0.8)"><path className="gm-float" d={HEART} fill="#EC4899" style={{ animationDelay: "0s" }} /></g>
      <g transform="translate(282 70) scale(0.65)"><path className="gm-float" d={HEART} fill="#F472B6" style={{ animationDelay: "1.3s" }} /></g>
      <g transform="translate(166 52) scale(0.55)"><path className="gm-float" d={HEART} fill="#DB2777" style={{ animationDelay: "2.4s" }} /></g>
      <g transform="translate(250 30)"><path className="gm-twinkle" d={SPARKLE} fill="#FFFFFF" /></g>
      <g transform="translate(292 102) scale(0.7)"><path className="gm-twinkle" d={SPARKLE} fill="#FDE68A" style={{ animationDelay: "0.8s" }} /></g>
      <g transform="translate(162 94) scale(0.6)"><path className="gm-twinkle" d={SPARKLE} fill="#FFFFFF" style={{ animationDelay: "1.6s" }} /></g>

      <g className="gm-bob">
        {/* Long hair (behind) — gently sways */}
        <path
          className="gm-sway"
          d="M214 40c-27 0-38 22-36 47 1 19-4 37-11 63h94c-7-26-12-44-11-63 2-25-9-47-36-47z"
          fill={hair}
        />

        {/* Body: cardigan over white tee, backpack strap */}
        <path d="M168 150c3-31 20-50 46-50s43 19 46 50z" fill={cardigan} />
        <path d="M201 101l13 24 13-24c-4-1.4-8.4-2-13-2s-9 .6-13 2z" fill="#FFFFFF" />
        <path d="M214 125v25" stroke={cardiganDeep} strokeWidth="1.4" />
        <path d="M201 101c-3 18-3 34 0 49M227 101c3 18 3 34 0 49" stroke={cardiganDeep} strokeWidth="1.4" fill="none" />
        <path d="M184 108c5 13 6 28 4 42" stroke="#A78BFA" strokeWidth="7" strokeLinecap="round" fill="none" />

        {/* Neck + head */}
        <rect x="206.5" y="80" width="15" height="17" rx="6" fill={skinShade} />
        <circle cx="214" cy="64" r="23" fill={skin} />
        {/* Bangs */}
        <path d="M190.6 63c-.4-18 11-28 23.4-28 14 0 25 10 24 28-6-9-14-13-22-11-9-6-19-3-25.4 11z" fill={hair} />
        {/* Bow clip */}
        <g transform="translate(232 44)">
          <path d="M0 0l-7-4v8z" fill="#EC4899" />
          <path d="M0 0l7-4v8z" fill="#DB2777" />
          <circle r="2" fill="#BE185D" />
        </g>
        {/* Earrings */}
        <circle cx="191.4" cy="72" r="1.8" fill="#F5B533" />
        <circle cx="236.6" cy="72" r="1.8" fill="#F5B533" />
        {/* Eyes (blink) */}
        <g className="gm-blink">
          <ellipse cx="205.5" cy="65" rx="2.4" ry="3" fill="#2A1520" />
          <ellipse cx="222.5" cy="65" rx="2.4" ry="3" fill="#2A1520" />
          <circle cx="206.3" cy="63.9" r="0.8" fill="#FFFFFF" />
          <circle cx="223.3" cy="63.9" r="0.8" fill="#FFFFFF" />
        </g>
        {/* Blush + smile */}
        <ellipse cx="199" cy="73" rx="3.6" ry="2.2" fill="#F9A8C0" opacity="0.85" />
        <ellipse cx="229" cy="73" rx="3.6" ry="2.2" fill="#F9A8C0" opacity="0.85" />
        <path d="M208.5 75.5q5.5 5 11 0" stroke="#B4475F" strokeWidth="2" fill="none" strokeLinecap="round" />

        {/* Arm holding textbooks (category palette) */}
        <g transform="rotate(-8 186 128)">
          <rect x="166" y="118" width="34" height="8" rx="1.6" fill="#D8502E" />
          <rect x="168" y="110" width="30" height="8" rx="1.6" fill="#2F9E5C" />
          <rect x="170" y="102.5" width="26" height="7.5" rx="1.6" fill="#F5A623" />
          <rect x="166" y="121" width="34" height="2" fill="#B83F22" opacity="0.6" />
        </g>
        <path d="M176 122c10 4 22 5 30 2" stroke={cardigan} strokeWidth="10" strokeLinecap="round" fill="none" />
        <circle cx="206" cy="123.5" r="5.4" fill={skin} />

        {/* Waving arm */}
        <g className="gm-wave">
          <path d="M248 116L262 80" stroke={cardigan} strokeWidth="12" strokeLinecap="round" />
          <circle cx="264.5" cy="73" r="7" fill={skin} />
          <path d="M260 68.6v-5M263.6 67.2v-6M267.4 67.6v-5.4" stroke={skin} strokeWidth="3" strokeLinecap="round" />
        </g>
      </g>
    </svg>
  );
}

const PERKS = [
  "Girls-only listings from your campus",
  "Beauty, fashion & decor categories",
  "Only girls can chat on these listings",
];

const PANEL_WIDTH = 304;
// Phones: a compact panel (never wider than ~82% of the screen) docked
// just above the bottom tab bar, within thumb reach.
const COMPACT_QUERY = "(max-width: 639.98px)";
const compactWidth = () =>
  typeof window === "undefined" ? 264 : Math.min(264, Math.round(window.innerWidth * 0.82));

const useCompact = () => {
  const [compact, setCompact] = useState(
    () => typeof window !== "undefined" && window.matchMedia(COMPACT_QUERY).matches,
  );
  useEffect(() => {
    const mq = window.matchMedia(COMPACT_QUERY);
    const on = () => setCompact(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return compact;
};

export default function GirlsEntryPill({ tab, onChange }) {
  const { girlsMode, setGirlsMode } = useGirlsMode();
  const { userDetails, isLoggedIn } = useUser();
  // Start collapsed when Girl Mode is already on (no open-then-close slide
  // on every page load); otherwise open so the feature is discoverable.
  // Phones start collapsed too: the open panel would cover most of a small
  // screen; the edge handle alone stays discoverable.
  const [expanded, setExpanded] = useState(
    () => tab !== "girls" && (typeof window === "undefined" || window.innerWidth >= 640),
  );
  const handleRef = useRef(null);
  const rootRef = useRef(null);
  const compact = useCompact();
  const panelWidth = compact ? compactWidth() : PANEL_WIDTH;

  const role = userDetails?.role ?? null;
  const eligible =
    isLoggedIn && (userDetails?.gender === "female" || role === "admin");

  // Safety: never keep pink mode for non-eligible viewers.
  useEffect(() => {
    if (!eligible && girlsMode) setGirlsMode(false);
  }, [eligible, girlsMode, setGirlsMode]);

  const isOn = tab === "girls";

  // Girl Mode ON → auto-collapse so only the handle remains visible.
  useEffect(() => {
    if (isOn) setExpanded(false);
  }, [isOn]);

  // Escape collapses the open panel (focus returns to the handle).
  useEffect(() => {
    if (!expanded || !eligible) return undefined;
    const onKey = (event) => {
      if (event.key === "Escape") {
        setExpanded(false);
        handleRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [expanded, eligible]);

  // Phones: tapping anywhere outside the open panel closes it (it floats
  // over content there, unlike the roomier desktop edge).
  useEffect(() => {
    if (!expanded || !compact) return undefined;
    const onDown = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) setExpanded(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [expanded, compact]);

  if (!eligible) return null;

  const handleSwitch = (event) => {
    if (typeof document !== "undefined") {
      const rect = event?.currentTarget?.getBoundingClientRect?.();
      const x = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
      const y = rect ? rect.top + rect.height / 2 : window.innerHeight / 2;
      document.documentElement.style.setProperty("--theme-tx", `${x}px`);
      document.documentElement.style.setProperty("--theme-ty", `${y}px`);
    }
    onChange(isOn ? "all" : "girls");
  };

  // The wrapper is click-through: when collapsed, the panel slides
  // off-screen via a transform, which doesn't shrink the layout box — the
  // invisible fixed wrapper used to sit over the page's right edge and
  // swallow clicks. Only the handle and the open panel accept pointer events.
  return (
    <div
      ref={rootRef}
      className={cn(
        "pointer-events-none fixed right-0 z-40 font-figtree",
        compact ? "bottom-[calc(var(--tabbar-h)+1rem)]" : "top-[20%]",
      )}
    >
      <motion.div
        initial={false}
        animate={{ x: expanded ? 0 : panelWidth }}
        transition={{ type: "spring", stiffness: 340, damping: 34 }}
        className={cn("flex", compact ? "items-end" : "items-start")}
      >
        {/* ---------- Edge handle ---------- */}
        <button
          ref={handleRef}
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          aria-controls="girls-mode-panel"
          aria-label={expanded ? "Collapse Girl Mode panel" : "Open Girl Mode panel"}
          className={cn(
            "pointer-events-auto relative flex shrink-0 flex-col items-center rounded-l-2xl transition-[box-shadow,transform]",
            compact ? "w-8 gap-1.5 py-2.5" : "w-10 gap-2 py-3",
            " duration-200 hover:-translate-x-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-400 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#131313]",
            isOn
              ? "bg-gradient-to-b from-[#F472B6] to-[#DB2777] text-white shadow-[0_12px_30px_-10px_rgba(219,39,119,0.75)]"
              : "border border-r-0 border-pink-200 bg-white text-[#DB2777] shadow-[0_12px_30px_-12px_rgba(219,39,119,0.5)] dark:border-pink-900/60 dark:bg-[#1A1D20] dark:text-pink-300",
          )}
        >
          <FlowerIcon size={compact ? 17 : 22} onDark={isOn} />
          <span
            className={cn(
              "font-semibold [writing-mode:vertical-rl] rotate-180",
              compact ? "text-[10px] tracking-[0.06em]" : "text-[11px] tracking-[0.08em]",
            )}
          >
            Girl Mode
          </span>
          {isOn && (
            <span
              aria-hidden="true"
              className="h-1.5 w-1.5 rounded-full bg-white shadow-[0_0_0_3px_rgba(255,255,255,0.3)]"
            />
          )}
        </button>

        {/* ---------- Panel ---------- */}
        <section
          id="girls-mode-panel"
          aria-label="Girl Mode"
          aria-hidden={!expanded}
          className={cn(
            "shrink-0 overflow-hidden border border-r-0",
            compact ? "rounded-l-2xl" : "rounded-bl-3xl",
            " border-pink-100 bg-white shadow-[0_20px_44px_-12px_rgba(157,23,77,0.28)] transition-opacity duration-200 dark:border-pink-950/70 dark:bg-[#1A1D20] dark:shadow-[0_20px_44px_-12px_rgba(0,0,0,0.6)]",
            expanded ? "opacity-100" : "opacity-0",
          )}
          style={{ width: panelWidth, pointerEvents: expanded ? "auto" : "none" }}
        >
          {/* Hero with animated character */}
          <div className={cn("relative overflow-hidden bg-gradient-to-br", compact ? "h-[112px]" : "h-[156px]", " from-[#FFE4F1] via-[#FCD3E6] to-[#F9B9D7] dark:from-[#4A1530] dark:via-[#3A1226] dark:to-[#2A0F1E]")}>
            <CollegeGirlScene />
            <div className={cn("relative z-10 flex h-full flex-col justify-center", compact ? "w-[132px] pl-4" : "w-[150px] pl-5")}>
              <span className="inline-flex w-fit items-center gap-1 rounded-full bg-white/80 px-2 py-0.5 text-[10.5px] font-semibold text-[#DB2777] shadow-[0_1px_2px_rgba(157,23,77,0.12)] backdrop-blur dark:bg-white/10 dark:text-pink-200">
                <FlowerIcon size={12} />
                Girls Corner
              </span>
              <h3 className={cn("font-bold leading-none tracking-tight text-[#831843] dark:text-white", compact ? "mt-1.5 text-[17px]" : "mt-2 text-[20px]")}>
                Girl Mode
              </h3>
              <p className={cn("mt-1.5 leading-snug text-[#9D174D]/80 dark:text-pink-100/75", compact ? "text-[11px]" : "text-[12px]")}>
                Your safe space to shop, bestie
              </p>
            </div>
            <button
              type="button"
              onClick={() => setExpanded(false)}
              tabIndex={expanded ? 0 : -1}
              aria-label="Collapse Girl Mode panel"
              className="absolute right-2.5 top-2.5 z-10 grid h-7 w-7 place-items-center rounded-full bg-white/75 text-[#9D174D] shadow-sm backdrop-blur transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-400 dark:bg-white/10 dark:text-pink-100 dark:hover:bg-white/20"
            >
              <ChevronsRight className="h-4 w-4" strokeWidth={2.4} />
            </button>
          </div>

          {/* Body */}
          <div className={compact ? "px-4 pb-4 pt-3" : "px-5 pb-5 pt-4"}>
            <ul className={compact ? "space-y-2" : "space-y-2.5"}>
              {PERKS.map((perk) => (
                <li key={perk} className={cn("flex items-start gap-2.5 leading-[1.35] text-slate-700 dark:text-zinc-300", compact ? "text-[12px]" : "text-[13px]")}>
                  <span className="mt-px grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full bg-gradient-to-b from-[#F472B6] to-[#DB2777] text-white shadow-[0_2px_6px_-2px_rgba(219,39,119,0.6)]">
                    <Check className="h-2.5 w-2.5" strokeWidth={3.4} />
                  </span>
                  {perk}
                </li>
              ))}
            </ul>

            <div className={cn("flex items-center justify-between gap-3 rounded-2xl border", compact ? "mt-3 px-3 py-2.5" : "mt-4 px-3.5 py-3", "border-pink-100 bg-gradient-to-r from-[#FFF5FA] to-[#FDEFF6] dark:border-pink-900/50 dark:from-pink-950/30 dark:to-pink-950/10")}>
              <div className="min-w-0">
                <p className="text-[13.5px] font-semibold leading-tight text-[#0F172A] dark:text-white">
                  {isOn ? "Girl Mode is on" : "Turn on Girl Mode"}
                </p>
                <p className="mt-0.5 text-[11.5px] text-slate-500 dark:text-zinc-400">
                  {isOn ? "Switch back anytime" : "Pink theme + girls-only feed. Slay."}
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={isOn}
                aria-label={isOn ? "Turn off Girl Mode" : "Turn on Girl Mode"}
                onClick={handleSwitch}
                tabIndex={expanded ? 0 : -1}
                className={cn(
                  "relative h-[26px] w-12 shrink-0 rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-400 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#1A1D20]",
                  isOn ? "bg-gradient-to-r from-[#F472B6] to-[#DB2777]" : "bg-[#E2E5EC] dark:bg-zinc-600",
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute left-[3px] top-[3px] h-5 w-5 rounded-full bg-white shadow-[0_1px_3px_rgba(15,23,42,0.25)] transition-transform duration-200",
                    isOn ? "translate-x-[22px]" : "translate-x-0",
                  )}
                />
              </button>
            </div>
          </div>
        </section>
      </motion.div>
    </div>
  );
}
