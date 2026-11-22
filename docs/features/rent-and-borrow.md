# Rent & Borrow — Feature Spec (Unideals)

> **File:** `docs/features/rent-and-borrow.md` | **Version:** 1.4 | **Status:** Built behind `RENT_ENABLED` (off by default)
> **Stack:** Frontend React + Vite (`frontend/src/features/rent`) | Backend Express 5 + Mongoose 9 | Admin (`Campus-Mart-Admin/src/features/rent`)
> **Scope:** Phase 1. Payments are offline (UPI / cash); the app never moves money.

---

## 1. Problem & Goal

Students need small things at odd hours and can't get them:

- No racket for a badminton game.
- After 9 PM the hostel block gates close, and Zomato, Swiggy and Zepto only deliver to the main gate. So an iron, a knife or a packet of Maggie is out of reach.

Someone in the same block usually has it and would lend or share it for a small fee.

**Goal:** a separate section where students can do two things:

- **Offer** what they have: "Racket, ₹30/day" or "Maggie, ₹15 each".
- **Request** what they need: "Need an iron tonight, will pay ₹20".

People in the same block get alerted. The two students agree, hand over, return and pay each other directly. Lenders get a way to earn.

## 2. Concept

| | **Lend** (it comes back) | **Share** (it gets used up) |
|---|---|---|
| Examples | racket, iron, knife, kettle, charger | Maggie, snacks, a sachet |
| Price units | per hour / per day / per use / free | per item / free |
| Extras | optional refundable deposit; a "return by" time | quantity (for example 5 packets) |
| Booking steps | pending → accepted → active (handed over) → completed (returned) | pending → accepted → completed (handed over) |

**Listing types in the form.** The create form shows three types. They map onto the two API modes:

| Form type | Offer copy | Request copy | API |
|---|---|---|---|
| Rent | Paid usage, item comes back | You pay to use it, then return it | `mode: lend`, price per hour/day/use |
| Lend | Free usage, item comes back | Borrow for free | `mode: lend`, price `free` |
| Give away | Handed over for good | Get to keep | `mode: share`, free or per item |

Board cards and the detail page use the same badges: Rent, Lend, Give away, or Needed for requests.

**Kinds of post:**

- `offer`: "I have it". Someone taps **Request to borrow** (or **Ask for this** for a Share item).
- `request`: "I need it", with a `needed_by` time (default 6 h, maximum 48 h). A helper taps **I can help** and may quote their own price.

**Rules:**

- **The post owner always accepts or declines.** Accepting one booking declines everyone else waiting on that post. For Share offers this only happens once stock runs out.
- **The lender confirms handover and return**, because they have something at stake.
- Every transition is one conditional update guarded on the expected `from` status, so a double tap or a race can never win twice.
- Each booking has a **thread in the main Chats inbox** (`/chat`), next to marketplace chats. Booking steps (requested, accepted, handed over, returned) appear there as system lines. Room numbers belong there, not in public posts.
- **Public posts reject phone numbers and room numbers** (`RENT_UNSAFE_TEXT_RE`). Banned items (alcohol, tobacco, drugs, medicines, weapons) are refused (`RENT_BANNED_RE`).
- **Blocks:** staff set a block list per campus (A–T, LH A–H, …). Students pick from it. If a campus has no list, students type their block as free text. The board shows **my block first**, with a toggle for **All blocks**.
- **Alerts:** a new request alerts students in the same campus and block who have alerts on (on by default). Limits:
  - at most 6 rent alerts per person per hour
  - at most 300 recipients per request
- **Return time:** the borrower picks it when booking. Default: 2 h for hourly items, a day otherwise; for a **request** it's 2 h after its "needed by" time. Requests don't ask for a "best time" ("needed by" already says when).
- **Ratings:** after completion, both sides rate each other from 1 to 5. A profile shows lent / shared / borrowed counts, average rating and **total earned**. Earned is the sum of agreed prices, which are settled offline.
- **Reports:** 3 reports hide a post until staff review it. Staff can hide or restore any post.

