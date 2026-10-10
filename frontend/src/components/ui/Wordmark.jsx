import { useLayoutEffect, useRef, useState } from "react";
import { LOGO_PATHS } from "./BrandLoader.jsx";
import { cn } from "../../utils/cn.js";

/**
 * Wordmark — renders "Unideals" where the "U" is a REAL svg path traced
 * from the loaded Figtree glyph (not a <text> element, not an image), so
 * it looks exactly like the surrounding type. On hover that very same
 * path geometrically morphs into the logo mark: both outlines are
 * resampled to matching point loops and every vertex is interpolated,
 * while the fill shifts from the text color to brand indigo.
 *
 * No crossfade, no second element sliding in — one path, transforming.
 *
 * Props (same contract as before, Header needs no changes):
 * - fontSize / fontWeight / letterSpacing
 * - className: text color, e.g. "text-[#000000] dark:text-white"
 * - opticalY: vertical optical correction in px (default 1). The wordmark
 *   has no descenders, so geometrically-centered ink reads ~1px high;
 *   tune this single number if it ever looks off.
 */
const TRACE_SIZE = 200;
const N_POINTS = 160;
const BRAND_RGB = [74, 77, 254];
const MORPH_MS = 480;

// ---- marching squares: trace the outer contour of a glyph bitmap ----
// Per-cell segments (TL*8+TR*4+BR*2+BL), stitched into closed loops by
// exact endpoint matching; the longest loop is the outer contour.
// Saddles (5/10) use the disconnected resolution — always closed, and
// antialiased glyph edges make them vanishingly rare anyway.
function traceContour(data, w, h) {
  const alpha = (x, y) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return 0;
    return data[(y * w + x) * 4 + 3] / 255;
  };
  const cross = (x0, y0, x1, y1) => {
    const a0 = alpha(x0, y0);
    const a1 = alpha(x1, y1);
    const t = Math.min(1, Math.max(0, (0.5 - a0) / (a1 - a0 || 1e-6)));
    return [x0 + (x1 - x0) * t, y0 + (y1 - y0) * t];
  };
  const segs = [];
  for (let j = 0; j < h - 1; j++) {
    for (let i = 0; i < w - 1; i++) {
      const tl = alpha(i, j) > 0.5 ? 8 : 0;
      const tr = alpha(i + 1, j) > 0.5 ? 4 : 0;
      const br = alpha(i + 1, j + 1) > 0.5 ? 2 : 0;
      const bl = alpha(i, j + 1) > 0.5 ? 1 : 0;
      const c = tl + tr + br + bl;
      if (c === 0 || c === 15) continue;
      const T = cross(i, j, i + 1, j);
      const R = cross(i + 1, j, i + 1, j + 1);
      const B = cross(i, j + 1, i + 1, j + 1);
      const L = cross(i, j, i, j + 1);
      const emit = (a, b) => segs.push([a, b]);
      // All segments oriented clockwise (interior on the right, y-down)
      // so start->end chaining always links up. Note complementary
      // cases run in opposite directions.
      switch (c) {
        case 1:
          emit(L, B);
          break;
        case 14:
          emit(B, L);
          break;
        case 2:
          emit(B, R);
          break;
        case 13:
          emit(R, B);
          break;
        case 3:
          emit(L, R);
          break;
        case 12:
          emit(R, L);
          break;
        case 4:
          emit(R, T);
          break;
        case 11:
          emit(T, R);
          break;
        case 6:
          emit(B, T);
          break;
        case 9:
          emit(T, B);
          break;
        case 7:
          emit(L, T);
          break;
        case 8:
          emit(T, L);
          break;
        case 5:
          emit(R, T);
          emit(L, B);
          break;
        case 10:
          emit(T, L);
          emit(B, R);
          break;
        default:
          break;
      }
    }
  }
  if (!segs.length) return null;
  // stitch
  const key = (p) => p[0].toFixed(4) + "," + p[1].toFixed(4);
  const startMap = new Map();
  segs.forEach((s, idx) => {
    const k = key(s[0]);
    if (!startMap.has(k)) startMap.set(k, []);
    startMap.get(k).push(idx);
  });
  const used = new Array(segs.length).fill(false);
  let best = null;
  for (let s = 0; s < segs.length; s++) {
    if (used[s]) continue;
    used[s] = true;
    const loop = [segs[s][0], segs[s][1]];
    let closed = false;
    for (let guard = 0; guard < segs.length; guard++) {
      const tailKey = key(loop[loop.length - 1]);
      if (tailKey === key(loop[0])) {
        closed = true;
        break;
      }
      const next = (startMap.get(tailKey) || []).find((i) => !used[i]);
      if (next === undefined) break;
      used[next] = true;
      loop.push(segs[next][1]);
    }
    if (closed && loop.length > (best ? best.length : 12)) best = loop;
  }
  return best;
}

