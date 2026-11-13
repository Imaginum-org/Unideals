// AI calls for the assistant: Gemini first, Groq as the failsafe.
//
// Every call walks one chain of models: the Gemini models, then the Groq
// models ("groq:<model>"). A model that fails hands over to the next one, within
// the turn's time budget. Health is tracked at two levels:
//   - a provider (gemini / groq) is switched off for a while when its key is
//     invalid or expired (401/403), or its quota is used up (429);
//   - a single model is parked for a while when it times out, is overloaded
//     (5xx) or no longer exists (404).
// Requests with an image or audio only go to Gemini (Groq is text-only here).
// The exported names still say "Gemini" because the callers predate Groq.
import ai, { GEMINI_MODEL, GEMINI_TIMEOUT } from "../config/gemini.js";
import { GROQ_MODELS, groqGenerate, groqStream, hasGroqKey, hasMedia } from "./assistant.groq.js";

const GROQ_PREFIX = "groq:";
const groqChain = GROQ_MODELS.map((model) => `${GROQ_PREFIX}${model}`);

const GEMINI_MODELS = [
  GEMINI_MODEL || "gemini-flash-latest",
  // Tried in order when the primary model times out or is overloaded (503).
  // The lite model is a sensible default: it's fast and rarely saturated.
  ...String(process.env.GEMINI_FALLBACK_MODELS || "gemini-flash-lite-latest")
    .split(",")
    .map((model) => model.trim()),
].filter(Boolean);

export const CANDIDATE_MODELS = [...GEMINI_MODELS, ...groqChain];

// Rewriting a reply from known facts is a light task: the fast model goes
// first so every turn stays quick; the primary model, then Groq, back it up.
// Groq's order is reversed here (smallest model first): rewrites are the
// high-volume call, and each Groq model has its own per-minute token limit,
// so this spreads the load across both.
export const COMPOSE_MODELS = [
  ...(process.env.GEMINI_COMPOSE_MODELS
    ? process.env.GEMINI_COMPOSE_MODELS.split(",").map((model) => model.trim())
    : [...GEMINI_MODELS.slice(1), GEMINI_MODELS[0]]),
  ...[...groqChain].reverse(),
].filter(Boolean);

// Per-model budget. Kept short so an overloaded model falls through to the
// next one quickly instead of leaving the user staring at "thinking...".
const PER_MODEL_TIMEOUT_MS = Math.min(GEMINI_TIMEOUT, 9000);
const MODEL_COOLDOWN_MS = 2 * 60_000;
const RATE_LIMIT_COOLDOWN_MS = 60_000;
// Daily quota used up: no point retrying every minute.
const DAILY_QUOTA_COOLDOWN_MS = 15 * 60_000;
// Invalid / expired / revoked key: retried now and then in case it was fixed.
const BAD_KEY_COOLDOWN_MS = 10 * 60_000;

// Whole-turn budget across all model calls (tool rounds + fallbacks + the
// reply writer), so a slow AI can't keep a student waiting for a minute.
export const TURN_BUDGET_MS = 20_000;
export const MIN_CALL_MS = 1500;

// Soft: overloaded / timed out models, still tried if nothing else is left.
const modelCooldownUntil = new Map();
// Hard: rate-limited models (both providers' quotas are per model), never
// called before the provider's own "try again in…" time.
const modelBlockedUntil = new Map();
// Whole provider off: bad or expired key.
const providerDownUntil = { gemini: 0, groq: 0 };

const providerOf = (model) => (model.startsWith(GROQ_PREFIX) ? "groq" : "gemini");

const hasKey = (provider) =>
  provider === "groq" ? hasGroqKey() : Boolean(String(process.env.GEMINI_API_KEY || "").trim());

const providerUsable = (provider) => hasKey(provider) && Date.now() > providerDownUntil[provider];
const modelBlocked = (model) => (modelBlockedUntil.get(model) || 0) > Date.now();
const modelCallable = (model) => providerUsable(providerOf(model)) && !modelBlocked(model);

/** True when at least one AI model can be called right now. */
export const isAIAvailable = () => [...CANDIDATE_MODELS, ...COMPOSE_MODELS].some(modelCallable);

/** Kept for existing callers: "can the assistant use an AI model right now?" */
export const isGeminiAvailable = isAIAvailable;

/** Which providers are configured and healthy (for logs and the health check script). */
export const aiProviderStatus = () =>
  Object.fromEntries(
    ["gemini", "groq"].map((provider) => [
      provider,
      !hasKey(provider) ? "no key" : providerUsable(provider) ? "ok" : `paused ${Math.ceil((providerDownUntil[provider] - Date.now()) / 1000)}s`,
    ]),
  );

