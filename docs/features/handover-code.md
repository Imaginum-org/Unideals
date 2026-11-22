# Handover code (4-digit deal completion)

The buyer shows the seller a 4-digit code at the meetup, and the seller types it in to complete the deal. It replaces the old pair of buttons ("Payment received" by the seller, then "Item received" by the buyer).

This doc covers the code in depth: what each person sees, how the code is made and checked, every edge case, the API and how to support it. For the wider finishing flow ("Mark as done", follow-ups, expiry, no-shows), see [deal-handover.md](deal-handover.md).

| | |
|---|---|
| Backend | `backend/src/services/deal.service.js`, section "Meetup + handover" (`getHandoverCode`, `verifyHandoverCode`, `finalizeDeal`) |
| Model | `backend/src/models/deal.model.js`: `handover`, `completed_via` |
| Routes | `backend/src/routes/conversation.route.js` (`/handover-code`, `/handover`) |
| Frontend | `frontend/src/features/chat/components/HandoverPanel.jsx`, used by `DealProgress.jsx`, wired in `pages/Chat.jsx` |
| Tests | `backend/tests/handover.integration.test.mjs` (`npm test -- handover`) |

---

## 1. Why a code

| Problem with the old two buttons | What the code fixes |
|---|---|
| Either side could tap a button without ever meeting, so fake "completed" deals could farm XP, badges and reviews. | The code only travels face to face. A correct code proves the two people met. |
| The buyer could only confirm after the seller. If the seller forgot, the deal and the item's reservation stayed stuck. | One action by the seller completes the deal. There's no second step to forget. |
| Nothing recorded that *both* sides agreed. | The buyer hands over the code only once they're happy and have paid. The seller enters it only once they're paid. Both consents sit in one event. |

This is the same idea delivery apps use with their delivery OTP.

---

## 2. What users see

The code works whenever the deal is **Deal confirmed**, **Pickup scheduled** or (older deals) **Payment confirmed**. On a confirmed deal with no pickup set yet, the deal card shows "Already met up? Finish the deal", which opens the same panel.

### Buyer

1. The deal card shows three steps: **Check item → Pay → Show code** (full text on wider screens).
2. The buyer taps **Show handover code**. A card shows the 4 digits in large type with the note: "Show this to the seller after you've paid and checked the item. Never send it in the chat."
3. **Hide code** puts it away. The code stays the same every time it's shown.
4. When the seller enters it, the deal completes and both sides see the celebration and a chat message: "Handover code verified. Deal done. Enjoy it!"

### Seller

1. The deal card shows: **Meet up → Get paid → Enter code**.
2. The seller types the buyer's 4 digits in the **Buyer's code** box (numbers only, at most 4) and taps **Finish deal**. The button stays disabled until 4 digits are typed.
3. **Right code:** the deal completes straight away.
4. **Wrong code:** an inline red message appears, such as "That code isn't right. 4 tries left.". The box clears and focus returns to it.
5. The hint under the box says: "The buyer shows this code after paying. Only enter it once you have the money."

### When completing

Done in a single conditional update (`finalizeDeal`). It is the only place a deal completes, whatever the method.

- The deal becomes `completed`, with `completed_via: "code"`, and `completed_at`, `item_received` and `payment_confirmed` are set.
- The sale is recorded in `deal.sale` (campus, category, condition, original price, sold price, seller, purchase date) for the price guide.
- The listing becomes `sold` and is soft-deleted. The cleanup job hard-deletes it 15 days later.
- A chat message is posted, the buyer gets a "Deal complete 🎉" notification with a prompt to rate the seller, and the deal is broadcast to both screens over the socket.

---

## 3. How it works

### Sequence

```mermaid
sequenceDiagram
    participant B as Buyer app
    participant API as API (deal.service)
    participant DB as MongoDB
    participant S as Seller app

    Note over B,S: Deal is confirmed / pickup scheduled
    B->>API: GET /conversations/:id/handover-code
    API->>DB: read deal.handover (lean)
    alt no nonce yet
        API->>DB: set handover.nonce = random 16 bytes (only if still empty)
    end
    API-->>B: { code: "4821" }  (Cache-Control: no-store)
    Note over B,S: Meet, check item, pay, buyer shows the code
    S->>API: POST /conversations/:id/handover { code: "4821" }
    API->>DB: read handover (nonce, locked_until)
    alt locked
        API-->>S: 429 "Too many wrong codes. Try again after …"
    else code matches (constant-time compare)
        API->>DB: findOneAndUpdate status in [confirmed, scheduled, paid] → completed
        API->>DB: listing → sold; system message
        API-->>S: 200 deal (completed)
        API--)B: socket deal:updated + notification
    else wrong
        API->>DB: $inc handover.attempts (atomic)
        API-->>S: 400 "That code isn't right. N tries left."
    end
```

