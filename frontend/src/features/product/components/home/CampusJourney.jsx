import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { BadgeCheck, Bike, Handshake, MessageCircle, Tag } from "lucide-react";

/*
 * "From one hostel room to another": the home page's closing section.
 *
 * What Unideals actually does, as one continuous story: an item is listed
 * from Hostel A, the buyer chats between classes near the Academic Block,
 * they meet at the Canteen and pay at pickup, and it ends up in Hostel B.
 * Nothing is shipped and nobody leaves campus.
 *
 * Line-art buildings draw themselves in when the section scrolls into view,
 * then an item travels the route, pausing at each stop while a short caption
 * explains that step. The walked part of the route fills in as it goes.
 * Sits directly on the page background (no card). Two layouts: wide (md+)
 * and a vertical one for phones. Reduced motion → static, fully drawn scene.
 */

const STEPS = [
  { icon: Tag, title: "Listed from Hostel A", body: "Old cycle, ₹2,400. Took two minutes." },
  { icon: MessageCircle, title: "Chat between classes", body: "“Still available?” “Yes! Canteen at 5?”" },
  { icon: Handshake, title: "Meet at the Canteen", body: "Check it out, then pay by UPI or cash." },
  { icon: BadgeCheck, title: "New home in Hostel B", body: "No shipping, no fees, same campus." },
];

// Building order along the route matches STEPS.
const BUILDINGS = ["hostel", "academic", "canteen", "hostel"];
const NAMES = ["Hostel A", "Academic Block", "Canteen", "Hostel B"];
const HEIGHT = { hostel: 180, academic: 190, canteen: 104 };

const LAYOUTS = {
  wide: {
    w: 1200,
    h: 470,
    ground: 300,
    // building base-centres (x, groundY) and scale
    b: [
      [150, 300, 1],
      [480, 300, 1],
      [800, 300, 1],
      [1060, 300, 1],
    ],
    // stops on the route (directly below each door)
    stops: [
      [150, 344],
      [480, 344],
      [800, 344],
      [1060, 344],
    ],
    segs: [
      "M150 344 C 260 384, 370 384, 480 344",
      "M480 344 C 590 304, 690 304, 800 344",
      "M800 344 C 890 384, 970 384, 1060 344",
    ],
    trees: [[316, 300, 1], [640, 300, 0.9], [935, 300, 0.8], [26, 300, 0.8], [1176, 300, 0.9]],
  },
  tall: {
    w: 360,
    h: 1000,
    ground: null,
    b: [
      [96, 196, 0.55],
      [262, 420, 0.42],
      [92, 640, 0.66],
      [264, 862, 0.55],
    ],
    stops: [
      [180, 196],
      [180, 420],
      [180, 640],
      [180, 862],
    ],
    segs: [
      "M180 196 C 214 276, 146 340, 180 420",
      "M180 420 C 214 500, 146 560, 180 640",
      "M180 640 C 214 720, 146 782, 180 862",
    ],
    trees: [[300, 196, 0.6], [62, 420, 0.6], [292, 640, 0.6], [70, 862, 0.6]],
  },
};

/* ── Line-art buildings, drawn around a base-centre origin ───────────── */

function Hostel() {
  return (
    <>
      <rect className="cj-fill cj-line" pathLength="1" x="-70" y="-170" width="140" height="170" rx="6" />
      <rect className="cj-fill cj-line" pathLength="1" x="-78" y="-180" width="156" height="12" rx="3" />
      {[0, 1, 2, 3, 4].map((r) =>
        [0, 1, 2].map((c) => (
          <rect key={`${r}${c}`} className="cj-window" x={-50 + c * 36} y={-156 + r * 26} width="28" height="14" rx="2.5" />
        )),
      )}
      <rect className="cj-line cj-door" pathLength="1" x="-13" y="-30" width="26" height="30" rx="3" />
    </>
  );
}

