import { ImageIcon, Eye } from "lucide-react";
import useProductListing from "../../hooks/useProductListing";
import { PRODUCT_CATEGORY_OPTIONS, PRODUCT_CONDITION_OPTIONS } from "../../constants/productOptions.js";
import { CARD } from "./ListingKit.jsx";
import { isSpecHidden } from "../../utils/listingSmarts.js";
import { cn } from "../../../../utils/cn.js";

const labelOf = (opts, v) => opts.find((o) => o.value === v)?.label || "";
const inr = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

/**
 * Live card preview: roughly what buyers will see in the feed, updating as
 * the seller types. Placeholders show what is still missing.
 */
export default function LivePreview({ className }) {
  const { formData } = useProductListing();
  const cover = formData.imagePreviews?.[0]?.preview;
  const selling = Number(formData.sellingPrice || 0);
  const original = Number(formData.originalPrice || 0);
  const off = original > selling && selling > 0 ? Math.round(((original - selling) / original) * 100) : 0;
  const category = labelOf(PRODUCT_CATEGORY_OPTIONS, formData.category);
  const condition = labelOf(PRODUCT_CONDITION_OPTIONS, formData.condition);

  return (
    <section className={cn(CARD, "p-4", className)} aria-label="Live preview">
      <p className="mb-3 flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
        <Eye className="h-3.5 w-3.5" aria-hidden="true" />
        Buyer preview
      </p>
      <div className="overflow-hidden rounded-xl border border-neutral-100 dark:border-neutral-800">
        <div className="relative aspect-[6/5] bg-neutral-100 dark:bg-white/5">
          {cover ? (
            <img src={cover} alt="" className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 text-slate-400 dark:text-zinc-500">
              <ImageIcon className="h-7 w-7" aria-hidden="true" />
              <span className="text-[12px] font-medium">Cover photo</span>
            </div>
          )}
          {off > 0 && (
            <span className="absolute left-2 top-2 rounded-md bg-emerald-500 px-1.5 py-0.5 text-[11px] font-bold text-white">
              {off}% off
            </span>
          )}
        </div>
        <div className="space-y-1.5 p-3">
          <p className="truncate text-[11.5px] font-semibold uppercase tracking-wide text-[var(--accent-text)]">
            {category || <span className="text-slate-300 dark:text-zinc-600">Category</span>}
          </p>
          <p className={cn("line-clamp-2 text-[14px] font-semibold leading-snug", formData.title ? "text-slate-900 dark:text-white" : "text-slate-300 dark:text-zinc-600")}>
            {formData.title || "Your listing title"}
          </p>
          <div className="flex items-baseline gap-2">
            <span className={cn("text-[16px] font-bold", selling ? "text-slate-900 dark:text-white" : "text-slate-300 dark:text-zinc-600")}>
              {selling ? inr(selling) : "₹ —"}
            </span>
            {off > 0 && <span className="text-[12px] text-slate-400 line-through">{inr(original)}</span>}
          </div>
          {condition && !isSpecHidden(formData.category, "condition") && (
            <p className="text-[12px] text-slate-500 dark:text-zinc-400">{condition}</p>
          )}
        </div>
      </div>
    </section>
  );
}
