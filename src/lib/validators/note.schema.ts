import { z } from "zod";

export const createNoteSchema = z.object({
  title: z.string().min(1).max(500),
  content: z.string().max(50000).default(""),
  isPinned: z.boolean().default(false),
  tags: z.array(z.string()).max(20).default([]),
});

export const updateNoteSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  content: z.string().max(50000).optional(),
  isPinned: z.boolean().optional(),
  tags: z.array(z.string()).max(20).optional(),
});

export type CreateNoteInput = z.infer<typeof createNoteSchema>;
export type UpdateNoteInput = z.infer<typeof updateNoteSchema>;
