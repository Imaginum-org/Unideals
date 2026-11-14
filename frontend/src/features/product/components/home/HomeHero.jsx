import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { FaPlus } from "react-icons/fa6";
import { ArrowRight, BadgeCheck, Check, MapPin, ShieldCheck, Wallet, Zap } from "lucide-react";
import CategoryIcon from "../CategoryIcon.jsx";

/*
 * Home hero: brand-blue banner (follows --accent, pink in Girl Mode) with
 * subtle white light so it isn't flat. Right side (lg+): the product at
 * work, as clean UI: a "Fresh on your campus" feed card where new listings
 * slide in, flanked by a buyer's chat message and a paid-at-pickup
 * confirmation (list → chat → meet & pay). Category art, no photos.
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

// Illustrative feed (category art only). Cycles to feel live.
const FEED = [
  { id: 1, cat: "vehicles", title: "Hero Sprint cycle", where: "Hostel B", price: "2,400", boosted: true },
  { id: 2, cat: "electronics", title: "Casio fx-991EX calculator", where: "Hostel A", price: "650" },
  { id: 3, cat: "study_material", title: "Engineering Maths, 3rd ed.", where: "Library", price: "220" },
  { id: 4, cat: "lab_equipment", title: "Lab coat, size M", where: "Hostel C", price: "150" },
  { id: 5, cat: "hostel_essentials", title: "Rechargeable study lamp", where: "Hostel A", price: "180" },
  { id: 6, cat: "electronics", title: "boAt Rockerz 450", where: "Hostel D", price: "900" },
];
const AGO = ["just now", "3 min ago", "8 min ago"];

function FeedRow({ item, ago }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-slate-50 ring-1 ring-inset ring-slate-200/70">
        <CategoryIcon value={item.cat} className="h-7 w-7" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span className="truncate text-[13.5px] font-semibold text-slate-900">{item.title}</span>
          {item.boosted && (
            <span className="inline-flex shrink-0 items-center gap-0.5 rounded-md bg-amber-50 px-1.5 py-px text-[10.5px] font-semibold text-amber-700 ring-1 ring-inset ring-amber-200/70">
              <Zap className="h-2.5 w-2.5" strokeWidth={2.5} />
              Boosted
            </span>
          )}
        </span>
        <span className="mt-0.5 flex items-center gap-1 text-[12px] text-slate-500">
          <MapPin className="h-3 w-3" />
          {item.where} · {ago}
        </span>
      </span>
      <span className="shrink-0 text-[14px] font-bold tabular-nums text-slate-900">₹{item.price}</span>
    </div>
  );
}

function HeroArt({ reduceMotion }) {
  const [head, setHead] = useState(0);
  useEffect(() => {
    if (reduceMotion) return undefined;
    const id = setInterval(() => setHead((h) => (h + 1) % FEED.length), 3200);
    return () => clearInterval(id);
  }, [reduceMotion]);
  const rows = [0, 1, 2].map((i) => FEED[(head + FEED.length - i) % FEED.length]);

  const enter = (delay, x = 0) => ({
    initial: reduceMotion ? { opacity: 0 } : { opacity: 0, y: 16, x },
    animate: { opacity: 1, y: 0, x: 0 },
    transition: { duration: 0.7, ease: EASE, delay },
  });

  return (
    <div aria-hidden="true" className="relative mx-auto hidden w-full max-w-[460px] py-6 lg:block" style={{ perspective: "1600px" }}>
      {/* Feed card */}
      <motion.div {...enter(0.15)} className="relative mx-auto w-[380px]">
        <div
          className="overflow-hidden rounded-2xl bg-white text-slate-900 shadow-[0_30px_60px_-20px_rgba(15,23,42,0.45),0_0_0_1px_rgba(255,255,255,0.5)]"
          style={{ transform: "rotateY(-7deg) rotateX(3deg)", transformStyle: "preserve-3d" }}
        >
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <div>
              <p className="text-[14px] font-semibold tracking-tight">Fresh on your campus</p>
              <p className="mt-0.5 flex items-center gap-1.5 text-[11.5px] text-slate-500">
                <span className="relative flex h-1.5 w-1.5">
                  {!reduceMotion && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />}
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                </span>
                Updated just now
              </p>
            </div>
          </div>

          <div className="relative h-[204px] overflow-hidden">
            <AnimatePresence initial={false}>
              {rows.map((item, i) => (
                <motion.div
                  key={item.id}
                  layout={!reduceMotion}
                  initial={{ opacity: 0, y: -24 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, transition: { duration: 0.25 } }}
                  transition={{ duration: 0.5, ease: EASE }}
                  className={i < 2 ? "border-b border-slate-100" : ""}
                >
                  <FeedRow item={item} ago={AGO[i]} />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          <div className="flex items-center justify-end border-t border-slate-100 bg-slate-50/70 px-4 py-2.5 text-[12px]">
            <span className="inline-flex items-center gap-1 font-medium text-[var(--accent)]">
              Browse all listings <ArrowRight className="h-3 w-3" />
            </span>
          </div>
        </div>
      </motion.div>

      {/* Buyer's message */}
      <motion.div {...enter(0.5, 16)} className="absolute -right-4 top-2 z-10">
        <motion.div {...(reduceMotion ? {} : { animate: { y: [0, -5, 0] }, transition: { duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 } })}>
          <div className="flex items-start gap-2.5 rounded-2xl rounded-tr-md bg-white/95 px-3 py-2.5 shadow-[0_18px_36px_-16px_rgba(15,23,42,0.5)] ring-1 ring-black/5 backdrop-blur">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 text-[11px] font-semibold text-white">
              AK
            </span>
            <span className="leading-tight">
              <span className="block text-[11.5px] font-semibold text-slate-900">
                Ananya <span className="font-normal text-slate-400">· Hostel B</span>
              </span>
              <span className="mt-0.5 block text-[12.5px] text-slate-600">Is the cycle still available?</span>
            </span>
          </div>
        </motion.div>
      </motion.div>

      {/* Paid at pickup */}
      <motion.div {...enter(0.7, -16)} className="absolute -left-4 bottom-2 z-10">
        <motion.div {...(reduceMotion ? {} : { animate: { y: [0, -6, 0] }, transition: { duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1.6 } })}>
          <div className="flex items-center gap-2.5 rounded-2xl bg-white/95 px-3 py-2.5 shadow-[0_18px_36px_-16px_rgba(15,23,42,0.5)] ring-1 ring-black/5 backdrop-blur">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-emerald-500 text-white">
              <Check className="h-4 w-4" strokeWidth={3} />
            </span>
            <span className="leading-tight">
              <span className="block text-[12.5px] font-semibold text-slate-900">Picked up at Canteen</span>
              <span className="mt-0.5 block text-[11.5px] text-slate-500">Paid ₹2,400 by UPI</span>
            </span>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}

export default function HomeHero({ reduceMotion }) {
  return (
    <section
      aria-labelledby="home-hero-title"
      className="brand-surface relative mx-auto mb-3 mt-3 w-full overflow-hidden rounded-2xl text-white sm:mt-4"
    >
      {/* Subtle white light so the blue isn't flat */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.14)_0%,rgba(255,255,255,0)_45%,rgba(255,255,255,0.06)_100%)]" />
        <div
          className="absolute inset-0 opacity-60"
          style={{
            backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.22) 1px, transparent 0)",
            backgroundSize: "24px 24px",
            maskImage: "radial-gradient(ellipse 60% 70% at 75% 45%, #000 20%, transparent 70%)",
            WebkitMaskImage: "radial-gradient(ellipse 60% 70% at 75% 45%, #000 20%, transparent 70%)",
          }}
        />
        <div className="absolute -right-32 -top-40 h-[480px] w-[480px] rounded-full bg-white/15 blur-3xl" />
        <div className="absolute -bottom-48 -left-24 h-[420px] w-[420px] rounded-full bg-white/10 blur-3xl" />
        <svg className="absolute -bottom-40 -left-40 h-[420px] w-[420px] opacity-[0.12]" viewBox="0 0 420 420">
          {[80, 130, 180, 205].map((r) => (
            <circle key={r} cx="210" cy="210" r={r} fill="none" stroke="#fff" strokeWidth="1" />
          ))}
        </svg>
      </div>

      <div className="relative grid items-center gap-8 px-5 py-9 sm:px-10 sm:py-12 lg:min-h-[420px] lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-8 lg:px-14 lg:py-10">
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
