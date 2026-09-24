# Gamification Plan - Unideals Badge and Level System

> **Status**: Planning Phase
> **Last Updated**: September 2026
> **Related Files**: [`Subscription_plan.md`](./Subscription_plan.md)

This document is the single source of truth for the gamification system.
Update this file whenever badge rules or implementation details change.

---

## Table of Contents

1. [Core Concept](#1-core-concept)
2. [Rank Tiers](#2-rank-tiers)
3. [XP Formula](#3-xp-formula)
4. [Badge Catalogue](#4-badge-catalogue)
5. [UI Surfaces](#5-ui-surfaces)
6. [Data Models](#6-data-models)
7. [API Endpoints](#7-api-endpoints)
8. [Files to Create / Modify](#8-files-to-create--modify)
9. [Implementation Order](#9-implementation-order)
10. [Design Decisions](#10-design-decisions)
11. [Verification Checklist](#11-verification-checklist)

---

## 1. Core Concept

Every user earns **XP (Experience Points)** by doing real things on the platform.
XP accumulates to determine a **Level** (1-50), a **Rank Title**, and unlocked **Achievement Badges**.

This builds trust, rewards consistent engagement, and makes profiles feel alive.

---

## 2. Rank Tiers

| Level Range | Rank Title        | Color Theme      |
|-------------|-------------------|------------------|
| 1 - 4       | Seedling          | Green            |
| 5 - 9       | Explorer          | Cyan             |
| 10 - 19     | Dealer            | Indigo / Purple  |
| 20 - 29     | Hustler           | Orange           |
| 30 - 39     | Legend            | Amber / Gold     |
| 40 - 50     | Campus King/Queen | Rainbow Gradient |

> Gender variant (King/Queen) inferred from user.gender. Falls back to **Campus Royale** if not set.

---

## 3. XP Formula

```
level       = Math.floor(Math.sqrt(total_xp / 50))
xp_for_next = (currentLevel + 1)^2 * 50
xp_to_next  = xp_for_next - total_xp
progress_%  = ((total_xp - currentLevel^2*50) / (xp_for_next - currentLevel^2*50)) * 100
```

### Example Breakpoints

| XP     | Level | Rank        |
|--------|-------|-------------|
| 0      | 0     | Seedling    |
| 50     | 1     | Seedling    |
| 200    | 2     | Seedling    |
| 450    | 3     | Seedling    |
| 800    | 4     | Seedling    |
| 1,250  | 5     | Explorer    |
| 5,000  | 10    | Dealer      |
| 20,000 | 20    | Hustler     |
| 45,000 | 30    | Legend      |
| 80,000 | 40    | Campus King |

---

## 4. Badge Catalogue

Each badge has up to **3 tiers**: Bronze, Silver, Gold.
One-time special badges have no tiers.
Badges are grouped into **5 categories**.

---

### Category 1 - Seller Badges

| Badge ID       | Name         | Bronze                    | Silver                    | Gold                          | XP (B/S/G)      |
|----------------|--------------|---------------------------|---------------------------|-------------------------------|-----------------|
| first_listing  | First Drop   | Post 1 listing            | -                         | -                             | +30 / - / -     |
| power_seller   | Power Seller | 5 products sold           | 20 products sold          | 50 products sold              | +50 / 100 / 200 |
| quick_flip     | Quick Flip   | 1 item sold within 3 days | 1 item sold within 1 day  | 5 sales each within 1 day     | +40 / 80 / 150  |
| top_rater      | Top Rated    | Avg rating >= 4.0         | Avg rating >= 4.5         | Avg rating >= 4.8             | +60 / 100 / 200 |
| category_ace   | Category Ace | 3 items in same category  | 10 items in same category | 25 items in same category     | +40 / 80 / 150  |

**Data sources**: Product model (seller_id, status, createdAt), Review model (avg rating)

---

### Category 2 - Buyer Badges

| Badge ID          | Name           | Bronze                   | Silver            | Gold              | XP (B/S/G)      |
|-------------------|----------------|--------------------------|-------------------|-------------------|-----------------|
| first_buy         | First Purchase | Complete 1 deal as buyer | -                 | -                 | +30 / - / -     |
| deal_hunter       | Deal Hunter    | 5 completed buys         | 15 completed buys | 30 completed buys | +50 / 100 / 200 |
| wishlist_curator  | Curator        | 10 wishlist items        | 25 wishlist items | 50 wishlist items | +20 / 40 / 80   |

**Data sources**: Deal model (status = completed, buyer ref), Wishlist model

---

### Category 3 - Communication Badges

| Badge ID       | Name             | Bronze                   | Silver                  | Gold                         | XP (B/S/G)      |
|----------------|------------------|--------------------------|-------------------------|------------------------------|-----------------|
| fast_responder | Fast Responder   | Avg reply time < 2 hrs   | Avg reply time < 30 min | Under 10 min across 10 chats | +40 / 80 / 150  |
| chatter        | Social Butterfly | 10 conversations started | 50 conversations        | 100 conversations            | +20 / 50 / 100  |
| deal_closer    | Deal Closer      | 3 deals closed via chat  | 10 deals via chat       | 25 deals via chat            | +50 / 100 / 200 |

**Data sources**: Message model (timestamps), Conversation model (count), Deal model

---

### Category 4 - Trust and Reputation Badges (one-time, no tiers)

| Badge ID          | Name             | Condition                                          | XP   |
|-------------------|------------------|----------------------------------------------------|------|
| verified_student  | Verified Student | is_email_verified = true                           | +50  |
| profile_complete  | Profile Pro      | Avatar + mobile + college fields all filled        | +40  |
| trusted_trader    | Trusted Trader   | 0 reports/disputes AND 10+ completed deals         | +100 |
| early_adopter     | Early Adopter    | Account created before early-access cutoff date    | +75  |
| campus_veteran    | Campus Veteran   | Account age > 6 months                             | +60  |

**Data sources**: User model (is_email_verified, avatar, mobile, createdAt), Report model

---

### Category 5 - Milestone / Special Badges (one-time)

| Badge ID      | Name         | Condition                                              | XP   |
|---------------|--------------|--------------------------------------------------------|------|
| century_club  | Century Club | 100 total transactions (buys + sells combined)         | +200 |
| big_deal      | Big Deal     | Single product sold at price > Rs. 5,000               | +100 |
| streak_seller | On A Roll    | 5 sales within any 7-day rolling window                | +80  |
| night_owl     | Night Owl    | 10 listings posted between 10 PM and 2 AM              | +30  |
| og_badge      | OG Member    | Among the first 100 users to register                  | +100 |

---

## 5. UI Surfaces

### Surface A - Achievements Tab (Profile Page)

- **Route**: /achievements
- **Nav entry**: Added to Profile_left_part.jsx with Trophy icon
- **Position in sidebar**: Between Wishlist and Subscription

#### Page Layout

```
+------------------------------------------------------------------+
|  LEVEL CARD                                                      |
|  [Avatar]  Campus King  .  Level 34                              |
|  [XXXXXXXXXXXXXXXX.......]  1,450 / 2,000 XP to Level 35        |
|  Badges Earned: 12   .  Rank: #3 on your campus                 |
+------------------------------------------------------------------+

 [All]  [Seller]  [Buyer]  [Communication]  [Trust]  [Milestone]

 +----------+  +----------+  +----------+  +----------+
 | GOLD     |  | SILVER   |  | BRONZE   |  |  LOCKED  |
 | Power    |  | Quick    |  | Deal     |  | Category |
 | Seller   |  | Flip     |  | Hunter   |  | Ace      |
 | 32 sold  |  | < 1 day  |  | 7 buys   |  | Need 3   |
 +----------+  +----------+  +----------+  +----------+
```

#### Badge Card States

| State  | Visual                                                              |
|--------|---------------------------------------------------------------------|
| Earned | Full color, tier glow (gold shimmer / silver / copper)              |
| Locked | Grayscale + padlock icon + hint showing remaining progress          |
| New    | Pulsing border + sparkle animation (shows for 3 days after earning) |

Clicking a badge opens a **modal** with: icon, name, description, tier, earned date,
next-tier progress, and XP granted.

---

### Surface B - Mini Level Widget (Overview Page)

- **Location**: "Your Activity" grid in ProfileOverview.jsx
- **Span**: Full-width card (col-span-2), placed after the existing 6 stat cards

#### Widget Layout

```
+------------------------------------------------------+
|  Campus King                           Level 34      |
|  XXXXXXXXXXXXXX......  73% to Lv. 35                 |
|  12 Badges earned                    View All ->     |
|  [Fast Responder] [Power Seller] [Verified] [Closer] |
+------------------------------------------------------+
```

Shows: rank title, level, XP progress bar, badge count, top 4 badge icons, link to /achievements.

---

## 6. Data Models

### 6.1 - Changes to User.model.js

Add a `gamification` sub-document to the existing User schema:

```js
gamification: {
  total_xp:         { type: Number, default: 0 },
  level:            { type: Number, default: 1 },
  rank_title:       { type: String, default: "Seedling" },
  last_computed_at: { type: Date,   default: null },
  badges: [
    {
      _id: false,
      badge_id:   { type: String, required: true },  // e.g. "power_seller_gold"
      category:   { type: String, enum: ["seller","buyer","communication","trust","milestone"] },
      tier:       { type: String, enum: ["bronze","silver","gold","special"], default: "bronze" },
      earned_at:  { type: Date,   default: Date.now },
      xp_granted: { type: Number, default: 0 },
    },
  ],
},
```

> Migration: Existing users will have gamification defaulted to { total_xp: 0, level: 1, badges: [] }.
> Run a one-time seed script to back-compute badges for all existing users.

---

### 6.2 - New Badge.model.js (optional - audit log)

Keeps a full event history useful for notifications and future leaderboards:

```js
const badgeEventSchema = new Schema({
  user_id:    { type: ObjectId, ref: "User", required: true, index: true },
  badge_id:   { type: String,  required: true },
  tier:       { type: String,  enum: ["bronze","silver","gold","special"] },
  xp_granted: { type: Number },
  earned_at:  { type: Date,   default: Date.now },
}, { timestamps: false });
```

---

## 7. API Endpoints

| Method | Route                   | Auth | Description                                       |
|--------|-------------------------|:----:|---------------------------------------------------|
| GET    | /api/badges/me          | Yes  | Current user XP, level, rank, earned + locked     |
| POST   | /api/badges/compute     | Yes  | Recomputes all badges from scratch for user       |
| GET    | /api/badges/leaderboard | Yes  | Top users by XP scoped to same campus             |
| GET    | /api/badges/config      | No   | Full badge catalogue used by frontend config      |

### GET /api/badges/me - Sample Response

```json
{
  "success": true,
  "data": {
    "total_xp": 1450,
    "level": 34,
    "rank_title": "Campus King",
    "xp_to_next_level": 550,
    "next_level": 35,
    "badges": [
      {
        "badge_id": "power_seller_gold",
        "category": "seller",
        "tier": "gold",
        "earned_at": "2026-08-01T10:30:00Z",
        "xp_granted": 200
      }
    ],
    "locked_badges": [
      {
        "badge_id": "category_ace_bronze",
        "category": "seller",
        "progress": { "current": 1, "required": 3, "unit": "items in same category" }
      }
    ]
  }
}
```

---

## 8. Files to Create / Modify

### Frontend - New Files

| File | Purpose |
|------|---------|
| frontend/src/features/user/pages/Achievements.jsx | Full achievements page with level card + badge grid |
| frontend/src/features/user/components/LevelCard.jsx | Reusable XP + level + rank display card |
| frontend/src/features/user/components/BadgeCard.jsx | Single badge card with earned / locked states and modal |
| frontend/src/features/user/components/BadgeMiniStrip.jsx | Compact widget for Overview page |
| frontend/src/features/user/api/badgeApi.js | API calls: fetchMyBadges, computeBadges, fetchLeaderboard |
| frontend/src/Utils/badgeConfig.js | Badge definitions: id, name, desc, icon, color, category, tiers |

### Frontend - Modified Files

| File | What Changes |
|------|-------------|
| frontend/src/features/user/components/Profile_left_part.jsx | Add Achievements nav item with Trophy icon |
| frontend/src/features/user/pages/ProfileOverview.jsx | Add BadgeMiniStrip widget to activity grid |
| Router file under frontend/src/app/ | Add /achievements route |

### Backend - New Files

| File | Purpose |
|------|---------|
| backend/src/models/Badge.model.js | Badge event audit log schema |
| backend/src/services/badgeService.js | Core: compute badges, award XP, update level |
| backend/src/controllers/badgeController.js | HTTP handlers |
| backend/src/routes/badgeRoutes.js | Route definitions |

### Backend - Modified Files

| File | What Changes |
|------|-------------|
| backend/src/models/User.model.js | Add gamification sub-document |
| backend/src/app.js | Register /api/badges router |

---

## 9. Implementation Order

```
Phase 1 - Backend Foundation
  1.1  Add gamification field to User.model.js
  1.2  Create Badge.model.js (audit log)
  1.3  Create badgeService.js (core compute logic)
  1.4  Create badgeController.js + badgeRoutes.js
  1.5  Register routes in app.js and test via Postman

Phase 2 - Frontend Config
  2.1  Create badgeConfig.js  (full catalogue definition)
  2.2  Create badgeApi.js     (API calls)

Phase 3 - UI Components
  3.1  LevelCard.jsx
  3.2  BadgeCard.jsx  (earned + locked + modal)
  3.3  BadgeMiniStrip.jsx

Phase 4 - Page Integration
  4.1  Achievements.jsx (full page)
  4.2  Add nav item to Profile_left_part.jsx
  4.3  Add mini widget to ProfileOverview.jsx
  4.4  Add /achievements route in router

Phase 5 - Polish
  5.1  Shimmer + sparkle animations on earned badges
  5.2  Animated XP progress bar on page load
  5.3  Dark mode audit on all new components
  5.4  Badge-earned toast notification via socket
```

---

## 10. Design Decisions

### Already Decided

| Topic | Decision |
|-------|----------|
| XP storage | Stored in User doc as total_xp; incremented per action; /compute for full re-sync |
| Badge tiers | Bronze / Silver / Gold. One-time badges = Special tier. |
| Level formula | floor(sqrt(xp / 50)) - smooth curve, cheap to compute |
| UI surfaces | Mini widget on Overview + full Achievements page via left nav |

### Still Configurable - Change These Anytime

| Question | Current Default | Notes |
|----------|----------------|-------|
| Show badges on public seller profile | Yes, top 3 badges | Builds buyer trust |
| Leaderboard scope | Same-college first, global tab later | Can flip to global-only |
| Badge earned notification | Toast popup + bell notification | Requires socket event |
| Early adopter cutoff date | First 30 days after launch | Set actual date before going live |
| OG Member limit | First 100 users | Increase to 500 if needed |
| Night Owl hours | 10 PM - 2 AM server time | Adjust timezone if needed |
| Big Deal threshold | Rs. 5,000 | Can raise to Rs. 10,000 |

---

## 11. Verification Checklist

### Backend

- [ ] GET /api/badges/me returns correct XP, level, rank, and badge list
- [ ] POST /api/badges/compute re-syncs after adding a product or completing a deal
- [ ] XP formula matches the breakpoints table in Section 3
- [ ] New user with 0 activity returns { level: 1, rank_title: "Seedling", badges: [] }
- [ ] Existing users migrated with correct default gamification values

### Frontend

- [ ] /achievements page appears in left nav and loads correctly
- [ ] All 5 category filter tabs work correctly
- [ ] Locked badges show progress hints and padlock icon
- [ ] Earned badges glow with correct tier color and show date on hover
- [ ] Mini level widget appears in ProfileOverview activity grid
- [ ] XP progress bar animates on page load
- [ ] Clicking a badge opens the detail modal correctly
- [ ] All components look correct in dark mode
- [ ] Badge grid is responsive on mobile

---

*End of document - update this file whenever badge rules or implementation details change.*
