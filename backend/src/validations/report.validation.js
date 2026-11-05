import { z } from "zod";

import { REPORT_REASONS } from "../config/constants.js";

const reasonEnum = z.enum(Object.values(REPORT_REASONS));

const descriptionValidation = z
  .string()
  .trim()
  .max(500, "Description cannot exceed 500 characters")
  .optional();

export const reportProductSchema = z.object({
  reason: reasonEnum,

  description: descriptionValidation,
});

export const reportUserSchema = z.object({
  reason: reasonEnum,

  description: descriptionValidation,
});