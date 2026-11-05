# Girl Corner 🌸 — Ultimate Feature Spec (Unideals)

> **File:** `/Girl_Corner_feature.md` | **Version:** 1.0 FINAL | **Status:** Approved for build
> **Stack:** Frontend React 18 + Vite 6 (`frontend/`) | Backend Express 5 + Mongoose 9 (`backend/`)
> **Scope:** MVP Phase-1 only. Phase-2/3 explicitly at bottom.

---

## 1. Problem & Goal

Girls in college mostly buy/sell with other girls. They fear boy spam / unwanted chat messages.

**Goal:** Let any girl say *"here all the girls are there, no boy can spam/message me"* while keeping normal mixed marketplace intact.

**Non-goals (MVP):**
- No forced segregation. Mixed marketplace stays default.
- No full ID-card KYC in MVP.
- No user-blocking system (doesn't exist today — Phase-2).

---

## 2. Final Concept (Locked)

**Name: `Girls Corner 🌸`**

Two linked primitives:

1. **`isGirlsOnly` listing flag (seller opt-in):** `Product.isGirlsOnly=true` means invisible + uncontactable to non-females.
2. **`Girls Corner` feed (buyer view):** Separate tab/section showing ONLY `isGirlsOnly=true` listings in viewer's `campus_id`.

Plus **Chat Lock:** `POST /api/conversations` hard-rejects boy → girls-only product.

Default marketplace behavior unchanged. Girls choose per-listing.

---

## 3. Gender Confirmation — How We Confirm "Girl" (Locked Decision)

### 3.1 Why NOT Google gender

Current auth (`backend/src/controllers/auth.controller.js:342,402` `findOrCreateGoogleUser`, `googleOneTapController`):
- Google `id_token` contains ONLY `sub, email, name, picture`. **Never gender.**
- People API `GET people/me?personFields=genders` with scope `https://www.googleapis.com/auth/user.gender.read`:
  1. Returns `[]` if user set gender private (very common, reported as broken on StackOverflow),
  2. Requires sensitive-scope OAuth verification + extra consent screen = drop-off,
  3. Incompatible with One-Tap (`credential` flow can't request extra scopes).
- Conclusion: **Do NOT depend on Google for MVP.**

### 3.2 Final MVP method: Self-declared + Lock + Deterrence

Reuse existing field: `User.gender: enum [male, female, other] | default null` (`backend/src/models/User.model.js`).

**New fields on `User`:**
```js
genderSource: { type: String, enum: ['self','admin'], default: 'self' },
genderUpdatedAt: { type: Date, default: null },
// no new verified boolean in MVP to avoid false trust
```

**Rules (enforced server-side):**
1. Signup (`POST /api/auth/register`, `findOrCreateGoogleUser`): `gender=null`. Frontend MAY collect optional gender (see §6) but server treats as `self` source.
2. Set gender via `PUT /api/user/updateProfile { gender }` (existing route `backend/src/routes/user.routes.js`). Validation stays `male|female|other`.
3. **First set is free.** Subsequent change:
   - Allowed only if `Date.now() - genderUpdatedAt > 30 days`, else `429 GENDER_LOCKED` with `retryAfter`.
   - Changing AWAY from `female` while user has active `isGirlsOnly=true` listings → reject with `409 HAS_GIRLS_ONLY_LISTINGS` OR auto-unlist them (pick: **reject + tell seller to unlist/delete first** — safer, no silent data loss).
   - Changing TO `female` re-grants Girls Corner access immediately.
4. `other` and `null` and `male` = **NOT eligible** for Girls Corner (create or view) in MVP. Documented inclusivity trade-off for safety.
5. **Deterrence:**
   - Settings + Upload copy: "Misusing Girls Corner = instant suspend."
   - New report reason `fake_gender` (see §5.4). 1 confirmed fake-gender → `User.status=suspended` + `tokenVersion++` (kills sessions, existing pattern in `auth.service.js:revokeRefreshToken`).
   - Admin can set `gender` + `genderSource=admin` to correct/lock.
6. `GET /api/user/userProfile` and `sanitizeAuthUser()` MUST now return `gender` (+ `genderUpdatedAt`) so frontend can gate without extra call.

**Phase-3 (not MVP):** Optional college-ID upload or People-API opt-in to earn `genderVerified=true` badge. Schema reserved but NOT built now.

---

## 4. Data Model Changes

### 4.1 `backend/src/models/Product.model.js`
```js
isGirlsOnly: { type: Boolean, default: false, index: true },
sellerGenderSnapshot: { type: String, enum: ['female'], default: undefined }
// snapshot proves seller was female at creation; prevents flip loophole
```
Indexes:
```js
ProductSchema.index({ campus_id: 1, isGirlsOnly: 1, status: 1, createdAt: -1 });
```

Migration: no script needed. Default `false` covers all existing docs. Optional: `db.products.updateMany({isGirlsOnly:{$exists:false}},{$set:{isGirlsOnly:false}})`.

### 4.2 `backend/src/models/User.model.js`
Add `genderSource`, `genderUpdatedAt` as above. No migration needed (`default` handles it).

### 4.3 `backend/src/models/Report.model.js`
Add to `reason` enum: `fake_gender_girls_corner`. No schema break (string enum addition). Frontend `ReportUserModal.jsx` 9 reasons → 10.

---

## 5. Backend API Spec

### 5.1 Files to touch
```
backend/src/models/User.model.js
backend/src/models/Product.model.js
backend/src/models/Report.model.js (enum)
backend/src/validations/product.validation.js (Zod: add isGirlsOnly boolean)
backend/src/validations/user.validation.js (Zod: gender already, add cooldown logic in service)
backend/src/services/product.service.js (create + list filtering)
backend/src/services/conversation.service.js (createConversation guard)
backend/src/services/user.service.js (gender lock logic)
backend/src/controllers/product.controller.js
backend/src/controllers/user.controller.js
backend/src/controllers/conversation.controller.js
backend/src/routes/product.routes.js
backend/src/routes/user.routes.js
backend/src/routes/conversation.route.js
backend/src/middlewares/ (reuse auth, validation; no new middleware)
```

### 5.2 Create listing — `POST /api/product`
Request adds: `{ ..., isGirlsOnly?: boolean }`
Server logic:
1. `requireAuth` → `req.userId`, load `req.user (gender, campus_id)`.
2. If `isGirlsOnly==true`:
   - If `req.user.gender !== 'female'` → `403 NOT_ELIGIBLE_GIRLS_ONLY` ("Only accounts set as Female can create girls-only listings.")
   - Set `sellerGenderSnapshot='female'`, `campus_id` stamped as today (existing).
3. Else normal flow unchanged.
Rate-limit unchanged.

### 5.3 List / Search / Detail filtering
Current visibility: `campus_id==viewerCampus && status==listed && !is_deleted` (`product.service.js:340,901`).

New rule appended EVERYWHERE (list, boosted, search, suggestions, category, `GET /:id`):
```
if (product.isGirlsOnly && viewerGender !== 'female') → exclude (list) / 404 (detail)
```
- Logged-out (`viewerGender=null`) → excluded / 404. Return `404 PRODUCT_NOT_FOUND`, NOT `403`, to avoid leaking existence.
- `GET /api/product/?campus_slug=X&audience=girls_only` (preferred: query param, no new route to maintain):
  - Requires auth + `gender==female`, else `403 GIRLS_CORNER_RESTRICTED`.
  - Forces `campus_id` filter (reuse existing campus guard, cross-campus → `CAMPUS_MISMATCH`).
  - Filter: `{ campus_id, status:'listed', is_deleted:false, isGirlsOnly:true }` + existing sort/pagination (`page,limit,sort,condition,min_price,max_price`).
  - Alternative if team prefers REST clarity: `GET /api/product/girls` — same logic. Pick ONE (recommend query param).

### 5.4 Chat creation — `POST /api/conversations { productId }`
File: `backend/src/services/conversation.service.js:createConversation`, route `backend/src/routes/conversation.route.js:70`.

Insert after `Product.seller_id` lookup, before `findOne||create`:
```js
if (product.isGirlsOnly) {
  const buyer = await User.findById(buyerId).select('gender');
  if (buyer?.gender !== 'female') throw { statusCode: 403, code: 'GIRLS_ONLY_PRODUCT' };
  // also reject if seller no longer female (paranoia):
  // if (seller.gender !== 'female') throw 410 GIRLS_SELLER_INVALID
}
```
Self-chat guard (`400` existing) stays. `Deal.upsert(negotiating)` unchanged. `GET /conversations`, `POST /:id/messages` need NO change (creation guard suffices; participant check already exists).

### 5.5 User update — `PUT /api/user/updateProfile`
Body: `{ mobile?, gender?, campus_slug? }`.
Add service logic:
```js
if (req.body.gender && req.body.gender !== user.gender) {
  if (user.genderUpdatedAt && Date.now()-user.genderUpdatedAt < 30d) throw 429 GENDER_LOCKED;
  if (user.gender==='female' && req.body.gender!=='female') {
    const active = await Product.countDocuments({ seller_id:user._id, isGirlsOnly:true, status:'listed', is_deleted:false });
    if (active>0) throw 409 HAS_GIRLS_ONLY_LISTINGS;
  }
  user.gender = req.body.gender; user.genderUpdatedAt = new Date();
}
```

### 5.6 Report — `POST /api/report/user/:userId`, `/product/:productId`
Add reason `fake_gender_girls_corner`. Limiter `20/h` unchanged. Admin queue `GET|PATCH /admin/reports` surfaces it with `priority:high` (UI tweak only).

### 5.7 Error codes (final strings — frontend keys off these)
```
NOT_ELIGIBLE_GIRLS_ONLY (403) | GIRLS_CORNER_RESTRICTED (403) |
GIRLS_ONLY_PRODUCT (403) | GENDER_LOCKED (429) | HAS_GIRLS_ONLY_LISTINGS (409) |
PRODUCT_NOT_FOUND (404 for hidden girls-only to boys/logged-out)
```

---

## 6. Frontend Spec

### 6.1 Files to touch
```
frontend/src/features/auth/pages/Signup.jsx (optional gender radio)
frontend/src/features/user/pages/Settings.jsx (gender dropdown upgrade + lock copy)
frontend/src/features/product/pages/Upload.jsx (multi-step: new Visibility card)
frontend/src/features/product/pages/Home.jsx (tabs All | Girls Corner)
frontend/src/features/product/pages/Explore.jsx (same tabs + filter carry-over)
frontend/src/features/product/pages/Category.jsx (same)
frontend/src/features/product/pages/ProductDescription.jsx (chat button gating + badge)
frontend/src/features/product/components/ProductCard.jsx (🌸 badge)
frontend/src/features/product/api/productApi.js (add audience param)
frontend/src/features/chat/pages/Chat.jsx (403 handling + 🌸 thread icon)
frontend/src/features/chat/services/chatApi.js (pass-through error code)
frontend/src/features/chat/components/ReportUserModal.jsx (new reason)
frontend/src/context/UserContext.jsx (expose gender)
frontend/src/app/routes.jsx (no new route needed; query-param tab. Optional /girls route → redirect to /?tab=girls)
```

### 6.2 Screen-by-screen

**1) Signup (optional, low friction):**
- Add radio: `I am: ( ) Girl ( ) Boy ( ) Prefer not to say` → maps to `female|male|null` (don't send `other` from signup to keep simple).
- Helper: "Needed only if you want Girls Corner. Can set later in Settings."
- Google signup: same prompt post-redirect if `gender==null` (nudge banner, not blocker).

**2) Settings → Gender:**
- Existing dropdown `Select gender|male|female|other` stays.
- Add info box: "🌸 Girls Corner needs Female. Set once — changing later locks Girls Corner for 30 days. Misuse = suspend."
- On `409/429` show server message verbatim.

**3) Upload (MOST VISIBLE — per requirement):**
- New Step "Who can see & chat?" — big 2-card selector (NOT tiny checkbox):
  - `[ Everyone ]` (default) — "Anyone in [Campus] can find & message."
  - `[ Girls Only 🌸 ]` (pink border, recommended for girls) — "Only girls in [Campus] will see this. Boys won't find it in search, category, or chat."
