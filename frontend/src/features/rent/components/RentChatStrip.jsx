import { useCallback } from "react";
import RentBookingProgress from "./RentBookingProgress.jsx";
import { useRentBooking } from "../hooks/useRentBooking.js";

/**
 * Top of a Rent & Borrow thread in the main chat, where product chats show
 * the deal card: booking steps + the next action (accept, hand over, got it
 * back, rate). `refreshKey` changes with new messages so the system lines in
 * the chat and this card stay in step; `onAction` lets the chat pull the new
 * system line right away, even if the socket is slow.
 */
export default function RentChatStrip({ bookingId, refreshKey, open = true, onToggle, onAction }) {
  const { booking, busy, act } = useRentBooking(bookingId, refreshKey);
  const actAndSync = useCallback(
    async (...args) => {
      await act(...args);
      onAction?.();
    },
    [act, onAction],
  );
  if (!bookingId) return null;
  return (
    <RentBookingProgress
      booking={booking}
      busy={busy}
      act={actAndSync}
      open={open}
      onToggle={onToggle}
      detailsHref={`/rent/booking/${bookingId}`}
    />
  );
}
