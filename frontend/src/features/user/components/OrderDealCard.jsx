import { memo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, CheckCircle2, ChevronRight, MapPin, MessageSquareText, XCircle } from "lucide-react";
import { ORDER_STEPS, dealStatusToStep, dealStatusBadge } from "../../chat/utils/dealStage.js";
import { formatName } from "../../chat/utils/display.js";
import { cancelOrder } from "../api/ordersApi.js";
import { toast } from "../../../components/ui/toast.js";
import { productPath } from "../../../utils/productPath.js";
import { CARD, FLUSH_ON_PHONE, btnDanger, btnSecondary } from "./account/AccountKit.jsx";
import { cn } from "../../../utils/cn.js";

const inr = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

/**
 * Deal-driven order card. Renders the SAME Deal.status the chat renders
 * (shared dealStage mapping), so chat stages and orders stay in sync. Stage
 * changes happen in chat (single writer); Cancel writes the same Deal.
 */
const OrderDealCard = ({ order, onChanged }) => {
  const navigate = useNavigate();
  const [cancelling, setCancelling] = useState(false);

  const status = order?.dealStatus || "negotiating";
  const step = dealStatusToStep(status);
  const badge = dealStatusBadge(status);
  const isCancelled = status === "cancelled";
  const isCompleted = status === "completed";
  const isActive = step >= 1 && step <= 3;
  const buying = order?.role === "buying";

  const product = order?.product || {};
  const rawImage = product?.images?.[0]?.url || product?.images?.[0];
  const imageUrl = typeof rawImage === "string" ? rawImage : "/logo.svg";
  const otherName = formatName(order?.otherParty?.name);
  const pickup = order?.pickup || null;
  const price = Number(order?.price || 0);
  const original = Number(order?.originalPrice || 0);
  const updated = order?.updatedAt
    ? new Date(order.updatedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })
    : "";

  const openChat = () => navigate(`/chat?conversation=${order?.conversationId}`);

  const handleCancel = async () => {
    if (!window.confirm("Cancel this order? The item becomes available again.")) return;
    setCancelling(true);
    try {
      await cancelOrder(order.conversationId, "Cancelled from orders page");
      toast.success("Order cancelled. The item is live again.");
      onChanged?.();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not cancel order");
    } finally {
      setCancelling(false);
    }
  };

  return (
    <article className={cn(CARD, FLUSH_ON_PHONE, "overflow-hidden")}>
      {/* Header */}
      <div className="flex items-center justify-between gap-3 border-b border-neutral-100 px-4 py-2.5 sm:px-5 dark:border-neutral-800">
        <div className="flex min-w-0 items-center gap-2 text-[12.5px] text-slate-500 dark:text-zinc-400">
          <span
            className={cn(
              "rounded-md px-1.5 py-0.5 text-[11px] font-semibold",
              buying
                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                : "bg-[var(--accent-soft)] text-[var(--accent-text)]",
            )}
          >
            {buying ? "Buying" : "Selling"}
          </span>
          <span className="truncate">#{String(order?.conversationId || "").slice(-6).toUpperCase()}</span>
          {updated && <span className="hidden sm:inline">· Updated {updated}</span>}
        </div>
        <span className={cn("shrink-0 rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold", badge.cls)}>{badge.label}</span>
      </div>

      {/* Item */}
      <div className="flex items-start gap-3.5 px-4 py-4 sm:px-5">
        <img
          src={imageUrl}
          alt={product?.title || "Product"}
          loading="lazy"
          className="h-16 w-16 shrink-0 rounded-xl border border-neutral-100 bg-neutral-100 object-cover sm:h-[72px] sm:w-[72px] dark:border-neutral-800 dark:bg-white/5"
        />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[15px] font-semibold text-slate-900 dark:text-white">{product?.title || "Product"}</h3>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[12.5px] text-slate-500 dark:text-zinc-400">
            {otherName && otherName !== "User" && (
              <span>
                {buying ? "Seller" : "Buyer"} <span className="font-medium text-slate-700 dark:text-zinc-200">{otherName}</span>
              </span>
            )}
            {pickup?.location && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                {pickup.location}
                {pickup?.date ? ` · ${new Date(pickup.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}` : ""}
              </span>
            )}
          </div>
          {order?.last_message && (
            <p className="mt-1 truncate text-[12.5px] italic text-slate-400 dark:text-zinc-500">“{order.last_message}”</p>
          )}
        </div>
        <div className="shrink-0 text-right">
          <p className="text-[16px] font-bold tabular-nums text-slate-900 dark:text-white">{inr(price)}</p>
          {original > price ? (
            <p className="text-[12px] text-slate-400 line-through tabular-nums">{inr(original)}</p>
          ) : null}
          <p className="text-[11px] text-slate-400 dark:text-zinc-500">{original > price ? "Agreed price" : "Price"}</p>
        </div>
      </div>

      {/* Progress: same 4 stages as chat */}
      {isCancelled ? (
        <p className="mx-4 mb-4 flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-[12.5px] font-medium text-red-700 sm:mx-5 dark:bg-red-950/30 dark:text-red-300">
          <XCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
          Cancelled · item available again
        </p>
      ) : (
        <ol className="mx-4 mb-4 grid grid-cols-4 gap-1.5 sm:mx-5" aria-label="Order progress">
          {ORDER_STEPS.map((s) => {
            const done = step > s.id;
            const current = step === s.id;
            return (
              <li key={s.id} className="min-w-0" aria-current={current ? "step" : undefined}>
                <div
                  className={cn(
                    "h-1.5 rounded-full",
                    done || current ? "bg-[var(--accent)]" : "bg-neutral-200 dark:bg-neutral-700",
                    current && !done && "opacity-60",
                  )}
                />
                <p
                  className={cn(
                    "mt-1.5 flex items-center gap-1 truncate text-[11px]",
                    done || current ? "font-semibold text-slate-700 dark:text-zinc-200" : "text-slate-400 dark:text-zinc-500",
                  )}
                >
                  {done && <Check className="h-3 w-3 shrink-0 text-[var(--accent-text)]" strokeWidth={3} aria-hidden="true" />}
                  <span className="truncate">{s.label}</span>
                </p>
              </li>
            );
          })}
        </ol>
      )}

      {/* Actions: stage changes go through chat (single writer) */}
      <div className="flex flex-wrap items-center gap-2 border-t border-neutral-100 bg-neutral-50/60 px-4 py-3 sm:px-5 dark:border-neutral-800 dark:bg-white/[0.02]">
        <button type="button" onClick={openChat} className={cn(btnSecondary, "flex-1 sm:flex-none")}>
          <MessageSquareText className="h-4 w-4" aria-hidden="true" />
          {buying ? "Chat with seller" : "Chat with buyer"}
          {(order?.unread || 0) > 0 && (
            <span className="rounded-full bg-[var(--accent)] px-1.5 text-[11px] font-bold text-white">{order.unread}</span>
          )}
        </button>
        {isActive && (
          <button type="button" onClick={handleCancel} disabled={cancelling} className={btnDanger}>
            {cancelling ? "Cancelling…" : "Cancel order"}
          </button>
        )}
        {isCompleted && (
          <span className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            Completed
          </span>
        )}
        {product?._id && (
          <button
            type="button"
            onClick={() => navigate(productPath(product))}
            className="ml-auto inline-flex items-center gap-0.5 text-[13px] font-semibold text-[var(--accent-text)] hover:underline"
          >
            View item
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
      </div>
    </article>
  );
};

export default memo(OrderDealCard);
