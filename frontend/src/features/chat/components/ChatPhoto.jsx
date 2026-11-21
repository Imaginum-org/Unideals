import { lazy, memo, Suspense, useState } from "react";
import { ImageOff } from "lucide-react";
import { chatImageVariant } from "../utils/chatImage.js";

const ImageLightbox = lazy(() => import("../../product/components/ImageLightbox.jsx"));

/*
 * Photo inside a chat bubble.
 * - Reserves the photo's aspect ratio up front (no layout jump on load).
 * - Loads a ~640px, auto-format/quality variant lazily; 2x for retina.
 * - Tap opens the shared full-screen viewer at ≤1600px.
 */
const ChatPhoto = ({ image, alt = "Photo" }) => {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [open, setOpen] = useState(false);
  const w = Number(image?.width) || 0;
  const h = Number(image?.height) || 0;
  // Clamp very tall / very wide shots so a bubble never dominates the thread.
  const ratio = w && h ? Math.min(Math.max(w / h, 0.6), 1.9) : 4 / 3;
  const src = chatImageVariant(image?.url, "c_limit,w_640");
  const src2x = chatImageVariant(image?.url, "c_limit,w_1280");

  return (
    <>
      <button
        type="button"
        onClick={() => !failed && setOpen(true)}
        aria-label="Open photo"
        className="relative block w-[min(16.5rem,64vw)] overflow-hidden rounded-xl bg-neutral-200/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)] dark:bg-white/5"
        style={{ aspectRatio: String(ratio) }}
      >
        {!failed ? (
          <img
            src={src}
            srcSet={`${src} 1x, ${src2x} 2x`}
            alt={alt}
            loading="lazy"
            decoding="async"
            draggable="false"
            onLoad={() => setLoaded(true)}
            onError={() => setFailed(true)}
            className={`h-full w-full object-cover transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"}`}
          />
        ) : (
          <span className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-[12px] text-slate-500 dark:text-zinc-400">
            <ImageOff size={20} /> Photo unavailable
          </span>
        )}
        {!loaded && !failed && <span className="absolute inset-0 animate-pulse bg-neutral-200 dark:bg-white/5" />}
      </button>
      {open && (
        <Suspense fallback={null}>
          <ImageLightbox
            open
            images={[chatImageVariant(image.url, "c_limit,w_1600")]}
            index={0}
            onClose={() => setOpen(false)}
            onIndexChange={() => {}}
          />
        </Suspense>
      )}
    </>
  );
};

export default memo(ChatPhoto);
