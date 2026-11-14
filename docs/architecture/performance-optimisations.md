# Optimisation log

Goal: make every interaction feel instant, and cut DB calls and infra load so the product runs comfortably on basic DB and server plans.

Each item lists **what changed**, **why**, and **where**.

---

## 1. Backend: fewer DB calls

### 1.1 Cached auth user (largest single saving)
- **Before:** `auth()`, `optionalAuth()` and the socket handshake all ran `User.findById()` on **every request**. This was the most frequent query in the app; a page load with 4–6 API calls meant 4–6 user lookups.
- **Now:** a short-lived in-process cache (30s TTL, at most 5,000 users) serves the auth user. Repeat requests from the same user cost **0 DB reads**.
- **Safety:** User model middleware evicts a user's cache entry on every write path (`save`, `updateOne`, `findOneAndUpdate`, `findByIdAndUpdate`, replace/delete). It clears the whole cache on `updateMany` / `deleteMany` / `bulkWrite`. Logout, password reset, suspension, plan or gender changes therefore take effect **immediately**. The TTL only bounds staleness if you later run several server instances.
- **Tuning:** `USER_CACHE_TTL_MS` env var (default `30000`).
- **Files:** `backend/src/utils/userCache.js` (new), `backend/src/models/User.model.js`, `backend/src/middlewares/auth.middleware.js`, `backend/src/sockets/index.js`.

### 1.2 Feed and search: count and price-range queries cached
- **Before:** every `/api/product` call ran **3 aggregations**: the page itself, a total count and the min/max price. Infinite-scroll pages 2, 3, … re-ran the count and price queries each time. Search ran 2 per call.
- **Now:** count (30s) and price bounds (60s) are cached per exact filter, with in-flight de-duplication, so 20 students opening the same campus feed at once trigger one aggregation. In steady state, feed calls go from 3 aggregations to about 1.
- **Files:** `backend/src/utils/ttlCache.js` (new), `backend/src/services/product.service.js`.

### 1.3 Smaller feed payloads
- **Seller join:** `$lookup` into `users` now uses a sub-pipeline that projects only `name`, `avatar` and `subscription`. Before, it pulled each seller's whole document (wishlist, gamification, badges) for every card.
- **Description dropped:** `description`, the largest listing field, is no longer sent in feed responses. Cards never render it; the detail page still fetches it.
- **File:** `backend/src/services/product.service.js`.

### 1.4 Boosted rail cached
- The Home "boosted" rail query (`find` + `populate`) runs on every Home view. It is now shared per campus and audience for 30s.
- **File:** `backend/src/services/product.service.js` (`getBoostedProducts`).

### 1.5 Campus resolution cached
- **Before:** `resolveRequestCampus` ran `Campus.findById` or `findOne({slug})` on **every** feed, search and detail request.
- **Now:** campus docs are cached by id and slug for 5 min. The cache is cleared on any admin create, update or delete of a campus (the existing `invalidateCampusCache()`).
- **File:** `backend/src/services/campus.service.js`.

### 1.6 Cheap chat unread-count endpoint
- **Before:** the navbar badge called the full conversations list (up to 200 conversations, 3 populates and a Deal query) every 30s per open tab, just to read one number.
- **Now:** a new endpoint, `GET /api/conversations/unread-count`, runs one indexed aggregation that returns only the sum.
- **Files:** `backend/src/services/conversation.service.js` (`getUnreadTotal`), `backend/src/controllers/conversation.controller.js`, `backend/src/routes/conversation.route.js`.

### 1.7 Missing indexes added
| Collection | Index | Query it fixes |
|---|---|---|
| conversations | `{ buyer_id: 1, last_activity_at: -1 }`, `{ seller_id: 1, last_activity_at: -1 }` | Chat list and unread badge. The seller side was a collection scan. |
| boosts | `{ status: 1, expires_at: 1 }` | Boost-expiry cron every 10 min. |

- **Files:** `backend/src/models/conversation.model.js`, `Boost.model.js`.
- **Correction:** an extra `notifications.scheduled_at` index was briefly added here too. Testing showed the field was already indexed (`index: true`), so Mongoose skipped the duplicate, and it was removed.
- **Note:** Mongoose builds new indexes on server start (`autoIndex`). On Atlas you can also confirm them under Collections → Indexes.

### 1.8 Already in place (verified, unchanged)
- `compression` (gzip) on responses.
- `.lean()` on read queries.
- Campus directory `Cache-Control`.
- Trending cache (10 min).
- View-count anti-farm cooldown.
- Bounded pagination (`limit ≤ 50`, `page ≤ 1000`).
- Campus-first compound indexes on products.
- Connection pool of 10, which is safe for Atlas M0/M2 connection limits.

---

## 2. Frontend: fewer requests and real-time traffic

### 2.1 Chat polling backs off while the socket is live
- **Before:** an open chat polled **2 endpoints every 5s** (messages and deal), plus the list every 12s, even with a healthy WebSocket.
- **Now:**
  - The thread is polled every 30s and the list every 60s while the socket is connected.
  - Polling drops back to 5s and 12s only when the socket is down.
  - On reconnect, one immediate catch-up fetch runs.
  - About **6x fewer** chat requests per open chat tab.
- **File:** `frontend/src/features/chat/pages/Chat.jsx`.

