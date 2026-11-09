import axios from "../../../services/axiosInstance";

const BILLING_BASE_PATH = "/api/payments";

// POST /api/payments/orders { plan: "pro" | "pro_plus" }
export const createPaymentOrder = (data) => {
  return axios.post(`${BILLING_BASE_PATH}/orders`, data);
};

// POST /api/payments/verify { razorpay_order_id, razorpay_payment_id, razorpay_signature }
export const verifyPayment = (data) => {
  return axios.post(`${BILLING_BASE_PATH}/verify`, data);
};

// GET /api/payments/me — tier, plan, usage, payment history
export const getBilling = () => {
  return axios.get(`${BILLING_BASE_PATH}/me`);
};

// GET /api/payments/plans — display prices for the current viewer (guests get
// list prices; eligible accounts get the Girls Founder offer). The server
// re-derives the real amount when creating an order.
export const getPlanPricing = () => {
  return axios.get(`${BILLING_BASE_PATH}/plans`);
};
