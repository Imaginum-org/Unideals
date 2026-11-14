import { useId } from "react";

/*
 * Shared 3D-styled vector art (no rasters): extruded layers + gradients.
 * Used by the home bento (Pro & Pro+, Trusted community).
 */

/* ── 3D-styled scalloped badge (vector, no raster) ── */
const scallopPath = (cx, cy, r, amp, lobes, steps = 240) => {
  let d = "";
  for (let i = 0; i <= steps; i += 1) {
    const t = (i / steps) * Math.PI * 2;
    // Round bumps with pinched valleys (like a seal/rosette), not a sine.
    const rr = r - amp + 2 * amp * Math.pow(Math.abs(Math.cos((lobes * t) / 2)), 0.85);
    const x = cx + rr * Math.cos(t);
    const y = cy + rr * Math.sin(t);
    d += `${i ? "L" : "M"}${x.toFixed(2)} ${y.toFixed(2)}`;
  }
  return `${d}Z`;
};
const BADGE_OUTER = scallopPath(100, 100, 82, 4.6, 14);
const BADGE_RIM = scallopPath(100, 100, 76.5, 4.3, 14);
const BADGE_INNER = scallopPath(100, 100, 60, 3.6, 14);

const BADGE_PALETTES = {
  gold: {
    side: ["#FF6A1A", "#D7350A", "#A82404"],
    face: ["#FFD21F", "#FFAE12", "#FF870A"],
    ring: "#EE6200",
    inner: ["#FFD843", "#FFB21A", "#FF940C"],
  },
  green: {
    side: ["#2BAA4E", "#127A36", "#0A4F24"],
    face: ["#8EE563", "#34B94D", "#118238"],
    ring: "#0A6B2C",
    inner: ["#62D257", "#24A646", "#0E7332"],
  },
};

export const Badge = ({ tone, className }) => {
  const id = useId().replace(/:/g, "");
  const p = BADGE_PALETTES[tone];
  const layers = Array.from({ length: 40 }, (_, i) => 40 - i);
  return (
    <svg viewBox="-20 -10 240 230" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={`${id}s`} x1="0" y1="0.2" x2="1" y2="0.8">
          <stop offset="0" stopColor={p.side[0]} />
          <stop offset="0.55" stopColor={p.side[1]} />
          <stop offset="1" stopColor={p.side[2]} />
        </linearGradient>
        <linearGradient id={`${id}f`} x1="0.15" y1="0" x2="0.85" y2="1">
          <stop offset="0" stopColor={p.face[0]} />
          <stop offset="0.5" stopColor={p.face[1]} />
          <stop offset="1" stopColor={p.face[2]} />
        </linearGradient>
        <linearGradient id={`${id}i`} x1="0.2" y1="0" x2="0.8" y2="1">
          <stop offset="0" stopColor={p.inner[0]} />
          <stop offset="0.55" stopColor={p.inner[1]} />
          <stop offset="1" stopColor={p.inner[2]} />
        </linearGradient>
        <radialGradient id={`${id}g`} cx="0.32" cy="0.25" r="0.6">
          <stop offset="0" stopColor="#fff" stopOpacity="0.2" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
      </defs>
      {/* Extrusion (left/back side) */}
      {layers.map((k) => (
        <path
          key={k}
          d={BADGE_OUTER}
          fill={`url(#${id}s)`}
          transform={`translate(${-k * 0.8} ${k * 0.18})`}
        />
      ))}
      {/* Lit edge of the extrusion */}
      <path d={BADGE_OUTER} fill="none" stroke="#fff" strokeOpacity="0.28" strokeWidth="1.4" transform="translate(-30 6.8)" />
      {/* Face + bevelled rim */}
      <path d={BADGE_OUTER} fill={`url(#${id}f)`} />
      <path d={BADGE_RIM} fill="none" stroke={p.ring} strokeOpacity="0.85" strokeWidth="3.6" />
      <path d={BADGE_RIM} fill="none" stroke="#fff" strokeOpacity="0.35" strokeWidth="1.2" transform="translate(-1.6 -1.6)" />
      <path d={BADGE_OUTER} fill="none" stroke="#fff" strokeOpacity="0.5" strokeWidth="2" transform="translate(100 100) scale(0.975) translate(-99 -99)" />
      {/* Raised inner medallion: drop side, face, highlight */}
      <path d={BADGE_INNER} fill={p.ring} transform="translate(-7 3)" />
      <path d={BADGE_INNER} fill={p.ring} opacity="0.7" transform="translate(-3.5 1.5)" />
      <path d={BADGE_INNER} fill={`url(#${id}i)`} />
      <path d={BADGE_INNER} fill="none" stroke="#fff" strokeOpacity="0.6" strokeWidth="1.8" transform="translate(-0.9 -0.9)" />
      <path d={BADGE_OUTER} fill={`url(#${id}g)`} />
    </svg>
  );
};

