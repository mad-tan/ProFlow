import { z } from "zod";

// ─── Enums ────────────────────────────────────────────────────────────────────

export const jobListingStatusEnum = z.enum([
  "saved", "applied", "interviewing", "offered", "rejected", "archived",
]);

export const applicationStatusEnum = z.enum([
  "pending", "submitted", "viewed", "interview", "rejected", "offered",
]);

export const applicationViaEnum = z.enum([
  "direct", "linkedin", "referral", "cold_email",
]);

export const coldEmailStatusEnum = z.enum([
  "drafted", "sent", "replied", "bounced",
]);

export const linkedInOutreachStatusEnum = z.enum([
  "drafted", "sent", "connected", "replied",
]);

// ─── Job Listings ─────────────────────────────────────────────────────────────

export const createJobListingSchema = z.object({
  title: z.string().min(1).max(500),
  company: z.string().min(1).max(500),
  location: z.string().max(500).default(""),
  salaryRange: z.string().max(200).nullable().optional(),
  jobType: z.string().max(100).nullable().optional(),
  url: z.string().max(2000).nullable().optional(),
  description: z.string().max(50000).default(""),
  requirements: z.array(z.string()).default([]),
  score: z.number().min(0).max(100).nullable().optional(),
  scoreReasons: z.array(z.string()).default([]),
  source: z.string().max(200).nullable().optional(),
  status: jobListingStatusEnum.default("saved"),
  tags: z.array(z.string()).max(20).default([]),
});

export const updateJobListingSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  company: z.string().min(1).max(500).optional(),
  location: z.string().max(500).optional(),
  salaryRange: z.string().max(200).nullable().optional(),
  jobType: z.string().max(100).nullable().optional(),
  url: z.string().max(2000).nullable().optional(),
  description: z.string().max(50000).optional(),
  requirements: z.array(z.string()).optional(),
  score: z.number().min(0).max(100).nullable().optional(),
  scoreReasons: z.array(z.string()).optional(),
  source: z.string().max(200).nullable().optional(),
  status: jobListingStatusEnum.optional(),
  tags: z.array(z.string()).max(20).optional(),
  appliedAt: z.string().nullable().optional(),
});

// ─── Applications ─────────────────────────────────────────────────────────────

export const createApplicationSchema = z.object({
  listingId: z.string().min(1),
  resumeVersion: z.string().nullable().optional(),
  coverLetter: z.string().max(50000).nullable().optional(),
  appliedVia: applicationViaEnum.default("direct"),
  appliedAt: z.string().nullable().optional(),
  status: applicationStatusEnum.default("pending"),
  notes: z.string().max(10000).nullable().optional(),
  followUpDate: z.string().nullable().optional(),
});

export const updateApplicationSchema = z.object({
  resumeVersion: z.string().nullable().optional(),
  coverLetter: z.string().max(50000).nullable().optional(),
  appliedVia: applicationViaEnum.optional(),
  appliedAt: z.string().nullable().optional(),
  status: applicationStatusEnum.optional(),
  notes: z.string().max(10000).nullable().optional(),
  followUpDate: z.string().nullable().optional(),
});

// ─── Cold Emails ──────────────────────────────────────────────────────────────

export const createColdEmailSchema = z.object({
  listingId: z.string().nullable().optional(),
  recipientName: z.string().min(1).max(300),
  recipientEmail: z.string().email().max(500),
  recipientTitle: z.string().max(300).nullable().optional(),
  company: z.string().min(1).max(500),
  subject: z.string().min(1).max(500),
  body: z.string().min(1).max(50000),
  status: coldEmailStatusEnum.default("drafted"),
});

export const updateColdEmailSchema = z.object({
  recipientName: z.string().min(1).max(300).optional(),
  recipientEmail: z.string().email().max(500).optional(),
  recipientTitle: z.string().max(300).nullable().optional(),
  subject: z.string().min(1).max(500).optional(),
  body: z.string().min(1).max(50000).optional(),
  status: coldEmailStatusEnum.optional(),
  sentAt: z.string().nullable().optional(),
  followUpCount: z.number().int().min(0).optional(),
  lastFollowUpAt: z.string().nullable().optional(),
});

// ─── LinkedIn Outreaches ──────────────────────────────────────────────────────

export const createLinkedInOutreachSchema = z.object({
  listingId: z.string().nullable().optional(),
  personName: z.string().min(1).max(300),
  personTitle: z.string().max(300).nullable().optional(),
  personUrl: z.string().max(2000).nullable().optional(),
  company: z.string().min(1).max(500),
  message: z.string().min(1).max(5000),
  status: linkedInOutreachStatusEnum.default("drafted"),
});

export const updateLinkedInOutreachSchema = z.object({
  personName: z.string().min(1).max(300).optional(),
  personTitle: z.string().max(300).nullable().optional(),
  personUrl: z.string().max(2000).nullable().optional(),
  message: z.string().min(1).max(5000).optional(),
  status: linkedInOutreachStatusEnum.optional(),
  sentAt: z.string().nullable().optional(),
});

// ─── Inferred Types ───────────────────────────────────────────────────────────

export type CreateJobListingInput = z.infer<typeof createJobListingSchema>;
export type UpdateJobListingInput = z.infer<typeof updateJobListingSchema>;
export type CreateApplicationInput = z.infer<typeof createApplicationSchema>;
export type UpdateApplicationInput = z.infer<typeof updateApplicationSchema>;
export type CreateColdEmailInput = z.infer<typeof createColdEmailSchema>;
export type UpdateColdEmailInput = z.infer<typeof updateColdEmailSchema>;
export type CreateLinkedInOutreachInput = z.infer<typeof createLinkedInOutreachSchema>;
export type UpdateLinkedInOutreachInput = z.infer<typeof updateLinkedInOutreachSchema>;
