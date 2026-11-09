import { useCallback, useRef } from "react";

const CHECKOUT_SCRIPT_URL = "https://checkout.razorpay.com/v1/checkout.js";

let scriptPromise = null;

const loadCheckoutScript = () => {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Checkout unavailable"));
  }
  if (window.Razorpay) return Promise.resolve();
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = CHECKOUT_SCRIPT_URL;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () =>
        reject(new Error("Unable to load payment gateway"));
      document.head.appendChild(script);
    }).catch((err) => {
      // Allow retry on next attempt after a load failure.
      scriptPromise = null;
      throw err;
    });
  }
  return scriptPromise;
};

// Opens Razorpay Checkout for a server-created order and resolves with the
// payment response. Rejects on dismiss/failure. In-flight guard prevents
// double checkout windows from double clicks.
export const useRazorpayCheckout = () => {
  const inFlightRef = useRef(false);

  const openCheckout = useCallback(
    async ({ orderId, amount, currency, planName, description, prefill, keyId }) => {
      if (inFlightRef.current) {
        throw new Error("A payment window is already open");
      }
      // Fail fast with a clear message instead of opening a broken gateway.
      // Prefer the key the server returned with the order: the order was
      // created under that account, so a stale/mismatched VITE key can
      // never open checkout against a different Razorpay account.
      const checkoutKey = keyId || import.meta.env.VITE_RAZORPAY_KEY_ID;
      if (!checkoutKey) {
        throw new Error("Payments are unavailable right now. Please try later.");
      }
      await loadCheckoutScript();
      if (!window.Razorpay) {
        throw new Error("Unable to load payment gateway");
      }

      return new Promise((resolve, reject) => {
        inFlightRef.current = true;
        let settled = false;
        const settle = (fn, value) => {
          if (settled) return;
          settled = true;
          inFlightRef.current = false;
          fn(value);
        };

        try {
          const rzp = new window.Razorpay({
            key: checkoutKey,
            // Informational only: with order_id set, Razorpay always charges
            // the amount fixed on the server-created order.
            amount,
            currency,
            order_id: orderId,
            name: "Unideals",
            description: description || `${planName} Plan`,
            // Public logo + brand color customize the gateway header.
            // Absolute prod URL so it resolves inside the checkout iframe
            // on any domain (including localhost during development).
            image: "https://app.unideals.in/logo.svg",
            prefill: {
              name: prefill?.name || "",
              email: prefill?.email || "",
              contact: prefill?.contact || "",
            },
            theme: { color: "#3300ff", backdrop_color: "rgba(19,19,19,0.6)" },
            // Single "Payment Options" block: UPI (QR code + UPI ID + UPI
            // apps), Credit/Debit Cards, Netbanking. Wallets, EMI, pay-later
            // and bank transfer stay hidden.
            //
            // UPI `flows` must be listed explicitly inside a custom block —
            // without it the QR-code flow was never requested, which is why
            // the QR did not show. Razorpay renders each flow where the
            // device supports it: "qr" on desktop/wide screens (scan with
            // any UPI app), "intent" (GPay/PhonePe/Paytm buttons) on
            // mobile, and "collect" (enter UPI ID) everywhere.
            config: {
              display: {
                blocks: {
                  methods: {
                    name: "Payment Options",
                    instruments: [
                      { method: "upi", flows: ["qr", "collect", "intent"] },
                      { method: "card" },
                      { method: "netbanking" },
                    ],
                  },
                },
                hide: [
                  { method: "wallet" },
                  { method: "emi" },
                  { method: "cardless_emi" },
                  { method: "paylater" },
                  { method: "bank_transfer" },
                ],
                sequence: ["block.methods"],
                preferences: { show_default_blocks: false },
              },
            },
            handler: (response) => settle(resolve, response),
            modal: {
              ondismiss: () => settle(reject, new Error("Payment cancelled")),
            },
          });
          rzp.on("payment.failed", (resp) =>
            settle(
              reject,
              new Error(
                resp?.error?.description || "Payment failed. Please try again.",
              ),
            ),
          );
          rzp.open();
        } catch (err) {
          settle(reject, err);
        }
      });
    },
    [],
  );

  return { openCheckout };
};