- If `user.gender!=='female'`: Girls card disabled + tooltip "Set gender to Female in Settings" + link.
- Preview + success screen reiterates choice. Edit listing can flip `true→false` freely; `false→true` re-checks female.
- Payload: `isGirlsOnly` boolean.

**4) Home / Explore / Category — Girls Corner tab:**
- Tabs: `[ All | Girls Corner 🌸 ]` next to existing `condition/sort` controls (`sort=latest|price_low|high|recommended`, infinite scroll preserved).
- Visibility:
  - Girl (`gender==female`): both tabs work. `audience=girls_only` API call on second tab.
  - Boy / `other` / logged-out: Girls tab shows lock illustration + copy: "Girls Corner is a girls-only space. Only accounts set as Female can view." + (if logged-in non-female) no CTA to fake; (if logged-out) "Login as a girl account" + link.
- Card badge: `🌸 Girls Only` pill on `ProductCard` ONLY in girls view (boys never see card at all).
- Campus scoping: reuse `useCampus().campusSlug` — Girls Corner is per-campus.

**5) ProductDetail (`ProductDescription.jsx:839`):**
- If `product.isGirlsOnly` → show badge + banner "🌸 Girls-only listing — only girls can chat."
- Chat button logic:
  - Female viewer, not own product → normal `Link /chat?seller=..&product=..` → `createConversation(productId)`.
  - Female with `gender==null` → button → modal "Set gender to Female in Settings to chat."
  - Male/other/logged-out → hide button, show notice (no deep-link).
  - Own product → existing self-chat guard.

