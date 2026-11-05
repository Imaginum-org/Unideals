import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";
import { useGirlsMode } from "../../context/GirlsModeContext.jsx";
import { useUser } from "../../context/useUserContext.jsx";
import { cn } from "../../utils/cn.js";

/**
 * Girls Corner 🌸 right-edge slide menu — the ONLY Girls Corner entry.
 * Rendered ONLY for logged-in girls + admins — zero DOM otherwise.
 *
 * Card matches the Girl Mode reference: light-pink rounded card,
 * "Girl Mode" header with switch, description copy, divider, and an
 * illustration panel (flat-style girl, hearts, sparkles, hills).
 *
 * - A single flower toggle tab is attached to the card's left edge and slides
 *   WITH it — like one drawer unit.
 * - Collapsed: card is pushed off-screen right, only the 56px tab sits at
 *   the right end.
 * - Expanded: tab + card slide left together, so the full menu ends at the
 *   right edge — the button is pushed out with the menu.
 * - The menu stays expanded by default; when Girl Mode turns ON it
 *   auto-collapses so only the tab remains — theme + feed stay active
 *   without covering page content. Tapping the tab re-expands anytime.
 * - The switch drives the page's audience-tab handler (`tab` / `onChange`),
 *   so theme + feed flip together, including a reliable OFF.
 */
const HEART_PATH =
  "M0 4C0 1 2-1 4-1 6-1 8 1 8 4 8 7 4 10 0 14-4 10-8 7-8 4-8 1-6-1-4-1-2-1 0 1 0 4Z";

function Heart({ x, y, scale = 1, fill = "#EC407A", opacity = 1 }) {
  return (
    <path
      transform={`translate(${x},${y}) scale(${scale})`}
      d={HEART_PATH}
      fill={fill}
      opacity={opacity}
    />
  );
}

/** Light-pink cherry-blossom: 5 soft petals, rosy center, golden stamens. */
function FlowerIcon({ size = 28 }) {
  const petals = [0, 72, 144, 216, 288];
  const stamens = [
    [16, 11.8],
    [20.1, 14.6],
    [18.5, 19.4],
    [13.5, 19.4],
    [11.9, 14.6],
  ];
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      aria-hidden="true"
      className="block"
    >
      <defs>
        <radialGradient id="girlsFlowerPetal" cx="50%" cy="32%" r="78%">
          <stop offset="0%" stopColor="#FFF7FB" />
          <stop offset="55%" stopColor="#FBD3E8" />
          <stop offset="100%" stopColor="#F9A8D4" />
        </radialGradient>
      </defs>
      <g>
        {petals.map((a) => (
          <g key={a} transform={`rotate(${a} 16 16)`}>
            <path
              d="M16 15.2C12.4 11.6 11.4 6 14 3.4 15.5 1.9 17.6 1.9 19 3.4 21.6 6 20.6 11.6 16 15.2Z"
              fill="url(#girlsFlowerPetal)"
              stroke="#F472B6"
              strokeWidth="0.9"
            />
            <line
              x1="16"
              y1="13.8"
              x2="16"
              y2="6.2"
              stroke="#DB2777"
              strokeWidth="0.8"
              strokeLinecap="round"
              opacity="0.65"
            />
          </g>
        ))}
      </g>
      <g>
        {stamens.map(([cx, cy], i) => (
          <g key={i}>
            <line
              x1="16"
              y1="16"
              x2={cx}
              y2={cy}
              stroke="#FFF7ED"
              strokeWidth="0.9"
            />
            <circle cx={cx} cy={cy} r="1.15" fill="#FDE68A" stroke="#D97706" strokeWidth="0.55" />
          </g>
        ))}
      </g>
      <circle cx="16" cy="16" r="2.3" fill="#EC4899" />
      <circle cx="16" cy="16" r="0.9" fill="#FCE7F3" />
    </svg>
  );
}

