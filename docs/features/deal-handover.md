# Deal handover: finishing a deal at the meetup

How a confirmed deal becomes a completed one. It replaces the old two-button flow, where the seller tapped "Payment received" and the buyer then tapped "Item received".

**Code:**
- Backend: `backend/src/services/deal.service.js` (section "Meetup + handover") and `backend/src/jobs/dealFollowups.job.js`
- Frontend: `frontend/src/features/chat/components/HandoverPanel.jsx`, used by `DealProgress.jsx`
- Tests: `backend/tests/handover.integration.test.mjs`
- Deep dive on the 4-digit code (how it works, edge cases, API errors, support guide): [handover-code.md](handover-code.md)

## Why the old flow was replaced

- **Nothing proved the meetup happened.** Either side could tap their button without ever meeting, and completed deals feed XP, badges, reviews and price insights.
- **The buttons had to be tapped in order.** The buyer could only confirm after the seller had. If the seller forgot, the deal and the reservation were stuck for good.
- **Missed meetups were never handled.** A no-show or an abandoned reservation simply stayed open.

## The flow

1. **The seller schedules the meetup.** They set a date, an optional time (India time) and a place.
2. **They meet.** The buyer checks the item and pays in cash or by UPI.
3. **The buyer taps "Show handover code"** and shows the seller a 4-digit code.
4. **The seller types the code and taps "Finish deal".** The deal completes in one step: the listing is marked sold, the sale is recorded, and both sides are notified.

The buyer hands over the code only once they're happy and have paid. The seller enters it only once they have the money. A correct code is therefore proof that they met and that both agreed.

**Already met without scheduling?** On a confirmed deal, "Already met up? Finish the deal" opens the same handover steps.

### Fallback: "Mark as done"

For when the code can't be used, for example no network or a flat phone.

- **The first tap:** either side taps "Can't use the code? Mark as done".
- **The other side** then sees "The seller/buyer marked this deal as done" with two buttons:
  - **Yes, finish deal:** completes it straight away.
  - **There's a problem:** clears the request, with an optional reason that's posted in the chat.
- **No reply within 48 hours:** it completes automatically.
- **Taking it back:** the person who tapped can undo it until then.

### Missed or forgotten meetups

| When | What happens |
|---|---|
| 6 h after a set time, or the next day for a date-only meetup | Both get "Did you meet up?" in the chat and as a notification (sent once). |
| 30 min after a set time, or from the follow-up for a date-only meetup | Either side can tap "The buyer/seller didn't show up" (two taps). The deal is cancelled, the item is listed again, and the no-show is recorded on the deal. |
| 6 days after the follow-up, with nothing done | The reservation ends and the item is listed again. If the seller had already confirmed payment (old flow), the deal completes instead. |

**Rescheduling:** a reschedule resets these timers, clears a pending "mark as done" and any code lockout, and keeps the same code.

## Security and correctness

