import { useState } from "react";
import { Link } from "react-router-dom";
import { AlarmClock, Ban, CheckCircle2, ChevronDown, HandCoins, PackageCheck, ShieldCheck, Star, Undo2 } from "lucide-react";
import { cn } from "../../../utils/cn.js";
import BookingStepBar from "./BookingStepBar.jsx";
import { BOOKING_STATUS_LABELS, formatDateTime, formatRupees, relativeTime } from "../constants/rentOptions.js";

/*
 * Booking progress + the next action, in the style of the chat's deal card
 * (features/chat/components/DealProgress.jsx). Used at the top of a Rent &
 * Borrow chat thread and on the booking page, so both always match.
 */

const primary =
  "inline-flex h-10 items-center justify-center gap-1.5 rounded-lg bg-[var(--accent)] px-4 text-[13.5px] font-semibold text-white transition-colors hover:bg-[var(--accent-hover)] disabled:opacity-50";
const secondary =
  "inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-4 text-[13.5px] font-semibold text-slate-700 transition-colors hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-700 dark:bg-[#1A1D20] dark:text-zinc-200 dark:hover:bg-white/5";
const note = "rounded-lg bg-neutral-50 px-3 py-2 text-[12.5px] leading-relaxed text-slate-600 dark:bg-white/[0.03] dark:text-zinc-400";

function RateInline({ busy, onRate }) {
  const [stars, setStars] = useState(0);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-[13px] font-medium text-slate-700 dark:text-zinc-200">How did it go?</span>
      <div className="flex items-center" role="radiogroup" aria-label="Rating">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" role="radio" aria-checked={stars === n} aria-label={`${n} star${n > 1 ? "s" : ""}`} onClick={() => setStars(n)} className="p-0.5">
            <Star className={cn("h-6 w-6", n <= stars ? "fill-amber-400 text-amber-400" : "text-neutral-300 dark:text-neutral-600")} aria-hidden="true" />
          </button>
        ))}
      </div>
      <button type="button" disabled={!stars || busy} onClick={() => onRate(stars)} className={cn(primary, "h-9 px-3")}>
        Rate
      </button>
    </div>
  );
}

/**
 * Props: booking, busy, act(action, body, toast), open / onToggle (chat card
 * collapses like the deal card), detailsHref (link to the booking page).
 */
