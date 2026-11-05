import { useEffect, useState } from "react";
import { CheckCircle2, ChevronDown, Circle, Sparkles } from "lucide-react";
import { getPasswordChecks, getPasswordStrength } from "../utils/passwordStrength";

function PasswordStrengthMeter({ password, email, onSuggest, className = "" }) {
  const [open, setOpen] = useState(false);
  const strength = getPasswordStrength(password);
  const checks = getPasswordChecks(password);
  const metCount = checks.filter((c) => c.met).length;

  // Open the checklist as soon as the user starts typing.
  useEffect(() => {
    if (password && password.length > 0) setOpen(true);
  }, [password ? true : false]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!password) return null;

  const label =
    strength.level === "awesome" ? "Strong" : strength.message.split(".")[0];

  return (
    <div className={className}>
      <div className="mt-2 flex items-center gap-3">
        <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-slate-200/80 dark:bg-zinc-700">
          <div
            className={`h-full rounded-full transition-all duration-300 ease-out ${strength.barClass}`}
            style={{ width: `${strength.widthPct}%` }}
          />
        </div>
        <p
          className="shrink-0 whitespace-nowrap font-figtree text-[0.6875rem] font-semibold leading-none text-gray-600 dark:text-gray-400 sm:text-xs"
          title={strength.message}
          aria-label={strength.message}
        >
          {label}
        </p>
      </div>

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="mt-1.5 flex w-full items-center justify-between rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-left text-xs font-semibold text-zinc-700 transition hover:border-[#393AF2]/50 dark:border-zinc-700 dark:bg-[#1A1D20] dark:text-zinc-200"
      >
        <span>
          Password must have{" "}
          <span className="text-[#393AF2] dark:text-[#8FA2FF]">
            {metCount}/5
          </span>
        </span>
        <ChevronDown
          size={15}
          className={`shrink-0 text-zinc-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      <div
        className={`grid transition-[grid-template-rows] duration-200 ease-out ${
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
          <ul className="space-y-1 px-1 pb-0.5 pt-2">
            {checks.map((c) => (
              <li key={c.id} className="flex items-center gap-2">
                {c.met ? (
                  <CheckCircle2 size={15} strokeWidth={2.5} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <Circle size={15} className="shrink-0 text-zinc-300 dark:text-zinc-600" />
                )}
                <span
                  className={`text-xs font-medium ${
                    c.met
                      ? "text-emerald-700 dark:text-emerald-300"
                      : "text-zinc-500 dark:text-zinc-400"
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
          className="mt-1.5 flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-[#393AF2]/40 bg-[#393AF2]/5 px-3 py-1.5 text-xs font-semibold text-[#393AF2] transition hover:bg-[#393AF2]/10 dark:text-[#8FA2FF]"
        >
          <Sparkles size={14} />
          Suggest a strong password for me
        </button>
      )}
    </div>
  );
}

export default PasswordStrengthMeter;