## 3. Data model

Rent data lives in its own collections. `Product`, `User` and `Deal` are untouched. `Conversation` gains two optional fields so rent threads can share the chat inbox (see **Chat** below).

| Collection | Model file | Holds |
|---|---|---|
| `rentposts` | `backend/src/models/RentPost.model.js` | offers and requests: kind, mode, title, category, images (0–3), price {amount, unit}, deposit, quantity, block, needed_by, status, reports. Offers only, all optional: `condition` (new, like_new, good, fair) and `available_until`. Both: `handover` {spot, timing, return_policy (lend offers only), notes} |
| `rentbookings` | `backend/src/models/RentBooking.model.js` | one lend/share: lender, borrower, owner, requester, post snapshot, agreed price, return_by, stage timestamps, messages, ratings. Unique partial index: one open booking per person per post |
| `rentprofiles` | `backend/src/models/RentProfile.model.js` | block, alerts on/off, stats (lent, shared, borrowed, earned_total, rating_sum/count) |
| `rentcampusconfigs` | `backend/src/models/RentCampusConfig.model.js` | per campus: `enabled` and `blocks[]`. No document means enabled with no block list |

Post statuses are `active`, `paused`, `lent_out`, `fulfilled`, `expired`, `hidden` and `deleted`.

**Chat.** Each booking gets a `Conversation` with `context: "rent"` and `rent_booking_id` (code: `backend/src/services/rentChat.service.js`):

- `buyer_id` = borrower, `seller_id` = lender, `product_id` = the RentPost id. Reusing `product_id` keeps the existing unique buyer + seller + item index, so there is no index change; a later booking of the same item by the same person reuses the thread.
- The booking stores `conversation_id`. Older bookings get a thread the first time they're opened.
- Messages, unread counts, read receipts, typing and push all come from the normal chat. Deals are refused on rent threads (`deal.service` → 400), and the inbox returns `dealStatus: null`, `context` and `rentBookingId` for them. `GET /api/conversations?role=rent` lists only rent threads.

Handover text is public, so it is screened like the title (no phone or room numbers, no banned items, profanity check). `available_until` must be in the future and at most 90 days away.

## 4. API

**Student routes** (`/api/rent`, `backend/src/routes/rent.routes.js`):

- Everything except `/config` needs auth and returns **404 `RENT_DISABLED`** when the feature is off, either globally or for the caller's campus.
- Bodies are validated with zod (`validations/rent.validation.js`). Unknown keys are rejected.

| Method & path | What |
|---|---|
| `GET /config` | `{ enabled, blocks, categories, units, limits, profile }`. Always 200 (`{enabled:false}` when off) so the UI can hide itself |
| `GET` / `PUT /me/profile` | block and alerts |
| `GET /posts?kind=offer\|request&block=<b\|all>&category&mode&q&page` | the board: campus-scoped, my block first, then available first, then newest |
| `GET /posts/mine` | my posts with a pending-request count |
| `POST /posts` · `GET` / `PATCH` / `DELETE /posts/:id` · `PATCH /posts/:id/status` (active/paused) | manage posts |
| `POST /posts/:id/report` | report a post |
| `POST /posts/:id/bookings` | `{ note?, quantity?, return_by?, price? }` |
| `GET /bookings?role=lending\|borrowing&state=open\|closed` · `GET /bookings/:id` | booking lists and detail (detail includes messages and allowed `actions`) |
| `POST /bookings/:id/{accept,decline,cancel,handover,return,rate,messages}` | booking actions |

**Staff routes** (`/api/admin/rent`, access section `rent`; they work even while `RENT_ENABLED` is off):

