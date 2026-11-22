import { useEffect, useRef, useState } from "react";
import { Check, Flag, ShieldCheck, X } from "lucide-react";
import ButtonLoader from "../../../components/ui/ButtonLoader.jsx";
import { cn } from "../../../utils/cn.js";

// Values must match REPORT_REASONS in backend/src/config/constants.js.
const PRODUCT_REASONS = [
  { value: "fake_or_misleading", label: "Fake or misleading", hint: "Photos, condition or details aren't true" },
  { value: "fraud_or_scam", label: "Fraud or scam", hint: "Asks for advance payment, fake QR, etc." },
  { value: "prohibited_item", label: "Prohibited item", hint: "Not allowed on Unideals" },
  { value: "sold_or_unavailable", label: "Already sold", hint: "Still listed but not available" },
  { value: "duplicate_listing", label: "Duplicate listing", hint: "Same item posted more than once" },
  { value: "wrong_category", label: "Wrong category", hint: "Listed in the wrong place" },
  { value: "spam_or_advertisement", label: "Spam or ads", hint: "Promotion, not a real item" },
  { value: "inappropriate_content", label: "Inappropriate content", hint: "Offensive photos or text" },
  { value: "other", label: "Something else" },
];

const USER_REASONS = [
  { value: "fraud_or_scam", label: "Fraud or scam", hint: "Took money, asked for advance, fake QR" },
  { value: "inappropriate_content", label: "Harassment or abuse", hint: "Rude, threatening or inappropriate messages" },
  { value: "fake_or_misleading", label: "Fake profile", hint: "Not a real student or pretending to be someone" },
  { value: "spam_or_advertisement", label: "Spam", hint: "Repeated or promotional messages" },
  { value: "fake_gender_girls_corner", label: "Fake gender for Girls Corner", hint: "Using Girls Corner with a false gender" },
  { value: "other", label: "Something else" },
];

const MIN = 10;
const MAX = 500;

/**
 * Report a user or a listing: pick a reason, add a short description.
 * Same dialog language as the rest of the site: bottom sheet on phones,
 * centred card from sm up, light and dark, above the header.
 */
