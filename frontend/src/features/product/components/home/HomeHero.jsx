import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { FaPlus } from "react-icons/fa6";
import { ArrowRight, BadgeCheck, Bike, GraduationCap, Laptop, ShieldCheck, Wallet } from "lucide-react";

/*
 * Home hero: brand banner (follows --accent, pink in Girl Mode) with large
 * soft curved light shapes. Left: headline, CTAs and trust points. Right
 * (lg+): a frosted-glass shopping bag with the Unideals "U", an orbit ring
 * around it and floating glass tiles for what students trade (books/degree,
 * cycles, laptops). All vector + CSS (no rasters), so it stays sharp at any
 * size and re-tints with the accent. Gentle float; static for reduced motion.
 * Buttons share the navbar Sell button's exact shape, size, type and hover.
 */

const EASE = [0.22, 1, 0.36, 1];

const rise = (reduce, delay = 0) => ({
  initial: reduce ? { opacity: 0 } : { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, ease: EASE, delay },
});

// Navbar Sell button geometry (components/layout/Header.jsx), shared by both CTAs.
const SELL_SHAPE =
  "flex shrink-0 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--accent)] md:px-4 md:text-base lg:px-5";

/* Gentle idle float (skipped for reduced motion). */
const floatY = (reduce, amp, duration, delay = 0) =>
  reduce ? {} : { animate: { y: [0, -amp, 0] }, transition: { duration, repeat: Infinity, ease: "easeInOut", delay } };

/* Frosted-glass tile with a white line icon. */
function GlassTile({ icon: Icon, size, rotate, className, reduceMotion, enterDelay, floatAmp, floatDur }) {
  return (
    <motion.div
      className={`absolute ${className}`}
      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.85, y: 12 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.7, ease: EASE, delay: enterDelay }}
    >
      <motion.div {...floatY(reduceMotion, floatAmp, floatDur, enterDelay + 0.6)}>
        <div
          className="grid place-items-center rounded-[22%] border border-white/45 bg-gradient-to-br from-white/35 via-white/15 to-white/5 shadow-[0_18px_40px_-14px_rgba(15,10,80,0.55),inset_0_1px_0_rgba(255,255,255,0.6),inset_0_-10px_18px_-10px_rgba(255,255,255,0.35)] backdrop-blur-md"
          style={{ width: size, height: size, transform: `rotate(${rotate}deg)` }}
        >
          <Icon className="h-[46%] w-[46%] text-white drop-shadow-[0_2px_4px_rgba(20,10,90,0.35)]" strokeWidth={1.8} />
        </div>
      </motion.div>
    </motion.div>
  );
}

