import React from "react";

const tabs = ["All", "In progress", "Delivered", "Unlisted"];

export default function TabSwitcher({ activeTab, setActiveTab, counts = {} }) {
  return (
    <div className="flex flex-nowrap md:flex-wrap items-center gap-2 md:gap-2.5 overflow-x-auto md:overflow-visible no-scrollbar w-full">
      {tabs.map((tab) => {
        const isActive = activeTab === tab;
        const count = counts[tab] || 0;

        return (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`shrink-0 whitespace-nowrap flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-[12px] md:text-[13px] font-medium transition-all duration-200 border outline-none ${
              isActive
                ? "bg-[#364EF2] border-[#364EF2] text-white shadow-sm shadow-blue-500/20"
                : "bg-white dark:bg-[#1A1D20] border-gray-200 dark:border-gray-700 text-gray-600 dark:text-[#D6D6D6] hover:border-gray-300 dark:hover:border-gray-500"
            }`}
          >
            <span>{tab}</span>
            {count > 0 && (
              <span
                className={`flex items-center justify-center min-w-[20px] h-[20px] px-1 rounded-xl text-[10px] font-bold ${
                  isActive
                    ? "bg-white/25 text-white"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
                }`}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
