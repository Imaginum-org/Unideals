// Gemini calls for the assistant: model fallback, per-turn time budget,
// rate-limit circuit breaker, and an optional streaming variant.
import ai, { GEMINI_MODEL, GEMINI_TIMEOUT } from "../config/gemini.js";

export const CANDIDATE_MODELS = [
  GEMINI_MODEL || "gemini-flash-latest",
  // Tried in order when the primary model times out or is overloaded (503).
  // The lite model is a sensible default: it's fast and rarely saturated.
  ...String(process.env.GEMINI_FALLBACK_MODELS || "gemini-flash-lite-latest")
    .split(",")
    .map((model) => model.trim()),
].filter(Boolean);

// Rewriting a reply from known facts is a light task: the fast model goes
// first so every turn stays quick; the primary model is the backup.
export const COMPOSE_MODELS = (process.env.GEMINI_COMPOSE_MODELS
  ? process.env.GEMINI_COMPOSE_MODELS.split(",").map((model) => model.trim())
  : [...CANDIDATE_MODELS.slice(1), CANDIDATE_MODELS[0]]
).filter(Boolean);

// Per-model budget. Kept short so an overloaded model falls through to the
// next one quickly instead of leaving the user staring at "thinking...".
const PER_MODEL_TIMEOUT_MS = Math.min(GEMINI_TIMEOUT, 9000);
const MODEL_COOLDOWN_MS = 2 * 60_000;
const modelCooldownUntil = new Map();

// Whole-turn budget across all model calls (tool rounds + fallbacks + the
// reply writer), so a slow Gemini can't keep a student waiting for a minute.
export const TURN_BUDGET_MS = 20_000;
export const MIN_CALL_MS = 1500;

let geminiRateLimitedUntil = 0;

export const isGeminiAvailable = () => Boolean(process.env.GEMINI_API_KEY) && Date.now() > geminiRateLimitedUntil;

const errorStatus = (err) => err.status || err.statusCode;

const isRateLimit = (err) => {
  const status = errorStatus(err);
  return (
    status === 429 ||
    err.code === 429 ||
    status === "RESOURCE_EXHAUSTED" ||
    String(err.message || "").includes("429") ||
    String(err.message || "").includes("RESOURCE_EXHAUSTED")
  );
};

/**
 * Records what a failed call means for the next ones. Returns true when the
 * caller should stop trying other models (rate limit, bad request, auth).
 */
const noteFailure = (err, model) => {
  if (isRateLimit(err)) {
    geminiRateLimitedUntil = Date.now() + 60000;
    console.warn("[Assistant] Gemini quota/rate limit detected (429). Circuit breaker enabled for 60s.");
    return true;
  }
  const status = errorStatus(err);
  if (status === 400 || status === 401 || status === 403) return true;
  // Overloaded (503), timed out, or retired (404): park this model so the
  // next requests go straight to a healthy fallback.
  const isTimeout = /timed out/i.test(String(err.message || ""));
  if (isTimeout || status === 503 || status === 500 || status === 404) {
    modelCooldownUntil.set(model, Date.now() + (status === 404 ? 30 * 60_000 : MODEL_COOLDOWN_MS));
    console.warn(`[Assistant] Model ${model} unavailable (${status || "timeout"}); trying fallback.`);
  }
  return false;
};

const modelsToTry = (models) => {
  const allModels = [...new Set(models)];
  const now = Date.now();
  // Skip models that recently timed out / were overloaded, unless every model is.
  const healthy = allModels.filter((model) => (modelCooldownUntil.get(model) || 0) <= now);
  return healthy.length ? healthy : allModels;
};

// Runs one generateContent call and aborts it when the time is up. Aborting
// frees this server immediately; Google may still bill the abandoned call.
const generateWithTimeout = async (params, model, timeoutMs, signal) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const onOuterAbort = () => controller.abort();
  signal?.addEventListener("abort", onOuterAbort);
  try {
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

/** One Gemini call, falling back across models within the turn's deadline. */
export const callGeminiWithFallback = async (
  params,
  { deadline = Date.now() + TURN_BUDGET_MS, models = CANDIDATE_MODELS, signal } = {},
) => {
  if (!isGeminiAvailable()) throw new Error("Gemini API is temporarily in cooldown due to rate limit.");
  let lastError = null;
  for (const model of modelsToTry(models)) {
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
      if (noteFailure(err, model)) break;
    }
  }
  throw lastError;
};

const chunkText = (chunk) => {
  if (typeof chunk?.text === "string") return chunk.text;
  return (chunk?.candidates?.[0]?.content?.parts || []).map((part) => part.text || "").join("");
};

/**
 * Streams one Gemini reply, calling onText(piece) as text arrives. Falls back
 * to the next model only while nothing has been sent yet; after the first
 * piece, a failure is thrown with `partial: true` so the caller can reset.
 *
 * Two clocks: the first words must arrive by `firstTextBy` (so a stuck model
 * is dropped quickly); once text is flowing the student is reading along, so
 * it may continue until the turn's `deadline`. Returns { text, model }.
 */
export const streamGeminiWithFallback = async (
  params,
  { deadline = Date.now() + TURN_BUDGET_MS, firstTextBy = deadline, models = CANDIDATE_MODELS, signal, onText },
) => {
  if (!isGeminiAvailable()) throw new Error("Gemini API is temporarily in cooldown due to rate limit.");
  let lastError = null;
  for (const model of modelsToTry(models)) {
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
      const stream = await ai.models.generateContentStream({
        ...params,
        model,
        config: { ...(params.config || {}), abortSignal: controller.signal },
      });
      for await (const chunk of stream) {
        if (controller.signal.aborted) throw new Error("aborted");
        const piece = chunkText(chunk);
        if (piece) {
          if (!text) {
            // First words are out: switch to the turn's overall deadline.
            clearTimeout(timer);
            timeoutMs = Math.max(deadline - Date.now(), 0);
            timer = setTimeout(() => controller.abort(), timeoutMs);
          }
          text += piece;
          onText(piece);
        }
      }
      return { text, model };
    } catch (err) {
      const error = controller.signal.aborted ? new Error(`Model ${model} timed out after ${timeoutMs}ms`) : err;
      if (text) throw Object.assign(error, { partial: true });
      lastError = error;
      if (noteFailure(error, model)) break;
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener("abort", onOuterAbort);
    }
  }
  throw lastError;
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
