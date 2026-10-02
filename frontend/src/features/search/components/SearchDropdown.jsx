import { Link } from "react-router-dom";
import { useEffect, useRef } from "react";
import { ikFirstThumb } from "../../../Utils/imageTransform.js";

const INR = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const SearchDropdown = ({
  results = [],
  total,
  matchedCategories = [],
  trending = [],
  recentSearches = [],
  onClearRecents,
  loading,
  query,
  mobile = false,
  hasSearched,
  onSelect,
  selectedIndex,
  setSelectedIndex,
}) => {
  const showEmptyState = !query;

  const itemRefs = useRef([]);

  useEffect(() => {
    if (selectedIndex >= 0) {
      itemRefs.current[selectedIndex]?.scrollIntoView({
        block: "nearest",
        behavior: "smooth",
      });
    }
  }, [selectedIndex]);

  if (!query && trending.length === 0 && recentSearches.length === 0) {
    return null;
  }
  if (query && !loading && !hasSearched) return null;

  const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  const highlightText = (text, query) => {
    if (!query || typeof text !== "string") return text;

    try {
      const safeQuery = escapeRegExp(query.slice(0, 100));
      const regex = new RegExp(`(${safeQuery})`, "gi");
      const parts = text.split(regex);

      return parts.map((part, index) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <span key={index} className="font-semibold text-blue-500">
            {part}
          </span>
        ) : (
          part
        ),
      );
    } catch {
      return text;
    }
  };

  const visibleProducts = mobile ? results : results.slice(0, 5);

  const productRow = (item, index) => (
    <Link
      ref={(el) => (itemRefs.current[index] = el)}
      key={item._id}
      role="option"
      aria-selected={selectedIndex === index}
      to={`/product/${item._id}`}
      onClick={() => onSelect?.()}
      onMouseEnter={() => setSelectedIndex(index)}
      className={`
flex
items-center
gap-3
transition-colors
duration-150

${
  selectedIndex === index
    ? "bg-blue-100 dark:bg-blue-950/30"
    : mobile
      ? "active:bg-neutral-100 dark:active:bg-neutral-800"
      : "hover:bg-neutral-100 dark:hover:bg-neutral-800"
}

${mobile ? "px-4 py-3" : "px-3 py-2.5"}
`}
    >
      <img
        src={ikFirstThumb(item.images?.[0])}
        alt={item.title || "Product"}
        loading="lazy"
        className={
          mobile
            ? "h-12 w-12 rounded-xl object-cover shrink-0"
            : "h-10 w-10 rounded-md object-cover shrink-0"
        }
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm font-medium text-black dark:text-white">
          {highlightText(item.title, query)}
        </span>

        <span className="mt-0.5 flex items-center gap-2 text-xs">
          {item.selling_price != null && (
            <span className="font-bold text-[#394FF1]">
              {INR.format(item.selling_price)}
            </span>
          )}
          {item.category && (
            <span className="rounded-full bg-neutral-100 px-2 py-0.5 capitalize text-gray-500 dark:bg-neutral-800 dark:text-neutral-400">
              {item.category.replace(/_/g, " ")}
            </span>
          )}
          {item.is_boosted && (
            <span
              className="size-1.5 rounded-full bg-amber-400"
              title="Boosted"
            />
          )}
        </span>
      </div>
    </Link>
  );

  return (
    <div
      role="listbox"
      aria-label={showEmptyState ? "Trending and recent searches" : "Search suggestions"}
      className={
        mobile
          ? `
            min-h-full
            bg-white
            dark:bg-[#131313]
            pb-24
          `
          : `
            absolute
            left-0
            top-full
            z-50
            mt-2
            w-full
            overflow-hidden
            rounded-2xl
            border
            border-neutral-200
            bg-white
            shadow-2xl
            dark:border-neutral-800
            dark:bg-[#1A1D20]
          `
      }
    >
      {/* Scroll Container */}
      <div className={mobile ? "min-h-full" : "max-h-[400px] overflow-y-auto"}>
        {/* Loading skeletons */}
        {loading && (
          <div className="p-3" aria-hidden="true">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex animate-pulse items-center gap-3 px-1 py-2.5">
                <div className="h-10 w-10 shrink-0 rounded-md bg-neutral-200 dark:bg-neutral-800" />
                <div className="flex-1">
                  <div className="h-3 w-3/4 rounded bg-neutral-200 dark:bg-neutral-800" />
                  <div className="mt-1.5 h-2.5 w-1/3 rounded bg-neutral-100 dark:bg-neutral-800/70" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty-query state: recents + trending */}
        {!loading && showEmptyState && (
          <>
            {recentSearches.length > 0 && (
              <div className="px-3 pb-1 pt-3">
                <div className="mb-1 flex items-center justify-between px-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                    Recent
                  </span>
                  <button
                    onClick={onClearRecents}
                    className="text-[11px] font-semibold text-blue-500 hover:underline"
                  >
                    Clear
                  </button>
                </div>
                {recentSearches.map((term) => (
                  <Link
                    key={term}
                    to={`/search?q=${encodeURIComponent(term)}`}
                    onClick={() => onSelect?.()}
                    className="block truncate rounded-lg px-2 py-2 text-sm text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
                  >
                    {term}
                  </Link>
                ))}
              </div>
            )}
            {trending.length > 0 && (
              <div className="px-3 pb-2 pt-2">
                <div className="mb-1 px-1 text-[11px] font-bold uppercase tracking-wider text-gray-400">
                  Trending on campus
                </div>
                {trending.slice(0, 4).map((item, index) => (
                  <div key={item._id}>{productRow(item, 100 + index)}</div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Category shortcut chips */}
        {!loading &&
          !showEmptyState &&
          matchedCategories.length > 0 && (
            <div className="flex flex-wrap gap-2 px-3 pb-1 pt-3">
              {matchedCategories.map((cat) => (
                <Link
                  key={cat.value}
                  to={`/category/${cat.value}`}
                  onClick={() => onSelect?.()}
                  className="rounded-full bg-[#394FF1]/10 px-3 py-1.5 text-xs font-bold text-[#394FF1] transition hover:bg-[#394FF1]/20"
                >
                  in {cat.label} →
                </Link>
              ))}
            </div>
          )}

        {/* Empty State */}
        {!loading && !showEmptyState && hasSearched && results.length === 0 && (
          <div className="p-4 text-sm text-gray-500 dark:text-neutral-400">
            No results found for "{query}". Try a different spelling or browse
            trending below.
          </div>
        )}

        {/* Results */}
        {!loading && !showEmptyState && visibleProducts.map((item, index) => productRow(item, index))}

        {/* View All */}
        {!loading && !showEmptyState && results.length > 0 && (
          <Link
            to={`/search?q=${encodeURIComponent(query)}`}
            onClick={() => onSelect?.()}
            className={`
              block
              text-center
              text-sm
              font-semibold
              text-blue-500
              ${
                mobile
                  ? "px-4 py-5"
                  : "p-3 hover:bg-neutral-50 dark:hover:bg-neutral-900"
              }
            `}
          >
            See all {typeof total === "number" ? `${total} ` : ""}results for
            "{query.length > 30 ? `${query.slice(0, 30)}…` : query}"
          </Link>
        )}
      </div>
    </div>
  );
};

export default SearchDropdown;
