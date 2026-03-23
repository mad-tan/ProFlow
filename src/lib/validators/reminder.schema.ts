import { z } from "zod";

const isoDateTimeString = z
  .string()
  .datetime({ message: "Must be a valid ISO 8601 datetime string" });

const frequencyEnum = z.enum([
  "once",
  "daily",
  "weekly",
  "monthly",
  "custom",
]);

export const createReminderSchema = z.object({
  title: z
    .string()
    .min(1, "Reminder title is required")
    .max(300, "Title must be 300 characters or fewer"),
  description: z
    .string()
    .max(2000, "Description must be 2000 characters or fewer")
    .nullable()
    .optional(),
  taskId: z.string().nullable().optional(),
  remindAt: isoDateTimeString,
  frequency: frequencyEnum.optional().default("once"),
  isActive: z.boolean().optional().default(true),
  metadata: z.record(z.string(), z.unknown()).optional().default({}),
});

export const updateReminderSchema = z.object({
  title: z
    .string()
    .min(1, "Reminder title is required")
    .max(300, "Title must be 300 characters or fewer")
    .optional(),
  description: z
    .string()
    .max(2000, "Description must be 2000 characters or fewer")
    .nullable()
    .optional(),
  taskId: z.string().nullable().optional(),
  remindAt: isoDateTimeString.optional(),
  frequency: frequencyEnum.optional(),
  isActive: z.boolean().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type CreateReminderInput = z.infer<typeof createReminderSchema>;
export type UpdateReminderInput = z.infer<typeof updateReminderSchema>;
