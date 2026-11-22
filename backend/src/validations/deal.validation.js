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
  // Optional "HH:MM" (India time). Without it the meetup is a whole day.
  time: z
    .string()
    .trim()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Invalid pickup time")
    .optional()
    .or(z.literal("")),
  location: z.string().trim().min(1, "Pickup location required").max(200),
});

export const handoverCodeSchema = z.object({
  code: z.string().trim().regex(/^\d{4}$/, "Enter the 4-digit code"),
});

export const doneProblemSchema = z.object({
  reason: z.string().trim().max(200).optional().default(""),
});

export const cancelDealSchema = z.object({
  reason: z.string().trim().max(300).optional().default(""),
});