export default function RentBookingProgress({ booking, busy, act, open = true, onToggle, detailsHref, className }) {
  if (!booking) {
    return (
      <div className={cn("rounded-xl border border-neutral-200/80 bg-white px-3.5 py-3 dark:border-neutral-800 dark:bg-[#1A1D20]", className)}>
        <div className="browse-shimmer h-4 w-2/5 rounded-full bg-neutral-100 dark:bg-white/5" />
      </div>
    );
  }

  const ended = ["declined", "cancelled", "expired"].includes(booking.status);
  const lender = booking.role === "lender";
  const can = (a) => booking.actions?.includes(a);
  const isBusy = Boolean(busy);
  const price = booking.agreedPrice ? formatRupees(booking.agreedPrice) : "Free";
  const deposit = booking.post?.deposit > 0 ? formatRupees(booking.post.deposit) : null;
  // Once it is out, the note below already says when it is due back.
  const showReturnBy = Boolean(booking.returnBy) && ["pending", "accepted"].includes(booking.status);

  const cancelButton = can("cancel") && (
    <button
      type="button"
      disabled={isBusy}
      onClick={() => window.confirm("Cancel this booking?") && act("cancel", {}, "Cancelled")}
      className="inline-flex h-10 items-center gap-1.5 rounded-lg px-3 text-[13px] font-semibold text-slate-500 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50 dark:text-zinc-400 dark:hover:bg-red-950/20"
    >
      <Undo2 className="h-4 w-4" aria-hidden="true" />
      Cancel
    </button>
  );

  let body = null;
  if (booking.status === "pending") {
    body = booking.isOwner ? (
      <div className="grid grid-cols-2 gap-2">
        <button type="button" disabled={isBusy} onClick={() => act("accept", undefined, "Accepted. Sort out the handover in the chat.")} className={primary}>
          Accept
        </button>
        <button type="button" disabled={isBusy} onClick={() => act("decline", {}, "Declined")} className={secondary}>
          Decline
        </button>
      </div>
    ) : (
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className={cn(note, "flex-1")}>Waiting for them to accept. You&apos;ll get a ping.</p>
        {cancelButton}
      </div>
    );
  } else if (booking.status === "accepted") {
    body = (
      <div className="space-y-2">
        <p className={note}>
          {lender
            ? `Meet up and hand it over, then tap "Handed over".${booking.agreedPrice ? ` Collect ${price}${deposit ? ` + ${deposit} deposit` : ""}.` : deposit ? ` Collect the ${deposit} deposit.` : ""}`
            : `Meet up to collect it.${booking.agreedPrice ? ` Pay ${price} by UPI or cash${deposit ? ` (+ ${deposit} refundable deposit)` : ""}.` : deposit ? ` Bring the ${deposit} refundable deposit.` : ""}`}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {can("handover") && (
            <button
              type="button"
              disabled={isBusy}
              onClick={() => act("handover", undefined, booking.mode === "share" ? "Done! Rate the exchange." : "Marked as handed over")}
              className={cn(primary, "flex-1")}
            >
              <HandCoins className="h-4 w-4" aria-hidden="true" />
              Handed over
            </button>
          )}
          {cancelButton}
        </div>
      </div>
    );
  } else if (booking.status === "active") {
    body = (
      <div className="space-y-2">
        {booking.overdue ? (
          <p className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-[12.5px] font-medium text-red-700 dark:bg-red-950/30 dark:text-red-300">
            <AlarmClock className="h-4 w-4 shrink-0" aria-hidden="true" />
            {lender ? "Past its return time. Remind them in the chat." : "This was due back. Please return it."}
          </p>
        ) : (
          <p className={note}>
            {lender
              ? `With them until ${formatDateTime(booking.returnBy)}. Tap "Got it back" once it's returned${deposit ? " and you've refunded the deposit" : ""}.`
              : `Return it by ${formatDateTime(booking.returnBy)} (${relativeTime(booking.returnBy)}).`}
          </p>
        )}
        {can("return") && (
          <button type="button" disabled={isBusy} onClick={() => act("return", undefined, "Got it back. Rate the exchange.")} className={cn(primary, "w-full")}>
            <PackageCheck className="h-4 w-4" aria-hidden="true" />
            Got it back
          </button>
        )}
      </div>
    );
  } else if (booking.status === "completed") {
    body = (
      <div className="space-y-2">
        <p className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[12px] font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
          <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
          {lender && booking.agreedPrice ? `Done. ${price} added to your earnings` : "All done"}
        </p>
        {can("rate") ? (
          <RateInline busy={busy === "rate"} onRate={(stars) => act("rate", { stars }, "Thanks for rating")} />
        ) : booking.myRating ? (
          <p className="text-[12.5px] text-slate-500 dark:text-zinc-400">You rated this {booking.myRating}★{booking.theirRating ? ` · they rated you ${booking.theirRating}★` : ""}</p>
        ) : null}
      </div>
    );
  } else if (ended) {
    body = (
      <p className="flex items-start gap-1.5 rounded-lg bg-neutral-100 px-3 py-2 text-[12.5px] font-medium text-slate-600 dark:bg-white/5 dark:text-zinc-300">
        <Ban className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        {booking.status === "declined" ? "Declined." : booking.status === "cancelled" ? "Cancelled." : "Expired without a reply."} You can still chat here.
      </p>
    );
  }

  return (
    <div className={cn("overflow-hidden rounded-xl border border-neutral-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:border-neutral-800 dark:bg-[#1A1D20]", className)}>
      <button
        type="button"
        onClick={onToggle}
        disabled={!onToggle}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 px-3.5 py-2.5 text-left disabled:cursor-default"
      >
        <span className="flex min-w-0 items-center gap-2">
          <span className="text-[13.5px] font-semibold text-slate-900 dark:text-white">Booking</span>
          <span className={cn("truncate text-[12.5px]", ended ? "text-slate-400 dark:text-zinc-500" : "text-slate-500 dark:text-zinc-400")}>
            {BOOKING_STATUS_LABELS[booking.status]}
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-2">
          <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[12px] font-semibold tabular-nums text-slate-700 dark:bg-white/5 dark:text-zinc-200">{price}</span>
          {onToggle && <ChevronDown className={cn("h-4 w-4 text-slate-400 transition-transform duration-200", open && "rotate-180")} aria-hidden="true" />}
        </span>
      </button>

      {open && (
        <div className="border-t border-neutral-100 px-3.5 pb-3.5 pt-3 dark:border-neutral-800">
          <BookingStepBar booking={booking} />

          {(deposit || showReturnBy || booking.quantity > 1) && (
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[12.5px] text-slate-600 dark:text-zinc-300">
              {deposit && (
                <span className="inline-flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                  {deposit} deposit
                </span>
              )}
              {showReturnBy && (
                <span className={cn("inline-flex items-center gap-1.5", booking.overdue && "font-semibold text-red-600 dark:text-red-400")}>
                  <AlarmClock className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                  Back by {formatDateTime(booking.returnBy)}
                </span>
              )}
              {booking.mode === "share" && booking.quantity > 1 && <span>{booking.quantity} items</span>}
            </div>
          )}

          {booking.note && booking.status === "pending" && (
            <p className="mt-3 border-l-2 border-[var(--accent)] pl-2.5 text-[13px] text-slate-700 dark:text-zinc-200">“{booking.note}”</p>
          )}

          {body && <div className="mt-3">{body}</div>}

          {detailsHref && (
            <Link to={detailsHref} className="mt-3 inline-block text-[12.5px] font-semibold text-[var(--accent-text)] hover:underline">
              Booking details
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
