import type {
  ProjectStatus,
  TaskStatus,
  TaskPriority,
  ReminderFrequency,
  AIChatRole,
  AuditAction,
  MoodRating,
  EnergyLevel,
  StressLevel,
} from "@/lib/types";

// ─── Project ─────────────────────────────────────────────────────────────────

export const PROJECT_STATUSES: readonly ProjectStatus[] = [
  "active",
  "on_hold",
  "completed",
  "archived",
] as const;

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  active: "Active",
  on_hold: "On Hold",
  completed: "Completed",
  archived: "Archived",
};

export const PROJECT_COLORS = [
  "#ef4444", // red
  "#f97316", // orange
  "#f59e0b", // amber
  "#22c55e", // green
  "#14b8a6", // teal
  "#3b82f6", // blue
  "#6366f1", // indigo
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#6b7280", // gray
] as const;

// ─── Task ────────────────────────────────────────────────────────────────────

export const TASK_STATUSES: readonly TaskStatus[] = [
  "backlog",
  "todo",
  "in_progress",
  "in_review",
  "done",
  "cancelled",
] as const;

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  backlog: "Backlog",
  todo: "To Do",
  in_progress: "In Progress",
  in_review: "In Review",
  done: "Done",
  cancelled: "Cancelled",
};

export const TASK_PRIORITIES: readonly TaskPriority[] = [
  "urgent",
  "high",
  "medium",
  "low",
  "none",
] as const;

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  urgent: "Urgent",
  high: "High",
  medium: "Medium",
  low: "Low",
  none: "None",
};

export const TASK_PRIORITY_ORDER: Record<TaskPriority, number> = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3,
  none: 4,
};

// ─── Reminder ────────────────────────────────────────────────────────────────

export const REMINDER_FREQUENCIES: readonly ReminderFrequency[] = [
  "once",
  "daily",
  "weekly",
  "monthly",
  "custom",
] as const;

export const REMINDER_FREQUENCY_LABELS: Record<ReminderFrequency, string> = {
  once: "Once",
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
  custom: "Custom",
};

// ─── AI Chat ─────────────────────────────────────────────────────────────────

export const AI_CHAT_ROLES: readonly AIChatRole[] = [
  "user",
  "assistant",
  "system",
] as const;

// ─── Audit ───────────────────────────────────────────────────────────────────

export const AUDIT_ACTIONS: readonly AuditAction[] = [
  "create",
  "update",
  "delete",
  "complete",
  "archive",
  "restore",
] as const;

// ─── Mental Health ───────────────────────────────────────────────────────────

export const MOOD_RATINGS: readonly MoodRating[] = [1, 2, 3, 4, 5] as const;

export const MOOD_LABELS: Record<MoodRating, string> = {
  1: "Very Low",
  2: "Low",
  3: "Neutral",
  4: "Good",
  5: "Excellent",
};

export const ENERGY_LEVELS: readonly EnergyLevel[] = [
  1, 2, 3, 4, 5,
] as const;

export const ENERGY_LABELS: Record<EnergyLevel, string> = {
  1: "Exhausted",
  2: "Low",
  3: "Moderate",
  4: "High",
  5: "Energized",
};

export const STRESS_LEVELS: readonly StressLevel[] = [
  1, 2, 3, 4, 5,
] as const;

export const STRESS_LABELS: Record<StressLevel, string> = {
  1: "Very Low",
  2: "Low",
  3: "Moderate",
  4: "High",
  5: "Very High",
};

// ─── Pagination Defaults ─────────────────────────────────────────────────────

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

// ─── Entity Types (for audit log and correlations) ───────────────────────────

export const ENTITY_TYPES = [
  "user",
  "project",
  "task",
  "task_dependency",
  "time_entry",
  "mental_health_check_in",
  "journal_entry",
  "checklist",
  "checklist_item",
  "reminder",
  "ai_chat_message",
] as const;

export type EntityType = (typeof ENTITY_TYPES)[number];
