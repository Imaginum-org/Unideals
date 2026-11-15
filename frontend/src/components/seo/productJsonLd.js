// schema.org Product + Offer for one listing. Shared by the product page
// (client) and api/product-meta.js (server HTML for crawlers), so search
// engines and AI assistants read the same facts either way.

const CONDITION = {
  brand_new: "https://schema.org/NewCondition",
  like_new: "https://schema.org/UsedCondition",
  gently_used: "https://schema.org/UsedCondition",
  well_used: "https://schema.org/UsedCondition",
  for_parts_or_not_working: "https://schema.org/DamagedCondition",
};

const imageUrl = (img) => (typeof img === "string" ? img : img?.url) || null;

export function productJsonLd(p, url) {
  if (!p) return null;
  const images = (p.images || []).map(imageUrl).filter(Boolean).slice(0, 6);
  const price = Number(p.selling_price);
  const available = p.status === "listed" && !p.is_deleted;
  const ld = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.title,
    description: String(p.description || p.title || "").replace(/\s+/g, " ").trim().slice(0, 500),
    url,
    ...(images.length ? { image: images } : {}),
    ...(p.category_label || p.category ? { category: p.category_label || p.category } : {}),
    offers: {
      "@type": "Offer",
      url,
      priceCurrency: "INR",
      ...(Number.isFinite(price) ? { price: price.toFixed(2) } : {}),
      availability: available ? "https://schema.org/InStock" : "https://schema.org/SoldOut",
      itemCondition: CONDITION[p.condition] || "https://schema.org/UsedCondition",
      ...(p.seller_name || p.seller_id?.name
        ? { seller: { "@type": "Person", name: p.seller_name || p.seller_id.name } }
        : {}),
    },
  };
  return ld;
}
