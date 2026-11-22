// Run: node tests/networkStatus.test.mjs
// Unit tests for the connection-health monitor (src/services/networkStatus.js)
// with a fake clock, fake timers, a fake browser and a scripted probe.
import assert from "node:assert/strict";
import {
  createNetworkMonitor,
  MIN_SLOW_MS,
  PROBE_GAP_MS,
  SLOW_RECHECK_MS,
} from "../src/services/networkStatus.js";

let passed = 0;
let failed = 0;
const test = async (name, fn) => {
  try {
    await fn();
    passed += 1;
    console.log("  PASS", name);
  } catch (err) {
    failed += 1;
    console.log("  FAIL", name, "\n       ", err?.message);
  }
};

// Fake environment: manual clock + timer queue + scripted probe results.
function makeEnv({ online = true, visible = true, connection = null, probeResults = [] } = {}) {
  let t = 0;
  let id = 0;
  const timers = new Map();
  const env = {
    probes: 0,
    online,
    visible,
    conn: connection,
    probeQueue: [...probeResults],
    defaultProbe: { ok: true, ms: 120 },
    now: () => t,
    isOnline: () => env.online,
    isVisible: () => env.visible,
    connection: () => env.conn,
    probe: async () => {
      env.probes += 1;
      return env.probeQueue.length ? env.probeQueue.shift() : env.defaultProbe;
    },
    setTimeout: (fn, ms) => {
      id += 1;
      timers.set(id, { fn, at: t + ms });
      return id;
    },
    clearTimeout: (i) => timers.delete(i),
    // Advance the clock, firing due timers in order.
    async advance(ms) {
      const end = t + ms;
      for (;;) {
        const due = [...timers.entries()].filter(([, v]) => v.at <= end).sort((a, b) => a[1].at - b[1].at)[0];
        if (!due) break;
        timers.delete(due[0]);
        t = due[1].at;
        await due[1].fn();
        await flush();
      }
      t = end;
    },
    pendingTimers: () => timers.size,
  };
  return env;
}
const flush = () => new Promise((r) => setImmediate(r));

console.log("\nOffline");
await test("browser 'offline' event shows offline immediately, with no probe", async () => {
  const env = makeEnv();
  const m = createNetworkMonitor(env);
  env.online = false;
  m.handleOffline();
  assert.equal(m.getState(), "offline");
  assert.equal(env.probes, 0);
});
await test("stays offline while the browser still says offline (no requests sent)", async () => {
  const env = makeEnv();
  const m = createNetworkMonitor(env);
  env.online = false;
  m.handleOffline();
  await env.advance(60_000);
  assert.equal(m.getState(), "offline");
  assert.equal(env.probes, 0, "never probes while navigator.onLine is false");
});
await test("'online' event + reachable CDN -> good", async () => {
  const env = makeEnv();
  const m = createNetworkMonitor(env);
  const seen = [];
  m.subscribe((next, prev) => seen.push(`${prev}->${next}`));
  env.online = false;
  m.handleOffline();
  env.online = true;
  m.handleOnline();
  await flush();
  assert.equal(m.getState(), "good");
  assert.deepEqual(seen, ["good->offline", "offline->good"]);
});
await test("Wi-Fi up but no internet: stays offline, retries with backoff, recovers", async () => {
  const env = makeEnv({ probeResults: [{ ok: false, ms: 8000 }, { ok: false, ms: 8000 }, { ok: false, ms: 8000 }] });
  const m = createNetworkMonitor(env);
  m.handleOffline();
  await env.advance(2000); // 1st check (fails)
  assert.equal(m.getState(), "offline");
  await env.advance(4000); // 2nd (fails)
  await env.advance(8000); // 3rd (fails)
  assert.equal(env.probes, 3);
  await env.advance(15000); // 4th: default probe is fine
  assert.equal(m.getState(), "good");
  assert.equal(env.probes, 4);
  assert.equal(env.pendingTimers(), 0, "no timers left once recovered");
});
await test("hidden tab: no probes while offline, checks again when visible", async () => {
  const env = makeEnv({ visible: false });
  const m = createNetworkMonitor(env);
  m.handleOffline();
  await env.advance(120_000);
  assert.equal(env.probes, 0);
  env.visible = true;
  m.handleVisible();
  await flush();
  assert.equal(m.getState(), "good");
  assert.equal(env.probes, 1);
});
await test("a real API response while offline means we're connected", async () => {
  const env = makeEnv();
  const m = createNetworkMonitor(env);
  m.handleOffline();
  m.recordRequest({ kind: "ok", ms: 300 });
  assert.equal(m.getState(), "good");
});
await test("API unreachable but CDN fine (our server is down): user is NOT told they're offline", async () => {
  const env = makeEnv(); // default probe ok
  const m = createNetworkMonitor(env);
  for (let i = 0; i < 5; i += 1) {
    m.recordRequest({ kind: "network" });
    await env.advance(4000);
  }
  await flush();
  assert.equal(m.getState(), "good");
});
await test("API and CDN both unreachable: offline", async () => {
  const env = makeEnv({ probeResults: [{ ok: false, ms: 8000 }] });
  const m = createNetworkMonitor(env);
  m.recordRequest({ kind: "network" });
  m.recordRequest({ kind: "network" });
  await flush();
  assert.equal(m.getState(), "offline");
});
await test("a single failed request never shows anything", async () => {
  const env = makeEnv({ probeResults: [{ ok: false, ms: 8000 }] });
  const m = createNetworkMonitor(env);
  m.recordRequest({ kind: "network" });
  await flush();
  assert.equal(m.getState(), "good");
  assert.equal(env.probes, 0);
});

