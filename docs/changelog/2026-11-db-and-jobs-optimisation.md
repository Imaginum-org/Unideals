# Database, query and background-job optimisation (Nov 2026)

A full pass over the backend for wasted database calls, slow query shapes, missing or redundant indexes, and background jobs, aimed at running comfortably at a decent user scale and on more than one server instance.

This builds on [architecture/performance-optimisations.md](../architecture/performance-optimisations.md), which covers the earlier caching work: the cached auth user, cached feed counts and price bounds, the boosted-rail cache and the lean card projections. That earlier work was reviewed again and left in place.

**Tests:** all 17 backend suites pass (`npm test`). The new suite `tests/performance.integration.test.mjs` (`npm run test:performance`) covers every behaviour change below.

---

## Summary

| Area | Problem | Fix | Effect |
|---|---|---|---|
| Background jobs | Every API instance ran every job, so N instances meant N runs (including the every-minute push sender). | Cross-instance lease on the job's state document, plus a `RUN_JOBS=false` switch. | Each job runs once per tick, however many instances. |
| Boost quota and create | Every quota read ran 2 collection-wide `updateMany` scans. | Removed; reads already filter on expiry, and the job tidies statuses. | −2 full-collection writes per boost page view. |
| Subscription expiry | 2 writes per expiring user, in a loop. | 2 bulk writes plus 1 guard query, whatever the count. | A semester boundary costs 3 queries, not 2×N. |
| Nightly purge jobs | Unbounded `find`. The orphan sweep `$lookup`-ed every product against users. | Batches of 500. Orphans found via `distinct(seller_id)` from the index. | Bounded memory; no nightly full join. |
| Girls Corner sweep | Loaded every live girls-only listing. | `distinct` sellers, then 1 user query, then 1 `updateMany`. | 3 small queries. |
| Badge recompute | About 10 queries per call, full Mongoose docs, user read twice, OG check counted all older users. Fired on every listing edit. | Lean reads, one user read, OG count capped at 100, bursts coalesced. | Fewer, cheaper recomputes. |
| Main feed | Every page request scored every live listing on the campus. | 15s shared page cache for non-search pages, cleared on any listing write. | Repeat pages cost 0 aggregations. |
| Chat inbox | Fetched products and deals for up to 200 threads to show 30; filtered empty threads in JS. | Products and deals for the returned page only; empty threads filtered in Mongo. | Much smaller queries and payload per inbox load. |
| Chat send and load | Re-read the sender / reader from the DB on every message. | Use the cached auth user. | −1 query per message sent and per thread load. |
| Notification feed, leaderboard | Re-read the user just loaded by auth. | Use the cached user / `req.user`. | −1 query each. |
| Profile | Users who never listed ran 2 backfill queries on every profile load, forever. | Check once per user per process. | −2 queries per profile load. |
| Indexes | Missing for thread paging, trending, leaderboard and job filters. 8 redundant single-field indexes slowed every write. A non-sparse unique `slug` index. | 7 indexes added, 8 removed, `slug` made sparse, audit script added. | Index-backed hot paths; cheaper writes. |
| Connection pool | Fixed at 10, no warm sockets. | Configurable (`MONGO_MAX_POOL`, default 20; `MONGO_MIN_POOL`, default 2), idle sockets released. | Better burst handling; tunable per tier. |

---

## 1. Background jobs

### 1.1 Jobs ran once per server instance
**File:** `backend/src/jobs/jobRegistry.js`, `backend/src/models/JobRun.model.js`

- **Problem:** `node-cron` runs inside every API process, and the only overlap guard was an in-memory `Set`. With 2+ instances behind a load balancer, every job ran on each one:
  - scheduled push notifications would be sent repeatedly;
  - nightly purges, subscription expiry and payment expiry would run several times.
- **Fix:** before a run, the instance claims a **lease** on the job's `JobState` document.
  - **One atomic write:** the claim is a single `findOneAndUpdate` with upsert, and it also replaces the old "mark running" write, so it adds no extra round trip.
  - **Lease length:** 2 minutes for frequent jobs, 30 minutes for the rest. A crashed instance's lease simply expires.
  - **Duplicate ticks:** after a run the lease is held for another 30s, so an instance whose cron fires a moment later for the same minute skips it.
  - **Staff "Run now":** may skip that short hold (to retry a failure, say), but never a run that is actually in progress on another server.
- **`RUN_JOBS=false`** turns scheduling off on an instance, if you prefer a dedicated worker.

### 1.2 Boost expiry was running on read paths
**File:** `backend/src/services/boost.service.js`

`getBoostSummary` (the boost quota card) and `createBoost` both called `expireStaleBoosts()` first. That is two `updateMany` calls across the whole `boosts` and `products` collections, made **on every page view**. Every quota count already filters on `expires_at > now`, and `createBoost` checks the listing's own `boost_expires_at`, so the global sweep added nothing. It now runs only in the 10-minute `expire-boosts` job.

