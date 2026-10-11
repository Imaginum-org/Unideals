// SINGLE source of truth for mapping Deal.status -> order/chat stage.
// Both Chat (DealProgress, badges) and Orders (stepper, badges) import from
// here, so the two pages can never drift out of sync.
//
// Deal statuses (backend): negotiating | offer_accepted | deal_confirmed |
//   pickup_scheduled | payment_confirmed | completed | cancelled
// Order steps: 1 Order Placed -> 2 Confirmed -> 3 Meeting Scheduled -> 4 Completed

export const ORDER_STEPS = [
  { id: 1, label: "Order Placed" },
  { id: 2, label: "Confirmed" },
  { id: 3, label: "Meeting Scheduled" },
  { id: 4, label: "Completed" },
];

export const dealStatusToStep = (status) => {
  switch (status) {
    case "negotiating":
    case "offer_accepted":
      return 1;
    case "deal_confirmed":
      return 2;
    case "pickup_scheduled":
    case "payment_confirmed":
      return 3;
    case "completed":
      return 4;
    case "cancelled":
    default:
      return 0; // cancelled / unknown -> no active step
  }
};

export const isActiveDealStatus = (status) =>
  ["negotiating", "offer_accepted", "deal_confirmed", "pickup_scheduled", "payment_confirmed"].includes(
    status,
  );

export const dealStatusBadge = (status) => {
  switch (status) {
    case "negotiating":
      return { label: "Negotiating", cls: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300" };
    case "offer_accepted":
      return { label: "Offer Accepted", cls: "bg-indigo-50 text-indigo-600 border-indigo-200" };
    case "deal_confirmed":
      return { label: "Reserved", cls: "bg-[#FFF4E5] text-[#F59E0B] dark:bg-amber-900/20 dark:text-amber-500" };
    case "pickup_scheduled":
      return { label: "Pickup Scheduled", cls: "bg-blue-50 text-blue-600 border-blue-200" };
    case "payment_confirmed":
      return { label: "Payment Confirmed", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" };
    case "completed":
      return { label: "Completed", cls: "bg-[#E6FFEB] text-[#008526] dark:bg-emerald-900/20 dark:text-emerald-400" };
    case "cancelled":
      return { label: "Cancelled", cls: "bg-[#FFECEC] text-[#D12929] dark:bg-red-900/20 dark:text-red-500" };
    default:
      return { label: status || "Unknown", cls: "bg-gray-100 text-gray-600" };
  }
};
