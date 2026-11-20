import { useEffect, useState } from "react";
import { CheckCircle2, ChevronDown, Circle, Sparkles } from "lucide-react";
import { getPasswordChecks, getPasswordStrength } from "../utils/passwordStrength";

const SEGMENTS = 4;
const FILLED = { weak: 1, fair: 2, good: 3, strong: 4 };

function PasswordStrengthMeter({ password, onSuggest, className = "" }) {
  const [open, setOpen] = useState(false);
  const strength = getPasswordStrength(password);
  const checks = getPasswordChecks(password);
  const metCount = checks.filter((c) => c.met).length;

  // Open the checklist as soon as the user starts typing.
  useEffect(() => {
    if (password && password.length > 0) setOpen(true);
  }, [password ? true : false]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!password) return null;

  const filled = FILLED[strength.level] ?? 0;

  return (
    <div className={`auth-pop ${className}`}>
      {/* Segmented strength bar */}
      <div className="mt-2.5 flex items-center gap-3">
        <div className="grid min-w-0 flex-1 grid-cols-4 gap-1.5" aria-hidden="true">
          {Array.from({ length: SEGMENTS }).map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-colors duration-300 ${
                i < filled ? strength.barClass : "bg-slate-200 dark:bg-white/10"
              }`}
            />
          ))}
        </div>
        <p
          className="w-12 shrink-0 text-right font-figtree text-[0.75rem] font-semibold leading-none text-slate-600 dark:text-zinc-300"
          aria-live="polite"
        >
          <span className="sr-only">Password strength: </span>
          {strength.message}
        </p>
      </div>

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="mt-2.5 flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-left text-[0.8125rem] font-semibold text-slate-700 transition hover:border-[#393AF2]/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#393AF2]/40 dark:border-white/10 dark:bg-[#1b1c20] dark:text-zinc-200"
      >
        <span>
          Password requirements{" "}
          <span className="text-[#393AF2] dark:text-[#9A9BFF]">{metCount}/5</span>
        </span>
        <ChevronDown
          size={15}
          className={`shrink-0 text-slate-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      <div
        className={`grid transition-[grid-template-rows] duration-200 ease-out ${
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
          <ul className="grid gap-x-4 gap-y-1.5 px-1 pb-0.5 pt-2.5 sm:grid-cols-2">
            {checks.map((c) => (
              <li key={c.id} className="flex items-center gap-2">
                {c.met ? (
                  <CheckCircle2
                    size={15}
                    strokeWidth={2.5}
                    className="shrink-0 text-emerald-600 dark:text-emerald-400"
                  />
                ) : (
                  <Circle size={15} className="shrink-0 text-slate-300 dark:text-zinc-600" />
                )}
                <span
                  className={`text-[0.75rem] font-medium ${
                    c.met ? "text-emerald-700 dark:text-emerald-300" : "text-slate-500 dark:text-zinc-400"
                  }`}
                >
                  {c.label}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {onSuggest && (
        <button
          type="button"
          onClick={onSuggest}
          className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-[#393AF2]/40 bg-[#393AF2]/5 px-3 py-2 text-[0.8125rem] font-semibold text-[#393AF2] transition hover:bg-[#393AF2]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#393AF2]/40 dark:border-[#9A9BFF]/40 dark:text-[#9A9BFF]"
        >
          <Sparkles size={14} />
          Suggest a strong password
        </button>
      )}
    </div>
  );
}

export default PasswordStrengthMeter;
