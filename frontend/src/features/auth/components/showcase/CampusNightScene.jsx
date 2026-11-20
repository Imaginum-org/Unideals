import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { BadgeCheck, Check, MapPin, MessageCircle, ShoppingBag, Tag } from "lucide-react";
import { cn } from "../../../../utils/cn.js";

/*
 * Campus at night: the auth screens' animated story.
 *
 * White line art on the indigo panel: a hostel, a domed library, a clock
 * tower and a café, joined by a dotted route. A bag travels the route and
 * each stop tells one step of a deal: listed → chat → meet → paid.
 *
 * Production notes
 * - One rAF loop writes the token position, walked route and progress bars
 *   straight to the DOM; React only re-renders when the step changes.
 * - The loop runs only while the scene is on screen (IntersectionObserver),
 *   so it is idle on phones, where the panel is display:none.
 * - The clock is module-level: moving between login/signup/forgot remounts
 *   the panel, but the story continues where it was and the draw-in intro
 *   plays only once per visit.
 * - Reduced motion: no loop and no ambient animation; the scene is drawn
 *   and the steps can still be browsed with the progress buttons.
 * - Purely decorative SVG (aria-hidden); the caption carries the meaning.
 */

const VIEW_W = 640;
const VIEW_H = 290;
const GROUND = 210;

/* ── The story ──────────────────────────────────────────────────────── */
const STEPS = [
  {
    place: "Hostel",
    title: "List it from your room",
    body: "Snap a photo and set a price. It goes live on your campus right away.",
  },
  {
    place: "Library",
    title: "Chat between classes",
    body: "Agree on a price in chat. Your phone number is never shown.",
  },
  {
    place: "Clock tower",
    title: "Meet somewhere busy",
    body: "Pick a public spot on campus, like the library, canteen or main gate.",
  },
  {
    place: "Café",
    title: "Pay at pickup",
    body: "Check the item, then pay by cash or UPI. No listing fees, no shipping.",
  },
];

// One soft accent per step, mirroring the bubble icon tones below. Used
// sparingly: stop marker, bag icon, step badge, eyebrow and progress bar.
const STEP_ACCENT = [
  { core: "#6366F1", bar: "#A5B4FC", badge: "bg-indigo-300/15 text-indigo-100 ring-indigo-200/30", eyebrow: "text-indigo-200/80" },
  { core: "#0EA5E9", bar: "#7DD3FC", badge: "bg-sky-300/15 text-sky-100 ring-sky-200/30", eyebrow: "text-sky-200/80" },
  { core: "#F59E0B", bar: "#FCD34D", badge: "bg-amber-300/15 text-amber-100 ring-amber-200/30", eyebrow: "text-amber-200/80" },
  { core: "#10B981", bar: "#6EE7B7", badge: "bg-emerald-300/15 text-emerald-100 ring-emerald-200/30", eyebrow: "text-emerald-200/80" },
];

const BUBBLES = [
  { icon: Tag, text: "Cycle listed · ₹2,400", tone: "bg-indigo-50 text-[#393AF2]" },
  { icon: MessageCircle, text: "Still available?", tone: "bg-sky-50 text-sky-600", typing: true },
  { icon: MapPin, text: "Meet here at 5 PM", tone: "bg-amber-50 text-amber-600" },
  { icon: BadgeCheck, text: "Paid at pickup", tone: "bg-emerald-50 text-emerald-600" },
];

/* Where each building stands and where its bubble anchors (viewBox units).
   `top` is the highest point of the drawing; `align` keeps edge bubbles
   inside the card. */
const PLACES = [
  { x: 88, top: 46, align: "start", d: "0s" },
  { x: 236, top: 46, align: "center", d: "0.15s" },
  { x: 376, top: 16, align: "center", d: "0.3s" },
  { x: 536, top: 68, align: "end", d: "0.45s" },
];

const STOPS = [
  [88, 246],
  [236, 256],
  [376, 244],
  [536, 254],
];
const SEGS = [
  "M88 246 C 140 272, 188 274, 236 256",
  "M236 256 C 282 238, 330 228, 376 244",
  "M376 244 C 428 262, 482 274, 536 254",
];
const LEAD_IN = "M0 234 C 34 234, 62 238, 88 246";
const LEAD_OUT = "M536 254 C 572 240, 606 236, 640 238";
const STOP_R = 8.5;

