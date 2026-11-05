import React from 'react';
import { ShieldAlert } from 'lucide-react';

const SafetyTipCard = ({ safetyTips }) => {
  const tips = Array.isArray(safetyTips) ? safetyTips : safetyTips?.tips || [];
  const topic = safetyTips?.topic || "Safety Guide";

  if (!tips.length) return null;

  return (
    <div className="mt-3 w-full rounded-lg border border-amber-200 bg-amber-50 p-4 shadow-sm dark:border-amber-800 dark:bg-amber-950/30">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-amber-900 dark:text-amber-500 flex items-center gap-2">
          <span>🛡️</span> Safety Tips
        </h3>
        {topic && (
          <span className="rounded-full bg-amber-100/80 px-2 py-1 text-[11px] font-bold text-amber-700 capitalize dark:bg-amber-900/50 dark:text-amber-400">
            {topic}
          </span>
        )}
      </div>

      <ul className="space-y-2">
        {tips.map((tip, index) => (
          <li key={index} className="flex items-start gap-2 text-xs text-amber-800 dark:text-amber-200">
            <ShieldAlert className="h-3.5 w-3.5 shrink-0 mt-0.5 text-amber-600 dark:text-amber-500" />
            <span className="leading-relaxed">{tip}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default SafetyTipCard;
