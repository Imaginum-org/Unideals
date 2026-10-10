/**
 * CategoryIcon — thin line-style icons for the 11 marketplace categories,
 * drawn on a 48×48 grid (3px rounded strokes, blue primary with
 * orange/green/red accents). No images, no background tiles.
 *
 * Usage: <CategoryIcon value="electronics" className="h-10 w-10" />
 * Unknown values fall back to a neutral tag glyph (never blank).
 */
const STROKE = {
  fill: "none",
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

const ART = {
  electronics: (
    <>
      <path
        d="M10 30v-5a14 14 0 0 1 28 0v5"
        stroke="#2563EB"
        strokeWidth="3.4"
        {...STROKE}
      />
      <rect x="6.5" y="28" width="7.5" height="11" rx="3.5" fill="#2563EB" />
      <rect x="34" y="28" width="7.5" height="11" rx="3.5" fill="#2563EB" />
      <rect x="8.4" y="30.4" width="3.7" height="6.2" rx="1.8" fill="#93C5FD" />
      <rect x="35.9" y="30.4" width="3.7" height="6.2" rx="1.8" fill="#93C5FD" />
    </>
  ),
  study_material: (
    <>
      <rect x="9" y="12" width="30" height="7" rx="3.5" fill="#F59E0B" />
      <rect x="9" y="21.5" width="30" height="7" rx="3.5" fill="#10B981" />
      <rect x="9" y="31" width="30" height="7" rx="3.5" fill="#EF4444" />
      <path
        d="M15 15.5h9M15 25h9M15 34.5h9"
        stroke="#FFFFFF"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.9"
      />
    </>
  ),
  hostel_essentials: (
    <>
      <rect x="14" y="7" width="20" height="34" rx="2.5" fill="#F59E0B" />
      <line
        x1="24"
        y1="9"
        x2="24"
        y2="39"
        stroke="#B45309"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <circle cx="21" cy="24" r="1.7" fill="#7C2D12" />
      <circle cx="27" cy="24" r="1.7" fill="#7C2D12" />
      <rect x="14" y="7" width="20" height="5" rx="2.5" fill="#FBBF24" />
      <rect x="17" y="2.5" width="4" height="5" rx="1.5" fill="#10B981" />
      <rect x="27" y="2.5" width="4" height="5" rx="1.5" fill="#3B82F6" />
    </>
  ),
  clothing: (
    <>
      <path
        d="M20 8h8l1.2 2.4c2.5.5 4.4 1.4 5.8 2.7l4.3 6.2-4.4 3.3-3.2-3.8V37a2 2 0 0 1-2 2h-11a2 2 0 0 1-2-2V18.8l-3.2 3.8-4.4-3.3 4.3-6.2c1.4-1.3 3.3-2.2 5.8-2.7L20 8z"
        fill="#10B981"
      />
      <path
        d="M20 8h8l.7 1.5c-.9 1.8-2.4 2.6-4.7 2.6s-3.8-.8-4.7-2.6L20 8z"
        fill="#047857"
      />
    </>
  ),
  lab_equipment: (
    <>
      <rect x="12" y="37" width="24" height="4.5" rx="2.2" fill="#1E40AF" />
      <path
        d="M20 37V22h9"
        stroke="#2563EB"
        strokeWidth="4"
        {...STROKE}
      />
      <path
        d="M33.5 6.5L29 22"
        stroke="#2563EB"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <rect x="29.5" y="4" width="8" height="5" rx="2" fill="#1E40AF" />
      <line
        x1="15"
        y1="30"
        x2="31"
        y2="30"
        stroke="#10B981"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <circle cx="18.5" cy="25.5" r="2.4" fill="#10B981" />
    </>
  ),
  sports: (
    <>
      <ellipse
        cx="22"
        cy="16"
        rx="10.5"
        ry="12"
        fill="#EFF6FF"
        stroke="#64748B"
        strokeWidth="3"
      />
      <path
        d="M22 4.5v23M12.5 10v12M31.5 10v12M13.5 16h17M13.5 22h17"
        stroke="#CBD5E1"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M22 28.5V41"
        stroke="#2563EB"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <rect x="19" y="40" width="6" height="4" rx="2" fill="#F59E0B" />
    </>
  ),
  fitness: (
    <>
      <rect x="9" y="22" width="30" height="4" rx="2" fill="#64748B" />
      <rect x="5" y="15.5" width="6" height="17" rx="3" fill="#2563EB" />
      <rect x="12.5" y="19" width="5" height="10" rx="2.5" fill="#1E40AF" />
      <rect x="30.5" y="19" width="5" height="10" rx="2.5" fill="#1E40AF" />
      <rect x="37" y="15.5" width="6" height="17" rx="3" fill="#2563EB" />
    </>
  ),
  vehicles: (
    <>
      <circle
        cx="14"
        cy="31"
        r="7.5"
        fill="none"
        stroke="#334155"
        strokeWidth="3.4"
      />
      <circle
        cx="34"
        cy="31"
        r="7.5"
        fill="none"
        stroke="#334155"
        strokeWidth="3.4"
      />
      <path
        d="M14 31l7.5-13.5h9L34 31M21.5 17.5L19 12h5.5M30.5 17.5l3-4.5"
        stroke="#2563EB"
        strokeWidth="3"
        {...STROKE}
        fill="none"
      />
      <circle cx="14" cy="31" r="1.8" fill="#334155" />
      <circle cx="34" cy="31" r="1.8" fill="#334155" />
      <circle cx="26" cy="24" r="2.4" fill="#F59E0B" />
    </>
  ),
  event_passes: (
    <>
      <rect x="5" y="14" width="38" height="20" rx="6" fill="#FBBF24" />
      <line
        x1="30"
        y1="17.5"
        x2="30"
        y2="30.5"
        stroke="#B45309"
        strokeWidth="2.2"
        strokeDasharray="3 3"
        strokeLinecap="round"
      />
      <path
        d="M17.5 19.5l1.7 3.4 3.8.6-2.7 2.7.6 3.8-3.4-1.8-3.4 1.8.6-3.8-2.7-2.7 3.8-.6z"
        fill="#FFFBEB"
      />
      <circle cx="35.8" cy="21.5" r="1.6" fill="#B45309" />
      <circle cx="35.8" cy="26.5" r="1.6" fill="#B45309" />
    </>
  ),
  accessories: (
    <>
      <path
        d="M20 13V9.5a4 4 0 0 1 8 0V13"
        stroke="#F59E0B"
        strokeWidth="3"
        {...STROKE}
      />
      <rect
        x="13"
        y="12"
        width="22"
        height="27"
        rx="9"
        fill="#DBEAFE"
        stroke="#2563EB"
        strokeWidth="3"
      />
      <rect
        x="17.5"
        y="24"
        width="13"
        height="9.5"
        rx="4"
        fill="none"
        stroke="#2563EB"
        strokeWidth="2.6"
      />
      <line
        x1="24"
        y1="24"
        x2="24"
        y2="27"
        stroke="#F59E0B"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
    </>
  ),
  others: (
    <>
      <rect
        x="9"
        y="9"
        width="13"
        height="13"
        rx="3.5"
        fill="none"
        stroke="#4F46E5"
        strokeWidth="3"
      />
      <rect
        x="26"
        y="9"
        width="13"
        height="13"
        rx="3.5"
        fill="none"
        stroke="#4F46E5"
        strokeWidth="3"
      />
      <rect
        x="9"
        y="26"
        width="13"
        height="13"
        rx="3.5"
        fill="none"
        stroke="#4F46E5"
        strokeWidth="3"
      />
      <path
        d="M32.5 27v12M26.5 33h12"
        stroke="#4F46E5"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </>
  ),
};

export default function CategoryIcon({ value, className }) {
  return (
    <svg
      viewBox="0 0 48 48"
      className={className}
      role="img"
      aria-hidden="true"
      focusable="false"
    >
      {ART[value] || (
        <g fill="none" stroke="#94A3B8" strokeWidth="3" strokeLinecap="round">
          <path d="M8 14h26v18H8z" fill="#E2E8F0" stroke="none" />
          <path d="M8 14l4-6h22l4 6M24 14v18" />
        </g>
      )}
    </svg>
  );
}