/* ── Timeline ─────────────────────────────────────────────────────────
   hold(0) · move→1 · hold(1) · move→2 · hold(2) · move→3 · hold(3)
   Step k owns its move-in plus its hold, so the progress bar for step k
   fills smoothly across both. */
const HOLD = 2700;
const MOVE = 1500;
const END_HOLD = 3200;
const FADE = 450;
const INTRO_MS = 1500;
const STEP_START = [0, HOLD, HOLD * 2 + MOVE, HOLD * 3 + MOVE * 2];
const STEP_DUR = [HOLD, MOVE + HOLD, MOVE + HOLD, MOVE + END_HOLD];
const CYCLE = STEP_START[3] + STEP_DUR[3];
const REST_STEP = 0;

const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const clamp01 = (v) => Math.min(1, Math.max(0, v));
const pct = (v, total) => `${(v / total) * 100}%`;
const arriveAt = (k) => STEP_START[k] + (k > 0 ? MOVE : 0);

function phaseAt(t) {
  const k = t >= STEP_START[3] ? 3 : t >= STEP_START[2] ? 2 : t >= STEP_START[1] ? 1 : 0;
  const local = t - STEP_START[k];
  if (k > 0 && local < MOVE) {
    return { step: k, moving: true, seg: k - 1, f: easeInOutCubic(local / MOVE) };
  }
  return { step: k, moving: false, seg: k - 1, f: 1 };
}

// Shared across mounts (see production notes).
const engine = { origin: null, introPlayed: false };
const clockNow = () => (typeof performance !== "undefined" ? performance.now() : Date.now());
const currentT = () => {
  if (engine.origin == null) return 0;
  const elapsed = clockNow() - engine.origin;
  return elapsed <= 0 ? 0 : elapsed % CYCLE;
};

/* ── Line-art pieces (origin = middle of the building's ground line) ── */
const HOSTEL_LIT = new Set(["0-1", "1-0", "1-2", "2-2", "3-0"]);
const HOSTEL_FLICKER = { "1-1": "-1s", "2-0": "-4s", "3-2": "-6.5s", "0-0": "-2.5s" };

function Hostel() {
  return (
    <>
      <rect className="as-fill as-tint-teal as-line" pathLength="1" x="12" y="-164" width="24" height="16" rx="4" />
      <rect className="as-fill as-line" pathLength="1" x="-54" y="-148" width="108" height="10" rx="3" />
      <rect className="as-fill as-line" pathLength="1" x="-48" y="-138" width="96" height="138" rx="4" />
      {[0, 1, 2, 3].map((r) =>
        [0, 1, 2].map((c) => {
          const k = `${r}-${c}`;
          const fd = HOSTEL_FLICKER[k];
          return (
            <rect
              key={k}
              className={cn("as-win", HOSTEL_LIT.has(k) && "is-lit", fd && "is-flicker")}
              style={fd ? { "--fd": fd } : undefined}
              x={-36 + c * 28}
              y={-124 + r * 24}
              width="16"
              height="13"
              rx="2"
            />
          );
        }),
      )}
      <rect className="as-line as-glowfill" pathLength="1" x="-10" y="-28" width="20" height="28" rx="3" />
    </>
  );
}

function Library() {
  return (
    <>
      <path className="as-line" pathLength="1" d="M0 -146 V-158" />
      <circle className="as-fill as-line" pathLength="1" cx="0" cy="-161" r="3" />
      <path className="as-fill as-tint-sky as-line" pathLength="1" d="M-36 -110 A36 36 0 0 1 36 -110 Z" />
      <rect className="as-fill as-line" pathLength="1" x="-38" y="-110" width="76" height="18" rx="2" />
      {[-22, -4, 14].map((x) => (
        <rect key={x} className="as-win is-lit" x={x} y="-106" width="8" height="9" rx="1.5" />
      ))}
      <rect className="as-fill as-line" pathLength="1" x="-68" y="-92" width="136" height="10" rx="2" />
      <rect className="as-fill as-line" pathLength="1" x="-62" y="-82" width="124" height="70" rx="2" />
      {[-54, -36, 28, 46].map((x) => (
        <rect key={x} className="as-fill as-line" pathLength="1" x={x} y="-76" width="8" height="62" rx="2" />
      ))}
      <path className="as-line as-glowfill" pathLength="1" d="M-12 -12 V-44 A12 12 0 0 1 12 -44 V-12 Z" />
      <rect className="as-fill as-line" pathLength="1" x="-70" y="-12" width="140" height="6" rx="1.5" />
      <rect className="as-fill as-line" pathLength="1" x="-76" y="-6" width="152" height="6" rx="1.5" />
    </>
  );
}

