import { Check, Lock, Sparkles } from "lucide-react";
import { useLabs } from "../../../services/labs.js";

const PLAN_LABEL = { pro: "Pro", pro_plus: "Pro Plus" };

/**
 * "Early access" (Unideals Labs) on the Subscription page: every beta
 * feature, whether this plan has it, and which plan unlocks it.
 */
export default function EarlyAccessCard() {
  const { labs, loading } = useLabs();
  if (loading || labs.length === 0) return null;
  const enabledCount = labs.filter((f) => f.enabled).length;

  return (
    <section className="rounded-2xl border border-[#E3E8F1] bg-[#F7F8FA] p-5 shadow-[0_8px_26px_rgba(15,23,42,0.04)] dark:border-gray-800 dark:bg-[#1c1c1c]">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-[14px] font-extrabold text-[#09111F] dark:text-white">
          <Sparkles size={15} className="text-[#4A3CFF]" />
          Early access
        </h2>
        <span className="text-[11px] font-semibold text-[#6B7280] dark:text-gray-400">
          {enabledCount === 0 ? "None on your plan" : enabledCount === labs.length ? "Full access" : "Limited access"}
        </span>
      </div>
      <ul className="space-y-3">
        {labs.map((f) => (
          <li key={f.key} className="flex items-start gap-3">
            <span
              className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                f.enabled ? "bg-[#4A3CFF] text-white" : "bg-[#E9EBF1] text-[#9AA3B2] dark:bg-white/10"
              }`}
            >
              {f.enabled ? <Check size={11} strokeWidth={3} /> : <Lock size={10} />}
            </span>
            <div className="min-w-0">
              <p className="text-[12.5px] font-bold text-[#09111F] dark:text-white">
                {f.name}
                {!f.enabled && (
                  <span className="ml-2 rounded-full bg-[#F0EEFF] px-1.5 py-px text-[10px] font-bold text-[#4A3CFF]">
                    {PLAN_LABEL[f.minTier] || "Paid"}
                  </span>
                )}
              </p>
              <p className="mt-0.5 text-[11.5px] leading-5 text-[#6B7280] dark:text-gray-400">{f.description}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