### 2.2 One shared unread-badge poller
- **Before:** the Header and the Profile sidebar each polled the conversations list every 30s and on every window focus, which doubled requests on profile pages. Background tabs polled forever.
- **Now:**
  - A single store serves all subscribers and polls every 45s.
  - Nothing is fetched while the tab is hidden, and focus and visibility events are de-duplicated (5s minimum gap).
  - It uses the new cheap endpoint and falls back to the old one if the backend isn't redeployed yet.
  - Opening a chat refreshes the badge once. The Header's messages dropdown publishes its fresh total, so no extra request is needed.
- **Files:** `frontend/src/services/chatUnread.js` (new), `components/layout/Header.jsx`, `features/user/components/Profile_left_part.jsx`, `features/chat/pages/Chat.jsx`.

### 2.3 Notification re-sync throttled
- **Before:** every page load fetched notifications twice: on mount, then again on socket `connect`. Every tab switch refetched too.
- **Now:** re-syncs (connect or visibility) are skipped if a sync happened in the last 30s. Live items still arrive instantly over the socket.
- **File:** `frontend/src/context/NotificationContext.jsx`.

---

## 3. Frontend: pages open instantly

### 3.1 Route code prefetching
- **Before:** each page's JS chunk downloaded only **after** you clicked, which caused the noticeable pause when opening a page.
- **Idle warm-up:** about 1s after first render, when the browser is idle, it downloads the chunks people open next: Explore, Category, Product, Search, Chat, Wishlist, Notifications and Profile. It loads one chunk per idle slot and skips this on Data Saver or 2G.
- **Intent prefetch:** one delegated listener covers every link in the app.
  - Hovering a link (with an 80ms intent delay), touching it on mobile or focusing it with the keyboard starts loading that page's code.
  - The click then lands on already-downloaded code.
- **Shared downloads:** a prefetch and the real render share one download, and failed chunk loads can retry.
- **Files:** `frontend/src/app/routes.jsx` (`page()`, `prefetchRoute`, `CORE_ROUTES`), `frontend/src/app/usePrefetch.js` (new), `frontend/src/app/App.jsx`.

### 3.2 Product data prefetch on hover or touch
- Hovering or touching a product card also warms that product's detail data, so the product page usually renders from cache with no skeleton.
- **File:** `frontend/src/app/usePrefetch.js` → `prefetchProduct()` in `productApi.js`.

### 3.3 Client response cache for reads
- A small in-memory cache with in-flight de-duplication now covers:

  | Endpoint | Cached for |
  |---|---|
  | Feed, boosted rail, search | 45s |
  | Product detail | 30s |
  | Search suggestions | 60s |
  | Trending | 5 min |

- Back/forward navigation and reopening a page render instantly, with no repeat API call.
- Identical concurrent requests (hover-prefetch plus click, or two components asking at once) share one network call.
- **Correctness:**
  - Failures are never cached.
  - Every product mutation (create, edit, draft, delete, unlist, relist, mark sold, boost) clears the product cache.
  - The edit page and the post-boost refresh force a fresh fetch.
  - The whole cache resets when the user, campus, gender or role changes (login, logout, campus switch), and on session expiry or account block.
- **Files:** `frontend/src/services/requestCache.js` (new), `features/product/api/productApi.js`, `features/search/api/searchApi.js`, `context/useUserContext.jsx`, `features/user/components/OrderCard.jsx`, `features/product/pages/ProductListing.jsx`.

### 3.4 API connection opened early
- The API runs on its own origin. A `preconnect` to it is injected at boot, so DNS, TCP and TLS are ready before the first `/api` call. This saves roughly 100–300ms on first load, especially on mobile networks.
- **File:** `frontend/src/app/main.jsx`.

### 3.5 Responsive card images
- **Before:** every card downloaded the 800px ImageKit variant, although cards render at about 170–330px.
- **Now:** `srcSet` offers 320, 480 and 640px variants with matching `sizes`, so the browser picks by screen size and pixel density. That's about 3x fewer image bytes per card on phones, faster feed paint and lower ImageKit bandwidth. The error fallback also clears `srcset`.
- **Files:** `frontend/src/utils/imageTransform.js` (`ikCardSrcSet`), `features/product/components/ProductCard.jsx`.

---

## 4. Expected impact, per active user

| Area | Before | After |
|---|---|---|
| User lookup on every API call | 1 DB read per request | ~0 (cache hit) |
| Campus lookup on feed, search, detail | 1 DB read per request | ~0 |
| Feed page (incl. infinite scroll) | 3 aggregations | ~1 |
| Unread badge | Full list query ×2 components every 30s, hidden tabs included | 1 tiny aggregation every 45s, visible tabs only |
| Open chat | 24 requests/min | ~4 requests/min while the socket is live |
| Revisit a page within 45s | Full refetch + skeleton | Instant, 0 requests |
| Open a page | Download JS after click | JS already downloaded (idle/hover) |
| Card images on mobile | 800px | 320–480px |

---

## 5. Notes and next steps (not done; only worth it at higher scale)
- **Multiple server instances:** the in-process caches (user, campus, feed meta) are per instance. With several instances, swap `utils/ttlCache.js` / `utils/userCache.js` for Redis (Upstash has a free tier), or keep the short TTLs, which stay correct within 30–60s.
- **Socket.IO across instances:** this would need `@socket.io/redis-adapter`.
- **CDN:** serve the built frontend through a CDN (Vercel or Netlify do this by default) with long-cache hashed assets.
- **Monitoring:** check Atlas "Performance Advisor" after a week of real traffic for any further index suggestions.
