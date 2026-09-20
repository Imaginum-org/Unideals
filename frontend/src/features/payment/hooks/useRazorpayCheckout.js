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
    async ({ orderId, amount, currency, planName, prefill }) => {
      if (inFlightRef.current) {
        throw new Error("A payment window is already open");
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
            key: import.meta.env.VITE_RAZORPAY_KEY_ID,
            amount,
            currency,
            order_id: orderId,
            name: "Unideals",
            description: `${planName} Plan`,
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
            // Show ONLY Card, UPI and Netbanking. The UPI block renders
            // both flows (scan QR + enter UPI ID); everything else
            // (wallets, EMI, pay-later, bank transfer) is hidden.
            config: {
              display: {
                blocks: {
                  upi: {
                    name: "UPI",
                    instruments: [{ method: "upi", flows: ["qr", "collect"] }],
                  },
                  card: {
                    name: "Cards",
                    instruments: [{ method: "card" }],
                  },
                  banks: {
                    name: "Netbanking",
                    instruments: [{ method: "netbanking" }],
                  },
                  hide: [
                    { method: "wallet" },
                    { method: "emi" },
                    { method: "cardless_emi" },
                    { method: "paylater" },
                    { method: "bank_transfer" },
                  ],
                },
                sequence: ["block.upi", "block.card", "block.banks"],
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
