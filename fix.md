# Unideals — Security & Bug Fixes Log

**Date:** 2026-09-19
**Scope:** Full-stack hardening of `frontend/` (React 18 + Vite) and `backend/` (Express 5 + Mongoose). All fixes are production-grade and backwards-compatible — API response shapes, routes, and UI flows preserved.
**Verification:** `frontend` `npm run build` passes (2328 modules), `backend` `src/app.js` import OK, fixed `conversation/message/deal` modules import OK.

---

## Backend Fixes

### `backend/src/app.js`
- Removed hardcoded dev IP `http://192.168.0.104:5173` from CORS allowlist. Dev origins (`localhost:5173`, `127.0.0.1:5173`) only allowed when `NODE_ENV !== production`.
- Fixed CORS fail-open: removed `allowedOrigins.length === 0` bypass that allowed any origin with `credentials:true`. Now: `!origin` allowed only for non-browser clients, otherwise must match `FRONTEND_URL` / `ADMIN_FRONTEND_URL` (or dev origins in dev).
- NoSQL sanitizer now deep-sanitizes `body`, `params`, `query`, `cookies` recursively with cycle guard, strips keys containing `$` or `.`.
- XSS sanitizer now deep-sanitizes strings in `body/params/query` including nested objects and arrays (was top-level `body/params` only).
- `express.urlencoded` now `limit: 10kb` to match `express.json` (was unlimited 100k default).
- Morgan dev logging now redacts secrets: `oauth_code/code/token=[REDACTED]`, `/reset-password/<token>` → `/reset-password/[REDACTED]`.
- Global error handler now preserves status codes, maps `CastError→400 Invalid ID`, `11000→409 Duplicate`, `ValidationError→400`, masks `5xx` internals as `Internal server error` (was `statusCode||400` + `err.message` leak).

### `backend/src/models/User.model.js`
- Added `verifyTokenEmailExpiry: Date` for 24h email verification expiry (was indefinite).
- Added `tokenVersion: Number default 0` for instant session revocation on logout / password reset / suspend.

### `backend/src/utils/generatedAccessToken.js`
- Expiry `5h → 15m` to match cookie `maxAge`. Now accepts `tokenVersion` and embeds as JWT `v` claim. Removed misleading `await` on sync `jwt.sign`.

### `backend/src/utils/generatedRefreshToken.js`
- Now accepts `tokenVersion`, embeds `v` claim, simplified update. Rotation still persists to `user.refresh_token`.

### `backend/src/services/auth.service.js`
- `getAuthCookieOptions`: added `path: "/"` for consistent clear.
- `loginWithPassword`: merged `No account found` + `Incorrect password` into generic `Invalid email or password` to stop enumeration. Kept `requiresVerification` / `accountBlocked` flags for UX. Now passes `tokenVersion` to token generators.
- `refreshSession`: added reuse detection — mismatched stored token triggers revocation (`refresh_token: null`) to contain theft. Added `v` version check (`Session revoked`).
- `revokeRefreshToken`: now `null + $inc tokenVersion`. Added `revokeRefreshTokenByToken` for cookie-based logout when `req.userId` missing.

### `backend/src/middlewares/auth.middleware.js`
- Added `tokenVersion` check: `decoded.v !== user.tokenVersion` → `401 Session revoked`. Blocks use of pre-logout / pre-reset / pre-suspend access tokens.

### `backend/src/middlewares/validation.middleware.js`
- Supports Zod v4 `error.issues` + v3 `error.errors`, safe `path` join. Was crashing / empty on v4.

