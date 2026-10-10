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
      <div className="flex min-h-[70vh] flex-col items-center justify-center bg-[#F7F8FA] px-6 py-16 text-center font-figtree dark:bg-[#131313]">
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#394FF1]">
          404
        </p>
        <h1 className="mt-3 text-2xl font-bold text-[#0F172A] dark:text-white sm:text-3xl">
          This page wandered off campus
        </h1>
        <p className="mt-2 max-w-md text-sm leading-6 text-gray-500 dark:text-gray-400">
          The link you followed may be broken, or the page may have been
          removed. Try searching or head back home.
        </p>

        <form
          onSubmit={handleSearch}
          className="mt-6 flex w-full max-w-md gap-2"
        >
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search products…"
              maxLength={100}
              aria-label="Search products"
              className="h-11 w-full rounded-xl border border-transparent bg-[#F7F8FA] pl-9 pr-3 text-sm text-[#111827] outline-none transition placeholder:text-gray-500/60 focus:border-[#393AF2] focus:bg-[#F7F8FA] focus:ring-4 focus:ring-[#393AF2]/10 dark:bg-[#1A1D20] dark:text-white"
            />
          </div>
          <button
            type="submit"
            className="h-11 shrink-0 rounded-xl bg-[#393AF2] px-5 text-sm font-semibold text-white transition hover:bg-[#2829D8]"
          >
            Search
          </button>
        </form>

        <Link
          to="/"
          className="mt-4 inline-flex items-center gap-2 rounded-xl border border-zinc-200 px-5 py-2.5 text-sm font-semibold text-zinc-700 transition hover:border-[#394FF1] hover:text-[#394FF1] dark:border-zinc-700 dark:text-zinc-200"
        >
          <Home className="size-4" />
          Back to Home
        </Link>
      </div>
    </>
  );
}
