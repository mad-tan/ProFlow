// ─── Enum Types ──────────────────────────────────────────────────────────────

export type ProjectStatus = "active" | "on_hold" | "completed" | "archived";

export type TaskStatus =
  | "backlog"
  | "todo"
  | "in_progress"
  | "in_review"
  | "done"
  | "cancelled";

export type TaskPriority = "urgent" | "high" | "medium" | "low" | "none";

export type ReminderFrequency =
  | "once"
  | "daily"
  | "weekly"
  | "monthly"
  | "custom";

export type AIChatRole = "user" | "assistant" | "system";

export type AuditAction =
  | "create"
  | "update"
  | "delete"
  | "complete"
  | "archive"
  | "restore";

export type MoodRating = 1 | 2 | 3 | 4 | 5;

export type EnergyLevel = 1 | 2 | 3 | 4 | 5;

export type StressLevel = 1 | 2 | 3 | 4 | 5;

// ─── Core Entities ───────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  timezone: string;
  preferences: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  color: string | null;
  sortOrder: number;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: string;
  projectId: string | null;
  userId: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  estimatedMinutes: number | null;
  actualMinutes: number | null;
  tags: string[];
  sortOrder: number;
  completedAt: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface TaskDependency {
  id: string;
  taskId: string;
  dependsOnTaskId: string;
  createdAt: string;
}

export interface TimeEntry {
  id: string;
  taskId: string | null;
  userId: string;
  description: string | null;
  startTime: string;
  endTime: string | null;
  durationMinutes: number | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface MentalHealthCheckIn {
  id: string;
  userId: string;
  date: string;
  moodRating: MoodRating;
  energyLevel: EnergyLevel;
  stressLevel: StressLevel;
  sleepHours: number | null;
  notes: string | null;
  tags: string[];
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface JournalEntry {
  id: string;
  userId: string;
  title: string | null;
  content: string;
  tags: string[];
  mood: MoodRating | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface Checklist {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  isTemplate: boolean;
  sortOrder: number;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface ChecklistItem {
  id: string;
  checklistId: string;
  content: string;
  isCompleted: boolean;
  sortOrder: number;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Reminder {
  id: string;
  userId: string;
  taskId: string | null;
  title: string;
  description: string | null;
  remindAt: string;
  frequency: ReminderFrequency;
  isActive: boolean;
  lastTriggeredAt: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface AIChatMessage {
  id: string;
  userId: string;
  sessionId: string;
  role: AIChatRole;
  content: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface AICorrelation {
  id: string;
  userId: string;
  correlationType: string;
  sourceEntity: string;
  sourceId: string;
  targetEntity: string;
  targetId: string;
  confidence: number;
  insight: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface AuditLogEntry {
  id: string;
  userId: string;
  action: AuditAction;
  entityType: string;
  entityId: string;
  changes: Record<string, unknown>;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

export interface Note {
  id: string;
  userId: string;
  title: string;
  content: string;
  isPinned: boolean;
  tags: string[];
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface Subtask {
  id: string;
  taskId: string;
  userId: string;
  title: string;
  isCompleted: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface TaskComment {
  id: string;
  taskId: string;
  userId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Job Hunt Types ─────────────────────────────────────────────────────────

export type JobListingStatus = "saved" | "applied" | "interviewing" | "offered" | "rejected" | "archived";
export type ApplicationStatus = "pending" | "submitted" | "viewed" | "interview" | "rejected" | "offered";
export type ApplicationVia = "direct" | "linkedin" | "referral" | "cold_email";
export type ColdEmailStatus = "drafted" | "sent" | "replied" | "bounced";
export type LinkedInOutreachStatus = "drafted" | "sent" | "connected" | "replied";

export interface ParsedResume {
  name: string;
  email: string;
  phone: string;
  location: string;
  summary: string;
  links: { type: string; url: string }[];
}

export interface ResumeExperience {
  company: string;
  title: string;
  startDate: string;
  endDate: string;
  description: string;
  achievements: string[];
}

export interface ResumeEducation {
  school: string;
  degree: string;
  field: string;
  gradDate: string;
  gpa?: string;
}

export interface Resume {
  id: string;
  userId: string;
  fileName: string;
  filePath: string;
  rawText: string;
  parsedData: ParsedResume;
  skills: string[];
  experience: ResumeExperience[];
  education: ResumeEducation[];
  createdAt: string;
  updatedAt: string;
}

export interface JobListing {
  id: string;
  userId: string;
  title: string;
  company: string;
  location: string;
  salaryRange: string | null;
  jobType: string | null;
  url: string | null;
  description: string;
  requirements: string[];
  score: number | null;
  scoreReasons: string[];
  source: string | null;
  status: JobListingStatus;
  tags: string[];
  metadata: Record<string, unknown>;
  appliedAt: string | null;
  searchSessionId: string | null;
  scrapedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SearchSession {
  id: string;
  userId: string;
  query: string;
  location: string;
  siteFilter: string;
  dateFilter: string | null;
  totalResults: number;
  nextStart: number;
  createdAt: string;
  updatedAt: string;
}

export interface SearchJobsResponse {
  jobs: JobListing[];
  searchSessionId: string;
  hasMore: boolean;
  totalResults: number;
}

export interface PipelineResponse extends SearchJobsResponse {
  emailsGenerated: number;
  linkedinGenerated: number;
}

export interface Application {
  id: string;
  userId: string;
  listingId: string;
  resumeVersion: string | null;
  coverLetter: string | null;
  appliedVia: ApplicationVia;
  appliedAt: string | null;
  status: ApplicationStatus;
  notes: string | null;
  followUpDate: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface ColdEmail {
  id: string;
  userId: string;
  listingId: string | null;
  recipientName: string;
  recipientEmail: string;
  recipientTitle: string | null;
  company: string;
  subject: string;
  body: string;
  status: ColdEmailStatus;
  sentAt: string | null;
  followUpCount: number;
  lastFollowUpAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LinkedInOutreach {
  id: string;
  userId: string;
  listingId: string | null;
  personName: string;
  personTitle: string | null;
  personUrl: string | null;
  company: string;
  message: string;
  status: LinkedInOutreachStatus;
  sentAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─── Utility Types ──────────────────────────────────────────────────────────

export interface DateRange {
  start: string;
  end: string;
}

// ─── API Response Types ──────────────────────────────────────────────────────

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  timestamp: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
  timestamp: string;
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  timestamp: string;
}
