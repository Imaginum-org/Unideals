/**
 * ImageKit on-the-fly transforms. Uploads are stored full-res; every
 * display site requests a sized variant so a phone never downloads a
 * 1600px file for a 40px thumbnail. Non-ImageKit URLs (Google avatars,
 * local assets) pass through untouched.
 */
const isImageKitUrl = (url) =>
  typeof url === "string" && /imagekit\.(io|net)/i.test(url);

export const ik = (url, { w, h, q = 70 } = {}) => {
  if (!isImageKitUrl(url) || !w) return url;
  if (/[?&]tr=/.test(url)) return url;
  const tr = [`w-${w}`, h ? `h-${h}` : null, "c-at_max", `q-${q}`, "f-auto"]
    .filter(Boolean)
    .join(",");
  return `${url}${url.includes("?") ? "&" : "?"}tr=${tr}`;
};

/** 74–160px thumbs: cards rails, filmstrips, dropdowns, header, avatars. */
export const ikThumb = (url, size = 200) => ik(url, { w: size, h: size, q: 60 });

/** First image of an `images[]` entry (string legacy or { url }) → thumb. */
export const ikFirstThumb = (entry, fallback = "/logo.svg", size = 200) => {
  const url = typeof entry === "string" ? entry : entry?.url;
  return url ? ikThumb(url, size) : fallback;
};

/** Listing cards / PDP main: crisp on retina without full-res cost. */
export const ikCard = (url) => ik(url, { w: 800, q: 70 });

/** Fullscreen viewer: near-original quality, still format-optimized. */
export const ikFull = (url) => ik(url, { w: 1600, q: 80 });
