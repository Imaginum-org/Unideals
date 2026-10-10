import { useCallback, useEffect, useRef } from "react";

/**
 * PriceRangeSlider — dependency-free dual-thumb range slider.
 *
 * Drag architecture (deliberately simple, capture-independent):
 * - pointerdown on a thumb (or track) records the active thumb;
 * - window-level pointermove/pointerup listeners drive the gesture, so it
 *   keeps tracking even if the pointer leaves the thumb, capture fails,
 *   or the framework re-renders mid-gesture. All live values come from
 *   refs, so the handlers never go stale.
 * - `touch-action: none` on the control stops mobile browsers from
 *   stealing the gesture for scroll; thumbs are real <button>s with full
 *   keyboard support (arrows/Home/End + ARIA slider roles).
 *
 * Controlled contract:
 *   value=[lo, hi], onChange(live) on every move, onAfterChange(commit)
 *   once per gesture. Parent URL commits stay in onAfterChange, so
 *   dragging never floods the router.
 */
export default function PriceRangeSlider({
  min = 0,
  max = 100,
  step = 1,
  value = [0, 0],
  minDistance = 0,
  onChange,
  onAfterChange,
  minLabel = "Minimum price",
  maxLabel = "Maximum price",
  className = "",
}) {
  const trackRef = useRef(null);
  const activeRef = useRef(-1);

  // Everything the window listeners need lives in refs (always fresh,
  // registered once, immune to re-renders and stale closures).
  const liveRef = useRef({ min, max, step, minDistance, value, onChange, onAfterChange });
  liveRef.current = { min, max, step, minDistance, value, onChange, onAfterChange };

  const range = max - min > 0 ? max - min : 1;
  const [lo, hi] = value;
  const loPct = ((lo - min) / range) * 100;
  const hiPct = ((hi - min) / range) * 100;

  const valueFromClientX = useCallback((clientX) => {
    const { min: mn, step: st, max: mx } = liveRef.current;
    const el = trackRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    if (!rect || rect.width <= 0) return null;
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    const r = mx - mn > 0 ? mx - mn : 1;
    const stepped = Math.round((ratio * r) / st) * st;
    return mn + stepped;
  }, []);

  const moveActiveTo = useCallback((clientX) => {
    const { min: mn, max: mx, minDistance: md, value: cur, onChange: oc } =
      liveRef.current;
    if (activeRef.current < 0) return;
    const v = valueFromClientX(clientX);
    if (v == null) return;
    const [curLo, curHi] = cur;
    if (activeRef.current === 0) {
      const clamped = Math.min(Math.max(v, mn), curHi - md);
      if (clamped === curLo) return;
      oc?.([clamped, curHi]);
    } else {
      const clamped = Math.max(Math.min(v, mx), curLo + md);
      if (clamped === curHi) return;
      oc?.([curLo, clamped]);
    }
  }, [valueFromClientX]);

  // Window-level gesture drivers — registered once, read only refs.
  useEffect(() => {
    const onMove = (e) => {
      if (activeRef.current < 0) return;
      if (e.cancelable && e.pointerType === "touch") {
        // touch-action:none on the control already prevents scroll;
        // this is belt-and-braces for older webviews.
        e.preventDefault();
      }
      const { min: mn, max: mx, step: st, minDistance: md, value: cur, onChange: oc } =
        liveRef.current;
      const el = trackRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      if (!rect || rect.width <= 0) return;
      const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
      const r = mx - mn > 0 ? mx - mn : 1;
      const v = mn + Math.round((ratio * r) / st) * st;
      const [curLo, curHi] = cur;
      if (activeRef.current === 0) {
        const clamped = Math.min(Math.max(v, mn), curHi - md);
        if (clamped !== curLo) oc?.([clamped, curHi]);
      } else {
        const clamped = Math.max(Math.min(v, mx), curLo + md);
        if (clamped !== curHi) oc?.([curLo, clamped]);
      }
    };
    const onUp = () => {
      if (activeRef.current < 0) return;
      activeRef.current = -1;
      const { value: cur, onAfterChange: oac } = liveRef.current;
      oac?.([cur[0], cur[1]]);
    };
    window.addEventListener("pointermove", onMove, { passive: false });
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    // Release outside the document can skip pointerup — never leave a
    // stale active thumb that would jump on the next unrelated move.
    window.addEventListener("blur", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      window.removeEventListener("blur", onUp);
    };
  }, []);

  const beginDrag = (index) => (e) => {
    // No preventDefault here: it can suppress focus/capture chains on
    // some mobile browsers. select-none + touch-none already guard the
    // gesture. Stop propagation so the track handler doesn't double-set.
    e.stopPropagation();
    activeRef.current = index;
    try {
      e.currentTarget.setPointerCapture?.(e.pointerId);
    } catch {
      // window listeners drive the gesture regardless
    }
    moveActiveTo(e.clientX);
  };

  const onTrackDown = (e) => {
    // Clicking the track jumps the NEAREST thumb there; the window move
    // listener seamlessly continues the gesture from this pointerdown.
    const { value: cur } = liveRef.current;
    const el = trackRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (!rect || rect.width <= 0) return;
    const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    const { min: mn, max: mx } = liveRef.current;
    const v = mn + ratio * (mx - mn > 0 ? mx - mn : 1);
    activeRef.current = Math.abs(v - cur[0]) <= Math.abs(v - cur[1]) ? 0 : 1;
    moveActiveTo(e.clientX);
  };

  const stepThumb = (index, dir) => {
    const { min: mn, max: mx, step: st, minDistance: md, value: cur, onChange: oc, onAfterChange: oac } =
      liveRef.current;
    if (index === 0) {
      const next = Math.min(Math.max(cur[0] + dir * st, mn), cur[1] - md);
      if (next === cur[0]) return;
      const nv = [next, cur[1]];
      oc?.(nv);
      oac?.(nv);
    } else {
      const next = Math.max(Math.min(cur[1] + dir * st, mx), cur[0] + md);
      if (next === cur[1]) return;
      const nv = [cur[0], next];
      oc?.(nv);
      oac?.(nv);
    }
  };

  const onThumbKey = (index) => (e) => {
    if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
      e.preventDefault();
      stepThumb(index, -1);
    } else if (e.key === "ArrowRight" || e.key === "ArrowUp") {
      e.preventDefault();
      stepThumb(index, 1);
    } else if (e.key === "Home") {
      e.preventDefault();
      const { min: mn, value: cur, onChange: oc, onAfterChange: oac } = liveRef.current;
      const v = index === 0 ? [mn, cur[1]] : [cur[0], liveRef.current.max];
      oc?.(v);
      oac?.(v);
    } else if (e.key === "End") {
      e.preventDefault();
      const { max: mx, value: cur, onChange: oc, onAfterChange: oac } = liveRef.current;
      const v = index === 0 ? [cur[1] - liveRef.current.minDistance, cur[1]] : [cur[0], mx];
      oc?.(v);
      oac?.(v);
    }
  };

  const thumbBase =
    "absolute top-1/2 -translate-x-1/2 -translate-y-1/2 size-5 rounded-full bg-[#394FF1] border-2 border-white shadow-md cursor-grab active:cursor-grabbing outline-none transition-shadow focus-visible:ring-2 focus-visible:ring-[#394FF1] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#131313] touch-none select-none";

  return (
    <div
      ref={trackRef}
      role="group"
      aria-label="Price range"
      onPointerDown={onTrackDown}
      className={`relative h-7 w-full touch-none select-none ${className}`}
    >
      {/* rail */}
      <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-zinc-200 dark:bg-zinc-700" />
      {/* active fill */}
      <div
        className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-[#394FF1]"
        style={{ left: `${loPct}%`, width: `${Math.max(0, hiPct - loPct)}%` }}
      />
      {[0, 1].map((i) => (
        <button
          key={i}
          type="button"
          role="slider"
          aria-label={i === 0 ? minLabel : maxLabel}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={i === 0 ? lo : hi}
          aria-valuetext={`₹${(i === 0 ? lo : hi).toLocaleString("en-IN")}`}
          onPointerDown={beginDrag(i)}
          onKeyDown={onThumbKey(i)}
          onDragStart={(e) => e.preventDefault()}
          onContextMenu={(e) => e.preventDefault()}
          className={thumbBase}
          style={{ left: `${i === 0 ? loPct : hiPct}%`, zIndex: activeRef.current === i ? 2 : 1 }}
        />
      ))}
    </div>
  );
}