const ReportUserModal = ({ open, userName, title, targetType = "user", submitting, onClose, onSubmit }) => {
  const isProduct = targetType === "product";
  const reasons = isProduct ? PRODUCT_REASONS : USER_REASONS;
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const textRef = useRef(null);

  useEffect(() => {
    if (open) {
      setReason("");
      setDescription("");
      setError("");
    }
  }, [open]);

  // Escape closes; the page behind doesn't scroll while the sheet is open.
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === "Escape" && !submitting && onClose?.();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose, submitting]);

  if (!open) return null;

  const send = (e) => {
    e?.preventDefault();
    if (!reason) {
      setError("Pick a reason.");
      return;
    }
    if (description.trim().length < MIN) {
      setError(`Add a little detail (at least ${MIN} characters) so our team can act quickly.`);
      textRef.current?.focus();
      return;
    }
    setError("");
    onSubmit?.(reason, description.trim());
  };

  const subject = isProduct ? title || "this listing" : title || userName || "this user";
  const heading = isProduct ? "Report listing" : "Report user";

  return (
    <div
      className="fixed inset-0 z-[999] flex items-end justify-center bg-black/50 backdrop-blur-sm animate-[fadeIn_150ms_ease-out] sm:items-center sm:p-4"
      onClick={() => !submitting && onClose?.()}
    >
      <form
        onSubmit={send}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-heading"
        noValidate
        className="flex max-h-[92dvh] w-full max-w-[460px] flex-col rounded-t-3xl border border-neutral-200 bg-white shadow-2xl sm:max-h-[88vh] sm:rounded-3xl dark:border-neutral-800 dark:bg-[#1A1D20]"
      >
        {/* Header */}
        <div className="flex items-start gap-3 px-5 pb-4 pt-5 sm:px-6 sm:pt-6">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400">
            <Flag className="h-[18px] w-[18px]" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id="report-heading" className="text-[17px] font-semibold text-slate-900 dark:text-white">
              {heading}
            </h2>
            <p className="mt-0.5 line-clamp-2 break-words text-[13px] text-slate-500 dark:text-zinc-400">{subject}</p>
          </div>
          <button
            type="button"
            onClick={() => onClose?.()}
            disabled={submitting}
            aria-label="Close"
            className="-mr-1.5 -mt-1 grid h-10 w-10 shrink-0 place-items-center rounded-lg text-slate-400 hover:bg-neutral-100 hover:text-slate-700 dark:hover:bg-white/5 dark:hover:text-white"
          >
            <X className="h-[18px] w-[18px]" />
          </button>
        </div>

        {/* Body (scrolls on short screens) */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 sm:px-6">
          <fieldset>
            <legend className="mb-2 text-[13px] font-semibold text-slate-800 dark:text-zinc-200">What&apos;s wrong?</legend>
            <div role="radiogroup" className="grid gap-1.5 sm:grid-cols-2">
              {reasons.map((r) => {
                const on = reason === r.value;
                return (
                  <button
                    key={r.value}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => {
                      setReason(r.value);
                      if (error) setError("");
                    }}
                    className={cn(
                      "flex min-h-[44px] items-start gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-[border-color,background-color]",
                      "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-red-100 dark:focus-visible:ring-red-950/50",
                      on
                        ? "border-red-300 bg-red-50/70 dark:border-red-800 dark:bg-red-950/20"
                        : "border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50 dark:border-neutral-700 dark:hover:border-neutral-600 dark:hover:bg-white/[0.03]",
                    )}
                  >
                    <span
                      className={cn(
                        "mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full border",
                        on ? "border-red-600 bg-red-600 text-white dark:border-red-500 dark:bg-red-500" : "border-neutral-300 dark:border-neutral-600",
                      )}
                      aria-hidden="true"
                    >
                      {on && <Check className="h-2.5 w-2.5" strokeWidth={3.5} />}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[13.5px] font-medium leading-snug text-slate-900 dark:text-white">{r.label}</span>
                      {r.hint && <span className="mt-0.5 block text-[11.5px] leading-snug text-slate-500 dark:text-zinc-400">{r.hint}</span>}
                    </span>
                  </button>
                );
              })}
            </div>
          </fieldset>

          <label htmlFor="report-description" className="mb-1.5 mt-4 block text-[13px] font-semibold text-slate-800 dark:text-zinc-200">
            Tell us what happened
          </label>
          <textarea
            id="report-description"
            ref={textRef}
            value={description}
            onChange={(e) => {
              setDescription(e.target.value.slice(0, MAX));
              if (error && reason) setError("");
            }}
            rows={3}
            placeholder={isProduct ? "e.g. Photos are from the internet, seller says it's not available." : "e.g. Asked me to pay in advance on UPI, then stopped replying."}
            className="w-full resize-none rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-[16px] text-slate-900 outline-none placeholder:text-slate-400 focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent-soft)] sm:text-[14px] dark:border-neutral-700 dark:bg-[#131313] dark:text-white dark:placeholder:text-zinc-500"
          />
          <div className="mt-1 flex items-start justify-between gap-3 text-[12px]">
            {error ? (
              <span role="alert" className="font-medium text-red-600 dark:text-red-400">
                {error}
              </span>
            ) : (
              <span className="text-slate-400 dark:text-zinc-500">At least {MIN} characters</span>
            )}
            <span className="shrink-0 tabular-nums text-slate-400 dark:text-zinc-500">
              {description.length}/{MAX}
            </span>
          </div>

          <p className="mb-1 mt-3 flex items-start gap-1.5 text-[12px] leading-snug text-slate-500 dark:text-zinc-400">
            <ShieldCheck className="mt-px h-3.5 w-3.5 shrink-0 text-emerald-500" aria-hidden="true" />
            {isProduct
              ? "Confidential. The seller won't know who reported this listing."
              : "Confidential. They won't know you reported them."}
          </p>
        </div>

        {/* Footer */}
        <div className="grid grid-cols-2 gap-2.5 border-t border-neutral-100 px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4 sm:px-6 sm:pb-6 dark:border-neutral-800">
          <button
            type="button"
            onClick={() => onClose?.()}
            disabled={submitting}
            className="h-11 rounded-lg border border-neutral-200 bg-white text-[14px] font-semibold text-slate-700 hover:bg-neutral-50 disabled:opacity-60 dark:border-neutral-700 dark:bg-[#1A1D20] dark:text-zinc-200 dark:hover:bg-white/5"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="h-11 rounded-lg bg-red-600 text-[14px] font-semibold text-white transition-colors hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 disabled:opacity-60"
          >
            <ButtonLoader loading={submitting} loadingText="Sending…">
              Send report
            </ButtonLoader>
          </button>
        </div>
      </form>
    </div>
  );
};

export default ReportUserModal;
