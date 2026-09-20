import { USER_TIER } from "./constants.js";
import {
  getMonthlyBoostCredits,
  getSubscriptionPlan,
} from "./subscriptionPlans.js";

// Single source of truth: Subscription_plan.md via subscriptionPlans.js.
// Free 0 credits, Pro 2 x 3 days, Pro+ 5 x 7 days. maxActiveBoosts is an
// anti-spam cap (not in the spec) limiting simultaneous live boosts.
const durationHoursFor = (tier) => {
  const days = getSubscriptionPlan(tier)?.boostDurationDays;
  return typeof days === "number" && days > 0 ? days * 24 : 72;
};

export const BOOST_PLAN_RULES = Object.freeze({
  [USER_TIER.BASE_USER]: {
    monthlyLimit: getMonthlyBoostCredits(USER_TIER.BASE_USER),
    durationHours: durationHoursFor(USER_TIER.BASE_USER),
    maxActiveBoosts: 1,
  },
  [USER_TIER.PRO]: {
    monthlyLimit: getMonthlyBoostCredits(USER_TIER.PRO),
    durationHours: durationHoursFor(USER_TIER.PRO),
    maxActiveBoosts: 1,
  },
  [USER_TIER.PRO_PLUS]: {
    monthlyLimit: getMonthlyBoostCredits(USER_TIER.PRO_PLUS),
    durationHours: durationHoursFor(USER_TIER.PRO_PLUS),
    maxActiveBoosts: 3,
  },
});

export const DEFAULT_BOOST_PLAN = USER_TIER.BASE_USER;

export const getBoostPlanRules = (tier = DEFAULT_BOOST_PLAN) => {
  return BOOST_PLAN_RULES[tier] || BOOST_PLAN_RULES[DEFAULT_BOOST_PLAN];
};
