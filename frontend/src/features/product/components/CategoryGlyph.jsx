/**
 * CategoryGlyph: simple line icons for categories in compact UI (dropdowns,
 * chips). 24×24, 1.75 stroke, rounded joins, drawn in `currentColor` so
 * they follow text colour, theme and dark mode. The colourful illustrations
 * (CategoryIcon.jsx) stay for large tiles like "Shop by category".
 *
 * <CategoryGlyph value="electronics" className="h-4 w-4" />
 */
const PATHS = {
  // Laptop
  electronics: (
    <>
      <rect x="4" y="5" width="16" height="10.5" rx="1.5" />
      <path d="M2.5 19h19" />
    </>
  ),
  // Open book
  study_material: (
    <>
      <path d="M12 6.5C10 5 7.2 4.6 3.5 5v13c3.7-.4 6.5 0 8.5 1.5 2-1.5 4.8-1.9 8.5-1.5V5c-3.7-.4-6.5 0-8.5 1.5z" />
      <path d="M12 6.5v13" />
    </>
  ),
  // Bed
  hostel_essentials: (
    <>
      <path d="M3 18.5V6.5" />
      <path d="M3 14.5h18v4" />
      <path d="M21 14.5v-1.5a3 3 0 0 0-3-3h-7v4.5" />
      <circle cx="7" cy="11.5" r="1.6" />
    </>
  ),
  // T-shirt
  clothing: <path d="M8.5 4 4 6.6l1.7 3.8 2.3-.9V20h8V9.5l2.3.9L20 6.6 15.5 4a3.5 3.5 0 0 1-7 0z" />,
  // Wrist watch
  accessories: (
    <>
      <circle cx="12" cy="12" r="5" />
      <path d="M12 9.8V12l1.5 1.2" />
      <path d="M9 7.6 9.6 3h4.8l.6 4.6M9 16.4l.6 4.6h4.8l.6-4.6" />
    </>
  ),
  // Flask
  lab_equipment: (
    <>
      <path d="M9.5 3h5" />
      <path d="M10.5 3v6.2L5.2 18.4A1.7 1.7 0 0 0 6.7 21h10.6a1.7 1.7 0 0 0 1.5-2.6L13.5 9.2V3" />
      <path d="M7.6 15h8.8" />
    </>
  ),
  // Ball
  sports: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M5.2 7c2.5 1.3 3.9 3 4.5 5 .6 2 .3 4.6-1 7.2M18.8 7c-2.5 1.3-3.9 3-4.5 5-.6 2-.3 4.6 1 7.2" />
    </>
  ),
  // Dumbbell
  fitness: <path d="M6.5 7v10M17.5 7v10M3.5 9.5v5M20.5 9.5v5M6.5 12h11" />,
  // Bicycle
  vehicles: (
    <>
      <circle cx="6" cy="16" r="3.5" />
      <circle cx="18" cy="16" r="3.5" />
      <path d="M6 16 9.5 9H15l3 7M12 16 9.5 9M13.5 6.5h2.3" />
    </>
  ),
  // Ticket
  event_passes: (
    <>
      <path d="M3 9V7.5A1.5 1.5 0 0 1 4.5 6h15A1.5 1.5 0 0 1 21 7.5V9a3 3 0 0 0 0 6v1.5a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 16.5V15a3 3 0 0 0 0-6z" />
      <path d="M14.5 6v2M14.5 11v2M14.5 16v2" />
    </>
  ),
  // Grid
  others: (
    <>
      <rect x="4" y="4" width="6.5" height="6.5" rx="1.5" />
      <rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5" />
      <rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5" />
      <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5" />
    </>
  ),
  // Lipstick
  beauty_personal_care: (
    <>
      <path d="M8.5 21h7v-8.5h-7z" />
      <path d="M7.5 12.5h9" />
      <path d="M10 12.5V6.8L14 4.5v8" />
    </>
  ),
  // Dress
  womens_fashion: (
    <>
      <path d="M9.5 3v3.6L8 9.5l1.6 1.6L6 21h12l-3.6-9.9L16 9.5l-1.5-2.9V3" />
      <path d="M9.5 6.6h5" />
    </>
  ),
  // Ring with stone
  jewellery_hair_accessories: (
    <>
      <path d="M9.2 3.5h5.6l1.8 2.8L12 10 7.4 6.3z" />
      <circle cx="12" cy="15.5" r="5" />
    </>
  ),
  // Handbag
  footwear_handbags: (
    <>
      <path d="M5 9h14l-1.2 10.6a1.5 1.5 0 0 1-1.5 1.4H7.7a1.5 1.5 0 0 1-1.5-1.4z" />
      <path d="M9 9V7a3 3 0 0 1 6 0v2" />
    </>
  ),
  // Table lamp
  room_decor: (
    <>
      <path d="M8 4h8l3 7H5z" />
      <path d="M12 11v8M8.5 20h7" />
    </>
  ),
};

// Unknown values: a plain tag (never blank).
const FALLBACK = (
  <>
    <path d="M3.5 12.6V4.5a1 1 0 0 1 1-1h8.1l8 8a1.4 1.4 0 0 1 0 2l-6.6 6.6a1.4 1.4 0 0 1-2 0z" />
    <circle cx="8" cy="8" r="1.4" />
  </>
);

export default function CategoryGlyph({ value, className = "h-4 w-4", strokeWidth = 1.75 }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      {PATHS[value] || FALLBACK}
    </svg>
  );
}
