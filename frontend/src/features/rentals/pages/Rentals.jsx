import { useState } from "react";
import {
  CalendarClock,
  Clock,
  IndianRupee,
  KeyRound,
  Lock,
  MessageCircle,
  Package,
  Repeat,
  ShieldCheck,
  Sparkles,
  Wallet,
} from "lucide-react";
import { AccountLayout, CARD } from "../../user/components/account/AccountKit.jsx";
import { cn } from "../../../utils/cn.js";

/*
 * Rentals (coming soon). A disabled preview of the real screen: stats,
 * "Listed for rent" / "Rented out" tabs and sample rows, all clearly
 * inactive, so students see what's coming without anything pretending to
 * work. The tabs switch the preview only; no data is fetched.
 */

const TABS = [
  { key: "listed", label: "Listed for rent", icon: Package },
  { key: "rented", label: "Rented out", icon: Repeat },
];

const SAMPLE = {
  listed: [
    { title: "Casio fx-991EX calculator", price: 25, status: "Available", tone: "emerald", meta: "Min 3 days · ₹200 deposit" },
    { title: "Hero Sprint cycle", price: 60, status: "Available", tone: "emerald", meta: "Min 7 days · ₹1,000 deposit" },
    { title: "Lab coat, size M", price: 15, status: "Paused", tone: "slate", meta: "Min 1 day · No deposit" },
  ],
  rented: [
    { title: "Engineering Maths, 3rd ed.", price: 20, status: "Due back in 2 days", tone: "amber", meta: "Rented to Aarav · 12 Dec to 19 Dec" },
    { title: "Rechargeable study lamp", price: 10, status: "Returned", tone: "emerald", meta: "Rented to Riya · Paid ₹70" },
    { title: "boAt Rockerz 450", price: 30, status: "Return overdue", tone: "red", meta: "Rented to Kabir · Was due 2 Dec" },
  ],
};

const TONES = {
  emerald: "bg-emerald-50 text-emerald-700 ring-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20",
  amber: "bg-amber-50 text-amber-700 ring-amber-100 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/20",
  red: "bg-red-50 text-red-700 ring-red-100 dark:bg-red-500/10 dark:text-red-300 dark:ring-red-500/20",
  slate: "bg-neutral-100 text-slate-600 ring-neutral-200 dark:bg-white/5 dark:text-zinc-300 dark:ring-white/10",
};

const STATS = [
  { label: "Listed for rent", icon: Package },
  { label: "Rented out now", icon: Repeat },
  { label: "Due back this week", icon: CalendarClock },
  { label: "Earned from rentals", icon: Wallet },
];

const STEPS = [
  { icon: KeyRound, title: "List it for rent", body: "Set a daily price, minimum days and a refundable deposit." },
  { icon: MessageCircle, title: "Agree dates in chat", body: "Confirm the dates and pickup spot with the renter in Unideals chat." },
  { icon: ShieldCheck, title: "Get it back, get paid", body: "Track every return in one place, with reminders before it's due." },
];

