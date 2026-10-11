import { z } from "zod";

const objectId = z
  .string()
  .trim()
  .regex(/^[0-9a-fA-F]{24}$/, "Invalid ID format");

export const makeOfferSchema = z.object({
  amount: z.coerce.number().int().min(1, "Amount must be >= 1").max(10000000),
});

export const respondOfferSchema = z.object({
  messageId: objectId,
  action: z.enum(["accept", "decline"]),
});

export const confirmDealSchema = z.object({
  amount: z.coerce.number().int().min(1).max(10000000),
});

export const schedulePickupSchema = z.object({
  date: z.string().trim().min(1, "Pickup date required"),
  location: z.string().trim().min(1, "Pickup location required").max(200),
});

export const cancelDealSchema = z.object({
  reason: z.string().trim().max(300).optional().default(""),
});