### `backend/src/controllers/auth.controller.js`
- `findOrCreateGoogleUser`: rejects `email_verified === false`, allowlists avatar to `https://lh*.googleusercontent.com/` only (was any `picture` URL → stored XSS/phishing), backfills avatar only if empty.
- `registerUserController`: sets `verifyTokenEmailExpiry` 24h, generic message for verified email to reduce enumeration.
- `googleAuthCallbackController`: pre-checks `status !== active` before issuing `oauth_login_token` (was issued then blocked only at exchange).
- `googleOneTapController` / `exchangeGoogleOAuthCodeController`: pass `tokenVersion`, `exchange` now atomic `findOneAndUpdate` consume (prevents parallel replay), fixed `statusLabel` / `accountStatus` to use fresh user.
- `verifyEmailController`: requires `verifyTokenEmailExpiry > now` + type check (was indefinite).
- `checkEmailVerificationController`: email shape validation, missing user returns `200 verified:false` generic (was `404 User not found` oracle), generic 500 message.
- `logoutUser`: revokes via `req.userId` or `refreshToken` cookie fallback (fixes legacy `GET` no-auth no-op), always clears cookies, never 500s on logout.
- `forgotPasswordController`: generic success even when email missing / invalid (stops enumeration), stores `sha256(resetToken)` (was plaintext), rolls back token if email send fails, normalizes email.
- `resetPasswordController`: hashes incoming `token` with SHA256 before lookup, requires `password >= 6`, revokes all sessions (`refresh_token: null + $inc version`).
- `verifyResetTokenPreCheck`: hashes token before lookup.
- `resendVerificationController`: generic success for missing/invalid email, sets 24h expiry, normalizes email, generic 500 message.

### `backend/src/routes/auth.routes.js`
- Added `strictAuthLimiter` (20/15m) on `register/login/reset/exchange/one-tap`, `emailLimiter` (5/hr) on `forgot/resend`.
- `POST /logoutUser` (auth, CSRF-safe preferred) + `GET /logoutUser` (legacy compat, revokes via cookie fallback).

### `backend/src/validations/product.validation.js`
- `selling_price/original_price`: added `max 10M`.
- `images[].url`: `max 2048` + `must start https://`. `fileId`: `max 256` + regex `^[A-Za-z0-9_\-/]+$`.
- `attributes` / `pickup_address_snapshot`: inner strict (`catchall never`), length caps, `purchase_date: nullish` (allows frontend `null`), `address_line max 300`, `city/state max 100`.
- Top-level: added legacy `meetup_location` optional (frontend sends it — prevents strict rejection), unknown privileged keys stripped by default (defense-in-depth, no break).

### `backend/src/services/product.service.js`
- `createProduct`: strips `seller_id/is_boosted/boost_*/views_count/is_deleted/slug/location/meetup_location`, guards `title.trim()` crash on drafts, duplicate guard only when complete non-draft + `Number.isFinite` price (fixes `NaN` query), `purchase_date` invalid/future rejected, `null` cleaned.
- `getAllProducts`: pagination clamped `page 1-1000, limit 1-50`, `category/condition` string-only, `min/max` `Number.isFinite`, `search` string + `slice 100`, `sort` whitelisted, removed `location` from public `$project` (seller de-anonymization fix), `totalPipeline` match-only (fixes wrong total + wasted compute), `totalPages max(1)`.
- `getSingleProduct`: `ObjectId.isValid` guard (was CastError 500).
- `getSearchSuggestions`: type + `slice 100` + `min 2 chars`.
- `searchProducts`: type + `slice 100`.
- `unlist/relist`: added `is_deleted:false` guard + idempotent early return (prevents resurrecting soft-deleted).

### `backend/src/controllers/product.controller.js`
- `createProduct`: collects only well-formed `fileId` (regex, max 3) for cleanup (prevents arbitrary ImageKit deletion via victim IDs), `Promise.allSettled` best-effort, maps known client errors to `400` (was always `500`).

### `backend/src/controllers/wishlist.controller.js`
- Added `isValidObjectId` on `add/remove/check/toggle` (was `500` / NoSQL probe on `{$ne:null}`).
- Removed `error: error.message` leaks (now generic `Internal server error`).
- Fixed populate `rating` (non-existent field) → `name/avatar/subscription`.

### `backend/src/controllers/pickupSpot.controller.js`
- Added `parseIsPrimary` (fixes `Boolean("false")===true`), `normalizeSpotInput` slices lengths.
- `create`: case-insensitive dup check (regex `^...$ i`), re-checks count to narrow race.
- `update`: type checks before `.trim()` (fixes `TypeError` DoS on number), uses `parseIsPrimary`.

