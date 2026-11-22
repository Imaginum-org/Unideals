import { z } from "zod";
import {
  RENT_KIND,
  RENT_MODE,
  RENT_PRICE_UNITS,
  RENT_CATEGORIES,
  RENT_CONDITIONS,
  RENT_LIMITS,
} from "../config/rent.js";
import { normalizeMultiline } from "../utils/text.js";

// Express 5 leaves req.body undefined when nothing was sent.
const optionalBody = (schema) => z.preprocess((value) => value ?? {}, schema);

const imageSchema = z
  .object({
    url: z
      .string()
      .trim()
      .max(500)
      .regex(/^https:\/\//, "Image must be an https URL"),
    fileId: z.string().trim().max(200).nullable().optional(),
  })
  .strict();

const blockSchema = z.string().trim().min(1, "Pick your block").max(RENT_LIMITS.blockLength);

const postFields = {
  title: z
    .string()
    .trim()
    .min(3, "Title must be at least 3 characters")
    .max(80, "Title cannot exceed 80 characters"),
  description: z.preprocess(normalizeMultiline, z.string().max(500, "Keep the description under 500 characters")),
  category: z.enum(RENT_CATEGORIES),
  images: z.array(imageSchema).max(3, "At most 3 photos"),
  price: z
    .object({
      amount: z.number().min(0).max(RENT_LIMITS.maxPrice, `Price can be at most ₹${RENT_LIMITS.maxPrice}`),
      unit: z.enum(RENT_PRICE_UNITS),
    })
    .strict(),
  deposit: z.number().int().min(0).max(RENT_LIMITS.maxDeposit),
  quantity: z.number().int().min(1).max(RENT_LIMITS.maxQuantity),
  block: blockSchema.nullable(),
  needed_by: z.coerce.date().nullable(),
  condition: z.enum(RENT_CONDITIONS).nullable(),
  available_until: z.coerce.date().nullable(),
  handover: z
    .object({
      spot: z.string().trim().max(RENT_LIMITS.handoverSpotLength, "Keep the pickup spot short").optional(),
      timing: z.string().trim().max(RENT_LIMITS.handoverTimingLength, "Keep the handover time short").optional(),
      return_policy: z
        .preprocess(normalizeMultiline, z.string().max(RENT_LIMITS.returnPolicyLength, "Keep the return policy short"))
        .optional(),
      notes: z
        .preprocess(normalizeMultiline, z.string().max(RENT_LIMITS.handoverNotesLength, "Keep the instructions shorter"))
        .optional(),
    })
    .strict(),
};

export const createRentPostSchema = z
  .object({
    kind: z.enum(Object.values(RENT_KIND)),
    mode: z.enum(Object.values(RENT_MODE)),
    title: postFields.title,
    description: postFields.description.optional(),
    category: postFields.category,
    images: postFields.images.optional(),
    price: postFields.price,
    deposit: postFields.deposit.optional(),
    quantity: postFields.quantity.optional(),
    block: postFields.block.optional(),
    needed_by: postFields.needed_by.optional(),
    condition: postFields.condition.optional(),
    available_until: postFields.available_until.optional(),
    handover: postFields.handover.optional(),
  })
  .strict();

// Kind and mode are fixed once posted.
export const updateRentPostSchema = z
  .object({
    title: postFields.title.optional(),
    description: postFields.description.optional(),
    category: postFields.category.optional(),
    images: postFields.images.optional(),
    price: postFields.price.optional(),
    deposit: postFields.deposit.optional(),
    quantity: postFields.quantity.optional(),
    block: postFields.block.optional(),
    needed_by: postFields.needed_by.optional(),
    condition: postFields.condition.optional(),
    available_until: postFields.available_until.optional(),
    handover: postFields.handover.optional(),
  })
  .strict();

export const rentPostStatusSchema = z.object({ status: z.enum(["active", "paused"]) }).strict();

export const rentReportSchema = optionalBody(
  z.object({ reason: z.string().trim().max(200).optional() }).strict(),
);

export const createRentBookingSchema = optionalBody(
  z
    .object({
      note: z.string().trim().max(300).optional(),
      quantity: z.number().int().min(1).max(RENT_LIMITS.maxQuantity).optional(),
      return_by: z.coerce.date().nullable().optional(),
      // A helper answering a request may quote their own price.
      price: z.number().min(0).max(RENT_LIMITS.maxPrice).optional(),
    })
    .strict(),
);

export const rentReasonSchema = optionalBody(
  z.object({ reason: z.string().trim().max(200).optional() }).strict(),
);

export const rentMessageSchema = z
  .object({ text: z.string().trim().min(1, "Type a message").max(RENT_LIMITS.messageLength) })
  .strict();

export const rentRateSchema = z.object({ stars: z.number().int().min(1).max(5) }).strict();

export const rentProfileSchema = z
  .object({
    block: blockSchema.nullable().optional(),
    alerts: z.boolean().optional(),
  })
  .strict();

// ---- Staff ----

export const rentAdminPostActionSchema = z
  .object({
    action: z.enum(["hide", "restore"]),
    reason: z.string().trim().max(300).optional(),
  })
  .strict();

export const rentCampusConfigSchema = z
  .object({
    enabled: z.boolean().optional(),
    blocks: z.array(blockSchema).max(RENT_LIMITS.maxBlocks).optional(),
  })
  .strict();
