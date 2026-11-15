import { useEffect } from "react";
import { DEFAULT_OG_IMAGE } from "./seo/routeSeo.js";

// Seo: tiny per-route head manager (no new deps).
//
// Sets title, description, robots and canonical, plus the matching Open
// Graph / Twitter tags (so shares and AI previews of any page show that
// page, not the home page). Optional `jsonLd` adds one structured-data
// block for this page. Each page's values overwrite the previous page's, so
// nothing stale (noindex, canonical, JSON-LD) leaks across navigations.
//
// Crawlers that don't run JavaScript get the static tags in index.html, or,
// for /product/<slug>, the server-rendered tags from api/product-meta.js.


function setMeta(attr, key, content) {
  let el = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (content == null || content === "") {
    el?.remove();
    return;
  }
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function setCanonical(href) {
  let el = document.head.querySelector('link[rel="canonical"]');
  if (!href) {
    el?.remove();
    return;
  }
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", "canonical");
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

const JSON_LD_ID = "route-jsonld";

export default function Seo({
  title,
  description,
  robots = "index,follow",
  canonical,
  image,
  type = "website",
  jsonLd,
}) {
  const jsonLdText = jsonLd ? JSON.stringify(jsonLd) : "";

  useEffect(() => {
    const prevTitle = document.title;
    if (title) document.title = title;

    if (description) {
      setMeta("name", "description", description);
      setMeta("property", "og:description", description);
      setMeta("name", "twitter:description", description);
    }
    if (robots) setMeta("name", "robots", robots);

    // Never point a page at another page's canonical: set it, or remove it.
    const isIndexable = !/noindex/i.test(robots || "");
    const canon = isIndexable ? canonical : undefined;
    setCanonical(canon);
    setMeta("property", "og:url", canon || "");

    if (title) {
      setMeta("property", "og:title", title);
      setMeta("name", "twitter:title", title);
    }
    setMeta("property", "og:type", type);
    const img = image || DEFAULT_OG_IMAGE;
    setMeta("property", "og:image", img);
    setMeta("name", "twitter:image", img);

    let script = document.getElementById(JSON_LD_ID);
    if (jsonLdText) {
      if (!script) {
        script = document.createElement("script");
        script.type = "application/ld+json";
        script.id = JSON_LD_ID;
        document.head.appendChild(script);
      }
      script.textContent = jsonLdText;
    } else {
      script?.remove();
    }

    return () => {
      document.title = prevTitle;
      // Leaving the page: drop page-specific tags so a next page without
      // its own <Seo> never inherits this page's canonical / JSON-LD.
      // (React runs this cleanup before the next page's effects.)
      setCanonical(undefined);
      setMeta("property", "og:url", "");
      document.getElementById(JSON_LD_ID)?.remove();
    };
  }, [title, description, robots, canonical, image, type, jsonLdText]);

  return null;
}
