import Boost from "../models/Boost.model.js";
import Product from "../models/Product.model.js";
import User from "../models/User.model.js";
import { PRODUCT_STATUS } from "../config/constants.js";
import { getBoostPlanRules } from "../config/boostPlans.js";

// Monthly quota: only plan boosts count. Purchased add-ons (isAddon) and
// level-reward boosts (isReward) are paid for separately. $ne:true keeps
// legacy docs without the fields counted as quota.
const MONTHLY_FILTER = { isAddon: { $ne: true }, isReward: { $ne: true } };
// Live-boost cap (anti-spam): plan and reward boosts share it; purchased
// add-ons never take a slot.
const ACTIVE_FILTER = { isAddon: { $ne: true } };

const quotaCounts = (userId, start, end) =>
  Promise.all([
    Boost.countDocuments({ user_id: userId, ...MONTHLY_FILTER, createdAt: { $gte: start, $lt: end } }),
    Boost.countDocuments({ user_id: userId, ...ACTIVE_FILTER, status: "active", expires_at: { $gt: new Date() } }),
  ]);

const rewardCreditsOf = async (userId) =>
  (await User.findById(userId).select("gamification.boost_credits").lean())?.gamification?.boost_credits || 0;

// Atomically take one level-reward credit; false when the balance is 0.
const spendRewardCredit = async (userId) =>
  Boolean(
    await User.findOneAndUpdate(
      { _id: userId, "gamification.boost_credits": { $gte: 1 } },
      { $inc: { "gamification.boost_credits": -1 } },
      { returnDocument: "after", projection: { _id: 1 } },
    ),
  );

const refundRewardCredit = (userId) =>
  User.updateOne({ _id: userId }, { $inc: { "gamification.boost_credits": 1 } });

const limitError = (message, code) => {
  const error = new Error(message);
  error.statusCode = 400;
  error.code = code;
  return error;
};

const campusMismatchError = () => {
  const error = new Error("Boosts are limited to your own campus listings.");
  error.statusCode = 400;
  error.code = "CAMPUS_MISMATCH";
  return error;
};

// Boosts apply to same-campus listings only (marketplace is campus-scoped).
const assertSameCampus = (product, user) => {
  const productCampus = product?.campus_id?._id || product?.campus_id;
  const userCampus = user?.campus_id?._id || user?.campus_id;
  if (productCampus && userCampus && String(productCampus) !== String(userCampus)) {
    throw campusMismatchError();
  }
};
// Calendar month in India time (UTC+5:30), whatever the server timezone,
// so monthly boosts reset at midnight IST on the 1st.
const IST_OFFSET_MS = 330 * 60 * 1000;
const getMonthWindow = (date = new Date()) => {
  const ist = new Date(date.getTime() + IST_OFFSET_MS);
  const y = ist.getUTCFullYear();
  const m = ist.getUTCMonth();
  const start = new Date(Date.UTC(y, m, 1) - IST_OFFSET_MS);
  const end = new Date(Date.UTC(y, m + 1, 1) - IST_OFFSET_MS);

  return { start, end };
};

// No global expireStaleBoosts() here: it ran two collection-wide updateMany
// scans on every quota read. Counts below filter on expires_at, and the
// expire-boosts job (every 10 min) tidies statuses in the background.
export const getBoostSummary = async (user) => {

  const rules = getBoostPlanRules(user.subscription);
  const { start, end } = getMonthWindow();

  const [[monthlyUsed, activeBoosts], rewardCredits] = await Promise.all([
    quotaCounts(user._id, start, end),
    rewardCreditsOf(user._id),
  ]);

  return {
    tier: user.subscription,
    monthlyLimit: rules.monthlyLimit,
    monthlyUsed,
    monthlyRemaining: Math.max(rules.monthlyLimit - monthlyUsed, 0),
    activeBoosts,
    maxActiveBoosts: rules.maxActiveBoosts,
    activeBoostSlotsRemaining: Math.max(rules.maxActiveBoosts - activeBoosts, 0),
    // Level-reward credits, spent only after the monthly plan boosts.
    rewardCredits,
    durationHours: rules.durationHours,
    monthEndsAt: end,
  };
};

export const expireStaleBoosts = async () => {
  const now = new Date();

  const boosts = await Boost.updateMany(
    {
      status: "active",
      expires_at: { $lte: now },
    },
    { $set: { status: "expired" } },
  );

  const products = await Product.updateMany(
    {
      is_boosted: true,
      boost_expires_at: { $lte: now },
    },
    {
      $set: { is_boosted: false },
      $unset: { boost_expires_at: "", boost_tier: "" },
    },
  );

  // Summary for the admin "System jobs" page.
  return {
    boostsExpired: boosts?.modifiedCount || 0,
    listingsUnboosted: products?.modifiedCount || 0,
  };
};

