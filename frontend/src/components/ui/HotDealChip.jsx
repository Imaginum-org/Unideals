import { Flame } from "lucide-react";
import { cn } from "../../utils/cn.js";

/**
 * "Hot deal" tag. Same shape language as the header Sell button
 * (rounded-lg rectangle, not a pill) so it reads as a native control.
 *
 *   <HotDealChip />                 // product card overlay (default)
 *   <HotDealChip size="md" />       // product page badge row
 */
export default function HotDealChip({ size = "sm", className }) {
  return (
    <span
      className={cn(
        "inline-flex select-none items-center gap-1 rounded-lg bg-gradient-to-r from-[#FF5A1F] to-[#F43F5E] font-semibold text-white shadow-sm shadow-orange-500/30",
        size === "md" ? "px-2.5 py-1 text-[12px]" : "px-2 py-1 text-[11px] leading-none sm:px-2.5 sm:text-[12px]",
        className,
      )}
      title="Getting a lot of views right now"
    >
      <Flame className={size === "md" ? "h-3.5 w-3.5" : "h-3 w-3 sm:h-3.5 sm:w-3.5"} aria-hidden="true" />
      Hot deal
    </span>
  );
}