| Method & path | What |
|---|---|
| `GET /campuses` | every campus in scope with enabled, blocks, live posts and open bookings, plus `globallyEnabled` |
| `PUT /campuses/:campusId` | `{ enabled?, blocks? }`. Audited as `rent.config_update` |
| `GET /posts?reported=1&status&kind&campus&q&page&limit` | moderation queue, reported posts first |
| `PATCH /posts/:id` | `{ action: hide\|restore, reason? }`. Audited as `rent.hide` / `rent.restore` |

**Realtime:** `rent:booking` `{bookingId, status}` is sent to both users' rooms; chat messages use the normal chat events. Notifications use type `rent`. `POST /bookings/:id/messages` still works: it posts into the booking's chat thread.

**Job:** `rent-sweep` runs every 15 minutes (`jobs/rent.job.js`). It does nothing while the feature is off. Each run:

- expires requests that are past `needed_by`
- expires active or paused offers that are past `available_until`. Lent-out offers wait until the item is back
- expires pending bookings older than 12 h
- sends one overdue reminder to both sides

**Account deletion:** `userDeletion.service` calls `purgeRentDataForUser`. Items the deleted user had reserved on other people's posts are released first.

## 5. Frontend

The rent zone reuses the marketplace's own building blocks, so it looks like a section of the app rather than a separate site.

