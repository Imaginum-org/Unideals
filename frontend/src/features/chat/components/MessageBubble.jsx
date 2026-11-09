import { memo, useRef } from "react";
import { Check, CheckCheck, Copy, Reply, RotateCcw, ShieldAlert, X } from "lucide-react";
import { toast } from "../../../components/ui/toast.js";
import { formatName } from "../utils/display.js";

export const fmtTime = (iso) => {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
  } catch {
    return "";
  }
};

export const parseAmount = (text) => {
  const m = String(text || "").replace(/,/g, "").match(/(\d+)/);
  return m ? Number(m[1]) : null;
};

const Ticks = ({ status }) => {
  if (status === "read") return <CheckCheck size={15} className="shrink-0 text-[var(--accent-text)]" aria-label="Read" />;
  if (status === "delivered") return <CheckCheck size={15} className="shrink-0 text-slate-400" aria-label="Delivered" />;
  return <Check size={15} className="shrink-0 text-slate-400" aria-label="Sent" />;
};

// Clickable links (http/https only) + in-thread search highlight. Text is
// rendered as React nodes, never HTML, so there is no injection surface.
const URL_RE = /(https?:\/\/[^\s<>"']+)/gi;
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const highlight = (text, query, keyBase) => {
  if (!query) return text;
  const parts = String(text).split(new RegExp(`(${escapeRe(query)})`, "ig"));
  return parts.map((p, i) =>
    p.toLowerCase() === query.toLowerCase() ? (
      <mark key={`${keyBase}-${i}`} className="rounded-sm bg-amber-200 px-0.5 text-inherit dark:bg-amber-500/40">
        {p}
      </mark>
    ) : (
      p
    ),
  );
};

const RichText = ({ text, query }) => {
  const parts = String(text || "").split(URL_RE);
  return parts.map((part, i) =>
    /^https?:\/\//i.test(part) ? (
      <a
        key={i}
        href={part}
        target="_blank"
        rel="noopener noreferrer nofollow"
        className="break-all font-medium text-[var(--accent-text)] underline underline-offset-2"
        onClick={(e) => e.stopPropagation()}
      >
        {highlight(part, query, i)}
      </a>
    ) : (
      <span key={i}>{highlight(part, query, i)}</span>
    ),
  );
};

const copyText = async (text) => {
  try {
    await navigator.clipboard.writeText(String(text || ""));
    toast.success("Copied", { id: "chat-copy" });
  } catch {
    toast.error("Couldn't copy");
  }
};

/**
 * Thread message:
 * - text: outgoing accent tint / incoming white, time + ticks inside the
 *   bubble, tail corner on the last of a run; hover toolbar (Reply, Copy),
 *   swipe right to reply and long-press to copy on touch
 * - offer: incoming offers get Accept / Decline / Counter
 * - system: centred neutral pill
 */
const MessageBubble = ({
  msg,
  isMine,
  myId,
  deal,
  otherName,
  onAccept,
  onDecline,
  onCounter,
  onReply,
  onJumpTo,
  acting,
  isLastOfGroup = true,
  query = "",
}) => {
  const touchStart = useRef(null);
  const pressTimer = useRef(null);
  const repliable = msg?.message_type !== "system" && !msg?.is_flagged;
  const copyable = msg?.message_type === "text" && !msg?.is_flagged;

  const onTouchStart = (e) => {
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    if (copyable) {
      clearTimeout(pressTimer.current);
      pressTimer.current = setTimeout(() => {
        touchStart.current = null;
        copyText(msg.text);
        navigator.vibrate?.(10);
      }, 500);
    }
  };
  const onTouchMove = (e) => {
    const s = touchStart.current;
    if (!s) return;
    if (Math.abs(e.touches[0].clientX - s.x) > 8 || Math.abs(e.touches[0].clientY - s.y) > 8) clearTimeout(pressTimer.current);
  };
  const onTouchEnd = (e) => {
    clearTimeout(pressTimer.current);
    const s = touchStart.current;
    touchStart.current = null;
    if (!s || !repliable) return;
    const dx = e.changedTouches[0].clientX - s.x;
    const dy = e.changedTouches[0].clientY - s.y;
    if (dx > 60 && Math.abs(dy) < 40) onReply?.(msg);
  };
  const touch = { onTouchStart, onTouchMove, onTouchEnd, onTouchCancel: () => clearTimeout(pressTimer.current) };

  const replyLabel =
    msg?.reply && myId && String(msg.reply.sender_id) === String(myId) ? "You" : formatName(msg?.reply?.sender_name || otherName);

  // Desktop hover toolbar (Reply / Copy), on the outer side of the bubble.
  const Toolbar = repliable ? (
    <div
      className={`absolute top-1/2 hidden -translate-y-1/2 items-center gap-0.5 rounded-full border border-neutral-200 bg-white p-0.5 opacity-0 shadow-sm transition group-hover:opacity-100 focus-within:opacity-100 md:flex dark:border-neutral-700 dark:bg-[#1A1D20] ${
        isMine ? "right-full mr-1.5" : "left-full ml-1.5"
      }`}
    >
      <button
        type="button"
        onClick={() => onReply?.(msg)}
        aria-label="Reply"
        title="Reply"
        className="grid size-7 place-items-center rounded-full text-slate-500 hover:bg-neutral-100 hover:text-slate-900 dark:text-zinc-400 dark:hover:bg-white/10 dark:hover:text-white"
      >
        <Reply size={14} />
      </button>
      {copyable && (
        <button
          type="button"
          onClick={() => copyText(msg.text)}
          aria-label="Copy message"
          title="Copy"
          className="grid size-7 place-items-center rounded-full text-slate-500 hover:bg-neutral-100 hover:text-slate-900 dark:text-zinc-400 dark:hover:bg-white/10 dark:hover:text-white"
        >
          <Copy size={13} />
        </button>
      )}
    </div>
  ) : null;

  const QuoteBlock = msg?.reply ? (
    <button
      type="button"
      onClick={() => onJumpTo?.(msg.reply._id)}
      title="Jump to original"
      className="mb-1 flex w-full items-stretch overflow-hidden rounded-md bg-black/[0.05] text-left dark:bg-white/10"
    >
      <span className="w-[3px] shrink-0 bg-[var(--accent)]" />
      <span className="min-w-0 flex-1 px-2 py-1">
        <span className="block truncate text-[12px] font-semibold text-[var(--accent-text)]">{replyLabel}</span>
        <span className="block truncate text-[12px] text-slate-600 dark:text-zinc-300">{msg.reply.text || ""}</span>
      </span>
    </button>
  ) : null;

  if (msg?.message_type === "system") {
    return (
      <div className="flex justify-center px-6 py-0.5">
        <span className="rounded-full bg-white/90 px-3 py-1 text-center text-[12px] leading-[18px] text-slate-500 shadow-sm ring-1 ring-black/5 dark:bg-[#1A1D20] dark:text-zinc-400 dark:ring-white/5">
          {msg.text}
        </span>
      </div>
    );
  }

  if (msg?.message_type === "offer") {
    const offerEntry = deal?.offer_history?.find((o) => String(o.message_id) === String(msg._id));
    const status = offerEntry?.status || "pending";
    const amount = offerEntry?.amount ?? parseAmount(msg.text) ?? 0;
    const label = Number(amount).toLocaleString("en-IN");
    const canRespond = !isMine && status === "pending";
    const statusLine =
      status === "accepted" ? (
        <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-300">
          <Check size={12} strokeWidth={3} /> Accepted
        </span>
      ) : status === "declined" ? (
        <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400">
          <X size={12} strokeWidth={3} /> Declined
        </span>
      ) : status === "pending" ? (
        <span className="text-slate-500 dark:text-zinc-400">Waiting for reply</span>
      ) : (
        <span className="text-slate-500 dark:text-zinc-400">Expired</span>
      );

    return (
      <div {...touch} className={`group relative flex ${isMine ? "justify-end" : "justify-start"}`}>
        <div className="relative w-[260px] max-w-[85%]">
          {Toolbar}
          <div
            className={`overflow-hidden rounded-2xl border shadow-sm ${
              isMine
                ? "border-[var(--accent-soft-strong)] bg-[var(--accent-soft)] dark:bg-[#23244A]"
                : "border-emerald-200 bg-white dark:border-emerald-900/60 dark:bg-[#1A1D20]"
            }`}
          >
            {!isMine && <div className="h-1 bg-emerald-500" aria-hidden="true" />}
            <div className="px-3.5 pb-2.5 pt-3">
              {QuoteBlock}
              <p className="text-[11.5px] font-medium text-slate-500 dark:text-zinc-400">
                {isMine ? "You offered" : `${otherName || "Buyer"} offered`}
              </p>
              <p className="mt-0.5 text-[22px] font-bold leading-7 tracking-tight text-slate-900 dark:text-white">₹{label}</p>
              {canRespond ? (
                <div className="mt-2.5 flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={acting}
                    onClick={() => onAccept?.(msg)}
                    className="inline-flex h-8 flex-1 items-center justify-center gap-1 rounded-lg bg-emerald-600 text-[13px] font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
                  >
                    <Check size={14} strokeWidth={3} /> Accept
                  </button>
                  <button
                    type="button"
                    disabled={acting}
                    onClick={() => onDecline?.(msg)}
                    className="inline-flex h-8 flex-1 items-center justify-center gap-1 rounded-lg border border-neutral-200 bg-white text-[13px] font-semibold text-slate-700 transition-colors hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-700 dark:bg-transparent dark:text-zinc-200"
                  >
                    <X size={14} strokeWidth={3} /> Decline
                  </button>
                  <button
                    type="button"
                    disabled={acting}
                    title="Counter offer"
                    aria-label="Counter offer"
                    onClick={() => onCounter?.(msg)}
                    className="grid size-8 shrink-0 place-items-center rounded-lg border border-neutral-200 text-slate-600 transition-colors hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-700 dark:text-zinc-300"
                  >
                    <RotateCcw size={14} />
                  </button>
                </div>
              ) : null}
              <div className="mt-2 flex items-center justify-between text-[11px] font-medium">
                {statusLine}
                <span className="text-slate-400 dark:text-zinc-500">{fmtTime(msg.createdAt)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Safety-screened content renders as a Blocked chip.
  if (msg?.is_flagged) {
    return (
      <div className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
        <div className="max-w-[80%] rounded-2xl border border-red-200 bg-red-50 px-3.5 py-2 shadow-sm dark:border-red-900/50 dark:bg-red-950/30">
          <p className="flex items-center gap-1.5 text-[13px] font-semibold text-red-700 dark:text-red-400">
            <ShieldAlert size={14} className="shrink-0" />
            Message blocked
          </p>
          <p className="mt-0.5 text-[11.5px] text-red-600/90 dark:text-red-400/80">Flagged and sent to the admin team for review.</p>
        </div>
      </div>
    );
  }

  return (
    <div {...touch} className={`group relative flex ${isMine ? "justify-end" : "justify-start"}`}>
      <div className="relative max-w-[82%] md:max-w-[70%]">
        {Toolbar}
        <div
          className={`relative break-words px-3 pb-1.5 pt-1.5 text-[14px] leading-[20px] shadow-[0_1px_1px_rgba(15,23,42,0.06)] [overflow-wrap:anywhere] ${
            isMine
              ? "bg-[#E8E8FD] text-slate-900 dark:bg-[#2E2F6B] dark:text-zinc-100"
              : "bg-white text-slate-900 ring-1 ring-black/[0.04] dark:bg-[#1F2226] dark:text-zinc-100 dark:ring-white/5"
          } ${isLastOfGroup ? (isMine ? "rounded-2xl rounded-br-md" : "rounded-2xl rounded-bl-md") : "rounded-2xl"}`}
        >
          {QuoteBlock}
          <span className="whitespace-pre-wrap">
            <RichText text={msg.text} query={query} />
          </span>
          <span className="float-right ml-2 mt-[7px] flex select-none items-center gap-[3px] text-[10.5px] leading-none text-slate-500/80 dark:text-zinc-400">
            {fmtTime(msg.createdAt)}
            {isMine && <Ticks status={msg.message_status} />}
          </span>
        </div>
      </div>
    </div>
  );
};

export default memo(MessageBubble);