### Making the code

```
code = HMAC_SHA256(secret, `${dealId}:${nonce}`) → first 4 bytes as uint32 → mod 10000 → zero-padded to 4 digits
```

- **The 4 digits are never stored.** The deal stores only `handover.nonce` (32 random hex characters) and `handover.issued_at`. The digits are recomputed from the nonce and the server secret each time.
- **Secret:** `HANDOVER_CODE_SECRET`, falling back to `SECRET_KEY_ACCESS_TOKEN`. Without either, the API returns 500 "Handover codes are not configured".
- **Issued on first view:** the nonce is created the first time the buyer opens the code. It is a conditional update on an empty nonce, so two devices opening it at once still get the same code.
- **Stable:** the code doesn't change when the meetup is rescheduled, so a code the buyer already noted stays valid.

### Keeping it away from the seller

Deals are broadcast to **both** sides of the chat over sockets. So:

- the model's `toObject` and `toJSON` transform removes `handover.nonce` from every serialised deal and replaces it with `handover.issued: true|false`
- only `lean()` reads inside `getHandoverCode` and `verifyHandoverCode` ever see the nonce
- `GET /handover-code` is buyer-only (403 for anyone else) and sent with `Cache-Control: no-store`
- the frontend keeps the revealed code in component memory only (never in localStorage or the URL). It is dropped when you leave the chat or open another deal

The tests check that the nonce and code never appear in `toObject()`, `toJSON()` or `JSON.stringify(deal)`.

### Checking the code

| Guard | Rule |
|---|---|
| Format | Must be exactly 4 digits. Checked by zod (`handoverCodeSchema`) and again in the service. A malformed code doesn't use up a try. |
| Who | Seller only. A buyer entering their own code gets 403. |
| Stage | Deal confirmed, pickup scheduled or payment confirmed. Already completed returns the completed deal (a repeat is harmless). Anything else returns 400 "This deal isn't ready to finish yet". |
| Code not opened yet | 400: `The buyer hasn't opened their code yet. Ask them to tap "Show code" in this chat.` |
| Compare | `crypto.timingSafeEqual`. |
| Wrong code | `$inc handover.attempts` atomically, and only while not locked, so two devices can't share a free retry. |
| Lockout | On the 5th miss, `locked_until = now + 15 min` and attempts reset to 0. While locked, even the right code gets 429 "Too many wrong codes. Try again after {time}." |
| Rate limit | `handoverLimiter`: 10 attempts a minute per account, on top of the per-deal lockout. |

**Guessing odds:** 10,000 codes, 5 tries per 15 minutes, and at most 10 requests a minute. A blind guess succeeds about 0.05% of the time per window, and the person guessing is the seller, who has already met the buyer.

### Completing exactly once

`finalizeDeal` runs `findOneAndUpdate({ _id, status: { $in: [deal_confirmed, pickup_scheduled, payment_confirmed] } }, { status: completed, … })`.

- Only the caller whose update matches runs the side effects (listing sold, message, notifications).
- A caller that loses the race gets the completed deal back with no error.
- The test "two devices entering the right code at once complete it exactly once" fires 3 parallel verifies and checks for a single "Deal done" message.

---

## 4. Edge cases

| Situation | What happens |
|---|---|
| Buyer shares the code before paying or checking | The seller can complete the deal, and **it's final**. The card, the legal terms and the FAQ all tell buyers to show it only after paying. The terms say Unideals isn't liable for this. |
| Buyer sends the code in chat | Same as above. The code card says "Never send it in the chat." |
| Seller enters it before the buyer opened it | Clear 400 asking them to tell the buyer to tap "Show code". No try is used. |
| Typos | Counted as wrong. 4, 3, 2 and 1 tries left are shown. The 5th miss pauses entry for 15 minutes. |
| Seller guesses repeatedly | Lockout plus the rate limit. Every miss is stored on the deal (`handover.attempts`). |
| Locked, then the right code after 15 minutes | Works. The counter was reset when the lock was set. |
| Both phones submit the right code at once | Completes once (see above). |
| Buyer's phone is dead, no network, or the app won't load | Use **"Can't use the code? Mark as done"**: the other side confirms, or it auto-completes in 48 hours. See [deal-handover.md](deal-handover.md). |
| They met without scheduling a pickup | "Already met up? Finish the deal" on a confirmed deal opens the same panel. The code works from `deal_confirmed`. |
| Meetup rescheduled | Same code. Attempts and any lockout are cleared. A pending "mark as done" is cleared too. |
| Seller undoes the pickup (back to Deal confirmed) | The code still works (they may meet anyway). A pending "mark as done" is cleared. |
| Seller releases the reservation (back to Negotiating) | `handover` is removed. A new code is issued if the deal is confirmed again. |
| Deal cancelled | The code stops working (the stage is no longer active). Viewing it gives 400. |
| Older deal stuck at "Payment confirmed" | The buyer sees "I got the item, finish deal", which completes it. The seller can also use the code. |
| Deal completed some other way (both confirmed, auto, admin) | A later code entry just returns the completed deal. |
| Not a participant | 403 from `roleOf` (the conversation access check). |
| Buyer or seller deletes their account | Their conversations and deals are deleted, so there's nothing to complete. |
| Support needs to fix a deal | Admins can set the status from the admin portal (`completed_via: "admin"`, audited). |
| `HANDOVER_CODE_SECRET` changes | Every code that hasn't been used yet changes. Buyers just open their code again. Rotate only when needed, ideally when few deals are open. |
| Old app tab still open after deploy | The old `/payment-confirm` and `/item-received` endpoints still work, and completion still goes through `finalizeDeal` (`completed_via: "legacy"`). |