| Route | Page | Modelled on |
|---|---|---|
| `/rent` | Board: Available / Requests switch, category chips, search, "Show: my block / all blocks", first-visit block picker. Offers use a card with the same frame as the product card; requests use a text-first card | Explore (`BrowseKit`) |
| `/rent/new`, `/rent/edit/:id` | Four steps: Details, Photos, Price & handover, Review. One step per screen with Back / Continue, a live preview and tips on the right, docked actions on phones. The draft is saved on this device automatically (`localStorage`, one per user; photos aren't kept). Code: `pages/RentPostForm.jsx` + `components/form/` | Sell flow (`ListingKit`, `ListingLayout`) |
| `/rent/:id` | Gallery, a details card (About, Details, Handover & safety), a sticky summary (price box, action, share, report), the lender card, similar items, a docked action bar on phones. Owners get Edit / Pause / Remove and the incoming requests with Accept / Decline | Product page (`ProductGallery`, `ImageLightbox`) |
| `/rent/booking/:id` | The item, the booking card (same as in the chat), a **Chat** card that opens the thread in `/chat`, and the other person | — |
| `/chat` (shared) | Rent threads show a Borrowing / Lending tag, a **Rent** filter, and the **booking card** at the top where sales show the deal card (steps + the next action: Accept / Decline, Handed over, Got it back, Rate; `components/RentBookingProgress.jsx`), rent quick replies and no ₹ offer button. Edits are tagged `[rent]` in `features/chat` | Chats |
| `/rentals` | Profile → **Rentals**: stats (earned, lent, borrowed, rating) and Lending / Borrowing / My posts tabs, inside the account layout | My listings |
| `/rent/activity` | Redirects to `/rentals` (old notification links) | — |

Entry points are all hidden unless `useRentConfig().enabled`:

- **Post (one place to post anything):** the header's Sell button becomes **Post** and opens a menu with **Sell** (`/upload`) or **Rent** (`/rent/new`). On phones the tab bar's **+** opens the same choice as a sheet (`components/PostMenu.jsx`).
- **Header (desktop):** a "Rent" button next to Post. Inside the rent zone (`/rent` and `/rent/*`) it turns dark (pressed).
- **Phones:** a 6th tab "Rent". Item pages keep the site header with a back arrow to `/rent`.
- **Board switch:** Available / Requests is a large filled switch with counts for the current block; open requests get an amber count.
- **Profile:** "Rentals" in the account sidebar and the phone account menu, a Rent & Borrow card on Overview (`components/RentProfileCard.jsx`), and "Rentals" in the profile drop-down.
- **Home:** the "Need something tonight?" banner.

The `/rent*` and `/rentals` routes render Not Found when the feature is off.

## 6. Turning it on

1. Backend `.env`: `RENT_ENABLED=true`, then restart.
2. Set the blocks for each campus, by either:
   - **Admin → Rent & Borrow → Campus setup → edit blocks** ("Fill Block A–T" helper), or
   - `cd backend && npm run seed:rent-blocks -- --campus=vit-vellore --blocks="A-T"` (also accepts `"A-T,LH A-LH H"`).
3. Optional: pause it for one campus with the toggle on the same admin page.

## 7. Turning it off / removing it

**Pause (no code change):** set `RENT_ENABLED=false` and restart. Then:

- the API returns 404
- the tab, header button, menu item and banner disappear
- `/rent` shows Not Found
- the sweep job idles

Data is kept, so turning it back on resumes where it left off.

**Remove the code:**

- Not merged yet: `git checkout main` (in both `Campus-Mart` and `Campus-Mart-Admin`). The `pre-rent` tag marks the commit `main` was at before this work.
- Merged: `git revert -m 1 <merge-commit>` in each repo.
- To find every edit to a pre-existing file, run `git grep -n "\[rent\]"`. All new code lives in:
  - `backend/src/{config/rent.js, models/Rent*.model.js, services/rent*.js, controllers/rent.controller.js, routes/rent*.routes.js, validations/rent.validation.js, jobs/rent.job.js, seeds/rentBlocks.seed.js}`
  - `backend/tests/rent.integration.test.mjs`
  - `frontend/src/features/rent/`
  - `Campus-Mart-Admin/src/features/rent/`

**Remove the data** (irreversible, run in `mongosh` against the app database):

```js
db.rentposts.drop(); db.rentbookings.drop(); db.rentprofiles.drop(); db.rentcampusconfigs.drop();
db.notifications.deleteMany({ type: "rent" }); // optional, they expire after 30 days anyway
// Rent chat threads and their messages:
const ids = db.conversations.find({ context: "rent" }, { _id: 1 }).map((c) => c._id);
db.messages.deleteMany({ conversation_id: { $in: ids } }); db.conversations.deleteMany({ _id: { $in: ids } });
```

Rent post photos live in ImageKit under the `Rent` folder.

## 8. Edge cases

| Case | Behaviour |
|---|---|
| Two people tap "Accept" on different bookings at the same time | The post reservation is a conditional update. The loser's booking rolls back to pending with 409 "no longer available" |
| Borrower cancels after accept, before handover | Post goes back to `active` (lend), stock is restored (share), or the request reopens if `needed_by` hasn't passed |
| Cancel after handover | Not allowed. The lender confirms the return instead |
| Owner deletes a post with an accepted or active booking | 409. They must finish or cancel it first. Pending requesters are told the post was removed |
| Request passes `needed_by` | The sweep marks it `expired` and expires its pending bookings |
| Nobody answers a booking for 12 h | Expired, and the requester is pinged |
| Item not returned by `return_by` | One reminder to the borrower and one to the lender. The booking shows "Overdue" |
| Offer passes its `available_until` | New bookings get 409. The sweep marks it `expired`; the owner posts it again |
| Same person books the same post twice | Unique partial index returns 409 "already have an open booking" |
| User moves campus | Board, detail and booking creation all check the post's campus against the user's |
| Phone or room number in the title or description | 400 `RENT_UNSAFE_TEXT`. "Room heater" is fine |
| Account deleted mid-booking | Bookings are removed, reserved items are released and the other owner is notified |

## 9. Tests

`cd backend && npm test -- rent` runs 21 cases: post rules, block scoping, condition / availability / handover fields, the lend and share flows, one-winner accepts, request fulfilment, permissions, chat throttling, alert targeting and caps, report auto-hide, sweeps, account purge, the kill switch over HTTP, and the staff routes with audit logging.

## 10. Phase 2 ideas (not built)

- In-app payments or escrow for deposits (needs peer payouts and KYC).
- Recurring availability ("free every evening").
- Assistant knowledge-base entry and a `searchRentPosts` tool.
- Per-student lending limits based on rating.
