import crypto from "crypto";
import { nanoid } from "nanoid";
import Payment from "../models/Payment.model.js";
import {
  ACTIVE_SUBSCRIPTION_TYPE,
  getSubscriptionPlan,
  isPaidPlan,
  PAYMENT_CONFIG,
} from "../config/subscriptionPlans.js";
import { USER_TIER } from "../config/constants.js";
import { PAYMENT_STATUS } from "../config/constants.js";
import { getBoostAddon, isBoostAddon } from "../config/boostAddons.js";
import { getRazorpay } from "../utils/razorpay.js";
import { activateTier } from "./subscription.service.js";
import { applyPurchasedBoost } from "./boost.service.js";

// Freshness window for reusing an unpaid order instead of creating a new
// Razorpay order on every button click / retry.
const ORDER_REUSE_WINDOW_MS = 15 * 60 * 1000;

const toPaidPlanOrThrow = (plan) => {
  if (isBoostAddon(plan)) {
    return { kind: "addon", def: getBoostAddon(plan) };
  }
  if (!isPaidPlan(plan)) {
    const error = new Error("Invalid item. Choose a plan or boost add-on.");
    error.statusCode = 400;
    throw error;
  }
  const planDef = getSubscriptionPlan(plan, ACTIVE_SUBSCRIPTION_TYPE);
  if (!planDef || !planDef.amountInPaise || planDef.amountInPaise <= 0) {
    const error = new Error("This plan is not available for purchase.");
    error.statusCode = 400;
    throw error;
  }
  return { kind: "plan", def: planDef };
};

// Add-on guardrails at order time: own, listed, visible, not already boosted.
const validateAddonTarget = async ({ productId, user }) => {
  const mongoose = await import("mongoose").then((m) => m.default);
  if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
    const error = new Error("A valid listing is required for boost add-ons.");
    error.statusCode = 400;
    throw error;
  }
  const { default: Product } = await import("../models/Product.model.js");
  const product = await Product.findOne({
    _id: productId,
    seller_id: user._id,
    is_deleted: false,
  }).lean();
  if (!product) {
    const error = new Error("Listing not found.");
    error.statusCode = 404;
    throw error;
  }
  if (product.status !== "listed") {
    const error = new Error("Only active listed products can be boosted.");
    error.statusCode = 400;
    throw error;
  }
  if (product.is_boosted && product.boost_expires_at > new Date()) {
    const error = new Error("This listing is already boosted.");
    error.statusCode = 400;
    throw error;
  }
  return product;
};

export const createOrder = async ({ plan, productId, user }) => {
  const { kind, def } = toPaidPlanOrThrow(plan);
  const amount = def.amountInPaise;

  if (kind === "plan") {
    // Already on this tier (or higher)? No new order — prevents double purchase.
    const tierRank = { [USER_TIER.BASE_USER]: 0, [USER_TIER.PRO]: 1, [USER_TIER.PRO_PLUS]: 2 };
    if ((tierRank[user.subscription] || 0) >= (tierRank[plan] || 0)) {
      const error = new Error("You are already on this plan or higher.");
      error.statusCode = 400;
      error.code = "ALREADY_SUBSCRIBED";
      throw error;
    }
  } else {
    await validateAddonTarget({ productId, user });
  }

  // Idempotent reuse: return the fresh unpaid order instead of minting another.
  const existing = await Payment.findOne({
    user_id: user._id,
    plan,
    ...(kind === "addon" ? { product_id: productId } : {}),
    status: PAYMENT_STATUS.CREATED,
    createdAt: { $gte: new Date(Date.now() - ORDER_REUSE_WINDOW_MS) },
  })
    .sort({ createdAt: -1 })
    .lean();
  if (existing) {
    return {
      orderId: existing.razorpay_order_id,
      amount: existing.amount,
      currency: existing.currency,
      plan,
      ...(kind === "addon" ? { productId: String(existing.product_id) } : {}),
      reused: true,
    };
  }

  const receipt = `ord_${nanoid(12)}`;
  const razorpay = getRazorpay();
  let rzpOrder;
  try {
    rzpOrder = await razorpay.orders.create({
      amount,
      currency: PAYMENT_CONFIG.currency,
      receipt,
      notes: {
        userId: String(user._id),
        plan,
        ...(kind === "addon"
          ? { productId: String(productId), durationHours: String(def.durationHours) }
          : { subscriptionType: ACTIVE_SUBSCRIPTION_TYPE }),
      },
    });
  } catch (err) {
    const error = new Error("Unable to initiate payment. Please try again.");
    error.statusCode = 502;
    throw error;
  }

  await Payment.create({
    user_id: user._id,
    plan,
    ...(kind === "addon" ? { product_id: productId } : {}),
    subscription_type: ACTIVE_SUBSCRIPTION_TYPE,
    amount,
    currency: PAYMENT_CONFIG.currency,
    receipt,
    razorpay_order_id: rzpOrder.id,
    status: PAYMENT_STATUS.CREATED,
  });

  return {
    orderId: rzpOrder.id,
    amount,
    currency: PAYMENT_CONFIG.currency,
    plan,
    ...(kind === "addon" ? { productId: String(productId) } : {}),
    reused: false,
  };
};