### `backend/src/controllers/user.controller.js`
- `updateUserAvatar`: HTTPS + length checks, pins to `IMAGEKIT_URL_ENDPOINT` or Google avatar host (was any URL), `fileId` regex.
- `removeUserAvatar`: returns sanitized user (`-password -refresh_token -verifyTokenEmail`) instead of raw doc with secrets/PII.
- `deleteAccount`: `$inc tokenVersion` + unlists `listed` products (fixes ghost storefront + 5h lingering access).

### `backend/src/controllers/imagekit.controller.js` + `backend/src/utils/imagekit.js`
- Lazy `getImagekit()` with env presence check (was crash at import), `deleteImage` guards non-string, `getFileDetails` export, `getAuthParams` 500-safe `Image service unavailable`.

### `backend/src/routes/imagekit.routes.js` / `boost.routes.js` / `report.routes.js`
- Added limiters: `imagekit/auth 20/min`, `boost 10/min`, `report 20/hr`. All preserve shapes.

### `backend/src/services/admin.product.service.js`
- Fixed report lookup `$product_id → $target_id + target_model: Product` (counts were always 0).
- `hardDeleteProduct`: best-effort ImageKit purge + `Report.deleteMany({target_id, target_model: Product})` (was `product_id` mismatch) + wishlist `$pull`.

### `backend/src/routes/admin.routes.js`
- Split roles: `SUPPORT` read + `PATCH status` only, `ADMIN` only for `soft-delete` / `hard DELETE` (was `SUPPORT==ADMIN`).

### `backend/src/services/boost.service.js`
- `Boost.create` duplicate `11000` handled, post-create re-count with rollback (`deleteOne` + unboost) to bound parallel TOCTOU over-grant.

### `backend/src/models/conversation.model.js` / `message.model.js` / `deal.model.js`
- Fixed broken `../utils/constants.js → ../config/constants.js` (was `ERR_MODULE_NOT_FOUND` DoS if imported).

### `backend/src/utils/appError.js` (new)
- Created missing `AppError` class used by `conversation.service.js`.

### `backend/src/services/conversation.service.js` (orphaned, unmounted)
- Fixed `../models/product.model.js → ../models/Product.model.js` case, aligned all field names to model (`buyer_id/seller_id/product_id`, `unread_count`, `deleted_for`, `last_message*`, `last_activity_at`), fixed populates, escaped search regex + slice. No routes mounted — no behavior change, prevents future crash.

### `backend/src/models/Product.model.js`
- `pre(save)` skips slug when `!title` (fixes draft crash on `slugify(undefined)`), falls back to `product-nanoid`.

### `backend/src/config/boostPlans.js`
- Documented drift vs `subscriptionPlans.js` (0/2/5, 3d/7d) vs live enforcement (2/10/30, 1h/3h). Kept legacy enforcement to avoid breaking Free boosts until payments launch.

### `backend/src/jobs/cleanupDeletedProducts.job.js`
- Hard-delete now purges ImageKit (allSettled), `$pull`s wishlists, deletes `Report {target_id, Product}` (was orphaned files + dangling refs).

### `backend/src/middlewares/error.middleware.js` (dead, unmounted)
- Production masking: `5xx → Internal Server Error`, stack only in non-prod.

### `backend/src/services/report.service.js` (verified, no change needed)
- Already rate-limited 10/hr, self-report guarded, duplicate friendly. Kept as-is.

---

## Frontend Fixes

### Case-sensitive imports (verified Linux-safe, kept as tracked)
- Git tracks `frontend/src/Components/`, `frontend/src/Layouts/`, `frontend/src/Utils/` (capitalized). All imports match this casing (`../Layouts/`, `../Components/`, `../Utils/`), so Vercel/Linux resolves correctly. No renames performed to avoid churn on case-insensitive Windows checkouts (`core.ignorecase=true`).
- New `frontend/src/Layouts/PublicOnlyRoute.jsx` placed under tracked `Layouts/` with matching `../Layouts/` import.

### `frontend/src/app/routes.jsx` + `frontend/src/Layouts/PublicOnlyRoute.jsx` (new) + `frontend/src/Layouts/ProtectedLayout.jsx`
- Added `PublicOnlyRoute`: logged-in (`isLoggedIn && _id`) redirected `→ /` from `/login/signup/forgot/reset/verify/checkEmail` (was accessible when logged in).
- `ProtectedLayout`: now requires `isLoggedIn && userDetails._id` (was forgeable `cachedUserDetails._id` alone), still honors `state.from`.
- Added `* → /` 404 (was blank `<Outlet/>`).

