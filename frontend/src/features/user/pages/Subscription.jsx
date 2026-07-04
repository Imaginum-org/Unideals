import { useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import {
  BarChart3,
  Bot,
  CalendarDays,
  Check,
  CircleDollarSign,
  Clock3,
  Crown,
  FileText,
  Gift,
  Package,
  PenLine,
  Rocket,
  WalletCards,
  X,
  XCircle,
  Zap,
} from "lucide-react";

import Profile_left_part from "../components/Profile_left_part.jsx";

const plans = [
  {
    id: "free",
    name: "Free",
    price: 0,
    icon: Gift,
    action: "Downgrade",
    usage: [
      { label: "Listings", icon: Package, used: 2, total: 5, progress: 40 },
      { label: "Boosts", icon: Zap, used: 0, total: 0, progress: 0 },
      { label: "AI Score", icon: BarChart3, used: 1, total: 3, progress: 34 },
      { label: "AI Writing", icon: Bot, used: 0, total: 0, progress: 0 },
    ],
    included: [
      "5 Listings / Month",
      "2 Images per Product",
      "Basic listing visibility",
      "Limited AI Score",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: 99,
    icon: Crown,
    action: "Current",
    usage: [
      { label: "Listings", icon: Package, used: 12, total: 25, progress: 68 },
      { label: "Boosts", icon: Zap, used: 4, total: 10, progress: 60 },
      { label: "AI Score", icon: BarChart3, used: 7, total: 25, progress: 42 },
      { label: "AI Writing", icon: Bot, used: 3, total: 5, progress: 82 },
    ],
    included: [
      "25 Listings / Month",
      "5 Images per Product",
      "Advanced Analytics",
      "Full AI Score",
      "10 Trending Boosts - 2 hrs",
    ],
  },
  {
    id: "pro-plus",
    name: "Pro Plus",
    price: 199,
    icon: Rocket,
    badge: "Best Value",
    action: "Switch",
    usage: [
      { label: "Listings", icon: Package, used: 12, total: 60, progress: 30 },
      { label: "Boosts", icon: Zap, used: 4, total: 25, progress: 22 },
      { label: "AI Score", icon: BarChart3, used: 7, total: 60, progress: 18 },
      { label: "AI Writing", icon: Bot, used: 3, total: 20, progress: 24 },
    ],
    included: [
      "60 Listings / Month",
      "10 Images per Product",
      "Priority Analytics",
      "Full AI Score",
      "25 Trending Boosts - 2 hrs",
      "AI Writing Assistant",
    ],
  },
];

const subscription = {
  status: "Active",
  purchased: "May 15, 2025",
  nextRenewal: "Jun 15, 2025",
  daysRemaining: 14,
  billing: {
    paymentMethod: "Visa .... 4242",
  },
};

function Subscription() {
  const [selectedPlanId, setSelectedPlanId] = useState("pro");
  const [isUpgradeOpen, setIsUpgradeOpen] = useState(false);
  const [isCancelOpen, setIsCancelOpen] = useState(false);
  const [planStatus, setPlanStatus] = useState(subscription.status);

  const selectedPlan = useMemo(
    () => plans.find((plan) => plan.id === selectedPlanId) ?? plans[1],
    [selectedPlanId],
  );

  const otherPlans = useMemo(
    () => plans.filter((plan) => plan.id !== selectedPlan.id),
    [selectedPlan.id],
  );

  const selectPlan = (plan) => {
    if (plan.id === selectedPlan.id && planStatus === "Active") return;

    setSelectedPlanId(plan.id);
    setPlanStatus("Active");
    setIsUpgradeOpen(false);
    toast.success(`${plan.name} plan selected`, {
      id: "subscription-plan-selected",
    });
  };

  const cancelPlan = () => {
    setPlanStatus("Cancelled");
    setIsCancelOpen(false);
    toast.success("Your plan has been cancelled", {
      id: "subscription-cancelled",
    });
  };

  const handleGatewayAction = (action) => {
    toast(`${action} payment flow can be attached here`, {
      id: `subscription-${action}`,
    });
  };

  return (
    <div className="h-screen w-full overflow-hidden bg-[#F6F8FC] font-figtree dark:bg-[#131313]">
      <div className="flex h-[calc(100vh-70px)]">
        <aside className="hidden bg-white dark:bg-[#131313] md:block md:w-[22.5%] lg:w-[21%] xl:w-[20.5%] 2xl:w-[20.5%]">
          <Profile_left_part />
        </aside>

        <main className="h-full overflow-y-auto bg-[#F6F8FC] px-5 py-6 dark:bg-[#131313] md:w-[77.5%] lg:w-[79%] xl:w-[79.5%] xl:px-[5.7rem] 2xl:w-[79.5%]">
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
                          planStatus === "Active"
                            ? "bg-[#CFF5DD] text-[#059447]"
                            : "bg-red-50 text-[#FF3B3B]"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            planStatus === "Active"
                              ? "bg-[#059447]"
                              : "bg-[#FF3B3B]"
                          }`}
                        />
                        {planStatus}
                      </span>
                    </div>
                  </div>
                </div>

                <p className="pt-1 text-[18px] font-black text-[#09111F] dark:text-white">
                  {"\u20B9"}
                  {selectedPlan.price}
                  <span className="text-[12px] font-medium text-[#09111F] dark:text-white">
                    /month
                  </span>
                </p>
              </div>

              <div className="mt-5 grid gap-x-5 gap-y-3 text-[12px] sm:grid-cols-[1fr_auto]">
                <div className="flex items-center gap-2 text-[#09111F] dark:text-white">
                  <CalendarDays size={14} />
                  Purchased
                </div>
                <p className="font-bold text-[#09111F] dark:text-white">
                  {subscription.purchased}
                </p>

                <div className="flex items-center gap-2 text-[#09111F] dark:text-white">
                  <Clock3 size={14} />
                  Next renewal
                </div>
                <p className="font-bold text-[#09111F] dark:text-white">
                  {planStatus === "Active"
                    ? subscription.nextRenewal
                    : "No renewal scheduled"}
                </p>

                <div className="flex items-center gap-2 text-[#09111F] dark:text-white">
                  <Zap size={14} />
                  Days remaining
                </div>
                <p className="font-extrabold text-[#4A3CFF]">
                  {planStatus === "Active"
                    ? `${subscription.daysRemaining} days`
                    : "Cancelled"}
                </p>
              </div>

              <div className="mt-5 flex flex-col gap-3 border-t border-[#E9EDF5] pt-4 sm:flex-row sm:items-center sm:justify-between">
                <button
                  onClick={() => setIsUpgradeOpen(true)}
                  className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-[#4A3CFF] px-5 text-[12px] font-extrabold text-white shadow-sm shadow-indigo-500/20 transition hover:bg-[#382DE8]"
                >
                  <CircleDollarSign size={14} />
                  Upgrade
                </button>
                <button
                  onClick={() => setIsCancelOpen(true)}
                  disabled={planStatus !== "Active"}
                  className="inline-flex h-9 items-center justify-center gap-2 rounded-lg px-2 text-[12px] font-semibold text-[#FF3B3B] transition hover:bg-red-50 disabled:cursor-not-allowed disabled:text-[#09111F] disabled:hover:bg-transparent dark:disabled:text-white"
                >
                  <XCircle size={13} />
                  {planStatus === "Active" ? "Cancel plan" : "Plan cancelled"}
                </button>
              </div>
            </section>

            <section className="rounded-2xl border border-[#E3E8F1] bg-white p-5 shadow-[0_8px_26px_rgba(15,23,42,0.04)] dark:border-gray-800 dark:bg-[#1c1c1c]">
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-[14px] font-extrabold text-[#09111F] dark:text-white">
                  This Month&apos;s Usage
                </h2>
                <span className="rounded-full bg-[#F2F4F9] px-3 py-1 text-[10px] font-bold text-[#09111F] dark:text-white">
                  Resets Jun 15
                </span>
              </div>

              <div className="space-y-4">
                {selectedPlan.usage.map((item) => (
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
                        {item.used} / {item.total}
                      </p>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-[#EEF1F7]">
                      <div
                        className="h-full rounded-full bg-[#4A3CFF]"
                        style={{ width: `${item.progress}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
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
                    onClick={() => selectPlan(plan)}
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
                          {plan.price}/month
                        </p>
                      </div>
                    </div>
                    <span className="inline-flex h-8 w-full items-center justify-center rounded-lg bg-[#F0EEFF] px-3 text-[11px] font-bold text-[#4A3CFF] sm:w-auto sm:bg-transparent sm:px-0">
                      {plan.action}
                      {plan.action !== "Current" && " >"}
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
                  <p className="mt-1 font-extrabold text-[#09111F] dark:text-white">
                    ORD-{selectedPlan.name.toUpperCase().replace(" ", "-")}
                    -29481
                  </p>
                </div>
                <div>
                  <p className="font-semibold text-[#09111F] dark:text-white">
                    Purchased
                  </p>
                  <p className="mt-1 font-extrabold text-[#09111F] dark:text-white">
                    {subscription.purchased}
                  </p>
                </div>
                <div>
                  <p className="font-semibold text-[#09111F] dark:text-white">
                    Next Renewal
                  </p>
                  <p className="mt-1 font-extrabold text-[#09111F] dark:text-white">
                    {planStatus === "Active"
                      ? subscription.nextRenewal
                      : "No renewal"}
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
                    {subscription.billing.paymentMethod}
                  </p>
                </div>
              </div>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <button
                  onClick={() => handleGatewayAction("Update")}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#E6EAF2] px-3 py-2 text-[11px] font-bold text-[#09111F] transition hover:border-[#4A3CFF] hover:text-[#4A3CFF] dark:text-white"
                >
                  <PenLine size={13} />
                  Update payment
                </button>
                <button
                  onClick={() => handleGatewayAction("Download invoice")}
                  className="inline-flex items-center justify-center gap-2 rounded-lg px-2 py-2 text-[11px] font-extrabold text-[#4A3CFF] transition hover:bg-[#F0EEFF]"
                >
                  <FileText size={13} />
                  Download Invoice
                </button>
              </div>
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
                    Pick a pack and your subscription details will update.
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
                  const isSelected = plan.id === selectedPlan.id;

                  return (
                    <button
                      key={plan.id}
                      type="button"
                      onClick={() => selectPlan(plan)}
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
                            /month
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

        {isCancelOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6">
            <div className="w-full max-w-[440px] rounded-2xl border border-[#E3E8F1] bg-white p-5 shadow-2xl dark:border-gray-800 dark:bg-[#1c1c1c]">
              <div className="mb-4 flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-[#FF3B3B]">
                  <XCircle size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-extrabold text-[#09111F] dark:text-white">
                    Cancel {selectedPlan.name} plan?
                  </h2>
                  <p className="mt-1 text-xs font-medium leading-5 text-[#09111F] dark:text-white">
                    Your plan will stay visible, but renewal will be stopped and
                    the subscription status will change to cancelled.
                  </p>
                </div>
              </div>

              <div className="rounded-xl bg-[#F6F8FC] p-4 text-xs font-medium text-[#09111F] dark:bg-[#151515] dark:text-white">
                You can choose any plan again later to reactivate your
                subscription.
              </div>

              <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setIsCancelOpen(false)}
                  className="inline-flex h-10 items-center justify-center rounded-lg border border-[#E6EAF2] px-4 text-[12px] font-bold text-[#09111F] transition hover:border-[#4A3CFF] hover:text-[#4A3CFF] dark:text-white"
                >
                  Keep plan
                </button>
                <button
                  type="button"
                  onClick={cancelPlan}
                  className="inline-flex h-10 items-center justify-center rounded-lg bg-[#FF3B3B] px-4 text-[12px] font-extrabold text-white transition hover:bg-[#E62929]"
                >
                  Confirm cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Subscription;