import { memo, useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  X,
  ZoomIn,
  ZoomOut,
  RotateCcw,
} from "lucide-react";
import { ikFull, ikThumb } from "../../../utils/imageTransform.js";

const MIN_ZOOM = 1;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.5;
const DOUBLE_TAP_ZOOM = 2.2;
const SWIPE_THRESHOLD = 60;

const clampZoom = (value) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value));

const iconButtonClass =
  "flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white shadow-lg backdrop-blur-md transition-all duration-200 hover:scale-105 hover:bg-white hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 active:scale-95 disabled:pointer-events-none disabled:opacity-30";

/**
 * ImageLightbox — fullscreen viewer with zoom + infinite-loop nav.
 *
 * Controlled by parent: `open`, `index`, `onClose`, `onIndexChange`.
 * - Esc closes, arrows navigate (wraps around)
 * - Zoom 1x–3x via buttons / wheel / double-click, anchored to center.
 *   The image is never draggable — no pan, no hand tool.
 * - Mobile swipe navigates via touch gesture detection (no visual dragging).
 * - Body scroll locked while open, focus moved to close button.
 */
const ImageLightbox = memo(function ImageLightbox({
  open = false,
  images = [],
  index = 0,
  onClose,
  onIndexChange,
}) {
  const [scale, setScale] = useState(MIN_ZOOM);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [direction, setDirection] = useState(0);
  const closeRef = useRef(null);
  const stageRef = useRef(null);
  const viewportRef = useRef(null);
  const imgRef = useRef(null);
  const touchStartX = useRef(null);
  const dragRef = useRef({ active: false, startX: 0, startY: 0, baseX: 0, baseY: 0 });
  const total = images.length;
  const safeIndex = total > 0 ? ((index % total) + total) % total : 0;
  const src = images[safeIndex];

  const goTo = useCallback(
    (nextIndex, dir = 0) => {
      if (total <= 1) return;
      setDirection(dir);
      setScale(MIN_ZOOM);
      setPan({ x: 0, y: 0 });
      onIndexChange?.(((nextIndex % total) + total) % total);
    },
    [onIndexChange, total],
  );

  const goNext = useCallback(
    () => goTo(safeIndex + 1, 1),
    [goTo, safeIndex],
  );
  const goPrev = useCallback(
    () => goTo(safeIndex - 1, -1),
    [goTo, safeIndex],
  );

  const zoomBy = useCallback((delta) => {
    setScale((prev) => clampZoom(Math.round((prev + delta) * 10) / 10));
  }, []);

  const toggleZoom = useCallback(() => {
    setScale((prev) => (prev > MIN_ZOOM ? MIN_ZOOM : DOUBLE_TAP_ZOOM));
    setPan({ x: 0, y: 0 });
  }, []);

  /**
   * Clamp pan so the zoomed image can be moved around but never dragged
   * off-screen: translation is limited to the scaled overflow on each axis.
   */
  const clampPan = useCallback((x, y, s) => {
    const viewport = viewportRef.current;
    const img = imgRef.current;
    if (!viewport || !img) return { x: 0, y: 0 };
    const maxX = Math.max(0, (img.offsetWidth * s - viewport.clientWidth) / 2);
    const maxY = Math.max(0, (img.offsetHeight * s - viewport.clientHeight) / 2);
    return {
      x: Math.min(maxX, Math.max(-maxX, x)),
      y: Math.min(maxY, Math.max(-maxY, y)),
    };
  }, []);

  // Hand-tool pan — only active while zoomed. Pointer capture keeps the
  // gesture glued to the image; clamping keeps it inside the viewport.
  const handlePointerDown = (e) => {
    if (scale <= MIN_ZOOM) return;
    dragRef.current = {
      active: true,
      startX: e.clientX,
      startY: e.clientY,
      baseX: pan.x,
      baseY: pan.y,
    };
    setDragging(true);
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Pointer capture is best-effort only
    }
  };

  const handlePointerMove = (e) => {
    const d = dragRef.current;
    if (!d.active) return;
    setPan(
      clampPan(d.baseX + (e.clientX - d.startX), d.baseY + (e.clientY - d.startY), scale),
    );
  };

  const endPan = () => {
    dragRef.current.active = false;
    setDragging(false);
  };

  // Re-clamp pan whenever zoom changes (e.g. zooming out pulls the image back).
  useEffect(() => {
    setPan((prev) => {
      if (prev.x === 0 && prev.y === 0) return prev;
      return clampPan(prev.x, prev.y, scale);
    });
  }, [scale, clampPan]);

  // Reset zoom + pan + preload neighbours whenever the image changes.
  useEffect(() => {
    setScale(MIN_ZOOM);
    setPan({ x: 0, y: 0 });
    if (total > 1) {
      [images[(safeIndex + 1) % total], images[(safeIndex - 1 + total) % total]].forEach(
        (s) => {
          if (!s) return;
          const img = new Image();
          img.src = s;
        },
      );
    }
  }, [safeIndex, total, images]);

  // Keyboard + scroll-lock + initial focus while open.
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose?.();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        goNext();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        goPrev();
      } else if (e.key === "+" || e.key === "=") {
        zoomBy(ZOOM_STEP);
      } else if (e.key === "-") {
        zoomBy(-ZOOM_STEP);
      } else if (e.key === "0") {
        setScale(MIN_ZOOM);
        setPan({ x: 0, y: 0 });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, goNext, goPrev, onClose, zoomBy]);

  // Wheel-to-zoom needs a non-passive listener (React's onWheel is passive).
  useEffect(() => {
    if (!open) return;
    const el = stageRef.current;
    if (!el) return;
    const onWheel = (e) => {
      e.preventDefault();
      zoomBy(e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [open, zoomBy]);

  // Swipe navigation via gesture detection — the image itself never moves
  // with the finger, it cross-fades/slides to the next image on release.
  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e) => {
    if (touchStartX.current == null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    // While zoomed the finger pans the image — never navigate.
    if (scale > MIN_ZOOM) return;
    if (Math.abs(dx) < SWIPE_THRESHOLD) return;
    if (dx < 0) {
      goNext();
    } else {
      goPrev();
    }
  };

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[100] flex flex-col bg-black/95 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Product image viewer"
          onClick={onClose}
        >
          {/* Top bar */}
          <div
            className="flex items-center justify-between gap-3 px-4 pt-4 sm:px-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="rounded-full bg-white/10 px-3 py-1.5 text-sm font-semibold tabular-nums text-white backdrop-blur-md">
              {safeIndex + 1} / {total}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => zoomBy(-ZOOM_STEP)}
                disabled={scale <= MIN_ZOOM}
                aria-label="Zoom out"
                className="h-10 w-10 rounded-full border border-white/20 bg-white/10 text-white backdrop-blur-md transition-all hover:bg-white hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 disabled:pointer-events-none disabled:opacity-30"
              >
                <ZoomOut size={18} className="mx-auto" />
              </button>
              <span className="min-w-[48px] text-center text-sm font-semibold tabular-nums text-white">
                {Math.round(scale * 100)}%
              </span>
              <button
                type="button"
                onClick={() => zoomBy(ZOOM_STEP)}
                disabled={scale >= MAX_ZOOM}
                aria-label="Zoom in"
                className="h-10 w-10 rounded-full border border-white/20 bg-white/10 text-white backdrop-blur-md transition-all hover:bg-white hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 disabled:pointer-events-none disabled:opacity-30"
              >
                <ZoomIn size={18} className="mx-auto" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setScale(MIN_ZOOM);
                  setPan({ x: 0, y: 0 });
                }}
                disabled={scale <= MIN_ZOOM}
                aria-label="Reset zoom"
                className="h-10 w-10 rounded-full border border-white/20 bg-white/10 text-white backdrop-blur-md transition-all hover:bg-white hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 disabled:pointer-events-none disabled:opacity-30"
              >
                <RotateCcw size={16} className="mx-auto" />
              </button>
            </div>

            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              aria-label="Close viewer"
              className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-black shadow-xl transition-all duration-200 hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 active:scale-95"
            >
              <X size={22} strokeWidth={2.5} />
            </button>
          </div>

          {/* Stage — zoomed image pans with a bounded hand tool, never free-drags */}
          <div
            ref={stageRef}
            className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden px-14 py-4 sm:px-20"
            onClick={(e) => e.stopPropagation()}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            {total > 1 && (
              <>
                <button
                  type="button"
                  onClick={goPrev}
                  aria-label="Previous image"
                  className={`${iconButtonClass} absolute left-3 top-1/2 z-10 -translate-y-1/2 sm:left-5`}
                >
                  <ChevronLeft size={24} strokeWidth={2.5} />
                </button>
                <button
                  type="button"
                  onClick={goNext}
                  aria-label="Next image"
                  className={`${iconButtonClass} absolute right-3 top-1/2 z-10 -translate-y-1/2 sm:right-5`}
                >
                  <ChevronRight size={24} strokeWidth={2.5} />
                </button>
              </>
            )}

            <div
              ref={viewportRef}
              className="flex max-h-full max-w-full flex-1 items-center justify-center self-stretch overflow-hidden"
            >
              <div
                className={`flex max-h-full max-w-full items-center justify-center ${
                  scale > MIN_ZOOM
                    ? dragging
                      ? "cursor-grabbing"
                      : "cursor-grab"
                    : "cursor-zoom-in"
                }`}
                style={{
                  transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
                  transformOrigin: "center center",
                  transition: dragging ? "none" : "transform 200ms ease-out",
                  touchAction: scale > MIN_ZOOM ? "none" : "auto",
                }}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={endPan}
                onPointerCancel={endPan}
              >
                <AnimatePresence mode="wait" custom={direction} initial={false}>
                <motion.img
                  key={src}
                  ref={imgRef}
                  src={ikFull(src)}
                  alt={`Product image ${safeIndex + 1}`}
                    custom={direction}
                    initial={{ opacity: 0, x: direction === 0 ? 0 : direction * 48 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: direction === 0 ? 0 : direction * -48 }}
                    transition={{ duration: 0.22, ease: "easeOut" }}
                    onDoubleClick={toggleZoom}
                    className="max-h-[70vh] w-auto max-w-full select-none rounded-lg object-contain shadow-2xl sm:max-h-[74vh]"
                    draggable={false}
                    onDragStart={(e) => e.preventDefault()}
                  />
                </AnimatePresence>
              </div>
            </div>
          </div>

          <p className="pointer-events-none px-4 text-center text-xs text-white/50">
            Scroll or double-click to zoom · Drag to look around when zoomed ·
            Arrows to browse
          </p>

          {/* Filmstrip */}
          {total > 1 && (
            <div
              className="flex justify-start gap-2.5 overflow-x-auto px-4 pb-5 pt-3 sm:justify-center"
              onClick={(e) => e.stopPropagation()}
              role="tablist"
              aria-label="All product images"
            >
              {images.map((img, i) => {
                const isActive = i === safeIndex;
                return (
                  <button
                    key={`${img}-${i}`}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    aria-label={`View image ${i + 1}`}
                    onClick={() => {
                      setDirection(i > safeIndex ? 1 : -1);
                      setScale(MIN_ZOOM);
                      setPan({ x: 0, y: 0 });
                      onIndexChange?.(i);
                    }}
                    className={`h-16 w-16 shrink-0 overflow-hidden rounded-lg transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 ${
                      isActive
                        ? "ring-2 ring-white ring-offset-2 ring-offset-black"
                        : "opacity-50 hover:opacity-100"
                    }`}
                  >
                    <img
                      src={ikThumb(img)}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      draggable={false}
                      className="h-full w-full object-cover"
                    />
                  </button>
                );
              })}
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
});

export default ImageLightbox;
