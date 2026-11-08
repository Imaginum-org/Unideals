import { useEffect, useState } from "react";
import axios from "./axiosInstance.js";

// One shared poller for the chat unread badge.
//
// The header and the profile sidebar each polled /api/conversations every
// 30s (and on every window focus), so a profile page fired 2x the requests,
// and background tabs kept polling forever. Now every consumer subscribes
// to one store: a single request per tick, nothing while the tab is hidden,
// and focus/visibility refreshes are de-duplicated.

const POLL_MS = 45000;
const MIN_GAP_MS = 5000; // focus + visibility events fire together

let value = 0;
let timer = null;
let inflight = null;
let lastFetch = 0;
const subscribers = new Set();

const emit = () => subscribers.forEach((fn) => fn(value));

// Dedicated single-aggregation endpoint; falls back to the list endpoint if
// the API in front of us is an older deploy without it.
let useLegacy = false;
const fetchUnreadTotal = async () => {
  if (!useLegacy) {
    try {
      const res = await axios.get("/api/conversations/unread-count");
      return Number(res.data?.data?.unreadTotal || 0);
    } catch (err) {
      const status = err?.response?.status;
      if (status !== 404 && status !== 400) throw err;
      useLegacy = true;
    }
  }
  const res = await axios.get("/api/conversations", { params: { limit: 1 } });
  return Number(res.data?.meta?.unreadTotal || 0);
};

export const refreshChatUnread = async ({ force = false } = {}) => {
  if (typeof document !== "undefined" && document.hidden && !force) return value;
  if (inflight) return inflight;
  if (!force && Date.now() - lastFetch < MIN_GAP_MS) return value;
  inflight = fetchUnreadTotal()
    .then((total) => {
      value = total;
      emit();
      return value;
    })
    .catch(() => value) // keep the stale badge, never break the UI
    .finally(() => {
      lastFetch = Date.now();
      inflight = null;
    });
  return inflight;
};

// A component that already fetched the conversation list (e.g. the header's
// messages dropdown) publishes the fresh total so no extra request is needed.
export const publishChatUnread = (n) => {
  value = Number(n || 0);
  lastFetch = Date.now();
  emit();
};

const onWake = () => {
  if (!document.hidden) refreshChatUnread();
};

const start = () => {
  refreshChatUnread({ force: true });
  timer = setInterval(() => refreshChatUnread(), POLL_MS);
  window.addEventListener("focus", onWake);
  document.addEventListener("visibilitychange", onWake);
};

const stop = () => {
  clearInterval(timer);
  timer = null;
  window.removeEventListener("focus", onWake);
  document.removeEventListener("visibilitychange", onWake);
};

export const useChatUnread = (enabled) => {
  const [count, setCount] = useState(enabled ? value : 0);
  useEffect(() => {
    if (!enabled) {
      setCount(0);
      return undefined;
    }
    setCount(value);
    subscribers.add(setCount);
    if (subscribers.size === 1) start();
    return () => {
      subscribers.delete(setCount);
      if (subscribers.size === 0) {
        stop();
        value = 0; // logout / unmount: don't flash an old count next login
      }
    };
  }, [enabled]);
  return count;
};
