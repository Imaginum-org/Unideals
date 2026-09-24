import User from "../models/User.model.js";
import Product from "../models/Product.model.js";
import BadgeEvent from "../models/Badge.model.js";

// ─── XP / Level helpers ───────────────────────────────────────────────────

/** level = floor(sqrt(xp / 50)) */
export function computeLevel(xp) {
  return Math.max(1, Math.floor(Math.sqrt((xp || 0) / 50)));
}

/** XP required to reach a given level */
export function xpForLevel(level) {
  return level * level * 50;
}

/** XP still needed to reach the next level */
export function xpToNextLevel(xp) {
  const level = computeLevel(xp);
  return xpForLevel(level + 1) - xp;
}

/** Progress percentage towards next level (0–100) */
export function levelProgress(xp) {
  const level = computeLevel(xp);
  const current = xpForLevel(level);
  const next = xpForLevel(level + 1);
  return Math.min(100, Math.round(((xp - current) / (next - current)) * 100));
}

/** Map level number → rank title */
export function rankFromLevel(level, gender = null) {
  const top =
    gender === "female"
      ? "Campus Queen"
      : gender === "male"
      ? "Campus King"
      : "Campus Royale";
  if (level >= 40) return top;
  if (level >= 30) return "Legend";
  if (level >= 20) return "Hustler";
  if (level >= 10) return "Dealer";
  if (level >= 5)  return "Explorer";
  return "Seedling";
}

// ─── Badge category map ───────────────────────────────────────────────────

const CATEGORY_MAP = {
  first_listing: "seller", power_seller: "seller", top_rater: "seller",
  category_ace: "seller", quick_flip: "seller",
  first_buy: "buyer", deal_hunter: "buyer", wishlist_curator: "buyer",
  chatter: "communication", deal_closer: "communication", fast_responder: "communication",
  verified_student: "trust", profile_complete: "trust", trusted_trader: "trust",
  early_adopter: "trust", campus_veteran: "trust",
  century_club: "milestone", big_deal: "milestone", streak_seller: "milestone",
  night_owl: "milestone", og_badge: "milestone",
};

// ─── Tier rank (for upgrade detection) ───────────────────────────────────

const TIER_RANK = { bronze: 1, silver: 2, gold: 3, special: 0 };

// ─── Badge evaluators ─────────────────────────────────────────────────────
// Each receives a context object and returns { tier, xp } or null.

