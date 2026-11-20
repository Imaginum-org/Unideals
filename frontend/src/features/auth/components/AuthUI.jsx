import { useId } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check, ExternalLink, Eye, EyeOff, TriangleAlert } from "lucide-react";
import ButtonLoader from "../../../components/ui/ButtonLoader.jsx";
import { cn } from "../../../utils/cn.js";

/*
 * Building blocks shared by the auth screens. Styling for the floating
 * label, autofill and button sheen lives in ../styles/auth.css.
 */

const BRAND_FOCUS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#393AF2]/45 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--auth-page)]";

export function AuthHeading({ title, subtitle, align = "left", className }) {
  return (
    <div className={cn("mb-6", align === "center" && "text-center", className)}>
      <h1 className="text-[1.625rem] font-semibold leading-[1.15] tracking-[-0.02em] text-slate-900 dark:text-white sm:text-[1.75rem]">
        {title}
      </h1>
      {subtitle ? (
        <p className="mt-2 text-[0.9375rem] leading-relaxed text-slate-500 dark:text-zinc-400">{subtitle}</p>
      ) : null}
    </div>
  );
}

/**
 * Outlined input with a notched floating label (Google / Material style)
 * and a leading icon. When focused or filled, the label moves onto the top
 * border and the border opens a real gap around it: the outline is a
 * <fieldset> whose <legend> carries an invisible copy of the label, so the
 * notch is always exactly the label's width.
 *
 * Extra props go straight to the <input>. `trailing` renders buttons or
 * badges inside the right edge (password toggle, match tick, …).
 */
export function AuthField({
  icon: Icon,
  label,
  id,
  error = false,
  trailing = null,
  trailingWidth = "md",
  className,
  ...inputProps
}) {
  const autoId = useId();
  const inputId = id || `auth-${autoId.replace(/[^a-zA-Z0-9]/g, "")}`;

  return (
    <div className={cn("relative", className)}>
      <input
        id={inputId}
        placeholder=" "
        aria-invalid={error || undefined}
        className={cn(
          // Borderless and transparent: the <fieldset> below draws the outline.
          "auth-input peer block h-[3.25rem] w-full rounded-xl border-0 bg-transparent pl-11 text-[0.9375rem] text-slate-900 outline-none dark:text-white",
          trailing ? (trailingWidth === "lg" ? "pr-[4.75rem]" : "pr-12") : "pr-4",
        )}
        {...inputProps}
      />
      {Icon ? (
        <Icon
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute left-4 top-1/2 size-[1.125rem] -translate-y-1/2 transition-colors duration-200",
            error
              ? "text-red-400"
              : "text-slate-400 peer-focus:text-[#393AF2] dark:text-zinc-500 dark:peer-focus:text-[#9A9BFF]",
          )}
        />
      ) : null}
      <label htmlFor={inputId} className="auth-float-label">
        {label}
      </label>
      <fieldset aria-hidden="true" className="auth-outline">
        <legend>
          <span>{label}</span>
        </legend>
      </fieldset>
      {trailing ? (
        <div className="absolute inset-y-0 right-1.5 flex items-center gap-0.5">{trailing}</div>
      ) : null}
    </div>
  );
}

export function PasswordToggle({ shown, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={shown ? "Hide password" : "Show password"}
      aria-pressed={shown}
      className={cn(
        "grid size-9 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:text-zinc-500 dark:hover:bg-white/5 dark:hover:text-zinc-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#393AF2]/45",
      )}
    >
      {shown ? <EyeOff className="size-[1.125rem]" /> : <Eye className="size-[1.125rem]" />}
    </button>
  );
}

/** Small green tick shown inside a field once its value is good. */
export function FieldTick({ show, label = "Looks good" }) {
  if (!show) return null;
  return (
    <span
      className="auth-pop grid size-6 place-items-center rounded-full bg-emerald-500/[0.12] text-emerald-600 dark:text-emerald-400"
      title={label}
    >
      <Check className="size-3.5" strokeWidth={3} aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </span>
  );
}

export function CapsLockHint({ show }) {
  if (!show) return null;
  return (
    <p role="status" className="auth-pop mt-2 flex items-center gap-1.5 text-[0.8125rem] font-medium text-amber-600 dark:text-amber-400">
      <TriangleAlert className="size-3.5" aria-hidden="true" />
      Caps Lock is on
    </p>
  );
}

export function AuthPrimaryButton({
  loading = false,
  loadingText,
  children,
  withArrow = true,
  className,
  type = "submit",
  disabled,
  ...props
}) {
  return (
    <button
      type={type}
      disabled={loading || disabled}
      className={cn(
        "auth-btn-primary group relative inline-flex h-12 w-full items-center justify-center overflow-hidden rounded-xl bg-[#393AF2] px-5 text-[0.9375rem] font-semibold text-white",
        "shadow-[0_10px_24px_-10px_rgba(57,58,242,0.75)] transition duration-200 hover:bg-[#2F30E0] hover:shadow-[0_14px_30px_-12px_rgba(57,58,242,0.85)] active:translate-y-px",
        "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#393AF2]/30",
        "disabled:cursor-not-allowed disabled:opacity-70 disabled:shadow-none",
        className,
      )}
      {...props}
    >
      <span className="relative inline-flex items-center gap-2">
        <ButtonLoader loading={loading} loadingText={loadingText}>
          {children}
          {withArrow ? (
            <ArrowRight
              aria-hidden="true"
              className="size-4 transition-transform duration-200 group-hover:translate-x-0.5"
            />
          ) : null}
        </ButtonLoader>
      </span>
    </button>
  );
}

