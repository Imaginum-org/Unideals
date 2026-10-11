import { toast } from "../../../components/ui/toast.js";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CheckCircle2,
  ChevronDown,
  Clock3,
  Heart,
  Headphones,
  MessagesSquare,
  Receipt,
  Rocket,
  Search,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Tag,
  XCircle,
  Zap,
} from "lucide-react";
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

  const rawTier = userDetails?.subscription || "base_user";
  const currentTier = TIER_RANK[rawTier] === undefined ? "base_user" : rawTier;
  if (TIER_RANK[rawTier] === undefined && userDetails?.subscription) {
    console.warn(
      `[pricing] unknown subscription tier "${rawTier}", falling back to Free`,
    );
  }
  const razorpayMissing = !import.meta.env.VITE_RAZORPAY_KEY_ID;

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
      toast.success(`Welcome to ${planName}!`, {
        id: "plan-upgrade-success",
        duration: 3000,
      });
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
  // lower tiers offer upgrade. Free navigates (manage/downgrade) when it is
  // not the current plan; paid buttons disable without a Razorpay key.
  const getButtonState = (planId) => {
    const tier = PLAN_TIER[planId];
    if ((TIER_RANK[currentTier] || 0) > (TIER_RANK[tier] || 0)) {
      return { text: "Included", disabled: true };
    }
    if (currentTier === tier) {
      return { text: "Current Plan", disabled: true };
    }
    if (planId === "free") {
      return { text: "Manage plan", disabled: false, action: "manage" };
    }
    if (razorpayMissing) {
      return {
        text: "Payments unavailable",
        disabled: true,
        tooltip: "Payments are unavailable right now. Please try later.",
      };
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
      footerSubtitle: "It's all yours",
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
      priceNote: "About 5 canteen chais, paid just once.",
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
      priceNote: "About 10 canteen chais, once ever.",
      footerTitle: "For Serious sellers",
      footerSubtitle: "No one's above you",
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
  // Every row carries a one-line student-friendly blurb, revealed by the
  // arrow. All rows start collapsed.
  const comparisonRows = [
    { feature: "Buy & Sell Products", icon: ShoppingBag, free: true, pro: true, proPlus: true, blurb: "List anything from books to cycles, and buy from verified students on your campus." },
    { feature: "Unlimited Chats", icon: MessagesSquare, free: true, pro: true, proPlus: true, blurb: "Message as many buyers or sellers as you want. No caps, no paywalls on conversations." },
    { feature: "Active Listings", icon: Tag, free: "10", pro: "25", proPlus: "Unlimited", blurb: "How many items you can keep live at once. Sold or unlisted ones never count." },
    { feature: "Monthly Boost Credits", icon: Rocket, free: "0", pro: "2", proPlus: "5", blurb: "Free boosts added every month. Each one pushes a listing to the top of search and feeds." },
    {
      feature: "Boost Duration",
      icon: Clock3,
      free: "-",
      pro: "3 Days",
      proPlus: "7 Days",
      blurb: "How long each free boost keeps you on top once you start it.",
    },
    {
      feature: "Search Ranking",
      icon: Search,
      free: "Normal",
      pro: "Higher",
      proPlus: "Highest",
      blurb: "Where you show up when someone searches. Higher plans jump the queue.",
    },
    {
      feature: "Chat Priority",
      icon: Zap,
      free: "-",
      pro: "Higher",
      proPlus: "Highest",
      blurb: "Your chats with buyers float above free users in their inbox.",
    },
    {
      feature: "Wishlist Limit",
      icon: Heart,
      free: "25",
      pro: "100",
      proPlus: "Unlimited",
      blurb: "How many items you can heart and track for later.",
    },
    {
      feature: "Early Feature Access",
      icon: Sparkles,
      free: "-",
      pro: "Limited",
      proPlus: "Full",
      blurb: "Try new Unideals drops before everyone else. Pro gets a peek, Pro Plus gets it all.",
    },
    {
      feature: "Customer Support",
      icon: Headphones,
      free: "Standard",
      pro: "Priority",
      proPlus: "Highest Priority",
      blurb: "Stuck somewhere? Higher plans jump to the front of the support line.",
    },
  ];

  // Single-open accordion for the feature blurbs (all collapsed by default).
  const [openFeature, setOpenFeature] = useState(null);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
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
    <main className="min-h-screen overflow-hidden bg-[#F7F8FA] py-8 text-slate-900 dark:bg-[#131313]">
      {/* Toasts render via the global Toaster in app/App.jsx. */}

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
            Made for campus budgets. Start free, go Pro for a few canteen chais.
          </p>
        </div>

        {/* Founder story: pay once, sorted for college */}
        <div className="mx-auto mt-10 max-w-6xl overflow-hidden rounded-[25px] bg-gradient-to-r from-[#2E3FDC] to-[#4B5CF5] px-6 py-8 text-white shadow-xl shadow-indigo-200 dark:shadow-none sm:px-10">
          <div className="flex flex-col items-start gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-xl">
              <span className="inline-flex rounded-full bg-white/15 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-widest font-figtree">
                Founder launch
              </span>
              <h2 className="mt-3 text-xl font-bold leading-snug sm:text-2xl font-figtree">
                Pay once. Sorted for all of college.
              </h2>
              <p className="mt-2 text-sm leading-6 text-white/85 font-figtree">
                Pro and Pro Plus are one-time launch prices. Pay once and never
                pay again through your entire degree. No subscriptions, no
                renewals, no fine-print traps.
              </p>
            </div>
            <ul className="w-full max-w-sm space-y-2.5">
              {[
                "One-time payment, lifetime benefits",
                "Free plan stays free forever",
                "Got placed? Come back and buy us a chai",
              ].map((line) => (
                <li
                  key={line}
                  className="flex items-center gap-2.5 rounded-xl bg-white/10 px-4 py-2.5 text-sm font-medium font-figtree"
                >
                  <CheckCircle2 className="size-4 shrink-0" strokeWidth={2.5} />
                  {line}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Pricing cards */}
        <div className="mx-auto mt-16 grid max-w-6xl justify-items-center gap-6 md:grid-cols-1 lg:grid-cols-3 lg:items-stretch">
          {plans.map((plan) => (
            <article
              key={plan.name}
              className={`relative flex h-full min-h-[390px] w-full max-w-[330px] flex-col overflow-hidden rounded-[25px] bg-[#F7F8FA] transition-all duration-300 ease-out dark:bg-[#1A1D20] ${
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

                  <div className="absolute bottom-[-1px] left-0 right-0 h-5 rounded-t-[24px] bg-[#F7F8FA] dark:bg-[#1A1D20]" />
                </div>
              ) : (
                <div
                  className="relative h-6 overflow-hidden rounded-t-[24px]"
                  style={{ backgroundColor: PRIMARY_BLUE }}
                >
                  <div className="absolute bottom-[-1px] left-0 right-0 h-4 rounded-t-[24px] bg-[#F7F8FA] dark:bg-[#1A1D20]" />
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
                {plan.priceNote && (
                  <p className="mt-1.5 text-[11px] font-semibold text-slate-400 dark:text-[#848484] font-figtree">
                    {plan.priceNote}
                  </p>
                )}

                {/* Card action button */}
                {(() => {
                  const state = getButtonState(plan.id);
                  const isPaying = payingPlan === plan.id;
                  const disabled = state.disabled || payingPlan !== null;
                  const handleClick = () => {
                    if (state.disabled) return;
                    if (state.action === "manage") {
                      navigate("/subscription");
                      return;
                    }
                    handleUpgrade(plan.id);
                  };
                  return (
                    <button
                      type="button"
                      onClick={state.disabled ? undefined : handleClick}
                      disabled={disabled}
                      aria-disabled={disabled}
                      title={state.tooltip || undefined}
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
      <section className="mt-16 w-full bg-[#F7F8FA] pb-24 pt-16 dark:bg-[#181818]">
        <div className="mx-auto max-w-7xl px-4 sm:px-8 lg:px-10">
          {/* Section heading */}
          <div className="text-center">
            <h2 className="text-3xl font-semibold tracking-normal text-slate-950 dark:text-white sm:text-4xl font-figtree">
              Detailed Comparison
            </h2>
            <p className="mt-4 text-base font-medium text-slate-500 dark:text-[#848484] font-figtree">
              Start free forever. Pro is one payment, nothing extra after that. Got placed? Then come support us.
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
              <table className="relative z-20 w-full table-fixed overflow-hidden rounded-xl bg-[#F7F8FA] text-left shadow-[0_24px_60px_-24px_rgba(15,23,42,0.22)] dark:bg-[#1A1D20] dark:shadow-none">
                <colgroup>
                  <col className="w-[32%]" />
                  <col className="w-[22%]" />
                  <col className="w-[20%]" />
                  <col className="w-[26%]" />
                </colgroup>

                <thead>
                  <tr className="border-b border-slate-200 dark:border-white/10">
                    <th className="sticky left-0 z-10 bg-[#F7F8FA] dark:bg-[#1A1D20] px-7 py-6 text-sm font-semibold text-slate-900 dark:text-white font-figtree">
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
                  {comparisonRows.map((row) => {
                    const RowIcon = row.icon;
                    const isOpen = openFeature === row.feature;
                    return (
                    <tr
                      key={row.feature}
                      className="border-b border-slate-100 last:border-0 dark:border-white/10 transition-colors hover:bg-[#EEF2FF]/70 dark:hover:bg-white/5"
                    >
                      <td
                        className={`sticky left-0 z-10 bg-[#F7F8FA] dark:bg-[#1A1D20] px-7 py-6 text-sm font-medium leading-5 font-figtree ${
                          row.featureHighlight
                            ? "text-[#3300ff]"
                            : "text-slate-700 dark:text-[#D7D7D7]"
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => setOpenFeature(isOpen ? null : row.feature)}
                          aria-expanded={isOpen}
                          className="flex w-full items-center gap-2.5 text-left"
                        >
                          {RowIcon && (
                            <RowIcon size={16} className="shrink-0 text-[#3300ff] dark:text-[#8FA2FF]" />
                          )}
                          <span className="min-w-0 flex-1">{row.feature}</span>
                          <ChevronDown
                            size={15}
                            className={`shrink-0 text-slate-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                          />
                        </button>
                        <div
                          className={`grid transition-[grid-template-rows] duration-200 ease-out ${
                            isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                          }`}
                        >
                          <div className="overflow-hidden">
                            <p className="pt-1.5 text-xs font-normal leading-5 text-slate-500 dark:text-slate-400">
                              {row.blurb}
                            </p>
                          </div>
                        </div>
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
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

            {/* One-time add-ons (part of the plan doc, all users) */}
            <div className="mx-auto mt-10 max-w-3xl">
              <p className="text-center text-[15px] font-bold text-slate-900 dark:text-white font-figtree">
                Only need a single push?
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {[
                  { days: "3-Day Boost", price: "₹29", blurb: "Quick push for the weekend rush." },
                  { days: "7-Day Boost", price: "₹49", blurb: "Stay on top for the whole week." },
                ].map((a) => (
                  <div
                    key={a.days}
                    className="flex items-center gap-3.5 rounded-2xl border border-[#3300ff]/20 bg-white px-5 py-4 shadow-[0_16px_40px_-20px_rgba(51,0,255,0.25)] dark:bg-[#1A1D20]"
                  >
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#3300ff]/10 text-[#3300ff] dark:text-[#8FA2FF]">
                      <Zap size={18} />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-bold text-slate-900 dark:text-white font-figtree">
                        {a.days} <span className="text-[#3300ff] dark:text-[#8FA2FF]">{a.price}</span>
                      </span>
                      <span className="mt-0.5 block text-xs font-medium text-slate-500 dark:text-slate-400 font-figtree">
                        {a.blurb}
                      </span>
                    </span>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-center text-xs font-medium text-slate-400 dark:text-[#848484] font-figtree">
                One-time buys, no subscription needed. Works on Free too.
              </p>
            </div>

            {/* Assurance row: gateway, lifetime, refunds */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-x-5 gap-y-2.5 text-xs font-medium text-slate-500 dark:text-[#848484] font-figtree">
              <span className="flex items-center gap-2">
                <img
                  src="/razorpay.svg"
                  alt="Razorpay"
                  loading="lazy"
                  className="h-4 w-auto rounded bg-white px-2 py-0.5"
                />
                <span>Payments secured by Razorpay, in INR</span>
              </span>
              <span className="hidden h-1 w-1 rounded-full bg-slate-300 dark:bg-zinc-600 sm:block" aria-hidden="true" />
              <span className="flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-emerald-600 dark:text-emerald-400" />
                Founder lifetime, one-time pay
              </span>
              <span className="hidden h-1 w-1 rounded-full bg-slate-300 dark:bg-zinc-600 sm:block" aria-hidden="true" />
              <span className="flex items-center gap-1.5">
                <Receipt size={14} className="text-slate-400" />
                <span>
                  Refunds per{" "}
                  <a href="/termscondition" className="underline hover:text-[#3300ff]">
                    Terms
                  </a>
                </span>
              </span>
            </div>
        </div>
      </section>
    </main>
  );
};

export default PricingModel;
