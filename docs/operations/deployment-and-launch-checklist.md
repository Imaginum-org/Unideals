# Deployment & launch checklist

How Unideals is deployed and what to verify before (and right after) a production launch.

| Piece | Host | Domain |
|---|---|---|
| Web client (`frontend/`) | Vercel (`frontend/vercel.json`: SPA rewrites, security headers, immutable asset caching) | `app.unideals.in` |
| API + Socket.IO (`backend/`) | Render, Node 22 (`engines` in `backend/package.json`) | `api.unideals.in` |
| Database | MongoDB (Atlas or equivalent) | — |
| Admin portal | Separate repo, uses `/api/admin/*` | `ADMIN_FRONTEND_URL` |

---

## 1. Backend (Render)

- **Root directory:** `backend` · **Build:** `npm ci` · **Start:** `npm start`
- **Health check path:** `/health` (returns `{ "status": "OK" }`)
- **Environment:** set every `[required]` variable from [`backend/.env.sample`](../../backend/.env.sample). In particular:
  - `NODE_ENV=production`. This turns on Secure + `SameSite=None` cookies and drops the localhost CORS origins.
  - `FRONTEND_URL` / `ADMIN_FRONTEND_URL` set to the exact production origins (https, no trailing slash). Anything else is rejected by CORS.
  - `SECRET_KEY_ACCESS_TOKEN` and `SECRET_KEY_REFRESH_TOKEN`: long, random and **different**. Rotating them logs everyone out.
  - `GOOGLE_REDIRECT_URI` points at the production API callback.
- The app sets `trust proxy` to 1, which matches Render's single proxy hop. Revisit it if you add a CDN or load balancer in front, or per-IP rate limits will key on the proxy.
- Run **one instance** unless you have read the scaling notes in [performance-optimisations.md](../architecture/performance-optimisations.md#5-notes-and-next-steps-not-done-only-worth-it-at-higher-scale). The cron jobs, in-process caches and Socket.IO rooms assume a single process.

## 2. Frontend (Vercel)

- **Root directory:** `frontend` · **Build:** `npm run build` · **Output:** `dist`
- **Environment:** every value in [`frontend/.env.sample`](../../frontend/.env.sample). `VITE_*` values are compiled into the bundle, so **redeploy after changing any of them**, and never put a secret there.
- `VITE_RAZORPAY_KEY_ID` must be in the same mode (test or live) as the backend's `RAZORPAY_KEY_ID`.

## 3. Third-party dashboards

- [ ] **MongoDB:** network access allows Render's outbound IPs; backups / point-in-time restore are on; the app user has least-privilege access to one database.
- [ ] **Google Cloud OAuth:** production origin under *Authorized JavaScript origins*; API callback under *Authorized redirect URIs*; consent screen published.
- [ ] **Razorpay (live mode):** KYC done and live keys issued. Under *Payment methods*, UPI (incl. QR), Cards and Netbanking are enabled. Under *Webhooks*, `https://api.unideals.in/api/payments/webhook` is subscribed to `payment.captured`, `payment.failed`, `refund.processed`, `payment.refunded` and `payment.dispute.lost`, and its secret is in `RAZORPAY_WEBHOOK_SECRET`.
- [ ] **ImageKit:** restrict client uploads to the `unideals/*` folder prefix.
- [ ] **Resend:** sending domain verified (SPF/DKIM), so verification and reset emails don't land in spam.
- [ ] **Firebase (only if push is on):** Web Push VAPID key generated; service-account credentials in `FIREBASE_*`; `PUSH_ENABLED=true`. Check with `node scripts/sendTestPush.js --check`.
- [ ] **EmailJS:** the contact form template exists and its domain allowlist includes the production origin.
- [ ] **AI providers:** `node scripts/check-ai-providers.mjs` makes one tiny call to each configured model with the production keys.

## 4. Data and one-off scripts

Run these from `backend/` with production `MONGO_URL` set. All of them are idempotent.

| When | Command |
|---|---|
| First deploy | `npm run seed:campuses`: upserts the launch campuses |
| First deploy | `node src/seeds/plans.seed.js`: sanity-checks the plan catalog |
| Upgrading a DB from before the notification retention change | `node scripts/migrateNotificationExpiry.js` (see [notifications.md §9](../architecture/notifications.md#9-deploying-this-version)) |
| Upgrading a DB from before Girls Corner | `MONGODB_URI=... node scripts/backfillGirlsCorner.js` (this script reads `MONGODB_URI`, not `MONGO_URL`) |

## 5. Go-live checklist

**Before launch**
- [ ] CI is green on `main` (`npm run check`, `npm test`, frontend build).
- [ ] All `[required]` env vars are set on both hosts, using live keys and production URLs.
- [ ] No test or demo accounts or listings left in the production DB.
- [ ] Privacy policy (`/privacy-policy`) and terms (`/termscondition`) are reviewed and current.
- [ ] Custom domains have valid TLS; `app.` → Vercel, `api.` → Render.

**Smoke test on production**
- [ ] `GET https://api.unideals.in/health` → `200`.
- [ ] Sign up with email → verification email arrives → log in → log out.
- [ ] Google sign-in works.
- [ ] Create a listing with photos → it shows in the campus feed → delete it.
- [ ] Chat between two accounts delivers in real time; the notification bell updates.
- [ ] Buy Pro with a small real payment, check the plan activates, then refund it from the Razorpay dashboard and check the refund webhook revokes the plan.
- [ ] The assistant answers a question.
- [ ] Mobile layout and the installed-PWA icon look right.

**After launch**
- [ ] Watch Render logs and the admin *System status* page for the first 24 h.
- [ ] Check that the scheduled jobs ran: boost and subscription expiry, deal cleanup, scheduled notifications.
- [ ] Merge Dependabot PRs regularly; re-run `npm audit --omit=dev` in both apps.
