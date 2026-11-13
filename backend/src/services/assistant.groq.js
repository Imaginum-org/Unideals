// Groq (OpenAI-compatible chat API) as the assistant's failsafe provider.
//
// The rest of the assistant speaks Gemini's request/response format, so this
// adapter translates both ways:
//   request:  { contents: [{ role, parts }], config: { systemInstruction, tools,
//               temperature, maxOutputTokens, responseMimeType } }
//             → OpenAI { messages, tools, temperature, max_tokens, response_format }
//   response: OpenAI choice → { text, functionCalls, candidates[0].content.parts }
// Text only: requests carrying images or audio stay on Gemini.

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

/**
 * Groq models to try, in order (override with GROQ_MODELS, comma-separated).
 * Groq's catalogue changes; list what your key can use with
 * `node scripts/check-ai-providers.mjs`.
 */
export const GROQ_MODELS = String(process.env.GROQ_MODELS || "openai/gpt-oss-120b,openai/gpt-oss-20b")
  .split(",")
  .map((model) => model.trim())
  .filter(Boolean);

export const hasGroqKey = () => Boolean(String(process.env.GROQ_API_KEY || "").trim());

const safeJson = (text) => {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
};

const partsText = (parts = []) => parts.filter((p) => typeof p?.text === "string").map((p) => p.text).join("\n");

/** True when a request includes an image or audio (Gemini-only). */
export const hasMedia = (params) =>
  Array.isArray(params?.contents) && params.contents.some((c) => (c.parts || []).some((p) => p?.inlineData));

// Gemini's schema types are upper-case enums ("OBJECT"); JSON Schema wants lower-case.
const toJsonSchema = (schema) => {
  if (!schema || typeof schema !== "object") return schema;
  const out = {};
  for (const [key, value] of Object.entries(schema)) {
    if (key === "type") out.type = String(value).toLowerCase();
    else if (key === "properties") out.properties = Object.fromEntries(Object.entries(value).map(([name, s]) => [name, toJsonSchema(s)]));
    else if (key === "items") out.items = toJsonSchema(value);
    else out[key] = value;
  }
  return out;
};

const toTools = (config = {}) =>
  (config.tools || [])
    .flatMap((tool) => tool.functionDeclarations || [])
    .map((fd) => ({
      type: "function",
      function: {
        name: fd.name,
        description: fd.description || "",
        parameters: toJsonSchema(fd.parameters || { type: "OBJECT", properties: {} }),
      },
    }));

/**
 * Gemini contents → OpenAI messages. Gemini function calls carry no ids, so
 * each call gets one here and its functionResponse is matched by name, in order.
 */
export const toMessages = (params = {}) => {
  const messages = [];
  const system = params.config?.systemInstruction;
  if (system) messages.push({ role: "system", content: typeof system === "string" ? system : partsText(system.parts) });

  const contents = typeof params.contents === "string"
    ? [{ role: "user", parts: [{ text: params.contents }] }]
    : params.contents || [];
  let seq = 0;
  const openCalls = [];

  for (const content of contents) {
    const parts = content.parts || [];
    const text = partsText(parts);
    const calls = parts.filter((p) => p?.functionCall);
    const results = parts.filter((p) => p?.functionResponse);

    if (content.role === "model") {
      const message = { role: "assistant", content: text || null };
      if (calls.length) {
        message.tool_calls = calls.map(({ functionCall }) => {
          const id = `call_${seq++}`;
          openCalls.push({ id, name: functionCall.name });
          return { id, type: "function", function: { name: functionCall.name, arguments: JSON.stringify(functionCall.args || {}) } };
        });
      }
      messages.push(message);
    } else if (results.length) {
      for (const { functionResponse } of results) {
        const index = openCalls.findIndex((call) => call.name === functionResponse.name);
        const id = index >= 0 ? openCalls.splice(index, 1)[0].id : `call_${seq++}`;
        messages.push({ role: "tool", tool_call_id: id, content: JSON.stringify(functionResponse.response ?? {}).slice(0, 12000) });
      }
      if (text) messages.push({ role: "user", content: text });
    } else {
      messages.push({ role: "user", content: text });
    }
  }
  return messages;
};

