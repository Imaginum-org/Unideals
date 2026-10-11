import { memo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiBox,
  FiClock,
  FiMessageSquare,
  FiChevronRight,
  FiMapPin,
  FiCheckCircle,
  FiXCircle,
} from "react-icons/fi";
import { MdCheck } from "react-icons/md";
import {
  ORDER_STEPS,
  dealStatusToStep,
  dealStatusBadge,
} from "../../chat/utils/dealStage.js";
import { formatName } from "../../chat/utils/display.js";
import { cancelOrder } from "../api/ordersApi.js";
import { toast } from "../../../components/ui/toast.js";

/**
 * Deal-driven order card. Renders the SAME Deal.status the chat renders
 * (via shared dealStage mapping), so chat stages and orders stay in sync.
 * All stage mutations happen in chat, this card links there; Cancel writes
 * to the same Deal document.
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

  const product = order?.product || {};
  const imageUrl =
    product?.images?.[0]?.url || product?.images?.[0] || "/logo.svg";
  const other = order?.otherParty || {};
  const otherName = formatName(other?.name);
  const pickup = order?.pickup || null;

  const openChat = () =>
    navigate(`/chat?conversation=${order?.conversationId}`);

  const handleCancel = async () => {
    if (!window.confirm("Cancel this order? The item becomes available again.")) return;
    setCancelling(true);
    try {
      await cancelOrder(order.conversationId, "Cancelled from orders page");
      toast.success("Cancelled. Item's live again.");
      onChanged?.();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not cancel order");
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="bg-[#F7F8FA] dark:bg-[#1c1c1c] rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden font-figtree mb-1">
      {/* HEADER */}
      <div className="px-5 py-3 border-b border-gray-50 dark:border-gray-800/50 bg-gray-100 dark:bg-[#242424] flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-gray-400 font-medium min-w-0">
          <FiBox size={16} className="shrink-0" />
          <span className="truncate">#{String(order?.conversationId || "").slice(-8)}</span>
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${
              order?.role === "buying"
                ? "text-emerald-600 border-emerald-300 bg-emerald-50"
                : "text-indigo-600 border-indigo-300 bg-indigo-50"
            }`}
          >
            {order?.role === "buying" ? "Buying" : "Selling"}
          </span>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-gray-400">
            <FiClock size={14} />
            {order?.updatedAt
              ? new Date(order.updatedAt).toLocaleDateString("en-GB").replace(/\//g, "-")
              : ""}
          </div>
          <div className={`text-[12px] font-bold px-3 py-1 rounded-full ${badge.cls}`}>
            {badge.label}
          </div>
        </div>
      </div>

      {/* BODY */}
      <div className="py-4 px-4 md:px-5">
        <div className="flex items-start gap-5">
          <img
            className="w-12 h-12 md:w-[5vw] md:h-[5vw] rounded-xl object-cover bg-gray-100 dark:bg-gray-800 border border-gray-50 dark:border-gray-700"
            src={typeof imageUrl === "string" ? imageUrl : "/logo.svg"}
            alt={product?.title || "product"}
          />
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-bold text-gray-900 dark:text-white leading-tight truncate">
              {product?.title || "Product"}
            </h3>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-gray-500 dark:text-gray-400">
              {otherName && otherName !== "User" ? (
                <span>
                  {order?.role === "buying" ? "Seller: " : "Buyer: "}
                  <span className="font-medium text-gray-700 dark:text-gray-300">{otherName}</span>
                </span>
              ) : null}
              {pickup?.location ? (
                <span className="flex items-center gap-1">
                  <FiMapPin size={12} className="text-gray-400" /> {pickup.location}
                  {pickup?.date ? ` · ${new Date(pickup.date).toLocaleDateString("en-IN")}` : ""}
                </span>
              ) : null}
            </div>
            {order?.last_message ? (
              <p className="text-xs text-gray-400 truncate mt-1">“{order.last_message}”</p>
            ) : null}
            <div className="text-lg font-bold text-gray-900 dark:text-white mt-2">
              ₹{Number(order?.price || 0).toLocaleString("en-IN")}
              {Number(order?.originalPrice || 0) > Number(order?.price || 0) && (
                <span className="ml-2 text-sm font-semibold text-gray-400 line-through">
                  ₹{Number(order.originalPrice).toLocaleString("en-IN")}
                </span>
              )}
            </div>
            <p className="text-[10px] text-gray-400">
              {Number(order?.originalPrice || 0) > Number(order?.price || 0)
                ? "Agreed price"
                : "Selling price"}
            </p>
          </div>
        </div>

        {/* STEPPER, same 4 stages as chat DealProgress, same mapping */}
        {!isCancelled && (
          <div className="mt-6 mb-4 px-2 lg:px-4">
            <div className="flex items-center justify-between relative">
              {ORDER_STEPS.map((s, index) => {
                const isCompletedStep = step > s.id;
                const isCurrent = step === s.id;
                return (
                  <div key={s.id} className="flex-1 flex items-center last:flex-none relative">
                    <div className="flex flex-col items-center relative z-10">
                      <div
                        className={`w-6 h-6 mx-3 md:mx-5 rounded-full flex items-center justify-center text-[12px] font-bold transition-all duration-300 ${
                          isCompletedStep || isCurrent
                            ? "bg-[#364EF2] text-white"
                            : "bg-[#F7F8FA] dark:bg-[#1c1c1c] border-2 border-gray-200 dark:border-gray-700 text-gray-400"
                        } ${isCurrent ? "ring-4 ring-blue-50 dark:ring-blue-900/20" : ""}`}
                      >
                        {isCompletedStep ? <MdCheck size={13} /> : s.id}
                      </div>
                      <span className="absolute top-8 text-[10px] lg:text-[11px] font-medium text-gray-400 dark:text-gray-500 whitespace-nowrap text-center">
                        {s.label}
                      </span>
                    </div>
                    {index < ORDER_STEPS.length - 1 && (
                      <div
                        className={`flex-1 h-[2px] mx-[-4px] transition-colors duration-300 ${
                          step > index + 1 ? "bg-[#364EF2]" : "bg-gray-100 dark:bg-gray-800"
                        }`}
                      />
                    )}
                  </div>
                );
              })}
            </div>
            <div className="h-4"></div>
          </div>
        )}
        {isCancelled && (
          <div className="mt-4 flex items-center gap-2 text-xs font-semibold text-red-500">
            <FiXCircle size={14} /> This order was cancelled. The item is available again.
          </div>
        )}
      </div>

      {/* FOOTER, actions route through chat (single writer) */}
      <div className="px-5 py-3 bg-gray-100 dark:bg-[#1A1D20]/50 border-t border-gray-50 dark:border-gray-800/50 flex flex-wrap items-center justify-between gap-2">
        <button
          onClick={openChat}
          className="flex items-center gap-1.5 text-xs font-bold text-[#364EF2] hover:text-blue-700 transition-colors"
        >
          <FiMessageSquare size={16} />
          {order?.role === "buying" ? "Chat with Seller" : "Chat with Buyer"}
          {(order?.unread || 0) > 0 && (
            <span className="min-w-5 h-5 px-1 rounded-full bg-[#364EF2] text-white text-[10px] font-bold flex items-center justify-center">
              {order.unread}
            </span>
          )}
        </button>
        <div className="flex items-center gap-2">
          {isActive && (
            <button
              onClick={handleCancel}
              disabled={cancelling}
              className="rounded-lg border border-gray-200 bg-[#F7F8FA] px-3 py-1.5 text-xs font-semibold text-red-500 hover:bg-red-50 dark:border-gray-700 dark:bg-[#1c1c1c] disabled:opacity-50"
            >
              {cancelling ? "Cancelling…" : "Cancel"}
            </button>
          )}
          {isCompleted && (
            <span className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1">
              <FiCheckCircle size={13} /> Transaction complete
            </span>
          )}
          <button
            onClick={() => product?._id && navigate(`/product/${product._id}`)}
            className="flex items-center gap-1 text-xs font-bold text-[#364EF2] hover:text-blue-700 transition-colors"
          >
            View Details <FiChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default memo(OrderDealCard);
