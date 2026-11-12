import axios from "axios";
import axiosInstance from "../../../services/axiosInstance.js";
import { getRefreshTokenUrl } from "../../auth/api/authApi.js";

const BASE = "/api/chat";

// Same shape as an axios error, so callers handle both paths alike.
const httpError = (status, data) =>
  Object.assign(new Error(data?.message || `Request failed (${status})`), { response: { status, data } });

const postStream = (body, signal) =>
  fetch(`${axiosInstance.defaults.baseURL || ""}${BASE}/assistant/stream`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
    body: JSON.stringify(body),
    signal,
  });

// Parses "event: x\ndata: {...}" blocks as they arrive.
const readEvents = async (response, onEvent) => {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { value, done } = await reader.read();
    buffer += decoder.decode(value || new Uint8Array(), { stream: !done });
    let end;
    while ((end = buffer.indexOf("\n\n")) !== -1) {
      const block = buffer.slice(0, end);
      buffer = buffer.slice(end + 2);
      const event = /^event: (.*)$/m.exec(block)?.[1];
      const data = /^data: (.*)$/m.exec(block)?.[1];
      if (event && data) onEvent(event, JSON.parse(data));
    }
    if (done) return;
  }
};

/**
 * Sends a message and streams the reply: onText(fullTextSoFar) as it's
 * written, resolving with the final reply data. Falls back to the plain JSON
 * endpoint when streaming isn't possible (old browser, proxy, network blip
 * before anything arrived). Errors look like axios errors.
 */
export const sendAssistantMessage = async (body, { onText, signal } = {}) => {
  const canStream = typeof fetch === "function" && typeof TextDecoder === "function" && "body" in Response.prototype;
  if (!canStream) {
    const { data } = await axiosInstance.post(`${BASE}/assistant`, body);
    return data?.data || {};
  }

  let response;
  try {
    response = await postStream(body, signal);
    if (response.status === 401) {
      // Expired session: refresh the cookies once, then retry.
      await axios.post(getRefreshTokenUrl(), {}, { withCredentials: true }).catch(() => null);
      response = await postStream(body, signal);
    }
  } catch (error) {
    if (error.name === "AbortError") throw error;
    const { data } = await axiosInstance.post(`${BASE}/assistant`, body);
    return data?.data || {};
  }

  const type = response.headers.get("content-type") || "";
  if (!type.includes("text/event-stream")) {
    const data = await response.json().catch(() => ({}));
    if (response.status === 401) {
      // Still not signed in after a refresh: answer as a guest.
      const fallback = await axiosInstance.post(`${BASE}/assistant`, body);
      return fallback.data?.data || {};
    }
    throw httpError(response.status, data);
  }

  let text = "";
  let final = null;
  let failure = null;
  await readEvents(response, (event, data) => {
    if (event === "delta") {
      text += data.text || "";
      onText?.(text);
    } else if (event === "done") {
      final = data.data || {};
    } else if (event === "error") {
      failure = httpError(500, data);
    }
  });
  if (final) return final;
  throw failure || httpError(500, { message: "The reply was cut off. Please try again." });
};

export const listAssistantChats = () => axiosInstance.get(`${BASE}/conversations`).then((r) => r.data?.data || []);

export const getAssistantChat = (id) => axiosInstance.get(`${BASE}/conversations/${id}`).then((r) => r.data?.data);

export const deleteAssistantChat = (id) => axiosInstance.delete(`${BASE}/conversations/${id}`);

export const deleteAllAssistantChats = () => axiosInstance.delete(`${BASE}/conversations`);

export const rateAssistantReply = (conversationId, messageId, value) =>
  axiosInstance.put(`${BASE}/conversations/${conversationId}/messages/${messageId}/feedback`, { value });
