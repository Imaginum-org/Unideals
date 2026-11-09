# Unideals — Fixes Log 02

**Date:** 2026-11-08
**Scope:** Full audit of `backend/` (Express 5 + Mongoose + Socket.IO) and `frontend/` (React 18 + Vite) after the earlier pass in `fix.md`. This pass looked for issues that one missed: authorization gaps, data leaks, race conditions, broken features, and performance.
**Verification:**
- Backend: `node --check` passes on every source file. `src/app.js`, the jobs, sockets and notification service all import cleanly. The CSRF fix and HTML escaping were unit-checked with a script.
- Frontend: `npm run build` passes and `eslint` reports no new warnings on changed files.
- Dependencies: `npm audit` shows 0 vulnerabilities in the frontend. The backend has 1 moderate left (see "Known / not changed").

Severity tags: **[CRITICAL]**, **[HIGH]**, **[MEDIUM]**, **[LOW]**, **[PERF]** (performance), **[BUG]** (feature not working).

---

## Backend

### 1. `backend/src/controllers/imagekit.controller.js` — **[CRITICAL]** any user could delete any image
- **Found:** `DELETE /api/imagekit/:fileId` (and `DELETE /api/imagekit/file`) only checked the *format* of the file ID. Product responses expose `images[].fileId`, so any logged-in user could delete every product photo and avatar on the platform.
- **Fixed:** The file must sit in the caller's own upload folder (`/unideals/<userId>/`, checked through ImageKit `getFileDetails`). If another live product or avatar still references the file, the endpoint returns `409`. Otherwise it returns `403`. The upload folder now comes from the shared `userUploadFolder()` helper.

### 2. `backend/src/utils/imagekit.js` — **[HIGH]** image cleanup paths could purge other users' files
- **Found:** Every cleanup path called the raw `deleteImage(fileId)` on IDs taken from request bodies or user-editable documents. Example: a user creates a product using a victim's `fileId`, the create fails or the product is deleted, and the victim's image gets purged.
- **Fixed:** Added `isValidFileId`, `userUploadFolder`, `getFileOwnership`, `isFileOwnedBy`, `isFileReferencedElsewhere`, and `deleteImageSafely`. The safe delete skips files that are still referenced by another product or avatar, and skips files in a *different* user's folder. Legacy shared-folder files are still deleted once nothing references them.
- **Wired into:**
  - `controllers/product.controller.js`: cleanup after a failed create
  - `services/product.service.js`: `deleteProduct`
  - `services/admin.product.service.js`: `hardDeleteProduct`
  - `controllers/user.controller.js`: replacing or removing an avatar
  - `jobs/cleanupDeletedProducts.job.js`: all purges

### 3. `backend/src/controllers/user.controller.js` — **[HIGH]** avatar ownership and host check
- **Found:**
  - `updateUserAvatar` accepted any `fileId`. A user could adopt someone else's file ID, and the next avatar change would delete it.
  - The host check `url.startsWith(IMAGEKIT_URL_ENDPOINT)` also accepted other ImageKit accounts whose ID starts with ours (`…/abc` matched `…/abcdef`).
- **Fixed:** The new avatar file must be owned by the caller (legacy folder allowed). The endpoint is compared with a trailing slash. The old avatar is deleted only through `deleteImageSafely`, and only when it differs from the new one.

### 4. `backend/src/services/handoff.service.js` — **[MEDIUM]** phone-upload photos had no owner folder
- **Found:** Server-side handoff uploads went to the shared `Products` folder, so ownership could not be proven.
- **Fixed:** They now upload into `unideals/<sessionOwnerId>`, the same folder as browser uploads.

### 5. `backend/src/routes/deal.route.js` — **[CRITICAL]** platform-wide data leak
- **Found:** `GET /api/deals/pending-followups` required only login. It returned **every user's** stuck deals with buyer and seller **names, emails, avatars**, pickup locations and prices.
- **Fixed:** Restricted to `admin` and `support` via `requireRoles`. The frontend never calls this endpoint, so nothing breaks.

### 6. `backend/src/sockets/index.js` — **[HIGH]** socket handler crash and typing spoofing
- **Found:**
  - The `typing` handler destructured its payload directly (`({ conversationId, isTyping })`). Emitting `typing` with no payload threw inside the listener.
  - Any socket could relay typing events into **any** conversation room just by knowing its ID.
  - `leave_conversation` accepted arbitrary IDs.
  - Production CORS still allowed `localhost:5173`.
  - The default 1 MB frame size was unnecessary.
- **Fixed:**
  - The payload is type-guarded, and events are relayed only to rooms the socket has actually joined (participant-verified).
  - `leave_conversation` validates the ID and checks membership.
  - `ack` is checked to be a function.
  - Dev origins are allowed only outside production.
  - `maxHttpBufferSize` is set to 16 KB.

### 7. `backend/src/middlewares/csrf.middleware.js` — **[HIGH]** CSRF Referer check bypass
- **Found:** The Referer was matched with `referer.startsWith(allowedOrigin)`, so `https://app.unideals.in.evil.com/...` passed for `https://app.unideals.in`. A disallowed `Origin` could also fall through to the Referer check.
- **Fixed:** The Referer is parsed with `new URL()` and its origin compared exactly. When an `Origin` header is present, it alone decides.
- **Tested:** good origin → allowed; evil origin → 403; prefix-trick Referer → 403; good Referer → allowed; no headers (non-browser) → allowed.

### 8. `backend/src/controllers/auth.controller.js` — auth hardening
- **[HIGH] Pre-account-takeover:**
  - An attacker could register a victim's email first, with a password the attacker knows, and leave it unverified. If the victim later signed in with Google, the account was marked verified but **kept the attacker's password**. If the victim re-registered, the old password was also kept and only a new verification email was sent.
  - **Fixed:**
    - On a Google sign-in to an unverified account, the password is replaced with a random hash, sessions are revoked (`tokenVersion++`) and old verify tokens are cleared.
    - On a re-register of an unverified account, the new password is stored, the old verification link stops working, and sessions are revoked.
    - A successful password reset now also marks the email as verified, since clicking the link proves inbox ownership.
- **[MEDIUM]** Raw error text leaked to clients:
  - `verifyEmailController` returned `err.message || err` on a 500.
  - `googleOneTapController` returned Google library and database messages.
  - **Fixed:** Both now go through `safeErrorMessage`. Invalid Google tokens return 401.