/** Test helper: forget every cooldown. */
export const resetAIProviderState = () => {
  modelCooldownUntil.clear();
  modelBlockedUntil.clear();
  providerDownUntil.gemini = 0;
  providerDownUntil.groq = 0;
};

const errorStatus = (err) => err.status || err.statusCode;
const errorText = (err) => `${err.message || ""} ${err.code || ""}`;

const isRateLimit = (err) => {
  const status = errorStatus(err);
  return status === 429 || err.code === 429 || status === "RESOURCE_EXHAUSTED" || /\b429\b|RESOURCE_EXHAUSTED|rate.?limit/i.test(errorText(err));
};

// Gemini reports a bad key as 400 API_KEY_INVALID; Groq as 401 invalid_api_key.
const isBadKey = (err) => {
  const status = errorStatus(err);
  return status === 401 || status === 403 || /API_KEY_INVALID|API key (?:not valid|expired)|invalid_api_key|PERMISSION_DENIED/i.test(errorText(err));
};

// "Please try again in 1.125s" (Groq) / "Please retry in 37.2s" (Gemini).
const retryAfterMs = (err) => {
  const match = /(?:try again|retry) in ([\d.]+)\s*(ms|s|m)\b/i.exec(errorText(err));
  if (!match) return null;
  const value = parseFloat(match[1]);
  return match[2] === "ms" ? value : match[2] === "m" ? value * 60_000 : value * 1000;
};

const pauseProvider = (provider, ms, why) => {
  providerDownUntil[provider] = Math.max(providerDownUntil[provider], Date.now() + ms);
  console.warn(`[Assistant] ${provider} paused for ${Math.round(ms / 1000)}s (${why}); using the next provider.`);
};

/**
 * Records what a failed call means for the next ones. Never stops the chain:
 * a problem with one provider is exactly when the other one should answer.
 */
const noteFailure = (err, model) => {
  const provider = providerOf(model);
  const status = errorStatus(err);
  if (isBadKey(err)) {
    pauseProvider(provider, BAD_KEY_COOLDOWN_MS, "API key invalid, expired or not allowed");
    return;
  }
  if (isRateLimit(err)) {
    // Quotas are per model: block just this one and let the next model answer.
    const daily = /per.?day|daily|PerDay|\bRPD\b|\bTPD\b/i.test(errorText(err));
    const ms = daily
      ? DAILY_QUOTA_COOLDOWN_MS
      : Math.min(Math.max(retryAfterMs(err) ?? RATE_LIMIT_COOLDOWN_MS, 2000), RATE_LIMIT_COOLDOWN_MS);
    modelBlockedUntil.set(model, Date.now() + ms);
    console.warn(`[Assistant] Model ${model} rate limited${daily ? " (daily quota used up)" : ""}; skipping it for ${Math.round(ms / 1000)}s.`);
    return;
  }
  // Overloaded (5xx), timed out, or retired (404): park this model so the
  // next requests go straight to a healthy one.
  const isTimeout = /timed out/i.test(String(err.message || ""));
  if (isTimeout || status === 503 || status === 500 || status === 502 || status === 404) {
    modelCooldownUntil.set(model, Date.now() + (status === 404 ? 30 * 60_000 : MODEL_COOLDOWN_MS));
    console.warn(`[Assistant] Model ${model} unavailable (${status || "timeout"}); trying fallback.`);
    return;
  }
  // Anything else (e.g. a 400 one model didn't like): just try the next model.
  console.warn(`[Assistant] Model ${model} failed (${status || "error"}): ${String(err.message || err).slice(0, 160)}`);
};

/** Models worth trying for this request, healthiest first. */
const modelsToTry = (models, params) => {
  const media = hasMedia(params);
  const eligible = [...new Set(models)].filter(
    (model) => modelCallable(model) && !(media && providerOf(model) === "groq"),
  );
  const now = Date.now();
  // Skip models that recently timed out / were overloaded, unless every model is.
  const healthy = eligible.filter((model) => (modelCooldownUntil.get(model) || 0) <= now);
  return healthy.length ? healthy : eligible;
};

const noModelError = () => new Error("No AI provider is available right now (Gemini and Groq are both paused or not configured).");

// Runs one call and aborts it when the time is up. Aborting frees this server
// immediately; the provider may still bill the abandoned call.
const generateWithTimeout = async (params, model, timeoutMs, signal) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const onOuterAbort = () => controller.abort();
  signal?.addEventListener("abort", onOuterAbort);
  try {
    if (providerOf(model) === "groq") {
      return await groqGenerate(params, model.slice(GROQ_PREFIX.length), { signal: controller.signal });
    }
    return await ai.models.generateContent({
      ...params,
      model,
      config: { ...(params.config || {}), abortSignal: controller.signal },
    });
  } catch (error) {
    if (controller.signal.aborted) throw new Error(`Model ${model} timed out after ${timeoutMs}ms`);
    throw error;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", onOuterAbort);
  }
};

