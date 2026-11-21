import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, MapPin, Zap } from "lucide-react";
import CategoryIcon from "../../product/components/CategoryIcon.jsx";
import { TickIcon } from "../../../components/common/VerifiedTick.jsx";

/*
 * Auth panel centrepiece (login + signup): the product at work as clean UI,
 * not a screenshot. A "Fresh on your campus" feed where new listings slide
 * in, a buyer's chat message, a paid-at-pickup confirmation and a verified
 * student badge (list → chat → meet & pay). Category art only, no photos.
 * Sized in rem/% so it scales with the panel from md to 3xl; static for
 * reduced motion.
 */

const EASE = [0.22, 1, 0.36, 1];

const FEED = [
  { id: 1, cat: "vehicles", title: "Hero Sprint cycle", where: "Hostel B", price: "2,400", boosted: true },
  { id: 2, cat: "electronics", title: "Casio fx-991EX calculator", where: "Hostel A", price: "650" },
  { id: 3, cat: "study_material", title: "Engineering Maths, 3rd ed.", where: "Library", price: "220" },
  { id: 4, cat: "lab_equipment", title: "Lab coat, size M", where: "Hostel C", price: "150" },
  { id: 5, cat: "hostel_essentials", title: "Rechargeable study lamp", where: "Hostel A", price: "180" },
  { id: 6, cat: "electronics", title: "boAt Rockerz 450", where: "Hostel D", price: "900" },
];
const AGO = ["just now", "3 min ago", "8 min ago"];

function Row({ item, ago }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-slate-50 ring-1 ring-inset ring-slate-200/70 dark:bg-white/[0.04] dark:ring-white/10">
        <CategoryIcon value={item.cat} className="h-7 w-7" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span className="truncate text-[0.84rem] font-semibold text-slate-900 dark:text-white">{item.title}</span>
          {item.boosted && (
            <span className="inline-flex shrink-0 items-center gap-0.5 rounded-md bg-amber-50 px-1.5 py-px text-[0.66rem] font-semibold text-amber-700 ring-1 ring-inset ring-amber-200/70 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/20">
              <Zap className="h-2.5 w-2.5" strokeWidth={2.5} aria-hidden="true" />
              Boosted
            </span>
          )}
        </span>
        <span className="mt-0.5 flex items-center gap-1 text-[0.74rem] text-slate-500 dark:text-zinc-400">
          <MapPin className="h-3 w-3 shrink-0" aria-hidden="true" />
          <span className="truncate">
            {item.where} · {ago}
          </span>
        </span>
      </span>
      <span className="shrink-0 text-[0.88rem] font-bold tabular-nums text-slate-900 dark:text-white">₹{item.price}</span>
    </div>
  );
}

