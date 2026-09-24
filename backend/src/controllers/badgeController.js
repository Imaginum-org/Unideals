import { computeAndAwardBadges, getGamificationData } from "../services/badgeService.js";
import User from "../models/User.model.js";

/**
 * GET /api/badges/me
 * Returns current user's XP, level, rank, and earned badges.
 */
export const getMyBadges = async (req, res) => {
  try {
    const data = await getGamificationData(req.user._id);
    return res.status(200).json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * POST /api/badges/compute
 * Recomputes all badges from scratch for the current user.
 */
export const recomputeMyBadges = async (req, res) => {
  try {
    const data = await computeAndAwardBadges(req.user._id);
    return res.status(200).json({
      success: true,
      message: "Badges recomputed successfully",
      data,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * GET /api/badges/leaderboard
 * Top 20 users by XP, scoped to same campus (if available).
 */
export const getLeaderboard = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);

    const users = await User.find(
      { "gamification.total_xp": { $gt: 0 } },
      {
        name: 1,
        avatar: 1,
        "gamification.total_xp": 1,
        "gamification.level": 1,
        "gamification.rank_title": 1,
        "gamification.badges": 1,
      }
    )
      .sort({ "gamification.total_xp": -1 })
      .limit(limit)
      .lean();

    const leaderboard = users.map((u, i) => ({
      rank: i + 1,
      name: u.name,
      avatar: u.avatar,
      total_xp: u.gamification?.total_xp || 0,
      level: u.gamification?.level || 1,
      rank_title: u.gamification?.rank_title || "Seedling",
      badge_count: (u.gamification?.badges || []).length,
    }));

    return res.status(200).json({ success: true, data: leaderboard });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * GET /api/badges/config
 * Returns the full badge catalogue (no auth required).
 */
export const getBadgeConfig = async (req, res) => {
  const { BADGE_CONFIG } = await import("../../frontend-badge-config-placeholder.js").catch(
    () => ({ BADGE_CONFIG: [] })
  );
  // Return a static config inline so the frontend doesn't need a separate fetch
  return res.status(200).json({ success: true, data: BADGE_CATALOGUE });
};

// Static badge catalogue served by the API
const BADGE_CATALOGUE = [
  // ── Seller ──────────────────────────────────────────────────────────────
  { id: "first_listing",  category: "seller", name: "First Drop",   icon: "📦", tiers: [{ tier: "special", xp: 30,  label: "Post your first listing" }] },
  { id: "power_seller",   category: "seller", name: "Power Seller", icon: "🏪", tiers: [{ tier: "bronze", xp: 50,  label: "Sell 5 products" }, { tier: "silver", xp: 100, label: "Sell 20 products" }, { tier: "gold", xp: 200, label: "Sell 50 products" }] },
  { id: "top_rater",      category: "seller", name: "Top Rated",    icon: "⭐", tiers: [{ tier: "bronze", xp: 60,  label: "Avg rating ≥ 4.0" }, { tier: "silver", xp: 100, label: "Avg rating ≥ 4.5" }, { tier: "gold", xp: 200, label: "Avg rating ≥ 4.8" }] },
  { id: "category_ace",   category: "seller", name: "Category Ace", icon: "🎯", tiers: [{ tier: "bronze", xp: 40,  label: "3 items in same category" }, { tier: "silver", xp: 80, label: "10 items in same category" }, { tier: "gold", xp: 150, label: "25 items in same category" }] },
  { id: "quick_flip",     category: "seller", name: "Quick Flip",   icon: "⚡", tiers: [{ tier: "bronze", xp: 40,  label: "Sell an item within 3 days" }, { tier: "silver", xp: 80, label: "Sell an item within 1 day" }, { tier: "gold", xp: 150, label: "5 sales each within 1 day" }] },
  // ── Buyer ────────────────────────────────────────────────────────────────
  { id: "first_buy",         category: "buyer", name: "First Purchase",  icon: "🛒", tiers: [{ tier: "special", xp: 30,  label: "Complete your first purchase" }] },
  { id: "deal_hunter",       category: "buyer", name: "Deal Hunter",     icon: "🔍", tiers: [{ tier: "bronze", xp: 50,  label: "5 completed buys" }, { tier: "silver", xp: 100, label: "15 completed buys" }, { tier: "gold", xp: 200, label: "30 completed buys" }] },
  { id: "wishlist_curator",  category: "buyer", name: "Curator",         icon: "💝", tiers: [{ tier: "bronze", xp: 20,  label: "10 wishlist items" }, { tier: "silver", xp: 40, label: "25 wishlist items" }, { tier: "gold", xp: 80, label: "50 wishlist items" }] },
  // ── Communication ────────────────────────────────────────────────────────
  { id: "chatter",       category: "communication", name: "Social Butterfly", icon: "💬", tiers: [{ tier: "bronze", xp: 20,  label: "10 conversations" }, { tier: "silver", xp: 50, label: "50 conversations" }, { tier: "gold", xp: 100, label: "100 conversations" }] },
  { id: "deal_closer",   category: "communication", name: "Deal Closer",      icon: "🤝", tiers: [{ tier: "bronze", xp: 50,  label: "3 deals closed" }, { tier: "silver", xp: 100, label: "10 deals closed" }, { tier: "gold", xp: 200, label: "25 deals closed" }] },
  // ── Trust ────────────────────────────────────────────────────────────────
  { id: "verified_student", category: "trust", name: "Verified Student", icon: "✅", tiers: [{ tier: "special", xp: 50,  label: "Verify your email" }] },
  { id: "profile_complete", category: "trust", name: "Profile Pro",      icon: "🪪", tiers: [{ tier: "special", xp: 40,  label: "Complete your profile" }] },
  { id: "trusted_trader",   category: "trust", name: "Trusted Trader",   icon: "🛡️", tiers: [{ tier: "special", xp: 100, label: "0 disputes, 10+ deals" }] },
  { id: "early_adopter",    category: "trust", name: "Early Adopter",    icon: "🎖️", tiers: [{ tier: "special", xp: 75,  label: "Joined during early access" }] },
  { id: "campus_veteran",   category: "trust", name: "Campus Veteran",   icon: "🏛️", tiers: [{ tier: "special", xp: 60,  label: "Account older than 6 months" }] },
  // ── Milestone ────────────────────────────────────────────────────────────
  { id: "century_club",   category: "milestone", name: "Century Club",  icon: "💯", tiers: [{ tier: "special", xp: 200, label: "100 total transactions" }] },
  { id: "big_deal",       category: "milestone", name: "Big Deal",      icon: "💰", tiers: [{ tier: "special", xp: 100, label: "Sell an item for ₹5,000+" }] },
  { id: "streak_seller",  category: "milestone", name: "On A Roll",     icon: "🔥", tiers: [{ tier: "special", xp: 80,  label: "5 sales in 7 days" }] },
  { id: "night_owl",      category: "milestone", name: "Night Owl",     icon: "🦉", tiers: [{ tier: "special", xp: 30,  label: "10 late-night listings" }] },
  { id: "og_badge",       category: "milestone", name: "OG Member",     icon: "👾", tiers: [{ tier: "special", xp: 100, label: "Among the first 100 users" }] },
];
