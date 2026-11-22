import { useState } from "react";
import { Eye, ImageIcon, MapPin } from "lucide-react";
import { cn } from "../../../../utils/cn.js";
import { CARD, FLUSH_ON_PHONE } from "../../../product/components/listing/ListingKit.jsx";
import { LISTING_TYPES, formatDateTime, priceParts } from "../../constants/rentOptions.js";
import { isOffer, priceOf, showsReturnPolicy, summarize } from "./listingForm.js";

/*
 * What other students will see, rebuilt from the form on every change.
 * PreviewCard: the Sell flow's live preview card (aside on desktop, a sheet
 * on phones). ReviewPanel: the full listing on the Review step.
 */

const typeLabel = (form) => (isOffer(form) ? LISTING_TYPES.offer.find((t) => t.value === form.type)?.label : "Request");
const imagesOf = (form) => form.images.map((img) => img.preview || img.url).filter(Boolean);

function PriceText({ form, large }) {
  const missing = (form.type === "rent" || (form.type === "give" && form.givePaid)) && !(Number(form.amount) > 0);
  const p = priceParts(priceOf(form));
  return (
    <span className="flex items-baseline gap-1">
      <span
        className={cn(
          "font-bold tracking-tight",
          large ? "text-[26px]" : "text-[16px]",
          missing ? "text-slate-300 dark:text-zinc-600" : p.free ? "text-emerald-600 dark:text-emerald-400" : "text-slate-900 dark:text-white",
        )}
      >
        {missing ? "₹ —" : p.amount}
      </span>
      {!missing && p.unit && <span className={cn("font-medium text-slate-500 dark:text-zinc-400", large ? "text-[15px]" : "text-[12.5px]")}>{p.unit}</span>}
    </span>
  );
}

export function PreviewCard({ form, className }) {
  const cover = imagesOf(form)[0];
  const s = summarize(form);
  return (
    <section className={cn(CARD, "p-4", className)} aria-label="Live preview">
      <p className="mb-3 flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
        <Eye className="h-3.5 w-3.5" aria-hidden="true" />
        Preview
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
          <span className="absolute left-2 top-2 rounded-md bg-white/95 px-2 py-0.5 text-[11px] font-semibold text-slate-800 shadow-sm dark:bg-black/70 dark:text-white">
            {typeLabel(form)}
          </span>
        </div>
        <div className="space-y-1.5 p-3">
          <p className="truncate text-[11.5px] font-semibold uppercase tracking-wide text-[var(--accent-text)]">
            {s.category || <span className="text-slate-300 dark:text-zinc-600">Category</span>}
          </p>
          <p className={cn("line-clamp-2 text-[14px] font-semibold leading-snug", form.title.trim() ? "text-slate-900 dark:text-white" : "text-slate-300 dark:text-zinc-600")}>
            {form.title.trim() || "Your listing title"}
          </p>
          <PriceText form={form} />
          {(s.place || s.condition) && (
            <p className="truncate text-[12px] text-slate-500 dark:text-zinc-400">{[s.condition, s.place].filter(Boolean).join(" · ")}</p>
          )}
        </div>
      </div>
    </section>
  );
}

