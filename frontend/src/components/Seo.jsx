import { useEffect } from "react";

// Seo — tiny per-route head manager (no new deps).
// Sets title + meta robots/description/canonical (+ og tags when given)
// via a document.head effect. Each page's values overwrite the previous
// page's, so no stale noindex can leak across navigations.
function upsertMetaTag(selector, create) {
  let el = document.head.querySelector(selector);
  if (!el) {
    el = create();
    if (el) document.head.appendChild(el);
  }
  return el;
}

export default function Seo({
  title,
  description,
  robots = "index,follow",
  canonical,
  image,
}) {
  useEffect(() => {
    const prevTitle = document.title;
    if (title) document.title = title;

    if (description) {
      const el = upsertMetaTag('meta[name="description"]', () => {
        const m = document.createElement("meta");
        m.setAttribute("name", "description");
        return m;
      });
      if (el) el.setAttribute("content", description);
    }

    if (robots) {
      const el = upsertMetaTag('meta[name="robots"]', () => {
        const m = document.createElement("meta");
        m.setAttribute("name", "robots");
        return m;
      });
      if (el) el.setAttribute("content", robots);
    }

    let canonicalEl = null;
    let createdCanonical = false;
    if (canonical) {
      canonicalEl = document.head.querySelector('link[rel="canonical"]');
      if (canonicalEl) {
        canonicalEl.setAttribute("href", canonical);
      } else {
        canonicalEl = document.createElement("link");
        canonicalEl.setAttribute("rel", "canonical");
        canonicalEl.setAttribute("href", canonical);
        document.head.appendChild(canonicalEl);
        createdCanonical = true;
      }
    }

    if (title) {
      const el = upsertMetaTag('meta[property="og:title"]', () => {
        const m = document.createElement("meta");
        m.setAttribute("property", "og:title");
        return m;
      });
      if (el) el.setAttribute("content", title);
    }
    if (image) {
      const el = upsertMetaTag('meta[property="og:image"]', () => {
        const m = document.createElement("meta");
        m.setAttribute("property", "og:image");
        return m;
      });
      if (el) el.setAttribute("content", image);
    }

    return () => {
      document.title = prevTitle;
      if (createdCanonical && canonicalEl) {
        canonicalEl.remove();
      }
    };
  }, [title, description, robots, canonical, image]);

  return null;
}
