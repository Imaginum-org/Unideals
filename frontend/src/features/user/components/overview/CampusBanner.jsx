import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Bike } from "lucide-react";
import { Academic, Canteen, Hostel, Tree } from "../../../../components/campus/CampusArt.jsx";
import { ART_HEIGHT, makeTimeline } from "../../../../components/campus/campusTimeline.js";

/*
 * Profile Overview header banner: a panoramic, line-art campus skyline
 * (Hostel A → Academic Block → Canteen → Hostel B) with a small item riding
 * the route between them, the same story as the home page's
 * "From one hostel room to another" section, in a short strip.
 *
 * Production notes
 * - One SVG, viewBox 1200×190, `xMaxYMax slice`: always fills the banner,
 *   anchored bottom-right, so phones keep the right of the scene (Canteen,
 *   Hostel B) and the left (under the avatar) is what gets cropped.
 * - Buildings come from components/campus/CampusArt.jsx; styles are the
 *   shared `.cj-*` rules in styles/index.css plus `.cj-banner` tweaks.
 * - The rAF loop only runs while the banner is on screen; the browser pauses
 *   it in background tabs. Reduced motion: drawn once, item parked at the
 *   Canteen, no loop.
 * - Purely decorative: aria-hidden, no pointer events.
 */

const W = 1200;
const H = 190;
const GROUND = 150;
const ROUTE_Y = 172;
const SCALE = 0.54;

const BUILDINGS = [
  // Shifted right: the left ~260 units sit under the avatar at most widths.
  { kind: "hostel", x: 330, name: "Hostel A" },
  { kind: "academic", x: 590, name: "Academic Block" },
  { kind: "canteen", x: 850, name: "Canteen" },
  { kind: "hostel", x: 1090, name: "Hostel B" },
];
const ART = { hostel: Hostel, academic: Academic, canteen: Canteen };
const TREES = [
  [62, 0.5],
  [192, 0.55],
  [460, 0.5],
  [722, 0.5],
  [970, 0.46],
  [1168, 0.5],
];
const SEGS = [
  "M330 172 C 417 188, 503 188, 590 172",
  "M590 172 C 677 156, 763 156, 850 172",
  "M850 172 C 930 188, 1010 188, 1090 172",
];
const PARK = 2; // reduced motion: rest at the Canteen

const { cycle: CYCLE, phaseAt } = makeTimeline({ hold: 1500, move: 2200, endHold: 2000 });
const DRAW_IN = 1100; // let the buildings draw before the item sets off
const FADE = 500;

