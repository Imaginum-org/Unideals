/*
 * Line-art campus buildings, shared by the home page's "From one hostel room
 * to another" section and the profile banner. Each piece is drawn around a
 * base-centre origin (0, 0 = middle of the building's ground line), so a
 * caller just translates + scales it. Styling comes from the `.cj-*` classes
 * in styles/index.css (stroke draw-in, fills, active highlight, dark mode).
 */

export function Hostel() {
  return (
    <>
      <rect className="cj-fill cj-line" pathLength="1" x="-70" y="-170" width="140" height="170" rx="6" />
      <rect className="cj-fill cj-line" pathLength="1" x="-78" y="-180" width="156" height="12" rx="3" />
      {[0, 1, 2, 3, 4].map((r) =>
        [0, 1, 2].map((c) => (
          <rect key={`${r}${c}`} className="cj-window" x={-50 + c * 36} y={-156 + r * 26} width="28" height="14" rx="2.5" />
        )),
      )}
      <rect className="cj-line cj-door" pathLength="1" x="-13" y="-30" width="26" height="30" rx="3" />
    </>
  );
}

export function Academic() {
  return (
    <>
      <rect className="cj-fill cj-line" pathLength="1" x="-32" y="-190" width="64" height="56" rx="4" />
      <circle className="cj-line" pathLength="1" cx="0" cy="-163" r="13" />
      <path className="cj-line" pathLength="1" d="M0 -171 V-163 L6 -159" />
      <path className="cj-fill cj-line" pathLength="1" d="M-140 -136 H140 L128 -150 H-128 Z" />
      <rect className="cj-fill cj-line" pathLength="1" x="-128" y="-136" width="256" height="124" rx="3" />
      {[-104, -66, -28, 16, 54, 92].map((x) => (
        <rect key={x} className="cj-window" x={x} y="-120" width="12" height="96" rx="3" />
      ))}
      <rect className="cj-fill cj-line" pathLength="1" x="-140" y="-12" width="280" height="12" rx="2" />
    </>
  );
}

export function Canteen() {
  return (
    <>
      <rect className="cj-fill cj-line" pathLength="1" x="-44" y="-104" width="88" height="22" rx="5" />
      <rect className="cj-fill cj-line" pathLength="1" x="-70" y="-72" width="140" height="72" rx="4" />
      <path
        className="cj-line"
        pathLength="1"
        d="M-78 -82 H78 V-72 a9.75 9.75 0 0 1 -19.5 0 a9.75 9.75 0 0 1 -19.5 0 a9.75 9.75 0 0 1 -19.5 0 a9.75 9.75 0 0 1 -19.5 0 a9.75 9.75 0 0 1 -19.5 0 a9.75 9.75 0 0 1 -19.5 0 a9.75 9.75 0 0 1 -19.5 0 a9.75 9.75 0 0 1 -19.5 0 Z"
      />
      <rect className="cj-window" x="-54" y="-50" width="44" height="30" rx="3" />
      <rect className="cj-line cj-door" pathLength="1" x="14" y="-50" width="32" height="50" rx="3" />
    </>
  );
}

export function Tree({ x, y, s }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path className="cj-line" pathLength="1" d="M0 0 V-26" />
      <circle className="cj-tree cj-line" pathLength="1" cx="0" cy="-44" r="20" />
    </g>
  );
}
