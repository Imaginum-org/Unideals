/*
 * Listing autofill + field linking. Pure functions, zero network calls:
 * everything runs in the browser from what the seller already typed.
 *
 *   • guessFromTitle   title → category / brand / colour suggestions
 *   • CATEGORY_RULES   per-category: fields that don't apply are switched
 *                      off, fields with one sensible value are fixed
 *   • usage ↔ purchase date ↔ condition linking (no impossible combos)
 *   • draftDescription a ready-to-edit description from the form
 *   • suggestPrice     typical second-hand asking price (estimate)
 */

/* ── Category rules ─────────────────────────────────────────────────── */

// "off": not meaningful for this category (field disabled + cleared, and
// hidden on the product page). { fixed }: only one sensible value (field
// locked to it, so required validation still passes untouched).
export const CATEGORY_RULES = {
  study_material: {
    color: "off",
    brandPlaceholder: "e.g. Arihant, Pearson, HC Verma",
    titlePlaceholder: "e.g. HC Verma Concepts of Physics Vol 1",
  },
  event_passes: {
    color: "off",
    condition: { fixed: "brand_new", why: "Passes are either valid or not, so condition doesn't apply." },
    usage: { fixed: "less_than_1_month", why: "Passes aren't used before the event." },
    brandPlaceholder: "e.g. Fest or organiser name",
    titlePlaceholder: "e.g. Sunburn Campus 2026 entry pass",
  },
  electronics: { brandPlaceholder: "e.g. Apple, Dell, Casio", titlePlaceholder: "e.g. Casio fx-991ES Plus calculator" },
  clothing: { brandPlaceholder: "e.g. Nike, H&M, Levi's", titlePlaceholder: "e.g. Nike hoodie, size M" },
  vehicles: { brandPlaceholder: "e.g. Hero, Btwin, Honda", titlePlaceholder: "e.g. Btwin Rockrider bicycle" },
  sports: { brandPlaceholder: "e.g. SG, Yonex, Nivia", titlePlaceholder: "e.g. SG English willow cricket bat" },
  fitness: { brandPlaceholder: "e.g. Decathlon, Kore", titlePlaceholder: "e.g. 10 kg adjustable dumbbell set" },
  hostel_essentials: { brandPlaceholder: "e.g. Prestige, Philips", titlePlaceholder: "e.g. Prestige electric kettle 1.5 L" },
  lab_equipment: { brandPlaceholder: "e.g. Omega, Camlin", titlePlaceholder: "e.g. Mini drafter + lab coat combo" },
  accessories: { brandPlaceholder: "e.g. Titan, Wildcraft", titlePlaceholder: "e.g. Wildcraft 35 L backpack" },
};

export const rulesFor = (category) => CATEGORY_RULES[category] || {};
export const isFieldOff = (category, field) => rulesFor(category)[field] === "off";
export const fixedValue = (category, field) => rulesFor(category)[field]?.fixed || null;

/* ── Usage ↔ purchase date ↔ condition ──────────────────────────────── */

export const USAGE_ORDER = [
  "less_than_1_month",
  "one_to_three_months",
  "three_to_six_months",
  "six_to_twelve_months",
  "one_to_two_years",
  "more_than_two_years",
];
const USAGE_MAX_MONTHS = [1, 3, 6, 12, 24, Infinity];

export const monthsSince = (isoDate, now = new Date()) => {
  if (!isoDate) return null;
  const d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) return null;
  return Math.max(0, (now - d) / (1000 * 60 * 60 * 24 * 30.4375));
};

/** Usage bucket that matches the time since purchase. */
export const usageForMonths = (months) => {
  if (months == null) return null;
  const i = USAGE_MAX_MONTHS.findIndex((max) => months < max);
  return USAGE_ORDER[i === -1 ? USAGE_ORDER.length - 1 : i];
};

/**
 * Usage options that are possible given the purchase date and condition:
 * you can't have used something for 2 years if you bought it 3 months ago,
 * and a Brand New item hasn't been used.
 */
