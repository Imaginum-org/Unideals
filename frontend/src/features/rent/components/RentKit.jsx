import { memo } from "react";
import { Link } from "react-router-dom";
import * as Dialog from "@radix-ui/react-dialog";
import { Clock3, MapPin, Star, X } from "lucide-react";
import AvatarComponent from "../../../components/common/AvatarComponent.jsx";
import Seo from "../../../components/Seo.jsx";
import MobileAppBar, { useAppScreen } from "../../../components/layout/MobileAppBar.jsx";
import { cn } from "../../../utils/cn.js";
import {
  BOOKING_STATUS_LABELS,
  BOOKING_STATUS_TONES,
  POST_STATUS_LABELS,
  categoryOf,
  formatPrice,
  formatRupees,
  listingBadge,
  priceParts,
  relativeTime,
} from "../constants/rentOptions.js";

/*
 * Shared building blocks for the Rent & Borrow pages. Same surface language
 * as the marketplace (white cards, neutral borders, --accent* tokens so dark
 * mode and Girl Mode theme everything).
 */

export const CARD =
  "rounded-2xl border border-neutral-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:border-neutral-800 dark:bg-[#1A1D20]";

/** Page frame: SEO, phone app bar (pushed screens), centred column. `appBarExtra` renders under the app bar title (e.g. progress). */
export function RentShell({ title, mobileTitle, subtitle, backTo, onBack, action, appBarExtra, pushed = true, width = "max-w-5xl", children }) {
  useAppScreen(pushed);
  return (
    <div className="min-h-[100dvh] bg-[#F7F8FA] pb-28 font-figtree text-slate-900 dark:bg-[#131313] dark:text-white">
      <Seo title={`${title} | Unideals`} robots="noindex,nofollow" />
      {pushed && (
        <MobileAppBar title={mobileTitle || title} subtitle={subtitle} backTo={backTo} onBack={onBack} action={action}>
          {appBarExtra}
        </MobileAppBar>
      )}
      <div className={cn("mx-auto w-full px-4 pt-4 sm:px-6 sm:pt-6 lg:pt-8", width)}>{children}</div>
    </div>
  );
}

export function PriceTag({ price, className }) {
  const free = !price?.amount || price.unit === "free";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-[12.5px] font-semibold tabular-nums",
        free
          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
          : "bg-[var(--accent-soft)] text-[var(--accent-text)]",
        className,
      )}
    >
      {formatPrice(price)}
    </span>
  );
}

export function StatusPill({ status, kind = "booking", className }) {
  const label = kind === "booking" ? BOOKING_STATUS_LABELS[status] : POST_STATUS_LABELS[status];
  const tone =
    kind === "booking"
      ? BOOKING_STATUS_TONES[status]
      : status === "active"
        ? BOOKING_STATUS_TONES.completed
        : status === "lent_out"
          ? BOOKING_STATUS_TONES.active
          : status === "hidden"
            ? "bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-300"
            : BOOKING_STATUS_TONES.cancelled;
  return (
    <span className={cn("inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-[11.5px] font-semibold", tone, className)}>
      {label || status}
    </span>
  );
}

export function Stars({ value, size = "h-3.5 w-3.5", className }) {
  if (!value) return null;
  return (
    <span className={cn("inline-flex items-center gap-0.5 text-[12px] font-semibold text-amber-600 dark:text-amber-400", className)}>
      <Star className={cn(size, "fill-current")} aria-hidden="true" />
      {value.toFixed(1)}
    </span>
  );
}

export function Avatar({ person, size = "h-9 w-9" }) {
  const src = typeof person?.avatar === "string" ? person.avatar : person?.avatar?.url;
  const initial = (person?.name || "?").trim().charAt(0).toUpperCase();
  return src ? (
    <img src={src} alt="" className={cn(size, "shrink-0 rounded-full object-cover ring-1 ring-black/5")} loading="lazy" />
  ) : (
    <span className={cn(size, "grid shrink-0 place-items-center rounded-full bg-[var(--accent-soft)] text-[13px] font-bold text-[var(--accent-text)]")}>
      {initial}
    </span>
  );
}

