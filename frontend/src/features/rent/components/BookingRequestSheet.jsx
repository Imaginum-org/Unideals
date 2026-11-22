import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Info } from "lucide-react";
import { Field, inputClass } from "../../product/components/listing/ListingKit.jsx";
import { toast } from "../../../components/ui/toast.js";
import { cn } from "../../../utils/cn.js";
import { createRentBooking, rentErrorMessage } from "../api/rentApi.js";
import { formatPrice, formatRupees, toLocalInput } from "../constants/rentOptions.js";
import { Sheet, btnPrimary } from "./RentKit.jsx";

const HOUR = 3600 * 1000;
const DAY = 24 * HOUR;

// Same maths as the server (rentBooking.service estimateTotal) so the
// number shown here is the number both sides see after sending.
const estimate = ({ amount, unit }, quantity, returnBy) => {
  if (!amount || unit === "free") return 0;
  const span = returnBy ? Math.max(0, new Date(returnBy).getTime() - Date.now()) : 0;
  if (unit === "hour") return amount * Math.max(1, Math.ceil(span / HOUR));
  if (unit === "day") return amount * Math.max(1, Math.ceil(span / DAY));
  return amount * Math.max(1, quantity);
};

/**
 * "Request to borrow" (on an offer) or "I can help" (on a request).
 * Lend items pick a return time; share items pick a quantity; helpers
 * answering a request can quote their own price.
 */
export default function BookingRequestSheet({ open, onOpenChange, post, maxLendDays = 14 }) {
  const navigate = useNavigate();
  const isOffer = post?.kind === "offer";
  const isShare = post?.mode === "share";
  // Requests are short needs ("iron for 20 minutes"): back 2h after they
  // needed it. Offers: 2h for hourly items, otherwise a day.
  const defaultReturn = useMemo(
    () =>
      !isOffer && post?.neededBy
        ? new Date(Math.max(new Date(post.neededBy).getTime(), Date.now()) + 2 * HOUR)
        : new Date(Date.now() + (post?.price?.unit === "hour" ? 2 * HOUR : DAY)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [open, post?.id],
  );
  const [returnBy, setReturnBy] = useState(toLocalInput(defaultReturn));
  const [quantity, setQuantity] = useState(1);
  const [quote, setQuote] = useState("");
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!open || !post) return;
    setReturnBy(toLocalInput(defaultReturn));
    setQuantity(1);
    setQuote(post.price?.amount ? String(post.price.amount) : "");
    setNote("");
  }, [open, post, defaultReturn]);

  if (!post) return null;

  const price = !isOffer && quote !== ""
    ? { amount: Number(quote) || 0, unit: post.price?.unit !== "free" ? post.price.unit : isShare ? "item" : "use" }
    : post.price;
  const qty = isShare ? (isOffer ? quantity : post.quantity || 1) : 1;
  const total = estimate(price, qty, isShare ? null : returnBy);
  const maxQty = Math.max(1, post.quantity || 1);

  const send = async () => {
    setSending(true);
    try {
      const body = { note: note.trim() || undefined };
      if (!isShare) body.return_by = new Date(returnBy).toISOString();
      if (isShare && isOffer) body.quantity = quantity;
      if (!isOffer && quote !== "") body.price = Math.max(0, Math.round(Number(quote) || 0));
      const booking = await createRentBooking(post.id, body);
      toast.success(isOffer ? "Request sent. You'll get a ping when they reply." : "Offer sent. They'll get a ping.");
      onOpenChange(false);
      navigate(`/rent/booking/${booking.id}`);
    } catch (error) {
      toast.error(rentErrorMessage(error));
    } finally {
      setSending(false);
    }
  };

  const now = new Date();
  const minReturn = toLocalInput(new Date(now.getTime() + 20 * 60 * 1000));
  const maxReturn = toLocalInput(new Date(now.getTime() + maxLendDays * DAY));

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={isOffer ? (isShare ? "Ask for this" : "Request to borrow") : "Offer to help"}
      description={post.title}
      footer={
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[12px] text-slate-500 dark:text-zinc-400">{isOffer ? "You'll pay" : "You'll get"}</p>
            <p className="text-[18px] font-semibold tabular-nums text-slate-900 dark:text-white">
              {total ? formatRupees(total) : "Free"}
            </p>
          </div>
          <button type="button" onClick={send} disabled={sending} className={cn(btnPrimary, "flex-1")}>
            {sending ? "Sending…" : isOffer ? "Send request" : "Send offer"}
          </button>
        </div>
      }
    >
      <div className="space-y-4 pt-2">
        {!isShare && (
          <Field label="Return by" htmlFor="rent-return" hint={`Priced ${formatPrice(post.price)}`}>
            <input
              id="rent-return"
              type="datetime-local"
              value={returnBy}
              min={minReturn}
              max={maxReturn}
              onChange={(e) => setReturnBy(e.target.value)}
              className={cn(inputClass(false), "h-11")}
            />
          </Field>
        )}

        {isShare && isOffer && maxQty > 1 && (
          <Field label="How many?" htmlFor="rent-qty" hint={`${maxQty} available · ${formatPrice(post.price)}`}>
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => setQuantity((q) => Math.max(1, q - 1))} className="h-11 w-11 rounded-xl border border-neutral-200 text-[18px] font-semibold dark:border-neutral-700" aria-label="Fewer">
                −
              </button>
              <span id="rent-qty" className="w-10 text-center text-[17px] font-semibold tabular-nums">{quantity}</span>
              <button type="button" onClick={() => setQuantity((q) => Math.min(maxQty, q + 1))} className="h-11 w-11 rounded-xl border border-neutral-200 text-[18px] font-semibold dark:border-neutral-700" aria-label="More">
                +
              </button>
            </div>
          </Field>
        )}

        {!isOffer && (
          <Field
            label="Your price"
            htmlFor="rent-quote"
            optional
            hint={post.price?.amount ? `They offered ${formatPrice(post.price)}. Change it if you like.` : "Leave empty or 0 to help for free."}
          >
            <div className="relative">
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">₹</span>
              <input
                id="rent-quote"
                inputMode="numeric"
                value={quote}
                onChange={(e) => setQuote(e.target.value.replace(/\D/g, "").slice(0, 4))}
                className={cn(inputClass(false), "h-11 pl-8")}
                placeholder="0"
              />
            </div>
          </Field>
        )}

        <Field label="Note" htmlFor="rent-note" optional hint="Only they see this. A good place for when and where to meet.">
          <textarea
            id="rent-note"
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value.slice(0, 300))}
            placeholder={isOffer ? "Need it for tonight's game, can pick up from the lobby" : "I'm in the same block, can drop it in 10 min"}
            className={cn(inputClass(false), "resize-none py-2.5")}
          />
        </Field>

        <p className="flex items-start gap-2 rounded-xl bg-neutral-50 p-3 text-[12.5px] text-slate-600 dark:bg-white/5 dark:text-zinc-300">
          <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          Pay each other directly by UPI or cash at handover.
          {post.deposit ? ` A refundable deposit of ${formatRupees(post.deposit)} applies.` : ""} Check the item when you get it.
        </p>
      </div>
    </Sheet>
  );
}
