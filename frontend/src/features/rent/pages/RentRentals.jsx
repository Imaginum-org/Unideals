import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowDownLeft, ArrowUpRight, ChevronRight, Plus, Star, Wallet } from "lucide-react";
import EmptyState from "../../../components/ui/EmptyState.jsx";
import { cn } from "../../../utils/cn.js";
import { AccountLayout, CARD, ErrorState, ListSkeleton, StatTile, TabBar, btnPrimary, btnSecondary } from "../../user/components/account/AccountKit.jsx";
import RentGate from "../components/RentGate.jsx";
import { StatusPill } from "../components/RentKit.jsx";
import BookingStepBar from "../components/BookingStepBar.jsx";
import RentHowItWorks from "../components/RentHowItWorks.jsx";
import { categoryOf, formatDateTime, formatPrice, formatRupees, listingBadge, relativeTime } from "../constants/rentOptions.js";
import { getMyRentPosts, getRentBookings, rentErrorMessage } from "../api/rentApi.js";

/*
 * Profile → Rentals. Everything the student lends, borrows and has posted
 * on Rent & Borrow, in the account shell next to My listings and Orders.
 */

const TABS = [
  { value: "lending", label: "Lending" },
  { value: "borrowing", label: "Borrowing" },
  { value: "posts", label: "My posts" },
];

function Thumb({ src, Icon }) {
  return (
    <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-xl bg-neutral-100 text-slate-400 dark:bg-white/5 dark:text-zinc-500">
      {src ? <img src={src} alt="" className="h-full w-full object-cover" loading="lazy" /> : <Icon className="h-6 w-6" aria-hidden="true" />}
    </div>
  );
}

// What this person should do (or wait for) next.
const nextStep = (b) => {
  const lender = b.role === "lender";
  switch (b.status) {
    case "pending":
      return b.isOwner ? { text: "Accept or decline", tone: "action" } : { text: "Waiting for them to accept", tone: "wait" };
    case "accepted":
      return lender ? { text: "Hand it over, then mark it handed over", tone: "action" } : { text: "Meet up to collect it", tone: "action" };
    case "active":
      if (b.overdue) return { text: lender ? "Overdue. Remind them in the chat" : "Overdue. Please return it", tone: "alert" };
      return { text: lender ? `Due back ${relativeTime(b.returnBy)}` : `Return it ${relativeTime(b.returnBy)}`, tone: "wait" };
    case "completed":
      if (b.actions?.includes("rate")) return { text: "Rate the exchange", tone: "action" };
      return { text: lender && b.agreedPrice ? `Done · ${formatRupees(b.agreedPrice)} earned` : "Done", tone: "done" };
    default:
      return null;
  }
};

const TONE = {
  action: "text-[var(--accent-text)]",
  wait: "text-slate-500 dark:text-zinc-400",
  alert: "text-red-600 dark:text-red-400",
  done: "text-emerald-600 dark:text-emerald-400",
};

function BookingRow({ b }) {
  const { Icon } = categoryOf(b.post?.category);
  const next = nextStep(b);
  return (
    <Link to={`/rent/booking/${b.id}`} className="group block px-4 py-4 transition-colors hover:bg-neutral-50/80 sm:px-5 dark:hover:bg-white/[0.03]">
      <div className="flex items-start gap-4">
        <Thumb src={b.post?.image} Icon={Icon} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <p className="truncate text-[14.5px] font-semibold text-slate-900 dark:text-white">{b.post?.title}</p>
            <StatusPill status={b.status} className="shrink-0" />
          </div>
          <p className="mt-0.5 truncate text-[13px] text-slate-500 dark:text-zinc-400">
            {b.role === "lender" ? "To" : "From"} {b.counterpart?.name || "a student"} · {b.agreedPrice ? formatRupees(b.agreedPrice) : "Free"}
          </p>
          <BookingStepBar booking={b} compact className="mt-3 max-w-md" />
          {next && <p className={cn("mt-2 text-[12.5px] font-medium", TONE[next.tone])}>{next.text}</p>}
        </div>
        <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5 dark:text-zinc-600" aria-hidden="true" />
      </div>
    </Link>
  );
}