export function PersonRow({ person, caption, className }) {
  if (!person) return null;
  return (
    <div className={cn("flex min-w-0 items-center gap-3", className)}>
      <Avatar person={person} />
      <div className="min-w-0">
        <p className="truncate text-[14px] font-semibold text-slate-900 dark:text-white">{person.name}</p>
        <p className="flex items-center gap-2 text-[12px] text-slate-500 dark:text-zinc-400">
          {person.rating ? <Stars value={person.rating} /> : <span>New on Rent</span>}
          {person.ratingCount > 0 && <span>· {person.ratingCount} ratings</span>}
          {caption && <span className="truncate">· {caption}</span>}
        </p>
      </div>
    </div>
  );
}

/** Avatar + name (+ rating) in card footers, same as the marketplace cards. */
function OwnerLine({ owner }) {
  const avatar = typeof owner?.avatar === "string" ? owner.avatar : owner?.avatar?.url;
  return (
    <div className="flex min-w-0 flex-1 items-center gap-1.5">
      <AvatarComponent name={owner?.name || "Student"} imageUrl={avatar} size="small" className="h-6 w-6 shrink-0" />
      <span className="min-w-0 truncate text-[12px] font-medium capitalize text-slate-500 md:text-[13px] dark:text-zinc-400">
        {owner?.name || "Student"}
      </span>
      {owner?.rating ? (
        <span className="flex shrink-0 items-center gap-1 rounded-full border border-[#E1E1E1] px-1.5 py-0.5 dark:border-zinc-700">
          <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" aria-hidden="true" />
          <span className="text-[11.5px] font-semibold tabular-nums text-slate-500 dark:text-zinc-400">{owner.rating.toFixed(1)}</span>
        </span>
      ) : null}
    </div>
  );
}

function BlockTag({ block }) {
  if (!block) return null;
  return (
    <span className="hidden shrink-0 items-center gap-1 text-slate-400 md:flex dark:text-zinc-500">
      <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
      <span className="max-w-[90px] truncate text-[12px] font-medium">{block}</span>
    </span>
  );
}

/*
 * Board card for an offer. Same frame as the marketplace ProductCard
 * (inset photo, category line, two-line title, bold price, owner footer)
 * so Rent & Borrow reads as part of the same app.
 */