const usePrefersReducedMotion = () => {
  const query = "(prefers-reduced-motion: reduce)";
  const [reduce, setReduce] = useState(() => typeof window !== "undefined" && Boolean(window.matchMedia?.(query).matches));
  useEffect(() => {
    const mq = window.matchMedia?.(query);
    if (!mq) return undefined;
    const on = () => setReduce(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return reduce;
};

export default function CampusBanner() {
  const reduceMotion = usePrefersReducedMotion();
  const rootRef = useRef(null);
  const segRefs = useRef([]);
  const walkRefs = useRef([]);
  const tokenRef = useRef(null);
  const lens = useRef([0, 0, 0]);
  const [drawn, setDrawn] = useState(false);
  const [inView, setInView] = useState(false);
  const [stage, setStage] = useState(reduceMotion ? PARK : -1);

  // Measure the route once and park the walked overlay + item.
  useLayoutEffect(() => {
    lens.current = segRefs.current.map((p) => (p ? p.getTotalLength() : 0));
    walkRefs.current.forEach((p, i) => {
      if (!p) return;
      const len = lens.current[i];
      p.style.strokeDasharray = `${len}`;
      p.style.strokeDashoffset = reduceMotion && i < PARK ? "0" : `${len}`;
    });
    const stop = BUILDINGS[reduceMotion ? PARK : 0];
    tokenRef.current?.setAttribute("transform", `translate(${stop.x} ${ROUTE_Y})`);
    if (tokenRef.current) tokenRef.current.style.opacity = reduceMotion ? "1" : "0";
    setStage(reduceMotion ? PARK : -1);
  }, [reduceMotion]);

  // Draw-in on the next frame so the CSS transitions actually run.
  useEffect(() => {
    const id = requestAnimationFrame(() => setDrawn(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // Only animate while visible.
  useEffect(() => {
    const el = rootRef.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setInView(true);
      return undefined;
    }
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.1 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!inView || reduceMotion) return undefined;
    let raf = 0;
    let start = 0;
    let last = -2;
    const frame = (now) => {
      if (!start) start = now;
      const elapsed = now - start - DRAW_IN;
      if (elapsed >= 0) {
        const t = elapsed % CYCLE;
        const ph = phaseAt(t);
        let x;
        let y;
        if (ph.stop !== null) {
          x = BUILDINGS[ph.stop].x;
          y = ROUTE_Y;
        } else {
          const pt = segRefs.current[ph.seg].getPointAtLength(lens.current[ph.seg] * ph.f);
          x = pt.x;
          y = pt.y;
        }
        // Fade out at the very end (and in at the start) so the loop
        // restarting at Hostel A never reads as a jump.
        const resting = t > CYCLE - FADE;
        const token = tokenRef.current;
        if (token) {
          token.setAttribute("transform", `translate(${x.toFixed(2)} ${y.toFixed(2)})`);
          token.style.opacity = resting || t < 150 ? "0" : "1";
        }
        walkRefs.current.forEach((p, i) => {
          if (!p) return;
          const done = i < ph.seg || (i === ph.seg && ph.stop !== null) ? 1 : i === ph.seg ? ph.f : 0;
          p.style.strokeDashoffset = `${lens.current[i] * (1 - (resting ? 0 : done))}`;
        });
        const s = ph.stop === null || resting ? -1 : ph.stop;
        if (s !== last) {
          last = s;
          setStage(s);
        }
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [inView, reduceMotion]);

  return (
    <div
      ref={rootRef}
      aria-hidden="true"
      className={`cj-root cj-banner pointer-events-none relative h-28 select-none overflow-hidden bg-[#F6F7FB] sm:h-36 dark:bg-[#16181B] ${
        drawn || reduceMotion ? "is-drawn" : ""
      }`}
    >
      {/* Soft depth: a faint accent wash rising from the route. */}
      <span
        className="absolute inset-0"
        style={{ background: "radial-gradient(70% 90% at 72% 115%, var(--accent-soft) 0%, transparent 70%)" }}
      />
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMaxYMax slice" className="absolute inset-0 h-full w-full">
        <line className="cj-line cj-ground" pathLength="1" x1="0" x2={W} y1={GROUND} y2={GROUND} />

        {TREES.map(([x, s]) => (
          <Tree key={x} x={x} y={GROUND} s={s} />
        ))}

        {BUILDINGS.map((b, i) => {
          const Art = ART[b.kind];
          return (
            <g key={b.name} className={`cj-building${stage === i ? " is-active" : ""}`}>
              <path className="cj-stub" d={`M${b.x} ${GROUND} L${b.x} ${ROUTE_Y}`} />
              <g transform={`translate(${b.x} ${GROUND}) scale(${SCALE})`}>
                <Art />
              </g>
              <text
                className={`cj-label${stage === i ? " is-active" : ""}`}
                x={b.x}
                y={GROUND - ART_HEIGHT[b.kind] * SCALE - 9}
                textAnchor="middle"
              >
                {b.name}
              </text>
            </g>
          );
        })}

        {SEGS.map((d, i) => (
          <g key={d}>
            <path ref={(el) => (segRefs.current[i] = el)} d={d} className="cj-rail" />
            <path ref={(el) => (walkRefs.current[i] = el)} d={d} className="cj-walked" />
          </g>
        ))}
        {BUILDINGS.map((b, i) => (
          <circle key={b.name} cx={b.x} cy={ROUTE_Y} r="4.5" className={`cj-stop${stage >= i ? " is-on" : ""}`} />
        ))}

        {/* The item on its way between rooms */}
        <g ref={tokenRef} className="cj-token">
          <rect x="-15" y="-15" width="30" height="30" rx="9" className="cj-token-chip" />
          <Bike x={-9.5} y={-9.5} width={19} height={19} strokeWidth={2} className="cj-token-icon" />
          {stage === 3 && (
            <g transform="translate(13 -13)">
              <circle r="7" className="fill-emerald-500" stroke="var(--cj-fill)" strokeWidth="2" />
              <path d="M-3 0.2 -0.8 2.4 3.2 -2" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </g>
          )}
        </g>
      </svg>
    </div>
  );
}