const BADGE_DEFINITIONS = {
  // Seller
  first_listing:    (c) => c.totalListings >= 1 ? { tier: "special", xp: 30 } : null,
  power_seller:     (c) => c.productsSold >= 50 ? { tier: "gold", xp: 200 }
                         : c.productsSold >= 20 ? { tier: "silver", xp: 100 }
                         : c.productsSold >= 5  ? { tier: "bronze", xp: 50 }
                         : null,
  top_rater:        (c) => !c.avgRating ? null
                         : c.avgRating >= 4.8 ? { tier: "gold", xp: 200 }
                         : c.avgRating >= 4.5 ? { tier: "silver", xp: 100 }
                         : c.avgRating >= 4.0 ? { tier: "bronze", xp: 60 }
                         : null,
  category_ace:     (c) => c.maxCategoryCount >= 25 ? { tier: "gold", xp: 150 }
                         : c.maxCategoryCount >= 10 ? { tier: "silver", xp: 80 }
                         : c.maxCategoryCount >= 3  ? { tier: "bronze", xp: 40 }
                         : null,
  quick_flip:       (c) => c.dayFlipCount >= 5 ? { tier: "gold", xp: 150 }
                         : c.dayFlipCount >= 1 ? { tier: "silver", xp: 80 }
                         : c.quickFlipCount >= 1 ? { tier: "bronze", xp: 40 }
                         : null,
  // Buyer
  first_buy:        (c) => c.totalBuys >= 1  ? { tier: "special", xp: 30 }  : null,
  deal_hunter:      (c) => c.totalBuys >= 30 ? { tier: "gold", xp: 200 }
                         : c.totalBuys >= 15 ? { tier: "silver", xp: 100 }
                         : c.totalBuys >= 5  ? { tier: "bronze", xp: 50 }
                         : null,
  wishlist_curator: (c) => c.wishlistCount >= 50 ? { tier: "gold", xp: 80 }
                         : c.wishlistCount >= 25  ? { tier: "silver", xp: 40 }
                         : c.wishlistCount >= 10  ? { tier: "bronze", xp: 20 }
                         : null,
  // Communication
  chatter:          (c) => c.conversationCount >= 100 ? { tier: "gold", xp: 100 }
                         : c.conversationCount >= 50  ? { tier: "silver", xp: 50 }
                         : c.conversationCount >= 10  ? { tier: "bronze", xp: 20 }
                         : null,
  deal_closer:      (c) => c.dealsClosedViaChat >= 25 ? { tier: "gold", xp: 200 }
                         : c.dealsClosedViaChat >= 10 ? { tier: "silver", xp: 100 }
                         : c.dealsClosedViaChat >= 3  ? { tier: "bronze", xp: 50 }
                         : null,
  // Trust
  verified_student: (c) => c.isEmailVerified  ? { tier: "special", xp: 50 }  : null,
  profile_complete: (c) => c.isProfileComplete ? { tier: "special", xp: 40 }  : null,
  trusted_trader:   (c) => (c.reportCount === 0 && c.productsSold + c.totalBuys >= 10)
                           ? { tier: "special", xp: 100 } : null,
  early_adopter: (c) => {
    const cutoff = process.env.EARLY_ADOPTER_CUTOFF ? new Date(process.env.EARLY_ADOPTER_CUTOFF) : null;
    if (!cutoff || !c.accountCreatedAt || new Date(c.accountCreatedAt) > cutoff) return null;
    return { tier: "special", xp: 75 };
  },
  campus_veteran: (c) => {
    if (!c.accountCreatedAt) return null;
    const ageMs = Date.now() - new Date(c.accountCreatedAt).getTime();
    return ageMs >= 6 * 30 * 24 * 60 * 60 * 1000 ? { tier: "special", xp: 60 } : null;
  },
  // Milestone
  century_club:  (c) => (c.productsSold + c.totalBuys) >= 100 ? { tier: "special", xp: 200 } : null,
  big_deal:      (c) => c.hasBigDeal   ? { tier: "special", xp: 100 } : null,
  streak_seller: (c) => c.hasStreak    ? { tier: "special", xp: 80  } : null,
  night_owl:     (c) => c.nightListings >= 10 ? { tier: "special", xp: 30 } : null,
  og_badge:      (c) => c.isOGMember   ? { tier: "special", xp: 100 } : null,
};

// ─── Context builder ──────────────────────────────────────────────────────

async function buildContext(userId) {
  const user = await User.findById(userId).select(
    "is_email_verified avatar mobile createdAt wishlist gamification gender"
  );
  if (!user) throw new Error("User not found");

  const products = await Product.find({ seller_id: userId }).select(
    "status category selling_price createdAt updatedAt"
  );

  const SOLD_STATUSES = ["sold", "delivered", "completed"];
  const sold = products.filter((p) => SOLD_STATUSES.includes((p.status || "").toLowerCase()));
  const allListings = products.filter((p) => (p.status || "").toLowerCase() !== "draft");

  // Category counts
  const catCounts = {};
  allListings.forEach((p) => { if (p.category) catCounts[p.category] = (catCounts[p.category] || 0) + 1; });
  const maxCategoryCount = Object.values(catCounts).length ? Math.max(...Object.values(catCounts)) : 0;

  // Quick flip
  const quickFlipCount = sold.filter((p) => {
    return new Date(p.updatedAt) - new Date(p.createdAt) < 3 * 86400000;
  }).length;
  const dayFlipCount = sold.filter((p) => {
    return new Date(p.updatedAt) - new Date(p.createdAt) < 86400000;
  }).length;

  // Big deal
  const hasBigDeal = sold.some((p) => (p.selling_price || 0) >= 5000);

  // Streak: 5 sales in any 7-day window
  const soldMs = sold.map((p) => new Date(p.updatedAt).getTime()).sort((a, b) => a - b);
  let hasStreak = false;
  for (let i = 0; i + 4 < soldMs.length; i++) {
    if (soldMs[i + 4] - soldMs[i] <= 7 * 86400000) { hasStreak = true; break; }
  }

  // Night owl
  const nightListings = allListings.filter((p) => {
    const h = new Date(p.createdAt).getHours();
    return h >= 22 || h < 2;
  }).length;

  // Report count (soft import)
  let reportCount = 0;
  try {
    const { default: Report } = await import("../models/Report.model.js");
    reportCount = await Report.countDocuments({ reported_user: userId, status: "resolved" });
  } catch (_) { /* Report model may not exist yet */ }

  // OG rank
  let isOGMember = false;
  try {
    const rank = await User.countDocuments({ _id: { $lt: userId } });
    isOGMember = rank < 100;
  } catch (_) {}

  // Conversation count
  let conversationCount = 0;
  try {
    const { default: Conversation } = await import("../models/conversation.model.js");
    conversationCount = await Conversation.countDocuments({
      $or: [{ buyer_id: userId }, { seller_id: userId }],
    });
  } catch (_) {}

  return {
    isEmailVerified: !!user.is_email_verified,
    isProfileComplete: !!(user.avatar && user.avatar.url && user.mobile),
    accountCreatedAt: user.createdAt,
    wishlistCount: (user.wishlist || []).length,
    totalListings: allListings.length,
    productsSold: sold.length,
    avgRating: null, // TODO: compute from Review model when available
    maxCategoryCount,
    quickFlipCount,
    dayFlipCount,
    hasBigDeal,
    hasStreak,
    nightListings,
    reportCount,
    isOGMember,
    conversationCount,
    dealsClosedViaChat: sold.length, // approximation
    totalBuys: 0, // TODO: query Deal model for buyer_id = userId, status = completed
  };
}