export const RentCard = memo(function RentCard({ post }) {
  const { Icon, label } = categoryOf(post.category);
  const image = post.images?.[0]?.url;
  const price = priceParts(post.price);
  const lentOut = post.status === "lent_out";
  return (
    <Link
      to={`/rent/${post.id}`}
      className="group relative w-full overflow-hidden rounded-2xl border border-zinc-200 bg-[#F7F8FA] font-figtree shadow-[0_4px_18px_rgba(15,23,42,0.08)] transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:border-[#D4D4D8] hover:shadow-[0_10px_28px_rgba(15,23,42,0.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)] dark:border-zinc-800 dark:bg-[#18181B] dark:hover:border-zinc-600"
    >
      <div className="flex h-full flex-col p-2">
        <div className="relative aspect-[6/5] w-full overflow-hidden rounded-xl bg-white dark:bg-white/5">
          {image ? (
            <img
              src={image}
              alt={post.title}
              loading="lazy"
              decoding="async"
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.05]"
            />
          ) : (
            <div className="absolute inset-0 grid place-items-center text-slate-300 dark:text-zinc-600">
              <Icon className="h-10 w-10" strokeWidth={1.5} aria-hidden="true" />
            </div>
          )}
          <span className="absolute left-2.5 top-2.5 rounded-md bg-white/95 px-2 py-0.5 text-[11px] font-semibold text-slate-800 shadow-sm backdrop-blur dark:bg-black/70 dark:text-white">
            {listingBadge(post)}
          </span>
          {lentOut && (
            <span className="absolute inset-x-2 bottom-2 rounded-lg bg-black/65 px-2 py-1 text-center text-[11.5px] font-semibold text-white backdrop-blur-sm">
              Lent out · back {relativeTime(post.lentUntil)}
            </span>
          )}
        </div>

        <div className="flex flex-grow flex-col px-1.5 pb-1 pt-3">
          <p className="truncate text-[11.5px] font-semibold text-[var(--accent-text)] md:text-xs">{label}</p>
          <h3 className="mt-1 line-clamp-2 min-h-[2.7em] text-[14px] font-semibold leading-[1.35] tracking-[-0.005em] text-slate-900 md:text-[15px] dark:text-white">
            {post.title}
          </h3>
          <div className="mt-2 flex min-w-0 items-baseline gap-1">
            <span
              className={cn(
                "shrink-0 whitespace-nowrap text-[17px] font-bold tabular-nums tracking-tight md:text-lg",
                price.free ? "text-emerald-600 dark:text-emerald-400" : "text-slate-950 dark:text-white",
              )}
            >
              {price.amount}
            </span>
            {price.unit && <span className="shrink-0 text-[13px] font-medium text-slate-500 dark:text-zinc-400">{price.unit}</span>}
            {post.deposit > 0 ? (
              <span className="ml-auto hidden min-w-0 truncate pl-2 text-[12px] text-slate-400 sm:inline dark:text-zinc-500">+{formatRupees(post.deposit)} deposit</span>
            ) : post.mode === "share" && post.quantity > 1 ? (
              <span className="ml-auto hidden min-w-0 truncate pl-2 text-[12px] text-slate-400 sm:inline dark:text-zinc-500">{post.quantity} left</span>
            ) : null}
          </div>

          <div className="mt-auto pt-3">
            <div className="flex min-w-0 items-center gap-2 border-t border-[#EEF1F5] pt-2.5 dark:border-zinc-800">
              <OwnerLine owner={post.owner} />
              <BlockTag block={post.block} />
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
});

/**
 * Board card for a request ("I need it"). Requests rarely have photos, so
 * this one is text-first: what's needed, by when, and what they'll pay.
 */
export const RequestCard = memo(function RequestCard({ post }) {
  const { Icon, label } = categoryOf(post.category);
  const image = post.images?.[0]?.url;
  const price = priceParts(post.price);
  const soon = post.neededBy && new Date(post.neededBy).getTime() - Date.now() < 2 * 3600 * 1000;
  return (
    <Link
      to={`/rent/${post.id}`}
      className="group flex h-full flex-col rounded-2xl border border-zinc-200 bg-white p-4 font-figtree shadow-[0_4px_18px_rgba(15,23,42,0.06)] transition-all duration-300 hover:border-[#D4D4D8] hover:shadow-[0_10px_28px_rgba(15,23,42,0.10)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)] dark:border-zinc-800 dark:bg-[#18181B] dark:hover:border-zinc-600"
    >
      <div className="flex items-start gap-3">
        {image ? (
          <img src={image} alt="" loading="lazy" className="h-12 w-12 shrink-0 rounded-xl bg-neutral-100 object-cover dark:bg-white/5" />
        ) : (
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[#F4F5F9] text-slate-500 dark:bg-white/5 dark:text-zinc-400">
            <Icon className="h-5 w-5" aria-hidden="true" />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-[11.5px] font-semibold text-[var(--accent-text)] md:text-xs">{label}</p>
          <h3 className="mt-0.5 line-clamp-2 text-[15px] font-semibold leading-snug text-slate-900 dark:text-white">{post.title}</h3>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[13px]">
        {post.neededBy && (
          <span className={cn("inline-flex items-center gap-1.5 font-medium", soon ? "text-amber-700 dark:text-amber-300" : "text-slate-600 dark:text-zinc-300")}>
            <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
            Needed {relativeTime(post.neededBy).replace("in ", "within ")}
          </span>
        )}
        <span className="text-slate-500 dark:text-zinc-400">
          {price.free ? (
            "Free favour"
          ) : (
            <>
              Pays <span className="font-semibold text-slate-900 dark:text-white">{price.amount}</span>
              {price.unit}
            </>
          )}
          {post.mode === "share" && post.quantity > 1 ? ` · ${post.quantity} needed` : ""}
        </span>
      </div>

      <div className="mt-auto pt-3">
        <div className="flex min-w-0 items-center gap-2 border-t border-[#EEF1F5] pt-2.5 dark:border-zinc-800">
          <OwnerLine owner={post.owner} />
          <BlockTag block={post.block} />
        </div>
      </div>
    </Link>
  );
});

export function RequestGridSkeleton({ count = 6, className }) {
  return (
    <div className={className} aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="rounded-2xl border border-neutral-100 bg-white p-4 dark:border-neutral-800 dark:bg-[#1A1D20]">
          <div className="flex gap-3">
            <div className="browse-shimmer h-12 w-12 rounded-xl bg-neutral-100 dark:bg-white/5" />
            <div className="flex-1 space-y-2 pt-1">
              <div className="browse-shimmer h-3 w-1/4 rounded-full bg-neutral-100 dark:bg-white/5" />
              <div className="browse-shimmer h-4 w-3/4 rounded-full bg-neutral-100 dark:bg-white/5" />
            </div>
          </div>
          <div className="browse-shimmer mt-4 h-3 w-1/2 rounded-full bg-neutral-100 dark:bg-white/5" />
          <div className="browse-shimmer mt-5 h-6 w-2/5 rounded-full bg-neutral-100 dark:bg-white/5" />
        </div>
      ))}
    </div>
  );
}