export default function Rentals() {
  const [tab, setTab] = useState("listed");
  const rows = SAMPLE[tab];

  return (
    <AccountLayout
      seoTitle="Rentals | Unideals"
      title="Rentals"
      description="Everything you rent out to other students, in one place."
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
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-10 -top-10 grid size-48 place-items-center rounded-full border border-dashed border-[var(--accent)] opacity-20"
          >
            <span className="size-32 rounded-full border border-dashed border-[var(--accent)]" />
          </div>

          <div className="relative max-w-xl">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--accent-soft)] px-2.5 py-1 text-[12px] font-semibold text-[var(--accent-text)] ring-1 ring-inset ring-[var(--accent-ring)]">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" /> Coming soon
            </span>
            <h2 className="mt-3 text-[22px] font-semibold leading-tight tracking-tight text-slate-900 sm:text-[26px] dark:text-white">
              Rent out what you don&apos;t use. Rent what you need for a semester.
            </h2>
            <p className="mt-2 text-[14px] leading-relaxed text-slate-500 dark:text-zinc-400">
              Calculators, cycles, lab coats, books: list them for rent and earn from things that sit idle. Your
              rental listings and everything you&apos;ve rented out will live here.
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button
                type="button"
                disabled
                aria-disabled="true"
                className="inline-flex h-10 cursor-not-allowed items-center gap-2 rounded-lg bg-[var(--accent)] px-4 text-[14px] font-semibold text-white opacity-60"
              >
                <Lock className="h-4 w-4" aria-hidden="true" /> List an item for rent
              </button>
              <span className="inline-flex items-center gap-1.5 text-[12.5px] text-slate-500 dark:text-zinc-400">
                <Clock className="h-3.5 w-3.5" aria-hidden="true" /> Launching on your campus soon
              </span>
            </div>
          </div>
        </section>

        {/* ── Stats (disabled) ── */}
        <section aria-label="Rental stats (available at launch)" className={cn(CARD, "grid grid-cols-2 overflow-hidden lg:grid-cols-4")}>
          {STATS.map(({ label, icon: Icon }, i) => (
            <div
              key={label}
              className={cn(
                "px-4 py-4 sm:px-5",
                i % 2 === 1 && "border-l border-neutral-100 dark:border-neutral-800",
                i >= 2 && "border-t border-neutral-100 lg:border-l lg:border-t-0 dark:border-neutral-800",
              )}
            >
              <p className="flex items-center gap-1.5 text-[12.5px] font-medium text-slate-500 dark:text-zinc-400">
                <Icon className="h-3.5 w-3.5" aria-hidden="true" /> {label}
              </p>
              <p className="mt-1.5 text-[24px] font-semibold leading-none tracking-tight text-slate-300 sm:text-[26px] dark:text-zinc-600">
                —
              </p>
              <p className="mt-1.5 text-[12px] text-slate-400 dark:text-zinc-500">Available at launch</p>
            </div>
          ))}
        </section>

        {/* ── Preview of the real list ── */}
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
                    "inline-flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors sm:flex-none",
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
            <ul aria-hidden="true" className="pointer-events-none select-none divide-y divide-neutral-100 opacity-70 dark:divide-neutral-800">
              {rows.map((r) => (
                <li key={r.title} className="flex items-center gap-3 px-4 py-3.5 sm:px-5">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-neutral-100 text-slate-400 dark:bg-white/5 dark:text-zinc-500">
                    <Package className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] font-medium text-slate-800 dark:text-zinc-100">{r.title}</span>
                    <span className="block truncate text-[12.5px] text-slate-500 dark:text-zinc-400">{r.meta}</span>
                  </span>
                  <span className="hidden shrink-0 items-baseline gap-0.5 text-[14px] font-semibold tabular-nums text-slate-700 sm:inline-flex dark:text-zinc-200">
                    <IndianRupee className="h-3.5 w-3.5 self-center" />
                    {r.price}
                    <span className="text-[12px] font-normal text-slate-400 dark:text-zinc-500">/day</span>
                  </span>
                  <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[11.5px] font-medium ring-1 ring-inset", TONES[r.tone])}>
                    {r.status}
                  </span>
                </li>
              ))}
            </ul>

            {/* Fade + lock card over the preview */}
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-white/30 via-white/70 to-white/95 px-4 backdrop-blur-[1.5px] dark:from-[#1A1D20]/30 dark:via-[#1A1D20]/70 dark:to-[#1A1D20]/95">
              <div className="flex max-w-xs flex-col items-center rounded-2xl border border-neutral-200/80 bg-white/95 px-5 py-4 text-center shadow-[0_16px_40px_-18px_rgba(15,23,42,0.3)] dark:border-neutral-800 dark:bg-[#1A1D20]/95">
                <span className="grid size-10 place-items-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent-text)]">
                  <Lock className="h-5 w-5" aria-hidden="true" />
                </span>
                <p className="mt-2.5 text-[14px] font-semibold text-slate-900 dark:text-white">
                  {tab === "listed" ? "Your rental listings will appear here" : "Items you've rented out will appear here"}
                </p>
                <p className="mt-1 text-[12.5px] leading-snug text-slate-500 dark:text-zinc-400">
                  {tab === "listed"
                    ? "Prices, availability and deposits for everything you list for rent."
                    : "Who has it, return dates and payments, with reminders before it's due."}
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
        </section>
      </div>
    </AccountLayout>
  );
}
