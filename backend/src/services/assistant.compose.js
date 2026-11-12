// The reply writer: "facts from code, words from Gemini".
// Every deterministic path (search, knowledge base, pricing, small talk...)
// produces a draft with the facts. This turns the draft into a short, human
// reply in the student's own language, personalised with what we know about
// them. If Gemini is down, slow or goes off the facts, the draft is used as is.
import { COMPOSE_MODELS, MIN_CALL_MS, callGeminiWithFallback, isGeminiAvailable, streamGeminiWithFallback } from "./assistant.gemini.js";
import { describeViewerContext } from "./assistant.context.js";

const COMPOSE_BUDGET_MS = 8000;
const CHIPS_MARKER = "@@CHIPS@@";
const MAX_REPLY_CHARS = 1400;

export const PERSONA = `You are Unideals AI, the assistant inside Unideals: a campus marketplace where Indian college students buy and sell second-hand things (books, cycles, laptops, hostel stuff) with other students on their own campus.

How you talk:
- Like a friendly, switched-on senior on campus: warm, casual and to the point. Never like a call-centre script or a menu.
- Reply in the language named in "Reply in" below (worked out from the student's own message). English means plain English with no Hindi words. Match their tone.
- Keep it short: usually 1-3 sentences. Use a short numbered list only for steps.
- Use the student's first name now and then (at most once in a reply, not every reply). Never invent a name.
- At most one emoji, only when it fits. Never say "As an AI", "I'm the Unideals assistant" or recite everything you can do.
- **Bold** sparingly, for a key price or item. No headings, no tables.
- Prices in ₹ with Indian digit grouping (₹12,500).`;

const TASKS = {
  rewrite: `Write the reply that appears above the cards and buttons the app is already showing.
- Every price, number, listing name, link, step and policy detail must come from the facts below. Don't add facts, listings, policies, prices or promises.
- If the facts contain numbered steps, keep them as a numbered list with the same content (you may tighten the wording).
- The student can see the listing cards, so don't list them all again. Mentioning one or two that stand out is fine.
- If the app found nothing, say so kindly and point to the alternative in the facts.
- Use the student's context only when it genuinely helps (e.g. they ask about boosts and have a listing with few views). Never recite it.`,
  smalltalk: `The student is just chatting (a greeting, thanks, goodbye or "how are you"). Reply in one short, natural line, the way a friend would.
- Use their context only if it is genuinely useful (e.g. "your cycle listing got 40 views, want to boost it?"), otherwise just be friendly.
- Don't list features.`,
};

const productLine = (product, index) =>
  `${index + 1}. ${product.title} — ₹${Number(product.selling_price || 0).toLocaleString("en-IN")}${product.conditionLabel ? `, ${product.conditionLabel}` : ""}${product.original_price > product.selling_price ? ` (was ₹${Number(product.original_price).toLocaleString("en-IN")})` : ""}`;

const describeFacts = (draft) => {
  const lines = [];
  if (draft.reply) lines.push(`The app's answer:\n${draft.reply}`);
  const products = draft.productCards?.length ? draft.productCards : draft.products || [];
  if (products.length) {
    lines.push(`Listing cards shown under your reply:\n${products.slice(0, 6).map(productLine).join("\n")}`);
  } else if (draft.intent === "product_search" || draft.intent === "product_recommendation") {
    lines.push("No listing cards are shown.");
  }
  if (draft.missingItems?.length) lines.push(`Not available on campus right now: ${draft.missingItems.join(", ")}`);
  const estimate = draft.estimate;
  if (estimate && !estimate.error) {
    lines.push(`Fair-price card: low ₹${estimate.low}, fair ₹${estimate.fair}, high ₹${estimate.high}, from ${estimate.sampleSize} campus listing(s)`);
  }
  if (draft.facts) lines.push(draft.facts);
  if (draft.comparison && !draft.facts) lines.push("A side-by-side comparison card is shown under your reply.");
  if (draft.draft) lines.push("A listing draft card is shown under your reply.");
  if (draft.checklist) lines.push("An inspection checklist card is shown under your reply.");
  if (draft.safetyTips) lines.push("A safety tips card is shown under your reply.");
  if (draft.bundle) lines.push("A budget bundle card is shown under your reply.");
  if (draft.route) lines.push(`A button linking to ${draft.route} is shown under your reply.`);
  return lines.join("\n\n");
};

const describeHistory = (history = []) =>
  history
    .slice(-4)
    .map((entry) => `${entry.sender === "user" ? "Student" : "You"}: ${String(entry.text || "").replace(/\s+/g, " ").slice(0, 300)}`)
    .join("\n");

// Hindi words that are common in Hinglish but never appear in English text.
const HINGLISH_WORDS = /\b(?:chahiye|chahie|hai|hain|kya|kaise|kaisa|kaisi|kitna|kitne|kitni|mujhe|mera|meri|mere|bhai|yaar|dikhao|batao|bata|karo|karna|kar|nahi|nahin|haan|accha|acha|achha|tak|wala|wali|wale|sasta|sasti|bech|bechna|khareed|kharidna|aur|bhi|kuch|koi|kab|kahan|kyun|kyu|matlab|thik|theek|dost|paisa|paise|rupaye)\b/gi;

/**
 * The language to answer in, from the student's own message: "Hindi" for
 * Devanagari, "Hinglish" for Roman-script Hindi, otherwise "English". Done in
 * code because models drift into Hinglish when the context sounds Indian.
 */
