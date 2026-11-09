import { memo } from "react";
import { Crown } from "lucide-react";
import userdp from "/userdp.webp";
import { avatarUrl, formatName } from "../utils/display.js";

export const timeAgo = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return d.toLocaleDateString("en-IN", { weekday: "short" });
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
};

const isProTier = (sub) => sub === "pro" || sub === "pro_plus";

/**
 * Conversation row (inbox list). Product thumb with the other person's
 * avatar tucked in the corner, title + time, role chip + name + last
 * message, unread count. Pro / Pro+ counterparts get a crown (their chats
 * are also sorted first: "Chat priority" plan perk).
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

  return (
    <button
      type="button"
      onClick={() => onClick?.(conv)}
      aria-current={selected ? "true" : undefined}
      className={`relative flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left font-figtree transition-colors ${
        selected
          ? "bg-[var(--accent-soft)]"
          : "hover:bg-neutral-100 active:bg-neutral-100 dark:hover:bg-white/5 dark:active:bg-white/5"
      }`}
    >
      {selected && <span aria-hidden="true" className="absolute inset-y-2 left-0 w-[3px] rounded-r-full bg-[var(--accent)]" />}
      <span className="relative shrink-0">
        <img
          src={img}
          alt=""
          loading="lazy"
          width={44}
          height={44}
          className="size-11 rounded-lg border border-black/5 bg-white object-cover lg:size-10 dark:border-white/10"
        />
        <span
          className={`absolute -bottom-1 -right-1 grid size-5 place-items-center overflow-hidden rounded-full text-[9px] font-bold ring-2 ${
            selected ? "ring-[#EEEEFD] dark:ring-[#1E1F35]" : "ring-white dark:ring-[#16181B]"
          } ${photo ? "bg-neutral-100" : "bg-[var(--accent)] text-white"}`}
        >
          {photo ? <img src={photo} alt="" loading="lazy" width={20} height={20} className="size-full object-cover" /> : name.charAt(0)}
        </span>
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex items-baseline justify-between gap-2">
          <span className={`truncate text-[14px] leading-5 lg:text-[13.5px] ${hasUnread ? "font-semibold" : "font-medium"} text-slate-900 dark:text-white`}>
            {isGirls ? "🌸 " : ""}
            {title}
          </span>
          <span
            className={`shrink-0 text-[11.5px] leading-none tabular-nums ${
              hasUnread ? "font-semibold text-[var(--accent-text)]" : "text-slate-400 dark:text-zinc-500"
            }`}
          >
            {timeAgo(conv?.last_activity_at)}
          </span>
        </span>

        <span className="mt-0.5 flex items-center gap-2">
          <span
            className={`min-w-0 flex-1 truncate text-[13px] leading-5 lg:text-[12.5px] ${
              hasUnread ? "text-slate-800 dark:text-zinc-200" : "text-slate-500 dark:text-zinc-400"
            }`}
          >
            <span
              className={`mr-1.5 inline-block rounded px-1 align-[1px] text-[9.5px] font-bold uppercase tracking-wide ${
                buying
                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                  : "bg-[var(--accent-soft)] text-[var(--accent-text)]"
              }`}
            >
              {buying ? "Buying" : "Selling"}
            </span>
            <span className="font-medium text-slate-700 dark:text-zinc-300">{name}</span>
            {pro && <Crown className="mx-0.5 inline h-3 w-3 align-[-1px] text-amber-500" aria-label="Pro member" />}
            {": "}
            {conv?.last_message || "Say hi"}
          </span>
          {hasUnread && (
            <span className="grid h-[18px] min-w-[18px] shrink-0 place-items-center rounded-full bg-[var(--accent)] px-1 text-[10.5px] font-bold text-white">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </span>
      </span>
    </button>
  );
};

export default memo(ConversationCard);
