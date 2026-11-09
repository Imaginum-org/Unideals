import { useId } from "react";

/*
 * Rank emblems: a faceted hexagon medallion in the rank's colour with a
 * drawn glyph (sprout → book → flag → cap → trophy → crown). Locked ranks
 * render as a quiet grey outline.
 */

const GLYPHS = {
  // Fresher: sprout
  Seedling: "M20 29v-9 M20 21c0-4-3-6.5-7-6.5 0 4 3 6.5 7 6.5z M20 18.5c0-4 3-6.5 7-6.5 0 4-3 6.5-7 6.5z",
  // Junior: open book
  Explorer: "M11 14c3.5-1.2 6.5-.4 9 1.4 2.5-1.8 5.5-2.6 9-1.4v12c-3.5-1.2-6.5-.4-9 1.4-2.5-1.8-5.5-2.6-9-1.4z M20 15.4v12",
  // Class Rep: flag
  Dealer: "M14 29V11 M14 12h11l-2.5 4 2.5 4H14",
  // Senior: graduation cap
  Hustler: "M9 17l11-5 11 5-11 5z M14 19.5v4.5c3.5 2.4 8.5 2.4 12 0v-4.5 M31 17v6",
  // Topper: trophy
  Legend: "M15 11h10v5a5 5 0 0 1-10 0z M15 13h-3a3 3 0 0 0 3.5 4 M25 13h3a3 3 0 0 1-3.5 4 M20 21v4 M16 29h8 M17.5 25h5v4h-5z",
  // Campus Icon: crown
  "Campus Royale": "M11 26l-1.5-11 6 4.5L20 12l4.5 7.5 6-4.5L29 26z M11 29h18",
};

const keyFor = (title) => (/^Campus (King|Queen|Royale)$/.test(title) ? "Campus Royale" : title);

export default function RankEmblem({ title, color = "#3838EC", size = 32, locked = false, className }) {
  const id = useId().replace(/:/g, "");
  const glyph = GLYPHS[keyFor(title)] || GLYPHS.Seedling;
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={`re-${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={color} stopOpacity="0.85" />
          <stop offset="1" stopColor={color} />
        </linearGradient>
      </defs>
      {/* hexagon medallion */}
      <path
        d="M20 2.5l15.2 8.75v17.5L20 37.5 4.8 28.75v-17.5z"
        fill={locked ? "#fff" : `url(#re-${id})`}
        className={locked ? "fill-white dark:fill-[#1A1D20]" : undefined}
        stroke={locked ? "currentColor" : "rgba(255,255,255,0.35)"}
        strokeOpacity={locked ? 0.35 : 1}
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      {/* top facet highlight */}
      {!locked && <path d="M20 2.5l15.2 8.75L20 20 4.8 11.25z" fill="#fff" fillOpacity="0.14" />}
      <path
        d={glyph}
        fill="none"
        stroke={locked ? "currentColor" : "#fff"}
        strokeOpacity={locked ? 0.45 : 1}
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
