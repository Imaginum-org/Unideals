// Realtime capacity: opens N authenticated Socket.IO connections (every
// online user holds one) against loadtest/server.mjs and measures server
// memory per connection and connect latency, in steps.
//
//   node loadtest/sockets.mjs
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const F = JSON.parse(fs.readFileSync(path.join(HERE, ".fixtures.json"), "utf8"));
// socket.io-client lives in the frontend's dependencies.
const require = createRequire(path.join(HERE, "../../frontend/package.json"));
const { io } = require("socket.io-client");

const STEPS = [250, 500, 1000, 2000];
const url = `http://127.0.0.1:${F.port}`;
const stats = () =>
  new Promise((resolve) =>
    http.get({ host: "127.0.0.1", port: F.port, path: "/__stats" }, (r) => {
      let b = "";
      r.on("data", (c) => (b += c));
      r.on("end", () => resolve(JSON.parse(b)));
    }),
  );
// Force a GC on the server (it runs with --expose-gc) so RSS deltas are real.
const gc = () =>
  new Promise((resolve) =>
    http.get({ host: "127.0.0.1", port: F.port, path: "/__gc" }, (r) => {
      r.resume();
      r.on("end", () => setTimeout(resolve, 800));
    }),
  );

const sockets = [];
await gc();
const baseline = await stats();
const rows = [];
for (const target of STEPS) {
  const connectTimes = [];
  let failed = 0;
  const batch = [];
  while (sockets.length + batch.length < target) {
    const s = F.sessions[(sockets.length + batch.length) % F.sessions.length];
    batch.push(
      new Promise((resolve) => {
        const t = Date.now();
        const sock = io(url, { transports: ["websocket"], auth: { token: s.access }, reconnection: false, timeout: 15000 });
        sock.on("connect", () => {
          connectTimes.push(Date.now() - t);
          sockets.push(sock);
          resolve();
        });
        sock.on("connect_error", () => {
          failed += 1;
          resolve();
        });
      }),
    );
    if (batch.length >= 100) await Promise.all(batch.splice(0));
  }
  await Promise.all(batch);
  await gc();
  const st = await stats();
  connectTimes.sort((a, b) => a - b);
  const row = {
    connections: sockets.length,
    failed,
    rssMB: +st.rssMB.toFixed(1),
    addedMB: +(st.rssMB - baseline.rssMB).toFixed(1),
    kbPerConnection: +(((st.rssMB - baseline.rssMB) * 1024) / sockets.length).toFixed(1),
    connectP95Ms: connectTimes[Math.floor(connectTimes.length * 0.95)] || 0,
  };
  rows.push(row);
  console.log(`${String(row.connections).padStart(5)} connections  rss ${row.rssMB}MB (+${row.addedMB}MB, ~${row.kbPerConnection}KB each)  connect p95 ${row.connectP95Ms}ms  failed ${failed}`);
}
fs.writeFileSync(path.join(HERE, "sockets.json"), JSON.stringify({ baselineRssMB: baseline.rssMB, rows }, null, 2));
sockets.forEach((s) => s.close());
process.exit(0);
