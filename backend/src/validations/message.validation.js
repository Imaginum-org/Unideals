import { z } from "zod";

const objectId = z
  .string()
  .trim()
  .regex(/^[0-9a-fA-F]{24}$/, "Invalid ID format");

export const sendMessageSchema = z.object({
  text: z
    .string()
    .trim()
    .min(1, "Message cannot be empty")
    .max(2000, "Message too long"),
  // Optional quote-reply target; must belong to the same conversation.
  replyTo: objectId.optional(),
});

export const markReadSchema = z.object({
  // WhatsApp-style reciprocal receipts: false marks delivered (grey ticks
  // forever) instead of read, and stays silent. Defaults true.
  receipt: z.boolean().optional().default(true),
});

export const listMessagesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  before: z.string().trim().optional(),
});
