import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, Home } from "lucide-react";
import Seo from "./Seo.jsx";

export default function NotFound() {
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  const handleSearch = (e) => {
    e.preventDefault();
    const q = query.trim().slice(0, 100);
    if (q) navigate(`/search?q=${encodeURIComponent(q)}`);
  };

  return (
    <>
      <Seo title="Page not found — Unideals" robots="noindex,nofollow" />
      <div className="relative flex min-h-[100dvh] w-full flex-col items-center justify-center overflow-hidden bg-[#F7F8FA] px-6 py-16 text-center font-figtree dark:bg-[#131313]">
        {/* Campus-marketplace dressing: two bags on a diagonal balance */}
        <img
          src="/bag_banner.webp"
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute right-[4%] top-[7%] z-0 w-32 rotate-[10deg] object-contain sm:w-52 lg:w-64 xl:w-72"
        />
        <img
          src="/bag_banner.webp"
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute bottom-[9%] left-[5%] z-0 w-28 -rotate-[8deg] object-contain sm:w-44 lg:w-56"
        />

        <div className="relative z-[1] w-full max-w-lg">
          <p
            aria-hidden="true"
            className="mt-2 bg-gradient-to-b from-[#2E4BFF] via-[#5C6DFF] to-[#B9C0FF] bg-clip-text text-[7rem] font-extrabold leading-none tracking-tight text-transparent drop-shadow-[0_18px_36px_rgba(46,75,255,0.25)] sm:text-[9rem] dark:from-[#8FA2FF] dark:via-[#5C6DFF] dark:to-[#2E4BFF]"
          >
            404
          </p>

          <h1 className="mt-1 text-2xl font-bold text-[#0F172A] dark:text-white sm:text-3xl">
            This page wandered off campus
          </h1>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-500 dark:text-gray-400">
            The link you followed may be broken, or the page may have been
            removed. Try searching or head back home.
          </p>

          <form
            onSubmit={handleSearch}
            className="mx-auto mt-7 flex w-full max-w-md gap-2 rounded-2xl border border-[#ECEEF3] bg-white p-2 shadow-[0_18px_44px_-18px_rgba(23,27,80,0.25)] dark:border-neutral-800 dark:bg-[#1A1D20] dark:shadow-[0_18px_44px_-18px_rgba(0,0,0,0.7)]"
          >
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search products…"
                maxLength={100}
                aria-label="Search products"
                className="h-11 w-full rounded-xl bg-transparent pl-10 pr-3 text-sm text-[#111827] outline-none transition placeholder:text-gray-500/60 dark:text-white"
              />
            </div>
            <button
              type="submit"
              className="h-11 shrink-0 rounded-xl bg-[#393AF2] px-5 text-sm font-semibold text-white transition hover:bg-[#2829D8] active:scale-95"
            >
              Search
            </button>
          </form>

          <Link
            to="/"
            className="mt-4 inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white/60 px-5 py-2.5 text-sm font-semibold text-zinc-700 transition hover:border-[#394FF1] hover:text-[#394FF1] active:scale-95 dark:border-zinc-700 dark:bg-white/5 dark:text-zinc-200"
          >
            <Home className="size-4" />
            Back to Home
          </Link>
        </div>
      </div>
    </>
  );
}
