import { getPasswordStrength } from "../utils/passwordStrength";

function PasswordStrengthMeter({ password, className = "" }) {
  const strength = getPasswordStrength(password);
  if (!password || !strength) return null;
  const label =
    strength.level === "awesome" ? "Strong" : strength.message.split(".")[0];

  return (
    <div className={`mt-2 flex items-center gap-3 ${className}`}>
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
  );
}

export default PasswordStrengthMeter;
