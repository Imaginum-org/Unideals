import { useId } from "react";

/*
 * Plan logos: the Unideals "U" monogram on a squircle, one per plan.
 * Free = quiet slate, Pro = brand indigo with a spark, Pro Plus = midnight
 * with a gold crown. Pure SVG, so it stays crisp at any size.
 */

const STYLES = {
  free: { from: "#F1F5F9", to: "#E2E8F0", stroke: "#475569", edge: "rgba(15,23,42,0.08)" },
  pro: { from: "#4F46E5", to: "#3838EC", stroke: "#FFFFFF", edge: "rgba(255,255,255,0.18)" },
  "pro-plus": { from: "#1E1B4B", to: "#0F172A", stroke: "#FCD34D", edge: "rgba(252,211,77,0.35)" },
};

export default function PlanMark({ plan = "free", size = 40, className, title }) {
  const id = useId().replace(/:/g, "");
  const s = STYLES[plan] || STYLES.free;
  const crowned = plan === "pro-plus";
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      className={className}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      <defs>
        <linearGradient id={`pm-bg-${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={s.from} />
          <stop offset="1" stopColor={s.to} />
        </linearGradient>
        <linearGradient id={`pm-gold-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FDE68A" />
          <stop offset="1" stopColor="#F59E0B" />
        </linearGradient>
      </defs>
      {/* squircle */}
      <path d="M20 1.5c11.5 0 18.5 7 18.5 18.5S31.5 38.5 20 38.5 1.5 31.5 1.5 20 8.5 1.5 20 1.5z" fill={`url(#pm-bg-${id})`} />
      <path d="M20 2c11.2 0 18 6.8 18 18S31.2 38 20 38 2 31.2 2 20 8.8 2 20 2z" fill="none" stroke={s.edge} />
      {/* U monogram */}
      <path
        d={crowned ? "M13.5 16v6.5a6.5 6.5 0 0 0 13 0V16" : "M13.5 12.5v9a6.5 6.5 0 0 0 13 0v-9"}
        fill="none"
        stroke={crowned ? `url(#pm-gold-${id})` : s.stroke}
        strokeWidth="3.4"
        strokeLinecap="round"
      />
      {plan === "pro" && (
        // spark
        <path d="M30 6.5l1 2.6 2.6 1-2.6 1-1 2.6-1-2.6-2.6-1 2.6-1z" fill="#FFFFFF" opacity="0.95" />
      )}
      {crowned && (
        // crown
        <path d="M13 12.5l2-5 3 3 2-4 2 4 3-3 2 5z" fill={`url(#pm-gold-${id})`} strokeLinejoin="round" />
      )}
    </svg>
  );
}
