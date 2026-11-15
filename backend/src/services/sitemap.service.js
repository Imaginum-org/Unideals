import Product from "../models/Product.model.js";
import { PRODUCT_STATUS, GIRLS_ONLY_CATEGORIES } from "../config/constants.js";
import { createTtlCache } from "../utils/ttlCache.js";

/**
 * Live-listings sitemap for search engines and AI crawlers.
 *
 * Served by the API at /sitemap-listings.xml and proxied to
 * https://unideals.in/sitemap-listings.xml by the frontend host (vercel.json),
 * so it sits on the site's own domain. Listed in public/sitemap.xml.
 *
 * Only listings anyone may see: live, not deleted, with a slug, and never
 * Girls Corner (girls-only listings are private to eligible users and are
 * noindex on their own page too).
 */

const MAX_URLS = 45000; // protocol limit is 50k per file
const TTL_MS = 60 * 60 * 1000; // crawlers revisit hourly at most
const cache = createTtlCache({ max: 2 });

const siteOrigin = () => {
  const configured = String(process.env.PUBLIC_SITE_URL || process.env.FRONTEND_URL || "")
    .split(",")
    .map((s) => s.trim().replace(/\/+$/, ""))
    .find((s) => /^https:\/\//.test(s));
  return configured || "https://unideals.in";
};

const xmlEscape = (s) =>
  String(s).replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[c]);

export const buildListingsSitemap = () =>
  cache.memo("listings", TTL_MS, async () => {
    // Served by { status: 1, updatedAt: 1 } (walked backwards for newest first).
    const rows = await Product.find(
      {
        status: PRODUCT_STATUS.LISTED,
        is_deleted: false,
        isGirlsOnly: { $ne: true },
        category: { $nin: [...GIRLS_ONLY_CATEGORIES] },
        slug: { $type: "string" },
      },
      { slug: 1, updatedAt: 1, _id: 0 },
    )
      .sort({ updatedAt: -1 })
      .limit(MAX_URLS)
      .lean();

    const origin = siteOrigin();
    const urls = rows
      .map((p) => {
        const loc = `${origin}/product/${encodeURIComponent(p.slug)}`;
        const lastmod = p.updatedAt ? `<lastmod>${new Date(p.updatedAt).toISOString()}</lastmod>` : "";
        return `<url><loc>${xmlEscape(loc)}</loc>${lastmod}<changefreq>daily</changefreq><priority>0.6</priority></url>`;
      })
      .join("\n");

    return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
  });

// ── Server-rendered listing meta (frontend api/product-meta.js) ──────────
// Crawlers that don't run JavaScript (link previews, AI assistants) get a
// listing's title/price/photo straight in the HTML. Campus-agnostic on
// purpose (a shared link must preview for anyone), but only public facts of
// live or sold, non-Girls-Corner listings. Cached briefly per listing.
const SEO_TTL_MS = 5 * 60 * 1000;
const seoCache = createTtlCache({ max: 5000 });
const OBJECT_ID_RE = /^[a-f0-9]{24}$/i;

export const getListingSeo = (ref) => {
  const key = String(ref || "").trim().toLowerCase().slice(0, 200);
  if (!key) return Promise.resolve(null);
  return seoCache.memo(`seo:${key}`, SEO_TTL_MS, async () => {
    const p = await Product.findOne({
      ...(OBJECT_ID_RE.test(key) ? { _id: key } : { slug: key }),
      status: { $in: [PRODUCT_STATUS.LISTED, PRODUCT_STATUS.SOLD] },
      is_deleted: false,
      isGirlsOnly: { $ne: true },
      category: { $nin: [...GIRLS_ONLY_CATEGORIES] },
    })
      .select("title description images selling_price original_price condition category status slug updatedAt seller_id campus_id")
      .populate("seller_id", "name")
      .populate("campus_id", "name")
      .lean();
    if (!p) return null;
    return {
      slug: p.slug || String(p._id),
      title: p.title,
      description: String(p.description || "").replace(/\s+/g, " ").trim().slice(0, 600),
      images: (p.images || []).slice(0, 4).map((i) => (typeof i === "string" ? i : i?.url)).filter(Boolean),
      selling_price: p.selling_price,
      original_price: p.original_price ?? null,
      condition: p.condition,
      category: p.category,
      status: p.status,
      updatedAt: p.updatedAt,
      seller_name: p.seller_id?.name ? String(p.seller_id.name).split(" ")[0] : null,
      campus_name: p.campus_id?.name || null,
    };
  });
};
