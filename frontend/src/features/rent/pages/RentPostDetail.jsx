import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowRight,
  Building2,
  CalendarClock,
  CalendarDays,
  Check,
  Clock3,
  Flag,
  Gift,
  HandHelping,
  Handshake,
  Info,
  LayoutList,
  MapPin,
  MessageSquareText,
  Pause,
  RotateCcw,
  Share2,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";
import BrandLoader from "../../../components/ui/BrandLoader.jsx";
import Seo from "../../../components/Seo.jsx";
import { toast } from "../../../components/ui/toast.js";
import { cn } from "../../../utils/cn.js";
import ProductGallery from "../../product/components/ProductGallery.jsx";
import ImageLightbox from "../../product/components/ImageLightbox.jsx";
import { Breadcrumbs, ProductGridSkeleton } from "../../product/components/browse/BrowseKit.jsx";
import RentGate from "../components/RentGate.jsx";
import BookingRequestSheet from "../components/BookingRequestSheet.jsx";
import { CARD, RentCard, RentShell, RequestCard, Sheet, btnDanger, btnPrimary } from "../components/RentKit.jsx";
import { Chip, FLUSH_ON_PHONE, IncomingRequests, InfoTile, Notice, OwnerActions, PersonCard, Section } from "../components/detail/DetailParts.jsx";
import {
  TYPE_LABELS,
  categoryOf,
  conditionLabel,
  formatDate,
  formatDateTime,
  formatRupees,
  listingTypeOf,
  priceParts,
  relativeTime,
} from "../constants/rentOptions.js";
import { deleteRentPost, getRentPost, getRentPosts, rentBookingAction, rentErrorMessage, reportRentPost, setRentPostStatus } from "../api/rentApi.js";

/*
 * Rent & Borrow item page. Mirrors the product page: gallery + one details
 * card on the left, a sticky summary (price, action) and the person on the
 * right, similar items underneath, a docked action bar on phones.
 */

const SAFETY_TIPS = [
  "Meet in a common area of the block, not in rooms.",
  "Check the item together at handover and at return.",
  "Pay by UPI or cash when you collect, never in advance.",
  "Keep the details in Chats.",
];

const STATUS_CHIP = {
  offer: {
    active: ["success", "Available"],
    lent_out: ["warning", "Lent out"],
    paused: ["neutral", "Paused"],
    fulfilled: ["neutral", "All gone"],
    expired: ["neutral", "Expired"],
    hidden: ["warning", "Under review"],
  },
  request: {
    active: ["warning", "Needed"],
    fulfilled: ["success", "Sorted"],
    paused: ["neutral", "Paused"],
    expired: ["neutral", "Expired"],
    hidden: ["warning", "Under review"],
  },
};

const ctaBase = "inline-flex items-center justify-center gap-2 rounded-lg text-[15px] font-medium";