function ClockTower({ animate }) {
  return (
    <>
      <path className="as-line" pathLength="1" d="M0 -178 V-194" />
      <path className="as-flag as-soft" d="M0 -194 L13 -189.5 L0 -185 Z" />
      <path className="as-fill as-tint-rose as-line" pathLength="1" d="M-34 -152 L0 -178 L34 -152 Z" />
      <rect className="as-fill as-line" pathLength="1" x="-30" y="-152" width="60" height="52" rx="3" />
      <circle className="as-fill as-line" pathLength="1" cx="0" cy="-126" r="17" />
      <path
        className="as-soft"
        stroke="rgba(255,255,255,0.7)"
        strokeWidth="1.4"
        strokeLinecap="round"
        d="M0 -140 V-137 M14 -126 H11 M0 -112 V-115 M-14 -126 H-11"
      />
      <g className="as-soft" stroke="#fff" strokeLinecap="round">
        <path d="M0 -126 V-134" strokeWidth="2">
          {animate ? (
            <animateTransform
              attributeName="transform"
              type="rotate"
              from="120 0 -126"
              to="480 0 -126"
              dur="72s"
              repeatCount="indefinite"
            />
          ) : null}
        </path>
        <path d="M0 -126 V-138" strokeWidth="1.5">
          {animate ? (
            <animateTransform
              attributeName="transform"
              type="rotate"
              from="0 0 -126"
              to="360 0 -126"
              dur="9s"
              repeatCount="indefinite"
            />
          ) : null}
        </path>
        <circle cx="0" cy="-126" r="1.8" fill="#fff" stroke="none" />
      </g>
      <rect className="as-fill as-line" pathLength="1" x="-22" y="-100" width="44" height="100" rx="2" />
      <path className="as-win is-lit" d="M-5 -62 V-80 A5 5 0 0 1 5 -80 V-62 Z" />
      <path className="as-win is-flicker" style={{ "--fd": "-3s" }} d="M-5 -30 V-48 A5 5 0 0 1 5 -48 V-30 Z" />
      <path className="as-line as-glowfill" pathLength="1" d="M-9 0 V-12 A9 9 0 0 1 9 -12 V0 Z" />
    </>
  );
}

const AWNING = Array.from(
  { length: 8 },
  (_, i) => `M${-56 + 14 * i} -64 L${-56 + 14 * (i + 1)} -64 L${-64 + 16 * (i + 1)} -46 L${-64 + 16 * i} -46 Z`,
);

function Cafe() {
  return (
    <>
      <path className="as-steam" style={{ "--sd": "0s" }} d="M-5 -116 q-4 -6 0 -12 q4 -6 0 -12" />
      <path className="as-steam" style={{ "--sd": "-1.4s" }} d="M5 -118 q-4 -6 0 -12 q4 -6 0 -12" />
      <path className="as-fill as-line" pathLength="1" d="M-13 -112 H13 V-102 A13 11 0 0 1 -13 -102 Z" />
      <path className="as-line" pathLength="1" d="M13 -108 A5 5 0 0 1 13 -98" />
      <path className="as-line" pathLength="1" d="M-18 -88 H18 M0 -88 V-78" />
      <rect className="as-fill as-line" pathLength="1" x="-62" y="-78" width="124" height="10" rx="2" />
      <rect className="as-fill as-line" pathLength="1" x="-56" y="-68" width="112" height="68" rx="3" />
      {AWNING.map((d, i) => (
        <path key={d} d={d} className={cn("as-awning", i % 2 === 0 ? "is-warm" : "is-rose")} />
      ))}
      <path className="as-line" pathLength="1" d="M-56 -64 H56 L64 -46 H-64 Z" />
      <rect className="as-win is-lit" x="-46" y="-36" width="50" height="26" rx="3" />
      <rect className="as-line as-glowfill" pathLength="1" x="16" y="-34" width="24" height="34" rx="3" />
    </>
  );
}

