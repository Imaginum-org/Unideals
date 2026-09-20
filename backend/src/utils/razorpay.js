import Razorpay from "razorpay";

let instance = null;

// Lazy singleton so missing env fails only when payments are used,
// never at import time (keeps /health and other routes alive).
export const getRazorpay = () => {
  const { RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET } = process.env;
  if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
    const error = new Error(
      "Payments are not configured. Please contact support.",
    );
    error.statusCode = 503;
    throw error;
  }
  if (!instance) {
    instance = new Razorpay({
      key_id: RAZORPAY_KEY_ID,
      key_secret: RAZORPAY_KEY_SECRET,
    });
  }
  return instance;
};

export const getRazorpayPublicKey = () => {
  const { RAZORPAY_KEY_ID } = process.env;
  if (!RAZORPAY_KEY_ID) {
    const error = new Error("Payments are not configured.");
    error.statusCode = 503;
    throw error;
  }
  return RAZORPAY_KEY_ID;
};

// Test helper: reset cached instance (e.g. after env rotation in tests).
export const resetRazorpayInstance = () => {
  instance = null;
};
