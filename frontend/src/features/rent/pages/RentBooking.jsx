import { Link, useParams } from "react-router-dom";
import { ArrowRight, MessageCircle } from "lucide-react";
import BrandLoader from "../../../components/ui/BrandLoader.jsx";
import { cn } from "../../../utils/cn.js";
import RentGate from "../components/RentGate.jsx";
import RentBookingProgress from "../components/RentBookingProgress.jsx";
import { CARD, PersonRow, RentShell, StatusPill, btnPrimary } from "../components/RentKit.jsx";
import { categoryOf, formatPrice } from "../constants/rentOptions.js";
import { useRentBooking } from "../hooks/useRentBooking.js";

/*
 * One booking. The same progress card sits at the top of the booking's
 * chat thread (/chat), so the steps can be done from either place.
 */
function Booking() {
  const { id } = useParams();
  const { booking, error, busy, act } = useRentBooking(id);

  if (error) {
    return (
      <RentShell title="Booking" backTo="/rentals" width="max-w-xl">
        <div className={cn(CARD, "p-8 text-center")}>
          <p className="text-[15px] font-semibold">{error}</p>
          <Link to="/rentals" className={cn(btnPrimary, "mt-5")}>
            Rentals
          </Link>
        </div>
      </RentShell>
    );
  }
  if (!booking) return <BrandLoader size="full" />;

  const lender = booking.role === "lender";
  const { Icon } = categoryOf(booking.post?.category);
  const otherName = booking.counterpart?.name?.split(" ")[0] || "them";
  const chatHref = booking.conversationId ? `/chat?conversation=${booking.conversationId}` : "/chat";

  return (
    <RentShell title="Booking" subtitle={booking.post.title} backTo="/rentals" width="max-w-2xl">
      <div className="space-y-3">
        {/* The item */}
        <div className={cn(CARD, "flex items-center gap-3.5 p-4")}>
          <Link
            to={`/rent/${booking.postId}`}
            className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-xl bg-[#F4F5F9] text-slate-400 dark:bg-white/5 dark:text-zinc-500"
          >
            {booking.post.image ? <img src={booking.post.image} alt="" className="h-full w-full object-cover" /> : <Icon className="h-6 w-6" aria-hidden="true" />}
          </Link>
          <div className="min-w-0 flex-1">
            <Link to={`/rent/${booking.postId}`} className="block truncate text-[16px] font-semibold leading-snug text-slate-900 hover:underline dark:text-white">
              {booking.post.title}
            </Link>
            <p className="mt-0.5 truncate text-[13px] text-slate-500 dark:text-zinc-400">
              {lender ? `You're lending to ${otherName}` : `You're borrowing from ${otherName}`}
              {booking.post.price ? ` · ${formatPrice(booking.post.price)}` : ""}
              {booking.post.block ? ` · ${booking.post.block}` : ""}
            </p>
          </div>
          <StatusPill status={booking.status} className="shrink-0 self-start" />
        </div>

        {/* Steps + next action (same card as in the chat) */}
        <RentBookingProgress booking={booking} busy={busy} act={act} />

        {/* Messages live in the main Chats inbox */}
        <Link to={chatHref} className={cn(CARD, "group flex items-center gap-3.5 p-4 transition-shadow hover:shadow-md")}>
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent-text)]">
            <MessageCircle className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] font-semibold text-slate-900 dark:text-white">Chat with {otherName}</span>
            <span className="block text-[13px] text-slate-500 dark:text-zinc-400">Sort out the spot and time. Room numbers are fine there.</span>
          </span>
          <ArrowRight className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
        </Link>

        <div className={cn(CARD, "p-4")}>
          <PersonRow person={booking.counterpart} caption={lender ? "borrower" : "lender"} />
          {booking.theirRating && <p className="mt-2 text-[12.5px] text-slate-500 dark:text-zinc-400">They rated you {booking.theirRating}★</p>}
        </div>
      </div>
    </RentShell>
  );
}

export default function RentBooking() {
  return <RentGate>{() => <Booking />}</RentGate>;
}
