# Unideals documentation

Everything beyond the top-level [README](../README.md) lives here. Keep each doc up to date when you change the behaviour it describes.

## Architecture: how the system works today

| Doc | What it covers |
|---|---|
| [architecture/ai-assistant.md](architecture/ai-assistant.md) | The "Unideals AI" chatbot: routing pipeline, Gemini/Groq layer, knowledge base, image & voice, history, limits, config, testing |
| [architecture/notifications.md](architecture/notifications.md) | In-app notifications (MongoDB + Socket.IO), event triggers, API, analytics, FCM system push, deploy migration |
| [architecture/performance-optimisations.md](architecture/performance-optimisations.md) | Caching and payload work that cut DB calls and made pages feel instant, plus next steps for higher scale |
| [architecture/seo.md](architecture/seo.md) | SEO and AI-crawler setup: per-page tags, server-rendered listing pages, sitemaps, robots.txt, llms.txt, structured data, social cards |
| [architecture/ai-assistant-interview-prep.pdf](architecture/ai-assistant-interview-prep.pdf) | Interview-prep notes on the assistant's design |

## Feature specs: what we build and why

| Doc | What it covers |
|---|---|
| [features/subscriptions-and-monetization.md](features/subscriptions-and-monetization.md) | **Source of truth** for plans (Free / Pro / Pro+), Founder vs semester pricing, boosts and add-ons. Mirrored by `backend/src/config/subscriptionPlans.js` and the pricing page |
| [features/gamification-badges-and-levels.md](features/gamification-badges-and-levels.md) | XP, rank tiers, badge catalogue, data models and endpoints |
| [features/girls-corner.md](features/girls-corner.md) | Girls Corner 🌸: women-only listing space, gender confirmation, privacy rules, edge cases, rollout |
| [features/rent-and-borrow.md](features/rent-and-borrow.md) | Rent & Borrow: lend, share or request small things inside a hostel block; offline payments; behind `RENT_ENABLED`; how to remove it |

## Operations

| Doc | What it covers |
|---|---|
| [operations/deployment-and-launch-checklist.md](operations/deployment-and-launch-checklist.md) | Hosting setup, environment, third-party dashboards, one-off scripts and the go-live checklist |

## Changelog: fix and audit logs

| Doc | Period |
|---|---|
| [changelog/2026-09-security-hardening-and-bug-fixes.md](changelog/2026-09-security-hardening-and-bug-fixes.md) | 2026-09-19 full-stack hardening + 2026-10-02 update (Razorpay integration, auth, CORS, sanitisation) |
| [changelog/2026-11-full-audit-and-fixes.md](changelog/2026-11-full-audit-and-fixes.md) | 2026-11-08 second full audit (authorization gaps, data leaks, races) and the UI/payment updates that followed |
| [changelog/2026-11-db-and-jobs-optimisation.md](changelog/2026-11-db-and-jobs-optimisation.md) | 2026-11-16 database, query, index and background-job optimisation for multi-instance scale, plus the index-sync deploy steps |

New fix logs go in `changelog/` as `YYYY-MM-<short-topic>.md`.
