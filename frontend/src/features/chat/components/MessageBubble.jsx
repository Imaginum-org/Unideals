import { memo, useRef } from "react";
import { Check, CheckCheck, Reply, RotateCcw, ShieldAlert, X } from "lucide-react";
import { SELL_BTN } from "../utils/chatTheme.js";
import { formatName } from "../utils/display.js";

export const fmtTime = (iso) => {
  try {
    return new Date(iso).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  } catch {
    return "";
  }
};

export const parseAmount = (text) => {
  const m = String(text || "").replace(/,/g, "").match(/(\d+)/);
  return m ? Number(m[1]) : null;
};

const Ticks = ({ status }) => {
  if (status === "read")
    return <CheckCheck size={16} className="text-[#3838EC] shrink-0" />;
  if (status === "delivered")
    return <CheckCheck size={16} className="text-[#8696a0] shrink-0" />;
  return <Check size={16} className="text-[#8696a0] shrink-0" />;
};

/**
 * WhatsApp-layout thread message in Unideals theme:
 * - text: outgoing indigo tint / incoming white, 14.2px ink, time+ticks
 *   floated inside the bubble bottom-right, tail corner on last-of-group
 * - offer: seller green card / buyer light-blue card (product spec)
 * - system: centered neutral pill
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
}) => {
  // Swipe right to reply (touch), hover icon on desktop. System + flagged
  // bubbles stay quote-free.
  const touchStart = useRef(null);
  const repliable =
    msg?.message_type !== "system" && !msg?.is_flagged;
  const onTouchStart = (e) => {
    touchStart.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    };
  };
  const onTouchEnd = (e) => {
    const s = touchStart.current;
    touchStart.current = null;
    if (!s || !repliable) return;
    const dx = e.changedTouches[0].clientX - s.x;
    const dy = e.changedTouches[0].clientY - s.y;
    if (dx > 60 && Math.abs(dy) < 40) onReply?.(msg);
  };
  const replyLabel =
    msg?.reply && myId && String(msg.reply.sender_id) === String(myId)
      ? "You"
      : formatName(msg?.reply?.sender_name || otherName);
  const ReplyButton = repliable ? (
    <button
      onClick={() => onReply?.(msg)}
      aria-label="Reply to message"
      title="Reply"
      className={`absolute top-1/2 hidden size-7 -translate-y-1/2 items-center justify-center rounded-full bg-white text-zinc-400 opacity-0 shadow transition hover:text-[#3838EC] focus:opacity-100 group-hover:opacity-100 dark:bg-zinc-800 md:flex ${
        isMine ? "-left-9" : "-right-9"
      }`}
    >
      <Reply size={14} />
    </button>
  ) : null;
  const QuoteBlock = msg?.reply ? (
    <button
      onClick={() => onJumpTo?.(msg.reply._id)}
      title="Jump to original"
      className="mb-1 flex w-full items-stretch overflow-hidden rounded-md bg-black/[0.06] text-left dark:bg-white/10"
    >
      <span className="w-1 shrink-0 bg-[#3838EC]" />
      <span className="min-w-0 flex-1 px-2 py-1">
        <span className="block truncate text-[12px] font-semibold text-[#3838EC] dark:text-[#8FA2FF]">
          {replyLabel}
        </span>
        <span className="block truncate text-[12px] text-zinc-600 dark:text-zinc-300">
          {msg.reply.text || ""}
        </span>
      </span>
    </button>
  ) : null;
  if (msg?.message_type === "system") {
    return (
      <div className="flex justify-center px-8 py-0.5">
        <span className="text-center text-[12.5px] leading-[19px] text-[#54656f] dark:text-[#8696a0] bg-white dark:bg-[#1c1c1c] px-3 py-[5px] rounded-lg shadow-sm">
          {msg.text}
        </span>
      </div>
    );
  }

  if (msg?.message_type === "offer") {
    const offerEntry = deal?.offer_history?.find(
      (o) => String(o.message_id) === String(msg._id),
    );
    const status = offerEntry?.status || "pending";
    const amount = offerEntry?.amount ?? parseAmount(msg.text) ?? 0;
    const label = Number(amount).toLocaleString("en-IN");
    const canRespond = !isMine && status === "pending";

    if (!isMine) {
      // ---- Seller view: green offer card ----
      return (
        <div
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
          className="group relative flex flex-col items-start"
        >
          {ReplyButton}
          <div className="max-w-[85%] md:max-w-[65%] rounded-lg px-4 pt-3 pb-2 shadow-sm bg-[#22c55e]">
            {QuoteBlock}
            <div className="flex items-center gap-2.5">
              <span className="size-8 rounded-full bg-white text-zinc-900 flex items-center justify-center font-bold text-base shrink-0">
                ₹
              </span>
              <div className="min-w-0">
                <p className="text-[11px] font-medium text-zinc-700/80 truncate">
                  {otherName || "Buyer"} offered
                </p>
                <p className="text-[22px] leading-7 font-black text-zinc-900">
                  ₹{label}
                </p>
              </div>
            </div>
            {canRespond && (
              <div className="flex items-center gap-2 mt-3">
                <button
                  disabled={acting}
                  onClick={() => onAccept?.(msg)}
                  className={`${SELL_BTN} flex items-center gap-1.5 px-4 py-2 text-sm`}
                >
                  <Check size={16} strokeWidth={3} /> Accept
                </button>
                <button
                  disabled={acting}
                  onClick={() => onDecline?.(msg)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white text-zinc-800 text-sm font-medium hover:bg-zinc-100 disabled:opacity-50 transition-all"
                >
                  <X size={16} strokeWidth={3} /> Decline
                </button>
                <button
                  disabled={acting}
                  title="Counter offer"
                  aria-label="Counter offer"
                  onClick={() => onCounter?.(msg)}
                  className="size-9 rounded-full bg-white text-zinc-700 flex items-center justify-center hover:bg-zinc-100 disabled:opacity-50 shrink-0"
                >
                  <RotateCcw size={16} />
                </button>
              </div>
            )}
            {!canRespond && status !== "pending" && (
              <p className="text-[11px] mt-2 font-bold text-zinc-800 flex items-center gap-1">
                {status === "accepted" ? (
                  <><Check size={12} strokeWidth={3.5} /> Accepted</>
                ) : status === "declined" ? (
                  <><X size={12} strokeWidth={3.5} /> Declined</>
                ) : (
                  "Expired"
                )}
              </p>
            )}
            <p className="text-right text-[10px] text-zinc-800/70 mt-1">
              {fmtTime(msg.createdAt)}
            </p>
          </div>
        </div>
      );
    }

    // ---- Buyer view: light-blue "You offered" card ----
    return (
      <div
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        className="group relative flex flex-col items-end"
      >
        {ReplyButton}
        <div className="max-w-[85%] md:max-w-[65%] rounded-lg px-4 pt-2.5 pb-2 shadow-sm bg-[#e9f0fe] border border-[#d7e3fd]">
          {QuoteBlock}
          <p className="text-right text-[11px] text-zinc-500">You offered</p>
          <div className="flex items-center justify-end gap-2 mt-0.5">
            <span className="size-7 rounded-full bg-[#d3e2fd] text-zinc-700 flex items-center justify-center font-bold text-sm">
              ₹
            </span>
            <p className="text-[19px] font-black text-zinc-900">₹{label}</p>
          </div>
          {status !== "pending" && (
            <p className="text-right text-[11px] mt-1 font-semibold text-zinc-500 flex items-center justify-end gap-1">
              {status === "accepted" ? (
                <><Check size={12} strokeWidth={3.5} /> Accepted</>
              ) : status === "declined" ? (
                <><X size={12} strokeWidth={3.5} /> Declined</>
              ) : (
                "Expired"
              )}
            </p>
          )}
          <p className="text-right text-[10px] text-zinc-400 mt-0.5">
            {fmtTime(msg.createdAt)}
          </p>
        </div>
      </div>
    );
  }

  // Safety-screened: abusive content renders as a Blocked chip. The sender
  // additionally sees that a flag went to the admin team for review.
  if (msg?.is_flagged) {
    return (
      <div className={`flex flex-col ${isMine ? "items-end" : "items-start"}`}>
        <div className="max-w-[85%] md:max-w-[65%] rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 px-4 py-2.5 shadow-sm">
          <p className="flex items-center gap-2 text-[13px] font-bold text-red-600 dark:text-red-400">
            <ShieldAlert size={15} className="shrink-0" />
            Message blocked
          </p>
          <p className="mt-0.5 text-[11px] font-medium text-red-500/90 dark:text-red-400/80">
            Flagged. Sent to the admin team for review.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      className={`group relative flex flex-col ${isMine ? "items-end" : "items-start"}`}
    >
      {ReplyButton}
      <div
        className={`relative max-w-[85%] md:max-w-[65%] pl-[9px] pr-[7px] pt-[6px] pb-[7px] text-[14.2px] leading-[19px] shadow-sm break-words ${
          isMine
            ? "bg-[#EEF0FF] dark:bg-[#3838EC]/40 text-[#2A2A2A] dark:text-[#e9edef]"
            : "bg-white dark:bg-[#1c1c1c] text-[#2A2A2A] dark:text-[#e9edef]"
        } ${isLastOfGroup ? (isMine ? "rounded-lg rounded-br-none" : "rounded-lg rounded-bl-none") : "rounded-lg"}`}
      >
        {QuoteBlock}
        <span>{msg.text}</span>
        <span className="float-right flex items-center gap-[3px] text-[11px] leading-none text-[#667781] dark:text-[#8696a0] ml-2 mt-[9px] select-none">
          {fmtTime(msg.createdAt)}
          {isMine && <Ticks status={msg.message_status} />}
        </span>
      </div>
    </div>
  );
};

export default memo(MessageBubble);