function Pine({ x, s = 1, d = "0.2s" }) {
  return (
    <g transform={`translate(${x} ${GROUND}) scale(${s})`} style={{ "--d": d }}>
      <path className="as-line" pathLength="1" d="M0 0 V-10" />
      <path className="as-fill as-tint-mint as-line" pathLength="1" d="M-13 -10 L0 -40 L13 -10 Z" />
      <path className="as-fill as-tint-mint as-line" pathLength="1" d="M-10 -28 L0 -52 L10 -28 Z" />
    </g>
  );
}

function Lamp({ x, glowId, d = "0.4s" }) {
  return (
    <g transform={`translate(${x} ${GROUND})`} style={{ "--d": d }}>
      <g className="as-soft">
        <circle className="as-lamp-glow" cx="0" cy="-46" r="16" fill={`url(#${glowId})`} />
      </g>
      <path className="as-line" pathLength="1" d="M0 0 V-41 M-4 -41 H4" />
      <circle className="as-soft" cx="0" cy="-46" r="3.6" fill="#FFD66B" />
    </g>
  );
}

const STAR_PATH = "M0 -4 L1 -1 L4 0 L1 1 L0 4 L-1 1 L-4 0 L-1 -1 Z";
const STARS = [
  [28, 30, 1, "0s"],
  [14, 112, 0.7, "-1.2s"],
  [150, 26, 0.8, "-2.1s"],
  [186, 54, 0.6, "-0.6s"],
  [298, 40, 1, "-1.7s", "#FBCFE8"],
  [336, 98, 0.6, "-2.8s"],
  [446, 42, 0.9, "-0.9s", "#BAE6FD"],
  [500, 20, 0.7, "-2.4s"],
  [470, 110, 0.55, "-1.5s"],
  [628, 100, 0.7, "-3s"],
];

function Sky({ uid, withCloud = true }) {
  const shootId = `shoot-${uid}`;
  return (
    // .as-par: drifts slightly against the mouse for depth (see AuthShowcase).
    <g aria-hidden="true" className="as-par" style={{ "--depth": "-6px" }}>
      <defs>
        <linearGradient id={shootId} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#fff" stopOpacity="1" />
        </linearGradient>
      </defs>
      {/* Shooting star: crosses the sky every few seconds */}
      <g className="as-shoot">
        <path d="M0 0 L46 16" stroke={`url(#${shootId})`} strokeWidth="1.6" strokeLinecap="round" fill="none" />
        <circle cx="46" cy="16" r="1.6" fill="#fff" />
      </g>
      {withCloud ? (
        <path
          className="as-cloud"
          d="M0 70 h52 a12 12 0 0 0 0 -24 a17 17 0 0 0 -31 -7 a12 12 0 0 0 -21 31 Z"
        />
      ) : null}
      <mask id={`moon-${uid}`}>
        <rect x="570" y="10" width="60" height="60" fill="#fff" />
        <circle cx="611" cy="33" r="12" fill="#000" />
      </mask>
      <circle cx="602" cy="40" r="14" fill="#FFE7A3" mask={`url(#moon-${uid})`} />
      {STARS.map(([x, y, s, sd, tint]) => (
        <path
          key={`${x}-${y}`}
          className="as-star"
          style={{ "--sd": sd, ...(tint ? { fill: tint } : null) }}
          d={STAR_PATH}
          transform={`translate(${x} ${y}) scale(${s})`}
        />
      ))}
    </g>
  );
}

