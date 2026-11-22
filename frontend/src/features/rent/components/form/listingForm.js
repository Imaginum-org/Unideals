import { conditionLabel, categoryOf, formatDate, formatPrice, listingTypeOf, toDateInput, toLocalInput } from "../../constants/rentOptions.js";

/*
 * Pure state helpers for the Rent & Borrow listing form: defaults, loading a
 * saved post, validation, per-section progress and the API body. The form
 * keeps UI-friendly fields (intent + type); the API keeps kind + mode + price.
 */

export const HOUR = 3600 * 1000;
export const DAY = 24 * HOUR;
export const MAX_PHOTOS = 3;

// Mirrors backend/src/config/rent.js (RENT_LIMITS).
export const LIMITS = {
  title: 80,
  description: 500,
  spot: 60,
  timing: 80,
  returnPolicy: 200,
  notes: 300,
  price: 5000,
  deposit: 20000,
  quantity: 20,
  requestHours: 48,
  // The API allows 90 days from now; the last pickable *day* is 89 days out
  // so "end of that day" never lands past the limit.
  availableDays: 89,
};

// Mirrors RENT_UNSAFE_TEXT_RE: no phone or room numbers in public text.
const UNSAFE_TEXT = /(?:\+?91[\s-]?)?\b\d{10}\b|\broom\s*(?:no\.?|number|#)?\s*\d+|\bflat\s*(?:no\.?)?\s*\d+|house\s*no|door\s*no/i;
const UNSAFE_MESSAGE = "No phone or room numbers here. Share those in the chat once someone books.";

export const RENT_UNITS = ["hour", "day", "use"];

// Same four steps as the Sell flow.
export const STEPS = [
  { id: 1, label: "Details", hint: "What you're posting" },
  { id: 2, label: "Photos", hint: "Up to 3 images" },
  { id: 3, label: "Price & handover", hint: "Price, timing, meetup" },
  { id: 4, label: "Review", hint: "Check and publish" },
];

// Field → step, in the order the steps show them (first error wins).
const FIELD_STEP = [
  ["title", 1],
  ["category", 1],
  ["description", 1],
  ["amount", 3],
  ["deposit", 3],
  ["availableUntil", 3],
  ["neededBy", 3],
  ["block", 3],
  ["spot", 3],
  ["timing", 3],
  ["returnPolicy", 3],
  ["notes", 3],
];

export const modeOf = (type) => (type === "give" ? "share" : "lend");
export const isOffer = (form) => form.intent === "offer";
/** Food is used up, so it has no condition; requests don't either. */
export const showsCondition = (form) => isOffer(form) && form.category !== "food";
/** The return policy only makes sense when the item comes back to the poster. */
export const showsReturnPolicy = (form) => isOffer(form) && form.type !== "give";
export const needsAmount = (form) => form.type === "rent" || (form.type === "give" && form.givePaid);

const defaultNeededBy = () => toLocalInput(new Date(Date.now() + 6 * HOUR));
const newId = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;

export const blankForm = (intent = "offer", profile = null) => ({
  intent,
  type: "rent",
  title: "",
  description: "",
  category: "",
  condition: "",
  images: [], // { id, url, fileId } (saved) or { id, file, preview } (new)
  amount: "",
  rentUnit: intent === "request" ? "use" : "day",
  givePaid: false,
  deposit: "",
  quantity: 1,
  hasEndDate: false,
  availableUntil: "",
  neededBy: defaultNeededBy(),
  block: profile?.block || "",
  spot: "",
  timing: "",
  returnPolicy: "",
  notes: "",
});

export const formFromPost = (post) => {
  const type = listingTypeOf(post);
  const amount = post.price?.amount || 0;
  return {
    ...blankForm(post.kind),
    intent: post.kind,
    type,
    title: post.title || "",
    description: post.description || "",
    category: post.category || "",
    condition: post.condition || "",
    images: (post.images || []).map((img) => ({ id: img.fileId || img.url, url: img.url, fileId: img.fileId || null })),
    amount: amount ? String(amount) : "",
    rentUnit: RENT_UNITS.includes(post.price?.unit) ? post.price.unit : post.kind === "request" ? "use" : "day",
    givePaid: type === "give" && amount > 0,
    deposit: post.deposit ? String(post.deposit) : "",
    quantity: post.quantity || 1,
    hasEndDate: Boolean(post.availableUntil),
    availableUntil: post.availableUntil ? toDateInput(post.availableUntil) : "",
    neededBy: post.neededBy ? toLocalInput(post.neededBy) : defaultNeededBy(),
    block: post.block || "",
    spot: post.handover?.spot || "",
    timing: post.handover?.timing || "",
    returnPolicy: post.handover?.returnPolicy || "",
    notes: post.handover?.notes || "",
  };
};

export const newImage = (file) => ({ id: newId(), file, preview: URL.createObjectURL(file) });

/** Last day an offer can be picked as "available until" (inclusive). */
export const availableDateBounds = () => {
  const today = new Date();
  const max = new Date(today.getTime() + LIMITS.availableDays * DAY);
  return { min: toDateInput(today), max: toDateInput(max) };
};

const endOfDay = (dateInput) => new Date(`${dateInput}T23:59:00`);

/**
 * { field: { message, required } }. `required` errors are about missing
 * input and only show after a publish attempt; the rest (unsafe text,
 * limits) show as soon as they happen.
 */
export const computeErrors = (form, { blocksRequired }) => {
  const errors = {};
  const need = (field, message) => (errors[field] = { message, required: true });
  const bad = (field, message) => (errors[field] = { message, required: false });

  if (UNSAFE_TEXT.test(form.title)) bad("title", UNSAFE_MESSAGE);
  else if (form.title.trim().length < 3) need("title", "Add a title of at least 3 characters");
  if (!form.category) need("category", "Choose a category");
  if (UNSAFE_TEXT.test(form.description)) bad("description", UNSAFE_MESSAGE);

  if (needsAmount(form)) {
    const amount = Number(form.amount);
    if (!(amount > 0)) need("amount", isOffer(form) ? "Enter a price" : "Enter what you'll pay");
    else if (amount > LIMITS.price) bad("amount", `Price can be at most ₹${LIMITS.price.toLocaleString("en-IN")}`);
  }
  if (Number(form.deposit) > LIMITS.deposit) bad("deposit", `Deposit can be at most ₹${LIMITS.deposit.toLocaleString("en-IN")}`);

  if (isOffer(form) && form.hasEndDate) {
    const { min, max } = availableDateBounds();
    if (!form.availableUntil) need("availableUntil", "Pick the last day it's available");
    else if (form.availableUntil < min) bad("availableUntil", "Pick today or a later date");
    else if (form.availableUntil > max) bad("availableUntil", "Pick a date within the next 90 days");
  }
  if (!isOffer(form)) {
    const t = new Date(form.neededBy).getTime();
    if (!Number.isFinite(t)) need("neededBy", "Pick when you need it by");
    else if (t < Date.now() + 10 * 60 * 1000) bad("neededBy", "Pick a time at least 10 minutes from now");
    else if (t > Date.now() + LIMITS.requestHours * HOUR) bad("neededBy", "Requests can stay up for 48 hours at most");
  }

  if (blocksRequired && !form.block) need("block", "Pick your block");
  for (const field of ["spot", "timing", "notes", ...(showsReturnPolicy(form) ? ["returnPolicy"] : [])]) {
    if (UNSAFE_TEXT.test(form[field] || "")) bad(field, UNSAFE_MESSAGE);
  }
  return errors;
};

/**
 * Errors to show right now: "missing" ones only for steps the user has
 * tried to leave (Continue / Publish), the rest (unsafe text, limits) at once.
 */
export const visibleErrors = (errors, attemptedSteps) =>
  Object.fromEntries(
    Object.entries(errors)
      .filter(([field, e]) => !e.required || attemptedSteps.has(stepOf(field)))
      .map(([field, e]) => [field, e.message]),
  );

export const stepOf = (field) => FIELD_STEP.find(([f]) => f === field)?.[1] || 1;

/** First field with an error, optionally within one step. */
export const firstErrorField = (errors, step = null) =>
  FIELD_STEP.find(([field, s]) => errors[field] && (step === null || s === step))?.[0] || null;

/** First step (1-3) that still has an error, or null when all are fine. */
export const firstStepWithErrors = (errors) => {
  const field = firstErrorField(errors);
  return field ? stepOf(field) : null;
};

export const priceOf = (form) => {
  const amount = Math.round(Number(form.amount) || 0);
  if (form.type === "rent" && amount > 0) return { amount, unit: form.rentUnit };
  if (form.type === "give" && form.givePaid && amount > 0) return { amount, unit: "item" };
  return { amount: 0, unit: "free" };
};

/** API body for create (add kind + mode) and update. */
export const buildBody = (form, { blocks, images }) => {
  const offer = isOffer(form);
  const mode = modeOf(form.type);
  return {
    title: form.title.trim(),
    description: form.description.trim(),
    category: form.category,
    images,
    price: priceOf(form),
    ...(blocks.length || form.block ? { block: form.block || null } : {}),
    ...(mode === "lend" ? { deposit: offer ? Math.round(Number(form.deposit) || 0) : 0 } : {}),
    ...(mode === "share" ? { quantity: Number(form.quantity) || 1 } : {}),
    ...(!offer ? { needed_by: new Date(form.neededBy).toISOString() } : {}),
    ...(offer
      ? {
          condition: showsCondition(form) && form.condition ? form.condition : null,
          available_until: form.hasEndDate && form.availableUntil ? endOfDay(form.availableUntil).toISOString() : null,
        }
      : {}),
    handover: {
      spot: form.spot.trim(),
      timing: offer ? form.timing.trim() : "", // requests use "needed by" instead
      notes: form.notes.trim(),
      ...(showsReturnPolicy(form) ? { return_policy: form.returnPolicy.trim() } : {}),
    },
  };
};

/** One-line summaries for the review step and the preview. */
export const summarize = (form) => {
  const offer = isOffer(form);
  const price = priceOf(form);
  const deposit = Number(form.deposit) || 0;
  const availability = offer
    ? form.hasEndDate && form.availableUntil
      ? `Available until ${formatDate(endOfDay(form.availableUntil))}`
      : "Available now, no end date"
    : null;
  return {
    category: form.category ? categoryOf(form.category).label : "",
    condition: showsCondition(form) ? conditionLabel(form.condition) : "",
    price: formatPrice(price),
    deposit: offer && form.type !== "give" && deposit > 0 ? `₹${deposit.toLocaleString("en-IN")} deposit` : "",
    quantity: form.type === "give" ? `${form.quantity} ${offer ? "available" : "needed"}` : "",
    availability,
    neededBy: offer ? null : form.neededBy,
    place: [form.block, form.spot.trim()].filter(Boolean).join(" · "),
    timing: form.timing.trim(),
  };
};

/** Timing chips toggle comma-separated parts of the free-text field. */
export const toggleTimingPart = (timing, part) => {
  const parts = timing.split(",").map((p) => p.trim()).filter(Boolean);
  const has = parts.some((p) => p.toLowerCase() === part.toLowerCase());
  const next = has ? parts.filter((p) => p.toLowerCase() !== part.toLowerCase()) : [...parts, part];
  return next.join(", ").slice(0, LIMITS.timing);
};

export const hasTimingPart = (timing, part) =>
  timing.split(",").some((p) => p.trim().toLowerCase() === part.toLowerCase());

/** Preset sentences append to the return policy (or come out again). */
export const togglePolicyLine = (policy, line) => {
  const text = policy.trim();
  if (text.includes(line)) return text.replace(line, "").replace(/\s{2,}/g, " ").trim();
  return `${text ? `${text} ` : ""}${line}`.slice(0, LIMITS.returnPolicy);
};
