import { useEffect, useRef } from "react";
import { prefetchRoute, CORE_ROUTES } from "./routes.jsx";
import { prefetchProduct } from "../features/product/api/productApi.js";
import { useCampus } from "../context/CampusContext.jsx";

// Makes navigation feel instant:
//  1. Idle warm-up: once the first page has rendered and the browser is
//     idle, download the JS for the pages people open next (skipped on
//     Data Saver / 2G).
//  2. Intent prefetch: hovering (desktop, ~80ms intent delay), touching
//     (mobile) or keyboard-focusing any internal link starts loading that
//     page's code; for product links it also warms the product's data, so
//     by the time the click lands the detail page renders from cache.
// One delegated listener on document — no per-link wiring needed.

const HOVER_INTENT_MS = 80;
// Slug (/product/casio-fx-991-a1b2c3) or legacy ObjectId link. The captured
// ref is the same param the product page fetches with, so the cache hits.
const PRODUCT_RE = /^\/product\/([a-z0-9_-]{3,160})\/?$/i;

const constrainedNetwork = () => {
  const c = typeof navigator !== "undefined" ? navigator.connection : null;
  return Boolean(c && (c.saveData || /(^|-)2g$/.test(c.effectiveType || "")));
};

const internalPath = (anchor) => {
  if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) return null;
  try {
    const url = new URL(anchor.href, window.location.href);
    if (url.origin !== window.location.origin) return null;
    return url.pathname;
  } catch {
    return null;
  }
};

export default function usePrefetch() {
  const { campusSlug } = useCampus();
  const campusRef = useRef(campusSlug);
  campusRef.current = campusSlug;

  // 1. Idle warm-up of core page chunks.
  useEffect(() => {
    if (constrainedNetwork()) return undefined;
    const idle = window.requestIdleCallback || ((cb) => setTimeout(cb, 1500));
    const cancel = window.cancelIdleCallback || clearTimeout;
    let i = 0;
    let handle;
    // One chunk per idle slot so warm-up never competes with real work.
    const step = () => {
      if (i >= CORE_ROUTES.length) return;
      prefetchRoute(CORE_ROUTES[i]);
      i += 1;
      handle = idle(step, { timeout: 4000 });
    };
    const start = setTimeout(() => {
      handle = idle(step, { timeout: 4000 });
    }, 1200);
    return () => {
      clearTimeout(start);
      cancel(handle);
    };
  }, []);

  // 2. Intent prefetch on links.
  useEffect(() => {
    const seen = new Set();
    let hoverTimer = null;

    const warm = (path) => {
      prefetchRoute(path);
      const m = PRODUCT_RE.exec(path);
      if (m && campusRef.current && !seen.has(m[1])) {
        seen.add(m[1]);
        prefetchProduct(m[1], { campus_slug: campusRef.current });
      }
    };

    const fromEvent = (e) => {
      const a = e.target instanceof Element ? e.target.closest("a[href]") : null;
      return internalPath(a);
    };

    const onOver = (e) => {
      const path = fromEvent(e);
      clearTimeout(hoverTimer);
      if (path) hoverTimer = setTimeout(() => warm(path), HOVER_INTENT_MS);
    };
    const onNow = (e) => {
      const path = fromEvent(e);
      if (path) warm(path);
    };

    document.addEventListener("pointerover", onOver, { passive: true });
    document.addEventListener("touchstart", onNow, { passive: true });
    document.addEventListener("focusin", onNow);
    return () => {
      clearTimeout(hoverTimer);
      document.removeEventListener("pointerover", onOver);
      document.removeEventListener("touchstart", onNow);
      document.removeEventListener("focusin", onNow);
    };
  }, []);
}
