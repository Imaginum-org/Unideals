import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Check, ChevronDown, Download, FileText, Minus, ShieldCheck } from "lucide-react";
import { toast } from "../../../components/ui/toast.js";
import { AccountLayout, CARD, ErrorState, FLUSH_ON_PHONE, Panel, btnPrimary, btnSecondary } from "../components/account/AccountKit.jsx";
import EarlyAccessCard from "../components/EarlyAccessCard.jsx";
import PlanMark from "../components/PlanMark.jsx";
import { getBilling, getPlanPricing } from "../../payment/api/paymentApi.js";
import { cn } from "../../../utils/cn.js";
import { useUser } from "../../../context/useUserContext.jsx";
import { downloadReceiptPdf } from "../../payment/utils/receiptPdf.js";

/*
 * Subscription: what you have, how much of it you use, and what upgrading
 * gets you. Limits/perks mirror backend/src/config/subscriptionPlans.js;
 * prices come from GET /api/payments/plans (per-viewer, offers included);
 * checkout itself lives on /price.
 *
 * Visual rule: neutral surfaces, the brand accent only for the recommended
 * plan and primary actions, and plan identity carried by the PlanMark logo.
 */

const TIER_TO_ID = { base_user: "free", pro: "pro", pro_plus: "pro-plus" };
const PLAN_RANK = { free: 0, pro: 1, "pro-plus": 2 };
const PLAN_NAME = { base_user: "Free", pro: "Pro", pro_plus: "Pro Plus" };

const PLANS = [
  {
    id: "free",
    tier: "base_user",
    name: "Free",
    tagline: "Everything you need to start selling.",
    highlights: ["10 active listings", "25 wishlist saves", "Standard search ranking", "Standard support"],
  },
  {
    id: "pro",
    tier: "pro",
    name: "Pro",
    tagline: "For regular sellers who want more reach.",
    badge: "Most popular",
    highlights: ["25 active listings", "100 wishlist saves", "2 boosts every month (3-day)", "Higher search ranking", "Priority chat & support"],
  },
  {
    id: "pro-plus",
    tier: "pro_plus",
    name: "Pro Plus",
    tagline: "No limits. Top of every list.",
    badge: "Best value",
    highlights: ["Unlimited listings", "Unlimited wishlist", "5 boosts every month (7-day)", "Highest search ranking", "Top chat & support priority"],
  },
];

// What the next plan adds.
const UNLOCKS = {
  pro: [
    { value: "25", label: "active listings" },
    { value: "2 / month", label: "free 3-day boosts" },
    { value: "Higher", label: "search ranking" },
    { value: "Priority", label: "chat & support" },
  ],
  "pro-plus": [
    { value: "Unlimited", label: "listings & wishlist" },
    { value: "5 / month", label: "free 7-day boosts" },
    { value: "Highest", label: "search ranking" },
    { value: "Top", label: "chat & support priority" },
  ],
};

// Full comparison (values per plan: free, pro, pro-plus). false = not included.
const COMPARE = [
  { label: "Active listings", values: ["10", "25", "Unlimited"] },
  { label: "Wishlist saves", values: ["25", "100", "Unlimited"] },
  { label: "Monthly boosts", values: [false, "2 × 3-day", "5 × 7-day"] },
  { label: "Search ranking", values: ["Standard", "Higher", "Highest"] },
  { label: "Chat priority", values: [false, "Higher", "Highest"] },
  { label: "Support", values: ["Standard", "Priority", "Highest priority"] },
  { label: "Early access features", values: [false, "Limited", "Full"] },
];

const FAQ = [
  ["Is this a subscription?", "No. You pay once through Razorpay. Nothing renews automatically."],
  ["Can I upgrade later?", "Yes, any time. Your listings, chats and badges stay exactly as they are."],
  ["What's a boost?", "A boost places your listing near the top of the feed for a few days. Paid plans include monthly boosts; anyone can buy one from ₹29."],
];

const formatDate = (value) => {
  if (!value) return null;
  try {
    return new Date(value).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return null;
  }
};
const inr = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