/* The glass bag: back wall, handle, front face with the "U", side depth. */
function GlassBag() {
  return (
    <svg viewBox="0 0 300 320" className="h-full w-full overflow-visible" aria-hidden="true">
      <defs>
        <linearGradient id="hb-front" x1="0.1" y1="0" x2="0.9" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.7" />
          <stop offset="0.55" stopColor="#fff" stopOpacity="0.42" />
          <stop offset="1" stopColor="#fff" stopOpacity="0.28" />
        </linearGradient>
        <linearGradient id="hb-side" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.3" />
          <stop offset="1" stopColor="#fff" stopOpacity="0.1" />
        </linearGradient>
        <linearGradient id="hb-handle" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.75" />
          <stop offset="1" stopColor="#fff" stopOpacity="0.35" />
        </linearGradient>
        <linearGradient id="hb-gloss" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity="0.55" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <radialGradient id="hb-shadow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#140a55" stopOpacity="0.45" />
          <stop offset="1" stopColor="#140a55" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Contact shadow */}
      <ellipse cx="150" cy="306" rx="128" ry="14" fill="url(#hb-shadow)" />

      <g transform="rotate(-7 150 200)">
        {/* Top opening (back rim seen behind the front edge) */}
        <path d="M62 122 L80 112 H250 L232 122 Z" fill="#fff" fillOpacity="0.22" stroke="#fff" strokeOpacity="0.45" strokeWidth="1.2" strokeLinejoin="round" />
        {/* Handle: thick glass loop with an inner core */}
        <path d="M104 122 C 104 36, 200 36, 200 122" fill="none" stroke="url(#hb-handle)" strokeWidth="24" strokeLinecap="round" />
        <path d="M104 122 C 104 36, 200 36, 200 122" fill="none" stroke="#fff" strokeOpacity="0.35" strokeWidth="8" strokeLinecap="round" />
        {/* Side depth (right) */}
        <path d="M232 122 L250 112 Q262 112 264 126 L277 258 Q279 282 256 290 L238 296 Q259 293 260 270 L247 136 Q246 122 232 122 Z" fill="url(#hb-side)" stroke="#fff" strokeOpacity="0.35" strokeWidth="1.2" strokeLinejoin="round" />
        {/* Front face */}
        <path
          d="M62 122 H232 Q246 122 247 136 L260 270 Q262 296 236 296 H54 Q28 296 30 270 L46 136 Q48 122 62 122 Z"
          fill="url(#hb-front)"
          stroke="#fff"
          strokeOpacity="0.7"
          strokeWidth="1.6"
        />
        {/* Rim highlight + left gloss */}
        <path d="M62 123.5 H232" stroke="#fff" strokeOpacity="0.85" strokeWidth="2" strokeLinecap="round" />
        <path d="M50 140 Q48 200 40 268 Q38 284 56 288 L70 288 Q60 220 66 140 Z" fill="url(#hb-gloss)" />
        {/* The "U" mark */}
        <path d="M118 186 V211 Q118 240 145 240 Q172 240 172 211 V186" fill="none" stroke="#fff" strokeWidth="15" strokeLinecap="round" />
      </g>
    </svg>
  );
}

function HeroArt({ reduceMotion }) {
  return (
    <div aria-hidden="true" className="pointer-events-none relative mx-auto -my-4 hidden h-[400px] w-full max-w-[540px] origin-center scale-[0.92] lg:block">
      {/* Orbit: back half behind the bag */}
      <svg viewBox="0 0 540 400" className="absolute inset-0 h-full w-full overflow-visible">
        <ellipse cx="290" cy="205" rx="250" ry="66" transform="rotate(-14 290 205)" fill="none" stroke="#fff" strokeOpacity="0.28" strokeWidth="3" />
      </svg>

      {/* Bag */}
      <motion.div
        className="absolute left-[150px] top-[28px] h-[330px] w-[300px]"
        initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 18, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.8, ease: EASE, delay: 0.15 }}
      >
        <motion.div className="h-full w-full drop-shadow-[0_30px_40px_rgba(20,10,90,0.35)]" {...floatY(reduceMotion, 6, 6, 1)}>
          <GlassBag />
        </motion.div>
      </motion.div>

      {/* Orbit: front arc, over the bag */}
      <svg viewBox="0 0 540 400" className="absolute inset-0 h-full w-full overflow-visible">
        <path
          d="M40 205 A250 66 0 0 0 540 205"
          transform="rotate(-14 290 205)"
          fill="none"
          stroke="#fff"
          strokeOpacity="0.5"
          strokeWidth="3"
          strokeLinecap="round"
        />
        {/* Sparkle */}
        <g stroke="#fff" strokeOpacity="0.85" strokeWidth="3.5" strokeLinecap="round">
          <path d="M436 6 L432 26" />
          <path d="M456 14 L444 32" />
          <path d="M470 34 L452 40" />
        </g>
      </svg>

      <GlassTile icon={GraduationCap} size={92} rotate={-8} className="left-[70px] top-[18px]" reduceMotion={reduceMotion} enterDelay={0.35} floatAmp={8} floatDur={5.5} />
      <GlassTile icon={Bike} size={96} rotate={7} className="left-[54px] top-[222px]" reduceMotion={reduceMotion} enterDelay={0.5} floatAmp={7} floatDur={6.5} />
      <GlassTile icon={Laptop} size={90} rotate={8} className="right-[-6px] top-[140px]" reduceMotion={reduceMotion} enterDelay={0.65} floatAmp={9} floatDur={6} />
    </div>
  );
}