### `frontend/src/services/authInterceptor.js`
- Removed `localStorage accessToken` + `Authorization: Bearer` injection (XSS theft window). Now cookie-only (`withCredentials`), relies on HttpOnly cookies.
- Fixed refresh race: queued promises now reject on failure (was hung), `isRefreshing` reset in both paths via `onRefreshed/onRefreshFailed`, retry uses cookies not stored token, 403 blocked still clears + dispatches event.

### `frontend/src/context/useUserContext.jsx`
- Migration clears legacy `accessToken` on load. Safe JSON parse, `cachedUserDetails._id` check.
- `fetchUserProfile`: cookie-based, works without `isAuthenticated` flag (recovers cookie sessions), 401+403 clear, network errors allow retry (was stuck `hasFetched=true`), quota-safe caching.
- `clearUserData`: clears all 3 keys including legacy token.

### `frontend/src/features/auth/pages/Login.jsx`
- Strips `?oauth_code` via `history.replaceState` after exchange (was leaked in history/Referer/logs).
- Stopped writing `accessToken` to storage, honors `location.state.from` return-to (was always `/`).

### `frontend/src/features/product/pages/Home.jsx` (Google One-Tap)
- Stopped writing `accessToken`, redacted error log (was `console.error` with token/PII), cookie session only.

### `frontend/src/features/auth/api/authApi.js`
- `logoutUser`: tries `POST /logoutUser` (CSRF-safe) then falls back to legacy `GET` on 404/405. Preserves compat with new backend.

### `frontend/src/features/user/components/Deletebutton.jsx` + `frontend/src/features/user/pages/Settings.jsx` + `frontend/src/Components/layout/Header.jsx`
- Logout/delete consistently clears `isAuthenticated/cachedUserDetails/accessToken` (was missing `accessToken` in 2 paths). `Settings` 401+403 → login, `Header` already via `clearUserData`.

### `frontend/src/features/search/components/SearchDropdown.jsx`
- `highlightText`: escaped `query` (`escapeRegExp`, slice 100, try/catch) — fixes `SyntaxError` on `(/[/` + ReDoS. `See all results` now `encodeURIComponent(query)` (was raw).

### `frontend/src/Components/layout/Header.jsx`
- `recentSearches` safe `JSON.parse` + array filter + quota-safe clear (was crash on corrupt JSON).
- Recent search nav now `encodeURIComponent(item)` (was raw `?q=${item}`).

### `frontend/src/services/axiosInstance.js`
- Warns if `VITE_API_BASE_URL` missing, added `timeout: 30000`.

### `frontend/src/Utils/imageUpload.js`
- Allowlist `jpeg/png/webp` only (SVG blocked → stored XSS fix), 10MB cap, validates `imagekit/auth` shape, sanitizes filename, `AbortController` 60s timeout, uploads `File/Blob` directly (was base64 → 33% bloat + OOM).

### `frontend/src/features/product/utils/imageCompression.js`
- Throws on failure / still-oversized instead of returning original (was bypassing 10MB limit silently).

### `frontend/src/features/product/steps/ImagesStep.jsx`
- MIME + extension double-check, SVG excluded, `accept=".png,.jpg,.jpeg,.webp,..."` (was `image/*`), drag-drop same validation.

### `frontend/src/features/user/pages/Settings.jsx` (avatar + phone)
- Avatar allowlist `png/jpg/webp` + ext check (was `startsWith("image/")`允许 SVG).
- Phone: strict `^[6-9]\d{9}$` validation, no silent `slice(-10)` truncation (was data corruption).

### `frontend/src/features/product/validations/pricingValidation.js`
- Added `<=0/NaN/Infinity/max 10M` checks for both prices (was only `selling>original`, bypassable via devtools).

### `frontend/src/features/search/pages/SearchResults.jsx`
- Query sliced 100, `setError` now set (was commented out), empty query clears list.