**6) Chat (`Chat.jsx:369`, `useChatSocket.js`, `chatApi.js`):**
- `?product=` → `createConversation()` — catch `403 GIRLS_ONLY_PRODUCT` → toast "This is a girls-only listing." + redirect to product page.
- Thread list: 🌸 icon if `product_snapshot.isGirlsOnly` (populate it in `GET /conversations` — add `isGirlsOnly` to `product_snapshot` select).
- `MessageBubble` profanity placeholder + `ReportUserModal` (add `Fake gender to access Girls Corner` reason) unchanged otherwise.

---

## 7. Privacy & Security (must-read)

- NEVER render seller `gender` publicly. Only `isGirlsOnly` badge. `otherParty{name,avatar,subscription}` population MUST NOT include `gender`.
- `pickup_address_snapshot{address_line,city,state,pincode,mobile}` — safe because boys can't fetch the product at all.
- Deep XSS / NoSQL guards, Helmet, CORS, rate-limits (`60 msg/min`, `120 list/min`, `20 reports/h`) — unchanged, still apply.
- Anti-enumeration: boys probing IDs get `404`, not `403`.
- Logs: don't log gender changes with PII beyond existing user audit.

---

## 8. Edge Cases — Exhaustive (test all)

| # | Case | Expected |
|---|------|----------|
| 1 | Boy guesses girls-only product URL | 404 PRODUCT_NOT_FOUND |
| 2 | Logged-out opens girls-only URL | 404 + login prompt (no leak) |
| 3 | Boy calls `POST /conversations {girlsOnlyProductId}` directly | 403 GIRLS_ONLY_PRODUCT, no thread/Deal created |
| 4 | Girl with `gender=null` opens Girls Corner | Lock screen + Set-gender CTA |
| 5 | `other` gender opens Girls Corner | Same lock as boys (documented) |
| 6 | Boy searches exact girls-only title | Excluded from `/search` + `/search-suggestions` |
| 7 | Girls-only + boosted — does boy see in `/boosted` or Home carousel? | No. Filter applies to boosted too |
| 8 | Girl creates `isGirlsOnly=true`, then changes gender to male | Blocked 409 until she unlists/deletes all girls-only active listings |
| 9 | Girl flips gender male→female repeatedly to stalk | 30-day cooldown (429) blocks rapid flip |
| 10 | Seller female at creation, admin later sets seller male | Existing listings stay but new chat blocked; nightly job auto-unlists (recommended) |
| 11 | Buyer female at chat creation, later changes to male | Existing thread persists (grandfathered); new messages allowed but reportable. Documented. |
| 12 | Cross-campus girl tries `audience=girls_only&campus_slug=other` | CAMPUS_MISMATCH (existing) |
| 13 | Wishlist girls-only product as girl, then gender changed | Wishlist entry stays but detail 404s with explanation; remove CTA |
| 14 | Report dedup (`reporter+target` unique partial) on fake-gender | Second report same target → 409 already-reported (existing) — allow different reporters |
| 15 | Profanity/cooldown in Girls Corner | Same `screenText()` + `ChatCooldown 7/24h→5m` + `429 CHAT_COOLDOWN` |
| 16 | Draft with `isGirlsOnly=true` | Allowed; guard re-checked on publish |
| 17 | Edit `everyone→girls-only` | Re-check female; else 403 |
| 18 | Edit `girls-only→everyone` | Always allowed (widening) |
| 19 | Delete/sold/unlist/relist girls-only | Same as normal; relist re-checks female |
| 20 | Notifications for girls-only (price drop, chat) to boys | Never sent (no product visibility → no trigger) |
| 21 | Admin list (`GET /admin/users`, `/admin/products`) | Show `gender`, `genderSource`, `isGirlsOnly` for moderation |
| 22 | Analytics: counting girls-only without leaking | Aggregate only, no per-user exposure |
| 23 | `isGirlsOnly` in `product_snapshot` for old threads | Missing → treat as `false` (backward compat) |
| 24 | ImageKit URLs guessed by boys | Images are CDN-public by design; title/price/contact stay hidden — acceptable, document |
| 25 | SEO / sitemap including girls-only URLs | Exclude `isGirlsOnly=true` from sitemap/SSR |
| 26 | Accessibility: pink-only signaling | Badge has text "Girls Only", not color alone |
| 27 | Dark mode (Tailwind class-based) | Girls cards meet contrast in both modes |
| 28 | i18n future | All new strings in one copy file (see Appendix) |
| 29 | Load: new index | `{campus_id, isGirlsOnly, status, createdAt}` prevents collection scan |
| 30 | Abuse: boy sets gender female day-1 | Allowed technically; caught via fake-gender reports → suspend. Document as accepted MVP risk. |
| 31 | Seller deletes account with active girls-only listings | Same as existing `deleteAccount`: listings unlisted, sessions revoked |
| 32 | Seller blocked/suspended with girls-only listings | Same as existing suspension: listings hidden, chat read-only |
| 33 | Buyer blocked mid-thread in Girls Corner | Existing participant check returns 403/404; no new logic |
| 34 | Race: two girls create conversation same product simultaneously | Existing `findOne||create` + unique `[buyer+seller+product]` idempotent — no duplicate |
| 35 | QA/staging insert of `isGirlsOnly` without `sellerGenderSnapshot` | Treat missing snapshot as `false` in reads; backfill script sets snapshot where seller is female |

