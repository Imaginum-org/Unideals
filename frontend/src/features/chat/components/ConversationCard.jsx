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
 * Conversation row, site-synced product-card language (Figtree, Unideals
 * primary accents) with the spec layout: product thumb + product name + time
 * / person photo + sentence-case name + Buying pill / last-message preview.
 * Pro / Pro+ rows render on the signature green card.
 */
const ConversationCard = ({ conv, selected, onClick }) => {
  const product = conv?.product || {};
  const other = conv?.otherParty || {};
  const rawImg = product?.images?.[0]?.url || product?.images?.[0];
  const img = typeof rawImg === "string" && rawImg ? rawImg : userdp;
  const title = product?.title || conv?.product_snapshot?.title || "Product";
  const pro = isProTier(other?.subscription);
  const name = formatName(other?.name);
  const photo = avatarUrl(other?.avatar);
  const buying = conv?.role !== "selling";
  const unread = conv?.unread || 0;

  return (
    <button
      onClick={() => onClick?.(conv)}
      className={`w-full text-left flex gap-3 px-3 py-2 rounded-xl transition-all mb-1.5 border font-figtree min-h-[72px] items-center ${
        pro
          ? "bg-[#22c55e] border-[#22c55e] shadow-sm hover:brightness-[0.97]"
          : selected
            ? "bg-[#3838EC]/5 border-[#3838EC]/25 shadow-sm dark:bg-[#3838EC]/15 dark:border-[#3838EC]/30"
            : "bg-white hover:bg-[#F7F8FA] border-zinc-200 dark:bg-[#1A1D20] dark:border-zinc-800 dark:hover:bg-[#1c1c1c]"
      } ${selected && pro ? "ring-2 ring-[#15803d] ring-offset-1" : ""}`}
    >
      <img
        src={img}
        alt={title}
        loading="lazy"
        width={49}
        height={49}
        className="size-[49px] rounded-full object-cover shrink-0 bg-white border border-black/5"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-2">
          <h3
            className={`font-normal text-[17px] truncate leading-[22px] ${
              pro ? "text-white" : "text-[#2A2A2A] dark:text-white"
            }`}
          >
            {title}
          </h3>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <span
              className={`text-xs leading-none ${
                pro
                  ? "text-white/85"
                  : unread > 0
                    ? "text-[#3838EC]"
                    : "text-zinc-400"
              }`}
            >
              {timeAgo(conv?.last_activity_at)}
            </span>
            {unread > 0 && (
              <span className="min-w-5 h-5 px-1 rounded-full bg-[#3838EC] text-white text-xs font-bold flex items-center justify-center">
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center justify-between gap-2 mt-1">
          <span className="flex items-center gap-1.5 min-w-0">
            {photo ? (
              <img
                src={photo}
                alt={name}
                loading="lazy"
                width={20}
                height={20}
                className="size-5 rounded-full object-cover shrink-0 bg-zinc-100"
              />
            ) : (
              <span
                className={`size-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                  pro
                    ? "bg-white text-[#16a34a]"
                    : "bg-[#3838EC]/10 text-[#3838EC]"
                }`}
              >
                {name.charAt(0)}
              </span>
            )}
            <span
              className={`text-sm font-normal truncate ${
                pro ? "text-white" : "text-zinc-500 dark:text-zinc-400"
              }`}
            >
              {name}
            </span>
          </span>
          <span
            className={`text-[10px] font-bold px-2 py-px rounded-full border shrink-0 ${
              pro
                ? "text-white border-white/80"
                : buying
                  ? "text-[#15803d] border-emerald-200 bg-[#E6F9EC]"
                  : "text-[#3838EC] border-indigo-200 bg-[#EEF0FF]"
            }`}
          >
            {buying ? "Buying" : "Selling"}
          </span>
        </div>
        <p
          className={`text-sm truncate mt-px ${
            pro ? "text-white/95" : "text-zinc-500 dark:text-zinc-400"
          }`}
        >
          {conv?.last_message || "Say hi"}
        </p>
      </div>
    </button>
  );
};

export default memo(ConversationCard);
