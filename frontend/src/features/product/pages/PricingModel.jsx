import toast, { Toaster } from "react-hot-toast";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, XCircle } from "lucide-react";
import { useUser } from "../../../context/useUserContext.jsx";
import {
  createPaymentOrder,
  verifyPayment,
} from "../../payment/api/paymentApi.js";
import { useRazorpayCheckout } from "../../payment/hooks/useRazorpayCheckout.js";

const PLAN_TIER = {
  free: "base_user",
  pro: "pro",
  "pro-plus": "pro_plus",
};

const TIER_RANK = { base_user: 0, pro: 1, pro_plus: 2 };

const PricingModel = () => {
  // Shared primary brand color used across cards, buttons, and highlights.
  const PRIMARY_BLUE = "#3300ff";
  const navigate = useNavigate();
  const { userDetails, isLoggedIn, fetchUserProfile } = useUser();
  const { openCheckout } = useRazorpayCheckout();
  const payingRef = useRef(false);
  const [payingPlan, setPayingPlan] = useState(null);

  const currentTier = userDetails?.subscription || "base_user";

  // Upgrade flow: server order -> Razorpay Checkout -> server verify.
  // payingRef blocks double orders from double clicks.
  const handleUpgrade = async (planId) => {
    if (payingRef.current) return;
    if (!isLoggedIn) {
      toast.error("Please log in to upgrade");
      navigate("/login", { state: { from: { pathname: "/price" } } });
      return;
    }
    payingRef.current = true;
    setPayingPlan(planId);
    try {
      const orderRes = await createPaymentOrder({ plan: PLAN_TIER[planId] });
      const { orderId, amount, currency } = orderRes.data?.data || {};
      if (!orderId) throw new Error("Unable to initiate payment");

      const planName = planId === "pro" ? "Pro" : "Pro Plus";
      const paymentRes = await openCheckout({
        orderId,
        amount,
        currency,
        planName,
        prefill: {
          name: userDetails?.name,
          email: userDetails?.email,
          contact: userDetails?.mobile,
        },
      });

      await verifyPayment({
        razorpay_order_id: paymentRes.razorpay_order_id,
        razorpay_payment_id: paymentRes.razorpay_payment_id,
        razorpay_signature: paymentRes.razorpay_signature,
      });

      await fetchUserProfile();
      toast.success(`Welcome to ${planName}!`);
      navigate("/subscription");
    } catch (error) {
      if (error?.response?.data?.code === "ALREADY_SUBSCRIBED") {
        toast.error("You are already on this plan or higher");
      } else if (error?.message !== "Payment cancelled") {
        toast.error(
          error?.response?.data?.message ||
            error?.message ||
            "Payment failed. Please try again.",
        );
      }
    } finally {
      payingRef.current = false;
      setPayingPlan(null);
    }
  };

  // Button state per tier: current/higher tiers show disabled status,
  // lower tiers offer upgrade.
  const getButtonState = (planId) => {
    const tier = PLAN_TIER[planId];
    if ((TIER_RANK[currentTier] || 0) > (TIER_RANK[tier] || 0)) {
      return { text: "Included", disabled: true };
    }
    if (currentTier === tier) {
      return { text: "Current Plan", disabled: true };
    }
    if (planId === "free") {
      return { text: "Current", disabled: true };
    }
    return { text: "Upgrade Now", disabled: false };
  };

  // Pricing cards data — mirrors Subscription_plan.md (Founder phase).
  const plans = [
    {
      id: "free",
      name: "Free",
      price: "0",
      footerTitle: "Start for free",
      footerSubtitle: "It all yours",
      features: [
        "10 Active Listings",
        "25 Wishlist Saves",
        "Buy & Sell + Unlimited Chats",
        "Standard Support",
        "Buy extra boosts anytime",
      ],
    },
    {
      id: "pro",
      name: "Pro",
      price: "99",
      highlighted: true,
      footerTitle: "Best for active seller",
      footerSubtitle: "Time to become leader",
      features: [
        "25 Active Listings",
        "100 Wishlist Saves",
        "2 Monthly Boosts (3 days each)",
        "Priority in Search + Chats",
        "Priority Support",
      ],
    },
    {
      id: "pro-plus",
      name: "Pro Plus",
      price: "199",
      footerTitle: "For Serious sellers",
      footerSubtitle: "here no one s above you",
      features: [
        "Unlimited Active Listings",
        "Unlimited Wishlist",
        "5 Monthly Boosts (7 days each)",
        "Highest Search + Chat Priority",
        "Highest Priority Support",
      ],
    },
  ];

  // Detailed comparison table data — mirrors Subscription_plan.md.
  const comparisonRows = [
    { feature: "Active Listings", free: "10", pro: "25", proPlus: "Unlimited" },
    { feature: "Monthly Boost Credits", free: "0", pro: "2", proPlus: "5" },
    {
      feature: "Boost Duration",
      free: "—",
      pro: "3 Days",
      proPlus: "7 Days",
    },
    {
      feature: "Search Ranking",
      free: "Normal",
      pro: "Higher",
      proPlus: "Highest",
    },
    { feature: "Chat with Buyers", free: true, pro: true, proPlus: "Priority" },
    {
      feature: "Wishlist Limit",
      free: "25",
      pro: "100",
      proPlus: "Unlimited",
    },
    {
      feature: "Customer Support",
      free: "Standard",
      pro: "Priority",
      proPlus: "Highest Priority",
    },
  ];

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, []);
  // Converts table values into icons, pills, dotted labels, or styled text.
  const renderComparisonValue = (value, plan, row) => {
    if (value === true) {
      return (
        <CheckCircle2
          aria-label="Included"
          className="mx-auto size-4 fill-emerald-500 text-white"
        />
      );
    }

    if (value === false) {
      return (
        <XCircle
          aria-label="Not included"
          className="mx-auto size-4 text-red-400 dark:text-red-400"
          strokeWidth={1.8}
        />
      );
    }

    if (row?.pill) {
      return (
        <span
          className={`inline-flex max-w-full rounded-full px-3 py-1 text-[11px] font-semibold font-figtree ${
            plan === "pro"
              ? "bg-indigo-100 text-[#3300ff]"
              : "bg-orange-100 text-orange-500"
          }`}
        >
          {value}
        </span>
      );
    }

    if (row?.orangeDot && plan === "proPlus") {
      return (
        <span className="inline-flex max-w-full items-center justify-center gap-2 font-semibold font-figtree text-orange-500">
          <span className="size-2 shrink-0 rounded-full border-2 border-orange-500" />
          <span className="break-words">{value}</span>
        </span>
      );
    }

    return (
      <span
        className={`break-words font-medium font-figtree ${
          plan === "pro"
            ? "text-[#3300ff]"
            : plan === "proPlus"
              ? "text-orange-500"
              : "text-slate-500 dark:text-slate-300"
        }`}
      >
        {value}
      </span>
    );
  };

  return (
    <main className="min-h-screen overflow-hidden bg-white py-8 text-slate-900 dark:bg-[#131313]">
      {/* Toast notification container */}
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 1500,
          maxToasts: 1,
        }}
      />

      {/* Pricing hero and plan cards */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 xl:mt-8">
        {/* Page heading */}
        <div className="text-center">
          <span className="inline-flex rounded-full border border-[#3300ff]/30 bg-[#3300ff]/5 px-4 py-2 text-sm font-semibold font-figtree text-[#3300ff]">
            Plans and Pricing
          </span>

          <h1 className="mx-auto mt-5 max-w-4xl text-2xl font-semibold tracking-normal text-slate-950 dark:text-white sm:text-3xl font-figtree">
            Choose Your Plan to{" "}
            <span className="text-[#3300ff]">Sell Smarter</span>
          </h1>

          <p className="mx-auto mt-3 max-w-2xl text-base font-medium text-slate-500 dark:text-[#848484] sm:text-lg font-figtree">
            Designed to help you stand out, sell more, and grow faster.
          </p>
        </div>

        {/* Pricing cards */}
        <div className="mx-auto mt-16 grid max-w-6xl justify-items-center gap-6 md:grid-cols-1 lg:grid-cols-3 lg:items-stretch">
          {plans.map((plan) => (
            <article
              key={plan.name}
              className={`relative flex h-full min-h-[390px] w-full max-w-[330px] flex-col overflow-hidden rounded-[25px] bg-white transition-all duration-300 ease-out dark:bg-[#1A1D20] ${
                plan.highlighted
                  ? "shadow-xl lg:h-[calc(100%+0.75rem)] lg:-translate-y-3"
                  : "shadow-xl dark:shadow-none"
              }`}
            >
              {/* Card top accent / Most Popular banner with curved lower edge */}
              {plan.highlighted ? (
                <div
                  className="relative h-12 overflow-hidden rounded-t-[24px]"
                  style={{ backgroundColor: PRIMARY_BLUE }}
                >
                  <div className="absolute left-0 top-0 z-10 flex h-7 w-full items-center justify-center text-center">
                    <span className="text-xs font-semibold leading-none text-white font-figtree">
                      Most Popular
                    </span>
                  </div>

                  <div className="absolute bottom-[-1px] left-0 right-0 h-5 rounded-t-[24px] bg-white dark:bg-[#1A1D20]" />
                </div>
              ) : (
                <div
                  className="relative h-6 overflow-hidden rounded-t-[24px]"
                  style={{ backgroundColor: PRIMARY_BLUE }}
                >
                  <div className="absolute bottom-[-1px] left-0 right-0 h-4 rounded-t-[24px] bg-white dark:bg-[#1A1D20]" />
                </div>
              )}

              <div
                className={`flex flex-1 flex-col p-5 ${
                  plan.highlighted ? "lg:pt-2" : ""
                }`}
              >
                {/* Plan title and price */}
                <h2 className="text-lg font-semibold text-[#3300ff] font-figtree">
                  {plan.name}
                </h2>

                <div className="mt-3 flex flex-wrap items-end gap-2">
                  <span className="text-3xl font-extrabold tracking-normal text-slate-950 dark:text-white font-figtree">
                    ₹{plan.price}
                  </span>
                  <span className="pb-1 text-xs font-medium text-slate-500 dark:text-[#D7D7D7] font-figtree">
                    {plan.id === "free" ? "free forever" : "one-time"}
                  </span>
                </div>

                {/* Card action button */}
                {(() => {
                  const state = getButtonState(plan.id);
                  const isPaying = payingPlan === plan.id;
                  const disabled = state.disabled || payingPlan !== null;
                  return (
                    <button
                      type="button"
                      onClick={state.disabled ? undefined : () => handleUpgrade(plan.id)}
                      disabled={disabled}
                      aria-disabled={disabled}
                      style={
                        state.disabled
                          ? undefined
                          : { backgroundColor: PRIMARY_BLUE }
                      }
                      className={`mt-5 h-10 w-full rounded-lg px-4 text-sm font-semibold transition font-figtree ${
                        state.disabled
                          ? "cursor-default bg-slate-200 text-slate-800 shadow-none dark:bg-white/15 dark:text-white"
                          : "text-white shadow-lg hover:opacity-90"
                      }`}
                    >
                      {isPaying ? "Processing..." : state.text}
                    </button>
                  );
                })()}

                {/* Card feature list */}
                <ul className="mt-5 space-y-2.5">
                  {plan.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-start gap-2.5 text-xs font-medium leading-5 text-slate-600 dark:text-[#D7D7D7] font-figtree"
                    >
                      <CheckCircle2
                        className="mt-0.5 size-4 shrink-0 text-white"
                        fill={PRIMARY_BLUE}
                        strokeWidth={2.5}
                      />
                      <span className="break-words">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* Card footer message */}
                <div className="mt-auto pt-5">
                  <div className="rounded-xl bg-[#3300ff]/5 px-4 py-3 text-center dark:bg-white/5">
                    <p className="text-sm font-semibold text-[#3300ff] font-figtree">
                      {plan.footerTitle}
                    </p>
                    <p className="mt-1 text-[11px] font-medium text-slate-400 font-figtree">
                      {plan.footerSubtitle}
                    </p>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Detailed comparison section */}
      <section className="mt-16 w-full bg-slate-50 pb-24 pt-16 dark:bg-[#181818]">
        <div className="mx-auto max-w-7xl px-4 sm:px-8 lg:px-10">
          {/* Section heading */}
          <div className="text-center">
            <h2 className="text-3xl font-semibold tracking-normal text-slate-950 dark:text-white sm:text-4xl font-figtree">
              Detailed Comparison
            </h2>
            <p className="mt-4 text-base font-medium text-slate-500 dark:text-[#848484] font-figtree">
              See exactly what you get with each plan.
            </p>
          </div>

          {/* Scroll wrapper protects the table on small screens */}
          <div className="mt-14 overflow-x-auto overflow-y-visible pb-4 pt-10">
            <div className="relative min-w-[780px]">
              {/* Rounded Pro column highlight */}
              <div className="pointer-events-none absolute left-[54%] top-[-40px] z-30 h-[calc(100%+40px)] w-[20%] rounded-2xl bg-[#3300ff]/[0.055] p-1.5">
                <div className="h-full rounded-xl border-2 border-[#9f95ff] bg-[#3300ff]/[0.012] shadow-[inset_0_0_0_1px_rgba(51,0,255,0.08),0_0_22px_rgba(51,0,255,0.09)]">
                  <div className="h-10 rounded-t-lg bg-[#3300ff] text-center text-sm font-medium leading-10 text-white font-figtree">
                    Popular
                  </div>
                </div>
              </div>

              {/* Comparison table */}
              <table className="relative z-20 w-full table-fixed overflow-hidden rounded-xl bg-white text-left shadow-xl shadow-slate-200 dark:bg-[#1A1D20] dark:shadow-none">
                <colgroup>
                  <col className="w-[32%]" />
                  <col className="w-[22%]" />
                  <col className="w-[20%]" />
                  <col className="w-[26%]" />
                </colgroup>

                <thead>
                  <tr className="border-b border-slate-200 dark:border-white/10">
                    <th className="px-7 py-6 text-sm font-semibold text-slate-900 dark:text-white font-figtree">
                      Features
                    </th>
                    <th className="px-7 py-6 text-center text-sm font-semibold text-[#3300ff] font-figtree">
                      Free
                    </th>
                    <th className="bg-[#3300ff]/[0.012] px-7 py-6 text-center text-sm font-semibold text-[#3300ff] font-figtree">
                      Pro
                    </th>
                    <th className="px-7 py-6 text-center text-sm font-semibold text-orange-500 font-figtree">
                      Pro Plus
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {comparisonRows.map((row) => (
                    <tr
                      key={row.feature}
                      className="border-b border-slate-100 last:border-0 dark:border-white/10"
                    >
                      <td
                        className={`px-7 py-6 text-sm font-medium leading-5 font-figtree ${
                          row.featureHighlight
                            ? "text-[#3300ff]"
                            : "text-slate-700 dark:text-[#D7D7D7]"
                        }`}
                      >
                        {row.feature}
                      </td>

                      <td className="px-7 py-6 text-center text-sm">
                        {renderComparisonValue(row.free, "free", row)}
                      </td>

                      <td className="bg-[#3300ff]/[0.012] px-7 py-6 text-center text-sm font-semibold">
                        {renderComparisonValue(row.pro, "pro", row)}
                      </td>

                      <td className="px-7 py-6 text-center text-sm font-semibold">
                        {renderComparisonValue(row.proPlus, "proPlus", row)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Payment note */}
          <p className="mt-6 text-center text-sm font-medium text-slate-500 dark:text-[#848484] font-figtree">
            * Prices are in INR. Payments are secured by Razorpay.
          </p>
        </div>
      </section>
    </main>
  );
};

export default PricingModel;