function Academic() {
  return (
    <>
      <rect className="cj-fill cj-line" pathLength="1" x="-32" y="-190" width="64" height="56" rx="4" />
      <circle className="cj-line" pathLength="1" cx="0" cy="-163" r="13" />
      <path className="cj-line" pathLength="1" d="M0 -171 V-163 L6 -159" />
      <path className="cj-fill cj-line" pathLength="1" d="M-140 -136 H140 L128 -150 H-128 Z" />
      <rect className="cj-fill cj-line" pathLength="1" x="-128" y="-136" width="256" height="124" rx="3" />
      {[-104, -66, -28, 16, 54, 92].map((x) => (
        <rect key={x} className="cj-window" x={x} y="-120" width="12" height="96" rx="3" />
      ))}
      <rect className="cj-fill cj-line" pathLength="1" x="-140" y="-12" width="280" height="12" rx="2" />
    </>
  );
}

function Canteen() {
  return (
    <>
      <rect className="cj-fill cj-line" pathLength="1" x="-44" y="-104" width="88" height="22" rx="5" />
      <rect className="cj-fill cj-line" pathLength="1" x="-70" y="-72" width="140" height="72" rx="4" />
      <path
        className="cj-line"
        pathLength="1"
        d="M-78 -82 H78 V-72 a9.75 9.75 0 0 1 -19.5 0 a9.75 9.75 0 0 1 -19.5 0 a9.75 9.75 0 0 1 -19.5 0 a9.75 9.75 0 0 1 -19.5 0 a9.75 9.75 0 0 1 -19.5 0 a9.75 9.75 0 0 1 -19.5 0 a9.75 9.75 0 0 1 -19.5 0 a9.75 9.75 0 0 1 -19.5 0 Z"
      />
      <rect className="cj-window" x="-54" y="-50" width="44" height="30" rx="3" />
      <rect className="cj-line cj-door" pathLength="1" x="14" y="-50" width="32" height="50" rx="3" />
    </>
  );
}

const ART = { hostel: Hostel, academic: Academic, canteen: Canteen };

function Tree({ x, y, s }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path className="cj-line" pathLength="1" d="M0 0 V-26" />
      <circle className="cj-tree cj-line" pathLength="1" cx="0" cy="-44" r="20" />
    </g>
  );
}

/* ── Timeline: hold at each stop, travel between them, loop ──────────── */
const HOLD = 1700;
const MOVE = 1500;
const END_HOLD = 2200;
const CYCLE = HOLD * 3 + MOVE * 3 + END_HOLD;
const FADE = 550;
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/* phase at time t → { stop (when holding), seg + f (when moving) } */
const phaseAt = (t) => {
  let acc = 0;
  for (let i = 0; i < 4; i += 1) {
    const hold = i === 3 ? END_HOLD : HOLD;
    if (t < acc + hold) return { stop: i, seg: i - 1, f: 1 };
    acc += hold;
    if (i < 3) {
      if (t < acc + MOVE) return { stop: null, seg: i, f: ease((t - acc) / MOVE) };
      acc += MOVE;
    }
  }
  return { stop: 3, seg: 2, f: 1 };
};