### `frontend/src/context/WishlistContext.jsx`
- `fetchWishlist` skips when not logged in (fixes 401 spam), `wishlistIds` null-safe, `toggle/remove` optimistic with rollback + throw (was no try/catch, silent divergence).

### `frontend/src/features/user/pages/Wishlist.jsx`
- Handles string vs object IDs (`getId`), uses context `loading` (was immediate `false`), filters null/string items.

### `frontend/src/components/common/ShareButton.jsx`
- `sanitizeShareUrl` strips `oauth_code/code/token/reset_token/accessToken/refreshToken` before `navigator.share/clipboard` (was sharing `window.location.href` with secrets).

### `frontend/src/features/product/utils/draftStorage.js`
- Versioned, `savedAt`, field slicing, 7-day expiry, quota-safe clear (was unbounded PII + stale resurrection + crash on quota).

### `frontend/src/features/product/components/ProductCard.jsx` + `steps/PreviewStep.jsx` + `pages/ProductDescription.jsx` + `pages/Home.jsx` + `pages/ProductCategory.jsx` + `steps/PricingStep.jsx`
- Removed `console.log(product/FULL RESPONSE/err)` leaking `Authorization: Bearer` + PII. Replaced with silent / best-effort handling.

### `frontend/src/features/user/pages/ProfileOverview.jsx`
- Saved-item thumb handles `{url}` object vs string (was broken when API returns objects, shared with `ProductCard` logic).

### `frontend/src/features/product/steps/PricingStep.jsx`
- Fixed `dark:texxt-white → dark:text-white` typo.

### `frontend/src/features/product/pages/ProductDescription.jsx` (chat)
- Chat link now `encodeURIComponent(seller + product)`, blocks self-chat client-side with toast (backend also enforces).

### `frontend/src/features/user/pages/ContactUs.jsx`
- Length clamps (200/2000/500), 30s `sessionStorage` rate limit, quota-safe. Prevents EmailJS spam/template injection.

### `frontend/vercel.json`
- Added `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy` (was SPA rewrite only).

---

## Preserved (intentionally unchanged to avoid breakage)

### Razorpay Integration (Pro ₹99 / Pro+ ₹199 Founder lifetime, per Subscription_plan.md)

Spec: `Subscription_plan.md` (Founder: Pro ₹99, Pro+ ₹199, lifetime; Free 10 / Pro 25 / Pro+ unlimited listings; wishlist 25/100/unlimited; boosts 0/2/5). The earlier `add payment gateway v1` commit had only shipped the plan catalog + enums + empty stubs — the gateway below is the full implementation.

**Backend (`/api/payments`)**
- `src/utils/razorpay.js` (new) — lazy SDK singleton (missing env fails only on payment use, never at boot); `npm i razorpay@2.9.8`.
- `src/models/Payment.model.js` (new) — one doc per order: user/plan/amount in paise (server-computed)/receipt/`razorpay_order_id` unique, `razorpay_payment_id` sparse-unique (webhook idempotency), `created→verified/failed/expired/cancelled/refunded`.
- `src/models/Subscription.model.js` (new) — one doc per user: tier/type/status/lifetime/started/expires/last_payment; semester rows swept by job, founder rows never expire.
- `src/services/payment.service.js` (new) — `createOrder` (server-side amount, `ALREADY_SUBSCRIBED` guard, 15-min reuse of fresh unpaid order = no double orders on double-click); `verifyPayment` (HMAC-SHA256 timing-safe → Razorpay order-fetch amount/currency/status cross-check → atomic `created→verified` claim, losers get `alreadyVerified`); `verifyWebhookSignature` + `handleWebhookEvent` (`payment.captured` reconciles with amount guard + single activation, `payment.failed` marks failed, all idempotent).
- `src/services/subscription.service.js` (new) — `activateTier` (single activation point, upsert + `user.subscription`/`subscription_details` set), `getMySubscription` (tier/plan/status + LIVE usage: active listings, wishlist count, boost summary + last payment + 10-row history), `expireDueSubscriptions` (downgrades expired semester to Free).
- `src/controllers/payment.controller.js` (was empty) — `POST /orders`, `POST /verify`, `GET /me`, `POST /webhook` (raw-body HMAC, always 200 except bad signature → 400).
- `src/routes/payment.routes.js` (was empty) — 10 req/10min limiter on orders+verify, auth on all but webhook.
- `src/validations/payment.validation.js` (was empty) — strict Zod: plan enum pro/pro_plus only (amount never client-controlled).
- `src/middlewares/plan.middleware.js` (was empty) — `requireTier(...tiers)` with `PLAN_REQUIRED` code.
- `src/jobs/expireSubscriptions.job.js` (was empty) — daily 3 AM sweep; scheduled in `server.js`.
- `src/seeds/plans.seed.js` (was empty) — catalog self-check script (`node src/seeds/plans.seed.js`).
- `src/app.js` — `express.raw` webhook mounted before JSON parsing + `app.use("/api/payments", paymentRouter)`.
- `src/utils/response.js` — added shared `forwardServiceError` (not-found→404, permission/limit→400); wired into product/boost/report controllers (fixes not-found returning 500).
- Entitlements enforced: `product.service createProduct` + `relistProduct` check active-listing cap (`LISTING_LIMIT` 403, drafts exempt, null = unlimited); `wishlist.controller add/toggle` check wishlist cap (`WISHLIST_LIMIT` 403, removals exempt).
- `getSingleProduct` populate now includes `subscription` so seller PRO badges render.
- `.env.sample` — added `RAZORPAY_KEY_ID/RAZORPAY_KEY_SECRET/RAZORPAY_WEBHOOK_SECRET` (keys only).