/** Review step: the full listing, as other students will see it. */
export function ReviewPanel({ form }) {
  const [index, setIndex] = useState(0);
  const images = imagesOf(form);
  const current = images[Math.min(index, Math.max(images.length - 1, 0))];
  const s = summarize(form);
  const offer = isOffer(form);
  const available = form.hasEndDate && form.availableUntil ? s.availability.replace("Available until ", "Until ") : "No end date";
  const specs = [
    ["Type", typeLabel(form)],
    s.condition && ["Condition", s.condition],
    s.deposit && ["Deposit", s.deposit.replace(" deposit", "")],
    form.type === "give" && [offer ? "Quantity" : "Needed", String(form.quantity)],
    offer ? ["Available", available] : ["Needed by", formatDateTime(form.neededBy)],
  ].filter(Boolean);
  const extras = [
    showsReturnPolicy(form) && form.returnPolicy.trim() && ["Return policy", form.returnPolicy.trim()],
    form.notes.trim() && [offer ? "Instructions" : "Details", form.notes.trim()],
  ].filter(Boolean);

  return (
    <section className={cn(CARD, FLUSH_ON_PHONE, "overflow-hidden")} aria-label="Listing preview">
      <div className="flex items-center gap-2 border-b border-neutral-100 px-4 py-3 text-[12.5px] font-medium text-slate-500 sm:px-6 dark:border-neutral-800 dark:text-zinc-400">
        <Eye className="h-4 w-4" aria-hidden="true" />
        This is how students will see your post
      </div>
      <div className="grid grid-cols-1 gap-6 p-4 sm:p-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div>
          <div className="overflow-hidden rounded-xl bg-neutral-100 dark:bg-white/5">
            {current ? (
              <img src={current} alt="Cover" className="aspect-square w-full object-cover" />
            ) : (
              <div className="flex h-32 w-full flex-col items-center justify-center gap-1.5 text-slate-400 md:aspect-square md:h-auto">
                <ImageIcon className="h-7 w-7" aria-hidden="true" />
                <span className="text-[12.5px] font-medium">No photo</span>
              </div>
            )}
          </div>
          {images.length > 1 && (
            <div className="mt-3 flex gap-2">
              {images.map((src, i) => (
                <button
                  key={src}
                  type="button"
                  onClick={() => setIndex(i)}
                  aria-label={`Show photo ${i + 1}`}
                  className={cn(
                    "h-16 w-16 overflow-hidden rounded-lg border-2 transition",
                    i === index ? "border-[var(--accent)]" : "border-transparent opacity-70 hover:opacity-100",
                  )}
                >
                  <img src={src} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-[var(--accent-soft)] px-2.5 py-1 text-[12px] font-semibold text-[var(--accent-text)]">{typeLabel(form)}</span>
            {s.category && (
              <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-[12px] font-semibold text-slate-600 dark:bg-white/10 dark:text-zinc-300">{s.category}</span>
            )}
          </div>
          <h2 className="mt-3 break-words text-[20px] font-semibold leading-snug tracking-tight text-slate-900 sm:text-[24px] dark:text-white">{form.title.trim()}</h2>
          <div className="mt-3">
            {!offer && <p className="mb-1 text-[12px] font-medium text-slate-500 dark:text-zinc-400">Will pay</p>}
            <PriceText form={form} large />
          </div>
          <p className="mt-1 text-[12.5px] text-slate-500 dark:text-zinc-400">Paid directly between you two, by UPI or cash</p>

          <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-neutral-100 pt-4 dark:border-neutral-800">
            {specs.map(([k, v]) => (
              <div key={k} className="min-w-0">
                <dt className="text-[12px] text-slate-500 dark:text-zinc-400">{k}</dt>
                <dd className="truncate text-[13.5px] font-semibold text-slate-900 dark:text-zinc-100" title={v}>
                  {v}
                </dd>
              </div>
            ))}
          </dl>

          <div className="mt-5 flex items-start gap-2.5 rounded-lg bg-neutral-50 px-3.5 py-3 dark:bg-white/[0.03]">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent-text)]" aria-hidden="true" />
            <div className="min-w-0 text-[13px]">
              <p className="font-semibold text-slate-900 dark:text-white">{form.spot.trim() || (offer ? "Pickup spot agreed in chat" : "Meet-up spot agreed in chat")}</p>
              <p className="text-slate-500 dark:text-zinc-400">{[form.block, s.timing].filter(Boolean).join(" · ") || "Your block"}</p>
            </div>
          </div>
        </div>
      </div>

      {(form.description.trim() || extras.length > 0) && (
        <div className="space-y-4 border-t border-neutral-100 px-4 py-5 sm:px-6 dark:border-neutral-800">
          {form.description.trim() && (
            <div>
              <h3 className="text-[14px] font-semibold text-slate-900 dark:text-white">{offer ? "About this item" : "About this request"}</h3>
              <p className="mt-2 whitespace-pre-line break-words text-[14px] leading-[1.75] text-slate-600 dark:text-zinc-300">{form.description.trim()}</p>
            </div>
          )}
          {extras.map(([k, v]) => (
            <div key={k}>
              <h3 className="text-[14px] font-semibold text-slate-900 dark:text-white">{k}</h3>
              <p className="mt-1 whitespace-pre-line break-words text-[14px] leading-relaxed text-slate-600 dark:text-zinc-300">{v}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