function Scene({ layout, active, reduceMotion }) {
  const L = LAYOUTS[layout];
  const segRefs = useRef([]);
  const progRefs = useRef([]);
  const tokenRef = useRef(null);
  const [stage, setStage] = useState(reduceMotion ? 2 : 0);

  // Measure segment lengths once.
  const lens = useRef([0, 0, 0]);
  useLayoutEffect(() => {
    lens.current = segRefs.current.map((p) => (p ? p.getTotalLength() : 0));
    progRefs.current.forEach((p, i) => {
      if (!p) return;
      const len = lens.current[i];
      p.style.strokeDasharray = `${len}`;
      p.style.strokeDashoffset = reduceMotion ? "0" : `${len}`;
    });
    const [x, y] = L.stops[reduceMotion ? 2 : 0];
    if (tokenRef.current) {
      tokenRef.current.style.left = `${(x / L.w) * 100}%`;
      tokenRef.current.style.top = `${(y / L.h) * 100}%`;
    }
  }, [L, reduceMotion]);

  useEffect(() => {
    if (!active || reduceMotion) return undefined;
    let raf = 0;
    let start = 0;
    let lastStage = -1;
    const DRAW_IN = 900; // let the buildings draw before the item moves
    const frame = (now) => {
      if (!start) start = now;
      const elapsed = now - start - DRAW_IN;
      if (elapsed < 0) {
        raf = requestAnimationFrame(frame);
        return;
      }
      const t = elapsed % CYCLE;
      const ph = phaseAt(t);
      // Token position
      let pt;
      if (ph.stop !== null) {
        const [x, y] = L.stops[ph.stop];
        pt = { x, y };
      } else {
        const path = segRefs.current[ph.seg];
        pt = path.getPointAtLength(lens.current[ph.seg] * ph.f);
      }
      // Last half-second of the loop: fade the item + caption out so the
      // restart at Hostel A never looks like a jump.
      const resting = t > CYCLE - FADE;
      if (tokenRef.current) {
        tokenRef.current.style.left = `${(pt.x / L.w) * 100}%`;
        tokenRef.current.style.top = `${(pt.y / L.h) * 100}%`;
        tokenRef.current.style.opacity = resting || t < 120 ? "0" : "1";
      }
      // Walked route fills in
      progRefs.current.forEach((p, i) => {
        if (!p) return;
        const len = lens.current[i];
        const done = i < ph.seg || (i === ph.seg && ph.stop !== null) ? 1 : i === ph.seg ? ph.f : 0;
        p.style.strokeDashoffset = `${len * (1 - done)}`;
      });
      const s = ph.stop === null || resting ? -1 : ph.stop;
      if (s !== lastStage) {
        lastStage = s;
        setStage(s);
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [active, reduceMotion, L]);

  // Last stop reached stays mounted so its caption can fade out in place.
  const [shown, setShown] = useState(reduceMotion ? 2 : -1);
  useEffect(() => {
    if (stage >= 0) setShown(stage);
  }, [stage]);
  const ShownIcon = shown >= 0 ? STEPS[shown].icon : null;
  const pct = (v, total) => `${(v / total) * 100}%`;

  return (
    <div className="relative w-full" style={{ aspectRatio: `${L.w} / ${L.h}` }}>
      <svg viewBox={`0 0 ${L.w} ${L.h}`} className="absolute inset-0 h-full w-full overflow-visible" aria-hidden="true">
        {L.ground !== null && <line className="cj-line cj-ground" pathLength="1" x1="0" x2={L.w} y1={L.ground} y2={L.ground} />}

        {L.trees.map(([x, y, s]) => (
          <Tree key={`${x}-${y}`} x={x} y={y} s={s} />
        ))}

        {BUILDINGS.map((kind, i) => {
          const Art = ART[kind];
          const [x, y, s] = L.b[i];
          const [sx, sy] = L.stops[i];
          return (
            <g key={i} className={`cj-building${stage === i ? " is-active" : ""}`}>
              {/* Door → route connector */}
              <path className="cj-stub" d={`M${x} ${y} L${sx} ${sy}`} />
              <g transform={`translate(${x} ${y}) scale(${s})`}>
                <Art />
              </g>
            </g>
          );
        })}

        {/* Route: dashed rail + walked (solid accent) overlay */}
        {L.segs.map((d, i) => (
          <g key={d}>
            <path ref={(el) => (segRefs.current[i] = el)} d={d} className="cj-rail" />
            <path ref={(el) => (progRefs.current[i] = el)} d={d} className="cj-walked" />
          </g>
        ))}
        {L.stops.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="5" className={`cj-stop${stage >= i || reduceMotion ? " is-on" : ""}`} />
        ))}
      </svg>

      {/* Building names */}
      {BUILDINGS.map((kind, i) => {
        const [x, y, s] = L.b[i];
        return (
          <span
            key={NAMES[i]}
            className={`cj-name absolute -translate-x-1/2 whitespace-nowrap text-[12px] font-medium sm:text-[13px] ${stage === i ? "is-active" : ""}`}
            style={{ left: pct(x, L.w), top: `calc(${pct(y - HEIGHT[kind] * s, L.h)} - 26px)` }}
          >
            {NAMES[i]}
          </span>
        );
      })}

      {/* Travelling item */}
      <div ref={tokenRef} className="absolute z-10 -translate-x-1/2 -translate-y-1/2 transition-opacity duration-300" style={{ left: 0, top: 0 }} aria-hidden="true">
        <span className="relative grid h-10 w-10 place-items-center rounded-xl border border-[var(--accent)] bg-white text-[var(--accent)] shadow-[0_10px_22px_-8px_var(--accent-ring)] dark:bg-[#1f2226]">
          <Bike className="h-5 w-5" strokeWidth={2} />
          {stage === 3 && (
            <span className="absolute -right-1.5 -top-1.5 grid h-4 w-4 place-items-center rounded-full bg-emerald-500 text-white ring-2 ring-white dark:ring-[#131313]">
              <svg viewBox="0 0 12 12" className="h-2.5 w-2.5"><path d="M2.5 6.2 5 8.5 9.5 3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </span>
          )}
        </span>
      </div>

      {/* Step caption under the current stop. Driven by the same clock as the
          item (no exit queue), so it can never lag behind the journey. */}
      {shown >= 0 && (
        <div
          className={`absolute z-10 w-max max-w-[240px] ${
            layout === "tall" ? "-translate-x-1/2" : shown === 0 ? "-translate-x-6" : shown === 3 ? "-translate-x-[calc(100%-24px)]" : "-translate-x-1/2"
          }`}
          style={{ left: pct(L.stops[shown][0], L.w), top: `calc(${pct(L.stops[shown][1], L.h)} + 28px)` }}
          aria-hidden="true"
        >
          <div
            key={shown}
            className={`cj-caption flex items-start gap-2.5 rounded-xl border border-slate-200/80 bg-white px-3 py-2.5 shadow-[0_12px_28px_-14px_rgba(15,23,42,0.35)] dark:border-white/10 dark:bg-[#1f2226] ${stage === shown ? "is-in" : ""}`}
          >
            <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md bg-[var(--accent-soft)] text-[var(--accent-text)]">
              <ShownIcon className="h-3.5 w-3.5" />
            </span>
            <span className="min-w-0">
              <span className="block text-[13px] font-semibold leading-5 text-slate-900 dark:text-white">{STEPS[shown].title}</span>
              <span className="block text-[12px] leading-[18px] text-slate-500 dark:text-zinc-400">{STEPS[shown].body}</span>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

const WIDE_QUERY = "(min-width: 768px)";
const useIsWide = () => {
  const get = () => typeof window !== "undefined" && window.matchMedia?.(WIDE_QUERY).matches;
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

export default function CampusJourney({ reduceMotion }) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);
  const wide = useIsWide();

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setInView(true);
      return undefined;
    }
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setInView(true), { threshold: 0.25 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section
      ref={ref}
      aria-labelledby="campus-journey-title"
      className={`cj-root relative py-6 sm:py-10 ${inView || reduceMotion ? "is-drawn" : ""}`}
    >
      <style>{`
        .cj-root { --cj-line: #cbd5e1; --cj-fill: #ffffff; --cj-window: #e2e8f0; }
        :is(.dark) .cj-root { --cj-line: #3f444c; --cj-fill: #1a1d20; --cj-window: #2a2e34; }
        .cj-line { fill: none; stroke: var(--cj-line); stroke-width: 1.6; stroke-linecap: round; stroke-linejoin: round;
          stroke-dasharray: 1; stroke-dashoffset: 1; transition: stroke-dashoffset 1.4s cubic-bezier(.65,0,.35,1), stroke .5s; }
        .cj-fill { fill: var(--cj-fill); fill-opacity: 0; transition: fill-opacity .8s ease .9s, stroke-dashoffset 1.4s cubic-bezier(.65,0,.35,1), stroke .5s; }
        .cj-window { fill: var(--cj-window); opacity: 0; transition: opacity .6s ease 1.1s, fill .5s; }
        .cj-tree { fill: none; }
        .cj-ground { stroke-width: 1.2; }
        .cj-stub { stroke: var(--cj-line); stroke-width: 1.4; stroke-dasharray: 2 5; fill: none; opacity: 0; transition: opacity .6s ease 1.2s; }
        .cj-rail { fill: none; stroke: var(--cj-line); stroke-width: 2; stroke-dasharray: 3 8; stroke-linecap: round; opacity: 0; transition: opacity .6s ease 1s; }
        .cj-walked { fill: none; stroke: var(--accent); stroke-width: 2.5; stroke-linecap: round; }
        .cj-stop { fill: var(--cj-fill); stroke: var(--cj-line); stroke-width: 2; opacity: 0; transition: opacity .6s ease 1.1s, fill .4s, stroke .4s; }
        .cj-stop.is-on { fill: var(--accent); stroke: var(--accent); }
        .cj-name { color: #64748b; opacity: 0; transition: opacity .6s ease 1.1s, color .4s; }
        :is(.dark) .cj-name { color: #a1a1aa; }
        .cj-name.is-active { color: var(--accent-text); font-weight: 600; }
        .cj-caption { opacity: 0; transform: translateY(6px); transition: opacity .3s ease, transform .35s cubic-bezier(.22,1,.36,1); }
        .cj-caption.is-in { opacity: 1; transform: none; animation: cj-in .4s cubic-bezier(.22,1,.36,1); }
        @keyframes cj-in { from { opacity: 0; transform: translateY(6px); } }
        .is-drawn .cj-line { stroke-dashoffset: 0; }
        .is-drawn .cj-fill { fill-opacity: 1; }
        .is-drawn .cj-window, .is-drawn .cj-stub, .is-drawn .cj-rail, .is-drawn .cj-stop, .is-drawn .cj-name { opacity: 1; }
        .cj-building.is-active .cj-line { stroke: var(--accent); }
        .cj-building.is-active .cj-window { fill: var(--accent-soft-strong); }
        @media (prefers-reduced-motion: reduce) {
          .cj-line, .cj-fill, .cj-window, .cj-stub, .cj-rail, .cj-stop, .cj-name, .cj-caption { transition: none; animation: none; }
        }
      `}</style>

      <div className="mx-auto max-w-xl text-center">
        <h2 id="campus-journey-title" className="font-figtree text-[24px] font-semibold tracking-tight text-slate-900 sm:text-[30px] dark:text-white">
          From one hostel room to another
        </h2>
        <p className="mt-3 text-[14.5px] leading-relaxed text-slate-500 sm:text-[16px] dark:text-zinc-400">
          List it from your room, chat between classes, meet at the canteen. Your old stuff finds a new owner without ever leaving campus.
        </p>
      </div>

      <div className="mx-auto mt-8 max-w-[1100px] sm:mt-10">
        {/* One layout at a time (one animation loop, measurable paths). */}
        {wide ? (
          <Scene key="wide" layout="wide" active={inView} reduceMotion={reduceMotion} />
        ) : (
          <div className="mx-auto max-w-[380px]">
            <Scene key="tall" layout="tall" active={inView} reduceMotion={reduceMotion} />
          </div>
        )}
      </div>
    </section>
  );
}