function signedArea(pts) {
  let a = 0;
  for (let i = 0; i < pts.length; i++) {
    const [x1, y1] = pts[i];
    const [x2, y2] = pts[(i + 1) % pts.length];
    a += x1 * y2 - x2 * y1;
  }
  return a / 2;
}

// resample a closed loop to n evenly spaced points, starting at the
// topmost point, forced clockwise (screen coords, y down => area > 0)
function normalizeLoop(pts, n) {
  let loop = pts.slice();
  if (signedArea(loop) < 0) loop.reverse();
  // start at topmost (then leftmost)
  let bi = 0;
  for (let i = 1; i < loop.length; i++) {
    if (
      loop[i][1] < loop[bi][1] ||
      (loop[i][1] === loop[bi][1] && loop[i][0] < loop[bi][0])
    ) {
      bi = i;
    }
  }
  loop = loop.slice(bi).concat(loop.slice(0, bi));
  // arclength resample
  const cum = [0];
  for (let i = 1; i <= loop.length; i++) {
    const [x1, y1] = loop[i - 1];
    const [x2, y2] = loop[i % loop.length];
    cum.push(cum[i - 1] + Math.hypot(x2 - x1, y2 - y1));
  }
  const total = cum[cum.length - 1];
  const out = [];
  let j = 0;
  for (let k = 0; k < n; k++) {
    const target = (total * k) / n;
    while (j < cum.length - 2 && cum[j + 1] < target) j++;
    const segLen = cum[j + 1] - cum[j] || 1e-6;
    const t = (target - cum[j]) / segLen;
    const [x1, y1] = loop[j % loop.length];
    const [x2, y2] = loop[(j + 1) % loop.length];
    out.push([x1 + (x2 - x1) * t, y1 + (y2 - y1) * t]);
  }
  return out;
}

function samplePathEl(pathEl, n) {
  const total = pathEl.getTotalLength();
  const pts = [];
  for (let k = 0; k < n; k++) {
    const p = pathEl.getPointAtLength((total * k) / n);
    pts.push([p.x, p.y]);
  }
  return pts;
}

const parseTranslate = (t) => {
  const m = /translate\(\s*(-?[\d.]+)[,\s]+(-?[\d.]+)\s*\)/.exec(t || "");
  return m ? [+m[1], +m[2]] : [0, 0];
};

const easeInOutCubic = (t) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

