// Load generator for loadtest/server.mjs. For every feature:
//   light  : 4 concurrent users  → realistic latency (p50/p95/p99)
//   stress : 64 concurrent users → max throughput, latency under pressure
// plus, from the server: CPU ms per request, Mongo ops per request,
// event-loop delay and memory. Then projects onto Render Free + Atlas M0.
//
//   node loadtest/run.mjs                 (all scenarios)
//   node loadtest/run.mjs feed search     (only matching scenarios)
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const F = JSON.parse(fs.readFileSync(path.join(HERE, ".fixtures.json"), "utf8"));
const HOST = "127.0.0.1";
const LIGHT = { concurrency: 4, seconds: 6 };
const STRESS = { concurrency: 64, seconds: 10 };

const agent = new http.Agent({ keepAlive: true, maxSockets: 256 });
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const ip = () => `10.${(Math.random() * 255) | 0}.${(Math.random() * 255) | 0}.${((Math.random() * 253) | 0) + 1}`;
let sessionCursor = 0;
const nextSession = () => F.sessions[sessionCursor++ % F.sessions.length];
const withConversations = F.sessions.filter((s) => s.conversations.length);
let convCursor = 0;
const nextChatter = () => withConversations[convCursor++ % withConversations.length];

const request = ({ method = "GET", path: p, headers = {}, body }) =>
  new Promise((resolve) => {
    const start = process.hrtime.bigint();
    const data = body ? JSON.stringify(body) : null;
    const req = http.request(
      {
        host: HOST, port: F.port, path: p, method, agent,
        headers: {
          "x-forwarded-for": ip(), // a different student each request (trust proxy = 1)
          "x-client-type": "mobile",
          ...(data ? { "content-type": "application/json", "content-length": Buffer.byteLength(data) } : {}),
          ...headers,
        },
      },
      (res) => {
        let bytes = 0;
        const chunks = [];
        res.on("data", (c) => {
          bytes += c.length;
          chunks.push(c);
        });
        res.on("end", () =>
          resolve({ status: res.statusCode, ms: Number(process.hrtime.bigint() - start) / 1e6, bytes, body: Buffer.concat(chunks) }),
        );
      },
    );
    req.on("error", () => resolve({ status: 0, ms: Number(process.hrtime.bigint() - start) / 1e6, bytes: 0 }));
    if (data) req.write(data);
    req.end();
  });

const bearer = (s) => ({ authorization: `Bearer ${s.access}` });

// ---- Scenarios (nothing here reaches an outside service) ----
const S = [
  { key: "campuses", name: "Campus list", group: "Browse", make: () => ({ path: "/api/campuses" }) },
  { key: "feed", name: "Home feed (page of 8)", group: "Browse", make: () => ({ path: `/api/product?page=${1 + ((Math.random() * 5) | 0)}&limit=8&campus_slug=${F.campusSlug}` }) },
  { key: "trending", name: "Trending rail", group: "Browse", make: () => ({ path: `/api/product/trending?campus_slug=${F.campusSlug}` }) },
  { key: "boosted", name: "Boosted / deals rail", group: "Browse", make: () => ({ path: `/api/product/boosted?campus_slug=${F.campusSlug}` }) },
  { key: "category", name: "Category browse", group: "Browse", make: () => ({ path: `/api/product?category=${pick(F.categories)}&page=${1 + ((Math.random() * 3) | 0)}&limit=12&campus_slug=${F.campusSlug}` }) },
  { key: "detail", name: "Product page", group: "Browse", make: () => ({ path: `/api/product/${pick(F.productIds)}?campus_slug=${F.campusSlug}` }) },
  { key: "view", name: "Record product view", group: "Browse", make: () => ({ method: "POST", path: `/api/product/${pick(F.productIds)}/view?campus_slug=${F.campusSlug}` }) },
  { key: "search", name: "Search", group: "Browse", make: () => ({ path: `/api/product/search?q=${encodeURIComponent(pick(F.searchTerms))}&campus_slug=${F.campusSlug}` }) },
  { key: "suggest", name: "Search suggestions (typing)", group: "Browse", make: () => ({ path: `/api/product/search-suggestions?q=${encodeURIComponent(pick(F.searchTerms).slice(0, 3))}&campus_slug=${F.campusSlug}` }) },

  { key: "login", name: "Login (password)", group: "Auth", make: () => ({ method: "POST", path: "/api/auth/login", body: { email: nextSession().email, password: F.password } }) },
  {
    key: "refresh", name: "Token refresh", group: "Auth",
    make: () => {
      const s = nextSession();
      return { method: "POST", path: "/api/auth/refresh-token", body: { refreshToken: s.refresh }, onDone: (r) => {
        try {
          const d = JSON.parse(r.body).data;
          if (d?.refreshToken) s.refresh = d.refreshToken;
          if (d?.accessToken) s.access = d.accessToken;
        } catch { /* ignore */ }
      } };
    },
  },
  { key: "profile", name: "Load own profile", group: "Account", make: () => ({ path: "/api/user/userProfile", headers: bearer(nextSession()) }) },
  { key: "insights", name: "Profile insights", group: "Account", make: () => ({ path: "/api/user/insights", headers: bearer(nextSession()) }) },
  { key: "mylistings", name: "My listings", group: "Account", make: () => ({ path: "/api/product/user/my-products", headers: bearer(nextSession()) }) },
  { key: "notifications", name: "Notifications feed", group: "Account", make: () => ({ path: "/api/notifications", headers: bearer(nextSession()) }) },
  { key: "wishlist", name: "Wishlist page", group: "Account", make: () => ({ path: "/api/wishlist?page=1&limit=50", headers: bearer(nextSession()) }) },
  { key: "wishtoggle", name: "Add/remove wishlist", group: "Account", make: () => ({ method: "POST", path: "/api/wishlist/toggle", headers: bearer(nextSession()), body: { productId: pick(F.productIds) } }) },

  { key: "unread", name: "Unread badge (polled every 45s)", group: "Chat", make: () => ({ path: "/api/conversations/unread-count", headers: bearer(nextSession()) }) },
  { key: "chatlist", name: "Chat list", group: "Chat", make: () => ({ path: "/api/conversations?role=all&search=&limit=50", headers: bearer(nextChatter()) }) },
  { key: "thread", name: "Open a chat (50 messages)", group: "Chat", make: () => { const s = nextChatter(); return { path: `/api/conversations/${pick(s.conversations)}/messages?limit=50`, headers: bearer(s) }; } },
  { key: "send", name: "Send a text message", group: "Chat", make: () => { const s = nextChatter(); return { method: "POST", path: `/api/conversations/${pick(s.conversations)}/messages`, headers: bearer(s), body: { text: "Is this still available? I can pick it up today." } }; } },
  { key: "read", name: "Mark chat read", group: "Chat", make: () => { const s = nextChatter(); return { method: "PATCH", path: `/api/conversations/${pick(s.conversations)}/read`, headers: bearer(s), body: { receipt: true } }; } },
  { key: "deal", name: "Deal card", group: "Chat", make: () => { const s = nextChatter(); return { path: `/api/conversations/${pick(s.conversations)}/deal`, headers: bearer(s) }; } },
];

