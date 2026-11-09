import { USER_TIER } from "./constants.js";

/**
 * Payment Configuration
 */

export const PAYMENT_CONFIG = Object.freeze({
  currency: "INR",
});

/**
 * Subscription Types
 */

export const SUBSCRIPTION_TYPE = Object.freeze({
  FOUNDER: "founder",
  SEMESTER: "semester",
});

/**
 * Current Active Subscription Type
 *
 * Change ONLY this value when Founder Offer ends.
 */

export const ACTIVE_SUBSCRIPTION_TYPE = SUBSCRIPTION_TYPE.FOUNDER;

/**
 * Subscription Plans
 */

export const SUBSCRIPTION_PLANS = Object.freeze({
  [USER_TIER.BASE_USER]: {
    id: USER_TIER.BASE_USER,

    displayName: "Free",

    amountInPaise: 0,

    subscriptionType: null,

    isLifetime: true,

    durationDays: null,

    monthlyBoostCredits: 0,

    boostDurationDays: 0,

    activeListings: 10,

    wishlistLimit: 25,

    searchPriority: 0,

    chatPriority: 0,
  },

  [USER_TIER.PRO]: {
    founder: {
      id: USER_TIER.PRO,

      displayName: "Pro",

      amountInPaise: 9900,

      subscriptionType: SUBSCRIPTION_TYPE.FOUNDER,

      isLifetime: true,

      durationDays: null,

      monthlyBoostCredits: 2,

      boostDurationDays: 3,

      activeListings: 25,

      wishlistLimit: 100,

      searchPriority: 1,

      chatPriority: 1,
    },

    semester: {
      id: USER_TIER.PRO,

      displayName: "Pro",

      amountInPaise: 9900,

      subscriptionType: SUBSCRIPTION_TYPE.SEMESTER,

      isLifetime: false,

      durationDays: 180,

      monthlyBoostCredits: 2,

      boostDurationDays: 3,

      activeListings: 25,

      wishlistLimit: 100,

      searchPriority: 1,

      chatPriority: 1,
    },
  },

  [USER_TIER.PRO_PLUS]: {
    founder: {
      id: USER_TIER.PRO_PLUS,

      displayName: "Pro+",

      amountInPaise: 19900,

      subscriptionType: SUBSCRIPTION_TYPE.FOUNDER,

      isLifetime: true,

      durationDays: null,

      monthlyBoostCredits: 5,

      boostDurationDays: 7,

      activeListings: null,

      wishlistLimit: null,

      searchPriority: 2,

      chatPriority: 2,
    },

    semester: {
      id: USER_TIER.PRO_PLUS,

      displayName: "Pro+",

      amountInPaise: 19900,

      subscriptionType: SUBSCRIPTION_TYPE.SEMESTER,

      isLifetime: false,

      durationDays: 180,

      monthlyBoostCredits: 5,

      boostDurationDays: 7,

      activeListings: null,

      wishlistLimit: null,

      searchPriority: 2,

      chatPriority: 2,
    },
  },
});

/**
 * Girls Founder offer 🌸
 *
 * Female accounts get a reduced FOUNDER price (lifetime plans only; never on
 * semester plans or boost add-ons). Enforced server-side in createOrder —
 * the client only displays what GET /api/payments/plans returns.
 * Gender is set once at onboarding and later changes need admin approval
 * (user.controller), so the offer can't be toggled freely.
 */
export const GIRLS_FOUNDER_OFFER = Object.freeze({
  id: "girls_founder",
  label: "Girls Founder offer",
  amountsInPaise: Object.freeze({
    [USER_TIER.PRO]: 7900,
    [USER_TIER.PRO_PLUS]: 15900,
  }),
});

export const isGirlsFounderEligible = (
  user,
  subscriptionType = ACTIVE_SUBSCRIPTION_TYPE,
) =>
  subscriptionType === SUBSCRIPTION_TYPE.FOUNDER &&
  String(user?.gender || "").toLowerCase() === "female";

/**
 * Single source of truth for what a given user pays for a paid tier.
 * Returns { amountInPaise, baseAmountInPaise, offer } (offer null = list price).
 */
export const getPlanPriceForUser = (
  tier,
  user,
  subscriptionType = ACTIVE_SUBSCRIPTION_TYPE,
) => {
  const plan = getSubscriptionPlan(tier, subscriptionType);
  if (!plan) return null;
  const baseAmountInPaise = plan.amountInPaise;
  const offerAmount = GIRLS_FOUNDER_OFFER.amountsInPaise[tier];
  if (
    offerAmount &&
    offerAmount < baseAmountInPaise &&
    isGirlsFounderEligible(user, subscriptionType)
  ) {
    return {
      amountInPaise: offerAmount,
      baseAmountInPaise,
      offer: GIRLS_FOUNDER_OFFER.id,
    };
  }
  return { amountInPaise: baseAmountInPaise, baseAmountInPaise, offer: null };
};

/**
 * Helpers
 */

export const getSubscriptionPlan = (
  tier,
  subscriptionType = ACTIVE_SUBSCRIPTION_TYPE,
) => {
  if (tier === USER_TIER.BASE_USER) {
    return SUBSCRIPTION_PLANS[tier];
  }

  return SUBSCRIPTION_PLANS[tier]?.[subscriptionType] ?? null;
};

export const getPlanAmount = (
  tier,
  subscriptionType = ACTIVE_SUBSCRIPTION_TYPE,
) => {
  return getSubscriptionPlan(tier, subscriptionType)?.amountInPaise ?? null;
};

export const isPaidPlan = (tier) => {
  return tier === USER_TIER.PRO || tier === USER_TIER.PRO_PLUS;
};

export const isLifetimePlan = (
  tier,
  subscriptionType = ACTIVE_SUBSCRIPTION_TYPE,
) => {
  return getSubscriptionPlan(tier, subscriptionType)?.isLifetime ?? false;
};

export const getMonthlyBoostCredits = (
  tier,
  subscriptionType = ACTIVE_SUBSCRIPTION_TYPE,
) => {
  return getSubscriptionPlan(tier, subscriptionType)?.monthlyBoostCredits ?? 0;
};

export const getListingLimit = (
  tier,
  subscriptionType = ACTIVE_SUBSCRIPTION_TYPE,
) => {
  // Fail closed: unknown/corrupt tiers get Free limits. Explicit null
  // (Pro+ unlimited) is preserved — only undefined falls back.
  const value = getSubscriptionPlan(tier, subscriptionType)?.activeListings;
  return value === undefined
    ? SUBSCRIPTION_PLANS[USER_TIER.BASE_USER].activeListings
    : value;
};

export const getWishlistLimit = (
  tier,
  subscriptionType = ACTIVE_SUBSCRIPTION_TYPE,
) => {
  // Fail closed: unknown/corrupt tiers get Free limits. Explicit null
  // (Pro+ unlimited) is preserved — only undefined falls back.
  const value = getSubscriptionPlan(tier, subscriptionType)?.wishlistLimit;
  return value === undefined
    ? SUBSCRIPTION_PLANS[USER_TIER.BASE_USER].wishlistLimit
    : value;
};
