import { LayoutGrid, Plus, RotateCcw, Search } from "lucide-react";
import EmptyState from "./EmptyState.jsx";

// Ready-made empty states shared by several pages, so copy and actions stay
// identical everywhere they appear. Page-specific ones (wishlist, orders,
// my listings) use <EmptyState> directly.

// What students list most — shown as quick-start chips on an empty campus.
const STARTER_CATEGORIES = [
  { label: "Textbooks & notes", value: "study_material", to: "/upload" },
  { label: "Cycles", value: "vehicles", to: "/upload" },
  { label: "Electronics", value: "electronics", to: "/upload" },
  { label: "Hostel essentials", value: "hostel_essentials", to: "/upload" },
];

/** No listings on the viewer's campus yet (Home feed, Explore). */
export const CampusEmptyState = ({ browseHref = "#categories", browseTo }) => (
  <EmptyState
    variant="campus"
    title="Your campus marketplace is just getting started"
    description="Nothing's listed here yet. Drop your old textbooks, cycle or hostel stuff and grab that first-seller W, since every student on campus will see it."
    primaryAction={{ label: "List an item", to: "/upload", icon: Plus }}
    secondaryAction={{
      label: "Browse categories",
      icon: LayoutGrid,
      ...(browseTo ? { to: browseTo } : { href: browseHref }),
    }}
    suggestions={STARTER_CATEGORIES}
    suggestionsLabel="What students sell most"
  />
);

/** Active filters returned nothing (Explore, Category, Search). */
export const FiltersEmptyState = ({ onClear, secondaryAction }) => (
  <EmptyState
    variant="filters"
    title="No listings match these filters"
    description="Lowkey too specific? Widen the price range or drop a filter. New listings from your campus land here the second they're posted."
    primaryAction={{ label: "Clear filters", onClick: onClear, icon: RotateCcw }}
    secondaryAction={secondaryAction}
  />
);

/** Search returned nothing (no filters applied). */
export const SearchEmptyState = ({ query }) => (
  <EmptyState
    variant="search"
    title={query ? `No results for “${query}”` : "No results found"}
    description="Check the spelling or try something broader like “book”, “cycle” or “calculator”. Got one to sell? List it and be the plug."
    primaryAction={{ label: "Explore all listings", to: "/explore", icon: Search }}
    secondaryAction={{ label: "List an item", to: "/upload", icon: Plus }}
  />
);
