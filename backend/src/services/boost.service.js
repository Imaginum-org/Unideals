import Boost from "../models/Boost.model.js";
import Product from "../models/Product.model.js";
import { PRODUCT_STATUS } from "../config/constants.js";
import { getBoostPlanRules } from "../config/boostPlans.js";

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
      createdAt: { $gte: start, $lt: end },
    }),
    Boost.countDocuments({
      user_id: user._id,
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
      createdAt: { $gte: start, $lt: end },
    }),
    Boost.countDocuments({
      user_id: user._id,
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

  const boost = await Boost.create({
    product_id: product._id,
    user_id: user._id,
    tier,
    starts_at: startsAt,
    expires_at: expiresAt,
    duration_hours: rules.durationHours,
  });

  product.is_boosted = true;
  product.boost_expires_at = expiresAt;
  product.boost_tier = tier;
  await product.save();

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
