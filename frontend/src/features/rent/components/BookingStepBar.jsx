import { CheckCircle2, Circle } from "lucide-react";
import { cn } from "../../../utils/cn.js";

/*
 * Segmented booking progress (Requested → Accepted → Handed over → Returned;
 * share bookings stop at Handed over). Same look as the chat's deal card.
 * Used in the booking card (chat + booking page) and the Rentals list.
 */

const ENDED = ["declined", "cancelled", "expired"];

// [full label, short label for narrow screens]
const stepsFor = (booking) => {
  const steps = [
    ["Requested", "Asked"],
    ["Accepted", "Accepted"],
    ["Handed over", "Handed"],
  ];
  if (booking.mode === "lend") steps.push(["Returned", "Returned"]);
  return steps;
};

// How many steps are done (1 = requested).
const reached = (booking) => {
  if (booking.returnedAt || (booking.mode === "share" && booking.handedOverAt)) return booking.mode === "lend" ? 4 : 3;
  if (booking.handedOverAt) return 3;
  if (booking.acceptedAt) return 2;
  return 1;
};

export default function BookingStepBar({ booking, compact = false, className }) {
  const steps = stepsFor(booking);
  const done = reached(booking);
  const ended = ENDED.includes(booking.status);
  return (
    <ol className={cn("grid gap-1.5", steps.length === 4 ? "grid-cols-4" : "grid-cols-3", className)} aria-label="Booking progress">
      {steps.map(([label, short], i) => {
        const complete = i < done;
        return (
          <li key={label} className="min-w-0" aria-current={i === done - 1 ? "step" : undefined}>
            <div
              className={cn(
                "rounded-full transition-colors duration-500",
                compact ? "h-1" : "h-1.5",
                complete ? (ended ? "bg-slate-300 dark:bg-zinc-600" : "bg-[var(--accent)]") : "bg-neutral-200 dark:bg-neutral-700",
              )}
            />
            <p
              className={cn(
                "mt-1.5 flex items-center gap-1 truncate",
                compact ? "text-[11px]" : "text-[11.5px]",
                complete && !ended ? "font-semibold text-slate-800 dark:text-zinc-100" : "text-slate-400 dark:text-zinc-500",
              )}
            >
              {!compact &&
                (complete ? (
                  <CheckCircle2 className={cn("h-3 w-3 shrink-0", ended ? "text-slate-400" : "text-[var(--accent-text)]")} aria-hidden="true" />
                ) : (
                  <Circle className="h-3 w-3 shrink-0" aria-hidden="true" />
                ))}
              <span className="truncate sm:hidden">{short}</span>
              <span className="hidden truncate sm:inline">{label}</span>
            </p>
          </li>
        );
      })}
    </ol>
  );
}
