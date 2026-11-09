import { USER_TIER } from "../config/constants.js";
import { getSubscriptionPlan } from "../config/subscriptionPlans.js";

/**
 * Plan perks that aren't plain limits (pricing page → code):
 *
 *  • Search ranking  Normal / Higher / Highest
 *      → `sellerRank(tier)` 0/1/2 is denormalised onto each listing
 *        (Product.seller_tier) and weighted into feed + search scoring.
 *  • Chat priority   – / Higher / Highest
 *      → conversations with a Pro+/Pro counterpart sort first.
 *  • Customer support Standard / Priority / Highest Priority
 *      → `supportPriorityFor(tier)` stamps every ticket server-side.
 *  • Early access     – / Limited / Full   (see config/labs.js)
 */

// 0 = Free, 1 = Pro, 2 = Pro+. Read from the plan config so pricing and
// behaviour can never drift apart.
export const sellerRank = (tier) => {
  const n = getSubscriptionPlan(tier || USER_TIER.BASE_USER)?.searchPriority;
  return Number.isInteger(n) && n > 0 ? Math.min(n, 2) : 0;
};

export const chatRank = (tier) => {
  const n = getSubscriptionPlan(tier || USER_TIER.BASE_USER)?.chatPriority;
  return Number.isInteger(n) && n > 0 ? Math.min(n, 2) : 0;
};

// Ranking weights. Feed score ≈ recency*30 + log10(views)*10 + trending(10):
// a Pro+ listing gets the lift of a ~1-day-fresher post, Pro half that.
// Search keeps relevance first (title match = 10); the plan breaks ties.
export const FEED_RANK_WEIGHT = 8;
export const SEARCH_RANK_WEIGHT = 3;
// Trending score ≈ log10(views)*10 + freshness(≤20): Pro+ ≈ +10, Pro ≈ +5.
export const TRENDING_RANK_WEIGHT = 5;

const SUPPORT_PRIORITY = {
  0: { priority: "normal", rank: 1 },
  1: { priority: "high", rank: 2 },
  2: { priority: "urgent", rank: 3 },
};

/**
 * Ticket priority comes from the requester's plan, never from the client
 * (the form used to send its own "priority", so anyone could claim High).
 * Feature suggestions from free users stay "low".
 */
export const supportPriorityFor = (tier, supportType) => {
  const rank = sellerRank(tier);
  if (rank === 0 && supportType === "suggest") return { priority: "low", rank: 0 };
  return SUPPORT_PRIORITY[rank];
};