- **[BUG] Google callback showed raw JSON:** Missing code, state mismatch, a suspended account or a failure all ended on a JSON page in the browser. They now redirect to `/login?oauth_error=<code>`, which the Login page handles (see frontend #5).
- **[LOW]** OAuth `access_type` changed from `"offline"` to `"online"`. We never stored the Google refresh token, so we shouldn't request one.
- **[LOW]** `registerUserController`: added type checks for `name` and `email` (a non-string `email` crashed `.trim()` with a 500), email format and length validation, and trimmed `name` to 100 characters.
- **[LOW]** The reset-password token is format-checked (64 hex characters) before hashing and lookup.
- **[LOW]** The `emailSendThrottle` map is now pruned; it previously grew without limit.
- **[MEDIUM]** The user's name was put unescaped into the "password changed" email HTML. It is now escaped.

### 9. `backend/src/utils/templates/verifyEmailTemplate.js`, `forgotPaswordTemplate.js` (+ new `backend/src/utils/escapeHtml.js`) — **[MEDIUM]** HTML injection in our own emails
- **Found:** `name` was put unescaped into the email HTML. The global `xss()` filter still allows tags like `<a href>`, so a crafted name could place a phishing link inside an official Unideals email.
- **Fixed:** `name`, `url` and `resetUrl` are HTML-escaped through the new shared `escapeHtml` helper.

### 10. `backend/src/services/conversation.service.js` — **[HIGH]** seller phone number leaked through chat
- **Found:** `getSingleProduct` already strips `mobile` and `pincode` for non-owners. But the conversation detail and conversation list populated the raw `pickup_address_snapshot`, so **anyone who opened a chat received the seller's phone number and pincode**.
- **Fixed:** Added `redactPickupForViewer`. Only the seller sees `mobile` and `pincode`; the address text is unchanged. The frontend chat does not use these fields.
- **[LOW]** New conversations can no longer be started on unlisted, blocked, sold or draft items. Existing threads still reopen.

### 11. `backend/src/controllers/message.controller.js` — **[MEDIUM]** paid feature bypass
- **Found:** Turning off read receipts is a Pro/Pro+ feature (enforced in `updateChatSettings`), but `PATCH /conversations/:id/read` accepted `{ receipt: false }` from any user.
- **Fixed:** `receipt: false` is honoured only for Pro, Pro+ and admin users.

### 12. `backend/src/services/message.service.js` + `backend/src/services/deal.service.js` — **[MEDIUM]** lost unread counts (race condition)
- **Found:** Unread counters were updated with read-modify-`save()`. Two concurrent writes (two messages, or a message and an offer or system event) overwrote each other.
- **Fixed:** Uses an atomic `updateOne` with `$inc: { unread_count.<side>: 1 }` plus `$set` for the preview fields. This covers text messages, offers and system messages; `touchConversation` is a new helper in `deal.service.js`. `confirmDeal` updates the snapshot price atomically too.

### 13. `backend/src/services/notification.service.js` — notifications
- **[BUG] The "Buyers" audience never reached anyone:**
  - The code used `Deal.distinct("buyer_id")` and `Deal.exists({ buyer_id })`, but Deal documents have no `buyer_id` field (they hang off conversations).
  - **Fixed:** Buyers are now taken from `Conversation`, in all three places: the estimate, the dispatch and the user feed.
- **[MEDIUM] Unvalidated admin campaign fields:**
  - **Found:** `action_url` (which the client follows on click) and `image_url` accepted anything, including `javascript:` and `//evil.com`. `type`, `target_audience`, title and message lengths, and non-string values were also unchecked.
  - **Fixed:** `action_url` must be an in-app `/path` or an `https://` URL; `image_url` must be `https://`. Type and audience are checked against their allowed lists, lengths are capped, and the action label is capped at 40 characters.
- **[MEDIUM] Scheduled notifications could be sent twice** when cron ticks overlapped or more than one server instance ran. Each due notification is now claimed atomically (`findOneAndUpdate scheduled→draft`) before it is dispatched. Immediate sends also no longer save the document twice.
- **[PERF]** The user feed loaded *every* receipt the user ever had. It now loads only the receipts for the broadcasts it displays.
- **[LOW]** `getAdminNotificationHistory`: `page` and `limit` are clamped. A `NaN` value previously reached `.skip()`.

### 14. `backend/src/jobs/cleanupDeletedProducts.job.js` — jobs
- **[BUG]** `autoUnlistInvalidGirlsListings.job.js` existed but was **never scheduled**. It now runs nightly at 02:45 UTC.
- **[PERF]** The orphan sweep loaded **every user ID** into memory for a `$nin` query, which gets slower as the user base grows. It now uses a `$lookup` aggregation (capped at 5,000 per run).
- **[MEDIUM]** The stale-draft purge deleted drafts but left their ImageKit images orphaned. It now purges the images too.
- Database rows are removed *before* the image purge, so the "still referenced" safety check doesn't count the products being deleted.

### 15. `backend/src/services/product.service.js` — **[BUG]** typo-tolerant search double-escaped
- **Found:** `transpositionVariants` received already-escaped tokens and escaped them again, so typo variants for tokens containing regex characters never matched.
- **Fixed:** It now receives the raw tokens.

### 16. `backend/src/services/auditLog.service.js` — **[MEDIUM]** regex injection in the admin audit filter
- **Found:** `?action=` was used directly as a `$regex`, allowing ReDoS or pattern injection. An array value crashed `.trim()`.
- **Fixed:** The value is type-checked, trimmed to 100 characters and regex-escaped.

### 17. `backend/src/routes/report.routes.js` + `backend/src/services/report.service.js` — support reports
- **[BUG]** The local `optionalAuth` only read a `Bearer` header, but the web app uses cookies, so every logged-in support request was recorded as an anonymous "Visitor". It now uses the shared, cookie-aware `optionalAuth`.
- **[LOW]** `reportSupport` coerces every field to a bounded string. Arrays or objects in the body previously crashed `.trim()` with a 500.

### 18. `backend/src/app.js` — **[LOW]** error code leak
- The global error handler copied `err.code` into every response, including 500s, where it can be a driver detail (`ECONNREFUSED`, Mongo error numbers). It is now exposed only for string codes on client (<500) errors.

### 19. `backend/src/routes/product.routes.js` — **[LOW]**
- `createProductLimiter` returned a plain-text message where every other limiter returns JSON. It now returns JSON with standard rate-limit headers.

### 20. `backend/src/routes/user.routes.js` — **[LOW]**
- `PUT /chatSettings` was registered twice. The duplicate is removed.

### 21. `backend/src/config/sendEmail.js` — **[BUG]** Reply-To silently ignored
- The Resend SDK v6 option is `replyTo`. The code passed `reply_to`, so replies to our emails never reached `imaginum.org@gmail.com`.

### 22. `backend/src/models/User.model.js` — **[LOW]**
- `email` had both `unique: true` and `index: true`, building a duplicate index (Mongoose warning). Removed `index: true`.
- Removed an unused `bcrypt` import.

### 23. `backend/server.js` — **[MEDIUM]** site-gate default password
- When `SITE_GATE_PASSWORD` is unset, the testing gate falls back to a default password that is visible in the repo. The server now logs a loud `[SECURITY]` warning at boot.
- **Action needed:** set `SITE_GATE_PASSWORD` on Render.

### 24. `backend/package.json` / `package-lock.json` — dependencies
- Removed the deprecated npm package `crypto` (Node's built-in `crypto` is what the code actually uses) and the unused `socket.io-client`.
- `npm audit fix` (no breaking changes) resolved **15 of 16** advisories, including:
  - critical: `proxy-addr` IP spoofing
  - high: `body-parser`, `multer`, `engine.io`, `socket.io-parser` DoS; `axios`; `nanoid`
  - moderate: `mongoose` prototype pollution; `morgan` log forging; `qs`

---

## Frontend

### 1. `frontend/vercel.json` — **[BUG]** "Use my location" was blocked
- **Found:** `Permissions-Policy: geolocation=()` disabled geolocation for the whole site, which silently broke the location button in `features/user/components/PickupSpotModal.jsx`.
- **Fixed:** Now `geolocation=(self)`.
- **Added:** `Strict-Transport-Security`.
- **[PERF]** Hashed Vite build assets (`/assets/*`) now get `Cache-Control: public, max-age=31536000, immutable`, so repeat visits don't download unchanged JS and CSS again.

### 2. `frontend/vite.config.js` — **[PERF]** 550 kB chunk cut to 102 kB
- **Found:** `@animateicons/react` ships all ~250 icons in one file, and each icon has a top-level `Icon.displayName = "..."` assignment. Rollup must treat those as side effects, so every icon was bundled although we use about 15. `Profile_left_part` (loaded by Profile, Orders, Chat, Settings, Wishlist, Notifications and other pages) was **549 kB (73 kB gzipped)**.
- **Fixed:** A small build-only plugin strips `displayName` (a DevTools-only label) from that package, and `treeshake.manualPureFunctions: ["forwardRef"]` lets unused icons drop out. The chunk is now **102 kB (32 kB gzipped)**. Icons and animations are unchanged.

### 3. `frontend/src/services/realtime.js` (new) + `frontend/src/features/chat/hooks/useChatSocket.js` + `frontend/src/context/NotificationContext.jsx` + `frontend/src/features/user/pages/Myorders.jsx` — **[PERF]** one socket instead of three
- **Found:**
  - `NotificationContext`, the chat hook and the orders page each called `io()`. socket.io-client opens a **new** connection when the namespace is already in use, so one tab held up to 3 WebSockets.
  - The chat hook fully disconnected and re-handshaked on **every conversation switch** (cookie auth plus a database lookup on the server each time).
- **Fixed:**
  - One shared, reference-counted connection per tab (`acquireSocket` / `releaseSocket`). Each consumer adds and removes its own listeners.
  - Switching chats now only leaves and joins rooms. The connection closes when the last consumer releases it (for example on logout), so the next login handshakes with fresh cookies.

### 4. `frontend/src/features/user/pages/Myorders.jsx` — **[PERF] / [BUG]**
- Polled every **10 s even in background tabs** and opened a new socket on every Buying/Selling switch. It now polls every 30 s **only while the tab is visible**, debounces bursts of realtime events, and refreshes on focus or visibility change.
- **[BUG] Race condition:** a slow "Buying" response arriving after switching to "Selling" overwrote the newer list. Responses are now tagged with a request number, and stale ones are ignored.
- Dropped the `message:new` listener; the orders page never joins conversation rooms, so it never fired.

### 5. `frontend/src/features/auth/pages/Login.jsx` — **[BUG]**
- Handles the new `?oauth_error=` codes from the backend Google callback. It shows a friendly message (suspended, inactive, expired, failed) and removes the parameter from the URL.

### 6. `frontend/src/context/NotificationContext.jsx` — security and UX
- **[MEDIUM]** Notification links are passed through `safeActionPath`: only in-app `/paths` are navigated to. Absolute, `//host` and `javascript:` values fall back to `/notification`. This is defense in depth on top of backend item #13.
- **[PERF]** The context value is memoized. Previously a new object on every render re-rendered the Header and every other consumer.
- **[UX]** Click tracking is a background analytics call and no longer shows an error toast when it fails.
- `npm audit fix` resolved all frontend advisories (high: `react-router`, `axios`, `follow-redirects`, `form-data`). It now reports **0 vulnerabilities**.

---

## Known / not changed (by design or needs a product decision)

- **Backend `uuid` moderate advisory:** comes through `node-cron@3`. It is only reachable when a caller passes its own buffer to uuid v3/v5/v6, which we never do. Fixing it requires a breaking `node-cron@4` upgrade, so it's left for a planned dependency bump.
- **One session per user:** `refresh_token` is stored as a single field, so logging in on a second device ends the first device's session (after the 60 s grace window). Logging out on one device logs out all of them. This is intentional security behaviour today; supporting several devices needs a sessions collection.
- **`GET /api/auth/check-verification`** still tells you whether a registered email is verified (needed for the CheckEmail polling page). It is rate-limited (30 per 15 min). Removing this signal entirely needs a signed "pending verification" cookie.
- **Per-account login lockout** (5 failures per 15 min) means someone can temporarily lock a known email's account. This is a standard trade-off against password guessing.
- **Open sockets aren't checked again** after logout or suspension; tokens are verified once at handshake, and REST calls are still blocked immediately.
- **Legacy uploads** in the shared `Products/` and `Avatars/` folders can't be deleted through `DELETE /api/imagekit/:fileId`, because ownership can't be proven. They are still cleaned up by product, avatar and job flows once nothing references them.
- **`review` / `support` route, controller and service files are empty and not mounted.** They were left as-is.

## Operator actions

1. Set a strong `SITE_GATE_PASSWORD` on Render (the server now warns at boot when it's missing).
2. Optional, extra protection for #1: in the ImageKit dashboard, restrict client uploads to the `unideals/*` folder prefix.
3. Redeploy both apps. No environment, database or API-shape migrations are needed.

---

# Update: Razorpay payments review (2026-11-08)

## Amount tampering check: already safe (verified, no change needed)
The client never decides the price. Every layer was checked:

| Layer | File | Protection |
|---|---|---|
| Request validation | `backend/src/validations/payment.validation.js` | `createOrderSchema` is `.strict()` and only accepts `{ plan, productId }`, with `plan` limited to `pro`, `pro_plus`, `boost_3day`, `boost_7day`. Tested: `{plan:"pro", amount:100}` and `{plan:"pro", amountInPaise:1}` are **rejected** (`Unrecognized key`). |
| Price source | `backend/src/config/subscriptionPlans.js`, `backend/src/config/boostAddons.js` | The amount comes only from the server price table (Pro ₹99 = 9900 paise, Pro+ ₹199, Boost 3d ₹29, 7d ₹49). |
| Order creation | `backend/src/services/payment.service.js` → `createOrder` | The Razorpay order is created server-side with that amount and stored on the `Payment` row. |
| Checkout | `frontend/src/features/payment/hooks/useRazorpayCheckout.js` | Uses `order_id`, so Razorpay charges the order's server-set amount. The `amount` passed to Checkout is display-only and can't change the charge. |
| Verify | `payment.service.js` → `verifyPayment` | HMAC signature check (timing-safe); then the order is fetched from Razorpay and must be `paid` with **amount and currency equal to the stored server amount**; the payment must belong to that order; activation is claimed atomically (no double grants). |
| Webhook | `payment.service.js` → `handleWebhookEvent` | Raw-body HMAC check plus the same amount and currency check before granting anything. |

## Fixed: UPI QR code not showing — **[BUG]** `frontend/src/features/payment/hooks/useRazorpayCheckout.js`
- **Cause:** Checkout uses a custom display block (UPI, Cards, Netbanking only). Inside a custom block the UPI instrument was `{ method: "upi" }` with **no `flows`**, so the QR flow was never requested. The code comment said Razorpay has no `flows` option, which is wrong.
- **Fix:** `{ method: "upi", flows: ["qr", "collect", "intent"] }`. Checkout now offers:
  - **UPI QR code**: shown on desktop and wide screens; scan with any UPI app.
  - **UPI ID / VPA** (collect) on every device.
  - **UPI app buttons** (GPay, PhonePe, Paytm…) on mobile.
  - **Credit and debit cards**.
  - **Netbanking**.
  - Wallets, EMI, pay-later and bank transfer stay hidden, as before.
- Razorpay hides QR on narrow mobile screens by design, where app buttons replace it. To see the QR, test on a desktop browser.

## Improved: checkout uses the server's key ID
- **Files:** `useRazorpayCheckout.js`, `frontend/src/features/product/pages/PricingModel.jsx`, `frontend/src/features/user/components/OrderCard.jsx`
- **Found:** Checkout used only `VITE_RAZORPAY_KEY_ID`, while the order was created with the backend's `RAZORPAY_KEY_ID`. If the two drift apart (e.g. a test key in one env and a live key in the other), checkout fails.
- **Fixed:** The key ID returned with the order (`/api/payments/orders` → `data.keyId`) is preferred, with the env value as fallback. Boost purchases now show "3-Day Listing Boost" instead of "… Boost Plan" in the checkout header.

## Fixed: refund and dispute webhooks revoked the wrong things — **[HIGH]** `backend/src/services/payment.service.js` → `handleWebhookEvent`
- **Found:**
  1. **Any** `refund.*` event downgraded the buyer, including `refund.failed` (nothing was returned) and `refund.created` (may still fail).
  2. **Any** `payment.dispute.*` event downgraded the buyer, including `dispute.created` and `under_review`, which can still be won.
  3. Partial refunds (goodwill credit) fully revoked the plan.
  4. Refunding a **₹29 boost add-on** downgraded the user's **paid Pro/Pro+ subscription** to Free and removed **all** their boosts.
  5. Refunding an old Pro payment downgraded a user who had since paid for Pro+.
- **Fixed:**
  - Only `refund.processed`, `payment.refunded` and `payment.dispute.lost` revoke anything, and only when the amount refunded is at least the amount paid.
  - The REFUNDED state is claimed atomically, so duplicate deliveries are ignored.
  - A boost refund revokes only that listing's boost.
  - A plan refund downgrades only if the user is still on that plan.

## Operator actions (Razorpay dashboard)
1. **Settings → Payment methods:** make sure UPI (including QR), Cards and Netbanking are enabled on the account. Checkout can only show methods the account has active, in live mode as well as test mode.
2. **Webhooks:** subscribe to `payment.captured`, `payment.failed`, `refund.processed`, `payment.refunded` and `payment.dispute.lost`.
3. Keep `RAZORPAY_KEY_ID` (backend) and `VITE_RAZORPAY_KEY_ID` (frontend) on the same mode (both test or both live). The frontend now prefers the backend's key anyway.

---

# Update: Profile sidebar collapse (2026-11-08)

## `frontend/src/features/user/components/Profile_left_part.jsx`
- **[BUG] Collapsed menu expanded again on every tab change:**
  - **Cause:** Every profile page (Overview, Orders, Wishlist, Settings, …) renders its own copy of the sidebar. The collapsed state was plain component state starting at `false`, so it reset to expanded on each navigation.
  - **Fixed:** The user's choice is saved in memory (applied instantly on the next page, no expand-then-collapse flicker) and in `localStorage` (key `unideals-profile-menu-collapsed`, kept across reloads). Every page's sidebar starts in the saved state.
- **[FEATURE] Message tab auto-collapses the menu:**
  - Opening `/chat` always shows the menu collapsed, giving the chat more room.
  - This only applies on the chat tab: it never overwrites the saved choice, so leaving chat restores the previous state (expanded or collapsed).
  - The user can still expand the menu while on chat; that toggle is temporary and isn't saved.
- **[UX] Better hover labels in collapsed mode** (`SidebarTooltip` + `useCollapsedTooltip` in the same file):
  - Replaced the browser's native `title` tooltip (plain, delayed by about a second, unstyled) with a custom tooltip: a dark pill with an arrow, placed beside the icon, with a quick fade-and-slide animation. It has a dark-mode variant.
  - It shows the tab name. On the **current tab** it adds a highlighted dot and a "Current" chip. Message shows "N unread" and Notification shows "N new" when there are counts (99+ cap).
  - It renders through a portal at a fixed position, because the menu's scroll container would otherwise clip it. It closes on scroll, resize or click.
  - It also appears on keyboard focus. Collapsed links get `aria-label`, and the active link gets `aria-current="page"`.
  - The expand button uses the same tooltip ("Expand menu").

---

# Update: Brand logo loader everywhere (2026-11-08)

## `frontend/src/components/ui/BrandLoader.jsx` (upgraded)
- **`size="full"` is now a true viewport-centre loader:**
  - The mark is portaled to `<body>` as a fixed, click-through overlay, so it sits at the **exact centre of the screen** even inside animated or transformed parents. Before, it was a `min-h-screen` block in normal flow, so it sat below the header and off-centre.
  - An in-flow placeholder (`min-h-[70vh]`) keeps the page height, so the footer doesn't jump up while loading.
  - **Deduped:** if two full-screen loaders mount at once (e.g. the profile sidebar and the page body while the session loads), only one draws. Users never see two out-of-sync logos on top of each other.
- **New `tone="current"`:** the mark takes the parent's text colour, so the same component looks right on indigo, white, red or outline buttons.
- **Button size (`xs`)** renders as an inline `<span>`, so it sits on the text line inside buttons. It uses a thicker stroke and no blur glow so it stays crisp at 16 px.
- **[BUG] Gradient could vanish:** every instance defined `id="brandLoaderGradient"`. When the first one in the DOM was inside a hidden subtree (the profile sidebar is `hidden` on mobile), browsers failed to resolve the gradient and other loaders lost their stroke. Each instance now gets a unique id (`React.useId`).
- The pulse keyframes moved from a `<style>` tag injected by every instance to `frontend/src/styles/index.css` (`.brand-loader-pulse`; still respects reduced motion).

## `frontend/src/components/ui/ButtonLoader.jsx` (new)
- `<ButtonLoader loading={x} loadingText="Saving…">Save</ButtonLoader>` shows the animated logo plus the in-progress text while an action runs. The idle label renders untouched.

## Action buttons now show the logo loader (20 files)
| File | Buttons |
|---|---|
| `features/auth/pages/Login.jsx` | Sign In |
| `features/auth/pages/Signup.jsx` | Create Account |
| `features/auth/pages/ForgotPassword.jsx` | Send Reset Link |
| `features/auth/pages/ResetPassword.jsx` | Update password |
| `features/auth/pages/CheckEmail.jsx`, `VerifyEmail.jsx` | Resend email |
| `features/product/pages/PricingModel.jsx` | Upgrade (Razorpay "Processing…") |
| `features/product/pages/ProductDescription.jsx` | Submit report |
| `features/product/components/DeleteProductModal.jsx`, `RelistProductModal.jsx`, `UnlistProductModal.jsx` | Delete / Relist / Unlist |
| `features/chat/components/ReportUserModal.jsx` | Send report |
| `features/user/components/ChatSettings.jsx` | Save changes |
| `features/user/components/Deletebutton.jsx` | Delete account |
| `features/user/components/GenderGate.jsx` | Continue |
| `features/user/components/PickupSpotModal.jsx` | Select Current Location, Save |
| `features/user/components/SecuritySettings.jsx` | Send Link |
| `features/user/pages/ContactUs.jsx` | Send message, Submit report, Submit idea |
| `features/user/pages/Settings.jsx` | Change / Remove Photo, Save (×2), Request approval, Move listings |

## `frontend/src/features/product/steps/PreviewStep.jsx`: **[BUG]** Publish button loader invisible
- While publishing, the button turned light grey (`#E5E7EB`) but the loader was drawn **white**, so the logo was almost invisible during the wait.
- The button now stays brand indigo with a "busy" cursor while publishing or saving, with a larger (24 px) white logo next to the stage text ("Uploading Images…", "Publishing Listing…").

## Page loaders moved to the exact screen centre
| File | Loader |
|---|---|
| `app/routes.jsx` | Lazy route fallback |
| `features/user/components/Profile_left_part.jsx` | Session load |
| `features/user/pages/Myorders.jsx`, `Wishlist.jsx`, `Subscription.jsx`, `Settings.jsx` | Page data |
| `features/product/pages/ProductListed.jsx`, `ProductListing.jsx` (edit load) | Page data |
| `features/product/pages/Explore.jsx`, `ProductCategory.jsx` | First page of products / campus |
| `features/search/pages/SearchResults.jsx` | "Searching…" |
| `features/notification/pages/Notification.jsx` | Replaced the generic CSS spinner with the brand logo |
| `features/chat/pages/Chat.jsx` | Replaced the plain "Loading chats…" text |

These intentionally stay inline:
- "Load more" and infinite-scroll loaders at the bottom of lists.
- The "Loading campus…" state in Search, which has a Retry button under it.
- The verify-email and reset-link checks inside their auth cards.

---

# Update: Collapsed sidebar tooltip redesign (2026-11-08)

## `frontend/src/features/user/components/Profile_left_part.jsx` (`SidebarTooltip`, `useCollapsedTooltip`)
This replaces the first tooltip version, which used a dark slate pill, an arrow, a "Current" chip, a glowing dot and red "N unread" pills, and didn't match the site. It's now a production-style rail tooltip in the same visual language as the header dropdowns:
- **Surface:**
  - Light mode: white with a hairline `neutral-200` border and a soft two-layer slate shadow.
  - Dark mode: `#1A1D20` with a `neutral-800` border, the same tokens as the header panels.
- **Type and size:** Figtree 12.5 px medium, tight padding, 8 px radius. No arrow and no decorative chips; the active tab is already highlighted in the rail itself.
- **Counts** (Message, Notification): a small brand-tinted number pill (`3`, capped at `99+`) instead of red "N unread" text.
- **Motion:**
  - A 140 ms open delay, so labels don't flash while the cursor just passes over the rail.
  - Once one tooltip is open, moving to the next icon swaps **instantly** with no re-animation (delay grouping, as in Linear and Radix).
  - A subtle fade plus a 4 px slide on open, and a quick 80 ms fade on close. No scaling.
- **Keyboard focus** opens it immediately (focus is deliberate), and it still closes on scroll, resize or click.

---

# Update: Loader sizing + Home feature bento (2026-11-08)

## `frontend/src/components/ui/BrandLoader.jsx`: one small loader size
- Every page and section loader (`md`, `lg`, `full`) now renders at **40 px**, the size production SaaS apps use. Before, sizes varied: 48 / 88 / 96 px.
- Full-screen loaders are **logo-only** (no captions), so every centered loader looks identical. Captions still reach screen readers through `aria-label`.
- `xs` (16 px, buttons) and `sm` (24 px, "load more" rows) are unchanged.

## `frontend/src/styles/index.css`: font imports unchanged
- A font-weight change was tried and then **reverted on request**: the site keeps its existing Figtree/Inter imports exactly as before (single shared font everywhere). The bento uses the same Figtree font as the rest of the site.

## New: feature bento below "Sell Faster on Unideals"
**Files:** `frontend/src/features/product/components/home/PromoBento.jsx` + `PromoBento.css`, mounted in `frontend/src/features/product/pages/Home.jsx` and lazy-loaded (its own ~5 kB gzipped chunk), so the initial Home bundle doesn't grow.

- **Geometry is 1:1 with the design:**
  - The mock was measured into an 846 × 567 design-unit grid (row 1: 255 | 573, row 2: 574 | 255, 18/17 px gutters, 11 px radius).
  - Every length (type, spacing, radii, art) uses CSS container units (`--u` = one design pixel at the card's rendered width), so the composition stays proportional to the mock at any desktop width.
- **Verified visually:** headless-Chrome screenshots at the mock's exact scale were compared side by side with the design, card by card, over 5 rounds. Text, wrapping, buttons, chips, the phone and the screenshot panel line up.
- **Everything is real UI** (crisp at any size), with no screenshots:
  1. **App Launching soon:** title, copy, an iPhone frame (dynamic island, status bar, side keys) with a working mini-app screen: header, hero card using the existing `banner_bg.webp` and `bag_banner.webp`, "Shop by Category" with the real `CategoryIcon` art. Lavender glow plus film grain.
  2. **Your selling journey starts here:** copy, a **Sell Now** button linking to `/upload`, the 3-step panel, and a faithful mini-replica of the Unideals header and "Sell Your Product" step (campus pill, search, progress bar, form, PRO TIP card).
  3. **Unlock the Full Potential … Pro & Pro+:** copy, an **Explore plans** button linking to `/price`, and 6 feature chips.
  4. **Trusted Campus Community:** blue glow header with grain.
- **3D illustrations** (Pro badges, trust shield) are drawn as vector SVG: generated rosette edges, layered extrusion, bevel rings, gloss and a CSS 3D tilt. Size, position, tilt and palette match the mock. The ray-traced glass and material look of the original 3D renders can't be fully reproduced in vector.
- **Mobile (< 768 px):** the cards stack. Each renders at a 255-unit design width, the screenshot panel is hidden, and CTAs flow under the copy.
- **Dark mode:** the white cards switch to `#1A1D20` with light text; the blue cards are unchanged.
- **Asset gap:** the phone avatar uses the existing `/userdp.webp` (the mock shows a photo that isn't in the repo).

---

# Update: Category icons + Girls Mode click blocker (2026-11-08)

## `frontend/src/components/ui/GirlsEntryPill.jsx`: **[BUG]** right edge of the page not clickable
- **Cause:**
  - The Girls Mode edge menu's wrapper is `position: fixed; right: 0; z-index: 40` and contains a 308 px-wide sliding unit (tab plus card).
  - When collapsed, the card slides off-screen with a CSS `transform`, but transforms don't shrink the layout box.
  - So an **invisible 308 px × ~420 px fixed box stayed over the right edge** of every page that renders it (Home, Explore, Category). It swallowed clicks on the category scroll arrow, the right side of cards, and anything else in that band.
  - It only affects eligible viewers (female users and admins), which is why it was intermittent.
- **Fix:**
  - The wrapper is now `pointer-events-none`, and only the flower tab (`pointer-events-auto`) and the open card accept clicks.
  - The card already switched `pointer-events` with its expanded state.
  - Visuals and behaviour are unchanged.

## `frontend/src/features/product/components/CategoryIcon.jsx`: new category icon set
- The 10 classic category icons were redrawn as **flat colour illustrations matching the design reference 1:1**, compared side by side at 4.5× zoom against the reference:

| Category | Icon |
|---|---|
| Electronics | blue headphones with yellow ear pads |
| Study Material | four-book stack (orange, green, cream, red) |
| Hostel Essentials | supply box with red ruler, green pencil, blue folder and papers |
| Clothing | green tee with star emblem |
| Lab Equipment | stand with green-liquid flask over a flame |
| Sports | badminton racket and shuttlecock |
| Fitness | dumbbell with heart |
| Vehicles | blue bicycle with two map pins |
| Event Passes | gold ticket |
| Others | indigo grid plus "+" |

- **Accessories** (not in the reference) got a matching wristwatch in the same palette.
- The five **Girls Corner** icons are unchanged.
- Still inline SVG (no image requests, crisp at every size). It also updates the category tiles inside the Home bento's phone mock-up.
- **Labels unchanged:** the reference shows "Hostel Items / Cycle / Tickets", and "Tickets" twice, which looks like a copy slip. The live labels (Hostel Essentials, Vehicles, Event Passes, Others) come from `constants/categories.js`. The request was for the icons, so the labels weren't renamed.

---

# Update: Home bento Pro card matches the real plans (2026-11-08)

## `frontend/src/features/product/components/home/PromoBento.jsx`
- **Found:** the "Unlock the Full Potential … Pro & Pro+" card advertised **Analytics, Profile Badge, AI Sellability Score and "More visibility"**, and its copy promised "detailed analytics". None of these exist in the plans on the pricing page.
- **Fixed:** the six chips now list only what Pro and Pro+ actually add over Free, taken from the comparison table in `features/product/pages/PricingModel.jsx`, with the same icons:

| Chip | Pricing table row |
|---|---|
| Monthly Boosts | Monthly Boost Credits |
| More Listings | Active Listings |
| Search Priority | Search Ranking |
| Chat Priority | Chat Priority |
| Bigger Wishlist | Wishlist Limit |
| Priority Support | Customer Support |

- Rows every plan shares (Buy & Sell, Unlimited Chats) are left out, since they aren't upgrade reasons.
- **New description** (same two-line length): "Get free monthly boosts, keep more listings live, rank higher in search and chats, save more to your wishlist, and get priority support plus early access to new features." This also covers the Early Feature Access row.
- **Checked:** rendered and confirmed the copy wraps to two lines and every label fits its chip.

---

# Update: Bento polish + Girls Corner icons (2026-11-08)

## `frontend/src/features/product/components/home/PromoBento.jsx` + `.css`
- **"A simple 3-step process" title** reduced from 12.4 to 10.6 design units (line height 13); "List in 2 mins" tightened under it (8.8 units). Step rows are unchanged.
- **Phone app name:** "UniDeals" changed to **"Unideals"** (correct brand spelling).
- **Real logo:** the generic bag icon (`BagMark`) was replaced by `BrandMark`, which renders the actual Unideals logo (the same artwork as `public/logo.svg`, via `LOGO_PATHS` / `LOGO_VIEWBOX` from `BrandLoader`). It's used in both the phone app header and the mini website header inside the selling-journey card, so the old logo appears nowhere in the section.

## `frontend/src/features/product/components/CategoryIcon.jsx`: Girls Corner icons redrawn
The five Girls Mode categories were thin pink outline icons. They're now in the **same flat two-tone illustration style** as the new classic set, with the same palette (pink-led, plus the set's gold, green and blue accents):

| Category | Icon |
|---|---|
| Beauty & Personal Care | perfume bottle (gold cap) and lipstick |
| Women's Fashion | dress on a hanger with a gold belt |
| Jewellery & Hair Accessories | gold diamond ring, pink bow clip, sparkle |
| Footwear & Handbags | pink handbag with gold clasp and a red heel |
| Room & Hostel Decor | pink table lamp and a potted plant on a shelf |

- The unused `STROKE` helper (only the old outline icons used it) was removed, and the header comment updated.
- **Checked:** rendered next to classic icons to confirm the two sets read as one family.

---

# Update: Girl Mode panel redesign (2026-11-08)

## `frontend/src/components/ui/GirlsEntryPill.jsx`
The right-edge Girl Mode drawer was redesigned as a production-style panel in the site's panel language, keeping the Girl Mode pink theme.

- **Panel:**
  - White surface (`#1A1D20` in dark mode), hairline `neutral-200` border and the same soft slate shadow as the header dropdowns.
  - 288 px wide, flush to the screen edge.
  - Header: a soft pink gradient band with the cherry-blossom mark in a white tile, the "Girl Mode" title, a status line ("Girls Corner", or "On · Girls Corner" with a pink dot) and a **collapse button** (»).
  - Body: one line of copy and **3 perks**, each with a pink check badge and each matching real behaviour:
    - girls-only listings from your campus
    - beauty, fashion and decor categories
    - only girls can chat on these listings (enforced server-side in `conversation.service`)
  - Switch row: a tinted card with "Turn on Girl Mode / Changes your feed and theme" (or "Girl Mode is on / Switch back anytime") and the pink toggle.
- **The removed cartoon illustration** (girl, hearts, hills) was decorative clutter at this size.
- **Handle (collapse/expand button):**
  - A 44 × 76 px tab attached to the panel's top-left that slides with it.
  - Off: white with a pink hairline and pink glow.
  - On: a pink gradient with a white "on" dot.
  - The chevron rotates to show direction, and the tab nudges left on hover.
- **Behaviour:**
  - Same props and logic: the switch drives the page's audience tab, and the panel auto-collapses when Girl Mode turns on.
  - **New:** starts collapsed when Girl Mode is already on (no open-then-close slide on every page load).
  - **New:** **Escape** collapses the panel and returns focus to the handle.
  - Keyboard focus rings are pink.
  - `aria-expanded` / `aria-controls` / `role="switch"` are kept, and collapsed controls are removed from the tab order.
- The wrapper stays click-through, so the earlier right-edge click fix is preserved.
- The flower SVG now uses a unique gradient id per instance, since it renders twice.
- **Checked:** rendered light and dark (expanded) and Girl-Mode-on (collapsed) with mocked contexts in headless Chrome.

---

# Update: Production empty states everywhere (2026-11-08)

## New: `frontend/src/components/ui/EmptyState.jsx` + `EmptyStates.jsx`
The bare "No products listed yet on this campus." line with two loose buttons is replaced by one shared, production-style empty-state component, built for a college audience.

- **Surface:**
  - Centred card, white with a hairline border (`#1A1D20` in dark mode), and a soft brand glow behind the art.
  - Clear title, one helpful sentence, a primary action plus an optional secondary, and optional quick-start chips.
- **College-themed illustrations** (inline SVG, built from the same flat category art as the new icon set via the new `CategoryArt` export):

| Variant | Illustration | Used for |
|---|---|---|
| `campus` | a fan of student listing cards (textbooks, headphones, cycle) with a "+" badge, meaning "be the first to sell" | no listings on campus |
| `search` | magnifier over an empty card | no search results |
| `filters` | filter-slider panel over a card | filters too narrow |
| `listings` | open box with a sparkle and "+" | the seller has no listings |
| `wishlist` | listing card plus a heart | empty wishlist |
| `orders` | chat bubbles plus a receipt | no orders or deals |

- **Theme-aware:** colours come from `.es-*` tokens in `styles/index.css`. Light, dark and **Girl Mode** (pink buttons, tint and accents) all switch automatically.
- **Shared presets** (`EmptyStates.jsx`) keep copy identical wherever a state repeats: `CampusEmptyState`, `FiltersEmptyState`, `SearchEmptyState`.
- **Checked:** all six variants rendered in light, dark and Girl Mode in headless Chrome.

## Replaced everywhere it appeared

| File | Before | Now |
|---|---|---|
| `features/product/pages/Home.jsx` | "No products listed yet on this campus." + 2 buttons | `CampusEmptyState`: "Your campus marketplace is just getting started", **List an item** / **Browse categories**, plus "What students sell most" chips (Textbooks & notes, Cycles, Electronics, Hostel essentials) leading to listing |
| `features/product/pages/Explore.jsx` | same text / "No products match these filters." | `CampusEmptyState`, or `FiltersEmptyState` with **Clear filters** |
| `features/product/pages/ProductCategory.jsx` | always "No products match these filters." (even with no filters) | filters active: `FiltersEmptyState`; otherwise "Nothing in {category} yet" with **List an item** / **Explore all listings** |
| `features/search/pages/SearchResults.jsx` | "No results found. Try different keywords." | `SearchEmptyState`: "No results for "{query}"", tips, **Explore all listings** / **List an item**; or `FiltersEmptyState` |
| `features/product/pages/ProductListed.jsx` | `No products found for "{tab}"` | per tab: "You haven't listed anything yet" / "No live listings right now" (**List an item**), "No unlisted items" / "Nothing sold yet" (**View all listings**) |
| `features/user/pages/Wishlist.jsx` | plain text + button | "Your wishlist is empty", which mentions price-drop alerts (a real feature); **Discover listings** |
| `features/user/pages/Myorders.jsx` | one line of grey text | Buying: "No purchases yet" (**Find something**). Selling: "No sales yet" (**List an item** / **My listings**). Status filter: "No {status} orders" (**Show all orders**) |

- Cleanup: removed the now-unused `Link` import (Explore) and `useNavigate` (Wishlist).

---

# Update: Girl Mode category reset + panel v2 with animated character (2026-11-08)

## `frontend/src/features/product/pages/Home.jsx`: **[BUG]** category rail opened mid-list after toggling Girl Mode
- **Cause:** toggling Girl Mode swaps the rail's card set (classic ↔ girls order), but the scroll container kept its old `scrollLeft`, so the new set appeared from the middle.
- **Fix:** an effect on `showGirlsCategories` jumps the rail to the first card (`scrollTo({ left: 0, behavior: "instant" })`, which bypasses the rail's CSS smooth-scroll) and refreshes the arrow-button state.

## `frontend/src/components/ui/GirlsEntryPill.jsx`: Girl Mode panel redesign (v2)
- **Hero (156 px)** with a pink gradient (deep plum in dark mode):
  - Left: "Girls Corner" chip, **Girl Mode** title, and "Shop safe with girls on your campus".
  - A frosted » collapse button, top-right.
- **Animated college-girl character** (`CollegeGirlScene`, inline SVG, no images or GIF weight):
  - Long hair with a pink bow clip, gold earrings, a pink cardigan over a white tee, a lavender backpack strap, and a stack of textbooks in the category-icon colours.
  - She **waves** (arm rotation), **blinks**, and her **hair sways**, and the whole figure gently bobs.
  - **Hearts float up**, **sparkles twinkle**, and a chat bubble with a heart nods to the girls-only chat perk.
  - The animations are CSS keyframes in `styles/index.css` (`.gm-wave`, `.gm-blink`, `.gm-sway`, `.gm-bob`, `.gm-float`, `.gm-twinkle`), using `transform-box: fill-box`. They're **disabled under prefers-reduced-motion**.
  - Animated shapes are wrapped in positioned `<g>` groups, because a CSS `transform` would otherwise override the SVG `transform` attribute and send them to the corner.
- **Body:** three perks with gradient pink check badges, and a switch row (gradient track when on).
- **Edge handle:** a 40 px tab with the flower plus a **vertical "Girl Mode" label** (easier to discover than a bare icon). It's white with a pink border when off, and a pink gradient with a white "on" dot when on.
- **Unchanged behaviour:**
  - The switch drives the audience tab.
  - The panel auto-collapses and starts collapsed when Girl Mode is on.
  - Escape and » collapse it.
  - The click-through wrapper is preserved.
- **Checked:** light, dark and Girl-Mode-on rendered in headless Chrome with mocked contexts, captured at two animation moments to confirm motion and that nothing overlaps the copy.

---

# Update: Girls Founder pricing + college-voice copy (2026-11-08)

## Price check (answered)
- The configured prices **are correct** and consistent everywhere:
  - Backend (`config/subscriptionPlans.js`): Pro 9900 paise, Pro+ 19900 paise, plus boosts of 2900 / 4900 (`config/boostAddons.js`).
  - These match the pricing page, the comparison table and `Subscription_plan.md` (Founder Pro ₹99 / Pro+ ₹199 lifetime; boosts ₹29 / ₹49).

## Backend: Girls Founder offer (server-enforced)
- **`backend/src/config/subscriptionPlans.js`:**
  - New `GIRLS_FOUNDER_OFFER` (Pro **₹79**, Pro+ **₹159**).
  - `isGirlsFounderEligible(user, type)`: **Founder plans only** and `user.gender === "female"`.
  - `getPlanPriceForUser(tier, user)`, the single source of truth, returns `{ amountInPaise, baseAmountInPaise, offer }`.
- **`backend/src/services/payment.service.js`:**
  - `createOrder` now charges `getPlanPriceForUser(plan, user)` for plans. Boost add-ons stay flat. The amount is **always server-computed** (the order schema is `.strict()`, so a client-sent `amount` is rejected).
  - Pending-order reuse now also matches on `amount`, so an order created at another price is never resumed.
  - The Razorpay order notes record `offer`.
  - New `getPricingForViewer(user)`.
  - The verify and webhook paths are unchanged: they check the stored server amount against Razorpay, so the discount can't be forged.
- **`backend/src/controllers/payment.controller.js` + `routes/payment.routes.js`:** new **`GET /api/payments/plans`** (`optionalAuth`, rate-limited). It returns the viewer's display prices: guests and male accounts get list prices, female accounts get the offer.
- **Verified:** female → 79 / 159 (`girls_founder`); male → 99 / 199; guest → 99 / 199; semester plan for a female user → 99 (offer correctly not applied).
- **Abuse note:** gender is self-declared once at onboarding, and later changes need admin approval (`requestGenderChange`), so the offer can't be toggled at will.

## Frontend: animated offer price
- **New `frontend/src/features/payment/components/AnimatedOfferPrice.jsx`:**
  - The list price shows, then gets a pink strike-through, then the number **counts down** to the offer price (ease-out), then pops into place with a **"🌸 Girls Founder offer · Save ₹X"** badge.
  - **Reduced motion:** the final state is shown instantly.
  - **Safety net:** a timer snaps to the final price if animation frames are throttled (background tab, low-power mode, webviews), so the list price can never stick on screen.
- **`frontend/src/features/payment/api/paymentApi.js`:** `getPlanPricing()`.
- **`frontend/src/features/product/pages/PricingModel.jsx`:**
  - Fetches viewer pricing and feeds the Pro / Pro+ cards (falling back to list prices on error).
  - The "canteen chais" note follows the actual price (₹79 is about 4 chais).
  - A pink **"Girls Founder offer unlocked, bestie"** ribbon appears above the cards for eligible users.
  - The checkout amount always comes from the server order.
- **Checked:** rendered as a female user, confirming the final layout (₹79 ~~₹99~~ one-time plus badge, and ₹159 ~~₹199~~) and that the safety net lands on the offer price.

## College / Gen-Z voice (tasteful pass)
Slang is used in headlines, taglines, nudges and empty states only. **Errors, payment confirmations, legal text and button labels stay plain.**

| File | Copy |
|---|---|
| `PricingModel.jsx` | "Pick your plan. Sell smarter, not harder." · "Made for hostel-life budgets… No cap." · "Pay once, flex it all four years" · "Free stays free. Forever. No cap." · plan tags "Lowkey all you need to start" / "For the hostel hustlers · Main character energy" / "For the campus kingpins · Literally no one's above you" · "Just need one quick boost?" · "Top of the feed all week. Big W." |
| `components/ui/EmptyStates.jsx` | "…grab that first-seller W" · "Lowkey too specific?" · "…be the plug" |
| `ProductListed.jsx` | "stuff gathering dust in your hostel room" |
| `Wishlist.jsx` | "We'll ping you when it drops in price, no cap" |
| `Myorders.jsx` | "Slide into the seller's chat" / "When a buyer slides into your DMs…" |
| `home/PromoBento.jsx` | "score the best deal" · "Zero sus sellers in your feed" |
| `GirlsEntryPill.jsx` | "Your safe space to shop, bestie" · "Pink theme + girls-only feed. Slay." |

---

# Update: Remove "Sell Faster" banner + Girl Mode dark theme (2026-11-08)

## `frontend/src/features/product/pages/Home.jsx`: "Sell Faster on Unideals" banner removed
- Removed the "Sell Faster on Unideals / MAKE YOUR LISTING STAND OUT / Boost my Product" banner (54 lines).
- The feature bento now sits directly below the product feed, with added top spacing (`mt-6 lg:mt-10`).
- `public/assets/Group_114.png` (the banner's art) is no longer referenced anywhere. It was left in place and can be deleted.

## `frontend/src/styles/index.css`: **[BUG]** Girl Mode broke dark mode
- **Cause:** the Girl Mode theme forced colours with `!important` (e.g. `.girls-mode .bg-[#F7F8FA] { #fdf2f8 !important }`), which beat the `dark:` classes.
  - With dark mode **and** Girl Mode on, pages and panels stayed **light pink with white text** (unreadable).
  - Dark-mode accent text (`dark:text-[#A5B0FF]`) became deep pink `#DB2777` on near-black, which is poor contrast.
- **Fix:**
  - The light-surface and accent-text overrides are now scoped to `.girls-mode:not(.dark)`.
  - New **Girl Mode + dark** palette (`.dark.girls-mode`):
    - Page `#131313` becomes a deep plum `#150D12`; sections `#181818` become `#190F15`; cards `#1A1D20` become `#1E131A`.
    - Accent text (`#A5B0FF`, `#C3C9FF`, `#8FA2FF`) becomes light pink `#F9A8D4`.
    - A stronger pink glow on the page background.
    - Pink fills (badges, buttons) keep white text in both modes.
  - EmptyState illustration tokens got Girl Mode + dark variants (plum tint, pink accents) instead of a light pink circle on a dark card.
- **Checked:** the same sample page rendered in Girl Mode light, **Girl Mode dark** and normal dark.

---

# Update: "Failed to fetch dynamically imported module" on Settings (2026-11-08)

## Cause (dev environment, not app code)
- Vite returned `504 (Outdated Optimize Dep)` for `@radix-ui_react-dialog.js?v=a5f888c5`, which `Settings → SecuritySettings` imports.
- The dev server's pre-bundled dependency cache (`node_modules/.vite`) had been rebuilt under a new hash by `npm audit fix` and by temporary preview servers that shared the same cache folder. The running server still issued old-hash URLs, so the lazy Settings chunk failed to load.
- `Settings.jsx` itself compiles and builds fine.
- **Fix:** restart the frontend dev server with a fresh dep cache (`npm run dev -- --force`) and hard-refresh the browser.

## Hardening: `frontend/src/app/routes.jsx`, stale-chunk recovery
- The same error happens **in production after every deploy**: tabs opened before the deploy request chunk URLs that no longer exist, and the app blanked.
- All 27 lazy routes now use `lazyWithReload()`:
  - Retry the import once.
  - If it still fails, do **one** full page reload to pick up the new build, with the loader shown meanwhile.
  - A `sessionStorage` timestamp limits this to one reload per minute (no loops).
  - Genuine failures after that are re-thrown as before.

---

# Update: Home "View more products" footer (2026-11-08)

## `frontend/src/features/product/pages/Home.jsx`
- **Uneven spacing fixed:**
  - Before: 16 px above the button (`mt-4`) but about 48–64 px below (`pb-6` plus the bento's `mt-6/lg:mt-10`).
  - Now the footer uses `mt-10 lg:mt-14` and the bento below it uses the same `mt-10 lg:mt-14`, so the gaps above and below match. Measured at about 60 / 57 px; the difference is the caption's line height.
- **Redesigned as an end-of-feed footer:**
  - A muted "You're all caught up on the latest drops ✨" caption.
  - A 44 px pill button, "View more products", with a tinted arrow chip that nudges right on hover, flanked by fading hairline dividers.
  - Hover lift and soft shadow, focus ring, and dark-mode styling.
  - **Girl Mode:** pink hover and arrow chip, via `.es-secondary` and two rules in `styles/index.css`.
- **Loading text replaced:** the plain "Loading more products..." line is now the small brand loader (`BrandLoader size="sm"`, with an accessible label).
- **Checked:** rendered in light and dark with the product row above and the bento below.

---

# Update: Explore, Category & Search redesigned as one browse experience (2026-11-08)

## New shared kit: `frontend/src/features/product/components/browse/BrowseKit.jsx`
All three listing pages now use the same module-level components:

| Component | What it does |
|---|---|
| `Breadcrumbs` | Navigation trail |
| `CategoryRail` | Horizontal chips with category icons; the active chip is auto-centred |
| `SortSelect` | Native, accessible sort control in the toolbar |
| `FilterPanel` | Price slider plus editable ₹ min/max inputs; condition list; count badge and Reset |
| `ActiveFilterChips` | Removable chips plus "Clear all" |
| `ProductGridSkeleton` | Shimmer cards that mirror the product card |
| `BrowseError` | Inline error card with "Try again" |
| `LoadMoreButton` | Pill with remaining count |
| `EndOfResults` | End-of-list caption |
| `MobileFilterButton` / `MobileFilterSheet` | Spring bottom sheet: drag handle, Escape and backdrop close, body scroll lock, sticky "Reset · Show N results" footer |

- **Accent tokens** (`--accent`, `--accent-text`, `--accent-soft`, … in `styles/index.css`): brand blue normally, pink in Girl Mode, lighter text tones in dark mode, so every control themes itself.
- `components/ui/PriceRangeSlider.jsx` now uses the accent too (it was hard-coded blue).

## Bugs fixed
- **[BUG] The price slider couldn't be dragged smoothly** (Explore, Category, Search): the filter sidebar was a component defined *inside* each page, so every slider movement unmounted and remounted the whole panel mid-drag. `FilterPanel` is now module-level and stable.
- **[BUG] The price slider showed ₹0 – ₹0** with collapsed thumbs whenever the URL already had `?min=`/`?max=` (shared links, reloads). It only initialised when no price filter was set. A single effect now syncs it from the URL and bounds (clamped) on Explore and Category.
- **[BUG] "Clear filters" dropped Girl Mode** (Explore, Category): it wiped the whole query, including `?tab=girls`, leaving the pink theme on with the normal feed. The audience tab is now preserved.
- **[PRIVACY] Search showed girls-only categories to everyone** in its category pills (it used the full category list). They're now filtered out, as on every other page.
- **[BUG] Category page fetch effect** was missing the `girlsCategoryLocked` dependency, so unlocking via Girl Mode might not refetch.
- The filter sidebar was sticky at `top-6` and slid under the sticky header. It now sticks at `top-24`.
- Search used stray `font-robotoFlex` / `font-manrope` classes; it's now the site font.

## Page changes
- **`pages/Explore.jsx`:**
  - Header: breadcrumb, "Explore all listings", and "N listings from students at {campus}".
  - **New category rail** (Explore had no category browsing at all), Girl-Mode aware.
  - Sort moved into the toolbar.
  - The loading spinner was replaced by skeleton cards.
  - Styled error state, and an end-of-feed "Sell something" nudge.
- **`pages/ProductCategory.jsx`:**
  - Header with the category icon tile, title, count and the category's description.
  - The rail highlights the current category and replaces the old `<select>`.
  - "Category not found" and "Girls Corner exclusive" now use the polished `EmptyState`.
  - "Load more (N left)" pill and end-of-results caption.
  - The Boosted listings page shares the layout.
- **`features/search/pages/SearchResults.jsx`:**
  - "Results for "{q}"" with the result count, "Most relevant" sort, and a rail that filters by category in the URL.
  - Same panel, chips, skeleton, error, load-more and end states.
  - The no-query view shows "Trending on campus 🔥" with skeletons.
- **Grid** on all three: 2 columns (mobile) → 3 (md) → 4 (2xl) inside a 1380 px container aligned with Home.

## Checked
- Rendered with mocked data in headless Chrome:
  - Explore desktop with filters, the loading skeleton and mobile.
  - Category in dark mode, plus the mobile filter sheet.
  - Search with filters, and its error state.
- Lint is clean and the production build passes.

---

# Update: Home section subheadings + product card typography (2026-11-08)

## `frontend/src/features/product/pages/Home.jsx`
- **Subheadings added** (13–14 px, muted) under:
  - **Shop by Category**: "Textbooks, gadgets, cycles and hostel must-haves, all from your campus."
  - **Trending Items**: "What students on your campus are checking out right now 🔥"
- Both titles now share one style (18 → 24 px semibold, tight tracking). "Trending Items" used viewport-based sizes (`lg:text-[2vw]`, `text-sm` on mobile) and was an `h1`; it's now an `h2`, keeping a single page-level heading.

## `frontend/src/features/product/components/ProductCard.jsx`: type scale
The card had no hierarchy: the category was as loud as the title, and sizes jumped across breakpoints. New scale, built for price-first scanning:

| Element | Before | After |
|---|---|---|
| Category | 13–16 px bold blue | 11.5–12 px semibold, `--accent-text` (pink in Girl Mode), truncates |
| Title | 16–18 px bold, `min-h-[32px]` (couldn't fit 2 lines) | 14–15 px semibold, line-height 1.35, **fixed 2-line height** so cards in a row align |
| Price | 19 → 18 → 20 px | 17–18 px bold, tabular figures |
| Original price | 13–15 px | 12–13 px muted strike-through |
| Save badge | solid green box | soft emerald pill (dark-mode variant) |
| Seller name | 13–14 px, hard 56–80 px cap (clipped mid-letter, e.g. "Priyadarshin") | 12–13 px, fills free space and ends with "…" |
| Rating chip | 13 px | 11.5 px semibold |
| Location | 12–14 px, 16–18 px icon | 12 px muted, 14 px icon |
| Chat Now | 11 → 12 → **16** → 14 px | consistent 12–13 px, 16 px icon |
| Wishlist button | 40 px | 36 px, 16 px heart |

- **Checked:** cards rendered in light, dark and mobile (headless Chrome, mocked data).

---

# Update: One button shape across the site (2026-11-08)

**Reference:** the navbar **Sell** button (`frontend/src/components/layout/Header.jsx`): `rounded-lg` (8 px corners). Every button is now that shape. Only the corner radius changed; colours, sizes and behaviour are untouched.

## How
- Scanned every `<button>`, `<Link>`, `<a>` and `motion.button` in `src/**/*.jsx`. This included `cn(...)` classes and tags whose `onClick={() => …}` came before `className` (an earlier scan pass missed those).
- Changed **88 buttons** to `rounded-lg`, editing only each button's own radius class.

## Changed

| Area | Buttons |
|---|---|
| Header | "View all" in the notification and message dropdowns, mobile menu actions, guest campus switcher, Login |
| Auth (`Login`, `Signup`, `ForgotPassword`, `ResetPassword`, `CheckEmail`, `signinWithGoogle`, `LegalAgreementModal`, `PasswordStrengthMeter`) | Main buttons, plus their **desktop `md:rounded-xl` overrides removed** |
| Listing flow (`BasicInfoStep`, `ImagesStep`, `PricingStep`, `PreviewStep`) | Step buttons, payment options, **Publish** |
| Product page (`ProductDescription`) | Chat CTA, wishlist square, share buttons (WhatsApp, Telegram, copy), report dialog buttons |
| Browse (`BrowseKit`, `Home`, `EmptyState`) | Try again, **Load more** / **View more products** (were pills), Filters, sheet Reset and "Show results", sort control, empty-state actions, Home banner and retry |
| Account (`Settings`, `SecuritySettings`, `PickupSpotModal`, `Deletebutton`, `editbutton`, `Myorders`, `manageorderanime`, `Wishlist`, `ProfileOverview`, `Achievements`, `RankGuideModal`, `BadgeCard`, `GenderGate`, `CampusGate`) | Dialog buttons, tabs and segmented filters, actions |
| Other (`Notification`, `ProductListed`, `LegalDocuments`, `Chat` tabs, `NotFound`, `PhoneHandoffCard`, `PhoneUpload`, `SiteLock`) | Actions and tabs |
| `home/PromoBento.css` | Bento "Sell Now" / "Explore plans" radius changed from 4 to 5 design units (≈ 8 px at desktop, matching Sell) |

## Intentionally unchanged (not buttons, or round by design)
- Circular icon buttons: header icons, close ×, carousel and lightbox arrows, the card wishlist heart, chat send.
- Toggle switches (Girl Mode, negotiable, visibility, theme).
- Pill **chips** and badges: removable filter chips, category rail, empty-state suggestion chips, chat quick replies, search suggestion chips, the "Cover" image label.
- Selectable **tiles and list rows**: category cards, campus and gender pickers, Contact tiles, badge cards, image thumbnails, dropdown and menu rows, conversation cards, filter condition rows, the subscription history row, the search-box trigger.
- Text **inputs**: the auth form inputs keep their rounded fields. An over-broad first pass removed `md:rounded-xl` from them too; this was caught in the diff and restored.
- `features/chat/utils/chatTheme.js` buttons were already `rounded-lg`, deliberately matched to Sell.

## Checked
- A side-by-side render of the Sell button against the sort control, Filters, empty-state actions, Try again and Load more: identical corners.
- Production build passes. The only lint errors in changed files are pre-existing (`Achievements.jsx` empty `catch` blocks).

---

## Update: Browse pages polish, product card spacing, Girl Mode handle

| Area | Change | File(s) |
|---|---|---|
| Category rail | Desktop scroll arrows and edge fades appear only on the side(s) that have more chips; same pattern as the Home category row | `frontend/src/features/product/components/browse/BrowseKit.jsx` (`CategoryRail`) |
| Filter panel | Price and Condition are collapsible disclosure sections (`aria-expanded`, chevron, summary hint such as "₹100 – ₹15,000 on your campus" / "Any condition") | `BrowseKit.jsx` (`FilterSection`, `FilterPanel`) |
| Price presets | Quick budget chips (Under ₹500, ₹500 – ₹2k, ₹2k – ₹10k, ₹10k+). Only presets that overlap the campus price range are shown, clamped to it; clicking an active preset again resets the range | `BrowseKit.jsx` (`PRICE_PRESETS`) |
| Results bar | New `ResultsBar` shows "Showing 18 of 23 listings" above the grid, with active filter chips under it | `BrowseKit.jsx`, `Explore.jsx`, `ProductCategory.jsx`, `SearchResults.jsx` |
| Page header | Hairline divider under the header and rail separates the page chrome from results, consistently across all three browse pages | `Explore.jsx`, `ProductCategory.jsx`, `SearchResults.jsx` |
| Product card | Spacing system: inset image (`p-2`), content `px-1.5 pt-3`, single-line price row (price + struck MRP), "N% off" badge moved onto the image, footer pinned with `mt-auto` above a hairline, wishlist at `top-2.5 right-2.5`; even rhythm across cards | `frontend/src/features/product/components/ProductCard.jsx` |
| Girl Mode handle | Removed `mt-6` so the handle's top edge lines up with the panel's top-left corner | `frontend/src/components/ui/GirlsEntryPill.jsx` |

Verified: headless screenshots (light, dark, Girl Mode, mobile), ESLint clean (aside from the repo-wide `react/prop-types` rule), and `vite build` passes.

---

## Update: Responsive pass and mobile app shell

Verified by rendering the real app (mocked API) at 320, 375, 414, 568×320 and 740×360 landscape, 768, 980 ("Desktop site" on phones), 1024, 1280, 1440 and 2560. Covered light, dark and Girl Mode, logged-in and guest. An automated check found **no horizontal overflow on any page at 320px**.

| Area | Change | File(s) |
|---|---|---|
| Mobile tab bar (new) | App-style bottom navigation on phones (< 640px): Home, Explore, Sell (centre, primary), Chats (unread badge) and Profile (avatar; "Log in" for guests). Respects the safe area. Profile stays highlighted on every account page. Hidden on task flows (upload, product page with its own CTA bar, photo hand-off), inside an open chat thread, and while the keyboard is up | `src/components/layout/MobileTabBar.jsx`, `src/layouts/MainLayout.jsx` |
| Mobile app bar | Full-width sticky app bar instead of a floating card: wordmark + campus chip, theme, alerts. Browsing screens (Home, Explore, Category) get a full-width search field that opens the search sheet. Short landscape phones drop that row and fall back to a search icon. The floating Home "Sell" button was removed (Sell lives in the tab bar) | `src/components/layout/Header.jsx`, `src/features/product/pages/Home.jsx` |
| Account menu on phones (new) | The account sidebar is desktop-only, so on phones the Profile tab shows a native-style settings list right under the profile card: Orders, My listings, Wishlist, Notifications, Achievements, Subscription, Settings, Help, Terms, and Log out | `src/features/user/components/MobileAccountMenu.jsx`, `src/features/user/pages/ProfileOverview.jsx` |
| Account pages | Pages were locked to `h-[calc(100vh-70px)]` with an inner scroller. They now scroll naturally on phones (no content hidden behind the tab bar) and keep the fixed two-panel layout from `md` up | Notification, ProductListed, Achievements, ContactUs, Myorders, Settings, Subscription, Termscondition, Wishlist, ProfileOverview, PrivacyPolicy, ProductListing |
| Chrome size tokens | `--header-h` / `--tabbar-h` CSS variables, adjusted per breakpoint and for short screens, so full-height screens fit exactly | `src/styles/index.css` |
| Chat on phones | Opening a thread goes full-screen like a messaging app: the global header and tab bar step aside (`html[data-chat-thread]`). The list view sizes itself between header and tab bar | `src/features/chat/pages/Chat.jsx`, `src/styles/index.css` |
| Home hero | Rebuilt responsively. Phones: left-aligned readable copy + bag art. Tablet+: centred copy with both images vertically centred (they sat at a fixed 288px offset and got clipped on tablets). Fluid type that also respects short screens | `src/features/product/pages/Home.jsx` |
| Limited Time Deals | 4 columns from tablet (giant 2-up cards before). With fewer than 4 items the panel hugs its cards instead of leaving empty space | `src/features/product/pages/Home.jsx` |
| Browse controls | Filters + Sort row fills the width on phones; Sort truncates instead of overflowing at 320px | `BrowseKit.jsx`, Explore, ProductCategory, SearchResults |
| Breadcrumbs | Shared breadcrumbs (truncate long titles) now also used on the product page | `BrowseKit.jsx`, `ProductDescription.jsx` |
| Girl Mode panel | Starts collapsed on phones (it covered most of the screen) | `src/components/ui/GirlsEntryPill.jsx` |
| Short screens | Tab bar compacts to an icon-only 48px bar when the viewport is 480px tall or less | `MobileTabBar.jsx`, `index.css` |

---

## Update: Native-app polish for phones

Every page was captured at full length on a phone in light and dark (plus tablet and desktop regression checks) and fixed where it didn't read like an app.

| Area | Change | File(s) |
|---|---|---|
| Back navigation | Sub-pages (account pages, product, category, search, pricing, privacy) show a ← in the phone app bar. It pops in-app history, or falls back to Profile / Home on a deep link. The campus chip is hidden there to keep the bar calm | `src/components/layout/Header.jsx` |
| Chat list | Messaging-app rows. Product thumb with the other person's avatar tucked in the corner; title + time on line 1; a "Buying/Selling" tag, the name and the last message on line 2; unread rows bold, with an accent time + count. No borders. Large "Chats" title on phones. Pro rows keep the signature green | `src/features/chat/components/ConversationCard.jsx`, `src/features/chat/pages/Chat.jsx` |
| Chat thread | Below lg the header and composer are docked bars (edge-to-edge, safe-area aware) instead of floating cards. The header now shows who you're talking to, with an online dot | `src/features/chat/pages/Chat.jsx` |
| Product page | Phones: photos → title & price → details → pickup (title and price used to come after Key Details). Docked bottom action bar with price, wishlist and "Chat with Seller". Also removed a per-frame `requestAnimationFrame` loop that ran for the whole visit just to animate the old floating CTA | `src/features/product/pages/ProductDescription.jsx` |
| Notifications | Rewritten as an inbox: one grouped surface with divided rows, a type icon tile + unread dot, title/time, a 2-line preview, a type tag, tap-to-open, inline "View" / "Mark read" and a ✕ to dismiss (it was 3 stacked full-width buttons per item) | `src/features/notification/pages/Notification.jsx` |
| Limited Time Deals | Swipeable snap rail on phones; 4-up grid from tablet. Fixed the card frame breaking when wrapped (ProductCard's root `<a>` is inline, so the wrapper is now flex) | `src/features/product/pages/Home.jsx` |
| Sell flow | Phones: forms sit directly on the page (no card-in-card), tighter gutters, and each step's Continue/Preview + step dots are docked as a bottom action bar | `ListingLayout.jsx`, `BasicInfoStep.jsx`, `ImagesStep.jsx`, `PricingStep.jsx` |
| Dropdowns in dark mode | react-select controls were bright white in dark mode. Colors now come from `--select-*` CSS variables that flip under `.dark` | `BasicInfoStep.jsx`, `src/styles/index.css` |
| Profile | Activity stats are a compact 3-column grid on phones | `src/features/user/pages/ProfileOverview.jsx` |
| Help & Support | The three help options are compact list rows on phones | `src/features/user/pages/ContactUs.jsx` |

---

## Update: Product card discount back in the price row

- The "N% off" badge on the card image was removed. The discount sits back in the price row, where the original "Save ₹…" pill was: `₹450  ₹1,300  65% off` (price · struck MRP · green % off, with "You save ₹…" on hover).
- On narrow cards the struck MRP hides first, so the row never wraps or truncates into a stray "₹." The rule uses a CSS container query on the card itself (`.pc-content` / `.pc-mrp` / `.pc-mrp-long` in `index.css`): the MRP shows whenever it fits, with a slightly larger threshold for 5+ digit prices. Price and % off always show.
- Files: `frontend/src/features/product/components/ProductCard.jsx`, `frontend/src/styles/index.css`.

---

## Update: Girl Mode on phones + browse pages redesign

| Area | Change | File(s) |
|---|---|---|
| Girl Mode (phones) | Compact sizing below 640px: the panel is 264px wide (max 82% of the screen; it was 304px + a 40px handle, ~92% of a 375px phone). Slimmer 32px handle with a smaller flower and label, shorter 112px hero, tighter text. Docked just above the bottom tab bar (thumb reach, away from the header) and opens upward. Tapping outside closes it. Desktop is unchanged | `frontend/src/components/ui/GirlsEntryPill.jsx` |
| Browse header (new, shared) | `BrowseHeader`: a surface card with breadcrumb, accent icon tile, title, subtitle, stat pills (listing count with a live dot, campus) and a soft accent wash. The category rail sits inside it under a hairline. It follows Girl Mode and dark mode through the accent tokens | `frontend/src/features/product/components/browse/BrowseKit.jsx` |
| Results toolbar (new, shared) | `ResultsToolbar`: "Showing X of Y" on the left, Filters (mobile) and Sort on the right, active filter chips under it. Sort moved from the page header to sit next to the grid it controls | `BrowseKit.jsx` |
| Search refine | `SearchRefine`: inline "Refine your search…" field with a Search button in the Search page header | `BrowseKit.jsx`, `frontend/src/features/search/pages/SearchResults.jsx` |
| Pages | Explore (compass icon), Category (category icon + description) and Search (search icon + refine field) all use the same header and toolbar, so the three stay in sync | `Explore.jsx`, `ProductCategory.jsx`, `SearchResults.jsx` |

---

## Update: Explore / Category / Search rebuilt + working filters

**Why:** the pages looked decorative and assembled (glow blob, icon tile, stat pills), and the price filter misbehaved.

### Backend (`backend/src/services/product.service.js`, `backend/src/controllers/product.controller.js`)
- **Price bounds bug fixed.** The feed computed min/max price *with the price filter applied*, so after picking ₹500–₹2,000 the slider's whole range shrank to that and could never be widened. Bounds now cover every filter except price.
- **Search price bounds.** Search now returns real bounds too (`filterMeta`). It used to have none, so the UI faked ₹0–₹1,00,000.
- **New shared facets** (`applyFacetFilters`), used by feed and search:
  - `condition` is multi-select (`like_new,gently_used`), whitelisted against the enum. It used to be passed through raw.
  - `posted_within` = 1/7/30 days. The cutoff is floored to the minute so cached counts still hit.
  - `negotiable=true` shows only listings open to offers.
- `buildPriceRange` ignores negatives and non-numbers, and swaps a reversed range.

### Frontend
- **`useBrowseFilters.js` (new):** the one source of truth for all three pages. Filters live in the URL (`condition`, `min`, `max`, `posted`, `offers`, `sort`), so links are shareable and back/forward work. It also produces the chips, active count and API params. "Clear all" keeps `tab` / `q` / `category`.
- **`FilterSidebar.jsx` (new):** Price, Condition (checkboxes), Posted (radio), Deal ("Open to offers" switch). Each section has its own "Clear".
- **Price filter, rebuilt:**
  - Empty Min/Max mean no limit.
  - The dual slider and the inputs edit one draft.
  - The price applies on slider release, Enter, blur, or an "Apply price" button that only shows while there are unapplied changes.
  - A reversed range is swapped, with a short note.
  - Quick ranges show as radios, only where listings exist.
  - The campus range is labelled under the slider.
- **Layout:**
  - Plain header (breadcrumb, title, one line of context), category rail, then a hairline.
  - A filter column and results with a toolbar ("Showing X of Y", Filters on mobile, Sort).
  - The same structure, grid (`BROWSE_GRID`) and infinite scroll on all three pages. Category used to have a "Load more" button and Search used URL paging.
  - Removed the decorative glow, icon tile, stat pills and the search-refine box (it duplicated the global search).
- **Boosted page:** the same facets, applied client-side.
- **Mobile filter sheet:** now sits above the bottom tab bar (`z-[80]`). Before, the tab bar covered its "Show N results" button.
- **Dead code removed:** old `FilterPanel`, `FilterSection`, `PriceInput`, `ResultsBar`, `SearchRefine` (`BrowseKit.jsx`).

---

## Update: One dropdown everywhere (profile-menu style)

- **Shared tokens:** `.dd-panel` / `.dd-item` in `frontend/src/styles/index.css`, taken from the profile menu.
  - Panel: `#F7F8FA` with a neutral-200 border, rounded-2xl and a soft shadow.
  - Item hover / keyboard highlight: `#4B45FF` @10% with `#2E40DC` text (dark: @20% with `#C3C9FF`).
  - Selected item: accent text, semibold, and a check mark.
- **New `components/ui/Select.jsx`:** replaces every native `<select>`.
  - Accessible listbox (`aria-haspopup`, `aria-expanded`, `aria-activedescendant`).
  - Keyboard: ↑/↓, Home/End, Enter/Space, Esc, Tab, type-to-jump.
  - Closes on outside click; flips upward when there's no room below; animated.
  - Two variants: `toolbar` (Sort by …) and `field` (form control).
- **Replaced native selects:**

  | Select | File |
  |---|---|
  | Browse Sort (Explore / Category / Search) | `BrowseKit.jsx` |
  | Report reason | `ReportUserModal.jsx`, `ProductDescription.jsx` |
  | Pickup spot | `PricingStep.jsx` |
  | Contact topic and report category | `ContactUs.jsx` |
  | Campus, gender and gender-change request | `Settings.jsx` |

- **Brought in line:** the mobile search sheet's recent/trending rows (grey press → accent hover/press, `Header.jsx`) and the Sell form's react-select (menu `#F7F8FA`, accent hover, no solid-indigo selected row, `BasicInfoStep.jsx` + `--select-*` vars).
- **Already matching, left as-is:** desktop search suggestions, campus picker, notifications and messages dropdowns.

---

## Update: Every pricing-page promise implemented + tested

**Audit.** Each promise on `/price` was checked against server-side enforcement:

| Promise | Before | Now |
|---|---|---|
| Active listings 10 / 25 / Unlimited | ✅ enforced | ✅ (tested) |
| Wishlist 25 / 100 / Unlimited | ✅ enforced | ✅ (tested) |
| Monthly boosts 0 / 2×3 days / 5×7 days, extra boosts anytime | ✅ enforced | ✅ (tested) |
| Unlimited chats | ✅ | ✅ |
| **Search ranking** Normal / Higher / Highest | ❌ ranking ignored the plan | ✅ implemented |
| **Chat priority** | ⚠️ client-only ("Pro circle") | ✅ server-side for every inbox view |
| **Priority support** | ❌ client chose its own priority, queue ignored it | ✅ implemented |
| **Early feature access** Limited / Full | ❌ didn't exist | ✅ "Labs" + two real features |

### Search ranking (`backend/src/utils/planPerks.js`, `utils/sellerTierSync.js`, `models/Product.model.js`, `models/User.model.js`, `services/product.service.js`, `server.js`)
- **Denormalised rank:** `Product.seller_tier` (0 Free / 1 Pro / 2 Pro+), so the feed can sort without a `$lookup`.
  - It is stamped on create.
  - It is re-synced automatically by User model hooks whenever `subscription` changes: payment, expiry job, refund downgrade, reward, admin edit, `findOneAndUpdate`, `updateOne` or `save`.
  - An idempotent backfill runs at startup.
- **Feed "Recommended":** `+ seller_tier × 8`, worth about one day of freshness for Pro+.
- **Search "Most relevant":** `+ seller_tier × 3`, so relevance still wins and the plan breaks ties.
- **Unaffected:** explicit sorts (price, newest).

### Chat priority (`services/conversation.service.js`)
- The list API orders chats with a Pro+ counterpart first, then Pro, then Free. It is a stable sort, so recency is kept within each band.
- The header preview and the profile's recent chats now honour it too.

### Priority support (`services/report.service.js`, `models/Report.model.js`)
- Ticket priority is now set server-side from the plan: Free `normal`, Pro `high`, Pro+ `urgent`. Free feature suggestions are `low`.
- The client-sent `priority` is ignored.
- New fields: `priority_rank` and `reporter_plan`.
- The admin Support queue sorts by priority, then newest.
- The Help page tells Pro / Pro+ users their tickets are prioritised.

### Early access: Unideals Labs (`config/labs.js`, `services/labs.service.js`, `controllers/labs.controller.js`)
- **Registry:** `LABS_FEATURES`, each with a `minTier`. Pro = Limited, Pro+ = Full.
- **Endpoints:**
  - `GET /api/user/labs` lists features and whether each is enabled for this account.
  - `GET /api/product/price-insights?category=&condition=` returns 403 `PLAN_REQUIRED` for Free.
- **Smart price suggestions (Pro & Pro+):**
  - Campus p25 / median / p75 and a rounded suggested price, plus the sold median.
  - Uses the last 6 months, same condition first, falling back to the whole category under 5 samples.
  - Cached 10 minutes.
  - "Use ₹X" fills the price field in the Sell flow (`PriceInsights.jsx` in `PricingStep`). Free users see a locked teaser.
- **Demand meter (Pro+):** live supply, sold in 30 days, views per new listing, and a High / Moderate / Low level.
- **UI:** "Early access" card on the Subscription page (`EarlyAccessCard.jsx`). The pricing-table blurb names the features.

### Bugs found by the tests
- **Duplicate reports were never blocked.** The `Report` unique partial index used `$ne: null`, which MongoDB rejects, so the index was never created. It now uses `reporter_id: { $type: "objectId" }`. Production will build it on the next start; if duplicates already exist, the build fails until they are removed.
- **Redundant index.** The `notifications.scheduled_at` partial index from the optimisation pass duplicated an existing field index, so Mongoose skipped it. Removed, and `optimisation.md` corrected.

### Tests: `backend/tests/plans.integration.test.mjs` (`npm run test:plans`)
- Runs against a real in-memory MongoDB (`mongodb-memory-server` dev dependency) using the backend's own models, services and pipelines.
- **33 passing**, covering:
  - listing / wishlist / boost limits and boost durations;
  - feed + search plan ranking, rank sync on upgrade / expiry / save, and backfill;
  - all browse filters (multi-condition, posted within, offers, price bounds independent of the price filter, reversed range, condition whitelist);
  - chat ordering;
  - support priority + queue order;
  - Labs gating (service + HTTP 403);
  - price-insight maths and fallback;
  - the duplicate-report regression.
- **Frontend:** the Labs UI was checked for Free / Pro / Pro+ (locked teaser → price only → price + demand; "Use ₹X" fills the field).

---

## Update: Testing password gate (site lock) removed completely

**Deleted files**
- `frontend/src/siteLock/` (`SiteLock.jsx`, `SiteLockGate.jsx`)
- `backend/src/middlewares/siteGate.middleware.js`
- `backend/src/controllers/siteGate.controller.js`
- `backend/src/routes/siteGate.routes.js`

**Removed integration code**
- `frontend/src/app/App.jsx`: the `SiteLockGate` import and wrapper. The app renders `NotificationProvider` → `AppRoutes` directly.
- `frontend/src/services/authInterceptor.js`: the `SITE_LOCKED` 403 handler (localStorage flag + `unideals:site-locked` event).
- `backend/src/app.js`: the `/api/site-gate` router and the global `requireSiteGate` middleware.
- `backend/src/sockets/index.js`: the gate-cookie check on the socket handshake. Normal session auth is unchanged.
- `backend/server.js`: the default-password warning.

**Environment**
- `VITE_SITE_LOCK_ENABLED` removed from `frontend/.env.sample`; `SITE_GATE_ENABLED` / `SITE_GATE_PASSWORD` removed from `backend/.env.sample`.
- If they're set on the hosting dashboards (e.g. Render / Vercel), they can be deleted there; nothing reads them anymore.

**Verified:** no references remain, the backend app loads, and the frontend builds.

---

## Update: Mobile wordmark, one 20px phone gutter, one-line Home subheadings

- **Wordmark:** the phone "Unideals" now matches the laptop one: 21px, weight 700, letter-spacing −0.5 (it was 18px / 500 / 0). File: `Header.jsx`.
- **One phone gutter:** content sits 20px from the screen edges on every page below 640px. Tablet and desktop spacing is unchanged.
  - Header and search row; Home; Explore / Category / Search.
  - Product page and its bottom bar; the Sell flow and its docked step bars.
  - Profile, Orders, Wishlist, My Listings, Achievements, Settings, Subscription, Notifications, Terms, Help & Support.
  - Chat list header and footer.
- **Home subheadings:** shorter on phones so they fit on one line, with a truncate guard as a safety net.
  - "Textbooks, gadgets, cycles & more"
  - "Hot on your campus right now 🔥"
  - The full sentences still show from `sm` up.
- **Verified:** screenshots with 20px guide lines at 320 and 375px; the build passes.
