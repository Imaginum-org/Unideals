import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { PRODUCT_CONDITION_OPTIONS } from "../../constants/productOptions.js";

/**
 * Single source of truth for browse filters on Explore, Category and
 * Search. Everything lives in the URL (shareable links, back/forward safe):
 *
 *   ?condition=like_new,gently_used   multi-select
 *   ?min=500&max=2000                 price (either side optional)
 *   ?posted=1|7|30                    posted within N days
 *   ?offers=1                         open to offers only
 *   ?sort=…                           page-specific sort keys
 *
 * `preserve` lists params a "Clear all" must keep (tab, q, category…).
 */

export const POSTED_OPTIONS = [
  { value: "", label: "Any time" },
  { value: "1", label: "Last 24 hours" },
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
];

const CONDITION_VALUES = new Set(PRODUCT_CONDITION_OPTIONS.map((c) => c.value));
const POSTED_VALUES = new Set(POSTED_OPTIONS.map((p) => p.value).filter(Boolean));

const toPrice = (raw) => {
  if (raw === null || raw === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : null;
};

export const formatINR = (n) => `₹${Number(n).toLocaleString("en-IN")}`;

export default function useBrowseFilters({ sortOptions, defaultSort, preserve = [] }) {
  const [params, setParams] = useSearchParams();

  const rawCondition = params.get("condition") || "";
  const rawMin = params.get("min");
  const rawMax = params.get("max");
  const rawPosted = params.get("posted") || "";
  const rawSort = params.get("sort") || "";

  const conditions = useMemo(
    () => [...new Set(rawCondition.split(",").filter((c) => CONDITION_VALUES.has(c)))],
    [rawCondition],
  );
  let minPrice = toPrice(rawMin);
  let maxPrice = toPrice(rawMax);
  // A reversed range from a hand-edited URL is swapped, never an error.
  if (minPrice != null && maxPrice != null && minPrice > maxPrice) {
    [minPrice, maxPrice] = [maxPrice, minPrice];
  }
  const posted = POSTED_VALUES.has(rawPosted) ? rawPosted : "";
  const offersOnly = params.get("offers") === "1";
  const sort = sortOptions.some((o) => o.value === rawSort) ? rawSort : defaultSort;

  const update = useCallback(
    (updates) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          for (const [key, value] of Object.entries(updates)) {
            if (value === "" || value === null || value === undefined || value === false) next.delete(key);
            else next.set(key, String(value));
          }
          next.delete("page");
          return next;
        },
        { replace: true },
      );
    },
    [setParams],
  );

  const setConditions = (list) => update({ condition: list.join(",") });
  const toggleCondition = (value) =>
    setConditions(conditions.includes(value) ? conditions.filter((c) => c !== value) : [...conditions, value]);
  const setPrice = (lo, hi) => {
    let a = lo == null || lo === "" ? null : Math.max(0, Math.round(Number(lo)));
    let b = hi == null || hi === "" ? null : Math.max(0, Math.round(Number(hi)));
    if (a != null && b != null && a > b) [a, b] = [b, a];
    update({ min: a ?? "", max: b ?? "" });
  };
  const setPosted = (value) => update({ posted: value });
  const setOffersOnly = (on) => update({ offers: on ? "1" : "" });
  const setSort = (value) => update({ sort: value === defaultSort ? "" : value });

  const clearAll = () => {
    setParams(
      (prev) => {
        const next = new URLSearchParams();
        for (const key of preserve) {
          const v = prev.get(key);
          if (v) next.set(key, v);
        }
        return next;
      },
      { replace: true },
    );
  };

  const hasPrice = minPrice != null || maxPrice != null;
  const activeCount = conditions.length + (hasPrice ? 1 : 0) + (posted ? 1 : 0) + (offersOnly ? 1 : 0);

  const priceLabel = hasPrice
    ? minPrice != null && maxPrice != null
      ? `${formatINR(minPrice)} – ${formatINR(maxPrice)}`
      : minPrice != null
        ? `Over ${formatINR(minPrice)}`
        : `Under ${formatINR(maxPrice)}`
    : "";

  const chips = [
    ...conditions.map((c) => ({
      key: `condition-${c}`,
      label: PRODUCT_CONDITION_OPTIONS.find((o) => o.value === c)?.label || c,
      onRemove: () => toggleCondition(c),
    })),
    hasPrice && { key: "price", label: priceLabel, onRemove: () => setPrice(null, null) },
    posted && {
      key: "posted",
      label: POSTED_OPTIONS.find((p) => p.value === posted)?.label,
      onRemove: () => setPosted(""),
    },
    offersOnly && { key: "offers", label: "Open to offers", onRemove: () => setOffersOnly(false) },
  ].filter(Boolean);

  // API params (feed + search share the same names).
  const apiParams = {};
  if (conditions.length) apiParams.condition = conditions.join(",");
  if (minPrice != null) apiParams.min_price = minPrice;
  if (maxPrice != null) apiParams.max_price = maxPrice;
  if (posted) apiParams.posted_within = posted;
  if (offersOnly) apiParams.negotiable = "true";

  // Stable dependency for fetch effects.
  const filterKey = JSON.stringify([conditions, minPrice, maxPrice, posted, offersOnly, sort]);

  return {
    conditions,
    minPrice,
    maxPrice,
    posted,
    offersOnly,
    sort,
    toggleCondition,
    setPrice,
    setPosted,
    setOffersOnly,
    setSort,
    clearAll,
    update,
    activeCount,
    chips,
    apiParams,
    filterKey,
    hasFilters: activeCount > 0,
  };
}
