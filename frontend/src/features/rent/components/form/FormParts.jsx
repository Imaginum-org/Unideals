import { Check, Lightbulb, Minus, Plus } from "lucide-react";
import { cn } from "../../../../utils/cn.js";
import { CARD, inputClass } from "../../../product/components/listing/ListingKit.jsx";
import { STEPS } from "./listingForm.js";

/*
 * Small pieces for the Rent & Borrow listing flow. The flow itself reuses
 * the Sell flow's kit (FormSection, Field, ChoiceChips, StepFooter), so the
 * two look and behave the same.
 */

/** Numbered progress, same markup as the Sell flow's Stepper. Done steps are buttons. */
export function RentStepper({ step, canJump, onJump }) {
  const total = STEPS.length;
  return (
    <nav aria-label="Listing progress" className="w-full">
      <ol className="flex items-center">
        {STEPS.map((s, i) => {
          const done = step > s.id;
          const active = step === s.id;
          const clickable = !active && canJump(s.id);
          const Tag = clickable ? "button" : "div";
          return (
            <li key={s.id} className={cn("flex items-center", i < total - 1 && "flex-1")}>
              <Tag
                {...(clickable ? { type: "button", onClick: () => onJump(s.id), title: `Go to ${s.label}` } : {})}
                aria-current={active ? "step" : undefined}
                className={cn(
                  "group flex shrink-0 items-center gap-3 rounded-lg text-left",
                  clickable && "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)]",
                )}
              >
                <span
                  className={cn(
                    "grid h-8 w-8 place-items-center rounded-full text-[13px] font-bold transition-colors",
                    done && "bg-[var(--accent)] text-white group-hover:bg-[var(--accent-hover)]",
                    active && "bg-[var(--accent-soft)] text-[var(--accent-text)] ring-2 ring-[var(--accent)]",
                    !done && !active && "bg-neutral-100 text-slate-400 dark:bg-white/5 dark:text-zinc-500",
                  )}
                >
                  {done ? <Check className="h-4 w-4" strokeWidth={3} aria-hidden="true" /> : s.id}
                </span>
                <span className="hidden min-w-0 md:block">
                  <span
                    className={cn(
                      "block text-[13.5px] font-semibold leading-tight",
                      active ? "text-slate-900 dark:text-white" : done ? "text-slate-700 dark:text-zinc-200" : "text-slate-400 dark:text-zinc-500",
                    )}
                  >
                    {s.label}
                  </span>
                  <span className="block text-[12px] leading-tight text-slate-400 dark:text-zinc-500">{s.hint}</span>
                </span>
              </Tag>
              {i < total - 1 && (
                <span
                  aria-hidden="true"
                  className={cn("mx-3 h-0.5 flex-1 rounded-full transition-colors duration-300", done ? "bg-[var(--accent)]" : "bg-neutral-200 dark:bg-neutral-700")}
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/** Phones: thin step bars under the app bar title. */
export function StepBars({ step }) {
  return (
    <div className="flex gap-1 px-4 pb-2" aria-hidden="true">
      {STEPS.map((s) => (
        <span
          key={s.id}
          className={cn("h-1 flex-1 rounded-full transition-colors duration-300", s.id <= step ? "bg-[var(--accent)]" : "bg-neutral-200 dark:bg-neutral-700")}
        />
      ))}
    </div>
  );
}

/** ₹ amount field (digits only). */
export function MoneyInput({ id, value, onChange, maxDigits = 4, placeholder = "0", suffix, invalid, className }) {
  return (
    <div className={cn("relative", className)}>
      <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[15px] text-slate-400" aria-hidden="true">
        ₹
      </span>
      <input
        id={id}
        inputMode="numeric"
        autoComplete="off"
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, maxDigits))}
        placeholder={placeholder}
        aria-invalid={invalid || undefined}
        className={cn(inputClass(invalid), "h-11 pl-8", suffix && "pr-16")}
      />
      {suffix && (
        <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[13.5px] text-slate-400 dark:text-zinc-500">{suffix}</span>
      )}
    </div>
  );
}

export function QuantityStepper({ id, value, onChange, min = 1, max = 20, label }) {
  const set = (n) => onChange(Math.min(max, Math.max(min, n)));
  const btn =
    "grid h-11 w-11 place-items-center text-slate-600 transition-colors hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--accent-ring)] dark:text-zinc-300 dark:hover:bg-white/5";
  return (
    <div className="inline-flex items-center overflow-hidden rounded-lg border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-[#131313]">
      <button type="button" className={btn} onClick={() => set(value - 1)} disabled={value <= min} aria-label={`Fewer (${label})`}>
        <Minus className="h-4 w-4" aria-hidden="true" />
      </button>
      <input
        id={id}
        inputMode="numeric"
        value={value}
        onChange={(e) => set(Number(e.target.value.replace(/\D/g, "")) || min)}
        aria-label={label}
        className="h-11 w-12 border-x border-neutral-200 bg-transparent text-center text-[15px] font-semibold tabular-nums text-slate-900 outline-none dark:border-neutral-700 dark:text-white"
      />
      <button type="button" className={btn} onClick={() => set(value + 1)} disabled={value >= max} aria-label={`More (${label})`}>
        <Plus className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}

/** Quick-fill chips under a text field ("Block lobby", "Evenings"). */
export function QuickChips({ options, isActive, onPick, label, labelOf = (opt) => opt }) {
  return (
    <div className="mt-2 flex flex-wrap gap-1.5" role="group" aria-label={label}>
      {options.map((opt) => {
        const active = isActive(opt);
        return (
          <button
            key={opt}
            type="button"
            aria-pressed={active}
            onClick={() => onPick(opt)}
            className={cn(
              "inline-flex h-7 items-center rounded-md border px-2.5 text-[12.5px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)]",
              active
                ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent-text)]"
                : "border-neutral-200 bg-white text-slate-600 hover:border-neutral-300 hover:text-slate-900 dark:border-neutral-700 dark:bg-[#131313] dark:text-zinc-300 dark:hover:text-white",
            )}
          >
            {labelOf(opt)}
          </button>
        );
      })}
    </div>
  );
}

// Short, specific advice per step (same card as the Sell flow's TipsCard).
const TIPS = {
  1: {
    title: "Say exactly what it is",
    tips: ["Lead with brand + model, e.g. “Yonex Nanoray racket”.", "Mention what comes with it (cover, charger, shuttles).", "Be upfront about wear or quirks."],
  },
  2: {
    title: "A photo gets more requests",
    tips: ["Shoot in daylight against a plain background.", "Use the clearest shot as the cover.", "Show any scratches up close."],
  },
  3: {
    title: "Keep the handover easy",
    tips: ["A small fee or a deposit keeps things fair.", "Pick a common area, like the block lobby.", "Room numbers stay private; share them in the chat."],
  },
};

export function RentTipsCard({ step, className }) {
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
}