export const allowedUsage = ({ purchaseDate, condition, category }) => {
  const fixed = fixedValue(category, "usage");
  if (fixed) return [fixed];
  if (condition === "brand_new") return ["less_than_1_month"];
  const m = monthsSince(purchaseDate);
  if (m == null) return USAGE_ORDER;
  const maxIdx = USAGE_ORDER.indexOf(usageForMonths(m));
  return USAGE_ORDER.slice(0, maxIdx + 1);
};

/** Validation message when usage and purchase date contradict each other. */
export const usageConflict = ({ usageDuration, purchaseDate, condition, category }) => {
  if (!usageDuration) return null;
  const ok = allowedUsage({ purchaseDate, condition, category });
  if (ok.includes(usageDuration)) return null;
  if (condition === "brand_new") return "A Brand New item hasn't been used. Pick “Less than 1 month”.";
  return "That's longer than you've had it. Check the purchase date or usage.";
};

/** One-tap purchase date shortcuts (YYYY-MM-DD, 1st of the month). */
export const purchaseDateShortcuts = (now = new Date()) => {
  const back = (months) => {
    const d = new Date(now.getFullYear(), now.getMonth() - months, 1);
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  };
  const today = now.toISOString().slice(0, 10);
  return [
    { label: "This month", value: back(0) > today ? today : back(0) },
    { label: "6 months ago", value: back(6) },
    { label: "1 year ago", value: back(12) },
    { label: "2 years ago", value: back(24) },
  ];
};

/* ── Title intelligence ─────────────────────────────────────────────── */

// Keyword → category. Phrases are matched as whole words, case-insensitive.
const CATEGORY_KEYWORDS = {
  electronics: [
    "laptop", "macbook", "iphone", "phone", "mobile", "smartphone", "tablet", "ipad", "calculator",
    "headphone", "headphones", "keyboard", "mouse", "monitor", "charger", "speaker", "camera",
    "router", "power bank", "powerbank", "smartwatch", "airpods", "earbuds", "kindle", "printer",
    "ssd", "hard disk", "pendrive", "trimmer", "playstation", "ps5", "xbox", "controller",
  ],
  study_material: [
    "book", "books", "textbook", "notes", "guide", "question bank", "novel", "edition", "ncert",
    "rd sharma", "hc verma", "jee", "neet", "gate", "cat", "upsc", "workbook", "handwritten",
    "previous year", "pyq", "module",
  ],
  hostel_essentials: [
    "mattress", "bucket", "lamp", "kettle", "iron", "extension board", "extension", "chair", "table",
    "pillow", "bedsheet", "blanket", "cooler", "fan", "mug", "bottle", "induction", "mirror",
    "hanger", "dustbin", "study table", "bed",
  ],
  clothing: [
    "t-shirt", "tshirt", "tee", "hoodie", "jacket", "shirt", "jeans", "trousers", "kurta",
    "sweater", "sweatshirt", "track pants", "shorts", "blazer", "jersey",
  ],
  accessories: [
    "watch", "bag", "backpack", "wallet", "earphones", "sunglasses", "belt", "cap", "laptop bag",
    "umbrella",
  ],
  lab_equipment: [
    "lab coat", "apron", "drafter", "mini drafter", "lab kit", "multimeter", "breadboard",
    "lab record", "goggles", "graph book", "drawing board", "arduino",
  ],
  sports: [
    "bat", "ball", "football", "cricket", "racket", "racquet", "badminton", "shuttle", "tennis",
    "basketball", "volleyball", "skates", "skateboard", "carrom", "chess", "kit bag", "stumps",
  ],
  fitness: [
    "dumbbell", "dumbbells", "kettlebell", "resistance band", "yoga mat", "skipping rope",
    "protein", "whey", "gym", "pull up bar", "hand gripper",
  ],
  vehicles: ["cycle", "bicycle", "scooter", "scooty", "bike", "helmet", "activa", "e-bike", "motorcycle"],
  event_passes: ["pass", "passes", "ticket", "tickets", "concert", "fest", "workshop", "entry", "pronite"],
  beauty_personal_care: [
    "lipstick", "makeup", "skincare", "serum", "moisturiser", "moisturizer", "foundation", "kajal",
    "eyeliner", "hair dryer", "straightener", "curler", "sunscreen", "face wash",
  ],
  womens_fashion: ["dress", "kurti", "saree", "sari", "top", "skirt", "lehenga", "dupatta", "gown", "co-ord"],
  jewellery_hair_accessories: [
    "earring", "earrings", "necklace", "bracelet", "anklet", "pendant", "clip", "clips",
    "scrunchie", "scrunchies", "hairband", "hair band", "jhumka",
  ],
  footwear_handbags: ["heels", "flats", "sandals", "handbag", "purse", "tote", "sling bag", "clutch", "wedges"],
  room_decor: ["fairy lights", "wall art", "poster", "posters", "organizer", "organiser", "photo frame", "frame", "decor", "tapestry"],
};

