import toast, { Toaster } from "react-hot-toast";
import { CheckCircle2, XCircle } from "lucide-react";

const PricingModel = () => {
  // Shared primary brand color used across cards, buttons, and highlights.
  const PRIMARY_BLUE = "#3838ec";

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
          className={`inline-flex max-w-full rounded-full px-3 py-1 text-[11px] font-semibold font-poppins ${
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
        <span className="inline-flex max-w-full items-center justify-center gap-2 font-semibold font-poppins text-orange-500">
          <span className="size-2 shrink-0 rounded-full border-2 border-orange-500" />
          <span className="break-words">{value}</span>
        </span>
      );
    }

    return (
      <span
        className={`break-words font-medium font-poppins ${
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
    <main className="min-h-screen overflow-hidden bg-white px-4 py-10 text-slate-900 dark:bg-[#131313] sm:px-6 lg:px-8">
      {/* Toast notification container */}
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 1500,
          maxToasts: 1,
        }}
      />

      {/* Pricing hero and plan cards */}
      <section className="mx-auto max-w-7xl">
        {/* Page heading */}
        <div className="text-center">
          <span className="inline-flex rounded-full border border-[#3300ff]/30 bg-[#3300ff]/5 px-4 py-2 text-sm font-semibold font-poppins text-[#3300ff]">
            Plans and Pricing
          </span>

          <h1 className="mx-auto mt-6 max-w-4xl text-3xl font-semibold tracking-normal text-slate-950 dark:text-white sm:text-4xl lg:text-5xl font-robotoFlex">
            Choose Your Plan to{" "}
            <span className="text-[#3300ff]">Sell Smarter</span>
          </h1>

          <p className="mx-auto mt-4 max-w-2xl text-base font-medium text-slate-500 dark:text-[#848484] sm:text-lg font-poppins">
            Designed to help you stand out, sell more, and grow faster.
          </p>
        </div>

        {/* Pricing cards */}
        <div className="mt-14 grid gap-8 md:grid-cols-2 lg:grid-cols-3 lg:items-stretch">
          {plans.map((plan) => (
            <article
              key={plan.name}
              className={`relative flex h-full min-h-[520px] flex-col overflow-hidden rounded-[24px] bg-white transition-all duration-300 ease-out dark:bg-[#1A1D20] ${
                plan.highlighted
                  ? "shadow-[0_0_0_1px_rgba(51,0,255,0.08),0_18px_45px_rgba(51,0,255,0.18),0_8px_22px_rgba(15,23,42,0.08)] hover:shadow-[0_0_0_1px_rgba(51,0,255,0.12),0_24px_60px_rgba(51,0,255,0.24),0_12px_30px_rgba(15,23,42,0.12)] dark:shadow-[0_0_0_1px_rgba(51,0,255,0.18),0_0_34px_rgba(51,0,255,0.30),0_18px_46px_rgba(0,0,0,0.45)] dark:hover:shadow-[0_0_0_1px_rgba(51,0,255,0.24),0_0_46px_rgba(51,0,255,0.42),0_24px_60px_rgba(0,0,0,0.55)] lg:-translate-y-3"
                  : "shadow-xl shadow-slate-200/70 dark:shadow-none"
              }`}
            >
              {/* Card top accent / Most Popular banner with curved lower edge */}
              {plan.highlighted ? (
                <div
                  className="relative h-14 overflow-hidden rounded-t-[24px]"
                  style={{ backgroundColor: PRIMARY_BLUE }}
                >
                  <div className="absolute left-0 top-0 z-10 flex h-9 w-full items-center justify-center text-center">
                    <span className="text-sm font-semibold leading-none text-white font-poppins">
                      Most Popular
                    </span>
                  </div>

                  <div className="absolute bottom-[-1px] left-0 right-0 h-6 rounded-t-[24px] bg-white dark:bg-[#1A1D20]" />
                </div>
              ) : (
                <div
                  className="relative h-7 overflow-hidden rounded-t-[24px]"
                  style={{ backgroundColor: PRIMARY_BLUE }}
                >
                  <div className="absolute bottom-[-1px] left-0 right-0 h-5 rounded-t-[24px] bg-white dark:bg-[#1A1D20]" />
                </div>
              )}

              <div className="flex flex-1 flex-col p-7">
                {/* Plan title and price */}
                <h2 className="text-xl font-semibold text-[#3300ff] font-robotoFlex">
                  {plan.name}
                </h2>

                <div className="mt-4 flex flex-wrap items-end gap-2">
                  <span className="text-5xl font-medium tracking-normal text-slate-950 dark:text-white font-tiltWarp">
                    ₹{plan.price}
                  </span>
                  <span className="pb-2 text-sm font-medium text-slate-500 dark:text-[#D7D7D7] font-poppins">
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
                  className={`mt-8 h-12 w-full rounded-lg px-4 text-sm font-semibold transition font-poppins ${
                    plan.buttonDisabled
                      ? "cursor-default border border-[#3300ff]/25 bg-[#3300ff]/10 text-[#3300ff] shadow-none"
                      : "text-white shadow-lg shadow-indigo-200 hover:opacity-90"
                  }`}
                >
                  {plan.buttonText}
                </button>

                {/* Card feature list */}
                <ul className="mt-8 space-y-4">
                  {plan.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-start gap-3 text-sm font-medium leading-5 text-slate-600 dark:text-[#D7D7D7] font-poppins"
                    >
                      <CheckCircle2
                        className="mt-0.5 size-5 shrink-0 text-white"
                        fill={PRIMARY_BLUE}
                        strokeWidth={2.5}
                      />
                      <span className="break-words">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* Card footer message */}
                <div className="mt-auto pt-9">
                  <div className="rounded-xl bg-[#3300ff]/5 px-5 py-4 text-center dark:bg-white/5">
                    <p className="font-semibold text-[#3300ff] font-robotoFlex">
                      {plan.footerTitle}
                    </p>
                    <p className="mt-1 text-xs font-medium text-slate-400 font-poppins">
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
      <section className="mx-auto mt-20 max-w-7xl bg-slate-50 px-4 py-16 dark:bg-[#181818] sm:px-8 lg:px-10">
        {/* Section heading */}
        <div className="text-center">
          <h2 className="text-3xl font-semibold tracking-normal text-slate-950 dark:text-white sm:text-4xl font-robotoFlex">
            Detailed Comparison
          </h2>
          <p className="mt-4 text-base font-medium text-slate-500 dark:text-[#848484] font-poppins">
            See exactly what you get with each plan.
          </p>
        </div>

        {/* Scroll wrapper protects the table on small screens */}
        <div className="mt-14 overflow-x-auto overflow-y-visible pb-4 pt-10">
          <div className="relative min-w-[780px]">
            {/* Rounded Pro column highlight */}
            <div className="pointer-events-none absolute left-[54%] top-[-40px] z-30 h-[calc(100%+40px)] w-[20%] rounded-2xl bg-[#3300ff]/[0.055] p-2">
              <div className="h-full rounded-xl border-2 border-[#9f95ff] bg-[#3300ff]/[0.025] shadow-[inset_0_0_0_1px_rgba(51,0,255,0.08),0_0_22px_rgba(51,0,255,0.09)]">
                <div className="h-10 rounded-t-lg bg-[#3300ff] text-center text-sm font-medium leading-10 text-white font-poppins">
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
                  <th className="px-7 py-6 text-sm font-semibold text-slate-900 dark:text-white font-poppins">
                    Features
                  </th>
                  <th className="px-7 py-6 text-center text-sm font-semibold text-[#3300ff] font-poppins">
                    Free
                  </th>
                  <th className="bg-[#3300ff]/[0.025] px-7 py-6 text-center text-sm font-semibold text-[#3300ff] font-poppins">
                    Pro
                  </th>
                  <th className="px-7 py-6 text-center text-sm font-semibold text-orange-500 font-poppins">
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
                      className={`px-7 py-6 text-sm font-medium leading-5 font-poppins ${
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

                    <td className="bg-[#3300ff]/[0.025] px-7 py-6 text-center text-sm font-semibold">
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
        <p className="mt-6 text-center text-sm font-medium text-slate-500 dark:text-[#848484] font-poppins">
          * Prices are in INR. Payments are secured by Razorpay.
        </p>
      </section>
    </main>
  );
};

export default PricingModel;
