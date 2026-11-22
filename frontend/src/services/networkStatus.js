/*
 * Network health, measured on the user's side only.
 *
 * Goal: when the page feels slow because of the user's own connection, say
 * so, and keep saying it until the connection is back to normal. Never
 * blame the user for our own server being slow or down.
 *
 * Cost: no polling while things are fine, no backend or DB calls ever.
 *   - Passive signals: browser online/offline events, the Network
 *     Information API (Chrome/Edge/Android), and the timing of API requests
 *     the app already makes (an axios interceptor, a few numbers in memory).
 *   - Confirmation probe: a tiny HEAD request for a static file on our own
 *     frontend host (CDN edge, cache-busted). It runs only when a passive
 *     signal says something is wrong, at most once per PROBE_GAP_MS, and
 *     while offline with backoff (and only when the tab is visible).
 *     If the API is slow or failing but the probe is fast, the problem is
 *     ours, not theirs, so nothing is shown.
 *
 * States: "good" | "slow" | "offline". The banner adds a short "back
 * online" note on recovery.
 */

export const SLOW_RTT_MS = 1500; // Network Information API rtt considered slow
export const SLOW_API_MS = 4000; // median API time that makes us suspicious
export const FAST_API_MS = 2000; // median API time that clears "slow"
export const SLOW_PROBE_MS = 1800; // probe slower than this confirms "slow"
export const PROBE_TIMEOUT_MS = 8000;
export const PROBE_GAP_MS = 30000; // min gap between "is it slow?" probes
export const MIN_SLOW_MS = 8000; // stay "slow" at least this long (no flicker)
export const SLOW_RECHECK_MS = 20000; // while "slow" and visible: is it fine again?
const SAMPLE_SIZE = 6;
const MIN_SAMPLES = 3;
const OFFLINE_BACKOFF_MS = [2000, 4000, 8000, 15000];

const median = (xs) => {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  // Even count: the lower middle value, so a couple of slow requests
  // never tip it over (err on the side of not blaming the user).
  return s.length % 2 ? s[m] : s[m - 1];
};

/**
 * Pure-ish core with injected environment, so it can be tested in Node.
 * env: { now, isOnline, isVisible, connection, probe, setTimeout, clearTimeout }
 *   probe() resolves { ok: boolean, ms: number }.
 */
