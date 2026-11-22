import { Link } from "react-router-dom";
import * as AlertDialog from "@radix-ui/react-alert-dialog";
import { Info, Pause, Pencil, Play, Trash2 } from "lucide-react";
import AvatarComponent from "../../../../components/common/AvatarComponent.jsx";
import { cn } from "../../../../utils/cn.js";
import { CARD, StatusPill, btnDanger, btnPrimary, btnSecondary } from "../RentKit.jsx";
import { formatDateTime, formatRupees } from "../../constants/rentOptions.js";

/*
 * Pieces of the Rent & Borrow item page. Same look as the product page
 * (features/product/pages/ProductDescription.jsx): quiet chips, one details
 * card split by hairlines, a summary column and a person card.
 */

export const FLUSH_ON_PHONE = "max-sm:-mx-4 max-sm:rounded-none max-sm:border-x-0 max-sm:shadow-none";

const TINTS = {
  indigo: "bg-indigo-50 text-indigo-600 ring-indigo-100 dark:bg-indigo-950/50 dark:text-indigo-300 dark:ring-indigo-900/60",
  violet: "bg-violet-50 text-violet-600 ring-violet-100 dark:bg-violet-950/50 dark:text-violet-300 dark:ring-violet-900/60",
  emerald: "bg-emerald-50 text-emerald-600 ring-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-300 dark:ring-emerald-900/60",
  sky: "bg-sky-50 text-sky-600 ring-sky-100 dark:bg-sky-950/50 dark:text-sky-300 dark:ring-sky-900/60",
  rose: "bg-rose-50 text-rose-500 ring-rose-100 dark:bg-rose-950/50 dark:text-rose-300 dark:ring-rose-900/60",
  amber: "bg-amber-50 text-amber-600 ring-amber-100 dark:bg-amber-950/50 dark:text-amber-300 dark:ring-amber-900/60",
};

export function Chip({ tone = "neutral", className, children }) {
  const tones = {
    neutral: "bg-white text-slate-700 ring-neutral-200 dark:bg-white/[0.04] dark:text-zinc-300 dark:ring-white/10",
    accent: "bg-[var(--accent-soft)] text-[var(--accent-text)] ring-transparent",
    success: "bg-emerald-50 text-emerald-700 ring-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900/60",
    warning: "bg-amber-50 text-amber-800 ring-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900/60",
  };
  return (
    <span className={cn("inline-flex h-6 items-center gap-1.5 whitespace-nowrap rounded-md px-2 text-[12px] font-medium ring-1 ring-inset", tones[tone], className)}>
      {children}
    </span>
  );
}

export function Notice({ tone = "warning", icon: Icon = Info, title, children }) {
  const tiles = {
    warning: TINTS.amber,
    neutral: "bg-neutral-100 text-slate-500 ring-neutral-200 dark:bg-white/5 dark:text-zinc-400 dark:ring-white/10",
    danger: TINTS.rose,
  };
  return (
    <div role="status" className="flex items-start gap-3 rounded-xl border border-neutral-200 bg-white p-3 dark:border-neutral-800 dark:bg-white/[0.02]">
      <span className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-lg ring-1 ring-inset", tiles[tone])} aria-hidden="true">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 pt-px">
        {title && <p className="text-[13px] font-semibold leading-5 text-slate-900 dark:text-white">{title}</p>}
        {children && <p className="text-[12.5px] leading-5 text-slate-500 dark:text-zinc-400">{children}</p>}
      </div>
    </div>
  );
}

/** A titled block inside the shared details card. */
export function Section({ title, icon: Icon, tone = "indigo", className, children }) {
  return (
    <section className={cn("px-4 py-5 sm:px-6 sm:py-6", className)}>
      <h2 className="mb-4 flex items-center gap-2.5 text-[16px] font-semibold tracking-tight text-slate-900 sm:text-[17px] dark:text-white">
        {Icon && (
          <span className={cn("grid h-7 w-7 shrink-0 place-items-center rounded-lg ring-1 ring-inset", TINTS[tone])} aria-hidden="true">
            <Icon className="h-4 w-4" />
          </span>
        )}
        {title}
      </h2>
      {children}
    </section>
  );
}