const verifySignature = ({ orderId, paymentId, signature }) => {
  const { RAZORPAY_KEY_SECRET } = process.env;
  const expected = crypto
    .createHmac("sha256", RAZORPAY_KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");
  // Timing-safe compare on equal-length hex buffers.
  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(String(signature || ""), "hex");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};

export const verifyPayment = async ({ orderId, paymentId, signature, user }) => {
  if (!orderId || !paymentId || !signature) {
    const error = new Error("Incomplete payment details.");
    error.statusCode = 400;
    throw error;
  }

  const payment = await Payment.findOne({
    razorpay_order_id: orderId,
    user_id: user._id,
  });
  if (!payment) {
    const error = new Error("Order not found.");
    error.statusCode = 404;
    throw error;
  }

  // Already processed? Return current state — safe for double-submit/retry.
  if (payment.status === PAYMENT_STATUS.VERIFIED) {
    return { alreadyVerified: true, plan: payment.plan };
  }  if (
    payment.status === PAYMENT_STATUS.FAILED ||
    payment.status === PAYMENT_STATUS.EXPIRED ||
    payment.status === PAYMENT_STATUS.CANCELLED
  ) {
    const error = new Error("This order is no longer payable. Please create a new order.");
    error.statusCode = 400;
    throw error;
  }

  // 1. Cryptographic check first (no network needed).
  if (!verifySignature({ orderId, paymentId, signature })) {
    await Payment.updateOne(
      { _id: payment._id, status: PAYMENT_STATUS.CREATED },
      { $set: { status: PAYMENT_STATUS.FAILED } },
    );
    const error = new Error("Payment verification failed.");
    error.statusCode = 400;
    throw error;
  }

  // 2. Server-to-server cross-check: the order must be paid for the exact
  // amount we recorded. Defeats amount tampering and order-id swapping.
  const razorpay = getRazorpay();
  let rzpOrder;
  try {
    rzpOrder = await razorpay.orders.fetch(orderId);
  } catch {
    const error = new Error("Unable to confirm payment. Please try again.");
    error.statusCode = 502;
    throw error;
  }
  if (
    rzpOrder.status !== "paid" ||
    Number(rzpOrder.amount) !== Number(payment.amount) ||
    String(rzpOrder.currency || "").toUpperCase() !== String(payment.currency).toUpperCase()
  ) {
    await Payment.updateOne(
      { _id: payment._id, status: PAYMENT_STATUS.CREATED },
      { $set: { status: PAYMENT_STATUS.FAILED } },
    );
    const error = new Error("Payment amount mismatch. Please contact support.");
    error.statusCode = 400;
    throw error;
  }

  // 3. Atomic claim: only one concurrent verify can flip created -> verified.
  // Losers fall into the alreadyVerified path below via re-read.
  const claimed = await Payment.findOneAndUpdate(
    { _id: payment._id, status: PAYMENT_STATUS.CREATED },
    {
      $set: {
        status: PAYMENT_STATUS.VERIFIED,
        razorpay_payment_id: paymentId,
        razorpay_signature: signature,
        verified_at: new Date(),
      },
    },
    { new: true },
  );
  if (!claimed) {
    // Lost the race (duplicate request / webhook already handled it).
    const current = await Payment.findById(payment._id).lean();
    if (current?.status === PAYMENT_STATUS.VERIFIED) {
      return { alreadyVerified: true, plan: current.plan };
    }
    const error = new Error("Payment could not be confirmed. Please contact support.");
    error.statusCode = 409;
    throw error;
  }

  // 4. Single fulfillment point for the claimed payment.
  if (isBoostAddon(payment.plan)) {
    const addon = getBoostAddon(payment.plan);
    try {
      const { product } = await applyPurchasedBoost({
        productId: payment.product_id,
        user: { _id: payment.user_id, subscription: user.subscription },
        durationHours: addon.durationHours,
      });
      return { alreadyVerified: false, plan: payment.plan, product };
    } catch (applyErr) {
      // Money moved but the listing can't take the boost (e.g. unlisted
      // mid-checkout). Payment stays VERIFIED for support reconciliation —
      // never silently swallow.
      const error = new Error(
        "Payment received, but the boost could not be applied. Please contact support with your order ID.",
      );
      error.statusCode = 409;
      error.code = "BOOST_APPLY_FAILED";
      throw error;
    }
  }

  const subscription = await activateTier({
    userId: payment.user_id,
    plan: payment.plan,
    paymentId: payment._id,
  });

  return { alreadyVerified: false, plan: payment.plan, subscription };
};

// Verify Razorpay webhook signature over the RAW request body.
export const verifyWebhookSignature = (rawBody, signature) => {
  const { RAZORPAY_WEBHOOK_SECRET } = process.env;
  if (!RAZORPAY_WEBHOOK_SECRET || !signature) return false;
  const expected = crypto
    .createHmac("sha256", RAZORPAY_WEBHOOK_SECRET)
    .update(rawBody)
    .digest("hex");
  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(String(signature), "hex");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};

// Reconcile async events. Fully idempotent: repeated deliveries converge
// to the same state and never double-activate (activateTier is upsert-based
// and verify-claim is the only writer of VERIFIED).
export const handleWebhookEvent = async (event) => {
  const type = event?.event;
  const entity = event?.payload?.payment?.entity;
  if (!type || !entity) return { handled: false };

  if (type === "payment.captured") {
    const orderId = entity.order_id;
    const paymentId = entity.id;
    if (!orderId || !paymentId) return { handled: false };

    const payment = await Payment.findOne({ razorpay_order_id: orderId });
    if (!payment) return { handled: false };

    if (payment.status === PAYMENT_STATUS.VERIFIED) {
      return { handled: true, deduped: true };
    }

    // Amount guard, same as verify path.
    if (
      Number(entity.amount) !== Number(payment.amount) ||
      String(entity.currency || "").toUpperCase() !== String(payment.currency).toUpperCase()
    ) {
      return { handled: true, deduped: false, mismatch: true };
    }

    const claimed = await Payment.findOneAndUpdate(
      { _id: payment._id, status: PAYMENT_STATUS.CREATED },
      {
        $set: {
          status: PAYMENT_STATUS.VERIFIED,
          razorpay_payment_id: paymentId,
          verified_at: new Date(),
        },
      },
      { new: true },
    );
    if (claimed) {
      if (isBoostAddon(payment.plan)) {
        const addon = getBoostAddon(payment.plan);
        try {
          const { default: UserModel } = await import("../models/User.model.js");
          const buyer = await UserModel.findById(payment.user_id)
            .select("subscription")
            .lean();
          await applyPurchasedBoost({
            productId: payment.product_id,
            user: { _id: payment.user_id, subscription: buyer?.subscription },
            durationHours: addon.durationHours,
          });
        } catch {
          // VERIFIED payment retained for support reconciliation.
        }
      } else {
        await activateTier({
          userId: payment.user_id,
          plan: payment.plan,
          paymentId: payment._id,
        });
      }
    }
    return { handled: true, deduped: !claimed };
  }

  if (type === "payment.failed") {
    const orderId = entity.order_id;
    if (!orderId) return { handled: false };
    await Payment.updateOne(
      { razorpay_order_id: orderId, status: PAYMENT_STATUS.CREATED },
      { $set: { status: PAYMENT_STATUS.FAILED } },
    );
    return { handled: true };
  }

  return { handled: false };
};