### 1.3 Subscription expiry: bulk instead of per-user
**File:** `backend/src/services/subscription.service.js`

- **Before:** a loop with one `Subscription.updateOne` and one `User.updateOne` per expired plan.
- **Now:** one `Subscription.updateMany`, a `distinct` query to find users who renewed in the meantime, and one `User.updateMany` for the rest.
  - The renewal check closes a race the old loop also had: someone who renews while the job is running is never downgraded.
  - Lifetime and admin rules are unchanged.

### 1.4 Nightly purge jobs: batched, no full join
**File:** `backend/src/jobs/cleanupDeletedProducts.job.js`

- **Deleted listings and stale drafts** are purged in batches of 500, up to 40 batches a night, instead of loading every match at once. The images, wishlist pulls and report cleanup per batch are unchanged.
- **Orphan listings** (seller account gone):
  - **Before:** a `$lookup` of **every product** against `users` every night.
  - **Now:** `Product.distinct("seller_id")` (answered from the index), then a batched check of which of those users still exist.
- The `User` and `Report` models are imported normally instead of with dynamic `import()` on each run.

### 1.5 Girls Corner sweep
**File:** `backend/src/jobs/autoUnlistInvalidGirlsListings.job.js`

Distinct sellers of live girls-only listings, then one query for those no longer female, then one `updateMany`. It no longer pulls every listing into memory. The summary's `checked` now counts sellers.

---

## 2. Request paths

### 2.1 Main feed: short shared page cache
**Files:** `backend/src/services/product.service.js`, `backend/src/utils/boostedCache.js`, `backend/src/models/Product.model.js`

- **Problem:** `/api/product` ranks listings by a computed score (recency, views, plan perk). An index can't serve that, so every page request scored every live listing on the campus.
- **What's cached:** non-search pages, for 15s, keyed by the exact filter, sort and page. The key includes the viewer-dependent rules (Girls Corner and admin), so it's safe to share.
- **When it's cleared:** on any listing write (create, edit, price, status, delete, boost, and so on), from the same Product model hooks that already clear the boosted rail. View-count bumps don't clear it; otherwise it would never survive.
- **Not cached:** search results.
- **Concurrency:** identical concurrent requests share one in-flight aggregation.
- **Multiple instances:** each instance has its own cache, so another instance may show a just-edited listing's old data for up to 15s.

### 2.2 Chat inbox
**File:** `backend/src/services/conversation.service.js`

- **Empty threads:** filtered in the Mongo query (`last_message ∉ {null, ""}`) instead of after fetching.
- **People:** the other parties are still loaded for all rows (up to 200), because "Chat priority" ranking and name search need them.
- **Listings and deals:** fetched only for the rows actually returned (a page is 30 by default), with listing photos trimmed to the cover (`images: { $slice: 1 }`).
  - **Before:** a product populate plus a deal lookup for up to 200 threads on every inbox load.
- **Unchanged:** the response shape and the unread total.

### 2.3 Chat messages
**File:** `backend/src/services/message.service.js`

- **Sending:** sending a message looked up the sender's name with `User.findById`.
- **Loading:** loading a thread looked up the reader's `chat_settings` the same way.
- **Now:** both use the auth user this same request already cached (`loadAuthUser`): a memory hit, not a query.

### 2.4 Other re-reads removed
- **Notification feed:** `getUserNotificationFeed` uses the cached auth user (`notification.service.js`).
- **Leaderboard:** uses `req.user.campus_id` instead of reading the user again (`badgeController.js`).
- **Profile:** for accounts with no `first_listed_at`, the history backfill (a Product query plus a Deal query) ran on every profile load, forever for users who never list. It now runs at most once per user per process (`user.controller.js`).

### 2.5 Badge recompute
**Files:** `backend/src/services/badgeService.js`, `backend/src/controllers/product.controller.js`, `backend/src/controllers/user.controller.js`

- **Plain objects:** the user's listings are read with `.lean()`.
- **One user read:** the user is read once and shared between the context builder and the badge update (it was read twice).
- **OG member check:** this used `countDocuments({ _id: { $lt: id } })`, which walks the whole `_id` index for late joiners. It is now capped with `{ limit: 100 }`; only "under 100?" matters.
- **Coalescing:** listing edit, unlist, relist, delete, mark-sold, profile edit and avatar change now call `scheduleBadgeRecompute(userId)`. A burst of changes runs **one** recompute about 4s after the first. Paths that show the result straight away still recompute immediately: creating a listing, opening Achievements, college verification.

---

## 3. Indexes

### Added
| Collection | Index | Serves |
|---|---|---|
| messages | `{ conversation_id: 1, _id: -1 }` | Thread pages (sorted and paged by `_id`). Before, every load sorted the whole conversation in memory. |
| products | `{ campus_id, status, is_deleted, views_count: -1 }` | Trending rail (no in-memory sort). |
| products | `{ is_deleted, updatedAt }` | Nightly deleted-listing purge. |
| products | `{ status, updatedAt }` | Nightly draft purge, staff status filters. |
| payments | `{ status, createdAt }` | Nightly "expire abandoned payments". |
| users | `{ campus_id, gamification.total_xp: -1 }` | Campus leaderboard (no in-memory sort). |

