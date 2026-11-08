/**
 * CategoryIcon — flat colour illustration icons for the marketplace categories
 * (11 classic + 5 Girls Corner exclusives, one illustration style),
 * drawn on a 48×48 grid as filled, two-tone shapes (light/dark halves for
 * depth) in a shared palette. Inline SVG: no images, no background tiles.
 *
 * Usage: <CategoryIcon value="electronics" className="h-10 w-10" />
 * Unknown values fall back to a neutral tag glyph (never blank).
 */
const ART = {
  // ── Classic categories: flat colour illustration set (design reference) ──
  electronics: (
    <>
      {/* Headband */}
      <path
        d="M11.8 28.5V19.4a12.2 12.2 0 0 1 24.4 0v9.1"
        fill="none"
        stroke="#1F5FE0"
        strokeWidth="3.4"
        strokeLinecap="round"
      />
      {/* Left cup: yellow pad + blue cup */}
      <rect x="6.6" y="29.6" width="4.4" height="9.6" rx="1.8" fill="#F6C42B" />
      <rect x="9.2" y="27.2" width="5.6" height="14.4" rx="2.3" fill="#3D96F2" />
      <rect x="10.4" y="28.6" width="1.6" height="11.6" rx="0.8" fill="#7DBBFA" />
      {/* Right cup */}
      <rect x="37" y="29.6" width="4.4" height="9.6" rx="1.8" fill="#F6C42B" />
      <rect x="33.2" y="27.2" width="5.6" height="14.4" rx="2.3" fill="#3D96F2" />
      <rect x="34.4" y="28.6" width="1.6" height="11.6" rx="0.8" fill="#7DBBFA" />
    </>
  ),
  study_material: (
    <g transform="translate(24 24) scale(1.18) translate(-24 -24)">
      {/* Top: orange book */}
      <rect x="16" y="7.6" width="15.6" height="5.6" rx="2.2" fill="#F5A623" />
      <rect x="16" y="7.6" width="15.6" height="2" rx="1" fill="#FBC15A" />
      {/* Green book */}
      <rect x="12" y="13.2" width="22.4" height="7.6" rx="1.4" fill="#2F9E5C" />
      <rect x="18.2" y="13.2" width="9.6" height="7.6" fill="#24804A" />
      {/* Open cream book with orange cover */}
      <path d="M11.2 21h25.6a1.6 1.6 0 0 1 1.6 1.6v5.2a1.6 1.6 0 0 1-1.6 1.6H11.2a4.2 4.2 0 0 1 0-8.4z" fill="#F2A33A" />
      <path d="M12.4 22.8h24.2v4.8H12.4a2.4 2.4 0 0 1 0-4.8z" fill="#FDEFCB" />
      <path d="M13 25.2h23.4" stroke="#F3D79B" strokeWidth="0.9" />
      {/* Bottom: red book */}
      <rect x="12.2" y="29.4" width="23.6" height="9.6" rx="1.4" fill="#D8502E" />
      <rect x="12.2" y="32.4" width="23.6" height="3.2" fill="#B83F22" />
    </g>
  ),
  hostel_essentials: (
    <g transform="translate(24 24) scale(1.14) translate(-24 -24)">
      {/* Red ruler */}
      <rect x="13.4" y="5.6" width="3.6" height="17" rx="0.6" fill="#E8473D" />
      <path d="M15.2 8.2h1.8M15.2 10.8h1.8M15.2 13.4h1.8M15.2 16h1.8M15.2 18.6h1.8" stroke="#FFFFFF" strokeWidth="0.8" />
      {/* Green pencil / leaf */}
      <path d="M19.6 20.5V12.4c0-2 1.2-4.2 2-5 .8.8 2 3 2 5v8.1z" fill="#3BBE6A" />
      <path d="M21.6 9.2v11.3" stroke="#2A9952" strokeWidth="0.9" />
      {/* Blue folder */}
      <rect x="22.6" y="11.2" width="7.8" height="10" rx="0.8" fill="#4FB0F2" />
      {/* Papers */}
      <rect x="26.4" y="12" width="8.2" height="9.6" rx="0.6" fill="#E9EDF2" />
      <path d="M27.8 14.4h5.4M27.8 16.4h5.4M27.8 18.4h5.4" stroke="#9AA3AF" strokeWidth="0.8" />
      {/* Box */}
      <path d="M13 20.6h11.2v19.6H13z" fill="#F6B957" />
      <path d="M24.2 20.6H35v19.6H24.2z" fill="#E59A2F" />
      <rect x="18.6" y="26.4" width="11" height="2.6" rx="1.3" fill="#8A8F98" />
    </g>
  ),
  clothing: (
    <>
      <path
        d="M17.4 9.2l-5.4 2.2-6.4 6.4 4.4 4.8 4-2.4v17.6h20v-17.6l4 2.4 4.4-4.8-6.4-6.4-5.4-2.2c-.8 2.8-3.4 4.4-6.6 4.4s-5.8-1.6-6.6-4.4z"
        fill="#2FCB7A"
      />
      {/* Collar */}
      <path d="M18.6 9.6c1 2.6 3 4 5.4 4s4.4-1.4 5.4-4" fill="none" stroke="#21A862" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M21.6 13.2l2.4 2.6 2.4-2.6" fill="none" stroke="#21A862" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      {/* Star emblem with side dashes */}
      <path d="M24 21.4l1.1 2.3 2.5.3-1.8 1.7.5 2.5-2.3-1.2-2.3 1.2.5-2.5-1.8-1.7 2.5-.3z" fill="#1E9A5A" />
      <path d="M16.6 24.6h3M28.4 24.6h3" stroke="#1E9A5A" strokeWidth="1.3" strokeLinecap="round" />
    </>
  ),
  lab_equipment: (
    <g transform="translate(24 24) scale(1.1) translate(-24 -24)">
      {/* Stand rod + base */}
      <path d="M13.2 6.4v33.2h22.4" fill="none" stroke="#5B6168" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M35.6 36.4v3.2" stroke="#5B6168" strokeWidth="1.9" strokeLinecap="round" />
      <rect x="11.4" y="6" width="3.6" height="1.8" rx="0.6" fill="#5B6168" />
      {/* Clamp */}
      <path d="M13.2 16.6h7.6" stroke="#5B6168" strokeWidth="1.9" strokeLinecap="round" />
      <circle cx="13.2" cy="16.6" r="2" fill="#E8473D" />
      {/* Flask: lid, glass, green liquid, neck */}
      <rect x="20.2" y="6.6" width="14.6" height="2.6" rx="1" fill="#5B6168" />
      <path d="M21 9.2h13v11.4a2.6 2.6 0 0 1-2.6 2.6h-7.8a2.6 2.6 0 0 1-2.6-2.6z" fill="#F4F6F8" stroke="#5B6168" strokeWidth="1.5" />
      <path d="M21.8 14.6h11.4v6a2 2 0 0 1-2 2h-7.4a2 2 0 0 1-2-2z" fill="#7CC63A" />
      <path d="M21.8 14.6h11.4v2H21.8z" fill="#9BD95C" />
      <path d="M25.4 23.2h4.2v3h-4.2z" fill="#5B6168" />
      {/* Flame */}
      <path d="M27.5 27.6c2.8 2.2 4 4.2 4 6.2a4 4 0 0 1-8 0c0-1.6.8-2.8 1.8-3.8.2 1.2.8 1.8 1.6 2 0-1.6.2-3 .6-4.4z" fill="#F59E1B" />
      <path d="M27.5 31.2c1.2 1 1.8 2 1.8 3a1.8 1.8 0 0 1-3.6 0c0-.9.6-1.8 1.8-3z" fill="#FCD34D" />
      {/* Burner tray */}
      <path d="M22.6 37.2h9.8" stroke="#5B6168" strokeWidth="1.5" strokeLinecap="round" />
    </g>
  ),
  sports: (
    <>
      {/* Racket head + strings */}
      <ellipse cx="29.4" cy="14.6" rx="7.4" ry="9" transform="rotate(38 29.4 14.6)" fill="#F8FAFC" stroke="#2DA6EE" strokeWidth="2.2" />
      <g stroke="#C9D2DC" strokeWidth="0.7">
        <path d="M24.6 10.2l9.4 9.8M23.4 13.4l7.4 7.6M26.6 8.4l8.6 8.8M28.8 7.4l6.6 6.8" />
        <path d="M33.4 9.4l-9.6 9.2M35 12.4l-7.8 7.6M30.6 7.8l-8.2 7.8M36 15.6l-5.6 5.4" />
      </g>
      {/* Shaft + grip */}
      <path d="M23.6 21.6l-5.4 8.2" stroke="#9AA3AF" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M18.6 29.2l-5 7.8" stroke="#3B2E6E" strokeWidth="2.8" strokeLinecap="round" />
      {/* Shuttlecock */}
      <path d="M30.4 33.6l4.4 1.8-1.6 2.4z" fill="#F1F5F9" stroke="#CBD5E1" strokeWidth="0.6" />
      <circle cx="30" cy="33.2" r="1.8" fill="#F0468A" />
    </>
  ),
  fitness: (
    <>
      {/* Heart with stem to the bar */}
      <path d="M24 23.2l-8.2-7.6a5 5 0 0 1 8.2-6 5 5 0 0 1 8.2 6z" fill="#8DB6FF" stroke="#3E7BF4" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M24 23.2v3.8" stroke="#3E7BF4" strokeWidth="1.7" />
      {/* Bar */}
      <path d="M15 28.6h18" stroke="#3E7BF4" strokeWidth="2.4" strokeLinecap="round" />
      {/* Plates */}
      <rect x="10.4" y="19.4" width="5.2" height="18.4" rx="1.3" fill="#8DB6FF" stroke="#3E7BF4" strokeWidth="1.6" />
      <rect x="5.6" y="22.8" width="4.8" height="11.6" rx="1.1" fill="#8DB6FF" stroke="#3E7BF4" strokeWidth="1.6" />
      <rect x="32.4" y="19.4" width="5.2" height="18.4" rx="1.3" fill="#8DB6FF" stroke="#3E7BF4" strokeWidth="1.6" />
      <rect x="37.6" y="22.8" width="4.8" height="11.6" rx="1.1" fill="#8DB6FF" stroke="#3E7BF4" strokeWidth="1.6" />
    </>
  ),
  vehicles: (
    <>
      {/* Map pins */}
      <path d="M12.6 20.4c-2.6-3-4.2-5.2-4.2-7.4a4.2 4.2 0 0 1 8.4 0c0 2.2-1.6 4.4-4.2 7.4z" fill="#F8FAFC" stroke="#6B7280" strokeWidth="1.2" />
      <circle cx="12.6" cy="13" r="1.7" fill="#E8473D" />
      <path d="M35.4 13.6c-2.2-2.6-3.6-4.4-3.6-6.4a3.6 3.6 0 0 1 7.2 0c0 2-1.4 3.8-3.6 6.4z" fill="#F8FAFC" stroke="#6B7280" strokeWidth="1.2" />
      <circle cx="35.4" cy="7.2" r="1.4" fill="#34C7B0" />
      {/* Wheels */}
      <circle cx="14.4" cy="32.8" r="6.9" fill="#4A6CF5" />
      <circle cx="33.6" cy="32.8" r="6.9" fill="#4A6CF5" />
      <circle cx="14.4" cy="32.8" r="3.4" fill="none" stroke="#8EA6FB" strokeWidth="0.9" />
      <circle cx="33.6" cy="32.8" r="3.4" fill="none" stroke="#8EA6FB" strokeWidth="0.9" />
      {/* Frame, seat, handlebar */}
      <path d="M14.4 32.8l5.2-8.2h10.2l3.8 8.2M19.6 24.6l4.6 8.2 5.6-8.2M24.2 32.8h-9.8" fill="none" stroke="#2B2F6B" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M18 22.6h3.6M29.8 24.6l-1.2-3.6h2.6" fill="none" stroke="#2B2F6B" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      {/* Ground */}
      <path d="M7.2 40.2h33.6" stroke="#9AA3AF" strokeWidth="0.9" strokeLinecap="round" />
    </>
  ),
  event_passes: (
    <g transform="rotate(-36 24 24)">
      {/* Ticket body with notched ends (side shadow for depth) */}
      <path d="M6 15.4h36v5.6a3 3 0 0 0 0 6v5.6H6V27a3 3 0 0 0 0-6z" fill="#E3921A" transform="translate(0.9 1.6)" />
      <path d="M6 15.4h36v5.6a3 3 0 0 0 0 6v5.6H6V27a3 3 0 0 0 0-6z" fill="#F5A925" />
      <rect x="11" y="18.8" width="22.4" height="10.4" rx="1.2" fill="#F8DB86" />
      <path d="M36.4 16.8v14.4" stroke="#E3921A" strokeWidth="1" strokeDasharray="1.6 1.3" />
    </g>
  ),
  accessories: (
    <>
      {/* Wristwatch (matches the set's palette) */}
      <rect x="18.4" y="5.6" width="11.2" height="10" rx="2.6" fill="#3E7BF4" />
      <rect x="18.4" y="32.4" width="11.2" height="10" rx="2.6" fill="#3E7BF4" />
      <circle cx="24" cy="24" r="10.2" fill="#2B4FD8" />
      <circle cx="24" cy="24" r="7.8" fill="#F8FAFC" />
      <path d="M24 19.4V24l3.2 2" fill="none" stroke="#F59E1B" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="34" y="22.4" width="2.4" height="3.2" rx="0.8" fill="#2B4FD8" />
    </>
  ),
  others: (
    <>
      <rect x="8.4" y="8.4" width="12.4" height="12.4" rx="3.6" fill="#DCE2FF" stroke="#4A4FE8" strokeWidth="3" />
      <rect x="27.2" y="8.4" width="12.4" height="12.4" rx="3.6" fill="#DCE2FF" stroke="#4A4FE8" strokeWidth="3" />
      <rect x="8.4" y="27.2" width="12.4" height="12.4" rx="3.6" fill="#DCE2FF" stroke="#4A4FE8" strokeWidth="3" />
      <path d="M33.4 27.2v12.4M27.2 33.4h12.4" stroke="#4A4FE8" strokeWidth="3.2" strokeLinecap="round" />
    </>
  ),
  // ── Girls Corner exclusives: same flat colour illustration style ──
  beauty_personal_care: (
    <>
      {/* Perfume bottle: gold cap, glass neck, pink body with highlight */}
      <rect x="13.6" y="7.2" width="7.2" height="5.4" rx="1.4" fill="#F5B533" />
      <rect x="13.6" y="7.2" width="7.2" height="1.8" rx="0.9" fill="#FCD06A" />
      <rect x="15.4" y="12.6" width="3.6" height="3" fill="#E9A3C4" />
      <rect x="8.4" y="15.4" width="17.6" height="22.4" rx="4.4" fill="#F472B6" />
      <rect x="8.4" y="15.4" width="8.8" height="22.4" rx="4.4" fill="#F9A8D4" />
      <rect x="12.2" y="22" width="10" height="9.2" rx="1.8" fill="#FFFFFF" opacity="0.92" />
      <path d="M17.2 24.4l.9 1.8 2 .3-1.4 1.4.3 2-1.8-.9-1.8.9.3-2-1.4-1.4 2-.3z" fill="#EC4899" />
      {/* Lipstick: red bullet, gold sleeve, dark base */}
      <path d="M30.4 17.2l5.2-3.6v8h-5.2z" fill="#E11D48" />
      <path d="M30.4 17.2l2.6-1.8v6.2h-2.6z" fill="#FB7185" />
      <rect x="29.4" y="21.6" width="7.2" height="5.2" rx="0.8" fill="#F5B533" />
      <rect x="29.4" y="21.6" width="3.6" height="5.2" fill="#FCD06A" />
      <rect x="28.6" y="26.8" width="8.8" height="11" rx="1.6" fill="#3B2E6E" />
      <rect x="28.6" y="26.8" width="4.4" height="11" rx="1.6" fill="#55488C" />
    </>
  ),
  womens_fashion: (
    <>
      {/* Hanger */}
      <path d="M24 9.4a2.4 2.4 0 1 1 2.4 2.4" fill="none" stroke="#5B6168" strokeWidth="1.5" strokeLinecap="round" />
      {/* Dress: straps, bodice, gold belt, flared skirt */}
      <path d="M19.4 11.6l1.6 5.4M28.6 11.6l-1.6 5.4" stroke="#DB2777" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M19 16.6h10l-.8 7.4H19.8z" fill="#F9A8D4" />
      <path d="M24 16.6h5l-.8 7.4H24z" fill="#F472B6" />
      <rect x="19" y="23.6" width="10" height="2.6" rx="0.6" fill="#F5B533" />
      <path d="M19.4 26.2h9.2l7.4 13.6H12z" fill="#EC4899" />
      <path d="M24 26.2h4.6l7.4 13.6H24z" fill="#DB2777" />
      <path d="M16 33.6c2.6-.8 5.4-1.2 8-1.2s5.4.4 8 1.2" fill="none" stroke="#F9A8D4" strokeWidth="1" opacity="0.8" />
    </>
  ),
  jewellery_hair_accessories: (
    <>
      {/* Diamond ring */}
      <circle cx="19.6" cy="30" r="9.4" fill="none" stroke="#F5B533" strokeWidth="3.4" />
      <path d="M11.4 25.4a9.4 9.4 0 0 1 4.6-4.4" fill="none" stroke="#FCD06A" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M14.6 17.8l2-3.6h6l2 3.6-5 5.2z" fill="#7DD3FC" />
      <path d="M14.6 17.8h10l-5 5.2z" fill="#38BDF8" />
      <path d="M16.6 14.2l3 3.6 3-3.6" fill="none" stroke="#E0F2FE" strokeWidth="0.9" />
      {/* Pink bow hair clip */}
      <path d="M34.2 13.6l-6 -3.6v8.2z" fill="#F472B6" />
      <path d="M34.2 13.6l6 -3.6v8.2z" fill="#EC4899" />
      <circle cx="34.2" cy="13.8" r="1.9" fill="#DB2777" />
      <path d="M31.6 18.4l-1.2 3.6M36.8 18.4l1.2 3.6" stroke="#EC4899" strokeWidth="1.6" strokeLinecap="round" />
      {/* Sparkle */}
      <path d="M36 28.6l.8 1.8 1.8.8-1.8.8-.8 1.8-.8-1.8-1.8-.8 1.8-.8z" fill="#F5B533" />
    </>
  ),
  footwear_handbags: (
    <>
      {/* Handbag: handle, body, flap, gold clasp */}
      <path d="M12.4 17.4v-2.6a5.4 5.4 0 0 1 10.8 0v2.6" fill="none" stroke="#DB2777" strokeWidth="2" strokeLinecap="round" />
      <path d="M8.6 17.4h18.4l1.8 16.4H6.8z" fill="#F472B6" />
      <path d="M17.8 17.4h9.2l1.8 16.4h-11z" fill="#EC4899" />
      <path d="M8.6 17.4h18.4l-.6 5.6c-2.6 1.8-5.6 2.6-8.6 2.6S11.8 24.8 9.2 23z" fill="#DB2777" />
      <rect x="15.8" y="23.2" width="4" height="3.2" rx="0.8" fill="#F5B533" />
      {/* High heel */}
      <path d="M28.6 36.4c3-.2 5.2-1.6 6.4-4l2-4.4c.6-1.2 1.8-1.6 2.8-.8.8.6 1 1.6.8 2.8l-1.2 6.4z" fill="#E11D48" />
      <path d="M28.6 36.4c3-.2 5.2-1.6 6.4-4l1.2-2.6 1.6 1-2.4 5.6z" fill="#FB7185" />
      <path d="M38.8 36.4v4" stroke="#9F1239" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M27.6 36.4h12" stroke="#9F1239" strokeWidth="1.4" strokeLinecap="round" />
    </>
  ),
  room_decor: (
    <>
      {/* Table lamp: pink shade, gold stem + base */}
      <path d="M11.4 7.8h11.2l3 9.6H8.4z" fill="#F9A8D4" />
      <path d="M17 7.8h5.6l3 9.6H17z" fill="#F472B6" />
      <rect x="16" y="17.4" width="2" height="15" fill="#F5B533" />
      <rect x="11.6" y="32.4" width="10.8" height="3.2" rx="1.4" fill="#E3921A" />
      {/* Potted plant */}
      <path d="M33.4 25.4c-3.8-1.4-5.8-4.6-5.4-9 3.6 1 5.6 4 5.4 9z" fill="#3BBE6A" />
      <path d="M33.4 25.4c.2-5.6 2.6-9.4 7-11 .4 5.2-2.2 9-7 11z" fill="#2A9952" />
      <path d="M33.4 26V16.4" stroke="#24804A" strokeWidth="1" />
      <path d="M28.4 25.8h10l-1.6 9.8h-6.8z" fill="#F6B957" />
      <path d="M33.4 25.8h5l-1.6 9.8h-3.4z" fill="#E59A2F" />
      {/* Shelf line */}
      <path d="M7.6 38.6h32.8" stroke="#9AA3AF" strokeWidth="1" strokeLinecap="round" />
    </>
  ),
};

// Raw art for embedding inside another SVG (48×48 units), e.g. the
// EmptyState illustrations. Unknown values render nothing.
export const CategoryArt = ({ value }) => ART[value] || null;

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
