import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Bike } from "lucide-react";
import { Academic, Canteen, Hostel, Tree } from "../../../../components/campus/CampusArt.jsx";
import { ART_HEIGHT, easeInOutCubic } from "../../../../components/campus/campusTimeline.js";

/*
 * "From one hostel room to another": the home page's closing section.
 *
 * One continuous story of what Unideals does: an item is listed from
 * Hostel A, the buyer chats between classes near the Academic Block, they
 * meet at the Canteen and pay at pickup, and it ends up in Hostel B.
 *
 * Layout: heading, then one full-width card holding the line-art scene on
 * a soft dotted grid. The drawing is decorative (aria-hidden); the heading
 * and copy carry the meaning.
 *
 * Production notes
 * - Wide layout from md, a two-row "snake" layout on phones (one screen tall).
 * - The rAF loop runs only while the section is on screen and resumes where
 *   it left off; background tabs pause it automatically.
 * - Reduced motion: no loop, scene fully drawn, item parked at the Canteen.
 * - Art lives in components/campus/CampusArt.jsx; styles are the shared
 *   `.cj-*` rules in styles/index.css.
 */

const BUILDINGS = ["hostel", "academic", "canteen", "hostel"];
const NAMES = ["Hostel A", "Academic Block", "Canteen", "Hostel B"];
const ART = { hostel: Hostel, academic: Academic, canteen: Canteen };

const LAYOUTS = {
  wide: {
    w: 1200,
    h: 330,
    grounds: [230],
    stopR: 11,
    b: [
      [150, 230, 1],
      [480, 230, 1],
      [800, 230, 1],
      [1060, 230, 1],
    ],
    stops: [
      [150, 278],
      [480, 278],
      [800, 278],
      [1060, 278],
    ],
    segs: [
      "M150 278 C 260 318, 370 318, 480 278",
      "M480 278 C 590 238, 690 238, 800 278",
      "M800 278 C 890 318, 970 318, 1060 278",
    ],
    trees: [[316, 230, 1], [640, 230, 0.9], [935, 230, 0.8], [26, 230, 0.8], [1176, 230, 0.9]],
  },
  // Phones: the same street folded into two rows: Hostel A → Academic Block
  // on top, down to the Canteen, back left to Hostel B.
  compact: {
    w: 600,
    h: 548,
    grounds: [230, 468],
    stopR: 15,
    b: [
      [150, 230, 0.6],
      [420, 230, 0.55],
      [430, 468, 0.62],
      [150, 468, 0.6],
    ],
    stops: [
      [150, 262],
      [420, 262],
      [430, 500],
      [150, 500],
    ],
    segs: [
      "M150 262 C 240 290, 330 290, 420 262",
      "M420 262 C 575 300, 575 466, 430 500",
      "M430 500 C 340 530, 240 530, 150 500",
    ],
    trees: [[36, 230, 0.6], [272, 230, 0.5], [562, 230, 0.55], [36, 468, 0.6], [282, 468, 0.55], [548, 468, 0.5]],
  },
};

/* ── Timeline ────────────────────────────────────────────────────────────
   hold(0) · move→1 · hold(1) · move→2 · hold(2) · move→3 · hold(3, longer)
   Step k "owns" its move-in plus its hold, so the tracker fills smoothly. */
const HOLD = 1900;
const MOVE = 1500;
const END_HOLD = 2400;
const FADE = 500;
const DRAW_IN = 900;
const STEP_START = [0, HOLD, HOLD * 2 + MOVE, HOLD * 3 + MOVE * 2];
const STEP_DUR = [HOLD, MOVE + HOLD, MOVE + HOLD, MOVE + END_HOLD];
const CYCLE = STEP_START[3] + STEP_DUR[3];

const phaseAt = (t) => {
  const k = t >= STEP_START[3] ? 3 : t >= STEP_START[2] ? 2 : t >= STEP_START[1] ? 1 : 0;
  const local = t - STEP_START[k];
  if (k > 0 && local < MOVE) return { step: k, moving: true, seg: k - 1, f: easeInOutCubic(local / MOVE) };
  return { step: k, moving: false, seg: k - 1, f: 1 };
};
// Time at which the item has just arrived at stop k.
const arriveAt = (k) => STEP_START[k] + (k > 0 ? MOVE : 0);

const pct = (v, total) => `${(v / total) * 100}%`;

