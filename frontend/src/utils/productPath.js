/**
 * Public product URL. Prefers the listing slug (readable, SEO-friendly and
 * doesn't expose the database id: an ObjectId leaks its creation time and
 * is semi-sequential). Falls back to the id for payloads without a slug;
 * the backend resolves both, so old /product/<id> links keep working.
 *
 *   productPath(product)  → "/product/casio-fx-991es-a1b2c3"
 *   productPath("665f…")  → "/product/665f…"
 */
export const productPath = (productOrId) => {
  if (!productOrId) return "/";
  if (typeof productOrId === "string") return `/product/${encodeURIComponent(productOrId)}`;
  const ref = productOrId.slug || productOrId._id || productOrId.id;
  return ref ? `/product/${encodeURIComponent(String(ref))}` : "/";
};

export default productPath;
