# Admin routes: correctness and performance pass (Nov 2026)

**Date:** 2026-11-22
**Scope:** every route under `/api/admin` (`backend/src/routes/admin.routes.js`), plus the services, models and middleware behind them.
**Goal:** keep every admin feature working while making the admin console cheap on the database, so staff use never slows the marketplace down for students.
**Verification:**
- All backend suites pass (`npm test`).
- The admin, access, analytics and campus-limit suites were rerun after each change.
- The old and new dashboard code were run side by side on random data, with and without campus limits and permission differences. The numbers matched exactly (see [Dashboard](#4-dashboard-26-queries-down-to-10)).

Related earlier docs: [2026-11-db-and-jobs-optimisation.md](2026-11-db-and-jobs-optimisation.md), [architecture/performance-optimisations.md](../architecture/performance-optimisations.md).

---

## Summary

| Route | Problem | Fix | Effect |
|---|---|---|---|
| `GET /admin/orders` | Loaded **every deal** with buyer, seller and listing into server memory, then filtered and paged in JavaScript. | Filtering, search and paging run in MongoDB; only the requested page is loaded. | Server memory and DB reads now scale with the page size, not the number of deals. |
| `GET /admin/orders?search=` / `?campus=` | First rewrite still joined each deal to 3 collections before filtering. | Semi-join: resolve matching people, listings and conversations through indexes, then a plain indexed deal query. | 2,145 ms → about 70 ms at 3,000 orders. |
| `GET /admin/products` | Seller lookup and open-report count ran for **every matching listing** before paging, and the report count had no index. | Lookups run only for the 5–50 rows on the page. Seller search resolves matching accounts first. | 4,980 ms → about 90–200 ms at 6,000 listings. |
| `GET /admin/users` | Listing count and campus looked up for **every matching user** before paging. | Lookups run only for the rows on the page. | 991 ms → about 40–60 ms at 3,000 users. |
| `GET /admin/dashboard` | 26 separate queries per load, holding most of the DB connection pool. Cold load about 1.2 s on Atlas. | One pass per collection with conditional sums (10 queries), plus a 30 s cache. | Cold load much faster; repeat loads about 2 ms with 0 queries. |
| `GET /admin/access` | Not cached, and called 2–4 times per page. Admin view ran its queries in two rounds, one after the other. | Queries run in parallel; result cached per staff member. | 47–197 ms → about 2 ms on repeat. |
| `GET /admin/attention`, `/users/stats`, `/orders/stats`, `/analytics/*` | Recomputed on every request and every poll. | 30 s cache shared by identical requests. | Repeat loads about 2 ms with 0 queries. |
| Reports by item (admin drawers, moderation actions, **student report flow**) | No index on `target_id`: every lookup scanned the whole reports collection. | New index `{ target_id, target_model, status }`. | Index scan instead of a full scan, for students as well as staff. |

The before and after timings come from a seeded in-memory MongoDB (3,000 users, 6,000 listings, 3,000 orders). The gap grows as real data grows.

---

## 1. Orders list: `services/admin.order.service.js`

**Before:** `getAdminOrders` ran `Deal.find(filter)` with **no limit**, populated the conversation, buyer, seller and listing for each deal, then applied the campus limit, campus filter and search in JavaScript, and finally sliced out one page. Every page view read the whole deals collection and held it in Node memory, which blocks the event loop for every other request. It also read the whole campus directory on each call to map campus names.

**Now:**
- **No search, campus filter or campus limit:** a straight `countDocuments` plus `find().sort({ createdAt: -1 }).skip().limit()` on the new `createdAt` index. Only that page is populated.
- **Campus limit or campus filter:** `conversationsOnCampuses()` finds the users on those campuses, then the conversations where they are buyer or seller (both fields indexed). Deals are filtered on `conversation_id`. This is the same buyer-or-seller rule as `campusScope.dealScopeStages`.
- **Search:** matching users (name or email) and listings (title) are resolved first, capped at 500 each (`MAX_SEARCH_MATCHES`). Then their conversations are found, including the stored `product_snapshot.title` for deleted listings. Order numbers work as shown in the UI (`#ORD1A2B3C`) or as any part of the raw id.
- **Campus filter by name** resolves to campus ids first; an unknown name returns an empty page immediately.
- **Campus names** are read only for the campuses on the returned page.
- **Shared row builder:** the list and the order detail (`getAdminOrderById`) now share one builder, `toOrderRow()`, instead of two copies of the same 80 lines.

**Behaviour change:** the **Unpaid** filter now matches `payment_confirmed.is_confirmed != true`, so older deals with no payment flag at all are included. Before, they were missing from both the Paid and Unpaid lists.

## 2. Listings list: `services/admin.product.service.js`

**Before:** the pipeline joined **every** matching listing to its seller, so that search could match seller names. It then counted pending reports for every listing (with no usable index), and only then sorted and paged.

**Now:**
- **Search:** sellers matching the name or email are found first (capped at 500, `MAX_SEARCH_SELLERS`). The listing match is then `title`, `category` or `seller_id` in that set, plus an exact listing or seller id.
- **Order of work:** filter → indexed sort → `$facet`. The seller and open-report lookups run inside the page branch only, with projected fields.
- **Status tabs:** the per-status counts now use the same match, with no joins.
- **Needs review filter:** "auto-hidden" uses `auto_hidden_at: { $type: "date" }`, which can use the index (`$ne: null` could not).

## 3. Users list: `services/admin.user.service.js`

**Before:** every matching user got a listing-count lookup and a campus lookup before the sort and page.

**Now:** filter → indexed sort (`{ role, createdAt }`) → `$facet`. The listing-count and campus lookups run only for the page's rows, using `localField`/`foreignField` lookups (index-backed) with projected fields. The response shape is unchanged.

## 4. Dashboard: 26 queries down to 10

`services/admin.service.js`, `getDashboardMetrics`

**Before:** each number on the dashboard was its own query: 4 user counts, 2 new-user counts, 3 listing counts, 2 new-listing counts, 3 completed-deal counts, 3 GMV sums, 3 revenue sums, plus reports, gender requests, jobs, campuses, users-by-campus and recent activity. All 26 ran at once. With Atlas and a pool of 20 connections, that queued other requests, which is why `attention` once showed 1.2 s in the logs.

**Now:** one aggregation per collection, using conditional sums:

| Rollup | Numbers it produces |
|---|---|
| Users | total, active, suspended, inactive, new this month, new same days last month |
| Listings | listed, blocked, auto-hidden, new this month, new last month |
| Completed deals | count, GMV, and this month vs last month for both (date = `completed_at`, or `updatedAt` for legacy rows) |
| Verified payments | total revenue, this month vs last month (date = `verified_at`, or `createdAt`) |

Reports, gender requests, failing jobs, campuses, users-by-campus and recent activity stay separate (they read other collections). The active-campus count and the users-by-campus rows now share one campus read, where before there were two.

**Checked:** the old and new functions were run against the same random data (users, listings, deals and payments spread over 75 days, with null `completed_at`/`verified_at`). They were compared with no campus limit, one campus and two campuses, each with full and partial permissions. `stats` was identical in all 6 cases.

## 5. Access overview: `GET /admin/access`

`services/access.service.js`, `controllers/admin.access.controller.js`

- **Parallel queries:** `getAccessOverview` now runs the support policy, the caller's access, the support staff list and the campus list in parallel. Before, they ran in sequence.
- **Cache:** the result is cached per staff member (`access:<userId>:<role>`) for 30 s. Concurrent calls share one query, so the 2–4 calls the admin frontend makes per page cost one computation.
- **Freshness:** any admin write clears it, including access edits, role changes and campus edits.

The admin frontend (not in this repo) requests `/access` several times when a page opens. Loading it once in the admin app and sharing it across pages would remove the extra requests completely.

## 6. Summary-count cache: `utils/adminStatsCache.js` (new)

`cachedAdminStat(key, fn)` caches the result of `fn` per key:
- **TTL:** `ADMIN_STATS_CACHE_MS`, default 30,000 ms; `0` disables it. It is off under `NODE_ENV=test` unless set.
- **Shared in-flight queries:** concurrent requests for the same key share one query, so a burst of tabs can't stampede the DB.
- **Bounded:** at most 500 entries; the oldest is evicted first.
- **Failures:** errors are never cached.
- **No stale write-back:** a result that finishes after a clear is not written back.

**Keys include the caller's view** (`viewKey(scope, permissions)`): their campus limit and the sections they can see. Two staff members with different access never share an entry.

**Used by:**

| Route | Key |
|---|---|
| `GET /admin/dashboard` | `dashboard:<view>` |
| `GET /admin/attention` | `attention:<view>` |
| `GET /admin/users/stats` | `userStats:<campuses>` |
| `GET /admin/orders/stats` | `orderStats:<campuses>` |
| `GET /admin/analytics/trends`, `/breakdown`, `/jobs` | `analytics:<name>:<view>:<query>` |
| `GET /admin/access` | `access:<userId>:<role>` |

**Cleared on staff writes:** `admin.routes.js` registers a router middleware. Any successful (status < 400) non-GET request under `/api/admin` clears the whole cache when the response finishes. Whoever suspends a user, resolves a report or edits a campus sees the result straight away. Marketplace activity (new sign-ups, listings, deals) shows up within the TTL.

Not cached, so they are always live: the lists (users, listings, orders, moderation queue, audit log, gender requests) and every detail drawer.

## 7. Indexes added

| Collection | Index | Serves |
|---|---|---|
| `reports` | `{ target_id: 1, target_model: 1, status: 1 }` | Auto-hide threshold count when a student reports a listing; user/listing drawers; moderation dismiss/resolve; campus-limit checks on support tickets; the open-report count on the listings page |
| `users` | `{ role: 1, createdAt: -1 }` | Admin users page (newest first); new-user counts |
| `products` | `{ is_deleted: 1, createdAt: -1 }` | Admin listings page (newest first); new-listing counts |
| `deals` | `{ createdAt: -1 }` | Admin orders page (newest first); order counts by date |

The `reports` index is the most important. Before it, every student report on a listing scanned the whole reports collection to count pending reports for the auto-hide threshold.

## 8. Smaller fixes

- **Listing detail drawer:** `getProductDetails` ran 3 queries one after another (listing, report count, recent reports); they now run in parallel.
- **Auto-hidden counts:** `$ne: null` became `$type: "date"` on the dashboard, the `attention` badges and the listings "Needs review" filter. It matches the same rows and can use the index.
- **Dashboard campuses:** the active-campus count and the users-by-campus list share one campus read.

---

## Unchanged and already fine

- **Auth and access checks:** `auth` uses the cached auth user, and `requireAccess` / `attachAccess` read the access policy from its own 15 s cache. Each guarded request costs no extra DB reads in the common case.
- **Rate limits:** the admin rate limits are unchanged. That covers login, refresh, password change, bulk actions, analytics, user deletion, and the shared 240/min read ceiling.
- **Already-efficient routes:** the moderation queue, audit log, job runs and gender requests were already paginated and index-backed.
- **304 responses:** the `304` lines in the dev logs are normal ETag revalidations: the browser already has the data.

## Known limits / next steps

- **Campus-limited support staff:** their dashboard, order stats and report counts still use `campusScope` join stages (one lookup per deal or report). They are cached now, so they don't load the DB on repeat. The full fix is to store the campus on each deal at creation.
- **Very large campuses:** the campus filter on orders passes the campus's user and conversation ids to MongoDB as a list. That is fine at current sizes; at hundreds of thousands of users per campus, denormalising campus onto deals (above) is the better fix.
- **Search caps:** seller and order search match at most 500 people or listings. Only a very generic search (for example a single letter) would reach the cap.

## Deploy notes

- **Index builds:** the new indexes build automatically on server start (Mongoose `autoIndex`). On a large production database you can build them ahead of the deploy with `node scripts/indexes.mjs`.
- **New optional env var:** `ADMIN_STATS_CACHE_MS` (default `30000`).

## Files changed

- `backend/src/routes/admin.routes.js`: clears the cache on staff writes
- `backend/src/utils/adminStatsCache.js` (new)
- `backend/src/controllers/admin.controller.js`, `admin.access.controller.js`, `admin.analytics.controller.js`, `admin.user.controller.js`, `admin.order.controller.js`: caching
- `backend/src/services/admin.order.service.js`: orders list and detail rewrite
- `backend/src/services/admin.product.service.js`: listings list rewrite
- `backend/src/services/admin.user.service.js`: users list rewrite
- `backend/src/services/admin.service.js`: dashboard rollups, parallel listing detail
- `backend/src/services/access.service.js`: parallel access overview
- `backend/src/models/Report.model.js`, `User.model.js`, `Product.model.js`, `deal.model.js`: indexes
