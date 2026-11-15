/* global process */
// Vercel function: server-rendered <head> + summary for /product/<slug>.
//
// The app is a client-rendered SPA, so crawlers that don't run JavaScript
// (WhatsApp / X / LinkedIn link previews, ChatGPT, Perplexity, Claude) used
// to get the home page's HTML for every listing. vercel.json rewrites
// /product/:ref here; we take the built index.html and inject the listing's
// title, description, canonical, social tags, schema.org Product data and a
// readable summary, then let the normal app boot on top.
//
// Never breaks the page: if the API is unreachable the untouched index.html
// is served. Listings that don't exist (or are private, e.g. Girls Corner)
// get a 404 with noindex.
import { productJsonLd } from "../src/components/seo/productJsonLd.js";

const SITE = "https://unideals.in";
const API = (process.env.SEO_API_ORIGIN || "https://api.unideals.in").replace(/\/+$/, "");
const SHELL_TTL_MS = 5 * 60 * 1000;

const CATEGORY_LABELS = {
  electronics: "Electronics",
  study_material: "Study Material",
  hostel_essentials: "Hostel Essentials",
  clothing: "Clothing",
  accessories: "Accessories",
  lab_equipment: "Lab Equipment",
  sports: "Sports",
  fitness: "Fitness",
  vehicles: "Vehicles",
  event_passes: "Event Passes",
  others: "Others",
};
const CONDITION_LABELS = {
  brand_new: "Brand new",
  like_new: "Like new",
  gently_used: "Gently used",
  well_used: "Well used",
  for_parts_or_not_working: "For parts / not working",
};

let shell = { html: null, at: 0 };

const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
// JSON inside <script>: never let a listing close the tag.
const jsonForScript = (v) => JSON.stringify(v).replace(/</g, "\\u003c");
const inr = (n) => (Number.isFinite(Number(n)) ? `₹${Number(n).toLocaleString("en-IN")}` : "");

async function getShell(req) {
  if (shell.html && Date.now() - shell.at < SHELL_TTL_MS) return shell.html;
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  const proto = req.headers["x-forwarded-proto"] || "https";
  const res = await fetch(`${proto}://${host}/index.html`, { headers: { "x-shell-fetch": "1" } });
  if (!res.ok) throw new Error(`index.html ${res.status}`);
  shell = { html: await res.text(), at: Date.now() };
  return shell.html;
}

async function getListing(ref) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 2500);
  try {
    const res = await fetch(`${API}/api/product/seo/${encodeURIComponent(ref)}`, { signal: ctl.signal });
    if (res.status === 404) return { notFound: true };
    if (!res.ok) return { error: true };
    const body = await res.json();
    return { data: body?.data || null };
  } catch {
    return { error: true };
  } finally {
    clearTimeout(timer);
  }
}

// Replace (or insert) one <meta> by its name/property attribute.
function setMeta(html, attr, key, content) {
  const tag = `<meta ${attr}="${key}" content="${esc(content)}" />`;
  const re = new RegExp(`<meta\\s+${attr}="${key.replace(/[:.]/g, "\\$&")}"[^>]*>`, "i");
  return re.test(html) ? html.replace(re, tag) : html.replace("</head>", `  ${tag}\n</head>`);
}

