import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { rateSeller } from "../api/reviewApi.js";
import { toast } from "../../../components/ui/toast.js";
import { btnPrimary, btnSecondary } from "./account/AccountKit.jsx";
import { cn } from "../../../utils/cn.js";

const LABELS = ["", "Poor", "Could be better", "Okay", "Good", "Excellent"];

export function Star({ filled, className, style }) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className={className} style={style}>
      <path
        d="M10 1.6l2.47 5.2 5.68.66-4.2 3.88 1.13 5.6L10 14.1l-5.08 2.84 1.13-5.6-4.2-3.88 5.68-.66L10 1.6z"
        fill={filled ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function StarRow({ value = 0, size = "h-4 w-4", className }) {
  return (
    <span className={cn("inline-flex items-center gap-0.5 text-amber-400", className)} aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} filled={i <= Math.round(value)} className={cn(size, i > Math.round(value) && "text-slate-300 dark:text-zinc-600")} />
      ))}
    </span>
  );
}

/** Buyer rates the seller after a completed deal. */
export default function RateSellerDialog({ open, onClose, conversationId, sellerName, productTitle, onRated }) {
  const [stars, setStars] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return undefined;
    setStars(0);
    setHover(0);
    setComment("");
    const onKey = (e) => e.key === "Escape" && onClose?.();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  const shown = hover || stars;

  const submit = async () => {
    if (!stars) return;
    setSaving(true);
    try {
      await rateSeller(conversationId, stars, comment);
      toast.success("Thanks! Your rating helps other students.");
      onRated?.(stars);
      onClose?.();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not save your rating");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Rate the seller"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-t-3xl border border-neutral-200 bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] font-figtree shadow-2xl sm:rounded-3xl dark:border-neutral-800 dark:bg-[#1A1D20]"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-[17px] font-semibold text-slate-900 dark:text-white">Rate {sellerName || "the seller"}</h2>
            {productTitle && <p className="truncate text-[13px] text-slate-500 dark:text-zinc-400">For {productTitle}</p>}
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-1.5 text-slate-400 hover:bg-neutral-100 hover:text-slate-700 dark:hover:bg-white/5">
            <X className="h-[18px] w-[18px]" />
          </button>
        </div>

        <div className="mt-5 flex flex-col items-center" onMouseLeave={() => setHover(0)}>
          <div className="flex gap-1.5" role="radiogroup" aria-label="Stars">
            {[1, 2, 3, 4, 5].map((i) => (
              <button
                key={i}
                type="button"
                role="radio"
                aria-checked={stars === i}
                aria-label={`${i} star${i > 1 ? "s" : ""}, ${LABELS[i]}`}
                onMouseEnter={() => setHover(i)}
                onFocus={() => setHover(i)}
                onBlur={() => setHover(0)}
                onClick={() => setStars(i)}
                className={cn("transition-transform hover:scale-110", i <= shown ? "text-amber-400" : "text-slate-300 dark:text-zinc-600")}
              >
                <Star filled={i <= shown} className="h-9 w-9" />
              </button>
            ))}
          </div>
          <p className="mt-2 h-5 text-[13.5px] font-semibold text-slate-700 dark:text-zinc-200">{LABELS[shown] || "Tap a star"}</p>
        </div>

        <label className="mt-4 block">
          <span className="text-[12.5px] font-medium text-slate-500 dark:text-zinc-400">Anything to add? (optional)</span>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value.slice(0, 300))}
            rows={3}
            placeholder="On time, item as described, easy to deal with…"
            className="mt-1 w-full resize-none rounded-xl border border-neutral-200 bg-white px-3 py-2 text-[14px] text-slate-900 outline-none placeholder:text-slate-400 focus:border-[var(--accent)] dark:border-neutral-700 dark:bg-white/5 dark:text-white"
          />
          <span className="block text-right text-[11px] tabular-nums text-slate-400">{comment.length}/300</span>
        </label>

        <div className="mt-3 flex gap-2">
          <button type="button" onClick={onClose} className={cn(btnSecondary, "flex-1")}>
            Later
          </button>
          <button type="button" onClick={submit} disabled={!stars || saving} className={cn(btnPrimary, "flex-1")}>
            {saving ? "Saving…" : "Submit rating"}
          </button>
        </div>
      </div>
    </div>
  );
}
