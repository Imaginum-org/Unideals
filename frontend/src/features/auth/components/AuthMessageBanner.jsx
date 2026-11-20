import { CircleAlert, CircleCheck, Info } from "lucide-react";

const VARIANTS = {
  success: {
    icon: CircleCheck,
    box: "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-100",
    iconClass: "text-emerald-600 dark:text-emerald-400",
  },
  error: {
    icon: CircleAlert,
    box: "border-red-200 bg-red-50 text-red-900 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-100",
    iconClass: "text-red-500 dark:text-red-400",
  },
  info: {
    icon: Info,
    box: "border-sky-200 bg-sky-50 text-sky-950 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-100",
    iconClass: "text-sky-600 dark:text-sky-400",
  },
};

function AuthMessageBanner({ variant = "error", children, className = "" }) {
  if (children == null || children === "") return null;

  const v = VARIANTS[variant] ?? VARIANTS.error;
  const Icon = v.icon;

  return (
    <div
      role={variant === "error" ? "alert" : "status"}
      className={`auth-pop flex items-start gap-2.5 rounded-xl border px-3.5 py-3 font-figtree text-[0.8125rem] leading-snug sm:text-sm ${v.box} ${className}`}
    >
      <Icon className={`mt-px size-4 shrink-0 ${v.iconClass}`} aria-hidden="true" />
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export default AuthMessageBanner;