export function createNetworkMonitor(env) {
  let state = "good";
  let slowSince = 0;
  let samples = [];
  let netErrors = 0;
  let lastProbeAt = -Infinity;
  let probing = false;
  let offlineTimer = null;
  let offlineAttempt = 0;
  let slowTimer = null;
  const listeners = new Set();

  const set = (next) => {
    if (next === state) return;
    const prev = state;
    state = next;
    if (next === "slow") slowSince = env.now();
    if (next !== "offline") {
      env.clearTimeout(offlineTimer);
      offlineTimer = null;
      offlineAttempt = 0;
    }
    env.clearTimeout(slowTimer);
    slowTimer = null;
    if (next === "slow") scheduleSlowRecheck();
    listeners.forEach((fn) => fn(next, prev));
  };

  // Only while the slow banner is up: re-test now and then, so it clears
  // even if the user isn't clicking anything.
  function scheduleSlowRecheck() {
    env.clearTimeout(slowTimer);
    slowTimer = env.setTimeout(async () => {
      if (state !== "slow") return;
      if (!env.isVisible()) return scheduleSlowRecheck();
      const conn = connectionVerdict();
      if (conn === "slow") return scheduleSlowRecheck();
      const r = await runProbe();
      if (state !== "slow") return;
      if (r?.ok && r.ms < SLOW_PROBE_MS / 2) {
        samples = [];
        set("good");
      } else if (r && !r.ok && !env.isOnline()) {
        set("offline");
        scheduleOfflineCheck();
      } else {
        scheduleSlowRecheck();
      }
    }, SLOW_RECHECK_MS);
  }

  // What the browser itself says about the link (when it says anything).
  const connectionVerdict = () => {
    const c = env.connection?.();
    if (!c) return null;
    if (c.effectiveType === "slow-2g" || c.effectiveType === "2g") return "slow";
    if (typeof c.rtt === "number" && c.rtt >= SLOW_RTT_MS) return "slow";
    if (typeof c.downlink === "number" && c.downlink > 0 && c.downlink < 0.15) return "slow";
    if (c.effectiveType === "4g" && typeof c.rtt === "number" && c.rtt > 0 && c.rtt < 400) return "fast";
    return null;
  };

  const runProbe = async () => {
    if (probing) return null;
    probing = true;
    lastProbeAt = env.now();
    try {
      return await env.probe();
    } catch {
      return { ok: false, ms: PROBE_TIMEOUT_MS };
    } finally {
      probing = false;
    }
  };

  const scheduleOfflineCheck = () => {
    env.clearTimeout(offlineTimer);
    const wait = OFFLINE_BACKOFF_MS[Math.min(offlineAttempt, OFFLINE_BACKOFF_MS.length - 1)];
    offlineAttempt += 1;
    offlineTimer = env.setTimeout(checkWhileOffline, wait);
  };

  async function checkWhileOffline() {
    if (state !== "offline") return;
    if (!env.isVisible()) return scheduleOfflineCheck(); // keep backing off, no request
    if (!env.isOnline()) return scheduleOfflineCheck(); // browser still says offline
    const r = await runProbe();
    if (state !== "offline") return;
    if (r?.ok) {
      netErrors = 0;
      samples = [];
      set(r.ms >= SLOW_PROBE_MS ? "slow" : "good");
    } else {
      scheduleOfflineCheck();
    }
  }

  const goOffline = () => {
    if (state === "offline") return;
    set("offline");
    scheduleOfflineCheck();
  };

  // Passive slow check; a probe confirms before we blame the network.
  const evaluateSlow = async () => {
    if (state === "offline") return;
    const conn = connectionVerdict();
    const med = samples.length >= MIN_SAMPLES ? median(samples) : null;

    if (state === "slow") {
      if (env.now() - slowSince < MIN_SLOW_MS) return;
      const recovered = conn === "fast" || (conn !== "slow" && med !== null && med <= FAST_API_MS);
      if (recovered) set("good");
      return;
    }

    if (conn === "slow") {
      set("slow");
      return;
    }
    if (conn === "fast") return; // browser says the link is fine: a slow API is on us
    if (med === null || med < SLOW_API_MS) return;
    if (env.now() - lastProbeAt < PROBE_GAP_MS) return;
    const r = await runProbe();
    if (state !== "good") return;
    if (!r?.ok) {
      if (!env.isOnline()) goOffline();
      return;
    }
    if (r.ms >= SLOW_PROBE_MS) set("slow");
  };

  return {
    getState: () => state,
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },

    // Browser events
    handleOffline: () => goOffline(),
    handleOnline: () => {
      if (state === "offline") {
        offlineAttempt = 0;
        checkWhileOffline();
      }
    },
    handleConnectionChange: () => evaluateSlow(),
    handleVisible: () => {
      if (state === "offline") {
        offlineAttempt = 0;
        checkWhileOffline();
      }
    },

    // From the axios interceptor. kind: "ok" | "timeout" | "network"
    recordRequest({ kind, ms = 0 }) {
      if (kind === "ok") {
        netErrors = 0;
        if (state === "offline") {
          set("good"); // a real response came back: we're connected
          samples = [];
        }
        samples = [...samples.slice(-(SAMPLE_SIZE - 1)), ms];
        evaluateSlow();
        return;
      }
      if (kind === "timeout") {
        samples = [...samples.slice(-(SAMPLE_SIZE - 1)), Math.max(ms, SLOW_API_MS * 2)];
        evaluateSlow();
        return;
      }
      // kind === "network": no response at all. Offline, or our API down?
      netErrors += 1;
      if (!env.isOnline()) {
        goOffline();
        return;
      }
      if (netErrors < 2 || state === "offline") return;
      if (env.now() - lastProbeAt < 3000) return;
      runProbe().then((r) => {
        if (r && !r.ok) goOffline(); // the CDN is unreachable too: it's the connection
        // probe fine -> our API is the problem, don't blame the user
      });
    },

    retryNow: () => {
      if (state === "offline") {
        offlineAttempt = 0;
        return checkWhileOffline();
      }
      return Promise.resolve();
    },

    dispose() {
      env.clearTimeout(offlineTimer);
      env.clearTimeout(slowTimer);
      listeners.clear();
    },
  };
}

