# Contributing to Unideals

## Setup

Requires Node.js 22 (`nvm use` reads `.nvmrc`) and a MongoDB instance. See **Getting Started** in the [README](../README.md).

```bash
npm run install:all          # installs backend/ and frontend/
cp backend/.env.sample backend/.env
cp frontend/.env.sample frontend/.env
npm run dev:backend          # http://localhost:5000
npm run dev:frontend         # http://localhost:5173
```

## Before you open a pull request

```bash
npm run check                # backend: every file parses
npm test                     # backend: all integration suites (in-memory MongoDB, no .env needed)
npm run lint                 # frontend: ESLint
npm run build                # frontend: production build
```

CI runs the same steps on every push and pull request.

## Conventions

- **Branches:** branch off `main`, e.g. `feat/girls-corner-filters`, `fix/razorpay-webhook`.
- **Commits:** short imperative subject (`Fix refund webhook revoking boosts`), details in the body.
- **Backend:** ESM, Express 5. Business logic goes in `services/`, request handling in `controllers/`, request shapes in `validations/` (Zod). Never trust amounts, roles or IDs from the client.
- **Frontend:** feature folders under `src/features/<feature>/`; shared UI under `src/components/`.
- **Config:** a new environment variable must be added to the matching `.env.sample` with a comment saying whether it's required and what its default is.
- **Docs:** update the relevant file in [`docs/`](../docs/README.md) when you change behaviour it describes. Plan prices and limits are defined by [`docs/features/subscriptions-and-monetization.md`](../docs/features/subscriptions-and-monetization.md).
- **Tests:** add or extend a suite in `backend/tests/` for new backend behaviour. Each suite is a standalone script named `*.test.mjs`; `npm test` picks it up automatically.

## Security

Never commit `.env` files, keys or customer data. Report vulnerabilities privately; see [SECURITY.md](SECURITY.md).