function Scene({ L, stage, reduceMotion, segRefs, walkRefs, tokenRef, activeStep }) {
  return (
    <div className="relative w-full" style={{ aspectRatio: `${L.w} / ${L.h}` }}>
      <svg viewBox={`0 0 ${L.w} ${L.h}`} className="absolute inset-0 h-full w-full overflow-visible" aria-hidden="true">
        {L.grounds.map((g) => (
          <line key={g} className="cj-line cj-ground" pathLength="1" x1="0" x2={L.w} y1={g} y2={g} />
        ))}
        {L.trees.map(([x, y, s]) => (
          <Tree key={`${x}-${y}`} x={x} y={y} s={s} />
        ))}
        {BUILDINGS.map((kind, i) => {
          const Art = ART[kind];
          const [x, y, s] = L.b[i];
          const [sx, sy] = L.stops[i];
          return (
            <g key={i} className={`cj-building${stage === i ? " is-active" : ""}`}>
              <path className="cj-stub" d={`M${x} ${y} L${sx} ${sy - L.stopR}`} />
              <g transform={`translate(${x} ${y}) scale(${s})`}>
                <Art />
              </g>
            </g>
          );
        })}

        {L.segs.map((d, i) => (
          <g key={d}>
            <path ref={(el) => (segRefs.current[i] = el)} d={d} className="cj-rail" />
            <path ref={(el) => (walkRefs.current[i] = el)} d={d} className="cj-walked" />
          </g>
        ))}

        {L.stops.map(([x, y], i) => {
          const reached = i <= activeStep && (stage >= i || i < activeStep || reduceMotion);
          return (
            <g key={i}>
              {stage === i && !reduceMotion && <circle cx={x} cy={y} r={L.stopR} className="cj-pulse" />}
              <circle cx={x} cy={y} r={L.stopR} className={`cj-stop${reached ? " is-on" : ""}`} />
              <text
                x={x}
                y={y}
                dy="0.35em"
                textAnchor="middle"
                className={`cj-stop-num${reached ? " is-on" : ""}`}
                style={{ fontSize: L.stopR * 1.05 }}
              >
                {i + 1}
              </text>
            </g>
          );
        })}
      </svg>

      {BUILDINGS.map((kind, i) => {
        const [x, y, s] = L.b[i];
        return (
          <span
            key={NAMES[i]}
            aria-hidden="true"
            className={`cj-name absolute -translate-x-1/2 whitespace-nowrap text-[11.5px] font-medium sm:text-[13px] ${stage === i ? "is-active" : ""}`}
            style={{ left: pct(x, L.w), top: `calc(${pct(y - ART_HEIGHT[kind] * s, L.h)} - 24px)` }}
          >
            {NAMES[i]}
          </span>
        );
      })}

      {/* Travelling item */}
      <div ref={tokenRef} className="absolute z-10 -translate-x-1/2 -translate-y-1/2 transition-opacity duration-300" style={{ left: 0, top: 0 }} aria-hidden="true">
        <span className="relative grid h-9 w-9 place-items-center rounded-xl border border-[var(--accent)] bg-white text-[var(--accent)] shadow-[0_10px_24px_-8px_var(--accent-ring)] sm:h-10 sm:w-10 dark:bg-[#1f2226]">
          <Bike className="h-[18px] w-[18px] sm:h-5 sm:w-5" strokeWidth={2} />
          {stage === 3 && (
            <span className="absolute -right-1.5 -top-1.5 grid h-4 w-4 place-items-center rounded-full bg-emerald-500 text-white ring-2 ring-white dark:ring-[#17191c]">
              <svg viewBox="0 0 12 12" className="h-2.5 w-2.5" aria-hidden="true">
                <path d="M2.5 6.2 5 8.5 9.5 3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          )}
        </span>
      </div>
    </div>
  );
}

const WIDE_QUERY = "(min-width: 768px)";
const useIsWide = () => {
  const get = () => typeof window !== "undefined" && Boolean(window.matchMedia?.(WIDE_QUERY).matches);
  const [wide, setWide] = useState(get);
  useEffect(() => {
    const mq = window.matchMedia?.(WIDE_QUERY);
    if (!mq) return undefined;
    const on = () => setWide(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return wide;
};

const REST_STEP = 2; // reduced motion: start parked at the Canteen

export default function CampusJourney({ reduceMotion }) {
  const rootRef = useRef(null);
  const wide = useIsWide();
  const L = LAYOUTS[wide ? "wide" : "compact"];

  const segRefs = useRef([]);
  const walkRefs = useRef([]);
  const tokenRef = useRef(null);
  const lens = useRef([0, 0, 0]);
  const clock = useRef({ t: 0, start: 0 }); // t = position in the cycle (ms)

  const [drawn, setDrawn] = useState(false);
  const [visible, setVisible] = useState(false);
  const [stage, setStage] = useState(reduceMotion ? REST_STEP : -1); // stop being held, -1 while moving
  const [active, setActive] = useState(reduceMotion ? REST_STEP : 0); // current step (stop markers)

  // Paint one moment of the journey straight to the DOM (no React render).
  const paint = useCallback(
    (t, { fade = true } = {}) => {
      const ph = phaseAt(t);
      let x;
      let y;
      if (ph.moving) {
        const pt = segRefs.current[ph.seg]?.getPointAtLength(lens.current[ph.seg] * ph.f);
        x = pt?.x ?? 0;
        y = pt?.y ?? 0;
      } else {
        [x, y] = L.stops[ph.step];
      }
      const resting = fade && t > CYCLE - FADE;
      const token = tokenRef.current;
      if (token) {
        token.style.left = pct(x, L.w);
        token.style.top = pct(y, L.h);
        token.style.opacity = resting || (fade && t < 120) ? "0" : "1";
      }
      walkRefs.current.forEach((p, i) => {
        if (!p) return;
        const done = resting ? 0 : i < ph.seg ? 1 : i === ph.seg ? ph.f : 0;
        p.style.strokeDashoffset = `${lens.current[i] * (1 - done)}`;
      });
      setStage(ph.moving || resting ? -1 : ph.step);
      setActive(ph.step);
    },
    [L],
  );

  // Measure route segments for this layout and paint the first frame.
  useLayoutEffect(() => {
    lens.current = segRefs.current.map((p) => (p ? p.getTotalLength() : 0));
    walkRefs.current.forEach((p, i) => {
      if (!p) return;
      p.style.strokeDasharray = `${lens.current[i]}`;
      p.style.strokeDashoffset = `${lens.current[i]}`;
    });
    if (reduceMotion) paint(arriveAt(REST_STEP), { fade: false });
    else paint(clock.current.t);
  }, [L, reduceMotion, paint]);

  // Visibility: draw in once, and only animate while on screen.
  useEffect(() => {
    const el = rootRef.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setDrawn(true);
      setVisible(true);
      return undefined;
    }
    const io = new IntersectionObserver(
      ([e]) => {
        setVisible(e.isIntersecting);
        if (e.isIntersecting) setDrawn(true);
      },
      { threshold: 0.2 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!visible || reduceMotion) return undefined;
    let raf = 0;
    // Resume from where we paused (first run waits for the draw-in).
    const firstRun = clock.current.t === 0;
    clock.current.start = performance.now() - clock.current.t + (firstRun ? DRAW_IN : 0);
    const frame = (now) => {
      const elapsed = now - clock.current.start;
      if (elapsed >= 0) {
        const t = elapsed % CYCLE;
        clock.current.t = t || 1;
        paint(t);
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [visible, reduceMotion, paint]);

  return (
    <section
      ref={rootRef}
      aria-labelledby="campus-journey-title"
      className={`cj-root relative py-6 sm:py-10 ${drawn || reduceMotion ? "is-drawn" : ""}`}
    >
      <div className="mx-auto max-w-xl text-center">
        <h2 id="campus-journey-title" className="font-figtree text-[24px] font-semibold tracking-[-0.02em] text-slate-900 sm:text-[32px] dark:text-white">
          From one hostel room to another
        </h2>
        <p className="mt-3 text-[14.5px] leading-relaxed text-slate-500 sm:text-[16px] dark:text-zinc-400">
          List it from your room, chat between classes, meet at the canteen. Your old stuff finds a new owner without ever leaving campus.
        </p>
      </div>

      <div className="relative mt-8 w-full overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_24px_48px_-28px_rgba(15,23,42,0.18)] sm:mt-10 dark:border-white/10 dark:bg-[#17191c] dark:shadow-none">
        {/* Backdrop: dotted grid fading out from the centre + a soft accent glow */}
        <div aria-hidden="true" className="cj-grid pointer-events-none absolute inset-0" />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3"
          style={{ background: "radial-gradient(60% 70% at 50% 100%, var(--accent-soft) 0%, transparent 70%)" }}
        />

        <div className={`relative ${wide ? "px-6 pb-10 pt-12 lg:px-12" : "px-3 pb-6 pt-10"}`}>
          <div className={wide ? "mx-auto max-w-[1200px]" : "mx-auto max-w-[400px]"}>
            <Scene
              key={wide ? "wide" : "compact"}
              L={L}
              stage={stage}
              activeStep={active}
              reduceMotion={reduceMotion}
              segRefs={segRefs}
              walkRefs={walkRefs}
              tokenRef={tokenRef}
            />
          </div>
        </div>

      </div>
    </section>
  );
}