export default function HomeHero({ reduceMotion }) {
  return (
    <section
      aria-labelledby="home-hero-title"
      className="brand-surface relative mx-auto mb-3 mt-3 w-full overflow-hidden rounded-2xl text-white sm:mt-4"
    >
      {/* Light: large soft curved shapes (top-right dome, bottom-right
          swell), a gentle diagonal wash and faint rings bottom-left. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0.10)_0%,rgba(255,255,255,0)_40%,rgba(255,255,255,0.05)_100%)]" />
        <div className="absolute -right-[12%] -top-[55%] h-[150%] w-[62%] rounded-[50%] bg-[radial-gradient(closest-side,rgba(255,255,255,0.16),rgba(255,255,255,0.05)_70%,rgba(255,255,255,0))] ring-1 ring-inset ring-white/10" />
        <div className="absolute -bottom-[70%] -right-[18%] h-[120%] w-[78%] rounded-[50%] bg-white/[0.07]" />
        <div className="absolute -bottom-[86%] right-[10%] h-[110%] w-[60%] rounded-[50%] bg-white/[0.05]" />
        <svg className="absolute -bottom-40 -left-40 h-[420px] w-[420px] opacity-[0.12]" viewBox="0 0 420 420">
          {[80, 130, 180, 205].map((r) => (
            <circle key={r} cx="210" cy="210" r={r} fill="none" stroke="#fff" strokeWidth="1" />
          ))}
        </svg>
      </div>

      <div className="relative grid items-center gap-8 px-5 py-8 sm:px-10 sm:py-10 lg:min-h-[380px] lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-8 lg:px-14 lg:py-8">
        {/* Copy */}
        <div className="max-w-xl">
          <motion.h1
            id="home-hero-title"
            {...rise(reduceMotion, 0)}
            className="font-figtree text-[30px] font-bold leading-[1.08] tracking-[-0.03em] sm:text-[38px] lg:text-[44px]"
          >
            Buy and sell on campus,{" "}
            <span className="relative whitespace-nowrap">
              <span className="text-white/75">the easy way.</span>
              {/* Hand-drawn underline that draws itself in on first load */}
              <svg aria-hidden="true" viewBox="0 0 220 12" preserveAspectRatio="none" className="absolute -bottom-1.5 left-0 h-2.5 w-full overflow-visible">
                <motion.path
                  d="M2 9 C 60 2, 150 2, 218 8"
                  fill="none"
                  stroke="#fff"
                  strokeOpacity="0.5"
                  strokeWidth="3"
                  strokeLinecap="round"
                  initial={reduceMotion ? { pathLength: 1 } : { pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  transition={{ pathLength: { duration: 1.1, ease: [0.65, 0, 0.35, 1], delay: 0.55 }, opacity: { duration: 0.15, delay: 0.55 } }}
                />
              </svg>
            </span>
          </motion.h1>

          <motion.p {...rise(reduceMotion, 0.1)} className="mt-4 max-w-md text-[15px] leading-relaxed text-white/80 sm:text-[16px]">
            Textbooks, gadgets, cycles and hostel essentials from verified students near you. No fees, no shipping. Just meet and swap.
          </motion.p>

          <motion.div {...rise(reduceMotion, 0.2)} className="mt-6 flex flex-wrap gap-3">
            <Link to="/upload" className={`${SELL_SHAPE} bg-white text-[var(--accent)]`}>
              <span>Start selling</span>
              <FaPlus className="size-3" aria-hidden="true" />
            </Link>
            <Link to="/explore" className={`${SELL_SHAPE} bg-white/15 text-[#FCFCFC] ring-1 ring-inset ring-white/30 hover:bg-white/20`}>
              <span>Browse deals</span>
              <ArrowRight className="size-3.5" aria-hidden="true" />
            </Link>
          </motion.div>

          <motion.ul {...rise(reduceMotion, 0.3)} className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px] text-white/80">
            {[
              [BadgeCheck, "Verified students"],
              [Wallet, "Zero listing fees"],
              [ShieldCheck, "Meet on campus"],
            ].map(([Icon, label]) => (
              <li key={label} className="inline-flex items-center gap-1.5 whitespace-nowrap">
                <Icon className="h-4 w-4 text-white" aria-hidden="true" />
                {label}
              </li>
            ))}
          </motion.ul>
        </div>

        <HeroArt reduceMotion={reduceMotion} />
      </div>
    </section>
  );
}
