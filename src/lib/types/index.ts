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
