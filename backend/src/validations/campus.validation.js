import { z } from "zod";

const slugRule = z
  .string()
  .trim()
  .toLowerCase()
  .min(2, "Slug must be at least 2 characters")
  .max(60, "Slug cannot exceed 60 characters")
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Invalid campus slug");

export const createCampusSchema = z.object({
  slug: slugRule,
  name: z.string().trim().min(2, "Name is required").max(120),
  short_name: z.string().trim().min(1, "Short name is required").max(40),
  city: z.string().trim().max(80).optional(),
  state: z.string().trim().max(80).optional(),
  email_domains: z.array(z.string().trim().max(120)).max(20).optional(),
  is_active: z.boolean().optional(),
});

export const updateCampusSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  short_name: z.string().trim().min(1).max(40).optional(),
  city: z.string().trim().max(80).nullable().optional(),
  state: z.string().trim().max(80).nullable().optional(),
  email_domains: z.array(z.string().trim().max(120)).max(20).optional(),
  is_active: z.boolean().optional(),
});

export const campusSlugSchema = z.object({
  campus_slug: z.string().trim().min(2, "Campus is required").max(60),
});
