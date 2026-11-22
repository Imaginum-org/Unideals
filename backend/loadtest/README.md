# Load testing

Runs the **real backend** (production mode) against a **local** MongoDB seeded
with realistic data. It never touches Atlas, Render, ImageKit, Cloudinary,
Gemini/Groq, Resend, Firebase or Razorpay: their keys are blanked inside the
test server, and no scenario calls an upload, AI, email, push or payment path.

```bash
# terminal 1: seed + start the test server (port 5055)
node --expose-gc loadtest/server.mjs

# terminal 2: every feature (≈7 min), or only some: node loadtest/run.mjs feed chat
node loadtest/run.mjs
node loadtest/sockets.mjs        # realtime: memory per live connection
```

Each feature runs at 4 concurrent users (realistic latency) and 64
(saturation). Per request it records latency p50/p95/p99, throughput, error
rate, server CPU ms, MongoDB operations and response size. Results go to
`loadtest/results.json` and `loadtest/sockets.json` (git-ignored).

**Projecting onto production.** Render Free gives 0.1 CPU (≈100 ms of CPU per
second), so `max req/s ≈ 100 / CPU-ms-per-request`. Atlas M0 has a published
throughput cap (≈100 ops/s), so `max req/s ≈ 100 / DB-ops-per-request`. The
lower of the two is the feature's ceiling. Laptop cores and Render vCPUs differ,
so treat projections as ±30–50%.

Seed size: `LT_USERS`, `LT_PRODUCTS`, `LT_CONVERSATIONS` env vars.
