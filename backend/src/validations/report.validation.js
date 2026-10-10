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
// description — evidence is screened and dropped until a migration adds it).
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

export const reportProductSchema = z.object({
  reason: reasonEnum,

  description: descriptionValidation,

  evidence: evidenceValidation,
});

export const reportUserSchema = z.object({
  reason: reasonEnum,

  description: descriptionValidation,

  evidence: evidenceValidation,
});