---

## 5. API

All routes need a signed-in, verified account (`auth`) and are under `/api/conversations/:id`, where `:id` is the conversation id.

### `GET /handover-code` (buyer)

```json
200 { "success": true, "message": "Handover code", "data": { "code": "4821" } }
```

| Status | When |
|---|---|
| 403 | Caller isn't the buyer ("Only the buyer has a handover code") |
| 400 | Deal isn't confirmed yet ("The handover code appears once the deal is confirmed") |
| 500 | No secret configured |

Rate limit: the chat's normal `listLimiter`.

### `POST /handover` `{ "code": "4821" }` (seller)

```json
200 { "success": true, "message": "Deal complete", "data": { "...deal": "status: completed, completed_via: code" } }
```

| Status | Message |
|---|---|
| 400 | `Enter the 4-digit code` (validation), or `Enter the 4-digit code from the buyer's screen` |
| 400 | `The buyer hasn't opened their code yet…` |
| 400 | `That code isn't right. N tries left.` |
| 400 | `This deal isn't ready to finish yet` |
| 403 | `Only the seller enters the handover code` |
| 409 | `This deal just changed. Refresh and try again.` (rare race) |
| 429 | `Wrong code 5 times. Code entry is paused until …` / `Too many wrong codes. Try again after …` |
| 429 | `Too many code attempts, wait a minute` (rate limit, 10 a minute per account) |

### Data on the deal

```js
handover: {
  nonce,        // random hex; never serialised
  issued_at,    // first time the buyer opened the code
  attempts,     // wrong tries since the last lock / reschedule
  locked_until, // set after 5 wrong tries
}
completed_via: "code" | "both_confirmed" | "auto" | "legacy" | "admin"
```

Clients see `handover: { issued, attempts, locked_until, issued_at }`, never the nonce.

---

## 6. Support guide

| User says | Check / answer |
|---|---|
| "The seller says my code is wrong" | Ask the buyer to open "Show handover code" again and read it out. The code doesn't change, so an old screenshot is fine. If entry is paused, it unlocks at the time shown. |
| "It says the buyer hasn't opened their code" | The buyer needs to tap **Show handover code** once. |
| "My phone died at the meetup" | Either side taps **Mark as done**, and the other confirms. Otherwise it completes in 48 hours. |
| "I shared the code but wasn't paid" | The deal completed because the code was shared. Unideals doesn't hold money. Review the chat if it's reported. If it's fraud, take moderation action against the seller, and the deal can be corrected in the admin portal. |
| "The deal completed but we never met" | Look at `completed_via` on the order in the admin portal. `code` means the code was entered, so they almost certainly met. `auto` means one side marked it as done and the other didn't reply within 48 hours. |

---

## 7. Configuration

| Env var | Default | Notes |
|---|---|---|
| `HANDOVER_CODE_SECRET` | falls back to `SECRET_KEY_ACCESS_TOKEN` | Set a dedicated long random value in production, so rotating login secrets doesn't change open codes. |

The constants live in `HANDOVER` in `deal.service.js`: `MAX_ATTEMPTS = 5`, `LOCK_MS = 15 min`. The rate limit (10 a minute) is in `conversation.route.js`.

---

## 8. Tests

`backend/tests/handover.integration.test.mjs` runs against an in-memory MongoDB. The code-related checks:

- only the buyer can see the code, it's stable across calls, and it never appears in `toObject` / `toJSON` / JSON
- the seller entering a code before the buyer opened it gets a clear message
- the right code completes the deal: listing sold, sale recorded, `completed_via: "code"`, and a repeat is harmless
- wrong codes count down, then lock for 15 minutes even for the right code, and it works once the lock passes
- malformed codes are rejected without using a try
- met without scheduling: the code works from "deal confirmed"
- two devices entering the right code at once complete it exactly once
- rescheduling keeps the code and clears the lockout

Run: `cd backend && npm test -- handover`.