function Skyline({ uid, active = -1, animateClock = true }) {
  const glowId = `lamp-${uid}`;
  const art = [Hostel, Library, ClockTower, Cafe];
  return (
    <>
      <defs>
        <radialGradient id={glowId}>
          <stop offset="0%" stopColor="#FFD66B" stopOpacity="0.75" />
          <stop offset="100%" stopColor="#FFD66B" stopOpacity="0" />
        </radialGradient>
      </defs>
      <line className="as-line as-ground" pathLength="1" x1="0" x2={VIEW_W} y1={GROUND} y2={GROUND} />
      <Pine x={16} s={0.85} d="0.05s" />
      <Pine x={330} s={0.9} d="0.35s" />
      <Pine x={440} s={0.8} d="0.5s" />
      <Pine x={622} s={0.9} d="0.6s" />
      <Lamp x={150} glowId={glowId} d="0.25s" />
      <Lamp x={460} glowId={glowId} d="0.55s" />
      {PLACES.map((p, i) => {
        const Art = art[i];
        return (
          <g
            key={p.x}
            className={cn("as-building", active === i && "is-active")}
            style={{ "--d": p.d }}
            transform={`translate(${p.x} ${GROUND})`}
          >
            <Art animate={animateClock} />
          </g>
        );
      })}
    </>
  );
}

/* ── Mobile hero: the skyline only (no route), drawn once per visit ── */
let skylineIntroPlayed = false;

export function CampusSkyline({ className }) {
  const reduceMotion = useReducedMotion();
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const [drawn, setDrawn] = useState(() => skylineIntroPlayed);

  useEffect(() => {
    if (drawn) return undefined;
    const id = requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        skylineIntroPlayed = true;
        setDrawn(true);
      }),
    );
    return () => cancelAnimationFrame(id);
  }, [drawn]);

  return (
    <svg
      viewBox={`0 0 ${VIEW_W} ${GROUND + 2}`}
      preserveAspectRatio="xMidYMax meet"
      className={cn("as-scene overflow-visible", (drawn || reduceMotion) && "is-drawn", className)}
      aria-hidden="true"
      focusable="false"
    >
      <Sky uid={uid} withCloud={false} />
      <Skyline uid={uid} animateClock={!reduceMotion} />
    </svg>
  );
}

/* ── Overlays ───────────────────────────────────────────────────────── */
function TypingDots() {
  return (
    <span className="as-typing inline-flex items-center gap-1 px-1 py-1" aria-hidden="true">
      <span className="size-1.5 rounded-full bg-slate-400" />
      <span className="size-1.5 rounded-full bg-slate-400" />
      <span className="size-1.5 rounded-full bg-slate-400" />
    </span>
  );
}

function StoryBubble({ step }) {
  const bubble = BUBBLES[step];
  const place = PLACES[step];
  const [typing, setTyping] = useState(Boolean(bubble.typing));

  useEffect(() => {
    if (!bubble.typing) return undefined;
    const id = window.setTimeout(() => setTyping(false), 950);
    return () => window.clearTimeout(id);
  }, [bubble.typing]);

  const anchor = place.align === "start" ? 22 : place.align === "end" ? 78 : 50;
  const Icon = bubble.icon;

  return (
    <div
      className="pointer-events-none absolute z-20"
      style={{
        left: pct(place.x, VIEW_W),
        top: pct(place.top, VIEW_H),
        transform: `translate(-${anchor}%, calc(-100% - 10px))`,
      }}
    >
      <div
        className="as-bubble relative flex items-center gap-1.5 whitespace-nowrap rounded-xl bg-white py-1 pl-1 pr-2.5 text-[11.5px] font-semibold text-slate-800 shadow-[0_12px_26px_-10px_rgba(8,8,60,0.6)] xl:text-[12px]"
        style={{ "--tail": `${anchor}%` }}
      >
        <span className={cn("grid size-5 shrink-0 place-items-center rounded-full", bubble.tone)}>
          <Icon className="size-3" strokeWidth={2.5} />
        </span>
        {typing ? <TypingDots /> : <span>{bubble.text}</span>}
        <span
          className="absolute -bottom-1 size-2.5 rotate-45 rounded-[2px] bg-white"
          style={{ left: `${anchor}%`, marginLeft: -5 }}
        />
      </div>
    </div>
  );
}