console.log("\nSlow");
await test("browser reports 2G: slow immediately, no probe", async () => {
  const env = makeEnv({ connection: { effectiveType: "2g", rtt: 1800, downlink: 0.1 } });
  const m = createNetworkMonitor(env);
  m.handleConnectionChange();
  await flush();
  assert.equal(m.getState(), "slow");
  assert.equal(env.probes, 0);
});
await test("slow API + slow CDN probe: slow", async () => {
  const env = makeEnv({ probeResults: [{ ok: true, ms: 2600 }] });
  const m = createNetworkMonitor(env);
  for (const ms of [4500, 5200, 6100]) m.recordRequest({ kind: "ok", ms });
  await flush();
  assert.equal(m.getState(), "slow");
  assert.equal(env.probes, 1);
});
await test("slow API + fast CDN probe (our server is slow): stays good", async () => {
  const env = makeEnv({ probeResults: [{ ok: true, ms: 90 }] });
  const m = createNetworkMonitor(env);
  for (const ms of [4500, 5200, 6100, 7000]) m.recordRequest({ kind: "ok", ms });
  await flush();
  assert.equal(m.getState(), "good");
});
await test("browser says fast 4G: slow API is never blamed on the user, no probe", async () => {
  const env = makeEnv({ connection: { effectiveType: "4g", rtt: 80, downlink: 12 } });
  const m = createNetworkMonitor(env);
  for (let i = 0; i < 6; i += 1) m.recordRequest({ kind: "ok", ms: 9000 });
  await flush();
  assert.equal(m.getState(), "good");
  assert.equal(env.probes, 0);
});
await test("a few slow requests among fast ones don't trigger (median)", async () => {
  const env = makeEnv({ probeResults: [{ ok: true, ms: 3000 }] });
  const m = createNetworkMonitor(env);
  for (const ms of [200, 9000, 180, 9500, 220, 260]) m.recordRequest({ kind: "ok", ms });
  await flush();
  assert.equal(m.getState(), "good");
  assert.equal(env.probes, 0);
});
await test("probes are rate-limited: at most one per gap while suspicious", async () => {
  const env = makeEnv({ defaultProbe: undefined });
  env.defaultProbe = { ok: true, ms: 100 }; // fast: our server, stays good
  const m = createNetworkMonitor(env);
  for (let i = 0; i < 50; i += 1) {
    m.recordRequest({ kind: "ok", ms: 6000 });
    await flush();
  }
  assert.equal(env.probes, 1);
  await env.advance(PROBE_GAP_MS);
  m.recordRequest({ kind: "ok", ms: 6000 });
  await flush();
  assert.equal(env.probes, 2);
});
await test("slow clears once requests are fast again (after the minimum show time)", async () => {
  const env = makeEnv({ probeResults: [{ ok: true, ms: 2600 }] });
  const m = createNetworkMonitor(env);
  for (const ms of [5000, 5000, 5000]) m.recordRequest({ kind: "ok", ms });
  await flush();
  assert.equal(m.getState(), "slow");
  for (let i = 0; i < 6; i += 1) m.recordRequest({ kind: "ok", ms: 300 });
  assert.equal(m.getState(), "slow", "no flicker before MIN_SLOW_MS");
  env.probeQueue.push({ ok: true, ms: 2600 }); // the background re-check still sees it slow
  await env.advance(MIN_SLOW_MS);
  m.recordRequest({ kind: "ok", ms: 300 });
  await flush();
  assert.equal(m.getState(), "good");
});
await test("slow clears by itself when idle (background re-check while visible)", async () => {
  const env = makeEnv({ probeResults: [{ ok: true, ms: 2600 }] });
  const m = createNetworkMonitor(env);
  for (const ms of [5000, 5000, 5000]) m.recordRequest({ kind: "ok", ms });
  await flush();
  assert.equal(m.getState(), "slow");
  await env.advance(SLOW_RECHECK_MS); // default probe 120ms
  assert.equal(m.getState(), "good");
  assert.equal(env.pendingTimers(), 0);
});
await test("timeouts count as slow samples", async () => {
  const env = makeEnv({ probeResults: [{ ok: true, ms: 3000 }] });
  const m = createNetworkMonitor(env);
  for (let i = 0; i < 3; i += 1) m.recordRequest({ kind: "timeout", ms: 30000 });
  await flush();
  assert.equal(m.getState(), "slow");
});
await test("going offline from slow, then back: good", async () => {
  const env = makeEnv({ connection: { effectiveType: "2g", rtt: 2000 } });
  const m = createNetworkMonitor(env);
  m.handleConnectionChange();
  env.online = false;
  m.handleOffline();
  assert.equal(m.getState(), "offline");
  env.online = true;
  env.conn = { effectiveType: "4g", rtt: 60, downlink: 20 };
  m.handleOnline();
  await flush();
  assert.equal(m.getState(), "good");
});

