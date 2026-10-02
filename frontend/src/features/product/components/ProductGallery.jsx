import { memo, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Share2 } from "lucide-react";
import { ikFull, ikThumb } from "../../../utils/imageTransform.js";

const SWIPE_THRESHOLD = 60;

const arrowButtonClass =
  "absolute top-1/2 -translate-y-1/2 z-20 flex h-12 w-12 items-center justify-center rounded-full border shadow-xl backdrop-blur-md transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 active:scale-95";

const arrowButtonTheme =
  "border-white/25 bg-black/45 text-white hover:scale-105 hover:border-white hover:bg-white hover:text-black";

/**
 * ProductGallery — inline PDP gallery.
 *
 * Renders the main image (fixed object-cover, click-to-expand),
 * premium glass arrows with infinite-loop navigation, counter badge,
 * expand affordance, swipe support and synced thumbnails.
 *
 * Fullscreen / zoom behaviour lives in `ImageLightbox`.
 */
const ProductGallery = memo(function ProductGallery({
  images = [],
  activeIndex = 0,
  onSelect,
  onPrev,
  onNext,
  onOpen,
  onShare,
}) {
  const hasMultiple = images.length > 1;
  const suppressClickRef = useRef(false);
  const activeImage = images[activeIndex] ?? images[0];

  // Preload neighbours so arrows + lightbox feel instant.
  useEffect(() => {
    if (!hasMultiple || !images.length) return;
    const neighbours = [
      images[(activeIndex + 1) % images.length],
      images[(activeIndex - 1 + images.length) % images.length],
    ];
    neighbours.forEach((src) => {
      if (!src) return;
      const img = new Image();
      img.src = src;
    });
  }, [activeIndex, hasMultiple, images]);

  const handleDragEnd = (_, info) => {
    if (Math.abs(info.offset.x) < SWIPE_THRESHOLD) return;
    suppressClickRef.current = true;
    if (info.offset.x < 0) {
      onNext?.();
    } else {
      onPrev?.();
    }
    // Re-allow clicks after the swipe's click event has passed.
    window.setTimeout(() => {
      suppressClickRef.current = false;
    }, 150);
  };

  const handleMainClick = () => {
    if (suppressClickRef.current) return;
    onOpen?.(activeIndex);
  };

  return (
    <>
      {/* Main image */}
      <div className="group relative overflow-hidden rounded-2xl bg-[#F8FAFC] dark:bg-zinc-900">
        <motion.div
          drag={hasMultiple ? "x" : false}
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.6}
          onDragEnd={handleDragEnd}
          className={hasMultiple ? "cursor-zoom-in touch-pan-y" : "cursor-zoom-in"}
          onClick={handleMainClick}
          role="button"
          tabIndex={0}
          aria-label="Open image in fullscreen viewer"
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onOpen?.(activeIndex);
            }
          }}
        >
          <motion.img
            key={activeImage}
            src={ikFull(activeImage)}
            alt={`Product image ${activeIndex + 1} of ${images.length}`}
            draggable={false}
            loading="eager"
            fetchPriority="high"
            decoding="async"
            initial={{ opacity: 0, scale: 1.02 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.25 }}
            className="aspect-[1/0.93] w-full select-none object-cover"
          />
        </motion.div>

        {/* Prev / Next — premium glass arrows, always mounted (infinite loop) */}
        {hasMultiple && (
          <>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onPrev?.();
              }}
              aria-label="Previous image"
              className={`${arrowButtonClass} ${arrowButtonTheme} left-3 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100`}
            >
              <ChevronLeft size={22} strokeWidth={2.5} />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onNext?.();
              }}
              aria-label="Next image"
              className={`${arrowButtonClass} ${arrowButtonTheme} right-3 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100`}
            >
              <ChevronRight size={22} strokeWidth={2.5} />
            </button>
          </>
        )}

        {/* Share */}
        {onShare && (
          <div className="absolute right-3 top-3 z-20 flex items-center gap-2">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onShare();
              }}
              aria-label="Share product"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#181C1F] shadow-md transition-transform duration-200 hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#4F46E5] md:h-11 md:w-11"
            >
              <Share2 size={18} />
            </button>
          </div>
        )}
      </div>

      {/* Thumbnails */}
      {hasMultiple && (
        <div
          className="scrollbar-hide mt-3 flex gap-3 overflow-x-auto"
          role="tablist"
          aria-label="Product images"
        >
          {images.map((img, index) => {
            const isActive = index === activeIndex;
            return (
              <button
                key={`${img}-${index}`}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-label={`View image ${index + 1}`}
                onClick={() => onSelect?.(index)}
                className={`h-[74px] w-[74px] min-w-[74px] overflow-hidden rounded-xl border-2 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4F46E5] focus-visible:ring-offset-2 sm:h-[90px] sm:w-[90px] sm:min-w-[84px] ${
                  isActive
                    ? "border-[#4F46E5] shadow-[0_0_0_2px_rgba(79,70,229,0.25)]"
                    : "border-[#ECECEC] opacity-80 hover:opacity-100 dark:border-zinc-800"
                }`}
              >
                <img
                  src={ikThumb(img)}
                  alt={`Preview ${index + 1}`}
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
    </>
  );
});

export default ProductGallery;
