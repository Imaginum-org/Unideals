import { ArrowLeft, ArrowRight, Sparkles } from "lucide-react";
import { cn } from "../../../../utils/cn.js";
import BrandLoader from "../../../../components/ui/BrandLoader.jsx";

/*
 * Shared building blocks for the Sell / Edit listing flow.
 *
 * Same surface language as the product page (white cards, neutral borders,
 * --accent* tokens so Girl Mode + dark mode theme everything). Phones get
 * flush full-width sections and a docked action bar, like native apps.
 */

export const CARD =
  "rounded-2xl border border-neutral-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:border-neutral-800 dark:bg-[#1A1D20]";

export const FLUSH_ON_PHONE = "max-sm:-mx-4 max-sm:rounded-none max-sm:border-x-0 max-sm:shadow-none";

/** Text inputs / textareas: one look everywhere in the flow. */
export const inputClass = (invalid) =>
  cn(
    "w-full rounded-lg border bg-white px-3.5 text-[15px] text-slate-900 outline-none transition placeholder:text-slate-400",
    "focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent-soft)]",
    "dark:bg-[#131313] dark:text-white dark:placeholder:text-zinc-500",
    invalid ? "border-red-400 dark:border-red-500/70" : "border-neutral-200 dark:border-neutral-700",
  );

/** A titled card that groups related fields. */
export function FormSection({ title, description, icon: Icon, aside, className, children }) {
  return (
    <section className={cn(CARD, FLUSH_ON_PHONE, "p-4 sm:p-6", className)}>
      {(title || aside) && (
        <header className="mb-5 flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            {Icon && (
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent-text)]">
                <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
              </span>
            )}
            <div className="min-w-0">
              <h2 className="text-[16px] font-semibold tracking-tight text-slate-900 sm:text-[17px] dark:text-white">{title}</h2>
              {description && <p className="mt-0.5 text-[13px] text-slate-500 dark:text-zinc-400">{description}</p>}
            </div>
          </div>
          {aside}
        </header>
      )}
      {children}
    </section>
  );
}

/**
 * Label + control + hint/error + optional counter. `field` sets the
 * data-field hook the context uses to scroll to the first invalid field.
 */
export function Field({ label, htmlFor, required, optional, hint, error, counter, field, className, children }) {
  return (
    <div data-field={field} className={cn("min-w-0", className)}>
      {label && (
        <div className="mb-1.5 flex items-baseline justify-between gap-2">
          <label htmlFor={htmlFor} className="text-[13.5px] font-semibold text-slate-800 dark:text-zinc-200">
            {label}
            {required && <span className="ml-0.5 text-red-500" aria-hidden="true">*</span>}
            {optional && <span className="ml-1.5 text-[12px] font-normal text-slate-400 dark:text-zinc-500">Optional</span>}
          </label>
          {counter}
        </div>
      )}
      {children}
      {error ? (
        <p role="alert" className="mt-1.5 text-[12.5px] font-medium text-red-600 dark:text-red-400">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-[12.5px] text-slate-500 dark:text-zinc-400">{hint}</p>
      ) : null}
    </div>
  );
}

export function Counter({ value, max }) {
  const near = value > max * 0.9;
  return (
    <span className={cn("text-[12px] tabular-nums", near ? "text-amber-600" : "text-slate-400 dark:text-zinc-500")}>
      {value}/{max}
    </span>
  );
}

/** Single-choice chips (radio group) for short option lists. */
export function ChoiceChips({ options, value, onChange, ariaLabel, invalid, columns, disabled }) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn("grid gap-2", columns || "grid-cols-2 sm:grid-cols-3")}
    >
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={disabled}
            onClick={() => !disabled && onChange(opt.value)}
            className={cn(
              "flex min-h-11 items-center justify-center rounded-lg border px-3 py-2 text-center text-[13.5px] font-semibold leading-tight transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)] disabled:cursor-not-allowed",
              disabled && !active && "opacity-40",
              active
                ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent-text)]"
                : cn(
                    "bg-white text-slate-600 hover:border-[var(--accent-ring)] hover:text-slate-900 dark:bg-[#131313] dark:text-zinc-300 dark:hover:text-white",
                    invalid ? "border-red-300 dark:border-red-500/60" : "border-neutral-200 dark:border-neutral-700",
                  ),
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

/** Accessible on/off switch. `tone` swaps the on-colour (accent / pink). */
export function Switch({ checked, onChange, label, disabled, tone = "accent" }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={cn(
        "relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)] disabled:cursor-not-allowed disabled:opacity-70",
        checked ? (tone === "pink" ? "bg-pink-500" : "bg-[var(--accent)]") : "bg-neutral-300 dark:bg-neutral-600",
      )}
    >
      <span
        className={cn(
          "inline-block h-5 w-5 rounded-full bg-white shadow transition-transform",
          checked ? "translate-x-6" : "translate-x-1",
        )}
      />
    </button>
  );
}

/**
 * Step actions. Desktop: inline row under the form. Phones: docked bar
 * (safe-area aware) so the primary action is always under the thumb.
 */
export function StepFooter({ onBack, backLabel = "Back", onNext, nextLabel = "Continue", nextIcon: NextIcon = ArrowRight, loading, loadingLabel, disabled, secondary }) {
  return (
    <>
      <div
        className={cn(
          "flex items-center gap-3",
          "max-sm:fixed max-sm:inset-x-0 max-sm:bottom-0 max-sm:z-50 max-sm:border-t max-sm:border-neutral-200/80 max-sm:bg-white/95 max-sm:px-4 max-sm:pb-[max(0.75rem,env(safe-area-inset-bottom))] max-sm:pt-3 max-sm:backdrop-blur-xl",
          "dark:max-sm:border-neutral-800 dark:max-sm:bg-[#16181B]/95",
          "sm:mt-2 sm:justify-between",
        )}
      >
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            disabled={loading}
            className="inline-flex h-12 items-center justify-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-4 text-[14px] font-semibold text-slate-700 transition-colors hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-700 dark:bg-[#1A1D20] dark:text-zinc-200 dark:hover:bg-white/5"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            <span className="max-sm:sr-only">{backLabel}</span>
          </button>
        ) : (
          <span className="hidden sm:block" />
        )}
        <div className="flex min-w-0 flex-1 items-center justify-end gap-3 sm:flex-none">
          {secondary}
          <button
            type="button"
            onClick={onNext}
            disabled={loading || disabled}
            className="group inline-flex h-12 min-w-0 flex-1 items-center justify-center gap-2 rounded-lg bg-[var(--accent)] px-6 text-[15px] font-semibold text-white shadow-sm transition-colors hover:bg-[var(--accent-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70 sm:flex-none sm:min-w-[160px] dark:focus-visible:ring-offset-[#131313]"
          >
            {loading ? (
              <>
                <BrandLoader size="sm" tone="white" />
                <span className="truncate">{loadingLabel || "Working…"}</span>
              </>
            ) : (
              <>
                <span className="truncate">{nextLabel}</span>
                {NextIcon && <NextIcon className="h-[18px] w-[18px] transition-transform group-hover:translate-x-0.5" aria-hidden="true" />}
              </>
            )}
          </button>
        </div>
      </div>
    </>
  );
}

/** Marks a value the form filled in for the seller (editable any time). */
export function AutoTag({ show, label = "Auto-filled" }) {
  if (!show) return null;
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-[11px] font-semibold text-[var(--accent-text)]">
      <Sparkles className="h-3 w-3" aria-hidden="true" />
      {label}
    </span>
  );
}
