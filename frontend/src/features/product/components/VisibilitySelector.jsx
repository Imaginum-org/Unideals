import { useEffect } from "react";
import { Check } from "lucide-react";
import useProductListing from "../hooks/useProductListing";
import { useUser } from "../../../context/useUserContext.jsx";
import { GIRLS_ONLY_CATEGORIES } from "../constants/productOptions.js";
import { CARD, FLUSH_ON_PHONE, Switch } from "./listing/ListingKit.jsx";
import { cn } from "../../../utils/cn.js";

/**
 * Girls Corner 🌸 visibility toggle, "List this only for Girls".
 * Rendered ONLY in the listing flow for logged-in female + admin sellers
 * (zero hint to anyone else). Backed by formData.isGirlsOnly.
 */
export default function VisibilitySelector() {
  const { formData, updateField } = useProductListing();
  const { userDetails, isLoggedIn } = useUser();

  const eligible = isLoggedIn && (userDetails?.gender === "female" || userDetails?.role === "admin");
  const on = Boolean(formData.isGirlsOnly);
  // Girls-only categories lock Girl-only ON; the seller is told why.
  const lockedByCategory = GIRLS_ONLY_CATEGORIES.includes(formData.category);
  const shown = lockedByCategory || on;

  // Belt-and-braces: a girls-only category always carries Girl-only ON,
  // even for drafts created before this rule existed. (Hooks run before the
  // eligibility early-return: calling them conditionally broke React's
  // rules of hooks when eligibility changed mid-session.)
  useEffect(() => {
    if (eligible && lockedByCategory && !on) updateField("isGirlsOnly", true);
  }, [eligible, lockedByCategory, on, updateField]);

  if (!eligible) return null;

  return (
    <section
      aria-label="Girls Corner visibility"
      className={cn(
        CARD,
        FLUSH_ON_PHONE,
        "p-4 transition-colors sm:p-6",
        shown && "border-pink-200 bg-pink-50/60 dark:border-pink-900/50 dark:bg-pink-950/20",
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <span aria-hidden="true" className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-pink-100 text-base dark:bg-pink-950">
            🌸
          </span>
          <div className="min-w-0">
            <h2 className="text-[16px] font-semibold tracking-tight text-slate-900 sm:text-[17px] dark:text-white">Girls Corner</h2>
            <p className="mt-0.5 text-[13px] text-slate-500 dark:text-zinc-400">List this only for girls on your campus.</p>
          </div>
        </div>
        <Switch
          checked={shown}
          onChange={(next) => !lockedByCategory && updateField("isGirlsOnly", next)}
          disabled={lockedByCategory}
          label="List this only for Girls"
          tone="pink"
        />
      </div>
      <ul className="mt-4 grid gap-2 sm:grid-cols-3">
        {[
          "Only girls on your campus can see it.",
          "Hidden from boys in home, search and chat.",
          "Boys can never start a chat on it.",
        ].map((t) => (
          <li key={t} className="flex items-start gap-2 text-[12.5px] leading-relaxed text-slate-600 dark:text-zinc-300">
            <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-pink-500" strokeWidth={3} aria-hidden="true" />
            {t}
          </li>
        ))}
      </ul>
      {lockedByCategory && (
        <p className="mt-3 text-[12.5px] font-semibold text-pink-700 dark:text-pink-300">
          Always on: this category is Girls-only.
        </p>
      )}
    </section>
  );
}