**Frontend**
- `features/payment/api/paymentApi.js` + `features/payment/hooks/useRazorpayCheckout.js` (new) — order/verify/me calls; lazy checkout.js loader with retry, in-flight guard against double windows, dismiss/failure handling.
- `features/product/pages/PricingModel.jsx` — Upgrade buttons run order→checkout→verify→profile refresh→`/subscription`; per-tier button states (Current/Included/Upgrade, processing + disabled during flight); price suffix corrected to `one-time` (founder lifetime) instead of `/month`.
- `features/user/pages/Subscription.jsx` — replaced all mocks with `GET /api/payments/me`: live tier/status/lifetime chip, real usage bars (listings/wishlist/boosts), real dates, real order ID + payment history; upgrade routes to `/price`; cancel hidden for lifetime (shows "Lifetime access — no renewals").
- Badges post-payment: enabled `plan={sellerPlan}` + `showBadge` in `ProductCard` (was commented out), `showBadge` in `ProductDescription` seller card, `Profile_left_part`, `Settings` (Header/Profile already had it). All render from `user.subscription`, refreshed via `fetchUserProfile()` after verify.
- `.env.sample` — added `VITE_RAZORPAY_KEY_ID`.

**Operator setup required (not in repo)**
- Backend `.env`: `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` (API keys), `RAZORPAY_WEBHOOK_SECRET` (from Dashboard → Webhooks).
- Frontend `.env`: `VITE_RAZORPAY_KEY_ID` (public key id only — never the secret).
- Razorpay Dashboard → Webhooks: URL `https://<api>/api/payments/webhook`, events `payment.captured` + `payment.failed`, secret pasted to backend env.
- Flip to semester mode later: set `ACTIVE_SUBSCRIPTION_TYPE = semester` in `subscriptionPlans.js` (₹149/₹249, 180d expiry enforced by job).

- All API shapes: `{success,message,data/user/products/pagination/filterMeta/isFirstListing}` kept.
- Legacy `GET /logoutUser` kept alongside `POST`.
- Tokens still returned in JSON for old clients, but new frontend ignores them (cookies authoritative).
- Boost quotas are spec-derived: `boostPlans.js` reads `subscriptionPlans.js` (Free 0, Pro 2×72h, Pro+ 5×168h; `maxActiveBoosts` 1/1/3 anti-spam cap). Semester prices aligned to spec (₹99/₹199).
- Mock Chat/Notification/Myorders UI kept functional — only hardened underneath.
- No new required env vars. Existing `.env` continues to work. New `User.tokenVersion` / `verifyTokenEmailExpiry` default safely for old docs.
- Old verification links (pre-deploy, no expiry) will require resend — one-time, secure by design.