// ─── Main: compute + award ────────────────────────────────────────────────

/**
 * Recomputes all badges for a user from scratch,
 * updates User.gamification, and logs new badge events.
 *
 * @param {string} userId - MongoDB ObjectId string
 * @returns {Promise<object>} Updated gamification data
 */
export async function computeAndAwardBadges(userId) {
  const ctx = await buildContext(userId);
  const user = await User.findById(userId).select("gamification gender");
  if (!user) throw new Error("User not found");

  const existing = (user.gamification && user.gamification.badges) || [];
  const existingMap = Object.fromEntries(existing.map((b) => [b.badge_id, b]));

  const newBadges = [...existing];
  const newEvents = [];
  let totalXp = (user.gamification && user.gamification.total_xp) || 0;

  for (const [badgeId, evaluate] of Object.entries(BADGE_DEFINITIONS)) {
    const result = evaluate(ctx);
    if (!result) continue;

    const { tier, xp } = result;
    const current = existingMap[badgeId];

    if (!current) {
      // New badge
      newBadges.push({
        badge_id: badgeId,
        category: CATEGORY_MAP[badgeId] || "milestone",
        tier,
        earned_at: new Date(),
        xp_granted: xp,
      });
      totalXp += xp;
      newEvents.push({ user_id: userId, badge_id: badgeId, tier, xp_granted: xp });
    } else if ((TIER_RANK[tier] || 0) > (TIER_RANK[current.tier] || 0)) {
      // Tier upgrade
      const delta = xp - (current.xp_granted || 0);
      const idx = newBadges.findIndex((b) => b.badge_id === badgeId);
      if (idx !== -1) newBadges[idx] = { ...newBadges[idx], tier, xp_granted: xp, earned_at: new Date() };
      totalXp += delta;
      newEvents.push({ user_id: userId, badge_id: badgeId, tier, xp_granted: delta });
    }
  }

  const level = computeLevel(totalXp);
  const rank_title = rankFromLevel(level, user.gender);

  await User.findByIdAndUpdate(userId, {
    "gamification.total_xp": totalXp,
    "gamification.level": level,
    "gamification.rank_title": rank_title,
    "gamification.badges": newBadges,
    "gamification.last_computed_at": new Date(),
  });

  if (newEvents.length > 0) {
    await BadgeEvent.insertMany(newEvents);
  }

  return {
    total_xp: totalXp,
    level,
    rank_title,
    badges: newBadges,
    xp_to_next_level: xpToNextLevel(totalXp),
    next_level: level + 1,
    progress_percent: levelProgress(totalXp),
    newly_earned: newEvents,
  };
}

/** Get current gamification data without recomputing. */
export async function getGamificationData(userId) {
  const user = await User.findById(userId).select("gamification");
  if (!user) throw new Error("User not found");

  const g = (user.gamification) || {};
  const xp = g.total_xp || 0;
  const level = computeLevel(xp);

  return {
    total_xp: xp,
    level,
    rank_title: g.rank_title || "Seedling",
    badges: g.badges || [],
    xp_to_next_level: xpToNextLevel(xp),
    next_level: level + 1,
    progress_percent: levelProgress(xp),
    last_computed_at: g.last_computed_at || null,
  };
}