/* ── 3D-styled glass shield with check (vector, no raster) ── */
const SHIELD =
  "M100 12C122 26 150 32 172 34V98C172 152 142 188 100 212C58 188 28 152 28 98V34C50 32 78 26 100 12Z";

export const Shield = ({ className }) => {
  const id = useId().replace(/:/g, "");
  const layers = Array.from({ length: 30 }, (_, i) => 30 - i);
  return (
    <svg viewBox="-12 0 212 222" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={`${id}side`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#6577FF" />
          <stop offset="0.5" stopColor="#3D4FF2" />
          <stop offset="1" stopColor="#2537D9" />
        </linearGradient>
        <linearGradient id={`${id}face`} x1="0" y1="0.1" x2="1" y2="0.4">
          <stop offset="0" stopColor="#4C66FF" />
          <stop offset="0.42" stopColor="#4A95FF" />
          <stop offset="0.76" stopColor="#4FCBF2" />
          <stop offset="1" stopColor="#6DEDB8" />
        </linearGradient>
        <linearGradient id={`${id}rim`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#B9C6FF" />
          <stop offset="0.5" stopColor="#9DEBFF" />
          <stop offset="1" stopColor="#8AF5C8" />
        </linearGradient>
        <linearGradient id={`${id}inner`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#6FA2FF" />
          <stop offset="0.5" stopColor="#3D6CFF" />
          <stop offset="1" stopColor="#3FA8F0" />
        </linearGradient>
        <linearGradient id={`${id}check`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#F2F8FF" />
          <stop offset="1" stopColor="#9EC3FF" />
        </linearGradient>
        <radialGradient id={`${id}gloss`} cx="0.3" cy="0.18" r="0.55">
          <stop offset="0" stopColor="#fff" stopOpacity="0.5" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
        <filter id={`${id}blur`} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="9" />
        </filter>
      </defs>
      {/* Soft cyan glow */}
      <path d={SHIELD} fill="#58D8FF" opacity="0.35" filter={`url(#${id}blur)`} />
      {/* Extrusion */}
      {layers.map((k) => (
        <path key={k} d={SHIELD} fill={`url(#${id}side)`} transform={`translate(${-k * 0.9} ${k * 0.16})`} />
      ))}
      {/* Specular glare along the extruded edge */}
      <path d="M3 44V100C3 150 30 186 72 210" fill="none" stroke="#fff" strokeOpacity="0.7" strokeWidth="3.2" strokeLinecap="round" />
      <path d="M-4 52V104C-4 146 16 176 46 198" fill="none" stroke="#C9D3FF" strokeOpacity="0.45" strokeWidth="5" strokeLinecap="round" />
      {/* Face + rim */}
      <path d={SHIELD} fill={`url(#${id}face)`} />
      <path d={SHIELD} fill="none" stroke={`url(#${id}rim)`} strokeWidth="4" opacity="0.95" />
      {/* Inner glass panel */}
      <path d={SHIELD} transform="translate(20 22) scale(0.8)" fill={`url(#${id}inner)`} opacity="0.95" />
      <path d={SHIELD} transform="translate(20 22) scale(0.8)" fill="none" stroke="#fff" strokeOpacity="0.5" strokeWidth="1.8" />
      {/* Check mark (extruded) */}
      <path d="M70 114L92 136L134 90" fill="none" stroke="#2A4FE0" strokeWidth="21" strokeLinecap="round" strokeLinejoin="round" transform="translate(-6 5.5)" />
      <path d="M70 114L92 136L134 90" fill="none" stroke="#3E6CF2" strokeWidth="21" strokeLinecap="round" strokeLinejoin="round" transform="translate(-3 2.8)" />
      <path d="M70 114L92 136L134 90" fill="none" stroke={`url(#${id}check)`} strokeWidth="21" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M70 114L92 136L134 90" fill="none" stroke="#fff" strokeOpacity="0.75" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" transform="translate(-1.6 -4.2)" />
      <path d={SHIELD} fill={`url(#${id}gloss)`} />
    </svg>
  );
};


