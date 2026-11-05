import { z } from "zod";
import { USER_TIER } from "../config/constants.js";
import { BOOST_ADDON } from "../config/boostAddons.js";

export const createOrderSchema = z
  .object({
    plan: z.enum(
      [USER_TIER.PRO, USER_TIER.PRO_PLUS, BOOST_ADDON.THREE_DAY, BOOST_ADDON.SEVEN_DAY],
      {
        invalid_type_error: "Invalid purchasable item",
      },
    ),
    // Required for one-time boost add-ons (target listing), ignored for plans.
    productId: z
      .string()
      .regex(/^[a-fA-F0-9]{24}$/, "Invalid listing ID")
      .optional(),
  })
  .strict()
  .refine(
    (data) => {
      const isAddon =
        data.plan === BOOST_ADDON.THREE_DAY || data.plan === BOOST_ADDON.SEVEN_DAY;
      return isAddon ? Boolean(data.productId) : true;
    },
    { message: "A listing is required for boost add-ons", path: ["productId"] },
  );

export const verifyPaymentSchema = z
  .object({
    razorpay_order_id: z.string().min(1).max(100),
    razorpay_payment_id: z.string().min(1).max(100),
    razorpay_signature: z.string().min(1).max(256),
  })
  .strict();