export function renderListing(html, p) {
  const url = `${SITE}/product/${encodeURIComponent(p.slug)}`;
  const category = CATEGORY_LABELS[p.category] || "Campus listing";
  const condition = CONDITION_LABELS[p.condition] || "";
  const price = inr(p.selling_price);
  const sold = p.status !== "listed";
  const title = `${p.title}${price ? ` for ${price}` : ""}${sold ? " (sold)" : ""} | Unideals`;
  const lead = [condition, category, p.campus_name ? `at ${p.campus_name}` : ""].filter(Boolean).join(" · ");
  const description = (
    p.description ? `${price ? `${price} · ` : ""}${p.description}` : `${p.title}${price ? ` for ${price}` : ""}. ${lead}. Buy from a verified student on Unideals.`
  ).slice(0, 160);
  const image = p.images?.[0] || `${SITE}/og-image.jpg`;

  const product = productJsonLd({ ...p, category_label: category }, url);
  const breadcrumbs = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${SITE}/` },
      { "@type": "ListItem", position: 2, name: category, item: `${SITE}/category/${p.category}` },
      { "@type": "ListItem", position: 3, name: p.title, item: url },
    ],
  };

  let out = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${esc(title)}</title>`);
  out = setMeta(out, "name", "description", description);
  out = setMeta(out, "property", "og:type", "product");
  out = setMeta(out, "property", "og:title", title);
  out = setMeta(out, "property", "og:description", description);
  out = setMeta(out, "property", "og:image", image);
  out = setMeta(out, "property", "og:image:alt", p.title);
  out = setMeta(out, "property", "og:url", url);
  out = setMeta(out, "name", "twitter:title", title);
  out = setMeta(out, "name", "twitter:description", description);
  out = setMeta(out, "name", "twitter:image", image);
  out = setMeta(out, "name", "twitter:image:alt", p.title);
  if (Number.isFinite(Number(p.selling_price))) {
    out = setMeta(out, "property", "product:price:amount", Number(p.selling_price).toFixed(2));
    out = setMeta(out, "property", "product:price:currency", "INR");
  }
  // The default card's size/type tags describe og-image.jpg, not this photo.
  out = out.replace(/<meta property="og:image:(width|height|type)"[^>]*>\s*/gi, "");
  out = out.replace(
    "</head>",
    `  <link rel="canonical" href="${esc(url)}" />\n` +
      `  <script type="application/ld+json">${jsonForScript(product)}</script>\n` +
      `  <script type="application/ld+json">${jsonForScript(breadcrumbs)}</script>\n</head>`,
  );

  const body =
    `<main>\n` +
    `<p><a href="/">Unideals</a> › <a href="/category/${esc(p.category)}">${esc(category)}</a></p>\n` +
    `<h1>${esc(p.title)}</h1>\n` +
    `<p><strong>${esc(price)}</strong>${p.original_price && p.original_price > p.selling_price ? ` (was ${esc(inr(p.original_price))})` : ""}${sold ? " · Sold" : " · Available"}</p>\n` +
    (lead ? `<p>${esc(lead)}${p.seller_name ? ` · Sold by ${esc(p.seller_name)}, a student on Unideals` : ""}</p>\n` : "") +
    (p.images?.[0] ? `<img src="${esc(p.images[0])}" alt="${esc(p.title)}" width="600" height="600" loading="eager" />\n` : "") +
    (p.description ? `<h2>Description</h2>\n<p>${esc(p.description)}</p>\n` : "") +
    `<h2>How to buy</h2>\n<p>Open this listing on Unideals, chat with the seller, meet at a public spot on campus and pay at pickup by UPI or cash. No fees, no shipping.</p>\n` +
    `<p><a href="/category/${esc(p.category)}">More ${esc(category.toLowerCase())}</a> · <a href="/explore">Explore all listings</a></p>\n` +
    `</main>`;
  out = out.replace(/<main>[\s\S]*?<\/main>/i, body);
  return out;
}

export default async function handler(req, res) {
  const ref = String(req.query?.ref || "").slice(0, 200);
  let html;
  try {
    html = await getShell(req);
  } catch {
    res.statusCode = 502;
    return res.end("Temporarily unavailable");
  }
  res.setHeader("Content-Type", "text/html; charset=utf-8");

  const result = ref ? await getListing(ref) : { notFound: true };
  if (result.data) {
    res.setHeader("Cache-Control", "public, max-age=0, s-maxage=600, stale-while-revalidate=86400");
    return res.status(200).send(renderListing(html, result.data));
  }
  if (result.notFound) {
    res.setHeader("Cache-Control", "public, max-age=0, s-maxage=60");
    return res.status(404).send(setMeta(html, "name", "robots", "noindex, follow"));
  }
  // API hiccup: serve the plain app (it fetches the listing itself), not cached.
  res.setHeader("Cache-Control", "no-store");
  return res.status(200).send(html);
}
