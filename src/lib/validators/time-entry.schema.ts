import { z } from "zod";

const isoDateTimeString = z
  .string()
  .datetime({ message: "Must be a valid ISO 8601 datetime string" });

export const createTimeEntrySchema = z
  .object({
    taskId: z.string().nullable().optional(),
    description: z
      .string()
      .max(1000, "Description must be 1000 characters or fewer")
      .nullable()
      .optional(),
    startTime: isoDateTimeString,
    endTime: isoDateTimeString.nullable().optional(),
    durationMinutes: z
      .number()
      .int()
      .nonnegative("Duration must be non-negative")
      .max(1440, "Duration cannot exceed 24 hours")
      .nullable()
      .optional(),
    metadata: z.record(z.string(), z.unknown()).optional().default({}),
  })
  .refine(
    (data) => {
      if (data.startTime && data.endTime) {
        return new Date(data.endTime) > new Date(data.startTime);
      }
      return true;
    },
    {
      message: "End time must be after start time",
      path: ["endTime"],
    }
  );

export const updateTimeEntrySchema = z
  .object({
    taskId: z.string().nullable().optional(),
    description: z
      .string()
      .max(1000, "Description must be 1000 characters or fewer")
      .nullable()
      .optional(),
    startTime: isoDateTimeString.optional(),
    endTime: isoDateTimeString.nullable().optional(),
    durationMinutes: z
      .number()
      .int()
      .nonnegative()
      .max(1440)
      .nullable()
      .optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  })
  .refine(
    (data) => {
      if (data.startTime && data.endTime) {
        return new Date(data.endTime) > new Date(data.startTime);
      }
      return true;
    },
    {
      message: "End time must be after start time",
      path: ["endTime"],
    }
  );

/**
 * Schema for stopping a running time entry (sets endTime and computes duration).
 */
export const stopTimeEntrySchema = z.object({
  endTime: isoDateTimeString,
});

export type CreateTimeEntryInput = z.infer<typeof createTimeEntrySchema>;
export type UpdateTimeEntryInput = z.infer<typeof updateTimeEntrySchema>;
export type StopTimeEntryInput = z.infer<typeof stopTimeEntrySchema>;
