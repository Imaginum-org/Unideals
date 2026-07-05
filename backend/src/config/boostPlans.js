import { USER_TIER } from "./constants.js";

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
