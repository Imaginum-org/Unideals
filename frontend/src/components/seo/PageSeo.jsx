import Seo from "../Seo.jsx";
import { ROUTE_SEO, canonicalFor } from "./routeSeo.js";

/**
 * <PageSeo path="/explore" /> uses the shared title/description for a public
 * route and sets its canonical URL. Pass title/description to override
 * (e.g. category pages), and noindex for states that shouldn't be indexed.
 */
export default function PageSeo({ path, title, description, noindex = false, jsonLd }) {
  const base = ROUTE_SEO[path] || {};
  return (
    <Seo
      title={title || base.title}
      description={description || base.description}
      canonical={canonicalFor(path)}
      robots={noindex ? "noindex,follow" : "index,follow"}
      jsonLd={jsonLd}
    />
  );
}