---

## 9. Testing Checklist (must pass before merge)

**Backend (vitest/jest or manual curl):**
- [ ] Non-female `POST /product {isGirlsOnly:true}` → 403
- [ ] Female create → `sellerGenderSnapshot=='female'`, visible in `audience=girls_only`
- [ ] Boy `GET /?campus_slug=X` excludes girls-only count
- [ ] Boy `GET /:girlsOnlyId` → 404; girl same campus → 200
- [ ] Boy `POST /conversations` → 403 + no Conversation/Deal doc
- [ ] Gender change within 30d → 429; with active girls-only → 409
- [ ] `PUT updateProfile` returns new gender; `userProfile` includes it

**Frontend (manual):**
- [ ] Upload toggle disabled state for boys, enabled for girls
- [ ] Tabs switch API param correctly (Network tab: `audience=girls_only`)
- [ ] Lock screen for boys/logged-out, no data fetch leak
- [ ] ProductDetail hides chat for boys, shows for girls
- [ ] Chat 403 toast + redirect, no crash on socket poll (12s) + `message:new/delivered/read`
- [ ] Report modal shows fake-gender reason, `desc>=10char` enforced

---

## 10. Rollout & Metrics

1. Merge behind NO flag (additive field, safe). Announce as "🌸 Girls Corner (Beta)".
2. Seed empty-state illustration + 3 FAQ lines.
3. Metrics: `% girls listings marked girls-only`, `Girls Corner tab CTR`, `chat-create 403 rate`, `fake-gender reports`, `retention of female sellers`.
4. Rollback: set tab hidden via frontend env; backend guards stay (harmless).

