import { z } from "zod";

export const createProjectSchema = z.object({
  name: z
    .string()
    .min(1, "Project name is required")
    .max(200, "Project name must be 200 characters or fewer"),
  description: z
    .string()
    .max(2000, "Description must be 2000 characters or fewer")
    .nullable()
    .optional(),
  status: z
    .enum(["active", "on_hold", "completed", "archived"])
    .optional()
    .default("active"),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Color must be a valid hex color (e.g. #3b82f6)")
    .nullable()
    .optional(),
  sortOrder: z.number().int().nonnegative().optional().default(0),
  metadata: z.record(z.string(), z.unknown()).optional().default({}),
});

export const updateProjectSchema = z.object({
  name: z
    .string()
    .min(1, "Project name is required")
    .max(200, "Project name must be 200 characters or fewer")
    .optional(),
  description: z
    .string()
    .max(2000, "Description must be 2000 characters or fewer")
    .nullable()
    .optional(),
  status: z.enum(["active", "on_hold", "completed", "archived"]).optional(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Color must be a valid hex color")
    .nullable()
    .optional(),
  sortOrder: z.number().int().nonnegative().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