function Detail({ rent }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState(null);
  const [error, setError] = useState(null);
  const [imageIndex, setImageIndex] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const [askOpen, setAskOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [busy, setBusy] = useState(null);
  const [similar, setSimilar] = useState(null);

  const load = useCallback(
    (fresh = false) =>
      getRentPost(id, { fresh })
        .then((data) => {
          setPost(data);
          setError(null);
        })
        .catch((err) => setError(err?.response?.status === 404 ? "This listing isn't available anymore." : rentErrorMessage(err))),
    [id],
  );

  useEffect(() => {
    setImageIndex(0);
    load(true);
  }, [load]);

  // Similar items: same kind + category, any block.
  const kind = post?.kind;
  const category = post?.category;
  useEffect(() => {
    if (!kind || !category) return undefined;
    let cancelled = false;
    setSimilar(null);
    getRentPosts({ kind, category, block: "all", page: 1 })
      .then((data) => !cancelled && setSimilar((data.items || []).filter((p) => p.id !== id).slice(0, 4)))
      .catch(() => !cancelled && setSimilar([]));
    return () => {
      cancelled = true;
    };
  }, [kind, category, id]);

  const images = useMemo(() => (post?.images || []).map((img) => img.url).filter(Boolean), [post]);

  const run = async (key, fn, success) => {
    setBusy(key);
    try {
      await fn();
      if (success) toast.success(success);
      await load(true);
    } catch (err) {
      toast.error(rentErrorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: post.title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      toast.success("Link copied");
    } catch {
      // Share sheet dismissed.
    }
  };

  if (error) {
    return (
      <RentShell title="Rent & Borrow" backTo="/rent" width="max-w-xl" pushed={false}>
        <div className={cn(CARD, "mt-6 flex flex-col items-center gap-3 px-6 py-10 text-center")}>
          <TriangleAlert className="h-6 w-6 text-amber-500" aria-hidden="true" />
          <p className="text-[15px] font-semibold">{error}</p>
          <Link to="/rent" className={cn(btnPrimary, "mt-2")}>
            Back to Rent & Borrow
          </Link>
        </div>
      </RentShell>
    );
  }
  if (!post) return <BrandLoader size="full" />;

  const isRequest = post.kind === "request";
  const type = listingTypeOf(post);
  const { label: categoryLabel, Icon: CategoryIcon } = categoryOf(post.category);
  const price = priceParts(post.price);
  const live = post.status === "active";
  const myOpen = post.myBooking?.isOpen ? post.myBooking : null;
  const [statusTone, statusLabel] = STATUS_CHIP[isRequest ? "request" : "offer"][post.status] || ["neutral", post.status];
  const conditionText = conditionLabel(post.condition);

  const priceNote = [
    !isRequest && post.deposit > 0 && `${formatRupees(post.deposit)} refundable deposit`,
    post.mode === "share" && post.quantity > 0 && (isRequest ? `${post.quantity} needed` : `${post.quantity} left`),
    isRequest ? (price.free ? "Asking as a favour" : "Paid by UPI or cash") : price.free ? "No charge" : "Pay by UPI or cash at handover",
  ]
    .filter(Boolean)
    .join(" · ");

  const facts = [
    { label: "Type", value: isRequest ? "Request" : TYPE_LABELS[type] },
    { label: "Category", value: categoryLabel },
    conditionText && { label: "Condition", value: conditionText },
    { label: isRequest ? "Will pay" : "Price", value: price.free ? "Free" : `${price.amount}${price.unit}` },
    !isRequest && post.mode === "lend" && { label: "Deposit", value: post.deposit > 0 ? formatRupees(post.deposit) : "None" },
    post.mode === "share" && { label: isRequest ? "Needed" : "Quantity", value: post.quantity },
    isRequest
      ? post.neededBy && { label: "Needed by", value: formatDateTime(post.neededBy) }
      : { label: "Available", value: post.availableUntil ? `Until ${formatDate(post.availableUntil)}` : "No end date" },
    { label: "Listed", value: relativeTime(post.createdAt) },
  ].filter(Boolean);

  const handover = [
    post.block && { icon: Building2, tone: "sky", label: "Block", value: post.block },
    { icon: MapPin, tone: "rose", label: isRequest ? "Meet at" : "Pickup spot", value: post.handover?.spot || "Agreed in the chat" },
    post.handover?.timing && { icon: Clock3, tone: "amber", label: "Best time", value: post.handover.timing },
    post.handover?.returnPolicy && { icon: RotateCcw, tone: "violet", label: "Return policy", value: post.handover.returnPolicy },
    post.handover?.notes && { icon: MessageSquareText, tone: "indigo", label: isRequest ? "Details" : "Instructions", value: post.handover.notes },
  ].filter(Boolean);

  const ctaLabel = isRequest ? "I can help" : post.mode === "share" ? "Ask for this" : "Request to borrow";
  const CtaIcon = isRequest ? HandHelping : post.mode === "share" ? Gift : Handshake;
  const cta = (className) => {
    if (myOpen) {
      return (
        <Link to={`/rent/booking/${myOpen.id}`} className={cn(ctaBase, "bg-[var(--accent)] text-white shadow-sm hover:bg-[var(--accent-hover)]", className)}>
          <MessageSquareText className="h-[18px] w-[18px]" aria-hidden="true" />
          View your booking
        </Link>
      );
    }
    if (!live) {
      return (
        <div aria-disabled="true" className={cn(ctaBase, "cursor-not-allowed bg-neutral-100 text-slate-500 dark:bg-white/5 dark:text-zinc-400", className)}>
          {post.status === "lent_out" ? `Back ${relativeTime(post.lentUntil)}` : "Not available"}
        </div>
      );
    }
    return (
      <button
        type="button"
        onClick={() => setAskOpen(true)}
        className={cn(
          ctaBase,
          "bg-[var(--accent)] text-white shadow-sm transition-colors hover:bg-[var(--accent-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)] focus-visible:ring-offset-2 active:scale-[0.99]",
          className,
        )}
      >
        <CtaIcon className="h-[18px] w-[18px]" aria-hidden="true" />
        {ctaLabel}
      </button>
    );
  };

  const boardFor = `/rent?${new URLSearchParams({ ...(isRequest ? { tab: "requests" } : {}), category: post.category, block: "all" })}`;

  return (
    <main className="min-h-screen w-full bg-[#F7F9FD] pb-[calc(6rem+env(safe-area-inset-bottom))] font-figtree text-slate-900 sm:pb-0 dark:bg-[#131313] dark:text-white">
      <Seo title={`${post.title} | Rent & Borrow | Unideals`} robots="noindex,nofollow" />

      <div className="mx-auto w-full max-w-[calc(var(--page-max)+9vw)] px-4 sm:px-[4.5vw] sm:pt-4 2xl:max-w-[var(--page-max)] 2xl:px-0">
        <div className="hidden sm:block">
          <Breadcrumbs
            items={[
              { label: "Rent & Borrow", to: "/rent" },
              { label: categoryLabel, to: boardFor },
              { label: post.title },
            ]}
          />
        </div>

        <div className="grid grid-cols-1 gap-2 sm:mt-4 sm:gap-5 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-6 xl:grid-cols-[minmax(0,1fr)_420px] xl:gap-8">
          {/* ── Content column ── */}
          <div className="flex min-w-0 flex-col gap-5 max-lg:contents">
            {images.length > 0 ? (
              <div className={cn(CARD, "p-0 max-lg:order-1 max-sm:-mx-4 max-sm:rounded-none max-sm:border-0 max-sm:bg-transparent max-sm:shadow-none sm:p-3")}>
                <ProductGallery
                  images={images}
                  activeIndex={Math.min(imageIndex, images.length - 1)}
                  onSelect={setImageIndex}
                  onPrev={() => setImageIndex((i) => (i - 1 + images.length) % images.length)}
                  onNext={() => setImageIndex((i) => (i + 1) % images.length)}
                  onOpen={() => setLightbox(true)}
                  onShare={share}
                />
              </div>
            ) : (
              <div className={cn(CARD, FLUSH_ON_PHONE, "flex items-center gap-4 p-5 max-lg:order-1 sm:p-6")}>
                <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-[#F4F5F9] text-slate-500 dark:bg-white/5 dark:text-zinc-400">
                  <CategoryIcon className="h-7 w-7" strokeWidth={1.75} aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <p className="text-[12.5px] font-semibold text-[var(--accent-text)]">{categoryLabel}</p>
                  <p className="mt-0.5 text-[14px] text-slate-500 dark:text-zinc-400">
                    {isRequest ? "No photo with this request. The details are below." : "No photos yet. Ask in the chat if you'd like to see it."}
                  </p>
                </div>
              </div>
            )}

            <div className={cn(CARD, FLUSH_ON_PHONE, "divide-y divide-neutral-200/80 max-lg:order-4 dark:divide-neutral-800")}>
              {post.description && (
                <Section title={isRequest ? "About this request" : "About this item"} icon={Info}>
                  <p className="whitespace-pre-line break-words text-[14.5px] leading-[1.75] text-slate-600 dark:text-zinc-300">{post.description}</p>
                </Section>
              )}

              <Section title="Details" icon={LayoutList} tone="violet">
                <dl className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3 sm:gap-x-8">
                  {facts.map(({ label, value }) => (
                    <div key={label} className="min-w-0">
                      <dt className="text-[12.5px] text-slate-500 dark:text-zinc-400">{label}</dt>
                      <dd className="mt-1 truncate text-[14.5px] font-medium text-slate-900 first-letter:uppercase dark:text-zinc-100" title={String(value)}>
                        {value}
                      </dd>
                    </div>
                  ))}
                </dl>
              </Section>

              <Section title="Handover & safety" icon={MapPin} tone="emerald">
                <div className="grid gap-5 sm:grid-cols-2 sm:gap-x-8">
                  {handover.map((row) => (
                    <InfoTile key={row.label} {...row} />
                  ))}
                </div>
                <div className="mt-6 rounded-xl bg-emerald-50/60 p-4 sm:p-5 dark:bg-emerald-950/20">
                  <p className="flex items-center gap-2 text-[13.5px] font-semibold text-slate-900 dark:text-white">
                    <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                    Safe handover
                  </p>
                  <ul className="mt-3 grid gap-x-8 gap-y-2.5 sm:grid-cols-2">
                    {SAFETY_TIPS.map((tip) => (
                      <li key={tip} className="flex items-start gap-2.5 text-[13.5px] leading-5 text-slate-600 dark:text-zinc-300">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" strokeWidth={2.25} aria-hidden="true" />
                        {tip}
                      </li>
                    ))}
                  </ul>
                </div>
              </Section>
            </div>
          </div>

          {/* ── Summary column (sticky on desktop) ── */}
          <aside className="flex min-w-0 flex-col gap-4 max-lg:contents lg:sticky lg:top-[calc(var(--header-h,4.75rem)+1rem)] lg:self-start">
            <div className={cn(CARD, FLUSH_ON_PHONE, "p-4 max-lg:order-2 max-sm:border-t-0 sm:p-6")}>
              {/* What it is on the left, whether you can get it at the end of the line */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <Chip tone="accent">{isRequest ? "Request" : TYPE_LABELS[type]}</Chip>
                  <Chip>{categoryLabel}</Chip>
                  {conditionText && <Chip>{conditionText}</Chip>}
                </div>
                <Chip tone={statusTone} className="shrink-0">
                  <span
                    className={cn(
                      "h-1.5 w-1.5 rounded-full",
                      statusTone === "success" ? "bg-emerald-500" : statusTone === "warning" ? "bg-amber-500" : "bg-slate-400",
                    )}
                    aria-hidden="true"
                  />
                  {statusLabel}
                </Chip>
              </div>

              <h1 className="mt-3 break-words text-[20px] font-semibold leading-snug tracking-tight text-slate-900 sm:mt-3.5 sm:text-[26px] sm:leading-tight dark:text-white">
                {post.title}
              </h1>

              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] text-slate-500 dark:text-zinc-400">
                <span className="inline-flex items-center gap-1">
                  <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
                  Listed {relativeTime(post.createdAt)}
                </span>
                {post.block && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                    {post.block}
                  </span>
                )}
              </div>

              <div className="mt-4 rounded-xl bg-neutral-50 p-3.5 sm:mt-5 sm:p-4 dark:bg-white/[0.03]">
                {isRequest && <p className="mb-1.5 text-[12px] font-medium text-slate-500 dark:text-zinc-400">Will pay</p>}
                <div className="flex flex-wrap items-baseline gap-x-1.5">
                  <span
                    className={cn(
                      "text-[26px] font-bold leading-none tracking-tight sm:text-[30px]",
                      price.free ? "text-emerald-600 dark:text-emerald-400" : "text-slate-900 dark:text-white",
                    )}
                  >
                    {price.amount}
                  </span>
                  {price.unit && <span className="text-[15px] font-medium text-slate-500 dark:text-zinc-400">{price.unit}</span>}
                </div>
                <p className="mt-2 text-[12.5px] text-slate-500 dark:text-zinc-400">{priceNote}</p>
              </div>

              <div className="mt-4 space-y-2 empty:hidden">
                {isRequest && post.neededBy && live && (
                  <Notice tone="warning" icon={CalendarClock} title={`Needed by ${formatDateTime(post.neededBy)}`}>
                    That&apos;s {relativeTime(post.neededBy)}. The request closes after this.
                  </Notice>
                )}
                {!isRequest && post.status === "lent_out" && (
                  <Notice tone="warning" icon={CalendarDays} title="Lent out right now">
                    {post.lentUntil ? `Expected back ${relativeTime(post.lentUntil)}.` : "It'll be back on the board once it's returned."}
                  </Notice>
                )}
                {post.status === "paused" && (
                  <Notice tone="neutral" icon={Pause} title="Paused">
                    {post.isMine ? "It's hidden from the board until you resume it." : "Not taking requests right now."}
                  </Notice>
                )}
                {post.status === "hidden" && post.isMine && (
                  <Notice tone="danger" icon={Flag} title="Hidden for review">
                    A few students reported this. We&apos;ll notify you once our team has checked it.
                  </Notice>
                )}
              </div>

              {post.isMine ? (
                <div className="mt-5">
                  <OwnerActions
                    post={post}
                    busy={busy}
                    onPause={() => run("pause", () => setRentPostStatus(post.id, "paused"), "Paused. It's off the board for now.")}
                    onResume={() => run("resume", () => setRentPostStatus(post.id, "active"), "Back on the board")}
                    onRemove={async () => {
                      try {
                        await deleteRentPost(post.id);
                        toast.success("Removed");
                        navigate("/rentals?tab=posts", { replace: true });
                      } catch (err) {
                        toast.error(rentErrorMessage(err));
                      }
                    }}
                  />
                </div>
              ) : (
                <div className="mt-5 hidden flex-col gap-2.5 sm:flex">
                  {cta("h-12 w-full")}
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={share}
                      className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 text-[13.5px] font-medium text-slate-600 transition-colors hover:border-[var(--accent-ring)] hover:text-[var(--accent-text)] dark:border-neutral-700 dark:bg-[#1A1D20] dark:text-zinc-300"
                    >
                      <Share2 className="h-[18px] w-[18px]" aria-hidden="true" />
                      Share
                    </button>
                    <button
                      type="button"
                      onClick={() => setReportOpen(true)}
                      className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 text-[13.5px] font-medium text-slate-600 transition-colors hover:border-red-200 hover:text-red-600 dark:border-neutral-700 dark:bg-[#1A1D20] dark:text-zinc-300 dark:hover:border-red-900/60 dark:hover:text-red-400"
                    >
                      <Flag className="h-[18px] w-[18px]" aria-hidden="true" />
                      Report
                    </button>
                  </div>
                </div>
              )}

              {!post.isMine && (
                <button
                  type="button"
                  onClick={() => setReportOpen(true)}
                  className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-neutral-200 bg-white text-[13.5px] font-medium text-slate-600 sm:hidden dark:border-neutral-700 dark:bg-[#1A1D20] dark:text-zinc-300"
                >
                  <Flag className="h-[18px] w-[18px]" aria-hidden="true" />
                  Report listing
                </button>
              )}

              <p className="mt-4 flex items-start gap-2 text-[12px] leading-relaxed text-slate-500 dark:text-zinc-400">
                <ShieldCheck className="mt-px h-4 w-4 shrink-0 text-emerald-500" aria-hidden="true" />
                Meet in a common area and check the item together. Payment is between you two.
              </p>
            </div>

            {post.isMine ? (
              <IncomingRequests
                post={post}
                busy={busy}
                onAccept={(b) => run(`a${b.id}`, () => rentBookingAction(b.id, "accept"), "Accepted. Sort out the handover in the chat.")}
                onDecline={(b) => run(`d${b.id}`, () => rentBookingAction(b.id, "decline", {}), "Declined")}
                className="max-lg:order-3"
              />
            ) : (
              <PersonCard person={post.owner} isRequest={isRequest} block={post.block} className="max-lg:order-3" />
            )}
          </aside>
        </div>

        {/* Similar items */}
        {(similar === null || similar.length > 0) && (
          <section className="mb-8 mt-8 sm:mb-12 sm:mt-12">
            <div className="mb-5 flex items-end justify-between gap-4">
              <div className="min-w-0">
                <h2 className="text-[18px] font-semibold tracking-tight text-slate-900 sm:text-[20px] dark:text-white">
                  {isRequest ? `Other requests in ${categoryLabel}` : `More in ${categoryLabel}`}
                </h2>
                <p className="mt-0.5 text-[13px] text-slate-500 dark:text-zinc-400">From students across {rent.config?.campus?.name || "your campus"}</p>
              </div>
              <Link to={boardFor} className="inline-flex shrink-0 items-center gap-1.5 text-[13.5px] font-semibold text-[var(--accent-text)] hover:underline">
                View all
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
            {similar === null ? (
              <ProductGridSkeleton count={4} className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 xl:gap-5" />
            ) : (
              <div className={isRequest ? "grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4 xl:gap-5" : "grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 xl:gap-5"}>
                {similar.map((p) => (isRequest ? <RequestCard key={p.id} post={p} /> : <RentCard key={p.id} post={p} />))}
              </div>
            )}
          </section>
        )}
        {similar !== null && similar.length === 0 && <div className="h-6 sm:h-12" />}
      </div>

      {/* Docked action bar (phones) */}
      {!post.isMine && (
        <div className="fixed inset-x-0 bottom-0 z-50 border-t border-neutral-200/80 bg-white/90 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl sm:hidden dark:border-neutral-800 dark:bg-[#16181B]/90">
          <div className="flex items-center gap-3">
            <div className="min-w-0 shrink-0 pr-1">
              <p className="text-[11px] font-medium leading-none text-slate-500 dark:text-zinc-400">{isRequest ? "Will pay" : "Price"}</p>
              <p className={cn("mt-1 text-[19px] font-bold leading-none tracking-tight", price.free ? "text-emerald-600 dark:text-emerald-400" : "text-slate-900 dark:text-white")}>
                {price.amount}
                {price.unit && <span className="text-[13px] font-medium text-slate-500 dark:text-zinc-400">{price.unit}</span>}
              </p>
            </div>
            {cta("h-12 min-w-0 flex-1")}
          </div>
        </div>
      )}

      <ImageLightbox open={lightbox} images={images} index={imageIndex} onClose={() => setLightbox(false)} onIndexChange={setImageIndex} />

      <BookingRequestSheet open={askOpen} onOpenChange={setAskOpen} post={post} maxLendDays={rent.config?.limits?.lendMaxDays} />

      <Sheet
        open={reportOpen}
        onOpenChange={setReportOpen}
        title="Report this listing"
        description="Tell us what's wrong. Three reports hide a listing until we review it."
        footer={
          <button
            type="button"
            disabled={busy === "report"}
            onClick={() =>
              run(
                "report",
                async () => {
                  await reportRentPost(post.id, reportReason.trim() || undefined);
                  setReportOpen(false);
                  setReportReason("");
                },
                "Thanks. We'll take a look.",
              )
            }
            className={cn(btnDanger, "w-full")}
          >
            Send report
          </button>
        }
      >
        <textarea
          rows={3}
          value={reportReason}
          onChange={(e) => setReportReason(e.target.value.slice(0, 200))}
          placeholder="e.g. Not an allowed item, spam, fake listing"
          className="mt-2 w-full resize-none rounded-xl border border-neutral-200 bg-white p-3 text-[14px] outline-none focus:border-[var(--accent)] dark:border-neutral-700 dark:bg-[#131313] dark:text-white"
        />
      </Sheet>
    </main>
  );
}

export default function RentPostDetail() {
  return <RentGate>{(rent) => <Detail rent={rent} />}</RentGate>;
}
