import mongoose from "mongoose";
import Subscription from "../models/Subscription.model.js";
import Payment from "../models/Payment.model.js";
import User from "../models/User.model.js";
import Product from "../models/Product.model.js";
import { SUBSCRIPTION_STATUS, USER_TIER } from "../config/constants.js";
import {
  ACTIVE_SUBSCRIPTION_TYPE,
  getSubscriptionPlan,
  getListingLimit,
  getWishlistLimit,
  getMonthlyBoostCredits,
  isLifetimePlan,
} from "../config/subscriptionPlans.js";
import { getBoostSummary } from "./boost.service.js";

// Single activation point for paid tiers. Called exactly once per payment
// (verify-claim winner or captured-webhook winner). Upsert-based so any
// duplicate invocation converges instead of duplicating.
export const activateTier = async ({ userId, plan, paymentId }) => {
  const planDef = getSubscriptionPlan(plan, ACTIVE_SUBSCRIPTION_TYPE);
  if (!planDef) {
    throw new Error("Unknown subscription plan.");
  }

  const now = new Date();
  const lifetime = isLifetimePlan(plan, ACTIVE_SUBSCRIPTION_TYPE);
  const expiresAt =
    lifetime || !planDef.durationDays
      ? null
      : new Date(now.getTime() + planDef.durationDays * 24 * 60 * 60 * 1000);

  const subscription = await Subscription.findOneAndUpdate(
    { user_id: userId },
    {
      $set: {
        user_id: userId,
        tier: plan,
        subscription_type: ACTIVE_SUBSCRIPTION_TYPE,
        status: SUBSCRIPTION_STATUS.ACTIVE,
        is_lifetime: lifetime,
        started_at: now,
        expires_at: expiresAt,
        last_payment_id: paymentId,
        cancelled_at: null,
      },
    },
    { new: true, upsert: true },
  );

  await User.findByIdAndUpdate(userId, {
    subscription: plan,
    subscription_details: subscription._id,
  });

  return subscription;
};

export const getMySubscription = async (user) => {
  const tier = user.subscription || USER_TIER.BASE_USER;
  const planDef = getSubscriptionPlan(tier, ACTIVE_SUBSCRIPTION_TYPE);

  const subscription = await Subscription.findOne({ user_id: user._id })
    .populate("last_payment_id", "plan amount currency status verified_at createdAt")
    .lean();

  const payments = await Payment.find({ user_id: user._id })
    .select("plan amount currency status razorpay_order_id createdAt verified_at")
    .sort({ createdAt: -1 })
    .limit(10)
    .lean();

  // Live usage (never marketing copy): listing + wishlist counts vs plan caps.
  const [activeListings, wishlistCount, boost] = await Promise.all([
    Product.countDocuments({
      seller_id: user._id,
      status: "listed",
      is_deleted: false,
    }),
    User.findById(user._id).select("wishlist").lean().then((u) => u?.wishlist?.length || 0),
    getBoostSummary(user).catch(() => null),
  ]);

  const listingLimit = getListingLimit(tier, ACTIVE_SUBSCRIPTION_TYPE);
  const wishlistLimit = getWishlistLimit(tier, ACTIVE_SUBSCRIPTION_TYPE);

  return {
    tier,
    displayName: planDef?.displayName || "Free",
    status: subscription?.status || (tier === USER_TIER.BASE_USER ? "active" : null),
    isLifetime: subscription?.is_lifetime ?? tier === USER_TIER.BASE_USER,
    subscriptionType: subscription?.subscription_type || null,
    startedAt: subscription?.started_at || null,
    expiresAt: subscription?.expires_at || null,
    amountInPaise: planDef?.amountInPaise ?? 0,
    limits: {
      activeListings: listingLimit,
      wishlist: wishlistLimit,
      monthlyBoostCredits: getMonthlyBoostCredits(tier, ACTIVE_SUBSCRIPTION_TYPE),
    },
    usage: {
      activeListings,
      wishlist: wishlistCount,
      boost: boost
        ? {
            monthlyUsed: boost.monthlyUsed,
            monthlyRemaining: boost.monthlyRemaining,
            activeBoosts: boost.activeBoosts,
          }
        : null,
    },
    lastPayment: subscription?.last_payment_id || null,
    payments,
  };
};

// Swept by the expireSubscriptions cron. Founder/lifetime rows are skipped.
// Returns counts for logging.
export const expireDueSubscriptions = async () => {
  const now = new Date();
  const due = await Subscription.find({
    status: SUBSCRIPTION_STATUS.ACTIVE,
    is_lifetime: false,
    expires_at: { $lte: now },
  })
    .select("_id user_id")
    .lean();

  let expired = 0;
  for (const sub of due) {
    try {
      await Subscription.updateOne(
        { _id: sub._id, status: SUBSCRIPTION_STATUS.ACTIVE },
        { $set: { status: SUBSCRIPTION_STATUS.EXPIRED } },
      );
      await User.updateOne(
        { _id: sub.user_id, subscription: { $ne: USER_TIER.BASE_USER } },
        { $set: { subscription: USER_TIER.BASE_USER } },
      );
      expired += 1;
    } catch {
      // best-effort per row; job continues
    }
  }
  return { checked: due.length, expired };
};

export const isSubscriptionActive = (subscription) =>
  subscription?.status === SUBSCRIPTION_STATUS.ACTIVE &&
  (subscription.is_lifetime || !subscription.expires_at || subscription.expires_at > new Date());
