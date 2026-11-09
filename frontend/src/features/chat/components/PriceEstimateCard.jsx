import React from 'react';

const formatPrice = (price) =>
  new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(
    price || 0
  );

const PriceEstimateCard = ({ estimate }) => {
  if (!estimate) return null;

  return (
    <div className="mt-3 w-full rounded-lg border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-[#181A1E]">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
          <span>💰</span> Price Estimate
        </h3>
        {estimate.category && (
          <span className="rounded-full bg-zinc-100 px-2 py-1 text-[11px] font-medium text-zinc-500 capitalize dark:bg-zinc-800 dark:text-zinc-400">
            {estimate.category.replace('_', ' ')}
          </span>
        )}
      </div>

      <div className="relative pt-6 pb-2">
        <div className="h-2 w-full rounded-full bg-zinc-100 flex overflow-hidden dark:bg-zinc-800">
          <div className="h-full bg-green-500 flex-1"></div>
          <div className="h-full bg-[#394ff1] flex-1"></div>
          <div className="h-full bg-orange-500 flex-1"></div>
        </div>

        <div className="absolute top-0 w-full flex justify-between text-[11px] font-bold">
          <div className="text-green-600 dark:text-green-500">Low</div>
          <div className="text-[#394ff1] dark:text-[#394ff1]">Fair</div>
          <div className="text-orange-600 dark:text-orange-500">High</div>
        </div>
        
        <div className="w-full flex justify-between mt-2 text-xs font-black text-zinc-900 dark:text-white">
          <div>₹{formatPrice(estimate.low)}</div>
          <div>₹{formatPrice(estimate.fair)}</div>
          <div>₹{formatPrice(estimate.high)}</div>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800">
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">
          Based on {estimate.sampleSize || 0} similar listings
        </p>
        <p className="text-sm font-medium text-zinc-900 dark:text-white">
          We recommend listing near <span className="text-[#394ff1] font-black">₹{formatPrice(estimate.fair)}</span>
        </p>
      </div>
    </div>
  );
};

export default PriceEstimateCard;
