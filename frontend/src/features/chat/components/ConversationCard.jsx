import { memo } from "react";
import userdp from "/userdp.webp";
import { avatarUrl, formatName } from "../utils/display.js";

export const timeAgo = (iso) => {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days} days`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo`;
  return `${Math.floor(months / 12)}y`;
};

const isProTier = (sub) => sub === "pro" || sub === "pro_plus";

/**
 * Conversation row — messaging-app layout (WhatsApp / iMessage style):
 *   [product thumb + seller avatar]  Title ............ time
 *                                     Buying · Name: last message   (n)
 * Borderless rows on the list surface; unread rows go bold with an accent
 * time + count. Pro / Pro+ counterparts keep the signature green row.
 */
const ConversationCard = ({ conv, selected, onClick }) => {
  const product = conv?.product || {};
  const other = conv?.otherParty || {};
  const rawImg = product?.images?.[0]?.url || product?.images?.[0];
  const img = typeof rawImg === "string" && rawImg ? rawImg : userdp;
  const title = product?.title || conv?.product_snapshot?.title || "Product";
  const isGirls = Boolean(conv?.product_snapshot?.isGirlsOnly);
  const pro = isProTier(other?.subscription);
  const name = formatName(other?.name);
  const photo = avatarUrl(other?.avatar);
  const buying = conv?.role !== "selling";
  const unread = conv?.unread || 0;
  const hasUnread = unread > 0;

  const surface = pro
    ? "bg-[#22c55e] hover:brightness-[0.97]"
    : selected
      ? "bg-[var(--accent-soft)]"
      : "hover:bg-zinc-100/80 active:bg-zinc-100 dark:hover:bg-white/5 dark:active:bg-white/5";

  return (
    <button
      type="button"
      onClick={() => onClick?.(conv)}
      aria-current={selected ? "true" : undefined}
      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left font-figtree transition-colors ${surface} ${
        selected && pro ? "ring-2 ring-[#15803d] ring-offset-1" : ""
      }`}
    >
      {/* Product thumb with the other person's avatar tucked in the corner */}
      <span className="relative shrink-0">
        <img
          src={img}
          alt=""
          loading="lazy"
          width={52}
          height={52}
          className="size-[52px] rounded-xl border border-black/5 bg-white object-cover dark:border-white/10"
        />
        <span
          className={`absolute -bottom-1 -right-1 grid size-[22px] place-items-center overflow-hidden rounded-full text-[10px] font-bold ring-2 ${
            pro ? "ring-[#22c55e]" : selected ? "ring-[#EEF0FF] dark:ring-[#1E2140]" : "ring-white dark:ring-[#131313]"
          } ${photo ? "bg-zinc-100" : pro ? "bg-white text-[#16a34a]" : "bg-[#3838EC] text-white"}`}
        >
          {photo ? (
            <img src={photo} alt="" loading="lazy" width={22} height={22} className="size-full object-cover" />
          ) : (
            name.charAt(0)
          )}
        </span>
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex items-baseline justify-between gap-2">
          <span
            className={`truncate text-[15px] leading-5 ${hasUnread ? "font-semibold" : "font-medium"} ${
              pro ? "text-white" : "text-zinc-900 dark:text-white"
            }`}
          >
            {isGirls ? "🌸 " : ""}
            {title}
          </span>
          <span
            className={`shrink-0 text-[12px] leading-none tabular-nums ${
              pro ? "text-white/85" : hasUnread ? "font-semibold text-[var(--accent-text)]" : "text-zinc-400"
            }`}
          >
            {timeAgo(conv?.last_activity_at)}
          </span>
        </span>

        <span className="mt-1 flex items-center gap-2">
          <span
            className={`min-w-0 flex-1 truncate text-[13.5px] leading-5 ${
              pro ? "text-white/95" : hasUnread ? "text-zinc-800 dark:text-zinc-200" : "text-zinc-500 dark:text-zinc-400"
            }`}
          >
            <span
              className={`mr-1.5 inline-block rounded px-1 py-px align-[1px] text-[10px] font-bold uppercase tracking-wide ${
                pro
                  ? "bg-white/20 text-white"
                  : buying
                    ? "bg-[#E6F9EC] text-[#15803d] dark:bg-emerald-950/40 dark:text-emerald-300"
                    : "bg-[#EEF0FF] text-[#3838EC] dark:bg-indigo-950/40 dark:text-indigo-300"
              }`}
            >
              {buying ? "Buying" : "Selling"}
            </span>
            <span className={pro ? "text-white" : "font-medium text-zinc-700 dark:text-zinc-300"}>{name}</span>
            {": "}
            {conv?.last_message || "Say hi"}
          </span>
          {hasUnread && (
            <span
              className={`grid h-5 min-w-5 shrink-0 place-items-center rounded-full px-1.5 text-[11px] font-bold ${
                pro ? "bg-white text-[#16a34a]" : "bg-[var(--accent)] text-white"
              }`}
            >
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </span>
      </span>
    </button>
  );
};

export default memo(ConversationCard);