// Reasoning models think before answering; that thinking counts against
// max_tokens, so they get extra room and are asked to keep it short.
const isReasoningModel = (model) => /gpt-oss|qwen3|deepseek-r1/i.test(model);

const buildBody = (params, model, stream) => {
  const config = params.config || {};
  const tools = toTools(config);
  const reasoning = isReasoningModel(model);
  const body = {
    model,
    messages: toMessages(params),
    temperature: config.temperature ?? 0.6,
    max_tokens: (config.maxOutputTokens || 1024) + (reasoning ? 512 : 0),
    stream,
  };
  if (/gpt-oss/i.test(model)) body.reasoning_effort = "low";
  // Keep the reasoning out of the reply text (Qwen would otherwise inline <think>…</think>).
  if (reasoning && !/gpt-oss/i.test(model)) body.reasoning_format = "hidden";
  if (tools.length) {
    body.tools = tools;
    body.tool_choice = "auto";
    // gpt-oss reads "return JSON" as a tool called JSON; spell out the difference.
    const note = `\n\nTools you may call: ${tools.map((t) => t.function.name).join(", ")}. Call no other function. When you give your final answer, write it as plain message text (if a JSON format is asked for, the JSON goes in the message text, not in a function call).`;
    if (body.messages[0]?.role === "system") body.messages[0] = { ...body.messages[0], content: `${body.messages[0].content}${note}` };
    else body.messages.unshift({ role: "system", content: note.trim() });
  } else if (config.responseMimeType === "application/json") {
    body.response_format = { type: "json_object" };
  }
  return body;
};

const post = async (body, signal) => {
  const response = await fetch(GROQ_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${String(process.env.GROQ_API_KEY || "").trim()}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    // Same shape as the Gemini SDK's errors: `status` drives the fallback rules.
    throw Object.assign(new Error(`Groq ${response.status}: ${data?.error?.message || response.statusText}`), {
      status: response.status,
      code: data?.error?.code,
    });
  }
  return response;
};

/** OpenAI choice → the Gemini response fields the assistant reads. */
const toGeminiResponse = (choice) => {
  const message = choice?.message || {};
  const functionCalls = (message.tool_calls || []).map((call) => ({
    name: call.function?.name,
    args: safeJson(call.function?.arguments || "{}") || {},
  }));
  const text =String(message.content || "").replace(/<think>[\s\S]*?<\/think>\s*/g, "");
  const parts = [
    ...(text ? [{ text }] : []),
    ...functionCalls.map((functionCall) => ({ functionCall })),
  ];
  return {
    text,
    functionCalls: functionCalls.length ? functionCalls : undefined,
    candidates: [{ content: { role: "model", parts } }],
  };
};

/** One completion. Throws errors with `status` like the Gemini SDK. */
export const groqGenerate = async (params, model, { signal } = {}) => {
  const body = buildBody(params, model, false);
  let response;
  try {
    response = await post(body, signal);
  } catch (error) {
    // The model produced an invalid tool call: ask again for a plain answer.
    if (error.code !== "tool_use_failed" || !body.tools) throw error;
    response = await post({ ...body, tool_choice: "none" }, signal);
  }
  const data = await response.json();
  return toGeminiResponse(data?.choices?.[0]);
};

/** Streams a completion's text, piece by piece. */
export async function* groqStream(params, model, { signal } = {}) {
  const response = await post(buildBody(params, model, true), signal);
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { value, done } = await reader.read();
    buffer += decoder.decode(value || new Uint8Array(), { stream: !done });
    let newline;
    while ((newline = buffer.indexOf("\n")) !== -1) {
      const line = buffer.slice(0, newline).trim();
      buffer = buffer.slice(newline + 1);
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (payload === "[DONE]") return;
      const chunk = safeJson(payload);
      if (chunk?.error) throw Object.assign(new Error(`Groq stream: ${chunk.error.message || "error"}`), { status: 500 });
      const piece = chunk?.choices?.[0]?.delta?.content;
      if (piece) yield piece;
    }
    if (done) return;
  }
}