// Expiry is checked per listing below (boost_expires_at > now), so the
// global expireStaleBoosts() sweep is left to the background job.
export const createBoost = async ({ productId, user }) => {

  const product = await Product.findOne({
    _id: productId,
    seller_id: user._id,
    is_deleted: false,
  });

  if (!product) {
    throw new Error("Product not found or you do not have permission to boost it");
  }

  // Campus marketplace: quota boosts never cross campuses.
  assertSameCampus(product, user);

  if (product.status !== PRODUCT_STATUS.LISTED) {
    throw new Error("Only active listed products can be boosted");
  }

  if (product.is_boosted && product.boost_expires_at > new Date()) {
    throw new Error("This product is already boosted");
  }

  const tier = user.subscription;
  const rules = getBoostPlanRules(tier);
  const { start, end } = getMonthWindow();

  const [monthlyUsage, activeBoosts] = await quotaCounts(user._id, start, end);

  if (activeBoosts >= rules.maxActiveBoosts) {
    throw limitError(
      rules.maxActiveBoosts === 1
        ? "Active boost limit reached: you already have a boost running. Start the next one when it ends."
        : `Active boost limit reached: you can run ${rules.maxActiveBoosts} boosts at a time on your plan.`,
      "BOOST_ACTIVE_LIMIT",
    );
  }

  // Plan boosts first. Once this month's are used up, a level-reward
  // credit pays for it instead (taken atomically, refunded on rollback).
  const useReward = monthlyUsage >= rules.monthlyLimit;
  if (useReward && !(await spendRewardCredit(user._id))) {
    throw limitError(
      rules.monthlyLimit > 0
        ? `Monthly boost limit reached: you have used all ${rules.monthlyLimit} boosts on your plan this month.`
        : "Monthly boost limit reached: your plan does not include free boosts. Upgrade, or buy a one-time boost.",
      "BOOST_MONTHLY_LIMIT",
    );
  }

  const startsAt = new Date();
  const expiresAt = new Date(
    startsAt.getTime() + rules.durationHours * 60 * 60 * 1000,
  );

  let boost;
  try {
    boost = await Boost.create({
      product_id: product._id,
      user_id: user._id,
      tier,
      starts_at: startsAt,
      expires_at: expiresAt,
      duration_hours: rules.durationHours,
      isAddon: false,
      isReward: useReward,
    });
  } catch (err) {
    if (useReward) await refundRewardCredit(user._id).catch(() => {});
    // Handle duplicate/race gracefully
    if (err.code === 11000) {
      throw new Error("This product is already boosted");
    }
    throw err;
  }

  product.is_boosted = true;
  product.boost_expires_at = expiresAt;
  product.boost_tier = tier;
  await product.save();

  // Post-create re-check to bound parallel-race over-grant: if a limit is
  // now exceeded, roll this boost back (and give the reward credit back).
  // Quota window is the calendar month (IST), matching the summary display.
  const [monthlyAfter, activeAfter] = await quotaCounts(user._id, start, end);

  if ((!useReward && monthlyAfter > rules.monthlyLimit) || activeAfter > rules.maxActiveBoosts) {
    await Promise.allSettled([
      Boost.deleteOne({ _id: boost._id }),
      Product.updateOne(
        { _id: product._id, boost_expires_at: expiresAt },
        { $set: { is_boosted: false }, $unset: { boost_expires_at: "", boost_tier: "" } },
      ),
      useReward ? refundRewardCredit(user._id) : null,
    ]);
    throw limitError("Boost limit reached for your plan. Please try later.", "BOOST_LIMIT");
  }

  const monthlyUsed = useReward ? monthlyUsage : monthlyUsage + 1;

  return {
    boost,
    product,
    usage: {
      monthlyLimit: rules.monthlyLimit,
      monthlyUsed,
      monthlyRemaining: Math.max(rules.monthlyLimit - monthlyUsed, 0),
      usedRewardCredit: useReward,
      maxActiveBoosts: rules.maxActiveBoosts,
      activeBoosts: activeBoosts + 1,
      activeBoostSlotsRemaining: Math.max(
        rules.maxActiveBoosts - activeBoosts - 1,
        0,
      ),
      durationHours: rules.durationHours,
    },
  };
};

// One-time purchased boost (₹29/₹49 add-ons). Same ownership/listed guards
// as quota boosts but NO monthly/active quota checks — the payment is the
// entitlement. Throws if the listing can't take a boost; callers that run
// after money moved must surface this for support follow-up.
export const applyPurchasedBoost = async ({ productId, user, durationHours }) => {
  const product = await Product.findOne({
    _id: productId,
    seller_id: user._id,
    is_deleted: false,
  });

  if (!product) {
    throw new Error("Product not found or you do not have permission to boost it");
  }

  // Same-campus rule applies to purchased add-ons too — fail before money
  // is captured (callers surface BOOST_APPLY_FAILED for support follow-up).
  assertSameCampus(product, user);

  if (product.status !== PRODUCT_STATUS.LISTED) {
    throw new Error("Only active listed products can be boosted");
  }

  if (product.is_boosted && product.boost_expires_at > new Date()) {
    throw new Error("This product is already boosted");
  }

  const startsAt = new Date();
  const expiresAt = new Date(startsAt.getTime() + durationHours * 60 * 60 * 1000);

  const boost = await Boost.create({
    product_id: product._id,
    user_id: user._id,
    tier: user.subscription,
    starts_at: startsAt,
    expires_at: expiresAt,
    duration_hours: durationHours,
    // Purchased add-on: excluded from quota counts, no refund on failure
    // (payment stays VERIFIED with code BOOST_APPLY_FAILED for support
    // reconciliation — see payment.service verifyPayment).
    isAddon: true,
  });

  product.is_boosted = true;
  product.boost_expires_at = expiresAt;
  product.boost_tier = user.subscription;
  await product.save();

  return { boost, product };
};