const SECONDARY =
  "inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-[0.9375rem] font-semibold text-slate-700 shadow-[0_1px_2px_rgba(15,23,42,0.05)] transition hover:border-slate-300 hover:bg-slate-50 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-[#1b1c20] dark:text-zinc-100 dark:hover:border-white/20 dark:hover:bg-[#212227]";

export function AuthSecondaryButton({ className, type = "button", children, ...props }) {
  return (
    <button type={type} className={cn(SECONDARY, BRAND_FOCUS, className)} {...props}>
      {children}
    </button>
  );
}

/** Opens the user's webmail in a new tab (see utils/mailProvider.js). */
export function OpenMailButton({ provider, className }) {
  if (!provider) return null;
  return (
    <a
      href={provider.url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(SECONDARY, BRAND_FOCUS, className)}
    >
      Open {provider.name}
      <ExternalLink className="size-4 text-slate-400 dark:text-zinc-500" aria-hidden="true" />
    </a>
  );
}

export function AuthDivider({ label }) {
  return (
    <div className="my-5 flex items-center gap-3" role="separator">
      <span className="h-px flex-1 bg-slate-200 dark:bg-white/10" />
      <span className="text-[0.8125rem] text-slate-400 dark:text-zinc-500">{label}</span>
      <span className="h-px flex-1 bg-slate-200 dark:bg-white/10" />
    </div>
  );
}

const STATUS_TONES = {
  brand: { text: "text-[#393AF2] dark:text-[#9A9BFF]", ring: "bg-[#393AF2]/10 dark:bg-[#9A9BFF]/15" },
  success: { text: "text-emerald-500 dark:text-emerald-400", ring: "bg-emerald-500/[0.12]" },
  danger: { text: "text-red-500 dark:text-red-400", ring: "bg-red-500/10" },
};

/** Icon in a soft disc with echo rings (inbox sent, success, expired link). */
export function AuthStatusIcon({ icon: Icon, tone = "brand", className }) {
  const t = STATUS_TONES[tone] ?? STATUS_TONES.brand;
  return (
    <div
      aria-hidden="true"
      className={cn("auth-status relative mx-auto mb-6 grid size-[4.5rem] place-items-center rounded-full", t.text, className)}
    >
      <span className={cn("relative z-[1] grid size-[4.5rem] place-items-center rounded-full", t.ring)}>
        <span className="grid size-12 place-items-center rounded-full bg-white shadow-[0_6px_16px_-6px_rgba(15,23,42,0.25)] dark:bg-[#1f2025]">
          <Icon className="size-[1.375rem]" strokeWidth={2.2} />
        </span>
      </span>
    </div>
  );
}

export function AuthCheckbox({ checked, onChange, required, children }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 text-[0.8125rem] leading-snug text-slate-600 dark:text-zinc-400">
      <span className="relative mt-px grid size-[1.125rem] shrink-0 place-items-center">
        <input
          type="checkbox"
          checked={checked}
          onChange={onChange}
          required={required}
          className="peer size-[1.125rem] cursor-pointer appearance-none rounded-[6px] border border-slate-300 bg-white transition checked:border-[#393AF2] checked:bg-[#393AF2] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#393AF2]/20 dark:border-white/20 dark:bg-[#1b1c20] dark:checked:border-[#5A5BFF] dark:checked:bg-[#5A5BFF]"
        />
        <Check
          aria-hidden="true"
          className="pointer-events-none absolute size-3 text-white opacity-0 transition peer-checked:opacity-100"
          strokeWidth={3.5}
        />
      </span>
      <span>{children}</span>
    </label>
  );
}

export function AuthBackLink({ to, children = "Back to log in" }) {
  return (
    <Link
      to={to}
      className={cn(
        "group inline-flex items-center gap-1.5 rounded-md text-[0.875rem] font-medium text-slate-500 transition hover:text-[#393AF2] dark:text-zinc-400 dark:hover:text-[#9A9BFF]",
        BRAND_FOCUS,
      )}
    >
      <ArrowLeft className="size-4 transition-transform duration-200 group-hover:-translate-x-0.5" aria-hidden="true" />
      {children}
    </Link>
  );
}

/** Inline brand link used in footers of forms ("Sign up", "Log in"). */
export const authLinkClass =
  "rounded font-semibold text-[#393AF2] transition hover:text-[#2426C7] dark:text-[#9A9BFF] dark:hover:text-[#B9BAFF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#393AF2]/45 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--auth-page)]";
