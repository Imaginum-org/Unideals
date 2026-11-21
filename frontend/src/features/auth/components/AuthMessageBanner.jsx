function AuthMessageBanner({ variant = "error", children, className = "" }) {
  if (children == null || children === "") return null;

  const variants = {
    success:
      "border-emerald-500/55 bg-emerald-50 text-emerald-900 dark:border-emerald-500/50 dark:bg-emerald-950/35 dark:text-emerald-100",
    error:
      "border-red-500/50 bg-red-50 text-red-900 dark:border-red-500/45 dark:bg-red-950/40 dark:text-red-100",
    info: "border-sky-500/45 bg-sky-50 text-sky-950 dark:border-sky-500/40 dark:bg-sky-950/35 dark:text-sky-100",
  };

  return (
    <div
      role="alert"
      className={`rounded-lg border px-3.5 py-3 font-figtree text-[0.8125rem] leading-snug sm:text-sm ${variants[variant] ?? variants.error} ${className}`}
    >
      {children}
    </div>
  );
}

export default AuthMessageBanner;