// ── Browser wiring ──────────────────────────────────────────────────────

const PROBE_PATH = "/fav.svg"; // ~1 KB, served by the frontend CDN, never the API

const browserProbe = async () => {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), PROBE_TIMEOUT_MS);
  const start = performance.now();
  try {
    const res = await fetch(`${PROBE_PATH}?nc=${Date.now()}`, { method: "HEAD", cache: "no-store", signal: ctrl.signal });
    return { ok: res.ok || res.status === 304, ms: performance.now() - start };
  } catch {
    return { ok: false, ms: performance.now() - start };
  } finally {
    clearTimeout(t);
  }
};

let monitor = null;

// Requests that say nothing about link latency: uploads, media, big blobs.
const isSampleable = (config) => {
  if (!config) return false;
  if (typeof FormData !== "undefined" && config.data instanceof FormData) return false;
  if (config.onUploadProgress || config.onDownloadProgress) return false;
  if (config.responseType && config.responseType !== "json") return false;
  if (/upload|voice|imagekit|handoff|assistant/i.test(String(config.url || ""))) return false;
  return true;
};

export function startNetworkMonitor(axiosInstance) {
  if (monitor || typeof window === "undefined") return monitor;
  const conn = () => navigator.connection || navigator.mozConnection || navigator.webkitConnection;

  monitor = createNetworkMonitor({
    now: () => Date.now(),
    isOnline: () => navigator.onLine !== false,
    isVisible: () => document.visibilityState !== "hidden",
    connection: () => conn() || null,
    probe: browserProbe,
    setTimeout: (fn, ms) => window.setTimeout(fn, ms),
    clearTimeout: (id) => window.clearTimeout(id),
  });

  window.addEventListener("offline", monitor.handleOffline);
  window.addEventListener("online", monitor.handleOnline);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") monitor.handleVisible();
  });
  conn()?.addEventListener?.("change", monitor.handleConnectionChange);
  if (navigator.onLine === false) monitor.handleOffline();

  if (axiosInstance) {
    // Stamp start time only; a background-tab request is throttled by the
    // browser and isn't a fair latency sample.
    axiosInstance.interceptors.request.use((config) => {
      if (document.visibilityState !== "hidden" && isSampleable(config)) config._netStart = performance.now();
      return config;
    });
    axiosInstance.interceptors.response.use(
      (response) => {
        const start = response.config?._netStart;
        if (start != null && document.visibilityState !== "hidden") {
          monitor.recordRequest({ kind: "ok", ms: performance.now() - start });
        } else if (monitor.getState() === "offline") {
          monitor.recordRequest({ kind: "ok", ms: 0 });
        }
        return response;
      },
      (error) => {
        if (error?.response) {
          // The server answered (even with 4xx/5xx): the connection works.
          if (monitor.getState() === "offline") monitor.recordRequest({ kind: "ok", ms: 0 });
        } else if (error?.code === "ERR_CANCELED") {
          // aborted by the app, says nothing
        } else if (error?.code === "ECONNABORTED" || error?.code === "ETIMEDOUT") {
          if (error.config?._netStart != null) monitor.recordRequest({ kind: "timeout", ms: performance.now() - error.config._netStart });
        } else {
          monitor.recordRequest({ kind: "network" });
        }
        return Promise.reject(error);
      },
    );
  }
  return monitor;
}

export const getNetworkMonitor = () => monitor;
