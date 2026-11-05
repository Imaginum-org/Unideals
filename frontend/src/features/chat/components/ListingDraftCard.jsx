import React, { useState } from 'react';
import { Copy, Check, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

const ListingDraftCard = ({ draft }) => {
  const [copied, setCopied] = useState(false);

  if (!draft) return null;

  const handleCopy = () => {
    const textToCopy = `Title: ${draft.title}\n\nDescription:\n${draft.description}`;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="mt-3 w-full rounded-lg border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-[#181A1E]">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
          <span>📝</span> Listing Draft
        </h3>
        {draft.categoryLabel && (
          <span className="rounded-full bg-zinc-100 px-2 py-1 text-[11px] font-medium text-zinc-500 capitalize dark:bg-zinc-800 dark:text-zinc-400">
            {draft.categoryLabel}
          </span>
        )}
      </div>

      <div className="mb-3">
        <h4 className="text-sm font-bold text-zinc-900 dark:text-white mb-2">{draft.title}</h4>
        <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3 text-xs text-zinc-700 dark:border-zinc-700 dark:bg-[#1E2025] dark:text-zinc-300 whitespace-pre-wrap">
          {draft.description}
        </div>
      </div>

      {draft.tags && draft.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {draft.tags.map((tag, index) => (
            <span key={index} className="rounded-md bg-zinc-100 px-2 py-1 text-[10px] font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
              #{tag}
            </span>
          ))}
        </div>
      )}

      {draft.pricingAdvice && (
        <div className="mb-4 text-[11px] text-zinc-500 dark:text-zinc-400 italic">
          <span className="font-bold not-italic mr-1 text-zinc-700 dark:text-zinc-300">Tip:</span> 
          {draft.pricingAdvice}
        </div>
      )}

      <div className="flex gap-2 mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800">
        <button 
          onClick={handleCopy}
          className="flex-1 flex items-center justify-center gap-1.5 rounded-md border border-zinc-200 bg-white py-2 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-[#181A1E] dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? 'Copied!' : 'Copy'}
        </button>
        <Link 
          to="/upload"
          className="flex-1 flex items-center justify-center gap-1.5 rounded-md bg-[#394ff1] py-2 text-xs font-semibold text-white transition hover:bg-[#2d3ec9]"
        >
          <Sparkles className="h-3.5 w-3.5" />
          Use for Listing
        </Link>
      </div>
    </div>
  );
};

export default ListingDraftCard;
