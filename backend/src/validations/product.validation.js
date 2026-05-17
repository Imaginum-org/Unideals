import { z } from "zod";

import {
  PRODUCT_CATEGORIES,
  PRODUCT_CONDITION,
  PRODUCT_PAYMENT,
  PRODUCT_USAGE_DURATION,
} from "../config/constants.js";

export const createProductSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(3, "Title must be at least 3 characters")
      .max(120, "Title cannot exceed 120 characters"),

    description: z
      .string()
      .trim()
      .min(10, "Description must be at least 10 characters")
      .max(2000, "Description cannot exceed 2000 characters"),

    category: z.enum(Object.values(PRODUCT_CATEGORIES)),

    condition: z.enum(Object.values(PRODUCT_CONDITION)),

    selling_price: z.coerce
      .number({
        invalid_type_error: "Selling price must be a number",
      })
      .positive("Selling price must be greater than 0"),

    original_price: z.coerce
      .number({
        invalid_type_error: "Original price must be a number",
      })
      .positive("Original price must be greater than 0")
      .optional(),

    is_negotiable: z.boolean().optional(),

    payment_preference: z.enum(Object.values(PRODUCT_PAYMENT)),

    images: z
      .array(z.string().url())
      .min(1, "At least one image is required")
      .max(3, "Maximum 3 images allowed"),

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

        purchase_date: z.string().optional(),
      })
      .optional(),

    pickup_address_snapshot: z.object({
      address_line: z.string().trim().min(3),

      city: z.string().trim().min(2),

      state: z.string().trim().min(2),

      pincode: z.string().regex(/^\d{6}$/, "Invalid pincode"),

      mobile: z
        .string()
        .regex(/^[6-9]\d{9}$/, "Invalid mobile number")
        .optional(),

      additional_info: z.string().trim().max(300).optional(),
    }),

    image_file_ids: z.array(z.string().min(1)).optional(),
  })
  .refine(
    (data) => !data.original_price || data.selling_price <= data.original_price,
    {
      message: "Selling price cannot exceed original price",
      path: ["selling_price"],
    },
  );
