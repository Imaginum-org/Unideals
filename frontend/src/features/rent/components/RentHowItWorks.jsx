import { MessageCircle, ShieldCheck, Tag } from "lucide-react";
import { cn } from "../../../utils/cn.js";
import { CARD } from "./RentKit.jsx";

const STEPS = [
  {
    Icon: Tag,
    title: "Post it, or ask",
    text: "Rent it out, lend it free or give it away. Need something? Ask, and your block gets a ping.",
  },
  {
    Icon: MessageCircle,
    title: "Agree in chat",
    text: "Accept a request, then fix the spot and time with them in Chats. Room numbers stay private.",
  },
  {
    Icon: ShieldCheck,
    title: "Get it back, get paid",
    text: "Check it together at handover, collect by UPI or cash, and track every return right here.",
  },
];

/** Three-step explainer for Rent & Borrow (Profile → Rentals). */
export default function RentHowItWorks({ className }) {
  return (
    <section className={cn(CARD, "p-5 sm:p-6", className)} aria-labelledby="rent-how-title">
      <h2 id="rent-how-title" className="text-[16px] font-semibold tracking-tight text-slate-900 dark:text-white">
        How Rent & Borrow works
      </h2>
      <ol className="mt-4 grid gap-3 sm:grid-cols-3 sm:gap-4">
        {STEPS.map(({ Icon, title, text }, i) => (
          <li key={title} className="relative flex gap-3.5 rounded-xl border border-neutral-200/80 p-4 sm:block sm:p-5 dark:border-neutral-800">
            <span className="absolute right-4 top-4 text-[12px] font-semibold tabular-nums text-slate-300 dark:text-zinc-600" aria-hidden="true">
              {String(i + 1).padStart(2, "0")}
            </span>
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent-text)] sm:h-11 sm:w-11">
              <Icon className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0 pr-6 sm:mt-4 sm:pr-0">
              <p className="text-[15px] font-semibold text-slate-900 dark:text-white">{title}</p>
              <p className="mt-1 text-[13.5px] leading-relaxed text-slate-500 dark:text-zinc-400">{text}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
