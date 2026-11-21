import { memo, useEffect, useRef, useState } from "react";
import {
  Ban,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Circle,
  Handshake,
  MapPin,
  Package,
  ShoppingCart,
  Undo2,
  Wallet,
} from "lucide-react";
import { dealStatusBadge } from "../utils/dealStage.js";

const STAGES = ["Deal Confirmed", "Pickup Scheduled", "Completed"];

const stageIndex = (status) => {
  switch (status) {
    case "deal_confirmed":
      return 0;
    case "pickup_scheduled":
    case "payment_confirmed":
      return 1;
    case "completed":
      return 2;
    default:
      return -1; // negotiating / offer_accepted
  }
};

const inr = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

/**
 * Deal lifecycle card, matches the design spec:
 * Deal Progress header + amount pill, 3-stage stepper, then the
 * role-gated action for the current stage (confirm / schedule /
 * payment / item-received / complete).
 */
const DealProgress = ({
  deal,
  role,
  defaultLocation = "",
  busy = false,
  open = true,
  scheduleNonce = 0,
  onToggle,
  onConfirmDeal,
  onSchedulePickup,
  onPayment,
  onReceived,
  onRevert,
}) => {
  const status = deal?.status || "negotiating";
  const idx = stageIndex(status);
  const [amount, setAmount] = useState(String(deal?.current_price ?? ""));
  const [scheduling, setScheduling] = useState(false);
  const [date, setDate] = useState("");
  const [location, setLocation] = useState(defaultLocation || "");
  // Zomato-style delivery celebration: plays once when the stage flips to
  // completed (both sides see it via the same status update), skipped for
  // already-completed threads and reduced-motion users.
  const prevStatusRef = useRef(status);
  const [celebrate, setCelebrate] = useState(false);
  useEffect(() => {
    const was = prevStatusRef.current;
    prevStatusRef.current = status;
    if (status === "completed" && was !== "completed") {
      if (
        typeof window !== "undefined" &&
        window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
      ) {
        return;
      }
      setCelebrate(true);
      const t = setTimeout(() => setCelebrate(false), 2650);
      return () => clearTimeout(t);
    }
  }, [status]);

  useEffect(() => {
    setAmount(String(deal?.current_price ?? ""));
  }, [deal?.current_price]);

  useEffect(() => {
    if (defaultLocation) setLocation(defaultLocation);
  }, [defaultLocation]);

  const isSeller = role === "selling";
  // Two-tap undo: the first tap arms it for 4s, the second performs it.
  const [undoArmed, setUndoArmed] = useState(false);
  useEffect(() => {
    if (!undoArmed) return undefined;
    const t = setTimeout(() => setUndoArmed(false), 4000);
    return () => clearTimeout(t);
  }, [undoArmed]);
  useEffect(() => {
    setUndoArmed(false);
    setScheduling(false);
  }, [status]);
  const UNDO_COPY = {
    deal_confirmed: { label: "Release reservation", hint: "Back to negotiating. The item is available to others again." },
    pickup_scheduled: { label: "Clear pickup plan", hint: "Back to deal confirmed. You can set a new time." },
    payment_confirmed: { label: "Payment not received", hint: "Back to pickup scheduled." },
  };
  const undo = isSeller && onRevert ? UNDO_COPY[status] : null;

  const pickupDate = deal?.pickup?.scheduled_date
    ? new Date(deal.pickup.scheduled_date).toLocaleDateString("en-IN")
    : "";
  const pickupLoc =
    deal?.pickup?.location?.address_line ||
    deal?.pickup?.location?.city ||
    "";

  const field =
    "h-9 w-full rounded-lg border border-neutral-200 bg-white px-3 text-[13.5px] text-slate-900 outline-none focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent-soft)] dark:border-neutral-700 dark:bg-[#131313] dark:text-white";
  const primary =
    "inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-[var(--accent)] px-4 text-[13px] font-semibold text-white transition-colors hover:bg-[var(--accent-hover)] disabled:opacity-50";
  const note = "rounded-lg bg-neutral-50 px-3 py-2 text-[12.5px] text-slate-600 dark:bg-white/[0.03] dark:text-zinc-400";
  const meta = (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-slate-700 dark:text-zinc-200">
      {pickupDate && (
        <span className="inline-flex items-center gap-1.5">
          <CalendarDays size={14} className="text-slate-400" /> {pickupDate}
        </span>
      )}
      {pickupLoc && (
        <span className="inline-flex items-center gap-1.5">
          <MapPin size={14} className="text-slate-400" /> {pickupLoc}
        </span>
      )}
    </div>
  );
  const paidChip = (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11.5px] font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
      <Wallet size={12} /> Payment confirmed
    </span>
  );

  const openSchedule = () => {
    // Rescheduling starts from the current values; first-time scheduling
    // starts from the seller's listing pickup point.
    if (deal?.pickup?.scheduled_date) {
      try {
        setDate(new Date(deal.pickup.scheduled_date).toISOString().slice(0, 10));
      } catch {
        // keep empty
      }
    }
    const existing = deal?.pickup?.location?.address_line || deal?.pickup?.location?.city || "";
    if (existing) setLocation(existing);
    else if (defaultLocation) setLocation(defaultLocation);
    setScheduling(true);
  };
  // "/pickup" from the composer: jump straight into the schedule form.
  useEffect(() => {
    if (!scheduleNonce || !isSeller) return;
    if (status === "deal_confirmed" || status === "pickup_scheduled") openSchedule();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scheduleNonce]);

  const scheduleForm = (
    <div className="grid gap-2 sm:grid-cols-[150px_minmax(0,1fr)]">
      <input
        type="date"
        value={date}
        min={new Date().toISOString().slice(0, 10)}
        onChange={(e) => setDate(e.target.value)}
        aria-label="Pickup date"
        className={`${field} [color-scheme:light] dark:[color-scheme:dark]`}
      />
      <input
        value={location}
        onChange={(e) => setLocation(e.target.value)}
        aria-label="Pickup location"
        className={field}
        placeholder="Pickup spot, e.g. Library entrance"
      />
      <div className="flex gap-2 sm:col-span-2">
        <button
          type="button"
          disabled={busy || !date || !location.trim()}
          onClick={() => onSchedulePickup?.(date, location.trim())}
          className={`${primary} flex-1`}
        >
          {status === "pickup_scheduled" ? "Update pickup" : "Confirm pickup"}
        </button>
        <button
          type="button"
          onClick={() => setScheduling(false)}
          className="inline-flex h-9 items-center rounded-lg border border-neutral-200 px-4 text-[13px] font-semibold text-slate-600 hover:bg-neutral-50 dark:border-neutral-700 dark:text-zinc-300 dark:hover:bg-white/5"
        >
          Cancel
        </button>
      </div>
    </div>
  );

  return (
    <div className="relative overflow-hidden rounded-2xl bg-white/85 shadow-[0_10px_30px_-14px_rgba(15,23,42,0.35),0_2px_6px_-2px_rgba(15,23,42,0.08)] ring-1 ring-black/[0.06] backdrop-blur-xl backdrop-saturate-150 dark:bg-[#1A1D20]/85 dark:shadow-[0_12px_32px_-12px_rgba(0,0,0,0.7)] dark:ring-white/[0.08]">
      {/* accent hairline along the top (collapsed only; the expanded card
          shows the full stepper instead): the stage fills it left to right */}
      <span aria-hidden="true" className={`absolute inset-x-0 top-0 h-[2px] bg-[var(--accent-soft)] transition-opacity duration-200 ${open ? "opacity-0" : "opacity-100"}`}>
        <span
          className="block h-full bg-gradient-to-r from-[var(--accent)] to-[var(--accent-hover)] transition-[width] duration-700 ease-out"
          style={{ width: status === "cancelled" ? "0%" : `${idx < 0 ? 8 : ((idx + 1) / STAGES.length) * 100}%` }}
        />
      </span>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-label={open ? "Collapse deal progress" : "Expand deal progress"}
        data-deal-header=""
        className="flex w-full items-center justify-between gap-2.5 px-3 py-2 transition-colors hover:bg-black/[0.015] dark:hover:bg-white/[0.02]"
      >
        <span className="flex min-w-0 items-center gap-2.5">
          <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-[var(--accent)] text-white shadow-[0_4px_10px_-4px_var(--accent-ring)]">
            <Handshake size={14} aria-hidden="true" />
          </span>
          <span className="flex min-w-0 items-center gap-2">
            <span className="shrink-0 text-[13.5px] font-semibold text-slate-900 dark:text-white">Deal</span>
            <span className="flex min-w-0 items-center gap-1.5 rounded-full bg-neutral-100/80 px-2 py-0.5 text-[11.5px] font-medium text-slate-600 dark:bg-white/5 dark:text-zinc-300">
              <span
                aria-hidden="true"
                className={`relative inline-flex h-1.5 w-1.5 shrink-0 rounded-full ${
                  status === "cancelled" ? "bg-red-500" : status === "completed" ? "bg-emerald-500" : "bg-[var(--accent)]"
                }`}
              >
                {status !== "cancelled" && status !== "completed" && (
                  <span className="absolute inset-0 animate-ping rounded-full bg-[var(--accent)] opacity-60 motion-reduce:animate-none" />
                )}
              </span>
              <span className="truncate">{idx >= 0 ? STAGES[idx] : dealStatusBadge(status).label}</span>
            </span>
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-2">
          {/* mini stepper, visible even when collapsed */}
          <span className="hidden items-center gap-1 sm:flex" aria-hidden="true">
            {STAGES.map((label, i) => (
              <span
                key={label}
                className={`h-1.5 w-5 rounded-full transition-colors duration-500 ${
                  idx >= i && status !== "cancelled" ? "bg-[var(--accent)]" : "bg-neutral-200 dark:bg-neutral-700"
                }`}
              />
            ))}
          </span>
          <span className="rounded-md bg-[var(--accent-soft)] px-2 py-0.5 text-[12.5px] font-bold tabular-nums text-[var(--accent-text)]">
            {inr(deal?.current_price)}
          </span>
          <span className="grid h-6 w-6 place-items-center rounded-full bg-neutral-100 text-slate-500 dark:bg-white/5 dark:text-zinc-400">
            <ChevronDown size={14} className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
          </span>
        </span>
      </button>

      {open && (
        <div className="border-t border-black/[0.05] px-3.5 pb-3.5 pt-3 dark:border-white/[0.06]">
          {/* 3-stage stepper */}
          <ol className="grid grid-cols-3 gap-1.5" aria-label="Deal stages">
            {STAGES.map((label, i) => {
              const done = idx >= i && idx !== -1;
              const current = idx === i;
              return (
                <li key={label} className="min-w-0" aria-current={current ? "step" : undefined}>
                  <div className={`h-1.5 rounded-full transition-colors duration-500 ${done ? "bg-gradient-to-r from-[var(--accent)] to-[var(--accent-hover)]" : "bg-neutral-200 dark:bg-neutral-700"}`} />
                  <p
                    className={`mt-1.5 flex items-center gap-1 truncate text-[11.5px] ${
                      done ? "font-semibold text-slate-800 dark:text-zinc-100" : "text-slate-400 dark:text-zinc-500"
                    }`}
                  >
                    {done ? <CheckCircle2 size={12} className="shrink-0 text-[var(--accent-text)]" /> : <Circle size={12} className="shrink-0" />}
                    <span className="truncate">{label}</span>
                  </p>
                </li>
              );
            })}
          </ol>

          {/* NEGOTIATING */}
          {(status === "negotiating" || status === "offer_accepted") && (
            <div className="mt-3">
              {isSeller ? (
                <div className="flex gap-2">
                  <label className="relative min-w-0 flex-1">
                    <span className="pointer-events-none absolute inset-y-0 left-3 grid place-items-center text-[13px] font-semibold text-slate-400">₹</span>
                    <input
                      value={amount}
                      onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ""))}
                      inputMode="numeric"
                      aria-label="Final deal amount"
                      className={`${field} pl-7 font-semibold tabular-nums`}
                      placeholder="Final amount"
                    />
                  </label>
                  <button type="button" disabled={busy} onClick={() => onConfirmDeal?.(Number(amount))} className={`${primary} shrink-0`}>
                    Confirm deal
                  </button>
                </div>
              ) : (
                <p className={note}>The seller confirms the final amount here once you agree.</p>
              )}
            </div>
          )}

          {/* DEAL_CONFIRMED */}
          {status === "deal_confirmed" && (
            <div className="mt-3">
              {isSeller ? (
                scheduling ? (
                  scheduleForm
                ) : (
                  <button type="button" onClick={openSchedule} className={`${primary} w-full`}>
                    <CalendarDays size={15} /> Schedule pickup
                  </button>
                )
              ) : (
                <p className={note}>Deal confirmed. The seller is setting up the pickup.</p>
              )}
            </div>
          )}

          {/* PICKUP_SCHEDULED */}
          {status === "pickup_scheduled" && (
            <div className="mt-3 space-y-2.5">
              {meta}
              {isSeller ? (
                scheduling ? (
                  scheduleForm
                ) : (
                  <div className="flex flex-wrap gap-2">
                    <button type="button" disabled={busy} onClick={() => onPayment?.()} className={`${primary} flex-1`}>
                      <Wallet size={15} /> Payment received
                    </button>
                    <button
                      type="button"
                      onClick={openSchedule}
                      className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-neutral-200 px-3.5 text-[13px] font-semibold text-slate-700 hover:bg-neutral-50 dark:border-neutral-700 dark:text-zinc-200 dark:hover:bg-white/5"
                    >
                      <CalendarDays size={14} /> Reschedule
                    </button>
                  </div>
                )
              ) : (
                <p className={note}>Meet up, pay at the spot, and you&apos;re almost done.</p>
              )}
            </div>
          )}

          {/* PAYMENT_CONFIRMED */}
          {status === "payment_confirmed" && (
            <div className="mt-3 space-y-2.5">
              {meta}
              {!isSeller ? (
                <div className="flex flex-wrap items-center gap-2">
                  <button type="button" disabled={busy} onClick={() => onReceived?.()} className={`${primary} flex-1`}>
                    <Package size={15} /> I received the item
                  </button>
                  {paidChip}
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  {paidChip}
                  <span className="text-[12.5px] text-slate-500 dark:text-zinc-400">Waiting for the buyer to confirm they got it.</span>
                </div>
              )}
            </div>
          )}

          {undo && !scheduling && (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-dashed border-neutral-200 pt-2.5 dark:border-neutral-700">
              <span className="text-[12px] text-slate-500 dark:text-zinc-400">{undoArmed ? undo.hint : "Made a mistake?"}</span>
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  if (!undoArmed) return setUndoArmed(true);
                  setUndoArmed(false);
                  onRevert?.();
                }}
                className={`inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[12.5px] font-semibold transition-colors disabled:opacity-50 ${
                  undoArmed
                    ? "bg-amber-500 text-white hover:bg-amber-600"
                    : "text-slate-600 hover:bg-neutral-100 dark:text-zinc-300 dark:hover:bg-white/5"
                }`}
              >
                <Undo2 size={14} />
                {undoArmed ? `Tap to confirm: ${undo.label.toLowerCase()}` : `Undo · ${undo.label}`}
              </button>
            </div>
          )}

          {status === "completed" && (
            <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[12px] font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
              <CheckCircle2 size={13} /> Transaction complete
            </p>
          )}

          {status === "cancelled" && (
            <p className="mt-3 flex items-start gap-1.5 rounded-lg bg-red-50 px-3 py-2 text-[12.5px] font-medium text-red-700 dark:bg-red-950/30 dark:text-red-300">
              <Ban size={14} className="mt-px shrink-0" />
              Deal cancelled. The item is available again. Send a new offer below to restart.
            </p>
          )}
        </div>
      )}

      {celebrate && (
        <div className="animate-deal-celeb absolute inset-0 z-20 overflow-hidden rounded-xl bg-white/95 opacity-0 backdrop-blur-[1px] dark:bg-[#1A1D20]/95" aria-hidden="true">
          <svg className="absolute left-4 right-4 top-1/2 h-3 w-[calc(100%-2rem)] -translate-y-1/2" viewBox="0 0 100 10" preserveAspectRatio="none">
            <line
              x1="2"
              y1="5"
              x2="98"
              y2="5"
              stroke="currentColor"
              className="animate-deal-road text-[var(--accent)]"
              strokeOpacity="0.4"
              strokeWidth="2.5"
              strokeLinecap="round"
              pathLength="120"
              strokeDasharray="120"
            />
          </svg>
          <div className="animate-deal-cart absolute top-1/2">
            <span className="flex size-11 items-center justify-center rounded-full bg-[var(--accent)] shadow-lg">
              <ShoppingCart size={20} className="text-white" />
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default memo(DealProgress);
