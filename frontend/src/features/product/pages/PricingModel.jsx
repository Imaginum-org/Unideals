import toast, { Toaster } from "react-hot-toast";
import {useEffect} from "react"
import { CheckCircle2, XCircle } from "lucide-react";

const PricingModel = () => {
  // Shared primary brand color used across cards, buttons, and highlights.
  const PRIMARY_BLUE = "#3300ff";

  // Handles upgrade actions until the payment flow is connected.
  const handleUpgrade = () => {
    toast("Coming Soon!", { id: "pricing-toast" });
  };

  // Pricing cards data.
  const plans = [
    {
      name: "Free",
      price: "0",
      buttonText: "Current",
      buttonDisabled: true,
      footerTitle: "Start for free",
      footerSubtitle: "It all yours",
      features: [
        "7 Listings / Month",
        "2 Images per Product",
        "Basic Analytics",
        "AI Sellability Score (First 2)",
        "3 Boosts (30 mins each)",
      ],
    },
    {
      name: "Pro",
      price: "99",
      buttonText: "Upgrade Now",
      highlighted: true,
      footerTitle: "Best for active seller",
      footerSubtitle: "Time to become leader",
      features: [
        "25 Listings / Month",
        "5 Images per Product",
        "Advanced Analytics",
        "Full AI Sellability Score",
        "10 Trending Boosts (2 hrs each)",
      ],
    },
    {
      name: "Pro Plus",
      price: "199",
      buttonText: "Upgrade Now",
      footerTitle: "For Serious sellers",
      footerSubtitle: "here no one s above you",
      features: [
        "Unlimited Listings",
        "8 Images per Product",
        "Pro Plus Badge",
        "Deep Analytics Insights",
        "Unlimited Boosts (4 hrs each)",
      ],
    },
  ];

  // Detailed comparison table data.
  const comparisonRows = [
    { feature: "Monthly Uploads", free: "7", pro: "25", proPlus: "Unlimited" },
    { feature: "Images per Product", free: "2", pro: "5", proPlus: "8" },
    {
      feature: "Search Ranking",
      free: "Normal",
      pro: "Higher",
      proPlus: "Highest",
    },
    { feature: "Chat with Buyers", free: true, pro: true, proPlus: "Priority" },
    { feature: "Wishlist Support", free: true, pro: true, proPlus: true },
    { feature: "Basic Analytics", free: true, pro: true, proPlus: true },
    {
      feature: "Advanced Analytics",
      free: false,
      pro: true,
      proPlus: true,
      featureHighlight: true,
    },
    {
      feature: "AI Sellability Score",
      free: "Limited",
      pro: "Full",
      proPlus: "Advanced",
    },
    {
      feature: "Seller Badge",
      free: false,
      pro: "PRO",
      proPlus: "PRO PLUS",
      pill: true,
    },
    {
      feature: "Trending Placement",
      free: false,
      pro: "Limited",
      proPlus: "Guaranteed",
      orangeDot: true,
    },
  ];

    useEffect(() => {
      window.scrollTo(0, 0);
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
                  ? "shadow-xl lg:-translate-y-3"
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

              <div className="flex flex-1 flex-col p-5">
                {/* Plan title and price */}
                <h2 className="text-lg font-semibold text-[#3300ff] font-figtree">
                  {plan.name}
                </h2>

                <div className="mt-3 flex flex-wrap items-end gap-2">
                  <span className="text-3xl font-medium tracking-normal text-slate-950 dark:text-white font-figtree">
                    ₹{plan.price}
                  </span>
                  <span className="pb-1 text-xs font-medium text-slate-500 dark:text-[#D7D7D7] font-figtree">
                    /month
                  </span>
                </div>

                {/* Card action button */}
                <button
                  type="button"
                  onClick={plan.buttonDisabled ? undefined : handleUpgrade}
                  disabled={plan.buttonDisabled}
                  aria-disabled={plan.buttonDisabled}
                  style={
                    plan.buttonDisabled
                      ? undefined
                      : { backgroundColor: PRIMARY_BLUE }
                  }
                  className={`mt-5 h-10 w-full rounded-lg px-4 text-sm font-semibold transition font-figtree ${
                    plan.buttonDisabled
                      ? "cursor-default bg-slate-200 text-slate-800 shadow-none dark:bg-white/15 dark:text-white"
                      : "text-white shadow-lg hover:opacity-90"
                  }`}
                >
                  {plan.buttonText}
                </button>

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