- **The code is never stored.** It is `HMAC-SHA256(secret, dealId:nonce)` reduced to 4 digits. Only a random nonce is saved, and it is stripped from every serialised deal (the model's `toObject`/`toJSON` transform). Deals are broadcast to both sides of the chat, so the seller can't read the code from a socket payload.
- **Secret:** `HANDOVER_CODE_SECRET`, falling back to `SECRET_KEY_ACCESS_TOKEN`. Changing it changes every open code.
- **Who sees the code:** only the buyer, through `GET /api/conversations/:id/handover-code`. The response is sent with `Cache-Control: no-store`.
- **Guessing protection:**
  - 5 wrong codes pause entry for 15 minutes. Misses are counted atomically, so two devices can't get extra tries.
  - On top of that, a rate limit of 10 attempts per minute per account.
  - Codes are compared in constant time.
- **Exactly one completion:** every completion path (code, both confirmed, auto, legacy, admin) goes through `finalizeDeal`. It is a single conditional update on an active stage, so racing taps or the job complete a deal once and run the side effects once.
- **How it completed** is stored in `completed_via`: `code` | `both_confirmed` | `auto` | `legacy` | `admin`. Admins see it on the order. Phase 3 can limit rewards and reviews to verified deals with it.

## API

| Method & path | Who | Does |
|---|---|---|
| `POST /api/conversations/:id/pickup` `{ date, time?, location }` | seller | Schedule or reschedule. `time` is `HH:MM`, India time |
| `GET /api/conversations/:id/handover-code` | buyer | Returns `{ code }` |
| `POST /api/conversations/:id/handover` `{ code }` | seller | Right code completes the deal |
| `POST /api/conversations/:id/done` | either | Mark as done, or confirm the other side's request (completes) |
| `POST /api/conversations/:id/done/clear` `{ reason? }` | either | Take back, or "There's a problem" |
| `POST /api/conversations/:id/no-show` | either | After the meetup time: cancel and record the no-show |
| `POST /api/conversations/:id/payment-confirm`, `/item-received` | seller / buyer | Old flow, kept for older app versions |

## Ratings after a deal

Once a deal completes (any way, including auto-complete), both sides must rate the other: the buyer rates the seller and the seller rates the buyer, 1–5 stars plus an optional comment.

- **Popup:** `RatingGate` (mounted in `App.jsx`) shows a popup that can't be dismissed: no close button, no Escape, no backdrop tap. It opens the moment the deal completes (socket `conversation:updated` / `deal:updated` with status `completed`), on login, and on tab focus (at most once a minute). Several unrated deals are asked one after another. It stays out of the way on the auth, legal and phone-upload pages.
- **Which deals:** `GET /api/reviews/pending` returns completed deals from the last 30 days (`PENDING_WINDOW_DAYS`) that the user hasn't rated, oldest first, 5 at a time. Deals whose other side deleted their account are skipped.
- **Storage:** one `Review` per side per deal (`reviewer_id`, `reviewee_id`, `reviewer_role`; unique on `{ deal_id, reviewer_id }`). Reviews from before two-way ratings have no reviewer fields and count as buyer → seller.
- **Shown rating:** `User.rating` `{ avg, count }` is every rating the user has received, as buyer and as seller. Cards, profiles and badges read it.
- **Deploy:** run `npm run indexes` once so the old unique index on `deal_id` alone is dropped. If it hasn't been run, the first seller review drops that index itself and retries.

| Method & path | Who | Does |
|---|---|---|
| `POST /api/reviews` `{ conversationId, rating, comment? }` | buyer or seller | Rate the other side of a completed deal, once |
| `GET /api/reviews/pending` | signed in | Deals still waiting for my rating |
| `GET /api/reviews/me`, `/api/reviews/user/:id` | signed in | Rating summary: average, count, distribution, latest reviews |

## Background job

`deal-followups` runs every 15 minutes and appears in the admin console under Jobs. It handles auto-complete, follow-ups and expiry, in batches of 100.

- **Indexes:** `{ status, pickup.followup_due_at }`, `{ status, pickup.expires_at }`, and a partial index on `done_request.auto_complete_at`.
- **Quiet runs:** a run with nothing to do is three index lookups.
- **Existing deals:** deals scheduled before this release get their timers on the first run, never earlier than that run, so nobody is surprised by a sudden cancellation.

## Existing deals

- **Deals at "Pickup scheduled":** they use the new flow straight away. The buyer's code is issued the first time they open it.
- **Deals at "Payment confirmed" (old flow):** the buyer's "I got the item, finish deal" completes them, and the seller can also enter the code.
- **Older app versions:** the old endpoints still work.

## Next phases

- **Phase 2:** the buyer accepts the meetup slot, campus pickup spots (the `PickupSpot` model), reminders, and an "I'm here" check-in.
- **Phase 3:**
  - a 24–48 hour window to report a problem after completion
  - a reliability score built from `no_show`
  - XP, badges and reviews only for `completed_via: code | both_confirmed`
