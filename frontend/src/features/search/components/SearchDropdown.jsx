import { Link } from "react-router-dom";
import { useEffect, useRef } from "react";

const SearchDropdown = ({
  results,
  loading,
  query,
  mobile = false,
  hasSearched,
  onSelect,
  selectedIndex,
  setSelectedIndex,
}) => {
  if (!query) return null;

  const highlightText = (text, query) => {
    if (!query) return text;

    const regex = new RegExp(`(${query})`, "gi");
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
  };

  const itemRefs = useRef([]);

  useEffect(() => {
    if (selectedIndex >= 0) {
      itemRefs.current[selectedIndex]?.scrollIntoView({
        block: "nearest",
        behavior: "smooth",
      });
    }
  }, [selectedIndex]);

  return (
    <div
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
        {/* Loading */}
        {loading && (
          <div className="p-4 text-sm text-gray-500 dark:text-neutral-400">
            Searching...
          </div>
        )}

        {/* Empty State */}
        {!loading && hasSearched && results.length === 0 && (
          <div className="p-4 text-sm text-gray-500 dark:text-neutral-400">
            No results found for "{query}"
          </div>
        )}

        {/* Results */}
        {!loading &&
          (mobile ? results : results.slice(0, 5)).map((item, index) => (
            <Link
              ref={(el) => (itemRefs.current[index] = el)}
              key={item._id}
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

${mobile ? "px-4 py-4" : "px-3 py-3"}
`}
            >
              <img
                src={item.images?.[0] || "/placeholder.png"}
                alt={item.title}
                className={
                  mobile
                    ? "h-14 w-14 rounded-xl object-cover"
                    : "h-10 w-10 rounded-md object-cover"
                }
              />

              <div className="flex flex-col">
                <span className="text-sm font-medium text-black dark:text-white">
                  {highlightText(item.title, query)}
                </span>

                <span className="text-xs text-gray-500 dark:text-neutral-400">
                  {highlightText(item.category, query)}
                </span>
              </div>
            </Link>
          ))}

        {/* View All */}
        {!loading && results.length > 0 && (
          <Link
            to={`/search?q=${query}`}
            onClick={() => onSelect?.()}
            className={`
              block
              text-center
              font-medium
              text-blue-500
              ${
                mobile
                  ? "px-4 py-5"
                  : "p-3 hover:bg-neutral-50 dark:hover:bg-neutral-900"
              }
            `}
          >
            See all results
          </Link>
        )}
      </div>
    </div>
  );
};

export default SearchDropdown;
