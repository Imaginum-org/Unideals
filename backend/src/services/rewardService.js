import User from "../models/User.model.js";
import { rankFromLevel } from "./badgeService.js";
import { USER_TIER, SUBSCRIPTION_STATUS } from "../config/constants.js";

// ─── Reward definitions ───────────────────────────────────────────────────────
//
// LEVEL REWARDS — fire once when the user first reaches that exact level.
// reward_id must be stable (used as deduplication key in rewards_claimed).

const LEVEL_REWARDS = [
  {
    id: "level_5_gift",
    level: 5,
    label: "Level 5 – Explorer Reached! 🔵",
    grants: [{ type: "boost_credit", value: 1 }],
  },
  {
    id: "level_10_gift",
    level: 10,
    label: "Level 10 – Dealer Reached! ⚡",
    grants: [{ type: "boost_credit", value: 2 }],
  },
  {
    id: "level_15_gift",
    level: 15,
    label: "Level 15 Milestone 🌟",
    grants: [
      { type: "boost_credit", value: 2 },
      { type: "frame", value: "bronze" },
    ],
  },
  {
    id: "level_20_gift",
    level: 20,
    label: "Level 20 – Hustler Reached! 🔥",
    grants: [{ type: "boost_credit", value: 3 }],
  },
  {
    id: "level_25_gift",
    level: 25,
    label: "Level 25 Milestone ✨",
    grants: [
      { type: "boost_credit", value: 3 },
      { type: "tag", value: "rising_star" },
    ],
  },
  {
    id: "level_30_gift",
    level: 30,
    label: "Level 30 – Legend Reached! 💎",
    grants: [
      { type: "boost_credit", value: 4 },
      { type: "frame", value: "gold" },
    ],
  },
  {
    id: "level_35_gift",
    level: 35,
    label: "Level 35 Milestone 💫",
    grants: [{ type: "boost_credit", value: 4 }],
  },
  {
    id: "level_40_gift",
    level: 40,
    label: "Level 40 – Campus Royale! 👑",
    grants: [
      { type: "boost_credit", value: 5 },
      { type: "frame", value: "crown" },
    ],
  },
  {
    id: "level_45_gift",
    level: 45,
    label: "Level 45 Milestone 🌈",
    grants: [
      { type: "boost_credit", value: 5 },
      { type: "tag", value: "campus_legend" },
    ],
  },
  {
    id: "level_50_gift",
    level: 50,
    label: "Level 50 – MAX LEVEL! 🌟",
    grants: [
      { type: "boost_credit", value: 10 },
      { type: "tag", value: "hall_of_fame" },
    ],
  },
];

// RANK REWARDS — fire once when the user first enters a rank tier.
// Subscriptions here are "gamification gifts" granted without a payment.

const RANK_REWARDS = [
  {
    id: "rank_seedling_gift",
    rank: "Seedling",
    minLevel: 1,
    label: "Welcome to Unideals! 🌱",
    grants: [{ type: "boost_credit", value: 1 }],
  },
  {
    id: "rank_explorer_gift",
    rank: "Explorer",
    minLevel: 5,
    label: "Explorer Rank Unlocked! 🔵",
    grants: [{ type: "boost_credit", value: 2 }],
  },
  {
    id: "rank_dealer_gift",
    rank: "Dealer",
    minLevel: 10,
    label: "Dealer Rank – 1 Month Pro FREE! ⚡",
    grants: [
      { type: "boost_credit", value: 3 },
      { type: "subscription", value: { tier: USER_TIER.PRO, days: 30, is_lifetime: false } },
    ],
  },
  {
    id: "rank_hustler_gift",
    rank: "Hustler",
    minLevel: 20,
    label: "Hustler Rank – 1 Semester Pro FREE! 🔥",
    grants: [
      { type: "boost_credit", value: 5 },
      { type: "subscription", value: { tier: USER_TIER.PRO, days: 180, is_lifetime: false } },
      { type: "frame", value: "hustler" },
    ],
  },
  {
    id: "rank_legend_gift",
    rank: "Legend",
    minLevel: 30,
    label: "Legend Rank – 1 Semester Pro+ FREE! 💎",
    grants: [
      { type: "boost_credit", value: 7 },
      { type: "subscription", value: { tier: USER_TIER.PRO_PLUS, days: 180, is_lifetime: false } },
    ],
  },
  {
    id: "rank_royale_gift",
    rank: "Campus Royale",  // matches Campus King, Campus Queen, Campus Royale
    minLevel: 40,
    label: "Campus Royale – LIFETIME Pro+ FREE! 👑",
    grants: [
      { type: "boost_credit", value: 10 },
      { type: "subscription", value: { tier: USER_TIER.PRO_PLUS, days: null, is_lifetime: true } },
      { type: "tag", value: "campus_royale" },
    ],
  },
];

// Ranks that count as "Campus Royale" (gender variants)
const ROYALE_TITLES = new Set(["Campus King", "Campus Queen", "Campus Royale"]);

/** Normalise rank title so gender variants all match the RANK_REWARDS entry. */
function normaliseRank(rankTitle) {
  return ROYALE_TITLES.has(rankTitle) ? "Campus Royale" : rankTitle;
}

// ─── Grant helpers ────────────────────────────────────────────────────────────

/**
 * Upsert a gamification subscription reward.
 * If the user already has a HIGHER or EQUAL tier that is lifetime, skip.
 * If the same tier exists and is active, extend expires_at.
 * If user has a lower tier or no sub, activate the new tier.
 */
