import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { cn } from "../../../utils/cn.js";
import { CARD } from "../../user/components/account/AccountKit.jsx";
import { useRentConfig } from "../hooks/useRentConfig.js";
import { formatRupees } from "../constants/rentOptions.js";

/**
 * Profile → Overview: a small Rent & Borrow summary next to Earnings.
 * Renders nothing while the feature is off for this campus.
 */
export default function RentProfileCard({ className }) {
  const { enabled, profile } = useRentConfig();
  if (!enabled) return null;
  const stats = profile?.stats;
  const cells = [
    { label: "Earned", value: formatRupees(stats?.earnedTotal) },
    { label: "Lent", value: (stats?.lent || 0) + (stats?.shared || 0) },
    { label: "Rating", value: stats?.rating ? `★ ${stats.rating.toFixed(1)}` : "New" },
  ];
  return (
    <section className={cn(CARD, "px-5 py-4", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-[12.5px] font-medium text-slate-500 dark:text-zinc-400">Rent & Borrow</p>
        <Link to="/rentals" className="inline-flex items-center gap-1 text-[13px] font-semibold text-[var(--accent-text)] hover:underline">
          Rentals <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </div>
      <dl className="mt-2 grid grid-cols-3 gap-3">
        {cells.map((c) => (
          <div key={c.label} className="flex min-w-0 flex-col-reverse">
            <dt className="text-[11.5px] text-slate-500 dark:text-zinc-400">{c.label}</dt>
            <dd className="truncate text-[17px] font-semibold tabular-nums text-slate-900 dark:text-white">{c.value}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-2 text-[11.5px] text-slate-400 dark:text-zinc-500">
        {profile?.block ? `${profile.block} · ` : ""}
        <Link to="/rent" className="font-medium hover:text-[var(--accent-text)]">
          Browse what&apos;s nearby
        </Link>
      </p>
    </section>
  );
}
