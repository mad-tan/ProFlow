import { z } from "zod";

export const createChecklistSchema = z.object({
  title: z
    .string()
    .min(1, "Checklist title is required")
    .max(300, "Title must be 300 characters or fewer"),
  description: z
    .string()
    .max(2000, "Description must be 2000 characters or fewer")
    .nullable()
    .optional(),
  isTemplate: z.boolean().optional().default(false),
  sortOrder: z.number().int().nonnegative().optional().default(0),
  metadata: z.record(z.string(), z.unknown()).optional().default({}),
});

export const updateChecklistSchema = z.object({
  title: z
    .string()
    .min(1, "Checklist title is required")
    .max(300, "Title must be 300 characters or fewer")
    .optional(),
  description: z
    .string()
    .max(2000, "Description must be 2000 characters or fewer")
    .nullable()
    .optional(),
  isTemplate: z.boolean().optional(),
  sortOrder: z.number().int().nonnegative().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const createChecklistItemSchema = z.object({
  checklistId: z.string().min(1, "Checklist ID is required"),
  content: z
    .string()
    .min(1, "Item content is required")
    .max(1000, "Content must be 1000 characters or fewer"),
  isCompleted: z.boolean().optional().default(false),
  sortOrder: z.number().int().nonnegative().optional().default(0),
});

export const updateChecklistItemSchema = z.object({
  content: z
    .string()
    .min(1, "Item content is required")
    .max(1000, "Content must be 1000 characters or fewer")
    .optional(),
  isCompleted: z.boolean().optional(),
  sortOrder: z.number().int().nonnegative().optional(),
});

/**
 * Batch reorder schema: accepts an array of { id, sortOrder } pairs.
 */
export const reorderChecklistItemsSchema = z.object({
  items: z
    .array(
      z.object({
        id: z.string().min(1),
        sortOrder: z.number().int().nonnegative(),
      })
    )
    .min(1, "At least one item is required"),
});

export type CreateChecklistInput = z.infer<typeof createChecklistSchema>;
export type UpdateChecklistInput = z.infer<typeof updateChecklistSchema>;
export type CreateChecklistItemInput = z.infer<typeof createChecklistItemSchema>;
export type UpdateChecklistItemInput = z.infer<typeof updateChecklistItemSchema>;
export type ReorderChecklistItemsInput = z.infer<typeof reorderChecklistItemsSchema>;
