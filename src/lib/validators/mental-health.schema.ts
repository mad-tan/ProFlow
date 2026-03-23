import { z } from "zod";

const ratingSchema = z
  .number()
  .int()
  .min(1, "Rating must be between 1 and 5")
  .max(5, "Rating must be between 1 and 5");

const isoDateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Must be a valid date in YYYY-MM-DD format");

export const createMentalHealthCheckInSchema = z.object({
  date: isoDateString,
  moodRating: ratingSchema,
  energyLevel: ratingSchema,
  stressLevel: ratingSchema,
  sleepHours: z
    .number()
    .min(0, "Sleep hours cannot be negative")
    .max(24, "Sleep hours cannot exceed 24")
    .nullable()
    .optional(),
  notes: z
    .string()
    .max(5000, "Notes must be 5000 characters or fewer")
    .nullable()
    .optional(),
  tags: z
    .array(z.string().min(1).max(50))
    .max(20, "At most 20 tags allowed")
    .optional()
    .default([]),
  metadata: z.record(z.string(), z.unknown()).optional().default({}),
});

export const updateMentalHealthCheckInSchema = z.object({
  moodRating: ratingSchema.optional(),
  energyLevel: ratingSchema.optional(),
  stressLevel: ratingSchema.optional(),
  sleepHours: z.number().min(0).max(24).nullable().optional(),
  notes: z.string().max(5000).nullable().optional(),
  tags: z.array(z.string().min(1).max(50)).max(20).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const createJournalEntrySchema = z.object({
  title: z
    .string()
    .max(300, "Title must be 300 characters or fewer")
    .nullable()
    .optional(),
  content: z
    .string()
    .min(1, "Journal content is required")
    .max(50000, "Content must be 50000 characters or fewer"),
  tags: z
    .array(z.string().min(1).max(50))
    .max(20, "At most 20 tags allowed")
    .optional()
    .default([]),
  mood: ratingSchema.nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).optional().default({}),
});

export const updateJournalEntrySchema = z.object({
  title: z.string().max(300).nullable().optional(),
  content: z.string().min(1).max(50000).optional(),
  tags: z.array(z.string().min(1).max(50)).max(20).optional(),
  mood: ratingSchema.nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type CreateMentalHealthCheckInInput = z.infer<typeof createMentalHealthCheckInSchema>;
export type UpdateMentalHealthCheckInInput = z.infer<typeof updateMentalHealthCheckInSchema>;
export type CreateJournalEntryInput = z.infer<typeof createJournalEntrySchema>;
export type UpdateJournalEntryInput = z.infer<typeof updateJournalEntrySchema>;
