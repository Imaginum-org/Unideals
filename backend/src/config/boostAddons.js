import { USER_TIER } from "./constants.js";

// One-time boost add-ons any user (Free/Pro/Pro+) can buy per spec.
// Amounts in paise; durations in hours.
export const BOOST_ADDON = Object.freeze({
  THREE_DAY: "boost_3day",
  SEVEN_DAY: "boost_7day",
});

export const BOOST_ADDONS = Object.freeze({
  [BOOST_ADDON.THREE_DAY]: {
    id: BOOST_ADDON.THREE_DAY,
    displayName: "3-Day Listing Boost",
    amountInPaise: 2900,
    durationHours: 72,
  },
  [BOOST_ADDON.SEVEN_DAY]: {
    id: BOOST_ADDON.SEVEN_DAY,
    displayName: "7-Day Listing Boost",
    amountInPaise: 4900,
    durationHours: 168,
  },
});

export const isBoostAddon = (plan) =>
  plan === BOOST_ADDON.THREE_DAY || plan === BOOST_ADDON.SEVEN_DAY;

export const getBoostAddon = (plan) => BOOST_ADDONS[plan] || null;

export const ALL_PURCHASABLE = Object.freeze([
  USER_TIER.PRO,
  USER_TIER.PRO_PLUS,
  BOOST_ADDON.THREE_DAY,
  BOOST_ADDON.SEVEN_DAY,
]);
