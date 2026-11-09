import React from 'react';
import { Link } from 'react-router-dom';

const formatPrice = (price) =>
  new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(
    price || 0
  );

const BudgetBundleCard = ({ bundle }) => {
  if (!bundle || !bundle.products || !bundle.products.length) return null;

  const { products, totalCost, remainingBudget, budgetUsedPercent } = bundle;

  return (
    <div className="mt-3 w-full rounded-lg border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-[#181A1E]">
      <div className="flex items-center mb-4">
        <h3 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
          <span>🎒</span> Budget Bundle
        </h3>
      </div>

      <div className="space-y-3 mb-4">
        {products.map((product) => {
          const image = product.images?.[0] || "/image10.png";
          return (
            <Link 
              key={product._id} 
              to={`/product/${product._id}`}
              className="flex items-center gap-3 rounded-md border border-zinc-100 bg-zinc-50 p-2 transition hover:border-[#394ff1]/30 dark:border-zinc-800 dark:bg-[#1A1D20] group"
            >
              <img
                src={image}
                alt={product.title}
                className="h-12 w-12 shrink-0 rounded object-cover"
                onError={(e) => { e.currentTarget.src = "/image10.png"; }}
              />
              <div className="min-w-0 flex-1">
                <h4 className="truncate text-xs font-bold text-zinc-900 group-hover:text-[#394ff1] transition-colors dark:text-white">
                  {product.title}
                </h4>
                <p className="mt-0.5 text-[10px] text-zinc-500 capitalize dark:text-zinc-400">
                  {product.categoryLabel || 'Product'}
                </p>
              </div>
              <div className="shrink-0 text-sm font-black text-[#394ff1]">
                ₹{formatPrice(product.selling_price)}
              </div>
            </Link>
          );
        })}
      </div>

      <div className="border-t border-zinc-100 pt-3 dark:border-zinc-800">
        <div className="flex justify-between items-center mb-2 text-xs">
          <span className="font-medium text-zinc-600 dark:text-zinc-400">Budget Progress</span>
          <span className="font-bold text-zinc-900 dark:text-white">{budgetUsedPercent}% used</span>
        </div>
        <div className="h-2 w-full rounded-full bg-zinc-200 overflow-hidden dark:bg-zinc-700 mb-3">
          <div 
            className="h-full bg-[#394ff1]"
            style={{ width: `${Math.min(budgetUsedPercent, 100)}%` }}
          />
        </div>
        <div className="flex justify-between items-center text-xs">
          <div>
            <span className="text-zinc-500 dark:text-zinc-400">Total: </span>
            <span className="font-black text-zinc-900 dark:text-white">₹{formatPrice(totalCost)}</span>
          </div>
          <div>
            <span className="text-zinc-500 dark:text-zinc-400">Remaining: </span>
            <span className="font-black text-green-600 dark:text-green-500">₹{formatPrice(remainingBudget)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BudgetBundleCard;
