import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import {
  CalendarDays,
  Check,
  CircleDollarSign,
  Clock3,
  Crown,
  FileText,
  Gift,
  Package,
  Heart,
  Rocket,
  WalletCards,
  X,
  Zap,
} from "lucide-react";

import Profile_left_part from "../components/Profile_left_part.jsx";
import { getBilling } from "../../payment/api/paymentApi.js";

const TIER_TO_ID = {
  base_user: "free",
  pro: "pro",
  pro_plus: "pro-plus",
};

// Static marketing copy per plan; all numbers that matter (usage, limits,
// dates, billing) come from GET /api/payments/me.
const plans = [
  {
    id: "free",
    name: "Free",
    price: 0,
    icon: Gift,
    included: [
      "10 Active Listings",
      "25 Wishlist Saves",
      "Basic listing visibility",
      "Standard support",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: 99,
    icon: Crown,
    included: [
      "25 Active Listings",
      "100 Wishlist Saves",
      "2 Monthly Boost Credits (3 days)",
      "Priority Search Placement",
      "Priority Support",
    ],
  },
  {
    id: "pro-plus",
    name: "Pro Plus",
    price: 199,
    icon: Rocket,
    badge: "Best Value",
    included: [
      "Unlimited Active Listings",
      "Unlimited Wishlist",
      "5 Monthly Boost Credits (7 days)",
      "Highest Search Placement",
      "Highest Priority Support",
    ],
  },
];

const formatDate = (value) => {
  if (!value) return null;
  try {
    return new Date(value).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return null;
  }
};

const formatCount = (used, total) =>
  total === null || total === undefined ? `${used} / Unlimited` : `${used} / ${total}`;

const progressFor = (used, total) => {
  if (total === null || total === undefined || total <= 0) return used > 0 ? 100 : 0;
  return Math.min(100, Math.round((used / total) * 100));
};

function Subscription() {
  const navigate = useNavigate();
  const [billing, setBilling] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [isUpgradeOpen, setIsUpgradeOpen] = useState(false);

  const fetchBilling = async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const res = await getBilling();
      if (res.data?.success) {
        setBilling(res.data.data);
      } else {
        setLoadError(true);
      }
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBilling();
  }, []);

  const selectedPlanId = TIER_TO_ID[billing?.tier] || "free";

  const selectedPlan = useMemo(
    () => plans.find((plan) => plan.id === selectedPlanId) ?? plans[0],
    [selectedPlanId],
  );

  const otherPlans = useMemo(
    () => plans.filter((plan) => plan.id !== selectedPlan.id),
    [selectedPlan.id],
  );

  const usageRows = useMemo(() => {
    if (!billing) return [];
    const rows = [
      {
        label: "Active Listings",
        icon: Package,
        used: billing.usage?.activeListings || 0,
        total: billing.limits?.activeListings ?? null,
      },
      {
        label: "Wishlist",
        icon: Heart,
        used: billing.usage?.wishlist || 0,
        total: billing.limits?.wishlist ?? null,
      },
    ];
    if (billing.usage?.boost) {
      const monthlyTotal =
        (billing.usage.boost.monthlyUsed || 0) +
        (billing.usage.boost.monthlyRemaining || 0);
      rows.push({
        label: "Monthly Boosts",
        icon: Zap,
        used: billing.usage.boost.monthlyUsed || 0,
        total: monthlyTotal,
      });
    }
    return rows;
  }, [billing]);

  const isActive = (billing?.status || "active") === "active";
  const renewalLabel = billing?.isLifetime
    ? "Never expires (lifetime)"
    : formatDate(billing?.expiresAt) || "No renewal scheduled";
  const purchasedLabel = formatDate(billing?.startedAt) || "—";
  const orderRef =
    billing?.lastPayment?.razorpay_order_id ||
    billing?.payments?.[0]?.razorpay_order_id ||
    null;

  const goToPricing = () => {
    setIsUpgradeOpen(false);
    navigate("/price");
  };

  if (loading) {
    return (
      <div className="h-full w-full overflow-hidden bg-[#F6F8FC] font-figtree dark:bg-[#131313]">
        <div className="flex h-[calc(100vh-70px)]">
          <div className="hidden md:block md:w-auto md:shrink-0 bg-[#FFFFFF] dark:bg-[#131313] xl:pt-2 xl:pb-0">
            <Profile_left_part />
          </div>
          <main className="flex h-full flex-1 items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4A3CFF]"></div>
          </main>
        </div>
      </div>
    );
  }

  if (loadError || !billing) {
    return (
      <div className="h-full w-full overflow-hidden bg-[#F6F8FC] font-figtree dark:bg-[#131313]">
        <div className="flex h-[calc(100vh-70px)]">
          <div className="hidden md:block md:w-auto md:shrink-0 bg-[#FFFFFF] dark:bg-[#131313] xl:pt-2 xl:pb-0">
            <Profile_left_part />
          </div>
          <main className="flex h-full flex-1 flex-col items-center justify-center gap-4 px-5">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
              Unable to load your subscription. Please try again.
            </p>
            <button
              onClick={fetchBilling}
              className="inline-flex h-10 items-center justify-center rounded-lg bg-[#4A3CFF] px-5 text-[12px] font-extrabold text-white"
            >
              Retry
            </button>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full overflow-hidden bg-[#F6F8FC] font-figtree dark:bg-[#131313]">
      <div className="flex h-[calc(100vh-70px)]">
         <div className="hidden md:block md:w-auto md:shrink-0 bg-[#FFFFFF] dark:bg-[#131313] xl:pt-2 xl:pb-0">
            <Profile_left_part />
          </div>

        <main className="h-full overflow-y-auto bg-[#F6F8FC] px-5 py-6 dark:bg-[#131313] md:flex-1 xl:px-[5.7rem]">
          <div className="mx-auto w-full max-w-4xl space-y-5 pb-10">
            <header>
              <h1 className="mb-1 text-[1.4rem] font-bold text-gray-900 dark:text-white lg:text-2xl xl:text-xl">
                Subscription
              </h1>
              <p className="mt-1 text-[11px] font-medium text-[#09111F] dark:text-white">
                Manage your plan and usage
              </p>
            </header>

            <section className="rounded-2xl border border-[#E3E8F1] bg-white p-5 shadow-[0_8px_26px_rgba(15,23,42,0.04)] dark:border-gray-800 dark:bg-[#1c1c1c]">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F0EEFF] text-[#4A3CFF]">
                    <selectedPlan.icon size={20} strokeWidth={1.8} />
                  </div>

                  <div>
                    <p className="text-[11px] font-semibold text-[#09111F] dark:text-white">
                      Current Plan
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <h2 className="text-[18px] font-extrabold leading-none text-[#09111F] dark:text-white">
                        {selectedPlan.name}
                      </h2>
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${
                          isActive
                            ? "bg-[#CFF5DD] text-[#059447]"
                            : "bg-red-50 text-[#FF3B3B]"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            isActive ? "bg-[#059447]" : "bg-[#FF3B3B]"
                          }`}
                        />
                        {isActive ? "Active" : "Expired"}
                      </span>
                      {billing.isLifetime && selectedPlan.id !== "free" && (
                        <span className="inline-flex items-center rounded-full bg-[#F0EEFF] px-2.5 py-1 text-[11px] font-bold text-[#4A3CFF]">
                          Lifetime
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <p className="pt-1 text-[18px] font-black text-[#09111F] dark:text-white">
                  {"\u20B9"}
                  {selectedPlan.price}
                  <span className="text-[12px] font-medium text-[#09111F] dark:text-white">
                    {selectedPlan.id === "free" ? "" : " one-time"}
                  </span>
                </p>
              </div>

              <div className="mt-5 grid gap-x-5 gap-y-3 text-[12px] sm:grid-cols-[1fr_auto]">
                <div className="flex items-center gap-2 text-[#09111F] dark:text-white">
                  <CalendarDays size={14} />
                  Purchased
                </div>
                <p className="font-bold text-[#09111F] dark:text-white">
                  {purchasedLabel}
                </p>

                <div className="flex items-center gap-2 text-[#09111F] dark:text-white">
                  <Clock3 size={14} />
                  {billing.isLifetime ? "Validity" : "Next renewal"}
                </div>
                <p className="font-bold text-[#09111F] dark:text-white">
                  {renewalLabel}
                </p>

                <div className="flex items-center gap-2 text-[#09111F] dark:text-white">
                  <Zap size={14} />
                  Boosts used this month
                </div>
                <p className="font-extrabold text-[#4A3CFF]">
                  {billing.usage?.boost
                    ? `${billing.usage.boost.monthlyUsed} used · ${billing.usage.boost.monthlyRemaining} left`
                    : "—"}
                </p>
              </div>

              <div className="mt-5 flex flex-col gap-3 border-t border-[#E9EDF5] pt-4 sm:flex-row sm:items-center sm:justify-between">
                <button
                  onClick={() => setIsUpgradeOpen(true)}
                  className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-[#4A3CFF] px-5 text-[12px] font-extrabold text-white shadow-sm shadow-indigo-500/20 transition hover:bg-[#382DE8]"
                >
                  <CircleDollarSign size={14} />
                  {selectedPlan.id === "pro-plus" ? "View plans" : "Upgrade"}
                </button>
                {billing.isLifetime && selectedPlan.id !== "free" ? (
                  <span className="inline-flex h-9 items-center justify-center gap-2 rounded-lg px-2 text-[12px] font-semibold text-[#059447]">
                    <Check size={13} />
                    Lifetime access — no renewals
                  </span>
                ) : null}
              </div>
            </section>

            <section className="rounded-2xl border border-[#E3E8F1] bg-white p-5 shadow-[0_8px_26px_rgba(15,23,42,0.04)] dark:border-gray-800 dark:bg-[#1c1c1c]">
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-[14px] font-extrabold text-[#09111F] dark:text-white">
                  Current Usage
                </h2>
                {!billing.isLifetime && billing.expiresAt && (
                  <span className="rounded-full bg-[#F2F4F9] px-3 py-1 text-[10px] font-bold text-[#09111F] dark:text-[#4A3CFF]">
                    Renews {formatDate(billing.expiresAt)}
                  </span>
                )}
              </div>

              <div className="space-y-4">
                {usageRows.map((item) => (
                  <div key={item.label}>
                    <div className="mb-1.5 flex items-center justify-between text-[12px]">
                      <div className="flex items-center gap-2 text-[#09111F] dark:text-white">
                        <item.icon
                          size={13}
                          className="text-[#09111F] dark:text-white"
                        />
                        {item.label}
                      </div>
                      <p className="text-[11px] font-semibold text-[#09111F] dark:text-white">
                        {formatCount(item.used, item.total)}
                      </p>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-[#EEF1F7]">
                      <div
                        className="h-full rounded-full bg-[#4A3CFF]"
                        style={{ width: `${progressFor(item.used, item.total)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={() => navigate("/productlisted")}
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#F0EEFF] px-3 py-2 text-[11px] font-bold text-[#4A3CFF] transition hover:bg-[#E4E4FF]"
              >
                <Zap size={13} />
                Need more visibility? Buy a 3-day (₹29) or 7-day (₹49) boost from My Listings
              </button>
            </section>

            <section className="rounded-2xl border border-[#E3E8F1] bg-white p-5 shadow-[0_8px_26px_rgba(15,23,42,0.04)] dark:border-gray-800 dark:bg-[#1c1c1c]">
              <h2 className="mb-4 text-[14px] font-extrabold text-[#09111F] dark:text-white">
                What&apos;s included in {selectedPlan.name}
              </h2>
              <div className="grid gap-x-12 gap-y-3 sm:grid-cols-2">
                {selectedPlan.included.map((feature) => (
                  <div
                    key={feature}
                    className="flex items-center gap-2 text-[12px] font-medium text-[#09111F] dark:text-white"
                  >
                    <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-[#4A3CFF] text-[#4A3CFF]">
                      <Check size={10} strokeWidth={3} />
                    </span>
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-[#E3E8F1] bg-white p-5 shadow-[0_8px_26px_rgba(15,23,42,0.04)] dark:border-gray-800 dark:bg-[#1c1c1c]">
              <h2 className="mb-4 text-[14px] font-extrabold text-[#09111F] dark:text-white">
                Other Plans
              </h2>
              <div className="space-y-3">
                {otherPlans.map((plan) => (
                  <button
                    key={plan.name}
                    onClick={goToPricing}
                    className="flex w-full flex-col gap-3 rounded-xl border border-[#E6EAF2] bg-white px-4 py-3 text-left transition hover:border-[#4A3CFF] hover:bg-[#FAFAFF] dark:border-gray-800 dark:bg-[#1c1c1c] sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#F2F4F9] text-[#09111F]">
                        <plan.icon size={16} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-[12px] font-extrabold text-[#09111F] dark:text-white">
                            {plan.name}
                          </p>
                          {plan.badge && (
                            <span className="rounded-full bg-[#F0EEFF] px-2 py-0.5 text-[9px] font-extrabold text-[#4A3CFF]">
                              {plan.badge}
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 text-[10px] font-medium text-[#09111F] dark:text-white">
                          {"\u20B9"}
                          {plan.price}
                          {plan.id === "free" ? "" : " one-time"}
                        </p>
                      </div>
                    </div>
                    <span className="inline-flex h-8 w-full items-center justify-center rounded-lg bg-[#F0EEFF] px-3 text-[11px] font-bold text-[#4A3CFF] sm:w-auto sm:bg-transparent sm:px-0">
                      View {">"}
                    </span>
                  </button>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-[#E3E8F1] bg-white p-5 shadow-[0_8px_26px_rgba(15,23,42,0.04)] dark:border-gray-800 dark:bg-[#1c1c1c]">
              <h2 className="mb-5 text-[14px] font-extrabold text-[#09111F] dark:text-white">
                Billing Details
              </h2>
              <div className="grid gap-4 text-[11px] sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <p className="font-semibold text-[#09111F] dark:text-white">
                    Order ID
                  </p>
                  <p className="mt-1 font-extrabold text-[#09111F] dark:text-white break-all">
                    {orderRef || "No payments yet"}
                  </p>
                </div>
                <div>
                  <p className="font-semibold text-[#09111F] dark:text-white">
                    Purchased
                  </p>
                  <p className="mt-1 font-extrabold text-[#09111F] dark:text-white">
                    {purchasedLabel}
                  </p>
                </div>
                <div>
                  <p className="font-semibold text-[#09111F] dark:text-white">
                    Validity
                  </p>
                  <p className="mt-1 font-extrabold text-[#09111F] dark:text-white">
                    {renewalLabel}
                  </p>
                </div>
                <div>
                  <p className="font-semibold text-[#09111F] dark:text-white">
                    Payment Method
                  </p>
                  <p className="mt-1 inline-flex items-center gap-2 font-extrabold text-[#09111F] dark:text-white">
                    <span className="flex h-5 w-7 items-center justify-center rounded bg-[#4A3CFF] text-white">
                      <WalletCards size={13} />
                    </span>
                    Razorpay secure checkout
                  </p>
                </div>
              </div>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <button
                  onClick={() =>
                    toast("Receipts are emailed by Razorpay after each payment", {
                      id: "subscription-receipt",
                    })
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-lg px-2 py-2 text-[11px] font-extrabold text-[#4A3CFF] transition hover:bg-[#F0EEFF]"
                >
                  <FileText size={13} />
                  Download Invoice
                </button>
              </div>

              {billing.payments && billing.payments.length > 0 && (
                <div className="mt-4 border-t border-[#E9EDF5] pt-4">
                  <p className="mb-3 text-[11px] font-bold text-[#09111F] dark:text-white">
                    Recent payments
                  </p>
                  <div className="space-y-2">
                    {billing.payments.slice(0, 5).map((p) => (
                      <div
                        key={p._id || p.razorpay_order_id}
                        className="flex items-center justify-between text-[11px] text-[#09111F] dark:text-white"
                      >
                        <span className="font-semibold capitalize">
                          {p.plan === "pro_plus" ? "Pro Plus" : p.plan} ·{" "}
                          {formatDate(p.createdAt) || ""}
                        </span>
                        <span className="font-extrabold">
                          {"\u20B9"}
                          {(p.amount || 0) / 100} · {p.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>
          </div>
        </main>

        {isUpgradeOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6">
            <div className="w-full max-w-[520px] rounded-2xl border border-[#E3E8F1] bg-white p-5 shadow-2xl dark:border-gray-800 dark:bg-[#1c1c1c]">
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-extrabold text-[#09111F] dark:text-white">
                    Choose a plan
                  </h2>
                  <p className="mt-1 text-xs font-medium text-[#09111F] dark:text-white">
                    Compare plans and check out securely with Razorpay.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsUpgradeOpen(false)}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[#09111F] transition hover:bg-[#F2F4F9] dark:text-white"
                  aria-label="Close plan selector"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-3">
                {plans.map((plan) => {
                  const isSelected = plan.id === selectedPlanId;

                  return (
                    <button
                      key={plan.id}
                      type="button"
                      onClick={goToPricing}
                      className={`w-full rounded-xl border p-4 text-left transition ${
                        isSelected
                          ? "border-[#4A3CFF] bg-[#F7F6FF]"
                          : "border-[#E6EAF2] bg-white hover:border-[#4A3CFF] hover:bg-[#FAFAFF] dark:border-gray-800 dark:bg-[#1c1c1c]"
                      }`}
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex min-w-0 items-start gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F0EEFF] text-[#4A3CFF]">
                            <plan.icon size={18} />
                          </div>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-sm font-extrabold text-[#09111F] dark:text-white">
                                {plan.name}
                              </p>
                              {plan.badge && (
                                <span className="rounded-full bg-[#4A3CFF] px-2 py-0.5 text-[9px] font-extrabold text-white">
                                  {plan.badge}
                                </span>
                              )}
                              {isSelected && (
                                <span className="rounded-full bg-[#CFF5DD] px-2 py-0.5 text-[9px] font-extrabold text-[#059447]">
                                  Selected
                                </span>
                              )}
                            </div>
                            <p className="mt-1 text-xs font-medium text-[#09111F] dark:text-white">
                              {plan.included.slice(0, 2).join(" | ")}
                            </p>
                          </div>
                        </div>
                        <p className="shrink-0 text-base font-black text-[#09111F] dark:text-white">
                          {"\u20B9"}
                          {plan.price}
                          <span className="text-xs font-medium text-[#09111F] dark:text-white">
                            {plan.id === "free" ? "" : " one-time"}
                          </span>
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Subscription;