function PostRow({ p }) {
  const { Icon } = categoryOf(p.category);
  return (
    <Link to={`/rent/${p.id}`} className="group flex items-center gap-4 px-4 py-3.5 transition-colors hover:bg-neutral-50/80 sm:px-5 dark:hover:bg-white/[0.03]">
      <Thumb src={p.images?.[0]?.url} Icon={Icon} />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <p className="truncate text-[14.5px] font-semibold text-slate-900 dark:text-white">{p.title}</p>
          <StatusPill status={p.status} kind="post" className="shrink-0" />
        </div>
        <p className="mt-0.5 truncate text-[13px] text-slate-500 dark:text-zinc-400">
          {listingBadge(p)} · <span className="font-semibold text-slate-700 dark:text-zinc-200">{formatPrice(p.price)}</span>
          {p.kind === "request" && p.status === "active" && p.neededBy ? ` · until ${formatDateTime(p.neededBy)}` : ""}
          {p.block ? ` · ${p.block}` : ""}
        </p>
        {p.pendingCount > 0 && (
          <p className="mt-1 inline-flex rounded-md bg-amber-50 px-1.5 py-0.5 text-[12px] font-semibold text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
            {p.pendingCount} waiting for your reply
          </p>
        )}
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5 dark:text-zinc-600" aria-hidden="true" />
    </Link>
  );
}

const EMPTY = {
  lending: {
    variant: "listings",
    title: "You haven't lent anything yet",
    description: "Rent out or lend the things you rarely use, like a racket, an iron or a kettle. Requests from your block show up here.",
    primaryAction: { label: "Post an item", to: "/rent/new", icon: Plus },
  },
  borrowing: {
    variant: "orders",
    title: "Nothing borrowed yet",
    description: "Need something tonight? Borrow it from someone in your block, or post a request and they'll come to you.",
    primaryAction: { label: "Browse Rent & Borrow", to: "/rent" },
    secondaryAction: { label: "Ask for something", to: "/rent/new?kind=request" },
  },
  posts: {
    variant: "listings",
    title: "You haven't posted anything",
    description: "Offer something to rent, lend or give away, or ask your block for something you need.",
    primaryAction: { label: "Post an item", to: "/rent/new", icon: Plus },
  },
};

function Rentals({ rent }) {
  const [params, setParams] = useSearchParams();
  const tab = TABS.some((t) => t.value === params.get("tab")) ? params.get("tab") : "lending";
  const [rows, setRows] = useState(null);
  const [error, setError] = useState(null);
  const [retry, setRetry] = useState(0);
  const stats = rent.profile?.stats;

  useEffect(() => {
    let cancelled = false;
    setRows(null);
    setError(null);
    const request = tab === "posts" ? getMyRentPosts() : getRentBookings({ role: tab });
    request.then((data) => !cancelled && setRows(data || [])).catch((err) => !cancelled && setError(rentErrorMessage(err)));
    return () => {
      cancelled = true;
    };
  }, [tab, retry]);

  // Fresh earnings and counts on every visit.
  useEffect(() => {
    rent.refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AccountLayout
      seoTitle="Rentals | Unideals"
      title="Rentals"
      description={`Lend, borrow and track every return${rent.profile?.block ? ` · ${rent.profile.block}` : ""}`}
      actions={
        <>
          <Link to="/rent" className={btnSecondary}>
            Browse
          </Link>
          <Link to="/rent/new" className={btnPrimary}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Post an item
          </Link>
        </>
      }
    >
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile icon={Wallet} label="Earned" value={formatRupees(stats?.earnedTotal)} hint="Paid to you directly" />
        <StatTile icon={ArrowUpRight} label="Lent or shared" value={(stats?.lent || 0) + (stats?.shared || 0)} />
        <StatTile icon={ArrowDownLeft} label="Borrowed" value={stats?.borrowed || 0} />
        <StatTile
          icon={Star}
          label="Rating"
          value={stats?.rating ? stats.rating.toFixed(1) : "—"}
          hint={stats?.ratingCount ? `${stats.ratingCount} rating${stats.ratingCount === 1 ? "" : "s"}` : "No ratings yet"}
        />
      </div>

      <TabBar
        className="mb-4"
        ariaLabel="Rentals"
        tabs={TABS}
        value={tab}
        onChange={(value) => setParams(value === "lending" ? {} : { tab: value }, { replace: true })}
      />

      {error ? (
        <ErrorState message={error} onRetry={() => setRetry((n) => n + 1)} />
      ) : rows === null ? (
        <ListSkeleton rows={3} />
      ) : rows.length === 0 ? (
        <EmptyState {...EMPTY[tab]} />
      ) : (
        <div className={cn(CARD, "divide-y divide-neutral-100 overflow-hidden max-sm:-mx-4 max-sm:rounded-none max-sm:border-x-0 dark:divide-neutral-800")}>
          {tab === "posts" ? rows.map((p) => <PostRow key={p.id} p={p} />) : rows.map((b) => <BookingRow key={b.id} b={b} />)}
        </div>
      )}

      <RentHowItWorks className="mt-6 max-sm:-mx-4 max-sm:rounded-none max-sm:border-x-0" />
    </AccountLayout>
  );
}

export default function RentRentals() {
  return <RentGate>{(rent) => <Rentals rent={rent} />}</RentGate>;
}