/** Flat-style girl: dark flowing hair, pink shirt, one arm pointing up. */
function Girl() {
  const hair = "#43214F";
  const skin = "#FFDDBE";
  const shirt = "#F472B6";
  const line = "#3B1F4E";
  return (
    <g>
      {/* back hair */}
      <ellipse cx="138" cy="96" rx="32" ry="52" fill={hair} />
      {/* neck */}
      <rect x="132" y="72" width="12" height="14" rx="5" fill={skin} />
      {/* shirt */}
      <path
        d="M108 148C108 118 120 100 138 100C156 100 168 118 168 148Z"
        fill={shirt}
      />
      {/* raised arm (viewer right): sleeve + arm + pointing finger */}
      <g transform="rotate(14 162 104)">
        <rect x="156" y="66" width="12" height="42" rx="6" fill={skin} />
        <rect x="154" y="94" width="16" height="20" rx="7" fill={shirt} />
        <rect x="159" y="54" width="6" height="16" rx="3" fill={skin} />
      </g>
      {/* face */}
      <circle cx="138" cy="54" r="21" fill={skin} />
      {/* fringe */}
      <path
        d="M117 54C118 34 158 34 159 54C152 43 145 48 138 47C131 48 124 43 117 54Z"
        fill={hair}
      />
      {/* side locks */}
      <rect x="114" y="56" width="10" height="46" rx="5" fill={hair} transform="rotate(6 119 79)" />
      <rect x="152" y="56" width="10" height="46" rx="5" fill={hair} transform="rotate(-6 157 79)" />
      {/* happy closed eyes */}
      <path d="M126 56q4 4 8 0" stroke={line} strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M142 56q4 4 8 0" stroke={line} strokeWidth="2" fill="none" strokeLinecap="round" />
      {/* smile + blush */}
      <path d="M132 65q6 6 12 0" stroke={line} strokeWidth="2" fill="none" strokeLinecap="round" />
      <ellipse cx="124" cy="62" rx="3.4" ry="2.2" fill="#F8AFA6" opacity="0.9" />
      <ellipse cx="152" cy="62" rx="3.4" ry="2.2" fill="#F8AFA6" opacity="0.9" />
    </g>
  );
}

