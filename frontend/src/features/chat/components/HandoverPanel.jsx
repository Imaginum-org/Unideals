import { memo, useEffect, useRef, useState } from "react";
import { AlertTriangle, CalendarDays, CheckCircle2, Clock3, Eye, EyeOff, KeyRound, Loader2, ShieldCheck, UserX } from "lucide-react";

/*
 * Finishing a deal at the meetup.
 *
 * Buyer: check the item, pay, then show a 4-digit handover code.
 * Seller: get paid, then type the buyer's code -> deal complete.
 * Fallback for either side: "Mark as done" -> the other side confirms (or
 * says there's a problem), or it completes on its own after 48h.
 * After the meetup time: "They didn't show up" (two taps).
 *
 * Every action resolves through the parent (Chat.jsx), which updates the
 * deal from the response; this component only keeps local UI state.
 */

const fmt = (d) =>
  new Date(d).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

const btn = {
  primary:
    "inline-flex h-10 items-center justify-center gap-1.5 rounded-lg bg-[var(--accent)] px-4 text-[13.5px] font-semibold text-white transition-colors hover:bg-[var(--accent-hover)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--accent-soft)] disabled:opacity-50",
  secondary:
    "inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-4 text-[13.5px] font-semibold text-slate-700 transition-colors hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-700 dark:bg-transparent dark:text-zinc-200 dark:hover:bg-white/5",
  link: "inline-flex min-h-[32px] items-center gap-1 rounded-md px-1 text-[12.5px] font-semibold text-[var(--accent-text)] hover:underline disabled:opacity-50",
};

// [short, full]: phones get one compact row, wider screens the full text.
function Steps({ items }) {
  return (
    <ol className="flex flex-wrap gap-x-3 gap-y-1 sm:grid sm:grid-cols-3 sm:gap-2">
      {items.map(([short, full], i) => (
        <li
          key={full}
          title={full}
          className="flex min-w-0 items-center gap-1.5 text-[12.5px] text-slate-700 sm:gap-2 sm:rounded-lg sm:bg-neutral-50 sm:px-2.5 sm:py-2 dark:text-zinc-300 sm:dark:bg-white/[0.03]"
        >
          <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[var(--accent-soft)] text-[11px] font-bold text-[var(--accent-text)]">{i + 1}</span>
          <span className="whitespace-nowrap sm:hidden">{short}</span>
          <span className="hidden min-w-0 sm:inline">{full}</span>
        </li>
      ))}
    </ol>
  );
}