/** Bottom sheet on phones, centred dialog on larger screens. */
export function Sheet({ open, onOpenChange, title, description, children, footer }) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[999] bg-black/50 backdrop-blur-[2px]" />
        <Dialog.Content
          className={cn(
            "fixed z-[1000] flex max-h-[92dvh] flex-col bg-white font-figtree shadow-2xl focus:outline-none dark:bg-[#1A1D20]",
            "inset-x-0 bottom-0 rounded-t-3xl pb-[env(safe-area-inset-bottom)]",
            "sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:w-[92vw] sm:max-w-[460px] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl sm:pb-0",
          )}
        >
          <div className="mx-auto mt-2 h-1.5 w-10 rounded-full bg-neutral-200 sm:hidden dark:bg-neutral-700" aria-hidden="true" />
          <div className="flex items-start justify-between gap-3 px-5 pb-2 pt-4">
            <div className="min-w-0">
              <Dialog.Title className="text-[18px] font-semibold tracking-tight text-slate-900 dark:text-white">{title}</Dialog.Title>
              {description ? (
                <Dialog.Description className="mt-0.5 text-[13px] text-slate-500 dark:text-zinc-400">{description}</Dialog.Description>
              ) : (
                <Dialog.Description className="sr-only">{title}</Dialog.Description>
              )}
            </div>
            <Dialog.Close
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-slate-500 hover:bg-neutral-100 dark:text-zinc-400 dark:hover:bg-white/10"
              aria-label="Close"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </Dialog.Close>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-4">{children}</div>
          {footer && <div className="border-t border-neutral-100 px-5 py-3 dark:border-neutral-800">{footer}</div>}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export const btnPrimary =
  "inline-flex h-11 items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-[var(--accent)] px-5 text-[14.5px] font-semibold text-white shadow-sm transition-colors hover:bg-[var(--accent-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)] disabled:cursor-not-allowed disabled:opacity-60";
export const btnSecondary =
  "inline-flex h-11 items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-neutral-200 bg-white px-4 text-[14px] font-semibold text-slate-700 transition-colors hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)] disabled:cursor-not-allowed disabled:opacity-60 dark:border-neutral-700 dark:bg-[#1A1D20] dark:text-zinc-200 dark:hover:bg-white/5";
export const btnDanger =
  "inline-flex h-11 items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-neutral-200 bg-white px-4 text-[14px] font-semibold text-red-600 transition-colors hover:border-red-200 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-neutral-700 dark:bg-[#1A1D20] dark:text-red-400 dark:hover:bg-red-950/20";
