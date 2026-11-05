import React from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink } from 'lucide-react';

const formatPrice = (price) =>
  new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(
    price || 0
  );

const ComparisonCard = ({ comparison }) => {
  if (!comparison || !comparison.product1 || !comparison.product2) return null;

  const { product1, product2, verdict } = comparison;

  const renderProduct = (product) => {
    const image = product.images?.[0] || "/image10.png";
    
    return (
      <Link to={`/product/${product._id}`} className="flex-1 rounded-md border border-zinc-200 p-2 transition hover:border-[#394ff1]/50 dark:border-zinc-700 dark:hover:border-[#394ff1]/50 group">
        <img
          src={image}
          alt={product.title}
          className="h-24 w-full rounded-md object-cover mb-2"
          onError={(e) => { e.currentTarget.src = "/image10.png"; }}
        />
        <div className="flex justify-between items-start mb-1">
          <h4 className="text-xs font-bold text-zinc-900 dark:text-white line-clamp-2 group-hover:text-[#394ff1] transition-colors">{product.title}</h4>
          <ExternalLink className="h-3 w-3 text-zinc-400 flex-shrink-0 ml-1" />
        </div>
        <p className="text-sm font-black text-[#394ff1] mb-2">₹{formatPrice(product.selling_price)}</p>
        
        <div className="flex flex-col gap-1 text-[11px] text-zinc-500 dark:text-zinc-400">
          <div className="flex justify-between">
            <span>Condition:</span>
            <span className="font-medium text-zinc-700 dark:text-zinc-300 capitalize">{product.conditionLabel || product.condition}</span>
          </div>
          <div className="flex justify-between">
            <span>Views:</span>
            <span className="font-medium text-zinc-700 dark:text-zinc-300">{product.views_count || 0}</span>
          </div>
          <div className="flex justify-between">
            <span>Negotiable:</span>
            <span className="font-medium text-zinc-700 dark:text-zinc-300">{product.is_negotiable ? 'Yes' : 'No'}</span>
          </div>
        </div>
      </Link>
    );
  };

  return (
    <div className="mt-3 w-full rounded-lg border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-[#181A1E]">
      <div className="mb-3">
        <h3 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
          <span>⚖️</span> Product Comparison
        </h3>
      </div>
      
      <div className="flex gap-3 mb-4">
        {renderProduct(product1)}
        {renderProduct(product2)}
      </div>

      {verdict && (
        <div className="rounded-md bg-[#F8F9FF] p-3 border border-indigo-50 dark:bg-[#1A1D24] dark:border-indigo-900/30">
          <p className="text-xs font-bold text-[#394ff1] mb-1">AI Recommendation</p>
          <p className="text-[12px] text-zinc-700 dark:text-zinc-300 leading-relaxed">{verdict}</p>
        </div>
      )}
    </div>
  );
};

export default ComparisonCard;