/* ── The full animated scene ───────────────────────────────────────── */
export default function CampusNightScene({ className }) {
  const reduceMotion = useReducedMotion();
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");

  const rootRef = useRef(null);
  const segRefs = useRef([]);
  const walkRefs = useRef([]);
  const tokenRef = useRef(null);
  const barRefs = useRef([]);
  const lens = useRef([0, 0, 0]);
  const lastView = useRef(null);

  const [intro] = useState(() => !engine.introPlayed);
  const [drawn, setDrawn] = useState(() => !intro);
  const [visible, setVisible] = useState(false);
  const [view, setView] = useState(() => ({
    step: reduceMotion ? REST_STEP : phaseAt(currentT()).step,
    moving: false,
    idle: !reduceMotion,
  }));

  // Paint one moment of the story straight to the DOM.
  const paint = useCallback((t, { still = false } = {}) => {
    const ph = phaseAt(t);
    const resting = !still && t > CYCLE - FADE;
    // t sits at 0 during the first-visit draw-in, so this also covers it.
    const starting = !still && t < 140;
    const idle = resting || starting;

    let x;
    let y;
    if (ph.moving) {
      const pt = segRefs.current[ph.seg]?.getPointAtLength(lens.current[ph.seg] * ph.f);
      x = pt?.x ?? STOPS[ph.step][0];
      y = pt?.y ?? STOPS[ph.step][1];
    } else {
      [x, y] = STOPS[ph.step];
    }

    const token = tokenRef.current;
    if (token) {
      token.style.left = pct(x, VIEW_W);
      token.style.top = pct(y, VIEW_H);
      token.style.opacity = idle ? "0" : "1";
      token.classList.toggle("is-moving", ph.moving);
    }

    walkRefs.current.forEach((p, i) => {
      if (!p) return;
      const done = resting ? 0 : i < ph.seg ? 1 : i === ph.seg ? ph.f : 0;
      p.style.strokeDashoffset = `${lens.current[i] * (1 - done)}`;
    });

    barRefs.current.forEach((bar, i) => {
      if (!bar) return;
      const fill = still
        ? i <= ph.step
          ? 1
          : 0
        : resting
          ? 1
          : clamp01((t - STEP_START[i]) / STEP_DUR[i]);
      bar.style.transform = `scaleX(${fill})`;
    });

    const prev = lastView.current;
    if (!prev || prev.step !== ph.step || prev.moving !== ph.moving || prev.idle !== idle) {
      const next = { step: ph.step, moving: ph.moving, idle };
      lastView.current = next;
      setView(next);
    }
  }, []);

  // Measure the route and paint the first frame before the browser paints.
  useLayoutEffect(() => {
    lens.current = segRefs.current.map((p) => (p ? p.getTotalLength() : 0));
    walkRefs.current.forEach((p, i) => {
      if (!p) return;
      p.style.strokeDasharray = `${lens.current[i]}`;
      p.style.strokeDashoffset = `${lens.current[i]}`;
    });
    if (reduceMotion) {
      paint(arriveAt(lastView.current?.step ?? REST_STEP), { still: true });
    } else {
      if (engine.origin == null) engine.origin = clockNow() + (intro ? INTRO_MS : 0);
      paint(currentT());
    }
  }, [reduceMotion, paint, intro]);

  // First visit: let the undrawn frame paint, then draw everything in.
  useEffect(() => {
    if (drawn) return undefined;
    let inner = 0;
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => {
        engine.introPlayed = true;
        setDrawn(true);
      });
    });
    return () => {
      cancelAnimationFrame(outer);
      cancelAnimationFrame(inner);
    };
  }, [drawn]);

  // Animate only while on screen.
  useEffect(() => {
    const el = rootRef.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return undefined;
    }
    const io = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), {
      threshold: 0.05,
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!visible || reduceMotion) return undefined;
    let raf = 0;
    const frame = () => {
      paint(currentT());
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [visible, reduceMotion, paint]);

  const jumpTo = (k) => {
    if (reduceMotion) {
      paint(arriveAt(k), { still: true });
      return;
    }
    engine.origin = clockNow() - arriveAt(k);
    paint(currentT());
  };

  const { step, moving, idle } = view;
  const holding = !moving && !idle;
  const caption = STEPS[step];
  const accent = STEP_ACCENT[step];

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      {/* Scene */}
      <div className="relative pt-10">
        <div className="relative w-full" style={{ aspectRatio: `${VIEW_W} / ${VIEW_H}` }}>
          <svg
            viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
            className={cn("as-scene absolute inset-0 h-full w-full overflow-visible", drawn && "is-drawn")}
            aria-hidden="true"
            focusable="false"
          >
            <Sky uid={uid} />
            <Skyline uid={uid} active={holding ? step : -1} animateClock={!reduceMotion} />

            {/* Doors → route */}
            {PLACES.map((p, i) => (
              <path
                key={p.x}
                className="as-stub"
                d={`M${p.x} ${GROUND + 2} L${STOPS[i][0]} ${STOPS[i][1] - STOP_R - 2}`}
              />
            ))}

            <path className="as-rail is-faint" d={LEAD_IN} />
            <path className="as-rail is-faint" d={LEAD_OUT} />
            {SEGS.map((d, i) => (
              <g key={d}>
                <path ref={(el) => (segRefs.current[i] = el)} d={d} className="as-rail" />
                <path ref={(el) => (walkRefs.current[i] = el)} d={d} className="as-walked" />
              </g>
            ))}

            {STOPS.map(([x, y], i) => {
              const reached = !idle && (i < step || (i === step && !moving));
              return (
                <g key={x}>
                  {holding && i === step && !reduceMotion ? (
                    <circle cx={x} cy={y} r={STOP_R} className="as-pulse" />
                  ) : null}
                  <circle cx={x} cy={y} r={STOP_R} className={cn("as-stop", reached && "is-on")} />
                  <circle cx={x} cy={y} r={3.2} className={cn("as-stop-core", reached && "is-on")} style={{ fill: STEP_ACCENT[i].core }} />
                </g>
              );
            })}
          </svg>

          {/* Travelling bag */}
          <div
            ref={tokenRef}
            className="as-token pointer-events-none absolute z-10"
            style={{ left: 0, top: 0, opacity: 0 }}
            aria-hidden="true"
          >
            <span
              className={cn(
                "as-token-chip relative grid size-8 place-items-center rounded-full shadow-[0_8px_20px_-6px_rgba(8,8,60,0.6)] ring-[3px] ring-white/25 transition-colors duration-300 xl:size-9",
                step === 3 && holding ? "bg-emerald-500 text-white" : "bg-white",
              )}
              style={step === 3 && holding ? undefined : { color: STEP_ACCENT[step].core }}
            >
              {step === 3 && holding ? (
                <Check className="size-4" strokeWidth={3} />
              ) : (
                <ShoppingBag className="size-[15px]" strokeWidth={2.3} />
              )}
            </span>
          </div>

          {holding && drawn ? <StoryBubble key={step} step={step} /> : null}
        </div>
      </div>

      {/* Caption + step controls */}
      <div className="mt-4 border-t border-white/10 pt-4">
        <div key={step} className="as-caption flex items-start gap-3.5">
          <span className={cn("grid size-9 shrink-0 place-items-center rounded-[10px] font-figtree text-[12px] font-semibold tabular-nums ring-1 ring-inset", accent.badge)}>
            0{step + 1}
          </span>
          <div className="min-w-0">
            <p className={cn("text-[10.5px] font-semibold uppercase tracking-[0.16em]", accent.eyebrow)}>
              Step {step + 1} · {caption.place}
            </p>
            <h3 className="mt-0.5 text-[15px] font-semibold leading-snug text-white xl:text-[15.5px]">
              {caption.title}
            </h3>
            <p className="mt-0.5 min-h-[2.9em] text-[12.5px] leading-relaxed text-white/70 xl:text-[13px]">
              {caption.body}
            </p>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-4 gap-2" role="group" aria-label="How a deal works">
          {STEPS.map((s, i) => (
            <button
              key={s.title}
              type="button"
              onClick={() => jumpTo(i)}
              aria-label={`Step ${i + 1} of 4: ${s.title}`}
              aria-current={i === step ? "step" : undefined}
              className="group flex h-5 items-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
            >
              <span className="block h-1 w-full overflow-hidden rounded-full bg-white/20 transition-[height] duration-200 group-hover:h-1.5">
                <span
                  ref={(el) => (barRefs.current[i] = el)}
                  className="block h-full w-full origin-left rounded-full"
                  style={{ transform: "scaleX(0)", backgroundColor: STEP_ACCENT[i].bar }}
                />
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
