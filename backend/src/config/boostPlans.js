import { USER_TIER } from "./constants.js";

// NOTE: BOOST_PLAN_RULES is the live enforcement for boosts.
// subscriptionPlans.js documents the monetization targets (0/2/5 credits,
// 3d/7d durations) for when payments launch. To avoid breaking current
// Free/Pro behavior (Free currently gets boosts), enforcement keeps legacy
// limits until payments are wired. Do not change these without migrating
// existing users. See Subscription_plan.md.
export const BOOST_PLAN_RULES = Object.freeze({
  [USER_TIER.BASE_USER]: {
    monthlyLimit: 2,
    durationHours: 1,
    maxActiveBoosts: 1,
  },
  [USER_TIER.PRO]: {
    monthlyLimit: 10,
    durationHours: 3,
    maxActiveBoosts: 1,
  },
  [USER_TIER.PRO_PLUS]: {
    monthlyLimit: 30,
    durationHours: 3,
    maxActiveBoosts: 3,
  },
});

export const DEFAULT_BOOST_PLAN = USER_TIER.BASE_USER;

export const getBoostPlanRules = (tier = DEFAULT_BOOST_PLAN) => {
  return BOOST_PLAN_RULES[tier] || BOOST_PLAN_RULES[DEFAULT_BOOST_PLAN];
};
