import { Lightbulb, Check } from "lucide-react";
import { CARD } from "../listing/ListingKit.jsx";
import { cn } from "../../../../utils/cn.js";

// Short, specific advice per step. No invented statistics.
const TIPS = {
  1: {
    title: "Write a title buyers search for",
    tips: [
      "Lead with brand + model, e.g. “Casio fx-991ES Plus”.",
      "Mention what's included (box, charger, cover).",
      "Be upfront about scratches or faults.",
    ],
  },
  2: {
    title: "Photos sell the item",
    tips: [
      "Shoot in daylight against a plain background.",
      "Use the cover for the clearest, front-facing shot.",
      "Show any wear up close, it builds trust.",
    ],
  },
  3: {
    title: "Price it to sell",
    tips: [
      "Check what similar items go for on your campus.",
      "Negotiable listings usually get more chats.",
      "Pick a busy, public pickup spot on campus.",
    ],
  },
  4: {
    title: "Final check",
    tips: [
      "Make sure the cover photo is the right one.",
      "Double-check price and pickup spot.",
      "You can edit the listing any time after publishing.",
    ],
  },
};

const TipsCard = ({ step, className }) => {
  const data = TIPS[step] || TIPS[1];
  return (
    <section className={cn(CARD, "p-4", className)} aria-label="Tips">
      <p className="flex items-center gap-2 text-[13.5px] font-semibold text-slate-900 dark:text-white">
        <span className="grid h-7 w-7 place-items-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-300">
          <Lightbulb className="h-4 w-4" aria-hidden="true" />
        </span>
        {data.title}
      </p>
      <ul className="mt-3 space-y-2">
        {data.tips.map((tip) => (
          <li key={tip} className="flex items-start gap-2 text-[13px] leading-relaxed text-slate-600 dark:text-zinc-300">
            <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" strokeWidth={3} aria-hidden="true" />
            {tip}
          </li>
        ))}
      </ul>
    </section>
  );
};

export default TipsCard;