export function InfoTile({ icon: Icon, tone = "sky", label, value }) {
  return (
    <div className="flex min-w-0 items-start gap-3">
      <span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-lg ring-1 ring-inset", TINTS[tone])} aria-hidden="true">
        <Icon className="h-[18px] w-[18px]" />
      </span>
      <div className="min-w-0">
        <p className="text-[12.5px] text-slate-500 dark:text-zinc-400">{label}</p>
        <p className="mt-0.5 whitespace-pre-line break-words text-[14.5px] font-medium text-slate-900 dark:text-white">{value}</p>
      </div>
    </div>
  );
}

/** The person behind the post (lender, or whoever asked). */
export function PersonCard({ person, isRequest, isMine, block, className }) {
  const avatar = typeof person?.avatar === "string" ? person.avatar : person?.avatar?.url;
  const facts = [
    { label: person?.ratingCount ? `Rating (${person.ratingCount})` : "Rating", value: person?.rating ? `★ ${person.rating.toFixed(1)}` : "New" },
    { label: "Lent or shared", value: person?.lentCount || 0 },
    block && { label: "Block", value: block },
  ].filter(Boolean);
  return (
    <section className={cn(CARD, FLUSH_ON_PHONE, "p-4 sm:p-6", className)} aria-label={isRequest ? "Requested by" : "Lender"}>
      <h2 className="text-[13px] font-semibold text-slate-900 dark:text-white">
        {isMine ? "You posted this" : isRequest ? "Requested by" : "About the lender"}
      </h2>
      <div className="mt-3 flex items-center gap-3">
        <AvatarComponent name={person?.name || "Student"} imageUrl={avatar} size="medium" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-semibold text-slate-900 dark:text-white">{person?.name || "Student"}</p>
          <p className="mt-0.5 text-[12.5px] text-slate-500 dark:text-zinc-400">Campus member</p>
        </div>
      </div>
      <dl className={cn("mt-5 grid gap-4 border-t border-neutral-200/80 pt-4 dark:border-neutral-800", facts.length === 3 ? "grid-cols-3" : "grid-cols-2")}>
        {facts.map((f) => (
          <div key={f.label} className="flex min-w-0 flex-col-reverse">
            <dt className="mt-0.5 max-w-full truncate text-[11.5px] text-slate-500 dark:text-zinc-400">{f.label}</dt>
            <dd className="max-w-full truncate text-[15px] font-semibold tabular-nums text-slate-900 dark:text-white">{f.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/** Owner tools: edit, pause/resume, remove. */
export function OwnerActions({ post, busy, onPause, onResume, onRemove }) {
  const editable = ["active", "paused"].includes(post.status);
  return (
    <div className="flex flex-col gap-2.5">
      {editable && (
        <Link to={`/rent/edit/${post.id}`} className={cn(btnPrimary, "h-12 w-full rounded-lg")}>
          <Pencil className="h-[18px] w-[18px]" aria-hidden="true" />
          Edit listing
        </Link>
      )}
      <div className="grid grid-cols-2 gap-2.5">
        {post.status === "active" && (
          <button type="button" disabled={busy === "pause"} onClick={onPause} className={cn(btnSecondary, "w-full rounded-lg text-[13.5px] font-medium")}>
            <Pause className="h-4 w-4" aria-hidden="true" /> Pause
          </button>
        )}
        {post.status === "paused" && (
          <button type="button" disabled={busy === "resume"} onClick={onResume} className={cn(btnSecondary, "w-full rounded-lg text-[13.5px] font-medium")}>
            <Play className="h-4 w-4" aria-hidden="true" /> Resume
          </button>
        )}
        <AlertDialog.Root>
          <AlertDialog.Trigger asChild>
            <button type="button" className={cn(btnDanger, "w-full rounded-lg text-[13.5px] font-medium", !["active", "paused"].includes(post.status) && "col-span-2")}>
              <Trash2 className="h-4 w-4" aria-hidden="true" /> Remove
            </button>
          </AlertDialog.Trigger>
          <AlertDialog.Portal>
            <AlertDialog.Overlay className="fixed inset-0 z-[999] bg-black/50" />
            <AlertDialog.Content className="fixed left-1/2 top-1/2 z-[1000] w-[90vw] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-3xl bg-white p-6 font-figtree shadow-2xl dark:bg-[#1A1D20]">
              <AlertDialog.Title className="text-[18px] font-semibold text-slate-900 dark:text-white">Remove this listing?</AlertDialog.Title>
              <AlertDialog.Description className="mt-1 text-[13.5px] text-slate-500 dark:text-zinc-400">
                Anyone still waiting for a reply will be told it was removed.
              </AlertDialog.Description>
              <div className="mt-5 flex justify-end gap-2">
                <AlertDialog.Cancel className={btnSecondary}>Keep</AlertDialog.Cancel>
                <AlertDialog.Action className={btnDanger} onClick={onRemove}>
                  Remove
                </AlertDialog.Action>
              </div>
            </AlertDialog.Content>
          </AlertDialog.Portal>
        </AlertDialog.Root>
      </div>
    </div>
  );
}

/** Owner view: who asked, with accept / decline. */
export function IncomingRequests({ post, busy, onAccept, onDecline, className }) {
  const isRequest = post.kind === "request";
  const pending = (post.bookings || []).filter((b) => b.status === "pending");
  const ongoing = (post.bookings || []).filter((b) => b.status !== "pending");
  const rows = [...ongoing, ...pending];
  return (
    <section className={cn(CARD, FLUSH_ON_PHONE, "overflow-hidden", className)} aria-label="Requests">
      <div className="flex items-baseline justify-between gap-3 border-b border-neutral-100 px-4 py-3.5 sm:px-6 dark:border-neutral-800">
        <h2 className="text-[15px] font-semibold text-slate-900 dark:text-white">
          {isRequest ? "Offers to help" : "Requests"}
          {rows.length > 0 && <span className="ml-2 text-[13px] font-normal text-slate-400 dark:text-zinc-500">{rows.length}</span>}
        </h2>
        <p className="text-[12px] text-slate-500 dark:text-zinc-400">Accepting one closes the rest</p>
      </div>
      {rows.length === 0 ? (
        <p className="px-4 py-6 text-center text-[13px] text-slate-500 sm:px-6 dark:text-zinc-400">
          {isRequest ? "No offers yet. Students in your block have been pinged." : "No requests yet. They'll show up here."}
        </p>
      ) : (
        <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
          {rows.map((b) => {
            const avatar = typeof b.person?.avatar === "string" ? b.person.avatar : b.person?.avatar?.url;
            return (
              <li key={b.id} className="px-4 py-4 sm:px-6">
                <div className="flex items-center gap-3">
                  <AvatarComponent name={b.person?.name || "Student"} imageUrl={avatar} size="small" className="h-9 w-9 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-semibold text-slate-900 dark:text-white">{b.person?.name || "Student"}</p>
                    <p className="truncate text-[12.5px] text-slate-500 dark:text-zinc-400">
                      {b.agreedPrice ? formatRupees(b.agreedPrice) : "Free"}
                      {b.quantity > 1 ? ` · ${b.quantity} items` : ""}
                      {b.returnBy ? ` · back by ${formatDateTime(b.returnBy)}` : ""}
                    </p>
                  </div>
                  <StatusPill status={b.status} />
                </div>
                {b.note && (
                  <p className="mt-3 rounded-lg bg-neutral-50 px-3 py-2 text-[13px] text-slate-700 dark:bg-white/5 dark:text-zinc-200">“{b.note}”</p>
                )}
                <div className="mt-3 flex gap-2">
                  {b.status === "pending" ? (
                    <>
                      <button type="button" disabled={Boolean(busy)} onClick={() => onAccept(b)} className={cn(btnPrimary, "h-10 flex-1 rounded-lg text-[13.5px]")}>
                        Accept
                      </button>
                      <button type="button" disabled={Boolean(busy)} onClick={() => onDecline(b)} className={cn(btnSecondary, "h-10 flex-1 rounded-lg text-[13.5px]")}>
                        Decline
                      </button>
                    </>
                  ) : (
                    <Link to={`/rent/booking/${b.id}`} className={cn(btnSecondary, "h-10 flex-1 rounded-lg text-[13.5px]")}>
                      Open booking
                    </Link>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