function Subscription() {
  const navigate = useNavigate();
  const { userDetails } = useUser();
  const [downloading, setDownloading] = useState(null);
  const [billing, setBilling] = useState(null);
  const [pricing, setPricing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [compareOpen, setCompareOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState(0);
  const plansRef = useRef(null);
  const cancelledRef = useRef(false);

  useEffect(() => {
    cancelledRef.current = false;
    return () => {
      cancelledRef.current = true;
    };
  }, []);

  const fetchBilling = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const [billingRes, pricingRes] = await Promise.allSettled([getBilling(), getPlanPricing()]);
      if (cancelledRef.current) return;
      if (billingRes.status === "fulfilled" && billingRes.value.data?.success) setBilling(billingRes.value.data.data);
      else setLoadError(true);
      if (pricingRes.status === "fulfilled") setPricing(pricingRes.value.data?.data || null);
    } finally {
      if (!cancelledRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBilling();
  }, [fetchBilling]);

  const currentId = TIER_TO_ID[billing?.tier] || "free";
  const currentPlan = PLANS.find((p) => p.id === currentId) || PLANS[0];
  const currentRank = PLAN_RANK[currentId];
  const nextPlan = PLANS.find((p) => PLAN_RANK[p.id] === currentRank + 1) || null;

  // Live prices for this viewer (offers included); list prices as fallback.
  const priceOf = (plan) => {
    if (plan.id === "free") return { amount: 0, baseAmount: 0 };
    const live = pricing?.plans?.[plan.tier];
    return live || (plan.id === "pro" ? { amount: 99, baseAmount: 99 } : { amount: 199, baseAmount: 199 });
  };
  const hasGirlsOffer = pricing?.offer === "girls_founder";

  const usageRows = useMemo(() => {
    if (!billing) return [];
    const rows = [
      { label: "Active listings", used: billing.usage?.activeListings || 0, total: billing.limits?.activeListings ?? null },
      { label: "Wishlist", used: billing.usage?.wishlist || 0, total: billing.limits?.wishlist ?? null },
    ];
    if (billing.usage?.boost) {
      const used = billing.usage.boost.monthlyUsed || 0;
      const remaining = billing.usage.boost.monthlyRemaining;
      rows.push({ label: "Boosts this month", used, total: remaining == null ? used : used + remaining });
    }
    return rows;
  }, [billing]);

  // The most-used capped limit drives the upgrade nudge.
  const pressure = useMemo(() => {
    const capped = usageRows.filter((r) => r.total && r.total > 0 && r.label !== "Boosts this month");
    const top = [...capped].sort((a, b) => b.used / b.total - a.used / a.total)[0];
    return top && top.used / top.total >= 0.7 ? top : null;
  }, [usageRows]);

  const isActive = (billing?.status || "active") === "active";
  const renewalLabel = billing?.isLifetime ? "Lifetime" : formatDate(billing?.expiresAt) || "No expiry";
  const purchasedLabel = formatDate(billing?.startedAt) || "—";
  // Payment rows carry the Razorpay IDs; the populated lastPayment does not.
  const lastPayment = billing?.payments?.[0] || billing?.lastPayment || null;

  const scrollToPlans = () => plansRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  const goCheckout = () => navigate("/price");

  // Branded PDF receipt for one payment (defaults to the latest).
  const handleDownloadInvoice = async (payment = lastPayment) => {
    if (!payment) return;
    const key = payment._id || payment.razorpay_order_id || "latest";
    setDownloading(key);
    try {
      await downloadReceiptPdf({
        payment,
        customer: { name: userDetails?.name, email: userDetails?.email },
        validity: payment === lastPayment || payment.plan === billing?.tier ? renewalLabel : "As per plan",
      });
      toast.success("Receipt downloaded");
    } catch {
      toast.error("Could not generate receipt");
    } finally {
      setDownloading(null);
    }
  };

  const header = { seoTitle: "Subscription | Unideals", title: "Subscription" };

  if (loading) {
    return (
      <AccountLayout {...header}>
        <div className="space-y-4" aria-hidden="true">
          <div className="browse-shimmer h-40 rounded-2xl bg-neutral-100 dark:bg-white/5" />
          <div className="grid gap-3 md:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="browse-shimmer h-72 rounded-2xl bg-neutral-100 dark:bg-white/5" />
            ))}
          </div>
        </div>
      </AccountLayout>
    );
  }
  if (loadError || !billing) {
    return (
      <AccountLayout {...header}>
        <ErrorState message="We couldn't load your subscription." onRetry={fetchBilling} />
      </AccountLayout>
    );
  }

  return (
    <AccountLayout {...header} width="xl">
      <div className="flex flex-col gap-5 sm:gap-6">
        {/* ── Your plan ── */}
        <section className={cn(CARD, FLUSH_ON_PHONE, "overflow-hidden")}>
          <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div className="flex items-center gap-4">
              <PlanMark plan={currentId} size={52} className="shrink-0 drop-shadow-sm" />
              <div>
                <p className="text-[12.5px] font-medium text-slate-500 dark:text-zinc-400">Your plan</p>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-[22px] font-semibold tracking-tight text-slate-900 dark:text-white">{currentPlan.name}</h2>
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11.5px] font-semibold",
                      isActive ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300" : "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300",
                    )}
                  >
                    <span className={cn("h-1.5 w-1.5 rounded-full", isActive ? "bg-emerald-500" : "bg-red-500")} />
                    {isActive ? "Active" : "Expired"}
                  </span>
                </div>
                <p className="mt-0.5 text-[12.5px] text-slate-500 dark:text-zinc-400">
                  {billing.isStaff
                    ? "Included with your admin role"
                    : currentId === "free"
                      ? "Free forever"
                      : `Since ${purchasedLabel} · ${renewalLabel}`}
                </p>
              </div>
            </div>
            {nextPlan && (
              <button type="button" onClick={scrollToPlans} className={cn(btnPrimary, "h-10 px-5 text-[14px]")}>
                Upgrade to {nextPlan.name}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
          </div>

          {/* Usage meters */}
          <div className="grid grid-cols-1 border-t border-neutral-100 sm:grid-cols-3 dark:border-neutral-800">
            {usageRows.map((row, i) => {
              const capped = row.total !== null && row.total !== undefined && row.total > 0;
              const pct = capped ? Math.min(100, Math.round((row.used / row.total) * 100)) : 0;
              return (
                <div key={row.label} className={cn("px-4 py-3.5 sm:px-6", i > 0 && "border-t border-neutral-100 sm:border-l sm:border-t-0 dark:border-neutral-800")}>
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-[12.5px] text-slate-500 dark:text-zinc-400">{row.label}</span>
                    {capped && pct >= 80 && (
                      <span className={cn("text-[11px] font-semibold", pct >= 100 ? "text-red-600 dark:text-red-400" : "text-amber-600 dark:text-amber-400")}>
                        {pct >= 100 ? "Limit reached" : `${pct}% used`}
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-[17px] font-semibold tabular-nums text-slate-900 dark:text-white">
                    {row.used}
                    <span className="text-[13px] font-normal text-slate-400"> / {capped ? row.total : "Unlimited"}</span>
                  </p>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-neutral-100 dark:bg-white/5">
                    <div
                      className={cn(
                        "h-full rounded-full transition-[width] duration-700",
                        !capped ? "bg-slate-300 dark:bg-zinc-600" : pct >= 100 ? "bg-red-500" : pct >= 80 ? "bg-amber-500" : "bg-[var(--accent)]",
                      )}
                      style={{ width: capped ? `${Math.max(pct, 2)}%` : "100%" }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── Nudge when close to a limit ── */}
        {pressure && nextPlan && (
          <button
            type="button"
            onClick={scrollToPlans}
            className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-left transition-colors hover:border-amber-300 max-sm:-mx-4 max-sm:rounded-none max-sm:border-x-0 dark:border-amber-900/50 dark:bg-amber-950/20"
          >
            <span className="min-w-0 flex-1 text-[13.5px] text-amber-900 dark:text-amber-100">
              <strong className="font-semibold">
                {pressure.used} of {pressure.total} {pressure.label.toLowerCase()} used.
              </strong>{" "}
              {nextPlan.name} gives you {nextPlan.id === "pro" ? (pressure.label === "Wishlist" ? "100" : "25") : "unlimited"}.
            </span>
            <ArrowRight className="h-4 w-4 shrink-0 text-amber-700 dark:text-amber-300" aria-hidden="true" />
          </button>
        )}

        {/* ── What the next plan unlocks ── */}
        {nextPlan && (
          <section className={cn(CARD, FLUSH_ON_PHONE, "overflow-hidden")}>
            <div className="flex items-center justify-between gap-3 px-4 pt-4 sm:px-6">
              <p className="flex items-center gap-2.5 text-[14.5px] font-semibold text-slate-900 dark:text-white">
                <PlanMark plan={nextPlan.id} size={24} />
                What {nextPlan.name} unlocks
              </p>
              <span className="text-[13px] font-semibold tabular-nums text-slate-900 dark:text-white">
                {inr(priceOf(nextPlan).amount)} <span className="font-normal text-slate-500 dark:text-zinc-400">once</span>
              </span>
            </div>
            <dl className="mt-3 grid grid-cols-2 border-t border-neutral-100 sm:grid-cols-4 dark:border-neutral-800">
              {UNLOCKS[nextPlan.id].map((u, i) => (
                <div
                  key={u.label}
                  className={cn(
                    "px-4 py-3.5 sm:px-6",
                    i % 2 === 1 && "border-l border-neutral-100 dark:border-neutral-800",
                    i >= 2 && "border-t border-neutral-100 sm:border-l sm:border-t-0 dark:border-neutral-800",
                  )}
                >
                  <dt className="sr-only">{u.label}</dt>
                  <dd className="text-[18px] font-semibold leading-tight tracking-tight text-slate-900 dark:text-white">{u.value}</dd>
                  <dd className="text-[12.5px] text-slate-500 dark:text-zinc-400">{u.label}</dd>
                </div>
              ))}
            </dl>
          </section>
        )}

        {/* ── Plans ── */}
        <section ref={plansRef} className="scroll-mt-20">
          <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-[18px] font-semibold tracking-tight text-slate-900 dark:text-white">Plans</h2>
              <p className="text-[13px] text-slate-500 dark:text-zinc-400">Pay once. No auto-renewal.</p>
            </div>
            {hasGirlsOffer && (
              <span className="self-start rounded-full bg-pink-50 px-2.5 py-1 text-[12px] font-semibold text-pink-700 sm:self-auto dark:bg-pink-950/30 dark:text-pink-200">
                🌸 Girls Founder price applied
              </span>
            )}
          </div>

          <div className="grid gap-3 md:grid-cols-3 md:gap-4">
            {PLANS.map((plan) => {
              const rank = PLAN_RANK[plan.id];
              const isCurrent = plan.id === currentId;
              const isIncluded = rank < currentRank;
              const recommended = nextPlan?.id === plan.id;
              const price = priceOf(plan);
              const discounted = price.baseAmount > price.amount;
              const savePct = discounted ? Math.round(((price.baseAmount - price.amount) / price.baseAmount) * 100) : 0;
              return (
                <div
                  key={plan.id}
                  className={cn(
                    "relative flex flex-col rounded-2xl border bg-white p-5 transition-shadow dark:bg-[#1A1D20]",
                    recommended
                      ? "border-[var(--accent)] shadow-[0_14px_40px_-18px_rgba(56,56,236,0.45)] ring-1 ring-[var(--accent)]"
                      : "border-neutral-200/80 hover:shadow-[0_6px_20px_-12px_rgba(15,23,42,0.18)] dark:border-neutral-800",
                  )}
                >
                  {(recommended || (plan.badge && !isIncluded && !isCurrent)) && (
                    <span
                      className={cn(
                        "absolute -top-2.5 right-5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
                        recommended ? "bg-[var(--accent)] text-white" : "bg-slate-900 text-white dark:bg-white dark:text-slate-900",
                      )}
                    >
                      {recommended ? "Recommended for you" : plan.badge}
                    </span>
                  )}
                  <div className="flex items-center gap-3">
                    <PlanMark plan={plan.id} size={36} />
                    <div>
                      <p className="text-[16px] font-semibold leading-tight text-slate-900 dark:text-white">{plan.name}</p>
                      {isCurrent && <p className="text-[11.5px] font-semibold text-[var(--accent-text)]">Your plan</p>}
                    </div>
                  </div>
                  <p className="mt-2.5 min-h-[38px] text-[13px] text-slate-500 dark:text-zinc-400">{plan.tagline}</p>

                  <div className="mt-3 flex flex-wrap items-baseline gap-2">
                    <span className="text-[34px] font-bold leading-none tracking-tight text-slate-900 dark:text-white">{inr(price.amount)}</span>
                    {discounted && <span className="text-[15px] text-slate-400 line-through">{inr(price.baseAmount)}</span>}
                    {savePct > 0 && <span className="text-[12px] font-semibold text-emerald-600 dark:text-emerald-400">Save {savePct}%</span>}
                  </div>
                  <p className="mt-1 text-[12px] text-slate-500 dark:text-zinc-400">{plan.id === "free" ? "Forever" : "One-time payment · no renewal"}</p>

                  <ul className="mt-4 flex-1 space-y-2.5 border-t border-neutral-100 pt-4 dark:border-neutral-800">
                    {plan.highlights.map((h) => (
                      <li key={h} className="flex items-start gap-2.5 text-[13px] text-slate-700 dark:text-zinc-200">
                        <Check className={cn("mt-0.5 h-4 w-4 shrink-0", recommended ? "text-[var(--accent-text)]" : "text-slate-400 dark:text-zinc-500")} strokeWidth={2.5} aria-hidden="true" />
                        {h}
                      </li>
                    ))}
                  </ul>

                  <div className="mt-5">
                    {isCurrent ? (
                      <span className="flex h-10 w-full items-center justify-center gap-1.5 rounded-lg bg-neutral-100 text-[13.5px] font-semibold text-slate-600 dark:bg-white/5 dark:text-zinc-300">
                        <Check className="h-4 w-4" aria-hidden="true" /> Current plan
                      </span>
                    ) : isIncluded ? (
                      <span className="flex h-10 w-full items-center justify-center text-[13px] text-slate-400 dark:text-zinc-500">Included in your plan</span>
                    ) : (
                      <button
                        type="button"
                        onClick={goCheckout}
                        className={cn(
                          "flex h-10 w-full items-center justify-center gap-1.5 rounded-lg text-[14px] font-semibold transition-colors",
                          recommended
                            ? "bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]"
                            : "border border-neutral-200 text-slate-800 hover:bg-neutral-50 dark:border-neutral-700 dark:text-zinc-100 dark:hover:bg-white/5",
                        )}
                      >
                        Get {plan.name}
                        <ArrowRight className="h-4 w-4" aria-hidden="true" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Compare all features */}
          <div className={cn(CARD, FLUSH_ON_PHONE, "mt-4 overflow-hidden")}>
            <button
              type="button"
              onClick={() => setCompareOpen((v) => !v)}
              aria-expanded={compareOpen}
              className="flex w-full items-center justify-between px-4 py-3.5 text-left sm:px-5"
            >
              <span className="text-[14px] font-semibold text-slate-900 dark:text-white">Compare all features</span>
              <ChevronDown className={cn("h-4 w-4 text-slate-400 transition-transform", compareOpen && "rotate-180")} aria-hidden="true" />
            </button>
            {compareOpen && (
              <div className="overflow-x-auto border-t border-neutral-100 dark:border-neutral-800">
                <table className="w-full min-w-[520px] text-[13px]">
                  <thead>
                    <tr className="text-left">
                      <th className="px-4 py-3 font-medium text-slate-500 sm:px-5 dark:text-zinc-400">Feature</th>
                      {PLANS.map((p) => (
                        <th key={p.id} className={cn("px-3 py-3 text-center", p.id === currentId && "bg-[var(--accent-soft)]")}>
                          <span className="inline-flex items-center gap-1.5 font-semibold text-slate-900 dark:text-white">
                            <PlanMark plan={p.id} size={18} />
                            {p.name}
                          </span>
                          {p.id === currentId && <span className="block text-[10.5px] font-medium text-[var(--accent-text)]">Current</span>}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                    {COMPARE.map((row) => (
                      <tr key={row.label}>
                        <td className="px-4 py-3 text-slate-700 sm:px-5 dark:text-zinc-200">{row.label}</td>
                        {row.values.map((v, i) => (
                          <td key={i} className={cn("px-3 py-3 text-center", PLANS[i].id === currentId && "bg-[var(--accent-soft)]")}>
                            {v === false ? (
                              <Minus className="mx-auto h-4 w-4 text-slate-300 dark:text-zinc-600" aria-label="Not included" />
                            ) : (
                              <span className="font-medium text-slate-800 dark:text-zinc-100">{v}</span>
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        <EarlyAccessCard />

        {/* ── FAQ (accordion) ── */}
        <Panel title="Good to know" padded={false}>
          <dl className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {FAQ.map(([q, a], i) => {
              const open = openFaq === i;
              return (
                <div key={q}>
                  <dt>
                    <button
                      type="button"
                      onClick={() => setOpenFaq(open ? -1 : i)}
                      aria-expanded={open}
                      className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left text-[13.5px] font-semibold text-slate-900 sm:px-5 dark:text-white"
                    >
                      {q}
                      <ChevronDown className={cn("h-4 w-4 shrink-0 text-slate-400 transition-transform", open && "rotate-180")} aria-hidden="true" />
                    </button>
                  </dt>
                  {open && <dd className="-mt-1.5 px-4 pb-3.5 text-[13px] text-slate-500 sm:px-5 dark:text-zinc-400">{a}</dd>}
                </div>
              );
            })}
          </dl>
        </Panel>

        {/* ── Billing ── */}
        <Panel
          title="Billing"
          actions={
            lastPayment ? (
              <button type="button" onClick={() => handleDownloadInvoice()} disabled={!!downloading} className={btnSecondary}>
                <FileText className="h-4 w-4" aria-hidden="true" />
                {downloading ? "Preparing…" : "Latest receipt"}
              </button>
            ) : null
          }
          padded={false}
        >
          {billing.payments?.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="text-left text-[12px] text-slate-500 dark:text-zinc-400">
                    <th className="px-4 py-2.5 font-medium sm:px-5">Payment</th>
                    <th className="px-4 py-2.5 font-medium">Date</th>
                    <th className="px-4 py-2.5 text-right font-medium">Amount</th>
                    <th className="w-12 px-2 py-2.5 text-right font-medium sm:pr-4">PDF</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                  {billing.payments.slice(0, 5).map((p) => (
                    <tr key={p._id || p.razorpay_order_id}>
                      <td className="px-4 py-2.5 sm:px-5">
                        <span className="inline-flex items-center gap-2">
                          <PlanMark plan={TIER_TO_ID[p.plan] || "pro"} size={20} />
                          <span className="font-medium text-slate-900 dark:text-white">{PLAN_NAME[p.plan] || String(p.plan || "").replace(/_/g, " ")}</span>
                          <span
                            className={cn(
                              "rounded px-1.5 py-px text-[11px] font-semibold capitalize",
                              p.status === "paid" || p.status === "captured"
                                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                                : "bg-neutral-100 text-slate-600 dark:bg-white/5 dark:text-zinc-300",
                            )}
                          >
                            {p.status}
                          </span>
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-slate-500 dark:text-zinc-400">{formatDate(p.createdAt) || "—"}</td>
                      <td className="px-4 py-2.5 text-right font-semibold tabular-nums text-slate-900 dark:text-white">₹{((p.amount || 0) / 100).toLocaleString("en-IN")}</td>
                      <td className="px-2 py-2.5 text-right sm:pr-4">
                        <button
                          type="button"
                          onClick={() => handleDownloadInvoice(p)}
                          disabled={!!downloading}
                          aria-label="Download PDF receipt"
                          title="Download PDF receipt"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-neutral-100 hover:text-slate-800 disabled:opacity-50 dark:hover:bg-white/5 dark:hover:text-white"
                        >
                          <Download className={cn("h-4 w-4", downloading === (p._id || p.razorpay_order_id) && "animate-pulse")} aria-hidden="true" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="px-5 py-6 text-center text-[13px] text-slate-500 dark:text-zinc-400">No payments yet.</p>
          )}
          {currentId !== "free" && !billing.isStaff && (
            <p className="flex items-center gap-1.5 border-t border-neutral-100 px-4 py-3 text-[12.5px] text-slate-500 sm:px-5 dark:border-neutral-800 dark:text-zinc-400">
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
              Need to downgrade?{" "}
              <a href="mailto:hi@unideals.in?subject=Downgrade%20request" className="font-semibold text-[var(--accent-text)] hover:underline">
                Contact support
              </a>
            </p>
          )}
        </Panel>
      </div>
    </AccountLayout>
  );
}

export default Subscription;
