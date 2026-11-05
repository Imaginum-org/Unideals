import { useEffect } from "react";
import useProductListing from "../hooks/useProductListing";
import { useUser } from "../../../context/useUserContext.jsx";
import { GIRLS_ONLY_CATEGORIES } from "../constants/productOptions.js";

/**
 * Girls Corner 🌸 step-1 visibility toggle — "List this only for Girls".
 * Rendered ONLY in the /upload creation flow for logged-in female +
 * admin sellers (zero hint to anyone else).
 * Same switch as Negotiation (PricingStep), only color (pink) + text differ.
 * Backed by formData.isGirlsOnly.
 */
export default function VisibilitySelector() {
  const { formData, updateField } = useProductListing();
  const { userDetails, isLoggedIn } = useUser();

  const role = userDetails?.role ?? null;
  const eligible =
    isLoggedIn &&
    (userDetails?.gender === "female" || role === "admin");
  if (!eligible) return null;

  const on = Boolean(formData.isGirlsOnly);
  // Girls-only categories lock Girl-only ON — the seller is told why.
  const lockedByCategory = GIRLS_ONLY_CATEGORIES.includes(formData.category);
  const shown = lockedByCategory || on;

  // Belt-and-braces: a girls-only category always carries Girl-only ON,
  // even for drafts created before this rule existed.
  useEffect(() => {
    if (lockedByCategory && !on) updateField("isGirlsOnly", true);
  }, [lockedByCategory, on, updateField]);

  return (
    <section
      aria-label="Girls Corner visibility"
      className={`relative mt-4 w-full overflow-hidden rounded-2xl p-5 transition-colors duration-300 ${
        shown
          ? "bg-gradient-to-br from-[#FCE7F3] via-[#FDF2F8] to-[#FCE7F3] shadow-[0_14px_36px_-20px_rgba(236,72,153,0.55)] dark:from-pink-950/50 dark:via-[#1c1c1c] dark:to-pink-950/30"
          : "bg-gradient-to-br from-[#FDF2F8] to-[#F9FAFB] shadow-[0_10px_28px_-22px_rgba(236,72,153,0.4)] dark:from-pink-950/20 dark:to-[#1c1c1c]"
      }`}
    >
      {/* soft glow blob, decorative */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-pink-200/40 blur-2xl dark:bg-pink-500/10"
      />
      <div className="relative flex items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h3 className="flex items-center gap-2 text-base font-semibold text-[#111827] dark:text-white">
            <span
              aria-hidden="true"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-base shadow-sm dark:bg-pink-950"
            >
              🌸
            </span>
            Girls Corner
          </h3>
          <p className="mt-1.5 text-sm text-[#6B7280] dark:text-zinc-400">
            List this only for Girls
          </p>
          <ul className="mt-2 max-w-xl list-disc space-y-1 pl-5 text-xs leading-6 text-zinc-500 marker:text-pink-400 dark:text-zinc-400">
            <li>Only girls in your campus can see this.</li>
            <li>Hidden from boys everywhere: home, search, category and chat.</li>
            <li>No message spam. Boys can&apos;t start a chat on this, ever.</li>
            {lockedByCategory && (
              <li className="font-semibold text-[#9D174D] dark:text-pink-300">
                Locked ON — this category is Girls-only.
              </li>
            )}
          </ul>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={shown}
          aria-label="List this only for Girls"
          onClick={() => {
            if (!lockedByCategory) updateField("isGirlsOnly", !on);
          }}
          disabled={lockedByCategory}
          title={lockedByCategory ? "Always on for Girls-only categories" : undefined}
          className={`relative w-[56px] h-[32px] rounded-full transition-all duration-300

      ${shown ? "bg-[#EC4899]" : "bg-[#D1D5DB]"}`}
        >
          <div
            className={`absolute left-0 top-1 w-6 h-6 rounded-full bg-[#F7F8FA] transition-all duration-300

          ${shown ? "translate-x-7" : "translate-x-1"}`}
          />
        </button>
      </div>
    </section>
  );
}
