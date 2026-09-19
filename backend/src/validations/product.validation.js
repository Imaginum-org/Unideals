import { z } from "zod";

import {
  PRODUCT_CATEGORIES,
  PRODUCT_CONDITION,
  PRODUCT_PAYMENT,
  PRODUCT_USAGE_DURATION,
  PRODUCT_STATUS,
} from "../config/constants.js";

export const createProductSchema = z
  .object({
    status: z.enum(Object.values(PRODUCT_STATUS)).optional(),

    title: z
      .string()
      .trim()
      .min(3, "Title must be at least 3 characters")
      .max(120, "Title cannot exceed 120 characters")
      .optional(),

    description: z
      .string()
      .trim()
      .min(10, "Description must be at least 10 characters")
      .max(2000, "Description cannot exceed 2000 characters")
      .optional(),

    category: z.enum(Object.values(PRODUCT_CATEGORIES)).optional(),

    condition: z.enum(Object.values(PRODUCT_CONDITION)).optional(),

    selling_price: z.coerce
      .number({
        invalid_type_error: "Selling price must be a number",
      })
      .positive("Selling price must be greater than 0")
      .max(10000000, "Selling price is too large")
      .optional(),

    original_price: z.coerce
      .number({
        invalid_type_error: "Original price must be a number",
      })
      .positive("Original price must be greater than 0")
      .max(10000000, "Original price is too large")
      .optional(),

    is_negotiable: z.boolean().optional(),

    payment_preference: z.enum(Object.values(PRODUCT_PAYMENT)).optional(),

    // Legacy frontend field - accepted but ignored server-side
    meetup_location: z.string().trim().max(200).optional(),

    images: z
      .array(
        z.object({
          url: z
            .string()
            .url("Invalid image URL")
            .max(2048, "Image URL too long")
            .refine((u) => u.startsWith("https://"), {
              message: "Image URL must use HTTPS",
            }),
          fileId: z
            .string()
            .min(1, "Invalid file ID")
            .max(256, "Invalid file ID")
            .regex(/^[A-Za-z0-9_\-/]+$/, "Invalid file ID format"),
        }),
      )
      .max(3, "Maximum 3 images allowed")
      .optional(),

    attributes: z
      .object({
        brand: z
          .string()
          .trim()
          .max(100, "Brand cannot exceed 100 characters")
          .optional(),

        color: z
          .string()
          .trim()
          .max(50, "Color cannot exceed 50 characters")
          .optional(),

        usage_duration: z
          .enum(Object.values(PRODUCT_USAGE_DURATION))
          .optional(),

        purchase_date: z.string().max(30).nullish(),
      })
      .catchall(z.never())
      .optional(),

    pickup_address_snapshot: z
      .object({
        address_line: z.string().trim().min(3).max(300).optional(),

        city: z.string().trim().min(2).max(100).optional(),

        state: z.string().trim().min(2).max(100).optional(),

        pincode: z
          .string()
          .regex(/^\d{6}$/, "Invalid pincode")
          .optional(),

        mobile: z
          .string()
          .regex(/^[6-9]\d{9}$/, "Invalid mobile number")
          .optional(),

        additional_info: z.string().trim().max(300).optional(),
      })
      .catchall(z.never())
      .optional(),
  })
  // Strip unknown privileged keys (is_boosted, views_count, seller_id, etc.)
  // instead of rejecting to preserve legacy clients.
  .refine(
    (data) => {
      if (data.original_price && data.selling_price) {
        return data.selling_price <= data.original_price;
      }

      return true;
    },

    {
      message: "Selling price cannot exceed original price",

      path: ["selling_price"],
    },
  );
