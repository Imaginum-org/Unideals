# Security Policy

## Reporting a vulnerability

Please **do not open a public issue** for security problems.

Report privately through GitHub: **Security → Report a vulnerability** on this repository (private vulnerability reporting). Include:

- what is affected (endpoint, page, or file),
- steps to reproduce or a proof of concept,
- the impact you expect (data exposure, account takeover, payment bypass, …).

We aim to acknowledge reports within **3 working days** and to ship a fix for confirmed high-severity issues within **14 days**. We will credit you in the fix log unless you ask us not to.

## Scope

In scope: the marketplace web client (`frontend/`), the API (`backend/`), and their production deployments.

Out of scope: third-party services we integrate with (Razorpay, ImageKit, Google, Firebase, Resend), denial-of-service and volumetric testing, social engineering, and findings that need a compromised device.

## Supported versions

Only the latest deployment of `main` receives security fixes.

## For maintainers

- Secrets live only in hosting-provider environment settings and local `.env` files, never in git. If a secret is ever committed, **rotate it**; rewriting history is not enough.
- Past security work is recorded in [`docs/changelog/`](../docs/changelog/).