export default function GirlsEntryPill({ tab, onChange }) {
  const { girlsMode, setGirlsMode } = useGirlsMode();
  const { userDetails, isLoggedIn } = useUser();
  const [expanded, setExpanded] = useState(true);

  const role = userDetails?.role ?? null;
  const eligible =
    isLoggedIn && (userDetails?.gender === "female" || role === "admin");

  // Safety: never keep pink mode for non-eligible viewers.
  useEffect(() => {
    if (!eligible && girlsMode) setGirlsMode(false);
  }, [eligible, girlsMode, setGirlsMode]);

  const isOn = tab === "girls";

  // Girl Mode ON → auto-collapse so only the flower tab remains visible.
  useEffect(() => {
    if (isOn) setExpanded(false);
  }, [isOn]);

  if (!eligible) return null;

  const toggleMenu = () => setExpanded((v) => !v);

  const handleSwitch = (event) => {
    if (typeof document !== "undefined") {
      const rect = event?.currentTarget?.getBoundingClientRect?.();
      const x =
        rect != null
          ? rect.left + rect.width / 2
          : event?.clientX || window.innerWidth / 2;
      const y =
        rect != null
          ? rect.top + rect.height / 2
          : event?.clientY || window.innerHeight / 2;
      document.documentElement.style.setProperty("--theme-tx", `${x}px`);
      document.documentElement.style.setProperty("--theme-ty", `${y}px`);
    }
    onChange(isOn ? "all" : "girls");
  };

  // Attached unit: [toggle tab][card] slides together.
  // Expanded x=0 → full menu ends at screen right.
  // Collapsed x=252 → card pushed off-screen right, only the 56px tab at the edge.
  const CARD_SHIFT = 252;

  return (
    <div className="fixed right-0 top-[20%] z-40">
      <motion.div
        initial={false}
        animate={{ x: expanded ? 0 : CARD_SHIFT }}
        transition={{ type: "spring", stiffness: 320, damping: 32 }}
        className="flex w-[308px] items-start"
      >
        {/* ---------- Toggle tab: attached to the card, pushes with it ---------- */}
        <button
          type="button"
          onClick={toggleMenu}
          aria-expanded={expanded}
          aria-label={expanded ? "Collapse Girls Corner menu" : "Expand Girls Corner menu"}
          title={expanded ? "Collapse" : "Expand"}
          className={cn(
            "relative flex h-16 w-14 shrink-0 flex-col items-center justify-center gap-0.5 rounded-l-md text-white shadow-xl ring-1 transition",
            isOn
              ? "bg-gradient-to-br from-pink-500 to-rose-500 ring-pink-400"
              : "bg-gradient-to-br from-[#F472B6] to-[#EC4899] ring-pink-300 hover:from-[#EC4899] hover:to-[#DB2777]",
          )}
        >
          <span aria-hidden="true" className="leading-none">
            <FlowerIcon size={30} />
          </span>
          <span aria-hidden="true" className="leading-none">
            {expanded ? <FiChevronRight size={14} /> : <FiChevronLeft size={14} />}
          </span>
        </button>

        {/* ---------- Girl Mode card: attached right of the tab ---------- */}
        <div
          aria-hidden={!expanded}
          className={cn(
            "w-[252px] shrink-0 rounded-2xl rounded-l-none bg-[#FDF2F6] p-5 shadow-xl ring-1 ring-pink-100 transition-opacity duration-200 dark:bg-[#241016] dark:ring-pink-900/50",
            expanded ? "opacity-100" : "pointer-events-none opacity-0",
          )}
          style={{ pointerEvents: expanded ? "auto" : "none" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-[17px] font-extrabold text-[#9D174D] dark:text-pink-200">
              Girl Mode
            </h3>
            <button
              type="button"
              role="switch"
              aria-checked={isOn}
              aria-label={isOn ? "Turn off Girl Mode" : "Turn on Girl Mode"}
              onClick={handleSwitch}
              tabIndex={expanded ? 0 : -1}
              className={cn(
                "relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200",
                isOn ? "bg-[#EC4899]" : "bg-[#D4D9E0] dark:bg-zinc-600",
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  "absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200",
                  isOn ? "translate-x-5" : "translate-x-0",
                )}
              />
            </button>
          </div>

          {/* Description */}
          <p className="mt-2 text-xs font-medium leading-5 text-[#64748B] dark:text-zinc-400">
            Turn on Girl Mode to shop Girls Corner. Girls-only listings on
            your campus in a pink theme made for a safer, more personal experience.
          </p>

          <div className="my-3 h-px bg-[#F3D9E2] dark:bg-pink-900/40" />

          {/* Illustration panel */}
          <div className="overflow-hidden rounded-xl bg-gradient-to-b from-[#FCE7F3] to-[#F9CBD9] dark:from-pink-950/60 dark:to-pink-900/40">
            <svg
              viewBox="0 0 220 150"
              className="block h-auto w-full"
              aria-hidden="true"
            >
              <ellipse cx="46" cy="160" rx="80" ry="44" fill="#F8BBD0" opacity="0.85" />
              <ellipse cx="192" cy="164" rx="74" ry="46" fill="#F48FB1" opacity="0.55" />
              <Heart x={34} y={26} scale={1.4} />
              <Heart x={188} y={22} scale={1.2} fill="#F06292" />
              <Heart x={22} y={66} scale={0.9} fill="#F06292" />
              <Heart x={196} y={70} scale={0.8} fill="#F06292" opacity={0.9} />
              <g fill="#AD1457">
                <text x="58" y="30" fontSize="12">✦</text>
                <text x="164" y="96" fontSize="10">✦</text>
                <text x="96" y="18" fontSize="9" opacity="0.8">✦</text>
              </g>
              <Girl />
            </svg>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
