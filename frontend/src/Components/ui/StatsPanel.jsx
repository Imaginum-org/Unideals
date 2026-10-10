import React from "react";
import { MdInventory, MdShoppingCart, MdStar } from "react-icons/md";

function StatCard({ icon, value, label, delta }) {
  return (
    <article
      className="flex items-center gap-4 p-5 rounded-2xl bg-[#F7F8FA] dark:bg-[#2D3339] border border-transparent dark:border-[#161718] shadow-md hover:shadow-lg transition-shadow duration-500 transform cursor-default"
      role="region"
      aria-label={`${label} statistic`}
    >
      <div className="flex-none p-3 rounded-xl bg-gradient-to-br from-[#F7F8FA] to-[#F7F8FA] dark:from-[#131416] dark:to-[#0f1112] border border-gray-100 dark:border-[#212426] shadow-inner">
        <div className="w-10 h-10 flex items-center justify-center text-[#394ff1] dark:text-[#93b4ff]">
          {icon}
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-4">
          <h3 className="text-2xl font-semibold leading-tight text-[#111827] dark:text-[#E6EEF6] truncate">
            {value}
          </h3>

          {delta ? (
            <span
              className={`inline-flex items-center text-sm font-medium px-2 py-0.5 rounded-md ${
                delta.positive
                  ? "bg-green-50 text-green-700"
                  : "bg-red-50 text-red-700"
              }`}
              aria-hidden="true"
            >
              {delta.positive ? "▲" : "▼"} {delta.value}
            </span>
          ) : null}
        </div>

        <p className="mt-1 text-sm text-gray-500 dark:text-[#9AA8B6] truncate">
          {label}
        </p>
      </div>
    </article>
  );
}

export default function StatsPanel({ stats }) {
  const items = [
    {
      key: "products",
      icon: <MdInventory size={20} aria-hidden="true" />,
      value: stats?.products?.value ?? 21,
      label: stats?.products?.label ?? "Products Listed",
      delta: stats?.products?.delta ?? { value: "2.4%", positive: true },
    },
    {
      key: "orders",
      icon: <MdShoppingCart size={20} aria-hidden="true" />,
      value: stats?.orders?.value ?? 8,
      label: stats?.orders?.label ?? "Orders",
      delta: stats?.orders?.delta ?? { value: "−5.2%", positive: false },
    },
    {
      key: "rating",
      icon: <MdStar size={20} aria-hidden="true" />,
      value: stats?.rating?.value ?? "4.8",
      label: stats?.rating?.label ?? "Rating",
      delta: stats?.rating?.delta ?? { value: "0.1+", positive: true },
    },
  ];

  return (
    <section className="bg-[#F7F8FA] dark:bg-[#1A1D20] rounded-b-2xl shadow mx-[3vw] p-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((s) => (
          <StatCard
            key={s.key}
            icon={s.icon}
            value={s.value}
            label={s.label}
            delta={s.delta}
          />
        ))}
      </div>
    </section>
  );
}