// Brand display names. Product-line words map to their brand.
const BRANDS = [
  "Apple", "Samsung", "OnePlus", "Xiaomi", "Redmi", "Realme", "Oppo", "Vivo", "Motorola", "Nokia",
  "Google", "Dell", "HP", "Lenovo", "Asus", "Acer", "MSI", "Sony", "boAt", "JBL", "Bose", "Sennheiser",
  "Logitech", "Casio", "Canon", "Nikon", "Philips", "Prestige", "Bajaj", "Havells", "Usha", "Nike",
  "Adidas", "Puma", "Reebok", "Skechers", "Decathlon", "Nivia", "Cosco", "Yonex", "Li-Ning", "SG",
  "MRF", "Titan", "Fastrack", "Fossil", "Wildcraft", "Skybags", "American Tourister", "Levi's",
  "H&M", "Zara", "Allen Solly", "Roadster", "Lakme", "Maybelline", "Mamaearth", "Nykaa", "Hero",
  "Honda", "TVS", "Firefox", "Btwin", "Arihant", "Pearson", "McGraw Hill", "Oswaal", "Cengage",
  "S Chand", "Disha", "Noise", "Fire-Boltt", "Amazfit", "Kindle", "Milton", "Cello", "Pigeon",
];
const BRAND_ALIASES = {
  iphone: "Apple", macbook: "Apple", ipad: "Apple", airpods: "Apple", "apple watch": "Apple",
  galaxy: "Samsung", pixel: "Google", thinkpad: "Lenovo", ideapad: "Lenovo", vivobook: "Asus",
  zenbook: "Asus", rog: "Asus", pavilion: "HP", victus: "HP", omen: "HP", inspiron: "Dell",
  vostro: "Dell", alienware: "Dell", playstation: "Sony", ps5: "Sony", activa: "Honda",
  rockrider: "Btwin", "hc verma": "HC Verma", "rd sharma": "RD Sharma",
};

const COLOURS = [
  "space grey", "space gray", "rose gold", "navy blue", "sky blue", "midnight", "starlight",
  "black", "white", "grey", "gray", "silver", "gold", "blue", "navy", "red", "maroon", "green",
  "olive", "yellow", "orange", "pink", "purple", "lavender", "brown", "beige", "cream", "teal",
];

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const wordRe = (phrase) => new RegExp(`(^|[^a-z0-9])${escapeRe(phrase)}($|[^a-z0-9])`, "i");
const titleCase = (s) => s.replace(/\b\w/g, (c) => c.toUpperCase());

/**
 * Best guesses from the title. `allowedCategories` keeps girls-only
 * categories away from sellers who can't list in them.
 */
export const guessFromTitle = (title, { allowedCategories } = {}) => {
  const t = String(title || "").toLowerCase().trim();
  if (t.length < 3) return {};

  // Category: most keyword hits wins; longer phrases count more.
  let best = null;
  let bestScore = 0;
  for (const [category, words] of Object.entries(CATEGORY_KEYWORDS)) {
    if (allowedCategories && !allowedCategories.includes(category)) continue;
    let score = 0;
    for (const w of words) if (wordRe(w).test(t)) score += w.includes(" ") ? 2 : 1;
    if (score > bestScore) {
      best = category;
      bestScore = score;
    }
  }

  // Brand: product-line alias first, then the earliest brand mentioned.
  let brand = null;
  for (const [alias, name] of Object.entries(BRAND_ALIASES)) {
    if (wordRe(alias).test(t)) {
      brand = name;
      break;
    }
  }
  if (!brand) {
    let at = Infinity;
    for (const name of BRANDS) {
      const m = wordRe(name.toLowerCase()).exec(t);
      if (m && m.index < at) {
        at = m.index;
        brand = name;
      }
    }
  }

  // Colour: longest phrase first so "rose gold" beats "gold".
  const colourHit = COLOURS.find((c) => wordRe(c).test(t));
  const colour = colourHit ? titleCase(colourHit.replace("gray", "grey")) : null;

  return { category: best, brand, color: colour };
};

