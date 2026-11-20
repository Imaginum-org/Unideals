import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { Bike, BookOpen, Headphones, IndianRupee, MapPin, ShieldCheck, Ticket } from "lucide-react";
import ThemeToggle from "../../../../components/ui/ThemeToggle.jsx";
import CampusNightScene from "./CampusNightScene.jsx";
import { cn } from "../../../../utils/cn.js";

/*
 * Right-hand panel of every auth screen (md and up).
 * Headline + the animated "campus at night" story + three trust points.
 *
 * Extras: a light glass edge around the panel, a beam of light travelling
 * around the story card, category chips floating beside it (wide screens),
 * and a subtle mouse parallax (the panel sets --mx/--my; layers with
 * .as-par drift by their own --depth). All of it is off for reduced motion.
 * The headline intro plays once per visit, so hopping between login,
 * signup and forgot-password doesn't replay it.
 */

const TRUST = [
  { icon: ShieldCheck, label: "Verified students" },
  { icon: MapPin, label: "Meet on campus" },
  { icon: IndianRupee, label: "No listing fees" },
];

// Categories students actually trade on Unideals (see FAQ / SEO copy).
const FLOATERS = [
  { icon: BookOpen, label: "Textbooks", side: "left", top: "8%", rot: -6, depth: 16, dur: "7s", delay: "0s" },
  { icon: Bike, label: "Cycles", side: "left", top: "60%", rot: 5, depth: 24, dur: "8.6s", delay: "-2.2s" },
  { icon: Headphones, label: "Electronics", side: "right", top: "22%", rot: 6, depth: 20, dur: "7.8s", delay: "-1.1s" },
  { icon: Ticket, label: "Event passes", side: "right", top: "72%", rot: -5, depth: 13, dur: "9.2s", delay: "-3.4s" },
];

let headlineIntroPlayed = false;

