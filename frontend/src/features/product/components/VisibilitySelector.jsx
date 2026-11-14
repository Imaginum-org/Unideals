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
        "relative overflow-hidden p-4 transition-colors sm:p-6",
        // Soft blush wash, a touch stronger once Girls Corner is on.
        "bg-gradient-to-br",
        shown
          ? "border-pink-200 from-pink-50/70 via-white to-rose-100/60 dark:border-pink-900/50 dark:from-pink-950/25 dark:via-[#1A1D20] dark:to-rose-950/30"
          : "from-white via-white to-pink-50/70 dark:from-[#1A1D20] dark:via-[#1A1D20] dark:to-pink-950/20",
      )}
    >
      {/* Decorative petals and glow: subtle, behind content, ignored by screen readers. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 select-none">
        <div className="absolute -right-10 -top-12 h-40 w-40 rounded-full bg-pink-200/30 blur-3xl dark:bg-pink-500/10" />
        <div className="absolute -bottom-14 left-1/3 h-32 w-32 rounded-full bg-rose-200/25 blur-3xl dark:bg-rose-500/10" />
        <span className="absolute bottom-2 right-4 rotate-12 text-2xl opacity-[0.12] sm:text-3xl">🌸</span>
        <span className="absolute bottom-9 right-14 -rotate-12 text-sm opacity-[0.10]">🌸</span>
        <span className="absolute right-24 top-3 text-xs text-pink-400 opacity-40">✦</span>
      </div>
      <div className="relative flex items-start justify-between gap-4">
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
      {/* Points stacked vertically, one line each. */}
      <ul className="relative mt-4 flex flex-col gap-2">
        {[
          "Seen only by girls on your campus",
          "Invisible to boys in feed, search & chat",
          "Zero “hii, still available?” from boys 💅",
        ].map((t) => (
          <li key={t} className="flex min-w-0 items-start gap-2 text-[12.5px] leading-snug text-slate-600 sm:items-center sm:whitespace-nowrap dark:text-zinc-300">
            <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-pink-500 sm:mt-0" strokeWidth={3} aria-hidden="true" />
            {t}
          </li>
        ))}
      </ul>
      {lockedByCategory && (
        <p className="relative mt-3 text-[12.5px] font-semibold text-pink-700 dark:text-pink-300">
          Always on: this category is Girls-only.
        </p>
      )}
    </section>
  );
}