// Realistic mix of what an active student does (weights sum to 100).
const MIX = { feed: 18, detail: 14, view: 8, search: 6, suggest: 6, trending: 5, boosted: 4, category: 5, campuses: 2, unread: 10, notifications: 4, profile: 4, chatlist: 4, thread: 4, send: 3, read: 2, wishlist: 1 };

const stats = async () => JSON.parse((await request({ path: "/__stats" })).body.toString());
const reset = () => request({ path: "/__reset" });

const runPhase = async (sc, { concurrency, seconds }) => {
  const lat = [];
  const codes = {};
  let bytes = 0;
  const until = Date.now() + seconds * 1000;
  const worker = async () => {
    while (Date.now() < until) {
      const spec = sc.make();
      const r = await request(spec);
      spec.onDone?.(r);
      lat.push(r.ms);
      codes[r.status] = (codes[r.status] || 0) + 1;
      bytes += r.bytes;
    }
  };
  await reset();
  const before = await stats();
  const t = Date.now();
  await Promise.all(Array.from({ length: concurrency }, worker));
  const elapsed = (Date.now() - t) / 1000;
  const after = await stats();
  lat.sort((a, b) => a - b);
  const q = (p) => lat[Math.min(lat.length - 1, Math.floor(p * lat.length))] || 0;
  const n = lat.length;
  const ok = Object.entries(codes).filter(([c]) => c >= 200 && c < 400).reduce((a, [, v]) => a + v, 0);
  return {
    n, rps: n / elapsed, okRatio: ok / n, codes,
    p50: q(0.5), p95: q(0.95), p99: q(0.99), max: lat[n - 1] || 0,
    cpuMsPerReq: (after.cpuMicros - before.cpuMicros) / 1000 / n,
    opsPerReq: (after.ops - before.ops) / n,
    kbPerReq: bytes / n / 1024,
    loopP99Ms: after.loopP99Ms, rssMB: after.rssMB, heapMB: after.heapMB,
  };
};

const filters = process.argv.slice(2);
const chosen = filters.length ? S.filter((s) => filters.some((f) => s.key.includes(f))) : S;
const results = [];
for (const sc of chosen) {
  await runPhase(sc, { concurrency: 2, seconds: 1 }); // warm caches / JIT
  const light = await runPhase(sc, LIGHT);
  const stress = await runPhase(sc, STRESS);
  results.push({ key: sc.key, name: sc.name, group: sc.group, light, stress });
  const r = stress;
  console.log(
    `${sc.name.padEnd(34)} light p50 ${light.p50.toFixed(1).padStart(6)}ms p95 ${light.p95.toFixed(1).padStart(6)}ms | stress ${r.rps.toFixed(0).padStart(5)} rps p95 ${r.p95.toFixed(0).padStart(5)}ms ok ${(r.okRatio * 100).toFixed(0)}% | cpu ${r.cpuMsPerReq.toFixed(2)}ms db ${r.opsPerReq.toFixed(2)} ops ${r.kbPerReq.toFixed(1)}KB`,
  );
}

fs.writeFileSync(path.join(HERE, "results.json"), JSON.stringify({ at: new Date().toISOString(), size: F.size, mix: MIX, results }, null, 2));
console.log(`\nSaved loadtest/results.json`);
agent.destroy();
