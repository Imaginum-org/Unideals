import React, { useState } from 'react';
import { CheckCircle2, Circle } from 'lucide-react';

const ChecklistCard = ({ checklist, category }) => {
  const [checkedItems, setCheckedItems] = useState({});

  const items = Array.isArray(checklist) ? checklist : checklist?.checklist || [];
  const categoryName = category || checklist?.category || "";

  if (!items.length) return null;

  const toggleCheck = (index) => {
    setCheckedItems(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const checkedCount = Object.values(checkedItems).filter(Boolean).length;
  const totalCount = items.length;

  return (
    <div className="mt-3 w-full rounded-lg border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-[#181A1E]">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
          <span>✅</span> Inspection Checklist
        </h3>
        {categoryName && (
          <span className="rounded-full bg-zinc-100 px-2 py-1 text-[11px] font-medium text-zinc-500 capitalize dark:bg-zinc-800 dark:text-zinc-400">
            {categoryName}
          </span>
        )}
      </div>

      <div className="mb-3 flex items-center justify-between text-xs font-medium">
        <span className="text-zinc-500 dark:text-zinc-400">Progress</span>
        <span className="text-[#394ff1]">{checkedCount}/{totalCount} checked</span>
      </div>
      
      <div className="h-1.5 w-full rounded-full bg-zinc-100 mb-4 overflow-hidden dark:bg-zinc-800">
        <div 
          className="h-full bg-[#394ff1] transition-all duration-300"
          style={{ width: `${(checkedCount / totalCount) * 100}%` }}
        />
      </div>

      <div className="space-y-2">
        {items.map((item, index) => {
          const isChecked = !!checkedItems[index];
          return (
            <button
              key={index}
              onClick={() => toggleCheck(index)}
              className="flex w-full items-start gap-2.5 rounded-md p-2 text-left transition hover:bg-zinc-50 dark:hover:bg-[#1E2025]"
            >
              <div className="mt-0.5 shrink-0">
                {isChecked ? (
                  <CheckCircle2 className="h-4 w-4 text-[#394ff1]" />
                ) : (
                  <Circle className="h-4 w-4 text-zinc-300 dark:text-zinc-600" />
                )}
              </div>
              <span className={`text-xs ${isChecked ? 'text-zinc-400 line-through dark:text-zinc-500' : 'text-zinc-700 dark:text-zinc-300'}`}>
                {item}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default ChecklistCard;