### Removed from the schemas (redundant)
- **Product single-field indexes:** `seller_id`, `campus_id`, `category`, `condition`, `selling_price`, `status`, `is_deleted`. Each is either the leading field of an existing compound index (so that compound already serves it) or never queried on its own.
- **`User.campus_id`:** covered by the new leaderboard index.
- **Why it matters:** every index is updated on every write, so these were pure cost on listing and user writes.
- **Kept:** `isGirlsOnly` (the nightly sweep queries it without a campus) and `auto_hidden_at`.

### Fixed
- **`products.slug`** is now **unique + sparse**. Unique without sparse treats every listing that has no slug yet (for example a draft saved before it has a title) as `slug: null`, so the second one fails with a duplicate-key error.
- **`products { seller_id, title, selling_price }`**: dropped a meaningless `{ unique: false }` option that made index sync rebuild the index for nothing.

### The live database needs a one-time sync
Mongoose **creates** missing indexes on startup but never **drops** or **changes** existing ones. A dry run against the database in `backend/.env` showed:

- **Already built:** the new compound indexes. The dev server built them automatically.
- **To drop (13):**
  - the 8 redundant indexes above;
  - `products is_boosted_1_boost_expires_at_-1` (old, not in any schema);
  - `messages sender_id_1_createdAt_-1` (no query uses it);
  - the old non-sparse `slug_1`;
  - the old `reports` unique index;
  - the old 30-day TTL index `notifications createdAt_1`.
- **To create (2):**
  - the sparse `slug` index;
  - the `reports` duplicate-report guard. Its live version is a plain unique index, not the partial one the schema defines, so automatic reports with no reporter on the same target can collide.

---

## 4. Connection pool
**File:** `backend/src/config/db.js`

| Setting | Before | Now |
|---|---|---|
| `maxPoolSize` | 10 | `MONGO_MAX_POOL`, default 20 |
| `minPoolSize` | – | `MONGO_MIN_POOL`, default 2 (warm sockets after idle) |
| `maxIdleTimeMS` | – | 60000 |
| `retryWrites` | – | true |

Keep **instances × `MONGO_MAX_POOL`** below your Atlas tier's connection limit.

---

## 5. Deploy checklist

1. Deploy the code. Nothing else is required for correctness; the new indexes are built automatically on boot.
2. If notifications have never been migrated (true for the current database), run this **before** the index sync. It backfills `expires_at`, then removes the old TTL index that deletes every notification after 30 days:
   ```
   cd backend && node scripts/migrateNotificationExpiry.js
   ```
3. Review the index diff, then apply it at a quiet time:
   ```
   cd backend
   npm run indexes              # dry run: what would be created / dropped
   npm run indexes -- --apply   # sync (also drops indexes made by hand in Atlas)
   ```
4. Optional environment variables:
   - `MONGO_MAX_POOL` / `MONGO_MIN_POOL`: tune the connection pool per tier.
   - `RUN_JOBS=false`: turn jobs off on instances that shouldn't run them. Not needed for safety: the lease prevents duplicate runs anyway.

---

## 6. Reviewed and left as-is
- **Auth user cache, feed count / price caches, boosted rail cache, campus cache, trending cache:** already in place and correct.
- **Frontend polling** is already efficient:
  - one shared unread-badge poller (45s, paused in hidden tabs);
  - the chat list and open thread poll every 60s / 30s while the socket is live, more often only when it's down;
  - profile fetches are de-duplicated in `UserContext`.
- **`getUnreadTotal`:** a single aggregation using the participant indexes.
- **Admin dashboard:** many counts, but staff-only and infrequent.
- **AI assistant budget bundle:** a loop of at most a few sequential queries, where each depends on the previous result.
- **Chat cooldown check:** one indexed lookup on a unique key per message; caching it would risk letting a cooled-down user through on another instance.

## 7. Before running more than one backend instance
The job lease (§1.1) makes scheduled jobs safe on several instances. These three still assume a **single instance** and need Redis (or similar) first:

- **Socket.IO:** chat, typing and live deal updates need the Redis adapter (`@socket.io/redis-adapter`) and sticky sessions. Otherwise users on different instances don't see each other's events.
- **Rate limits:** the 40 `express-rate-limit` limiters use in-memory stores. With N instances, every limit is effectively N times looser. Use a shared store (`rate-limit-redis`).
- **In-process caches:** auth user, feed, boosted rail and trending are safe across instances (short TTLs bound staleness), but invalidation is local. If edits must show instantly everywhere, move them to Redis or broadcast cache clears.

Further headroom later, if a single campus grows to tens of thousands of live listings:
- store the feed "recommended" score on each listing (refreshed by a job), so the feed can be served straight from an index;
- move image purges off the nightly job onto a queue.
