import { memo, useEffect, useRef } from "react";
import { Copy } from "lucide-react";

// Same fixed set as the server (backend MESSAGE_REACTIONS).
const REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

/**
 * Floating picker above a bubble. Closes on outside tap / Esc. Shows a Copy
 * chip too when opened by long-press on text (phones have no hover bar).
 */
export const ReactionPicker = memo(function ReactionPicker({ isMine, mine, onPick, onClose, onCopy }) {
  const ref = useRef(null);
  useEffect(() => {
    const onDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("pointerdown", onDown, true);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown, true);
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return (
    <div
      ref={ref}
      role="menu"
      aria-label="React to message"
      className={`absolute bottom-full z-30 mb-1.5 flex items-center gap-0.5 rounded-full border border-neutral-200 bg-white p-1 shadow-[0_10px_28px_-10px_rgba(15,23,42,0.35)] motion-safe:animate-chat-in dark:border-neutral-700 dark:bg-[#1A1D20] ${
        isMine ? "right-0" : "left-0"
      }`}
    >
      {REACTIONS.map((e) => (
        <button
          key={e}
          type="button"
          role="menuitem"
          aria-label={`React ${e}`}
          aria-pressed={mine === e}
          onClick={() => onPick(mine === e ? null : e)}
          className={`grid size-9 place-items-center rounded-full text-[20px] leading-none transition-transform hover:scale-125 active:scale-95 ${
            mine === e ? "bg-[var(--accent-soft)]" : ""
          }`}
        >
          {e}
        </button>
      ))}
      {onCopy && (
        <button
          type="button"
          role="menuitem"
          aria-label="Copy message"
          onClick={onCopy}
          className="ml-0.5 grid size-9 place-items-center rounded-full border-l border-neutral-200 text-slate-500 hover:bg-neutral-100 dark:border-neutral-700 dark:text-zinc-400 dark:hover:bg-white/10"
        >
          <Copy size={15} />
        </button>
      )}
    </div>
  );
});

/** Chips under a bubble: one per emoji, a count when both picked it. */
export const ReactionChips = memo(function ReactionChips({ reactions, myId, isMine, onToggle }) {
  if (!reactions?.length) return null;
  const groups = [];
  for (const r of reactions) {
    const g = groups.find((x) => x.emoji === r.emoji);
    const mine = String(r.user_id) === String(myId);
    if (g) {
      g.count += 1;
      g.mine = g.mine || mine;
    } else groups.push({ emoji: r.emoji, count: 1, mine });
  }
  return (
    <div className={`-mt-1.5 flex gap-1 px-2 ${isMine ? "justify-end" : "justify-start"}`}>
      {groups.map((g) => (
        <button
          key={g.emoji}
          type="button"
          onClick={() => g.mine && onToggle?.(null)}
          disabled={!g.mine}
          title={g.mine ? "Tap to remove your reaction" : undefined}
          aria-label={`${g.emoji} ${g.count}${g.mine ? ", yours, tap to remove" : ""}`}
          className={`relative z-[1] inline-flex h-6 items-center gap-0.5 rounded-full border px-1.5 text-[13px] leading-none shadow-sm transition-transform enabled:hover:scale-105 disabled:cursor-default ${
            g.mine
              ? "border-[var(--accent-ring)] bg-[var(--accent-soft)]"
              : "border-neutral-200 bg-white dark:border-neutral-700 dark:bg-[#1F2226]"
          }`}
        >
          {g.emoji}
          {g.count > 1 && <span className="text-[11px] font-semibold tabular-nums text-slate-600 dark:text-zinc-300">{g.count}</span>}
        </button>
      ))}
    </div>
  );
});
