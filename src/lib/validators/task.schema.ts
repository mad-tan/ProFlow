import { z } from "zod";

const taskStatusEnum = z.enum([
  "backlog",
  "todo",
  "in_progress",
  "in_review",
  "done",
  "cancelled",
]);

const taskPriorityEnum = z.enum(["urgent", "high", "medium", "low", "none"]);

/**
 * ISO date string pattern: YYYY-MM-DD
 */
const isoDateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Must be a valid date in YYYY-MM-DD format");

export const createTaskSchema = z.object({
  title: z
    .string()
    .min(1, "Task title is required")
    .max(500, "Task title must be 500 characters or fewer"),
  description: z
    .string()
    .max(5000, "Description must be 5000 characters or fewer")
    .nullable()
    .optional(),
  projectId: z.string().nullable().optional(),
  status: taskStatusEnum.optional().default("todo"),
  priority: taskPriorityEnum.optional().default("none"),
  dueDate: isoDateString.nullable().optional(),
  estimatedMinutes: z
    .number()
    .int()
    .nonnegative("Estimated minutes must be non-negative")
    .max(99999, "Estimated minutes is too large")
    .nullable()
    .optional(),
  tags: z
    .array(z.string().min(1).max(50))
    .max(20, "At most 20 tags allowed")
    .optional()
    .default([]),
  sortOrder: z.number().int().nonnegative().optional().default(0),
  metadata: z.record(z.string(), z.unknown()).optional().default({}),
});

export const updateTaskSchema = z.object({
  title: z
    .string()
    .min(1, "Task title is required")
    .max(500, "Task title must be 500 characters or fewer")
    .optional(),
  description: z
    .string()
    .max(5000, "Description must be 5000 characters or fewer")
    .nullable()
    .optional(),
  projectId: z.string().nullable().optional(),
  status: taskStatusEnum.optional(),
  priority: taskPriorityEnum.optional(),
  dueDate: isoDateString.nullable().optional(),
  estimatedMinutes: z
    .number()
    .int()
    .nonnegative()
    .max(99999)
    .nullable()
    .optional(),
  actualMinutes: z
    .number()
    .int()
    .nonnegative()
    .max(99999)
    .nullable()
    .optional(),
  tags: z.array(z.string().min(1).max(50)).max(20).optional(),
  sortOrder: z.number().int().nonnegative().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const createTaskDependencySchema = z.object({
  taskId: z.string().min(1, "Task ID is required"),
  dependsOnTaskId: z.string().min(1, "Depends-on task ID is required"),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type CreateTaskDependencyInput = z.infer<typeof createTaskDependencySchema>;
