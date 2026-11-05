import Boost from "../models/Boost.model.js";
import Product from "../models/Product.model.js";
import { PRODUCT_STATUS } from "../config/constants.js";
import { getBoostPlanRules } from "../config/boostPlans.js";

// Quota filter: purchased add-ons (isAddon:true) never consume monthly or
// active quota slots — the payment is the entitlement. $ne:true keeps
// legacy docs without the field counted as quota.
const QUOTA_FILTER = { isAddon: { $ne: true } };

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
const getMonthWindow = (date = new Date()) => {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 1);

  return { start, end };
};

export const getBoostSummary = async (user) => {
  await expireStaleBoosts();

  const rules = getBoostPlanRules(user.subscription);
  const { start, end } = getMonthWindow();
  const now = new Date();

  const [monthlyUsed, activeBoosts] = await Promise.all([
    Boost.countDocuments({
      user_id: user._id,
      ...QUOTA_FILTER,
      createdAt: { $gte: start, $lt: end },
    }),
    Boost.countDocuments({
      user_id: user._id,
      ...QUOTA_FILTER,
      status: "active",
      expires_at: { $gt: now },
    }),
  ]);

  return {
    tier: user.subscription,
    monthlyLimit: rules.monthlyLimit,
    monthlyUsed,
    monthlyRemaining: Math.max(rules.monthlyLimit - monthlyUsed, 0),
    activeBoosts,
    maxActiveBoosts: rules.maxActiveBoosts,
    activeBoostSlotsRemaining: Math.max(rules.maxActiveBoosts - activeBoosts, 0),
    durationHours: rules.durationHours,
    monthEndsAt: end,
  };
};

export const expireStaleBoosts = async () => {
  const now = new Date();

  await Boost.updateMany(
    {
      status: "active",
      expires_at: { $lte: now },
    },
    { $set: { status: "expired" } },
  );

  await Product.updateMany(
    {
      is_boosted: true,
      boost_expires_at: { $lte: now },
    },
    {
      $set: { is_boosted: false },
      $unset: { boost_expires_at: "", boost_tier: "" },
    },
  );
};

export const createBoost = async ({ productId, user }) => {
  await expireStaleBoosts();

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

  const [monthlyUsage, activeBoosts] = await Promise.all([
    Boost.countDocuments({
      user_id: user._id,
      ...QUOTA_FILTER,
      createdAt: { $gte: start, $lt: end },
    }),
    Boost.countDocuments({
      user_id: user._id,
      ...QUOTA_FILTER,
      status: "active",
      expires_at: { $gt: new Date() },
    }),
  ]);

  if (monthlyUsage >= rules.monthlyLimit) {
    throw new Error(`Monthly boost limit reached for your plan`);
  }

  if (activeBoosts >= rules.maxActiveBoosts) {
    throw new Error(`Active boost limit reached for your plan`);
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
    });
  } catch (err) {
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

  // Post-create re-check to bound parallel-race over-grant.
  // If limits are now exceeded, roll back this boost.
  // Quota window is the calendar month (spec): simpler to reason about and
  // matches the summary display. A rolling-30d window would change
  // monthEndsAt semantics, so it is intentionally not used.
  const [monthlyAfter, activeAfter] = await Promise.all([
    Boost.countDocuments({
      user_id: user._id,
      ...QUOTA_FILTER,
      createdAt: { $gte: start, $lt: end },
    }),
    Boost.countDocuments({
      user_id: user._id,
      ...QUOTA_FILTER,
      status: "active",
      expires_at: { $gt: new Date() },
    }),
  ]);

  if (
    monthlyAfter > rules.monthlyLimit ||
    activeAfter > rules.maxActiveBoosts
  ) {
    await Promise.allSettled([
      Boost.deleteOne({ _id: boost._id }),
      Product.updateOne(
        { _id: product._id, boost_expires_at: expiresAt },
        { $set: { is_boosted: false }, $unset: { boost_expires_at: "", boost_tier: "" } },
      ),
    ]);
    throw new Error("Boost limit reached for your plan. Please try later.");
  }

  return {
    boost,
    product,
    usage: {
      monthlyLimit: rules.monthlyLimit,
      monthlyUsed: monthlyUsage + 1,
      monthlyRemaining: Math.max(rules.monthlyLimit - monthlyUsage - 1, 0),
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