async function grantSubscription(userId, subGrant) {
  const { tier, days, is_lifetime } = subGrant;

  const { default: Subscription } = await import("../models/Subscription.model.js");

  // Tier priority: base_user < pro < pro_plus
  const TIER_RANK = {
    [USER_TIER.BASE_USER]: 0,
    [USER_TIER.PRO]: 1,
    [USER_TIER.PRO_PLUS]: 2,
  };

  const existing = await Subscription.findOne({ user_id: userId });

  const now = new Date();

  if (existing && existing.status === SUBSCRIPTION_STATUS.ACTIVE) {
    const existingRank = TIER_RANK[existing.tier] ?? 0;
    const newRank = TIER_RANK[tier] ?? 0;

    if (existing.is_lifetime) {
      // Already lifetime — nothing to do (already best possible)
      return;
    }

    if (existingRank > newRank) {
      // User is on a better tier already — only bump credits, no sub change
      return;
    }

    if (existingRank === newRank && !is_lifetime) {
      // Same tier: stack time on top of remaining time
      const base = existing.expires_at && existing.expires_at > now
        ? existing.expires_at
        : now;
      const newExpiry = days ? new Date(base.getTime() + days * 24 * 60 * 60 * 1000) : null;
      await Subscription.updateOne({ user_id: userId }, {
        $set: {
          expires_at: newExpiry,
          status: SUBSCRIPTION_STATUS.ACTIVE,
        },
      });
      await User.findByIdAndUpdate(userId, { subscription: tier });
      return;
    }
  }

  // Activate fresh
  const expiresAt = is_lifetime || !days
    ? null
    : new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

  await Subscription.findOneAndUpdate(
    { user_id: userId },
    {
      $set: {
        user_id: userId,
        tier,
        subscription_type: "gamification_reward",
        status: SUBSCRIPTION_STATUS.ACTIVE,
        is_lifetime: is_lifetime ?? false,
        started_at: now,
        expires_at: expiresAt,
        last_payment_id: null,
        cancelled_at: null,
      },
    },
    { new: true, upsert: true },
  );

  await User.findByIdAndUpdate(userId, { subscription: tier });
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Check what level/rank rewards the user has newly unlocked and grant them.
 *
 * @param {string} userId
 * @param {number} newLevel - level AFTER the latest badge compute
 * @param {string} newRankTitle - rank title AFTER the latest badge compute
 * @returns {Promise<Array>} - array of newly granted reward objects for socket/toast
 */
export async function checkAndGrantRewards(userId, newLevel, newRankTitle) {
  const user = await User.findById(userId).select("gamification").lean();
  if (!user) return [];

  const alreadyClaimed = new Set(
    (user.gamification?.rewards_claimed || []).map((r) => r.reward_id)
  );

  const newRewards = []; // rewards to grant this run
  const creditDelta = { total: 0 };
  let newFrame = null;
  const newTags = [];
  const subGrants = [];
  const claimEntries = [];

  // ─ Check LEVEL rewards ────────────────────────────────────────────────────
  for (const reward of LEVEL_REWARDS) {
    if (reward.level > newLevel) continue;
    if (alreadyClaimed.has(reward.id)) continue;

    for (const g of reward.grants) {
      if (g.type === "boost_credit") creditDelta.total += g.value;
      if (g.type === "frame")        newFrame = g.value;
      if (g.type === "tag")          newTags.push(g.value);
      if (g.type === "subscription") subGrants.push(g.value);
    }
    claimEntries.push(
      ...reward.grants.map((g) => ({
        reward_id:   reward.id,
        reward_type: g.type,
        value:       g.value,
        claimed_at:  new Date(),
      }))
    );
    newRewards.push({ id: reward.id, label: reward.label, grants: reward.grants });
  }

  // ─ Check RANK rewards ─────────────────────────────────────────────────────
  const normalisedRank = normaliseRank(newRankTitle);

  for (const reward of RANK_REWARDS) {
    if (newLevel < reward.minLevel) continue;
    if (alreadyClaimed.has(reward.id)) continue;

    for (const g of reward.grants) {
      if (g.type === "boost_credit") creditDelta.total += g.value;
      if (g.type === "frame")        newFrame = g.value;
      if (g.type === "tag")          newTags.push(g.value);
      if (g.type === "subscription") subGrants.push(g.value);
    }
    claimEntries.push(
      ...reward.grants.map((g) => ({
        reward_id:   reward.id,
        reward_type: g.type,
        value:       g.value,
        claimed_at:  new Date(),
      }))
    );
    newRewards.push({ id: reward.id, label: reward.label, grants: reward.grants });
  }

  if (newRewards.length === 0) return [];

  // ─ Apply DB writes atomically ─────────────────────────────────────────────
  const updateOps = {
    $push: { "gamification.rewards_claimed": { $each: claimEntries } },
  };

  if (creditDelta.total > 0) {
    updateOps.$inc = { "gamification.boost_credits": creditDelta.total };
  }
  if (newTags.length > 0) {
    updateOps.$addToSet = { "gamification.special_tags": { $each: newTags } };
  }
  if (newFrame) {
    updateOps.$set = { "gamification.profile_frame": newFrame };
  }

  await User.findByIdAndUpdate(userId, updateOps);

  // Subscription grants (handled outside the main $update to allow stacking logic)
  for (const sub of subGrants) {
    await grantSubscription(userId, sub);
  }

  return newRewards;
}

/**
 * Returns reward-related fields from the user's gamification doc.
 * Used by GET /api/rewards/me
 */
export async function getRewardData(userId) {
  const user = await User.findById(userId).select("gamification").lean();
  if (!user) throw new Error("User not found");

  const g = user.gamification || {};
  return {
    boost_credits:   g.boost_credits || 0,
    profile_frame:   g.profile_frame || null,
    special_tags:    g.special_tags || [],
    rewards_claimed: g.rewards_claimed || [],
  };
}

// Export reward definitions so the frontend config can consume them
export { LEVEL_REWARDS, RANK_REWARDS };
