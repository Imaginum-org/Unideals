import { memo, useEffect, useRef, useState } from "react";
import {
  Ban,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Circle,
  MapPin,
  Package,
  ShoppingCart,
  Wallet,
} from "lucide-react";
import { INPUT_BASE, SELL_BTN_FLAT } from "../utils/chatTheme.js";
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
  onToggle,
  onConfirmDeal,
  onSchedulePickup,
  onPayment,
  onReceived,
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

  const pickupDate = deal?.pickup?.scheduled_date
    ? new Date(deal.pickup.scheduled_date).toLocaleDateString("en-IN")
    : "";
  const pickupLoc =
    deal?.pickup?.location?.address_line ||
    deal?.pickup?.location?.city ||
    "";

  return (
    <div className="relative overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-[#1c1c1c] p-4 shadow-sm">
      <button
        onClick={onToggle}
        aria-expanded={open}
        aria-label={open ? "Collapse deal progress" : "Expand deal progress"}
        className="w-full flex items-center justify-between gap-2"
      >
        <h3 className="font-bold text-[15px] text-zinc-900 dark:text-white">
          Deal Progress
        </h3>
        <span className="flex items-center gap-2">
          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-zinc-100 text-zinc-700 dark:bg-[#1A1D20] dark:text-white">
            {inr(deal?.current_price)}
          </span>
          <ChevronDown
            size={18}
            className={`text-zinc-400 transition-transform duration-300 ${open ? "rotate-180" : ""}`}
          />
        </span>
      </button>
      {!open && (
        <p className="mt-1.5 text-xs font-medium text-zinc-500 dark:text-zinc-400">
          {dealStatusBadge(status).label} · {inr(deal?.current_price)}
        </p>
      )}

      {open && (
        <>
      {/* 3-stage stepper with animated SVG fill track */}
      <div className="relative mt-4">
        <div className="absolute left-[16.66%] right-[16.66%] top-5 h-[3px] rounded-full bg-zinc-200 dark:bg-zinc-700" />
        <div
          className="absolute left-[16.66%] top-5 h-[3px] rounded-full bg-[#3838EC] transition-[width] duration-700 ease-out"
          style={{ width: `calc(${(idx < 0 ? 0 : idx * 50)}% * 0.6666)` }}
        />
        <div className="relative grid grid-cols-3">
          {STAGES.map((label, i) => {
            const done = idx >= i && idx !== -1;
            const current = idx === i;
            return (
              <div key={label} className="flex flex-col items-center gap-1.5 min-w-0">
                <span
                  className={`size-10 rounded-full border-[2.5px] flex items-center justify-center bg-white dark:bg-[#1c1c1c] ${
                    done ? "border-[#3838EC]" : "border-zinc-200 dark:border-zinc-700"
                  }`}
                >
                  {done ? (
                    <CheckCircle2 size={20} className="text-[#3838EC]" />
                  ) : (
                    <Circle size={20} className="text-zinc-300 dark:text-zinc-600" />
                  )}
                </span>
                <span
                  className={`text-[11px] font-semibold text-center leading-tight ${
                    current || done ? "text-[#3838EC]" : "text-zinc-400"
                  }`}
                >
                  {label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* NEGOTIATING */}
      {(status === "negotiating" || status === "offer_accepted") && (
        <div className="mt-3">
          {isSeller ? (
            <div className="rounded-lg border border-dashed border-zinc-300 dark:border-zinc-600 p-3">
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-2">
                Ready to confirm the deal?
              </p>
              <div className="flex gap-2">
                <input
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  inputMode="numeric"
                  aria-label="Final deal amount"
                  className={`${INPUT_BASE} flex-1 min-w-0 px-3 py-2.5 text-base sm:text-sm`}
                  placeholder="Final amount"
                />
                <button
                  disabled={busy}
                  onClick={() => onConfirmDeal?.(Number(amount))}
                  className={`${SELL_BTN_FLAT} px-4 py-2.5 text-sm shrink-0`}
                >
                  Confirm Deal
                </button>
              </div>
            </div>
          ) : (
            <p className="text-xs text-zinc-500 bg-zinc-50 dark:bg-[#1A1D20] rounded-xl px-3 py-2.5">
              Seller will drop the final amount here.
            </p>
          )}
        </div>
      )}

      {/* DEAL_CONFIRMED */}
      {status === "deal_confirmed" && (
        <div className="mt-4">
          {isSeller ? (
            scheduling ? (
              <div className="grid gap-2">
                <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                  Pickup Date
                  <input
                    type="date"
                    value={date}
                    min={new Date().toISOString().slice(0, 10)}
                    onChange={(e) => setDate(e.target.value)}
                    className={`${INPUT_BASE} mt-1 w-full px-3 py-2.5 text-base sm:text-sm font-normal`}
                  />
                </label>
                <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                  Pickup Location
                  <input
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className={`${INPUT_BASE} mt-1 w-full px-3 py-2.5 text-base sm:text-sm font-normal`}
                    placeholder="e.g. Library"
                  />
                </label>
                <div className="flex gap-2 mt-1">
                  <button
                    disabled={busy || !date || !location.trim()}
                    onClick={() => onSchedulePickup?.(date, location.trim())}
                    className={`${SELL_BTN_FLAT} flex-1 px-4 py-2.5 text-sm`}
                  >
                    Confirm
                  </button>
                  <button
                    onClick={() => setScheduling(false)}
                    className="px-4 py-2.5 rounded-lg border border-zinc-200 text-sm font-medium text-zinc-600 dark:border-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => {
                  // Rescheduling starts from the current values; first-time
                  // scheduling starts from the seller's listing pickup point.
                  if (deal?.pickup?.scheduled_date) {
                    try {
                      setDate(
                        new Date(deal.pickup.scheduled_date)
                          .toISOString()
                          .slice(0, 10),
                      );
                    } catch {
                      // keep empty
                    }
                  }
                  const existing =
                    deal?.pickup?.location?.address_line ||
                    deal?.pickup?.location?.city ||
                    "";
                  if (existing) setLocation(existing);
                  else if (defaultLocation) setLocation(defaultLocation);
                  setScheduling(true);
                }}
                className={`${SELL_BTN_FLAT} w-full px-4 py-3 text-[15px] flex items-center justify-center gap-2`}
              >
                <CalendarDays size={18} /> Schedule Pickup
              </button>
            )
          ) : (
            <p className="text-xs text-zinc-500 bg-zinc-50 dark:bg-[#1A1D20] rounded-xl px-3 py-2.5">
              Deal&apos;s locked. Seller&apos;s setting up pickup, hang tight.
            </p>
          )}
        </div>
      )}

      {/* PICKUP_SCHEDULED */}
      {status === "pickup_scheduled" && (
        <div className="mt-3 space-y-2">
          <p className="flex items-center gap-2 text-[15px] text-zinc-800 dark:text-white">
            <CalendarDays size={17} className="text-zinc-500" /> {pickupDate}
          </p>
          <p className="flex items-center gap-2 text-[15px] text-zinc-800 dark:text-white">
            <MapPin size={17} className="text-zinc-500" /> {pickupLoc}
          </p>
          {isSeller ? (
            <div className="pt-1">
              <button
                disabled={busy}
                onClick={() => onPayment?.()}
                className={`${SELL_BTN_FLAT} px-8 py-2.5 text-sm flex items-center gap-2`}
              >
                <Wallet size={17} /> Payment Received
              </button>
            </div>
          ) : (
            <p className="text-xs text-zinc-500">
              Meet up, pay at the spot, and you&apos;re almost done.
            </p>
          )}
        </div>
      )}

      {/* PAYMENT_CONFIRMED */}
      {status === "payment_confirmed" && (
        <div className="mt-3 space-y-3">
          <p className="flex items-center gap-2 text-[15px] text-zinc-800 dark:text-white">
            <CalendarDays size={17} className="text-zinc-500" /> {pickupDate}
          </p>
          <p className="flex items-center gap-2 text-[15px] text-zinc-800 dark:text-white">
            <MapPin size={17} className="text-zinc-500" /> {pickupLoc}
          </p>
          {!isSeller ? (
            <>
              <button
                disabled={busy}
                onClick={() => onReceived?.()}
                className={`${SELL_BTN_FLAT} w-full px-4 py-3 text-[15px] flex items-center justify-center gap-2`}
              >
                <Package size={18} /> Item Received
              </button>
              <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full bg-green-100 text-green-700">
                <Wallet size={14} /> Payment Confirmed
              </span>
            </>
          ) : (
            <>
              <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full bg-green-100 text-green-700">
                <Wallet size={14} /> Payment Confirmed
              </span>
              <p className="text-xs text-zinc-500">
                Waiting on the buyer to confirm they got it.
              </p>
            </>
          )}
        </div>
      )}

      {status === "completed" && (
        <div className="mt-3">
          <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full bg-green-100 text-green-700">
            <CheckCircle2 size={14} /> Transaction Complete
          </span>
        </div>
      )}

      {status === "cancelled" && (
        <div className="mt-3 rounded-lg bg-red-50 border border-red-100 px-3 py-2.5 text-xs font-semibold text-red-600 flex items-start gap-1.5">
          <Ban size={14} className="shrink-0 mt-px" />
          <span>
            Deal cancelled. Item&apos;s back on the shelf, so send a new
            offer below to restart.
          </span>
        </div>
      )}
        </>
      )}
      {celebrate && (
        <div
          className="absolute inset-0 z-20 rounded-xl bg-white/95 dark:bg-[#1c1c1c]/95 backdrop-blur-[1px] overflow-hidden opacity-0 animate-deal-celeb"
          aria-hidden="true"
        >
          <svg
            className="absolute left-4 right-4 top-1/2 h-3 w-[calc(100%-2rem)] -translate-y-1/2"
            viewBox="0 0 100 10"
            preserveAspectRatio="none"
          >
            <line
              x1="2"
              y1="5"
              x2="98"
              y2="5"
              stroke="#3838EC"
              strokeOpacity="0.4"
              strokeWidth="2.5"
              strokeLinecap="round"
              pathLength="120"
              strokeDasharray="120"
              className="animate-deal-road"
            />
          </svg>
          <div className="absolute top-1/2 animate-deal-cart">
            <span className="flex size-14 items-center justify-center rounded-full bg-[#3838EC] shadow-lg shadow-indigo-500/30">
              <ShoppingCart size={26} className="text-white" />
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default memo(DealProgress);
