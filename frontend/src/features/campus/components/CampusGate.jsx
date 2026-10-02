import { memo, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { GrLocation } from "react-icons/gr";
import { Check, Search, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useCampus } from "../../../context/CampusContext.jsx";
import { useUser } from "../../../context/useUserContext.jsx";
import { logoutUser } from "../../auth/api/authApi.js";

/**
 * CampusGate — logged-in onboarding takeover.
 *
 * Rendered by MainLayout instead of page content when a logged-in user has
 * no campus (new + legacy accounts). One screen, two taps, asked once.
 * Guests never see this — they browse the default campus freely.
 */
const CampusGate = memo(function CampusGate() {
  const {
    campuses,
    directoryLoading,
    selectCampus,
    saving,
  } = useCampus();
  const { userDetails, clearUserData } = useUser();
  const navigate = useNavigate();

  const [selectedSlug, setSelectedSlug] = useState(null);
  const [query, setQuery] = useState("");
  const [error, setError] = useState(null);
  const [done, setDone] = useState(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return campuses;
    return campuses.filter((c) =>
      `${c.name} ${c.short_name} ${c.city || ""} ${c.state || ""}`
        .toLowerCase()
        .includes(q),
    );
  }, [campuses, query]);

  const handleContinue = async () => {
    if (!selectedSlug || saving) return;
    setError(null);
    const result = await selectCampus(selectedSlug);
    if (result.ok) {
      const picked = campuses.find((c) => c.slug === selectedSlug);
      setDone({
        name: picked?.short_name || picked?.name || "your campus",
        movedListings: result.movedListings,
      });
      // Gate unmounts itself once context flips; pause for the success beat.
      window.setTimeout(() => setDone(null), 1600);
    } else {
      setError(result.message);
    }
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
    } catch {
      // Session cleanup happens regardless
    }
    clearUserData();
    navigate("/login", { replace: true });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="min-h-screen w-full bg-[#F7F9FD] font-figtree dark:bg-[#131313]"
    >
      <div className="mx-auto flex min-h-screen w-full max-w-[560px] flex-col items-center justify-center px-6 py-10">
        {/* Brand */}
        <div className="flex items-center gap-2">
          <img src="/logo.svg" alt="Unideals" className="h-10 w-10 object-cover" />
          <span className="text-2xl font-semibold text-black dark:text-white">
            Unideals
          </span>
        </div>

        <h1 className="mt-6 text-center text-2xl font-bold text-[#0F172A] dark:text-white sm:text-3xl">
          {`Welcome${userDetails?.name ? `, ${userDetails.name.split(" ")[0]}` : ""} 🎓`}
        </h1>
        <p className="mt-2 text-center text-sm text-[#64748B] dark:text-slate-300 sm:text-base">
          Pick your campus to see what&apos;s selling around you.
        </p>

        {/* Search (scales to N colleges) */}
        <div className="relative mt-6 w-full">
          <Search
            size={16}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-[#94A3B8]"
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search campuses..."
            aria-label="Search campuses"
            className="h-12 w-full rounded-xl border border-[#E2E8F0] bg-white pl-11 pr-4 text-sm text-[#0F172A] outline-none transition placeholder:text-[#94A3B8] focus:border-[#3838EC] focus:ring-4 focus:ring-[#3838EC]/10 dark:border-0 dark:bg-[#1A1D20] dark:text-white"
          />
        </div>

        {/* Campus cards */}
        <div className="mt-4 grid w-full grid-cols-1 gap-3 sm:grid-cols-2">
          {directoryLoading ? (
            <>
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-[76px] animate-pulse rounded-2xl bg-gray-200 dark:bg-zinc-800"
                />
              ))}
            </>
          ) : filtered.length === 0 ? (
            <p className="col-span-full rounded-2xl border border-[#E2E8F0] bg-white px-4 py-6 text-center text-sm text-[#64748B] dark:border-0 dark:bg-[#1A1D20] dark:text-slate-300">
              {campuses.length === 0
                ? "Campuses are loading. Please check your connection and retry."
                : `No campus matches "${query}".`}
            </p>
          ) : (
            filtered.map((c) => {
              const active = selectedSlug === c.slug;
              return (
                <button
                  key={c.slug}
                  type="button"
                  onClick={() => setSelectedSlug(c.slug)}
                  aria-pressed={active}
                  className={`flex items-center gap-3 rounded-2xl border-2 p-4 text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4F46E5] focus-visible:ring-offset-2 active:scale-[0.98] ${
                    active
                      ? "border-[#4F46E5] bg-[#EEF0FF] shadow-[0_0_0_3px_rgba(79,70,229,0.15)] dark:bg-[#1A1D20]"
                      : "border-[#E2E8F0] bg-white hover:border-[#C7D2FE] dark:border-0 dark:bg-[#1A1D20]"
                  }`}
                >
                  <span
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-lg font-bold ${
                      active
                        ? "bg-[#4F46E5] text-white"
                        : "bg-[#EEF0FF] text-[#4F46E5] dark:bg-zinc-800"
                    }`}
                  >
                    {c.short_name?.charAt(0) || c.name.charAt(0)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-bold text-[#0F172A] dark:text-white">
                      {c.name}
                    </span>
                    <span className="mt-0.5 flex items-center gap-1 text-xs text-[#64748B] dark:text-slate-400">
                      <GrLocation className="size-3 shrink-0" />
                      <span className="truncate">
                        {[c.city, c.state].filter(Boolean).join(", ") || "India"}
                      </span>
                    </span>
                  </span>
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                      active
                        ? "border-[#4F46E5] bg-[#4F46E5] text-white"
                        : "border-[#CBD5E1] text-transparent dark:border-zinc-700"
                    }`}
                  >
                    <Check size={14} strokeWidth={3} />
                  </span>
                </button>
              );
            })
          )}
        </div>

        {error && (
          <p className="mt-4 w-full rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600 ring-1 ring-red-100 dark:bg-red-950/20 dark:text-red-300 dark:ring-red-900/40">
            {error}
          </p>
        )}

        {done && (
          <motion.p
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mt-4 w-full rounded-xl bg-emerald-50 px-4 py-3 text-center text-sm font-semibold text-emerald-700 ring-1 ring-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-300 dark:ring-emerald-900/40"
          >
            You&apos;re in! Showing {done.name} marketplace
            {done.movedListings > 0 &&
              ` · ${done.movedListings} of your listing${done.movedListings > 1 ? "s" : ""} moved here`}
          </motion.p>
        )}

        <button
          type="button"
          onClick={handleContinue}
          disabled={!selectedSlug || saving || done}
          className="mt-6 w-full rounded-xl bg-[#3938EC] py-3.5 text-sm font-semibold text-white transition hover:bg-[#2829D8] focus:outline-none focus:ring-4 focus:ring-[#3938EC]/25 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? "Setting your campus..." : "Continue"}
        </button>

        <div className="mt-4 flex items-center gap-4 text-xs text-[#64748B] dark:text-slate-400">
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-1.5 font-medium transition hover:text-[#3938EC]"
          >
            <LogOut size={13} />
            Log out
          </button>
        </div>
      </div>
    </motion.div>
  );
});

export default CampusGate;
