import { useEffect, useState } from "react";
import { Flag, X } from "lucide-react";
import { INPUT_BASE, SELL_BTN } from "../utils/chatTheme.js";

const REASONS = [
  { value: "spam_or_advertisement", label: "Spam or ads" },
  { value: "fake_or_misleading", label: "Fake or misleading" },
  { value: "inappropriate_content", label: "Inappropriate content" },
  { value: "fraud_or_scam", label: "Fraud or scam" },
  { value: "prohibited_item", label: "Prohibited item" },
  { value: "duplicate_listing", label: "Duplicate listing" },
  { value: "wrong_category", label: "Wrong category" },
  { value: "sold_or_unavailable", label: "Sold or unavailable" },
  { value: "other", label: "Other" },
];

/**
 * Report-a-user modal: reason dropdown + description + Send/Cancel.
 * White card in both themes (matches the offer popup language).
 */
const ReportUserModal = ({ open, userName, submitting, onClose, onSubmit }) => {
  const [reason, setReason] = useState("spam_or_advertisement");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setReason("spam_or_advertisement");
      setDescription("");
      setError("");
    }
  }, [open ]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const send = () => {
    if (description.trim().length < 10) {
      setError(
        "Give a little detail (min 10 characters) so our team can act fast.",
      );
      return;
    }
    setError("");
    onSubmit?.(reason, description.trim());
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
      onClick={() => onClose?.()}
      role="dialog"
      aria-modal="true"
      aria-label={`Report ${userName || "user"}`}
    >
      <div
        className="w-full max-w-sm rounded-xl bg-white shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 pt-4">
          <p className="flex items-center gap-2 font-bold text-[15px] text-zinc-900">
            <span className="size-8 rounded-full bg-red-50 text-red-500 flex items-center justify-center shrink-0">
              <Flag size={16} />
            </span>
            Report {userName || "user"}?
          </p>
          <button
            onClick={() => onClose?.()}
            aria-label="Close report dialog"
            className="p-1.5 rounded-full text-zinc-400 hover:bg-zinc-100"
          >
            <X size={18} />
          </button>
        </div>
        <p className="px-4 mt-1 text-xs text-zinc-500">
          Seen something sus? Tell us what went down. Our team reviews every
          report.
        </p>
        <div className="p-4 space-y-3">
          <label className="block text-xs font-semibold text-zinc-500">
            Reason
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className={`${INPUT_BASE} mt-1 w-full px-3 py-2.5 text-base sm:text-sm`}
            >
              {REASONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-semibold text-zinc-500">
            Description
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="What happened? (min 10 characters)"
              className={`${INPUT_BASE} mt-1 w-full px-3 py-2.5 text-base sm:text-sm resize-none`}
            />
          </label>
          {error && <p className="text-[11px] font-semibold text-red-500">{error}</p>}
          <div className="flex gap-2 pt-1">
            <button
              onClick={() => onClose?.()}
              className="flex-1 px-4 py-2.5 rounded-lg border border-zinc-200 text-sm font-medium text-zinc-600 hover:bg-zinc-50 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={send}
              disabled={submitting}
              className={`${SELL_BTN} flex-1 px-4 py-2.5 text-sm`}
            >
              {submitting ? "Sending…" : "Send report"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportUserModal;