export default function AuthShowcase() {
  const reduce = useReducedMotion();
  const [head, setHead] = useState(0);
  useEffect(() => {
    if (reduce) return undefined;
    const id = setInterval(() => setHead((h) => (h + 1) % FEED.length), 3200);
    return () => clearInterval(id);
  }, [reduce]);
  const rows = [0, 1, 2].map((i) => FEED[(head + FEED.length - i) % FEED.length]);

  const enter = (delay, x = 0) => ({
    initial: reduce ? { opacity: 0 } : { opacity: 0, y: 14, x },
    animate: { opacity: 1, y: 0, x: 0 },
    transition: { duration: 0.7, ease: EASE, delay },
  });
  const float = (amp, duration, delay) =>
    reduce ? {} : { animate: { y: [0, -amp, 0] }, transition: { duration, repeat: Infinity, ease: "easeInOut", delay } };

  return (
    <div aria-hidden="true" className="relative w-full px-[6%] pb-[14%] pt-[9%] font-figtree">
      {/* Feed card */}
      <motion.div {...enter(0.15)} className="relative">
        <div className="overflow-hidden rounded-2xl bg-white text-slate-900 shadow-[0_30px_60px_-22px_rgba(10,10,80,0.55),0_0_0_1px_rgba(255,255,255,0.55)] dark:bg-[#1A1D20] dark:shadow-[0_30px_60px_-22px_rgba(0,0,0,0.6),0_0_0_1px_rgba(255,255,255,0.08)]">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-white/10">
            <div className="min-w-0">
              <p className="text-[0.88rem] font-semibold tracking-tight dark:text-white">Fresh on your campus</p>
              <p className="mt-0.5 flex items-center gap-1.5 text-[0.72rem] text-slate-500 dark:text-zinc-400">
                <span className="relative flex h-1.5 w-1.5">
                  {!reduce && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />}
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                </span>
                Updated just now
              </p>
            </div>
            <span className="rounded-full bg-[#3b3bf2]/[0.08] px-2.5 py-1 text-[0.68rem] font-semibold text-[#3b3bf2] dark:bg-white/[0.06] dark:text-indigo-300">
              VIT Vellore
            </span>
          </div>

          <div className="relative h-[12.6rem] overflow-hidden">
            <AnimatePresence initial={false}>
              {rows.map((item, i) => (
                <motion.div
                  key={item.id}
                  layout={!reduce}
                  initial={{ opacity: 0, y: -22 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, transition: { duration: 0.25 } }}
                  transition={{ duration: 0.5, ease: EASE }}
                  className={i < 2 ? "border-b border-slate-100 dark:border-white/10" : ""}
                >
                  <Row item={item} ago={AGO[i]} />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/70 px-4 py-2.5 text-[0.72rem] dark:border-white/10 dark:bg-white/[0.02]">
            <span className="text-slate-500 dark:text-zinc-400">No fees · No shipping</span>
            <span className="font-semibold text-[#3b3bf2] dark:text-indigo-300">Browse all listings →</span>
          </div>
        </div>
      </motion.div>

      {/* Buyer's message (top right) */}
      <motion.div {...enter(0.5, 16)} className="absolute right-0 top-0 z-10 max-w-[72%]">
        <motion.div {...float(5, 5, 1)}>
          <div className="flex items-start gap-2.5 rounded-2xl rounded-tr-md bg-white/95 px-3 py-2.5 shadow-[0_18px_36px_-16px_rgba(10,10,80,0.55)] ring-1 ring-black/5 backdrop-blur dark:bg-[#22252a]/95 dark:ring-white/10">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 text-[0.68rem] font-semibold text-white">
              AK
            </span>
            <span className="min-w-0 leading-tight">
              <span className="flex items-center gap-1 text-[0.72rem] font-semibold text-slate-900 dark:text-white">
                Ananya
                <TickIcon className="h-3.5 w-3.5" />
                <span className="font-normal text-slate-400">· Hostel B</span>
              </span>
              <span className="mt-0.5 block text-[0.78rem] text-slate-600 dark:text-zinc-300">Is the cycle still available?</span>
            </span>
          </div>
        </motion.div>
      </motion.div>

      {/* Paid at pickup (bottom left) */}
      <motion.div {...enter(0.7, -16)} className="absolute bottom-0 left-0 z-10">
        <motion.div {...float(6, 6, 1.6)}>
          <div className="flex items-center gap-2.5 rounded-2xl bg-white/95 px-3 py-2.5 shadow-[0_18px_36px_-16px_rgba(10,10,80,0.55)] ring-1 ring-black/5 backdrop-blur dark:bg-[#22252a]/95 dark:ring-white/10">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-emerald-500 text-white">
              <Check className="h-4 w-4" strokeWidth={3} />
            </span>
            <span className="leading-tight">
              <span className="block text-[0.78rem] font-semibold text-slate-900 dark:text-white">Picked up at Canteen</span>
              <span className="mt-0.5 block text-[0.72rem] text-slate-500 dark:text-zinc-400">Paid ₹2,400 by UPI · no fees</span>
            </span>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
