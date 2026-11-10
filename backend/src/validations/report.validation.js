import { z } from "zod";

import { REPORT_REASONS } from "../config/constants.js";

const reasonEnum = z.enum(Object.values(REPORT_REASONS));

const descriptionValidation = z
  .string()
  .trim()
  .min(10, "Description must be at least 10 characters")
  .max(500, "Description cannot exceed 500 characters")
  .optional();

// Optional evidence links: max 3 HTTPS URLs (host-pinned at upload time,
// validated here for shape only; the Report model persists reason/
// description, evidence links and the chat it came from).
const evidenceValidation = z
  .array(
    z
      .string()
      .url("Invalid evidence URL")
      .max(2048, "Evidence URL too long")
      .refine((u) => u.startsWith("https://"), {
        message: "Evidence URL must use HTTPS",
      }),
  )
  .max(3, "Maximum 3 evidence links allowed")
  .optional();

const conversationIdValidation = z
  .string()
  .regex(/^[a-f0-9]{24}$/i, "Invalid conversation id")
  .optional();

export const reportProductSchema = z.object({
  reason: reasonEnum,

  description: descriptionValidation,

  evidence: evidenceValidation,

  conversation_id: conversationIdValidation,
});

export const reportUserSchema = z.object({
  reason: reasonEnum,

  description: descriptionValidation,

  evidence: evidenceValidation,

  conversation_id: conversationIdValidation,
});