function AuthShowcase() {
  const [intro] = useState(() => !headlineIntroPlayed);
  const panelRef = useRef(null);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    headlineIntroPlayed = true;
  }, []);

  // Mouse parallax: write the pointer position (-1…1) as CSS variables,
  // at most once per frame. Layers read them; no React re-renders.
  useEffect(() => {
    const el = panelRef.current;
    if (!el || reduceMotion) return undefined;
    let raf = 0;
    let x = 0;
    let y = 0;
    const apply = () => {
      raf = 0;
      el.style.setProperty("--mx", x.toFixed(3));
      el.style.setProperty("--my", y.toFixed(3));
    };
    const queue = () => {
      if (!raf) raf = requestAnimationFrame(apply);
    };
    const onMove = (e) => {
      if (e.pointerType && e.pointerType !== "mouse") return;
      const r = el.getBoundingClientRect();
      x = ((e.clientX - r.left) / r.width - 0.5) * 2;
      y = ((e.clientY - r.top) / r.height - 0.5) * 2;
      queue();
    };
    const onLeave = () => {
      x = 0;
      y = 0;
      queue();
    };
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);
    return () => {
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
      cancelAnimationFrame(raf);
    };
  }, [reduceMotion]);

  return (
    <aside className="hidden h-full min-h-0 flex-1 select-none p-3 md:flex lg:p-4">
      <div
        ref={panelRef}
        className="as-panel relative isolate flex h-full w-full flex-col overflow-hidden rounded-[28px] text-white"
      >
        {/* Backdrop */}
        <div aria-hidden="true" className="as-dots pointer-events-none absolute inset-0" />
        <div aria-hidden="true" className="as-par pointer-events-none absolute inset-0" style={{ "--depth": "-22px" }}>
          <div className="as-aurora -right-[12%] -top-[18%] h-[55%] w-[60%] bg-[#8E8CFF]/45" />
          <div className="as-aurora is-b -bottom-[22%] -left-[14%] h-[60%] w-[65%] bg-[#1C1DA8]/60" />
        </div>
        {/* Light glass edge */}
        <div aria-hidden="true" className="as-edge pointer-events-none absolute inset-0 z-30 rounded-[inherit]" />

        {/* Top bar */}
        <div className="relative z-20 flex shrink-0 items-center justify-between px-7 pt-6 lg:px-10 lg:pt-8">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[12px] font-medium tracking-wide text-white/90 ring-1 ring-inset ring-white/15">
            <span className="as-live-dot size-1.5 rounded-full bg-[#FFD66B]" />
            Buy. Sell. Repeat.
          </span>
          <ThemeToggle size="responsive" variant="glass" />
        </div>

        {/* Headline + story */}
        <div className="no-scrollbar relative z-10 flex min-h-0 flex-1 flex-col overflow-y-auto px-7 py-6 lg:px-12 xl:px-16">
          {/* Width grows with the screen but is capped by height, so the story
              never gets squeezed on short laptops. */}
          <div className="m-auto w-full max-w-[min(var(--as-w),calc(220dvh_-_1141px))] [--as-w:30rem] xl:[--as-w:32rem] 2xl:[--as-w:35rem] wide:[--as-w:38rem]">
            <div className={cn(intro && "as-intro")}>
              <h2 className="font-figtree text-[clamp(1.55rem,2.2vw,2.4rem)] font-semibold leading-[1.12] tracking-[-0.025em] text-white">
                From hostel needs to{" "}
                <span className="relative inline-block whitespace-nowrap">
                  daily deals
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 200 14"
                    preserveAspectRatio="none"
                    className="absolute -bottom-[0.32em] left-0 h-[0.42em] w-full overflow-visible"
                  >
                    <path
                      className="as-underline"
                      pathLength="1"
                      d="M3 9 C 48 3, 118 2, 197 7"
                      fill="none"
                      stroke="#FFD66B"
                      strokeWidth="3.4"
                      strokeLinecap="round"
                    />
                  </svg>
                </span>
              </h2>
              <p className="mt-4 max-w-[36rem] text-[clamp(0.9rem,1vw,1.05rem)] leading-relaxed text-white/75">
                A faster, simpler way to exchange essentials within your campus.
              </p>

              <div className="relative mt-[clamp(1.25rem,3.5vh,2.25rem)]">
                {/* Category chips floating in the gutters (only where there's room) */}
                {FLOATERS.map(({ icon: Icon, label, side, top, rot, depth, dur, delay }) => (
                  <div
                    key={label}
                    aria-hidden="true"
                    className="as-par pointer-events-none absolute z-10 hidden min-[1440px]:block"
                    style={{
                      top,
                      [side === "left" ? "right" : "left"]: "calc(100% + 1.1rem)",
                      "--depth": `${depth}px`,
                    }}
                  >
                    <div
                      className="as-floater-chip inline-flex items-center gap-2 whitespace-nowrap rounded-full bg-white/[0.12] py-1 pl-1 pr-3 text-[12px] font-medium text-white/90 shadow-[0_10px_24px_-12px_rgba(8,8,60,0.6)] ring-1 ring-inset ring-white/20"
                      style={{ "--rot": `${rot}deg`, "--dur": dur, "--delay": delay }}
                    >
                      <span className="grid size-6 place-items-center rounded-full bg-white text-[#393AF2]">
                        <Icon className="size-3.5" strokeWidth={2.2} />
                      </span>
                      {label}
                    </div>
                  </div>
                ))}

                <section
                  aria-label="How a deal works on Unideals"
                  className="relative overflow-hidden rounded-[22px] bg-white/[0.07] px-4 pb-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.16)] ring-1 ring-inset ring-white/[0.14] lg:px-5 lg:pb-5"
                >
                  <CampusNightScene />
                  <span aria-hidden="true" className="as-beam pointer-events-none absolute inset-0 rounded-[inherit]" />
                </section>
              </div>
            </div>
          </div>
        </div>

        {/* Trust row (dropped on short screens so the story never gets squeezed) */}
        <ul className="relative z-10 flex shrink-0 flex-wrap items-center justify-center gap-x-6 gap-y-2 px-7 pb-6 text-[13px] text-white/75 lg:pb-8 [@media(max-height:760px)]:hidden">
          {TRUST.map(({ icon: Icon, label }) => (
            <li key={label} className="inline-flex items-center gap-2">
              <span className="grid size-6 place-items-center rounded-full bg-white/10 ring-1 ring-inset ring-white/15">
                <Icon className="size-3.5" strokeWidth={2.2} />
              </span>
              {label}
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}

export default AuthShowcase;