/** One AI call, falling back across models and providers within the turn's deadline. */
export const callGeminiWithFallback = async (
  params,
  { deadline = Date.now() + TURN_BUDGET_MS, models = CANDIDATE_MODELS, signal } = {},
) => {
  const chain = modelsToTry(models, params);
  if (!chain.length) throw noModelError();
  let lastError = null;
  for (const model of chain) {
    // A failure earlier in this loop may have paused the whole provider.
    if (!modelCallable(model)) continue;
    const remaining = deadline - Date.now();
    if (remaining < MIN_CALL_MS || signal?.aborted) {
      lastError = lastError || new Error("Assistant turn ran out of time");
      break;
    }
    try {
      const response = await generateWithTimeout(params, model, Math.min(PER_MODEL_TIMEOUT_MS, remaining), signal);
      return { response, model };
    } catch (err) {
      lastError = err;
      if (signal?.aborted) break;
      noteFailure(err, model);
    }
  }
  throw lastError || noModelError();
};

const chunkText = (chunk) => {
  if (typeof chunk?.text === "string") return chunk.text;
  return (chunk?.candidates?.[0]?.content?.parts || []).map((part) => part.text || "").join("");
};

// Text pieces from either provider's stream.
async function* openTextStream(params, model, signal) {
  if (providerOf(model) === "groq") {
    yield* groqStream(params, model.slice(GROQ_PREFIX.length), { signal });
    return;
  }
  const stream = await ai.models.generateContentStream({
    ...params,
    model,
    config: { ...(params.config || {}), abortSignal: signal },
  });
  for await (const chunk of stream) {
    const piece = chunkText(chunk);
    if (piece) yield piece;
  }
}

/**
 * Streams one reply, calling onText(piece) as text arrives. Falls back to the
 * next model only while nothing has been sent yet; after the first piece, a
 * failure is thrown with `partial: true` so the caller can reset.
 *
 * Two clocks: the first words must arrive by `firstTextBy` (so a stuck model
 * is dropped quickly); once text is flowing the student is reading along, so
 * it may continue until the turn's `deadline`. Returns { text, model }.
 */
export const streamGeminiWithFallback = async (
  params,
  { deadline = Date.now() + TURN_BUDGET_MS, firstTextBy = deadline, models = CANDIDATE_MODELS, signal, onText },
) => {
  const chain = modelsToTry(models, params);
  if (!chain.length) throw noModelError();
  let lastError = null;
  for (const model of chain) {
    if (!modelCallable(model)) continue;
    const remaining = Math.min(firstTextBy, deadline) - Date.now();
    if (remaining < MIN_CALL_MS || signal?.aborted) {
      lastError = lastError || new Error("Assistant turn ran out of time");
      break;
    }
    let timeoutMs = Math.min(PER_MODEL_TIMEOUT_MS, remaining);
    const controller = new AbortController();
    let timer = setTimeout(() => controller.abort(), timeoutMs);
    const onOuterAbort = () => controller.abort();
    signal?.addEventListener("abort", onOuterAbort);
    let text = "";
    try {
      for await (const piece of openTextStream(params, model, controller.signal)) {
        if (controller.signal.aborted) throw new Error("aborted");
        if (!text) {
          // First words are out: switch to the turn's overall deadline.
          clearTimeout(timer);
          timeoutMs = Math.max(deadline - Date.now(), 0);
          timer = setTimeout(() => controller.abort(), timeoutMs);
        }
        text += piece;
        onText(piece);
      }
      return { text, model };
    } catch (err) {
      const error = controller.signal.aborted && !signal?.aborted ? new Error(`Model ${model} timed out after ${timeoutMs}ms`) : err;
      if (text) throw Object.assign(error, { partial: true });
      lastError = error;
      if (signal?.aborted) break;
      noteFailure(error, model);
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener("abort", onOuterAbort);
    }
  }
  throw lastError || noModelError();
};

/** Parses a JSON reply, tolerating ```json fences or stray prose around it. */
export const parseJsonResponse = (text = "") => {
  try {
    return JSON.parse(text.replace(/^```json\s*/i, "").replace(/\s*```$/i, "").trim());
  } catch {
    const objectMatch = text.match(/\{[\s\S]*\}/);
    if (!objectMatch) return null;
    try {
      return JSON.parse(objectMatch[0]);
    } catch {
      return null;
    }
  }
};
