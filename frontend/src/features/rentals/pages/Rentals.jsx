import { useState } from "react";
import {
  Clock,
  Hand,
  KeyRound,
  Lock,
  MapPin,
  MessageCircle,
  Package,
  Plus,
  RotateCcw,
  Search,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";
import { AccountLayout, CARD } from "../../user/components/account/AccountKit.jsx";
import { cn } from "../../../utils/cn.js";

/*
 * Rentals (coming soon). Quick, short rentals between students on the same
 * campus: a badminton racket for the evening, formal shoes for tomorrow's
 * interview. Two sides: things people have put up for rent, and requests
 * ("I need X by tonight") that anyone who has the item can answer.
 * Everything here is a disabled preview with sample data; no data is
 * fetched and no action works yet.
 */

const QUICK_NEEDS = [
  "Badminton racket",
  "Formal shoes",
  "Blazer",
  "Scientific calculator",
  "Lab coat",
  "Extension board",
  "Cycle",
  "Trolley bag",
];

const TABS = [
  { key: "rent", label: "Available to rent", icon: Package },
  { key: "requests", label: "Requests", icon: Hand },
];

const AVAILABLE = [
  { title: "Yonex badminton racket", price: "₹30", per: "day", where: "Men's hostel, Block K", ready: "Ready now", deposit: "₹300 deposit" },
  { title: "Formal shoes, size 9 (black)", price: "₹60", per: "day", where: "Main building gate", ready: "Ready today", deposit: "₹500 deposit" },
  { title: "Navy blazer, size M", price: "₹80", per: "day", where: "Library entrance", ready: "Tomorrow", deposit: "₹800 deposit" },
  { title: "Casio fx-991EX calculator", price: "₹20", per: "day", where: "Academic block 1", ready: "Ready now", deposit: "₹200 deposit" },
];

const REQUESTS = [
  { need: "Formal shoes, size 8", why: "Campus interview tomorrow morning", budget: "Up to ₹80/day", by: "Needed by 9 am", urgent: true },
  { need: "Badminton racket ×2", why: "Evening game at the sports complex", budget: "Up to ₹40/day", by: "Today, 6 pm", urgent: true },
  { need: "White lab coat, size L", why: "Chemistry lab this week", budget: "Up to ₹100/week", by: "Needed by Monday", urgent: false },
  { need: "Trolley bag", why: "Going home for the weekend", budget: "Up to ₹150 for 4 days", by: "Needed by Friday", urgent: false },
];

const STEPS = [
  { icon: Search, title: "Find it or ask for it", body: "Browse what's up for rent nearby, or post a request and let people who have it reply." },
  { icon: MessageCircle, title: "Agree in chat", body: "Fix the price, dates, deposit and a public pickup spot with the other student." },
  { icon: RotateCcw, title: "Use it, return it", body: "Hand it back on time and get your deposit back. Reminders before it's due." },
];

function DisabledButton({ icon: Icon, children, primary }) {
  return (
    <button
      type="button"
      disabled
      aria-disabled="true"
      className={cn(
        "inline-flex h-11 cursor-not-allowed items-center justify-center gap-2 rounded-lg px-4 text-[14px] font-semibold opacity-60 sm:h-10",
        primary
          ? "bg-[var(--accent)] text-white"
          : "border border-neutral-200 bg-white text-slate-700 dark:border-neutral-700 dark:bg-[#1A1D20] dark:text-zinc-200",
      )}
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
      {children}
    </button>
  );
}

function RentCard({ item }) {
  return (
    <li className="flex min-w-0 gap-3 rounded-xl border border-neutral-200/80 bg-white p-3 dark:border-neutral-800 dark:bg-[#131313]">
      <span className="grid h-14 w-14 shrink-0 place-items-center rounded-lg bg-neutral-100 text-slate-400 dark:bg-white/5 dark:text-zinc-500">
        <Package className="h-6 w-6" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[14px] font-semibold text-slate-900 dark:text-white">{item.title}</span>
        <span className="mt-0.5 flex items-center gap-1 truncate text-[12px] text-slate-500 dark:text-zinc-400">
          <MapPin className="h-3 w-3 shrink-0" />
          <span className="truncate">{item.where}</span>
        </span>
        <span className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-[14px] font-semibold tabular-nums text-slate-900 dark:text-white">
            {item.price}
            <span className="text-[12px] font-normal text-slate-400 dark:text-zinc-500">/{item.per}</span>
          </span>
          <span className="rounded-full bg-emerald-50 px-2 py-px text-[11px] font-medium text-emerald-700 ring-1 ring-inset ring-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20">
            {item.ready}
          </span>
          <span className="text-[11.5px] text-slate-400 dark:text-zinc-500">{item.deposit}</span>
        </span>
      </span>
    </li>
  );
}

function RequestCard({ req }) {
  return (
    <li className="flex min-w-0 flex-col gap-2 rounded-xl border border-neutral-200/80 bg-white p-3.5 dark:border-neutral-800 dark:bg-[#131313]">
      <span className="flex items-start justify-between gap-2">
        <span className="min-w-0">
          <span className="block text-[14px] font-semibold text-slate-900 dark:text-white">{req.need}</span>
          <span className="mt-0.5 block text-[12.5px] text-slate-500 dark:text-zinc-400">{req.why}</span>
        </span>
        {req.urgent && (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-50 px-2 py-px text-[11px] font-medium text-amber-700 ring-1 ring-inset ring-amber-100 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/20">
            <Zap className="h-3 w-3" /> Urgent
          </span>
        )}
      </span>
      <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-slate-500 dark:text-zinc-400">
        <span className="font-medium text-slate-700 dark:text-zinc-200">{req.budget}</span>
        <span className="inline-flex items-center gap-1">
          <Clock className="h-3 w-3" /> {req.by}
        </span>
      </span>
      <span className="mt-0.5 inline-flex h-9 items-center justify-center gap-1.5 self-start rounded-lg border border-neutral-200 px-3 text-[13px] font-semibold text-slate-600 dark:border-neutral-700 dark:text-zinc-300">
        <Hand className="h-3.5 w-3.5" /> I have this
      </span>
    </li>
  );
}

export default function Rentals() {
  const [tab, setTab] = useState("rent");

  return (
    <AccountLayout
      seoTitle="Rentals | Unideals"
      title="Rentals"
      description="Rent what you need for a day, from students on your campus."
      width="xl"
    >
      <div className="flex flex-col gap-4 sm:gap-5">
        {/* ── Hero ── */}
        <section className={cn(CARD, "relative overflow-hidden px-5 py-6 sm:px-8 sm:py-8")}>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{ background: "radial-gradient(60% 90% at 100% 0%, var(--accent-soft) 0%, transparent 65%)" }}
          />
          <div className="relative max-w-2xl">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--accent-soft)] px-2.5 py-1 text-[12px] font-semibold text-[var(--accent-text)] ring-1 ring-inset ring-[var(--accent-ring)]">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" /> Coming soon
            </span>
            <h2 className="mt-3 text-[22px] font-semibold leading-tight tracking-tight text-slate-900 sm:text-[28px] dark:text-white">
              Need it today? Rent it from someone on campus.
            </h2>
            <p className="mt-2 max-w-xl text-[14px] leading-relaxed text-slate-500 dark:text-zinc-400">
              A racket for tonight&apos;s game, formal shoes for tomorrow&apos;s interview, a blazer for a presentation.
              Rent it for a day from a student nearby, or post a request and let people who have it reach you.
            </p>

            <div className="mt-5 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center">
              <DisabledButton icon={Hand} primary>
                Request an item
              </DisabledButton>
              <DisabledButton icon={Plus}>Put something up for rent</DisabledButton>
            </div>

            <div className="mt-6">
              <p className="text-[12px] font-medium uppercase tracking-wide text-slate-400 dark:text-zinc-500">
                What students usually need in a hurry
              </p>
              <ul className="mt-2 flex flex-wrap gap-1.5" aria-label="Common quick rentals">
                {QUICK_NEEDS.map((n) => (
                  <li
                    key={n}
                    className="rounded-full border border-neutral-200 bg-white/80 px-3 py-1 text-[12.5px] font-medium text-slate-600 dark:border-neutral-700 dark:bg-white/[0.03] dark:text-zinc-300"
                  >
                    {n}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* ── Preview: available items / requests ── */}
        <section className={cn(CARD, "overflow-hidden")}>
          <div className="flex flex-col gap-3 border-b border-neutral-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5 dark:border-neutral-800">
            <div role="tablist" aria-label="Rental views" className="inline-flex w-full rounded-lg bg-neutral-100 p-1 sm:w-auto dark:bg-white/5">
              {TABS.map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={tab === key}
                  onClick={() => setTab(key)}
                  className={cn(
                    "inline-flex min-h-[36px] flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors sm:flex-none",
                    tab === key
                      ? "bg-white text-slate-900 shadow-sm dark:bg-[#1A1D20] dark:text-white"
                      : "text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-zinc-200",
                  )}
                >
                  <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                  {label}
                </button>
              ))}
            </div>
            <span className="inline-flex items-center gap-1.5 self-start rounded-full bg-neutral-100 px-2.5 py-1 text-[11.5px] font-medium text-slate-500 sm:self-auto dark:bg-white/5 dark:text-zinc-400">
              <Lock className="h-3 w-3" aria-hidden="true" /> Preview
            </span>
          </div>

          <div className="relative">
            <ul
              aria-hidden="true"
              className="pointer-events-none grid select-none gap-2.5 p-3 opacity-70 sm:grid-cols-2 sm:p-4"
            >
              {tab === "rent"
                ? AVAILABLE.map((item) => <RentCard key={item.title} item={item} />)
                : REQUESTS.map((req) => <RequestCard key={req.need} req={req} />)}
            </ul>

            {/* Fade + lock card over the preview */}
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-white/30 via-white/70 to-white/95 px-4 backdrop-blur-[1.5px] dark:from-[#1A1D20]/30 dark:via-[#1A1D20]/70 dark:to-[#1A1D20]/95">
              <div className="flex max-w-xs flex-col items-center rounded-2xl border border-neutral-200/80 bg-white/95 px-5 py-4 text-center shadow-[0_16px_40px_-18px_rgba(15,23,42,0.3)] dark:border-neutral-800 dark:bg-[#1A1D20]/95">
                <span className="grid size-10 place-items-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent-text)]">
                  {tab === "rent" ? <KeyRound className="h-5 w-5" aria-hidden="true" /> : <Hand className="h-5 w-5" aria-hidden="true" />}
                </span>
                <p className="mt-2.5 text-[14px] font-semibold text-slate-900 dark:text-white">
                  {tab === "rent" ? "Items up for rent near you" : "What people on campus need"}
                </p>
                <p className="mt-1 text-[12.5px] leading-snug text-slate-500 dark:text-zinc-400">
                  {tab === "rent"
                    ? "Price per day, deposit, pickup spot and when it's ready, all in one card."
                    : "Have what someone's asking for? Reply and earn from things you aren't using."}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── How it will work ── */}
        <section className={cn(CARD, "px-4 py-5 sm:px-6")}>
          <h3 className="text-[15px] font-semibold text-slate-900 dark:text-white">How renting will work</h3>
          <ol className="mt-4 grid gap-3 sm:grid-cols-3">
            {STEPS.map(({ icon: Icon, title, body }, i) => (
              <li key={title} className="relative rounded-xl border border-neutral-200/80 p-4 dark:border-neutral-800">
                <span className="absolute right-3 top-3 text-[12px] font-semibold tabular-nums text-slate-300 dark:text-zinc-600">
                  0{i + 1}
                </span>
                <span className="grid size-9 place-items-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent-text)]">
                  <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
                </span>
                <p className="mt-3 text-[13.5px] font-semibold text-slate-900 dark:text-white">{title}</p>
                <p className="mt-1 text-[12.5px] leading-snug text-slate-500 dark:text-zinc-400">{body}</p>
              </li>
            ))}
          </ol>
          <p className="mt-4 flex items-start gap-1.5 text-[12px] leading-snug text-slate-500 dark:text-zinc-400">
            <ShieldCheck className="mt-px h-3.5 w-3.5 shrink-0 text-emerald-500" aria-hidden="true" />
            Meet at public campus spots only, and never pay a deposit before you&apos;ve seen the item.
          </p>
        </section>
      </div>
    </AccountLayout>
  );
}