const HandoverPanel = ({
  deal,
  isSeller,
  busy = false,
  onRevealCode,
  onVerifyCode,
  onMarkDone,
  onClearDone,
  onNoShow,
  onReschedule,
}) => {
  const me = isSeller ? "seller" : "buyer";
  const other = isSeller ? "buyer" : "seller";
  const status = deal?.status;
  const pending = deal?.done_request?.at ? deal.done_request : null;
  const now = Date.now();
  const pickup = deal?.pickup || {};
  const overdue = pickup.followup_due_at && now >= new Date(pickup.followup_due_at).getTime();
  const noShowFrom = pickup.time_set
    ? new Date(pickup.scheduled_date).getTime() + 30 * 60 * 1000
    : pickup.followup_due_at
      ? new Date(pickup.followup_due_at).getTime()
      : null;
  const canNoShow = status === "pickup_scheduled" && !pending && noShowFrom && now >= noShowFrom;

  // Buyer: revealed code (kept only in memory, cleared when the deal moves).
  const [code, setCode] = useState("");
  const [shown, setShown] = useState(false);
  const [loadingCode, setLoadingCode] = useState(false);
  const [codeError, setCodeError] = useState("");
  // Seller: typed code + inline error.
  const [entry, setEntry] = useState("");
  const [entryError, setEntryError] = useState("");
  const [verifying, setVerifying] = useState(false);
  // "There's a problem" reason form, and the two-tap no-show.
  const [problemOpen, setProblemOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [noShowArmed, setNoShowArmed] = useState(false);
  const entryRef = useRef(null);

  useEffect(() => {
    setShown(false);
    setEntry("");
    setEntryError("");
    setProblemOpen(false);
    setReason("");
    setNoShowArmed(false);
  }, [status, pending?.at]);
  useEffect(() => {
    setCode("");
  }, [deal?._id]);
  useEffect(() => {
    if (!noShowArmed) return undefined;
    const t = setTimeout(() => setNoShowArmed(false), 5000);
    return () => clearTimeout(t);
  }, [noShowArmed]);

  const reveal = async () => {
    if (shown) return setShown(false);
    if (code) return setShown(true);
    setLoadingCode(true);
    setCodeError("");
    try {
      const c = await onRevealCode?.();
      if (c) {
        setCode(c);
        setShown(true);
      }
    } catch (err) {
      setCodeError(err?.response?.data?.message || "Couldn't load your code. Try again.");
    } finally {
      setLoadingCode(false);
    }
  };

  const verify = async (e) => {
    e?.preventDefault();
    if (entry.length !== 4 || verifying) return;
    setVerifying(true);
    setEntryError("");
    try {
      await onVerifyCode?.(entry);
    } catch (err) {
      setEntryError(err?.response?.data?.message || "Couldn't check the code. Try again.");
      setEntry("");
      entryRef.current?.focus();
    } finally {
      setVerifying(false);
    }
  };

  // ── The other side said "done": confirm or raise a problem ──────────────
  if (pending && pending.role === other) {
    return (
      <div className="space-y-2.5 rounded-xl border border-[var(--accent-soft-strong)] bg-[var(--accent-soft)] p-3">
        <p className="flex items-start gap-2 text-[13.5px] font-semibold text-slate-900 dark:text-white">
          <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-[var(--accent-text)]" />
          The {other} marked this deal as done
        </p>
        <p className="text-[12.5px] leading-relaxed text-slate-600 dark:text-zinc-300">
          {isSeller ? "Handed over the item and got paid?" : "Got the item and paid the seller?"} Confirm to finish the deal.
          If you don&apos;t reply, it finishes automatically on {fmt(pending.auto_complete_at)}.
        </p>
        {problemOpen ? (
          <form
            className="space-y-2"
            onSubmit={(e) => {
              e.preventDefault();
              onClearDone?.(reason.trim());
            }}
          >
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value.slice(0, 200))}
              placeholder="What's wrong? (optional)"
              aria-label="What's wrong"
              autoFocus
              className="h-10 w-full rounded-lg border border-neutral-200 bg-white px-3 text-[13.5px] text-slate-900 outline-none focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent-soft)] dark:border-neutral-700 dark:bg-[#131313] dark:text-white"
            />
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setProblemOpen(false)} className={btn.secondary}>
                Back
              </button>
              <button type="submit" disabled={busy} className={`${btn.primary} !bg-amber-600 hover:!bg-amber-700`}>
                Send
              </button>
            </div>
          </form>
        ) : (
          <div className="grid gap-2 min-[380px]:grid-cols-2">
            <button type="button" disabled={busy} onClick={() => setProblemOpen(true)} className={btn.secondary}>
              <AlertTriangle size={15} /> There&apos;s a problem
            </button>
            <button type="button" disabled={busy} onClick={() => onMarkDone?.()} className={btn.primary}>
              <CheckCircle2 size={15} /> Yes, finish deal
            </button>
          </div>
        )}
      </div>
    );
  }

  // ── I said "done": waiting for the other side ───────────────────────────
  if (pending && pending.role === me) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-neutral-50 px-3 py-2.5 dark:bg-white/[0.03]">
        <p className="flex min-w-0 items-start gap-2 text-[12.5px] leading-relaxed text-slate-600 dark:text-zinc-300">
          <Clock3 size={15} className="mt-0.5 shrink-0 text-slate-400" />
          <span>
            Waiting for the {other} to confirm. It finishes automatically on{" "}
            <span className="font-semibold text-slate-800 dark:text-zinc-100">{fmt(pending.auto_complete_at)}</span>.
          </span>
        </p>
        <button type="button" disabled={busy} onClick={() => onClearDone?.("")} className={btn.link}>
          Take back
        </button>
      </div>
    );
  }

  // ── Normal: finish with the handover code ───────────────────────────────
  const legacyPaid = status === "payment_confirmed";
  return (
    <div className="space-y-2.5">
      {overdue && (
        <p className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-[12.5px] leading-relaxed text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          <span>
            The meetup time has passed. Finish the deal below{isSeller ? ", reschedule" : ""}, or report a no-show.
            {pickup.expires_at ? ` If nothing happens, the reservation ends on ${fmt(pickup.expires_at)}.` : ""}
          </span>
        </p>
      )}

      {isSeller ? (
        <>
          <Steps items={[["Meet up", "Meet and let them check the item"], ["Get paid", "Get paid"], ["Enter code", "Enter the buyer's 4-digit code"]]} />
          <form onSubmit={verify} className="space-y-1.5">
            <div className="flex gap-2">
              <label className="relative min-w-0 flex-1">
                <KeyRound size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                <input
                  ref={entryRef}
                  value={entry}
                  onChange={(e) => {
                    setEntry(e.target.value.replace(/\D/g, "").slice(0, 4));
                    if (entryError) setEntryError("");
                  }}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="\d{4}"
                  maxLength={4}
                  aria-label="Buyer's handover code"
                  aria-invalid={Boolean(entryError)}
                  aria-describedby="handover-entry-help"
                  placeholder="Buyer's code"
                  className={`h-10 w-full rounded-lg border bg-white pl-9 pr-3 text-[15px] font-semibold tabular-nums tracking-[0.35em] text-slate-900 outline-none placeholder:font-normal placeholder:tracking-normal focus:ring-4 dark:bg-[#131313] dark:text-white ${
                    entryError
                      ? "border-red-400 focus:border-red-500 focus:ring-red-500/15"
                      : "border-neutral-200 focus:border-[var(--accent)] focus:ring-[var(--accent-soft)] dark:border-neutral-700"
                  }`}
                />
              </label>
              <button type="submit" disabled={busy || verifying || entry.length !== 4} className={`${btn.primary} shrink-0`}>
                {verifying ? <Loader2 size={15} className="animate-spin" /> : <ShieldCheck size={15} />}
                Finish deal
              </button>
            </div>
            <p id="handover-entry-help" role={entryError ? "alert" : undefined} className={`text-[12px] ${entryError ? "font-medium text-red-600 dark:text-red-400" : "text-slate-500 dark:text-zinc-400"}`}>
              {entryError || "The buyer shows this code after paying. Only enter it once you have the money."}
            </p>
          </form>
        </>
      ) : (
        <>
          <Steps items={[["Check item", "Meet and check the item"], ["Pay", "Pay the seller"], ["Show code", "Show them your code"]]} />
          {shown && code ? (
            <div className="rounded-xl border border-dashed border-[var(--accent)] bg-[var(--accent-soft)] px-3 py-3 text-center">
              <p className="text-[11.5px] font-semibold uppercase tracking-wide text-[var(--accent-text)]">Your handover code</p>
              <p className="mt-1 select-all font-mono text-[34px] font-bold leading-none tracking-[0.3em] text-slate-900 tabular-nums dark:text-white" aria-live="polite">
                {code}
              </p>
              <p className="mx-auto mt-2 max-w-xs text-[12px] leading-relaxed text-slate-600 dark:text-zinc-300">
                Show this to the seller after you&apos;ve paid and checked the item. Never send it in the chat.
              </p>
            </div>
          ) : null}
          <button type="button" disabled={busy || loadingCode} onClick={reveal} className={`${shown ? btn.secondary : btn.primary} w-full`}>
            {loadingCode ? <Loader2 size={15} className="animate-spin" /> : shown ? <EyeOff size={15} /> : <Eye size={15} />}
            {shown ? "Hide code" : "Show handover code"}
          </button>
          {codeError && (
            <p role="alert" className="text-[12px] font-medium text-red-600 dark:text-red-400">
              {codeError}
            </p>
          )}
        </>
      )}

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-dashed border-neutral-200 pt-2 dark:border-neutral-700">
        <button type="button" disabled={busy} onClick={() => onMarkDone?.()} className={btn.link}>
          {legacyPaid && !isSeller ? "I got the item, finish deal" : "Can't use the code? Mark as done"}
        </button>
        {isSeller && onReschedule && status === "pickup_scheduled" && (
          <button type="button" disabled={busy} onClick={onReschedule} className={btn.link}>
            <CalendarDays size={13} /> Reschedule
          </button>
        )}
        {canNoShow && (
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              if (!noShowArmed) return setNoShowArmed(true);
              setNoShowArmed(false);
              onNoShow?.();
            }}
            className={`${btn.link} ${noShowArmed ? "!text-red-600 dark:!text-red-400" : "!text-slate-500 dark:!text-zinc-400"}`}
          >
            <UserX size={13} />
            {noShowArmed ? "Tap again: cancel the deal (no-show)" : `The ${other} didn't show up`}
          </button>
        )}
      </div>
    </div>
  );
};

export default memo(HandoverPanel);
