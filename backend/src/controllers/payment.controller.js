import {
  createOrder,
  verifyPayment,
  verifyWebhookSignature,
  handleWebhookEvent,
} from "../services/payment.service.js";
import { getMySubscription } from "../services/subscription.service.js";
import { getRazorpayPublicKey } from "../utils/razorpay.js";
import { isBoostAddon } from "../config/boostAddons.js";

// POST /api/payments/orders { plan, productId? } — idempotent: fresh unpaid order reused.
export const createPaymentOrder = async (req, res) => {
  try {
    const result = await createOrder({
      plan: req.body.plan,
      productId: req.body.productId,
      user: req.user,
    });
    return res.status(201).json({
      success: true,
      message: result.reused
        ? "Resuming your pending payment"
        : "Payment order created",
      data: {
        ...result,
        keyId: getRazorpayPublicKey(),
      },
    });
  } catch (err) {
    return res.status(err.statusCode || 500).json({
      success: false,
      message:
        err.statusCode && err.statusCode < 500
          ? err.message
          : "Unable to initiate payment",
      ...(err.code ? { code: err.code } : {}),
    });
  }
};

// POST /api/payments/verify { razorpay_order_id, razorpay_payment_id, razorpay_signature }
export const verifyPaymentOrder = async (req, res) => {
  try {
    const result = await verifyPayment({
      orderId: req.body.razorpay_order_id,
      paymentId: req.body.razorpay_payment_id,
      signature: req.body.razorpay_signature,
      user: req.user,
    });
    const isAddon = isBoostAddon(result.plan);
    return res.status(200).json({
      success: true,
      message: result.alreadyVerified
        ? "Payment already confirmed"
        : isAddon
          ? "Boost purchased! Your listing is now boosted."
          : "Payment successful. Welcome to Pro!",
      data: result,
    });
  } catch (err) {
    return res.status(err.statusCode || 500).json({
      success: false,
      message:
        err.statusCode && err.statusCode < 500
          ? err.message
          : "Payment verification failed",
      ...(err.code ? { code: err.code } : {}),
    });
  }
};

// GET /api/payments/me — powers the Subscription tab (tier, usage, history).
export const getMyBilling = async (req, res) => {
  try {
    const data = await getMySubscription(req.user);
    return res.status(200).json({
      success: true,
      message: "Subscription fetched successfully",
      data,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Unable to load subscription",
    });
  }
};

// POST /api/payments/webhook — no auth; HMAC over RAW body. Always 200
// (except bad signature → 400) so Razorpay stops retrying handled events.
export const paymentWebhook = async (req, res) => {
  try {
    const signature = req.headers["x-razorpay-signature"];
    const rawBody = Buffer.isBuffer(req.body)
      ? req.body
      : Buffer.from(JSON.stringify(req.body || {}));
    if (!verifyWebhookSignature(rawBody, signature)) {
      return res.status(400).json({ success: false });
    }
    const event = JSON.parse(rawBody.toString("utf8"));
    await handleWebhookEvent(event);
    return res.status(200).json({ success: true });
  } catch {
    return res.status(200).json({ success: true });
  }
};
