import { useState } from "react";
import { Check, Copy, ThumbsDown, ThumbsUp } from "lucide-react";

const plainText = (text = "") => String(text).replace(/\*\*([^*]+)\*\*/g, "$1").replace(/\*([^*\s][^*]*)\*/g, "$1");

const iconButton =
  "flex h-7 w-7 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-40 dark:text-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-zinc-200";

/**
 * Copy for every reply; thumbs up / down for saved replies (signed-in
 * students), so the team can see which answers miss.
 */
const AssistantMessageActions = ({ text, feedback = null, canRate, onRate }) => {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(plainText(text));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard blocked (insecure context or permission): nothing to do.
    }
  };

  const rate = (value) => onRate?.(feedback === value ? null : value);

  return (
    <div className="mt-1 flex items-center gap-0.5 pl-1">
      <button type="button" onClick={copy} className={iconButton} aria-label={copied ? "Copied" : "Copy reply"} title={copied ? "Copied" : "Copy"}>
        {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
      </button>
      {canRate && (
        <>
          <button
            type="button"
            onClick={() => rate("up")}
            className={`${iconButton} ${feedback === "up" ? "!text-emerald-600 dark:!text-emerald-400" : ""}`}
            aria-label="Helpful"
            aria-pressed={feedback === "up"}
            title="Helpful"
          >
            <ThumbsUp className={`h-3.5 w-3.5 ${feedback === "up" ? "fill-current" : ""}`} />
          </button>
          <button
            type="button"
            onClick={() => rate("down")}
            className={`${iconButton} ${feedback === "down" ? "!text-rose-600 dark:!text-rose-400" : ""}`}
            aria-label="Not helpful"
            aria-pressed={feedback === "down"}
            title="Not helpful"
          >
            <ThumbsDown className={`h-3.5 w-3.5 ${feedback === "down" ? "fill-current" : ""}`} />
          </button>
        </>
      )}
    </div>
  );
};

export default AssistantMessageActions;