console.log("\nCost (no lag, no extra traffic)");
await test("healthy session: 10,000 normal requests -> zero probes, zero timers", async () => {
  const env = makeEnv();
  const m = createNetworkMonitor(env);
  for (let i = 0; i < 10_000; i += 1) m.recordRequest({ kind: "ok", ms: 150 + (i % 200) });
  await flush();
  assert.equal(env.probes, 0);
  assert.equal(env.pendingTimers(), 0);
  assert.equal(m.getState(), "good");
});
await test("per-request overhead is tiny (100k samples well under 1 s)", async () => {
  const env = makeEnv();
  const m = createNetworkMonitor(env);
  const t0 = performance.now();
  for (let i = 0; i < 100_000; i += 1) m.recordRequest({ kind: "ok", ms: 200 });
  const per = (performance.now() - t0) / 100_000;
  assert.ok(per < 0.01, `${(per * 1000).toFixed(2)} µs per request`);
  console.log(`        ~${(per * 1000).toFixed(2)} µs per request`);
});
await test("state changes notify subscribers once, never on repeats", async () => {
  const env = makeEnv();
  const m = createNetworkMonitor(env);
  let calls = 0;
  m.subscribe(() => (calls += 1));
  m.handleOffline();
  m.handleOffline();
  m.recordRequest({ kind: "network" });
  assert.equal(calls, 1);
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
