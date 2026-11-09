import { useEffect, useState } from "react";
import { Flag, X } from "lucide-react";
import ButtonLoader from "../../../components/ui/ButtonLoader.jsx";
import Select from "../../../components/ui/Select.jsx";

const REASONS = [
  { value: "spam_or_advertisement", label: "Spam or ads" },
  { value: "fake_or_misleading", label: "Fake or misleading" },
  { value: "inappropriate_content", label: "Inappropriate content" },
  { value: "fraud_or_scam", label: "Fraud or scam" },
  { value: "prohibited_item", label: "Prohibited item" },
  { value: "duplicate_listing", label: "Duplicate listing" },
  { value: "wrong_category", label: "Wrong category" },
  { value: "sold_or_unavailable", label: "Sold or unavailable" },
  { value: "fake_gender_girls_corner", label: "Fake gender to access Girls Corner" },
  { value: "other", label: "Other" },
];

/**
 * Report a user or a listing: reason + description. Bottom sheet on
 * phones, centred dialog on larger screens; themed for light and dark.
 */
const ReportUserModal = ({ open, userName, title, targetType = "user", submitting, onClose, onSubmit }) => {
  const [reason, setReason] = useState("spam_or_advertisement");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setReason("spam_or_advertisement");
      setDescription("");
      setError("");
    }
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === "Escape" && onClose?.();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const send = (e) => {
    e?.preventDefault();
    if (description.trim().length < 10) {
      setError("Add a little detail (at least 10 characters) so our team can act quickly.");
      return;
    }
    setError("");
    onSubmit?.(reason, description.trim());
  };

  const displayName = title || (targetType === "product" ? "this listing" : userName || "this user");

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={() => onClose?.()}
      role="dialog"
      aria-modal="true"
      aria-label={`Report ${displayName}`}
    >
      <form
        onSubmit={send}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-t-3xl border border-neutral-200 bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl sm:rounded-3xl sm:p-6 dark:border-neutral-800 dark:bg-[#1A1D20]"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400">
              <Flag className="h-4 w-4" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h2 className="truncate text-[16px] font-semibold text-slate-900 dark:text-white">Report {displayName}</h2>
              <p className="mt-0.5 text-[12.5px] text-slate-500 dark:text-zinc-400">Reports are confidential and reviewed by our team.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onClose?.()}
            aria-label="Close report dialog"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-400 hover:bg-neutral-100 hover:text-slate-700 dark:hover:bg-white/5 dark:hover:text-white"
          >
            <X className="h-[18px] w-[18px]" />
          </button>
        </div>

        <div className="mt-5 space-y-4">
          <div>
            <span className="mb-1.5 block text-[13px] font-semibold text-slate-800 dark:text-zinc-200">Reason</span>
            <Select value={reason} onChange={setReason} options={REASONS} ariaLabel="Report reason" />
          </div>
          <div>
            <label htmlFor="report-description" className="mb-1.5 block text-[13px] font-semibold text-slate-800 dark:text-zinc-200">
              What happened?
            </label>
            <textarea
              id="report-description"
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, 500))}
              rows={4}
              placeholder="Be specific: messages, dates, what went wrong."
              className="w-full resize-none rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-[16px] text-slate-900 outline-none placeholder:text-slate-400 focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent-soft)] sm:text-[14px] dark:border-neutral-700 dark:bg-[#131313] dark:text-white"
            />
            <div className="mt-1 flex items-center justify-between text-[12px]">
              {error ? <span className="font-medium text-red-600 dark:text-red-400">{error}</span> : <span />}
              <span className="tabular-nums text-slate-400">{description.length}/500</span>
            </div>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => onClose?.()}
            className="h-11 rounded-lg border border-neutral-200 text-[14px] font-semibold text-slate-700 hover:bg-neutral-50 dark:border-neutral-700 dark:text-zinc-200 dark:hover:bg-white/5"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="h-11 rounded-lg bg-red-600 text-[14px] font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-60"
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