---

## 11. Out of Scope (Phase-2/3 — do NOT build now)

- Account-level "Only girls can message me on ALL listings"
- True user Block/Mute (LegalDocuments mentions "Use block…" but unimplemented — needs `Block.model`)
- Phone masking until deal confirmed
- College-ID upload / People-API `genderVerified` badge
- `other`-gender access policy review

---

## 12. Appendix — Copy Strings (use verbatim for consistency)

- Upload card: "Who can see & chat?" / "Everyone" / "Girls Only 🌸"
- Upload hint: "Only girls in {campus} will see this. Boys won't find it in search or chat."
- Lock screen: "Girls Corner is a girls-only space 🌸 Only accounts set as Female can view listings here."
- Detail banner: "🌸 Girls-only listing — only girls in {campus} can chat with the seller."
- Chat blocked toast: "This is a girls-only listing. Only girls can start this chat."
- Settings note: "Set once. Changing gender later locks Girls Corner for 30 days. Faking gender to enter Girls Corner leads to instant suspension."
- Report reason label: "Fake gender to access Girls Corner"

---

## 13. File Inventory (for PR)

**Backend:** `models/User.model.js`, `models/Product.model.js`, `models/Report.model.js`, `validations/product.validation.js`, `validations/user.validation.js`, `services/product.service.js`, `services/conversation.service.js`, `services/user.service.js`, `controllers/product.controller.js`, `controllers/user.controller.js`, `controllers/conversation.controller.js`, `routes/product.routes.js`, `routes/user.routes.js`, `routes/conversation.route.js`

**Frontend:** `features/auth/pages/Signup.jsx`, `features/user/pages/Settings.jsx`, `features/product/pages/Upload.jsx`, `features/product/pages/Home.jsx`, `features/product/pages/Explore.jsx`, `features/product/pages/Category.jsx`, `features/product/pages/ProductDescription.jsx`, `features/product/components/ProductCard.jsx`, `features/product/api/productApi.js`, `features/chat/pages/Chat.jsx`, `features/chat/services/chatApi.js`, `features/chat/components/ReportUserModal.jsx`, `context/UserContext.jsx`

End of spec — build Phase-1 exactly as above. No further planning needed.