/* ── Description draft ──────────────────────────────────────────────── */

const CONDITION_LINE = {
  brand_new: "It's brand new and unused.",
  like_new: "It's in like-new condition with no visible wear.",
  gently_used: "Gently used and works perfectly, with only minor signs of use.",
  well_used: "Well used but fully working, with visible signs of wear.",
  for_parts_or_not_working: "It isn't fully working, so it's best for parts or repair.",
};

export const draftDescription = (form, usageLabel = "") => {
  const title = String(form.title || "").trim();
  if (!title) return "";
  const lines = [`Selling my ${title}.`];
  if (form.category !== "event_passes" && CONDITION_LINE[form.condition]) lines.push(CONDITION_LINE[form.condition]);
  if (form.purchaseDate) {
    const d = new Date(form.purchaseDate);
    if (!Number.isNaN(d.getTime())) {
      const when = d.toLocaleDateString("en-IN", { month: "short", year: "numeric" });
      const used =
        usageLabel && form.condition !== "brand_new" && form.category !== "event_passes"
          ? `, used for ${usageLabel.toLowerCase()}`
          : "";
      lines.push(`Bought in ${when}${used}.`);
    }
  }
  const extras = [];
  if (form.brand && !title.toLowerCase().includes(String(form.brand).toLowerCase())) extras.push(`Brand: ${form.brand}`);
  if (form.color && !isFieldOff(form.category, "color")) extras.push(`Colour: ${form.color}`);
  if (extras.length) lines.push(`${extras.join(". ")}.`);
  lines.push("Pickup on campus. Message me if you have any questions.");
  return lines.join(" ");
};

/* ── Price suggestion ───────────────────────────────────────────────── */

const CONDITION_FACTOR = {
  brand_new: 0.85,
  like_new: 0.7,
  gently_used: 0.55,
  well_used: 0.4,
  for_parts_or_not_working: 0.2,
};

/**
 * Typical second-hand asking price from original price, condition and age.
 * A rough heuristic shown as a one-tap suggestion, never auto-applied.
 */
export const suggestPrice = ({ originalPrice, condition, purchaseDate }) => {
  const original = Number(originalPrice);
  if (!Number.isFinite(original) || original < 50) return null;
  const base = CONDITION_FACTOR[condition] ?? 0.6;
  const years = (monthsSince(purchaseDate) ?? 0) / 12;
  const ageFactor = condition === "brand_new" ? 1 : Math.max(0.6, 1 - 0.08 * years);
  const raw = original * base * ageFactor;
  const step = raw >= 1000 ? 50 : 10;
  const rounded = Math.max(10, Math.round(raw / step) * step);
  return rounded < original ? rounded : null;
};

/* ── Remembered preferences (device-local, account-scoped) ──────────── */

export const LAST_PAYMENT_KEY = "unideals-last-payment";
export const readLastPayment = () => {
  try {
    return localStorage.getItem(LAST_PAYMENT_KEY) || "";
  } catch {
    return "";
  }
};
export const rememberPayment = (value) => {
  try {
    if (value) localStorage.setItem(LAST_PAYMENT_KEY, value);
  } catch {
    // storage unavailable: just don't remember
  }
};

/**
 * Product page / review: a spec that's switched off or fixed for the
 * category carries no information for buyers (e.g. "Used for" on an event
 * pass), so it's hidden there too, keeping the page in sync with the form.
 */
export const isSpecHidden = (category, field) => {
  const rule = rulesFor(category)[field];
  return rule === "off" || Boolean(rule?.fixed);
};
