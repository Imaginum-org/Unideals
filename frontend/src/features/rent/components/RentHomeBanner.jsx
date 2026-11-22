import { Link } from "react-router-dom";
import { ArrowRight, Handshake } from "lucide-react";
import { useUser } from "../../../context/useUserContext.jsx";
import { useRentConfig } from "../hooks/useRentConfig.js";

/** Home page entry to Rent & Borrow. Renders nothing while the feature is off. */
export default function RentHomeBanner() {
  const { enabled } = useRentConfig();
  const { isLoggedIn } = useUser();
  if (!enabled) return null;
  return (
    <Link
      to={isLoggedIn ? "/rent" : "/login"}
      state={isLoggedIn ? undefined : { from: "/rent" }}
      className="group mx-auto mt-4 flex w-full max-w-[var(--page-max)] items-center gap-3 rounded-2xl border border-[var(--accent-ring)] bg-gradient-to-r from-[var(--accent-soft)] to-white px-4 py-3.5 font-figtree transition-shadow hover:shadow-md sm:gap-4 sm:px-5 lg:mt-8 dark:to-[#1A1D20]"
    >
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--accent)] text-white sm:h-11 sm:w-11">
        <Handshake className="h-5 w-5" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-semibold text-slate-900 sm:text-[16px] dark:text-white">Need something tonight?</span>
        <span className="block truncate text-[12.5px] text-slate-600 sm:text-[13.5px] dark:text-zinc-300">
          Rent & Borrow: an iron, a racket or Maggie from someone in your block.
        </span>
      </span>
      <ArrowRight className="h-5 w-5 shrink-0 text-[var(--accent-text)] transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
    </Link>
  );
}