export const replyLanguage = (message = "") => {
  const text = String(message);
  if (/[\u0900-\u097F]/.test(text)) return "Hindi (Devanagari script)";
  const words = text.toLowerCase().match(/[a-z]+/g) || [];
  const hindi = (text.match(HINGLISH_WORDS) || []).length;
  if (hindi >= 2 || (hindi === 1 && words.length <= 4)) return "Hinglish (Hindi in Roman letters, mixed with English)";
  return "English";
};

export const buildComposePrompt = ({ message, draft, context, history, mode = "rewrite" }) => {
  const systemInstruction = `${PERSONA}

${TASKS[mode] || TASKS.rewrite}

Output format: the reply text only (no quotes, no JSON). Then a line containing exactly ${CHIPS_MARKER}, then 2-4 short follow-up suggestions the student might tap next, one per line, written as the student would type them, in the student's language, each under 40 characters.`;
  const parts = [
    `About the student:\n${describeViewerContext(context)}`,
    history?.length ? `Recent chat (oldest first):\n${describeHistory(history)}` : "",
    `Facts from the app (the only source for prices, listings and policies):\n${describeFacts(draft) || "(none)"}`,
    draft.suggestions?.length ? `Follow-ups the app would suggest (reuse or improve): ${draft.suggestions.join(" | ")}` : "",
    `The student's message:\n${message}`,
    `Reply in: ${replyLanguage(message)}`,
  ].filter(Boolean);
  return { systemInstruction, text: parts.join("\n\n") };
};

const digitsIn = (text) => (String(text).match(/\d[\d,]*/g) || []).map((n) => n.replace(/,/g, ""));

/**
 * True when the reply names a ₹ amount that isn't in the facts or the
 * student's own message (the model drifting off the data).
 */
export const inventsPrices = (reply, factsText) => {
  const known = new Set(digitsIn(factsText));
  const amounts = [...String(reply).matchAll(/(?:₹|rs\.?\s?|inr\s?)\s?(\d[\d,]*)/gi)].map((m) => m[1].replace(/,/g, ""));
  return amounts.some((amount) => !known.has(amount));
};

/** Splits "reply @@CHIPS@@ chip\nchip" into { reply, suggestions }. */
export const splitComposed = (text = "") => {
  const [replyPart, chipPart = ""] = String(text).split(CHIPS_MARKER);
  const suggestions = chipPart
    .split("\n")
    .map((line) => line.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, "").replace(/^["']|["']$/g, "").trim())
    .filter((line) => line && line.length <= 60)
    .slice(0, 4);
  return { reply: replyPart.trim(), suggestions };
};

// Passes text through to onText, holding back anything that could be the
// start of the chips marker so it never reaches the student.
const markerFilter = (onText) => {
  let pending = "";
  let done = false;
  return (piece) => {
    if (done) return;
    pending += piece;
    const at = pending.indexOf(CHIPS_MARKER);
    if (at !== -1) {
      if (at > 0) onText(pending.slice(0, at));
      pending = "";
      done = true;
      return;
    }
    const safe = pending.length - (CHIPS_MARKER.length - 1);
    if (safe > 0) {
      onText(pending.slice(0, safe));
      pending = pending.slice(safe);
    }
  };
};

/**
 * Rewrites a draft reply in a human voice. Returns { reply, suggestions, model }
 * or null when the draft should be used unchanged. With onText, the reply is
 * streamed; a failure after text was sent throws with `partial: true`.
 */
export const composeReply = async ({ message, draft, context, history, mode = "rewrite", deadline, signal, onText }) => {
  if (!isGeminiAvailable()) return null;
  const until = Math.min(deadline || Infinity, Date.now() + COMPOSE_BUDGET_MS);
  if (until - Date.now() < MIN_CALL_MS) return null;

  const { systemInstruction, text } = buildComposePrompt({ message, draft, context, history, mode });
  const params = {
    contents: [{ role: "user", parts: [{ text }] }],
    config: { systemInstruction, temperature: 0.7, maxOutputTokens: 500 },
  };
  let raw;
  let model;
  try {
    if (onText) {
      // The first words must come within the writer's budget; after that the
      // reply may keep streaming until the turn's own deadline.
      ({ text: raw, model } = await streamGeminiWithFallback(params, {
        firstTextBy: until,
        deadline: Math.max(until, deadline || until),
        models: COMPOSE_MODELS,
        signal,
        onText: markerFilter(onText),
      }));
    } else {
      const result = await callGeminiWithFallback(params, { deadline: until, models: COMPOSE_MODELS, signal });
      raw = result.response?.text || "";
      model = result.model;
    }
  } catch (error) {
    if (error.partial) throw error;
    console.warn("[Assistant] Reply writer unavailable, using the draft:", error.message || error);
    return null;
  }

  const composed = splitComposed(raw);
  const factsText = `${describeFacts(draft)}\n${message}\n${describeViewerContext(context)}`;
  if (
    !composed.reply ||
    composed.reply.length > MAX_REPLY_CHARS ||
    /^\s*[{[]/.test(composed.reply) ||
    inventsPrices(composed.reply, factsText)
  ) {
    console.warn("[Assistant] Reply writer went off the facts; using the draft.");
    return { rejected: true };
  }
  return { reply: composed.reply, suggestions: composed.suggestions, model };
};
