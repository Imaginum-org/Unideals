/**
 * A listing shows the "Hot deal" tag while the server-granted window is
 * open (hot_until in the future) and it is still live. The server grants it
 * once to young listings with strong unique-view traction and caps how many
 * are hot per campus (backend/src/config/hotDeals.js), so it rotates.
 */
export const isHotDeal = (product, now = Date.now()) => {
  if (!product?.hot_until) return false;
  const until = new Date(product.hot_until).getTime();
  if (!Number.isFinite(until) || until <= now) return false;
  const status = String(product.status || "listed").toLowerCase();
  return status === "listed" && !product.is_deleted;
};

export default isHotDeal;
