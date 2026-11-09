import { Check } from "lucide-react";
import { STEPPER_STEPS } from "./stepperData";
import useProductListing from "../../hooks/useProductListing";
import { cn } from "../../../../utils/cn.js";

/**
 * Numbered progress for the listing flow. Completed steps are buttons, so
 * sellers can jump back to fix something; future steps stay locked (each
 * step validates on Continue).
 */
const Stepper = () => {
  const { step, goToStep } = useProductListing();
  const total = STEPPER_STEPS.length;
  const current = STEPPER_STEPS[step - 1];

  return (
    <nav aria-label="Listing progress" className="w-full">
      {/* Phones: compact label + bar */}
      <div className="sm:hidden">
        <div className="flex items-baseline justify-between">
          <p className="text-[13px] font-semibold text-[var(--accent-text)]">
            Step {step} of {total}
          </p>
          <p className="text-[13px] font-medium text-slate-600 dark:text-zinc-300">{current?.label}</p>
        </div>
        <div className="mt-2 flex gap-1.5" aria-hidden="true">
          {STEPPER_STEPS.map((s) => (
            <span
              key={s.id}
              className={cn(
                "h-1.5 flex-1 rounded-full transition-colors duration-300",
                s.id <= step ? "bg-[var(--accent)]" : "bg-neutral-200 dark:bg-neutral-700",
              )}
            />
          ))}
        </div>
      </div>

      {/* sm+: numbered steps with connectors */}
      <ol className="hidden items-center sm:flex">
        {STEPPER_STEPS.map((s, i) => {
          const done = step > s.id;
          const active = step === s.id;
          const Tag = done ? "button" : "div";
          return (
            <li key={s.id} className={cn("flex items-center", i < total - 1 && "flex-1")}>
              <Tag
                {...(done ? { type: "button", onClick: () => goToStep(s.id), title: `Back to ${s.label}` } : {})}
                aria-current={active ? "step" : undefined}
                className={cn(
                  "group flex shrink-0 items-center gap-3 rounded-lg text-left",
                  done && "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)]",
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
                  className={cn(
                    "mx-3 h-0.5 flex-1 rounded-full transition-colors duration-300",
                    done ? "bg-[var(--accent)]" : "bg-neutral-200 dark:bg-neutral-700",
                  )}
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

export default Stepper;