export default function Wordmark({
  fontSize = 19,
  fontWeight = 700,
  letterSpacing = -0.5,
  opticalY = 1,
  className,
}) {
  const textRef = useRef(null);
  const restRef = useRef(null);
  const pathRef = useRef(null);
  const accentRef = useRef(null);
  const samplerRef = useRef(null);
  const sampler2Ref = useRef(null);
  const modelRef = useRef(null);
  const rafRef = useRef(0);
  const tRef = useRef(0);
  const targetRef = useRef(0);
  const lastRef = useRef(0);
  const [fallback, setFallback] = useState(false);
  const [adv, setAdv] = useState(null);
  const [box, setBox] = useState(null);
  const reduced =
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Build the morph model: traced U loop + mapped logo loops
  const build = () => {
    try {
      const canvas = document.createElement("canvas");
      const PAD = 30;
      canvas.width = TRACE_SIZE + PAD * 2;
      canvas.height = TRACE_SIZE + PAD * 2;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      ctx.font = `${fontWeight} ${TRACE_SIZE}px Figtree, Inter, sans-serif`;
      ctx.fillStyle = "#fff";
      ctx.textBaseline = "alphabetic";
      const k = fontSize / TRACE_SIZE;
      const adv = ctx.measureText("U").width * k;
      const bx = PAD;
      const baseline = PAD + TRACE_SIZE * 0.82;
      ctx.fillText("U", bx, baseline);
      const img = ctx.getImageData(0, 0, canvas.width, canvas.height);

      const contour = traceContour(img.data, canvas.width, canvas.height);
      if (!contour) return false;
      // to svg units, glyph origin at x=0, baseline at y=0
      const uLoop = contour.map(([x, y]) => [(x - bx) * k, (y - baseline) * k]);

      // logo main path sampled + mapped into the U slot
      const p1 = samplerRef.current;
      const p2 = sampler2Ref.current;
      if (!p1 || !p2) return false;
      const [t1x, t1y] = parseTranslate(LOGO_PATHS[0].transform);
      const raw1 = samplePathEl(p1, N_POINTS).map(([x, y]) => [x + t1x, y + t1y]);
      const [t2x, t2y] = parseTranslate(LOGO_PATHS[1].transform);
      const raw2 = samplePathEl(p2, Math.floor(N_POINTS / 2)).map(([x, y]) => [
        x + t2x,
        y + t2y,
      ]);
      // full logo bbox -> U bbox mapping (uniform, centered)
      const bbox = (pts) => {
        let a = [1e9, 1e9, -1e9, -1e9];
        for (const [x, y] of pts) {
          a = [Math.min(a[0], x), Math.min(a[1], y), Math.max(a[2], x), Math.max(a[3], y)];
        }
        return a;
      };
      const lb = bbox(raw1.concat(raw2));
      const ub = bbox(uLoop);
      const s = (ub[3] - ub[1]) / ((lb[3] - lb[1]) || 1e-6);
      const lc = [(lb[0] + lb[2]) / 2, (lb[1] + lb[3]) / 2];
      const uc = [(ub[0] + ub[2]) / 2, (ub[1] + ub[3]) / 2];
      const map = ([x, y]) => [uc[0] + (x - lc[0]) * s, uc[1] + (y - lc[1]) * s];

      const logoLoop = normalizeLoop(raw1.map(map), N_POINTS);
      const uNorm = normalizeLoop(uLoop, N_POINTS);

      // accent path end transform: translate(ox,oy) scale(s) translate(t2x,t2y)
      const ox = uc[0] - lc[0] * s;
      const oy = uc[1] - lc[1] * s;

      // base text color for the fill lerp
      let base = [17, 17, 17];
      try {
        const cs = window.getComputedStyle(textRef.current).color;
        const m = cs.match(/[\d.]+/g);
        if (m && m.length >= 3) base = [+m[0], +m[1], +m[2]];
      } catch {
        // keep default
      }

      modelRef.current = {
        u: uNorm,
        logo: logoLoop,
        adv,
        ls: letterSpacing,
        accentTransform: `translate(${ox} ${oy}) scale(${s}) translate(${t2x} ${t2y})`,
        base,
      };
      setAdv(adv);
      // exact ink bbox of the whole word (traced U + "nideals" text)
      try {
        if (restRef.current) {
          const tb = restRef.current.getBBox();
          const gx0 = Math.min(ub[0], tb.x);
          const gy0 = Math.min(ub[1], tb.y);
          const gx1 = Math.max(ub[2], tb.x + tb.width);
          const gy1 = Math.max(ub[3], tb.y + tb.height);
          setBox({ x: gx0, y: gy0, w: gx1 - gx0, h: gy1 - gy0 });
        }
      } catch {
        // keep estimated box
      }
      return true;
    } catch {
      return false;
    }
  };

  const render = (t) => {
    const m = modelRef.current;
    if (!m || !pathRef.current) return;
    const e = easeInOutCubic(Math.min(1, Math.max(0, t)));
    let d = "";
    for (let i = 0; i < N_POINTS; i++) {
      const x = m.u[i][0] + (m.logo[i][0] - m.u[i][0]) * e;
      const y = m.u[i][1] + (m.logo[i][1] - m.u[i][1]) * e;
      d += (i === 0 ? "M" : "L") + x.toFixed(2) + " " + y.toFixed(2);
    }
    pathRef.current.setAttribute("d", d + "Z");
    const r = Math.round(m.base[0] + (BRAND_RGB[0] - m.base[0]) * e);
    const g = Math.round(m.base[1] + (BRAND_RGB[1] - m.base[1]) * e);
    const b = Math.round(m.base[2] + (BRAND_RGB[2] - m.base[2]) * e);
    if (t <= 0) {
      pathRef.current.setAttribute("fill", "currentColor");
    } else {
      pathRef.current.setAttribute("fill", `rgb(${r},${g},${b})`);
    }
    if (accentRef.current) {
      const ao = Math.min(1, Math.max(0, (t - 0.55) / 0.45));
      accentRef.current.setAttribute("opacity", ao.toFixed(3));
    }
  };

  const tick = (now) => {
    const dt = Math.min(64, now - (lastRef.current || now));
    lastRef.current = now;
    const speed = dt / MORPH_MS;
    const cur = tRef.current;
    const tgt = targetRef.current;
    const next = cur < tgt ? Math.min(tgt, cur + speed) : Math.max(tgt, cur - speed);
    tRef.current = next;
    render(next);
    if (next !== tgt) {
      rafRef.current = requestAnimationFrame(tick);
    } else {
      rafRef.current = 0;
    }
  };

  const kick = () => {
    if (reduced) {
      tRef.current = targetRef.current;
      render(tRef.current);
      return;
    }
    lastRef.current = 0;
    if (!rafRef.current) rafRef.current = requestAnimationFrame(tick);
  };

  useLayoutEffect(() => {
    let alive = true;
    const init = () => {
      if (!alive) return;
      const ok = build();
      if (!ok) {
        setFallback(true);
        return;
      }
      render(tRef.current);
    };
    init();
    if (typeof document !== "undefined" && document.fonts) {
      try {
        document.fonts
          .load(`${fontWeight} ${fontSize}px Figtree`, "UnidealsU")
          .then(() => alive && init())
          .catch(() => {});
        if (document.fonts.ready) {
          document.fonts.ready.then(() => alive && init()).catch(() => {});
        }
      } catch {
        // ignore
      }
    }
    return () => {
      alive = false;
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fontSize, fontWeight, letterSpacing]);

  const advTotal = (adv ?? fontSize * 0.72) + letterSpacing;

  // Fallback: plain static wordmark if tracing/sampling is unavailable
  if (fallback) {
    return (
      <span className={cn("inline-flex", className)} role="img" aria-label="Unideals">
        <svg
          className="block overflow-visible"
          fontFamily="Figtree, Inter, sans-serif"
          fontSize={fontSize}
          fontWeight={fontWeight}
          letterSpacing={letterSpacing}
          fill="currentColor"
          aria-hidden="true"
        >
          <text x={0} y={0}>
            Unideals
          </text>
        </svg>
      </span>
    );
  }

  return (
    <span
      className="wm inline-flex"
      onMouseEnter={() => {
        targetRef.current = 1;
        kick();
      }}
      onMouseLeave={() => {
        targetRef.current = 0;
        kick();
      }}
    >
      <svg
        ref={textRef}
        className={cn("block overflow-visible", className)}
        width={box ? box.w : fontSize * 4.6}
        height={box ? box.h : fontSize * 1.2}
        viewBox={
          box
            ? `${box.x} ${box.y} ${box.w} ${box.h}`
            : `0 ${-fontSize} ${fontSize * 4.6} ${fontSize * 1.3}`
        }
        style={opticalY ? { transform: `translateY(${opticalY}px)` } : undefined}
        fontFamily="Figtree, Inter, sans-serif"
        fontSize={fontSize}
        fontWeight={fontWeight}
        letterSpacing={letterSpacing}
        role="img"
        aria-label="Unideals"
      >
        {/* morphing U path (built at runtime) + static rest of the word */}
        <path ref={pathRef} d="" fill="currentColor" />
        <text ref={restRef} x={advTotal} y={0} fill="currentColor">
          nideals
        </text>
        {/* accent piece of the mark, fades in late in the morph */}
        <g
          ref={accentRef}
          opacity={0}
          transform={modelRef.current?.accentTransform}
        >
          <path d={LOGO_PATHS[1].d} fill={`rgb(${BRAND_RGB.join(",")})`} />
        </g>
      </svg>

      {/* hidden samplers for logo geometry (rendered but invisible) */}
      <svg
        aria-hidden="true"
        focusable="false"
        style={{
          position: "absolute",
          width: 10,
          height: 10,
          opacity: 0,
          pointerEvents: "none",
        }}
      >
        <path ref={samplerRef} d={LOGO_PATHS[0].d} />
        <path ref={sampler2Ref} d={LOGO_PATHS[1].d} />
      </svg>
    </span>
  );
}