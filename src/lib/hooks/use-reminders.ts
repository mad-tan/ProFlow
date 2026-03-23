import useSWR, { mutate } from "swr";
import type { Reminder, ReminderFrequency } from "@/lib/types";
import { fetcher, apiPost, apiPut, apiPatch, apiDelete } from "./use-fetch";

// ─── Filter / Input Types ───────────────────────────────────────────────────

export interface ReminderFilters {
  isActive?: boolean;
  taskId?: string;
  page?: number;
  pageSize?: number;
}

export interface CreateReminderInput {
  title: string;
  description?: string;
  taskId?: string;
  remindAt: string;
  frequency?: ReminderFrequency;
  metadata?: Record<string, unknown>;
}

export interface UpdateReminderInput {
  title?: string;
  description?: string | null;
  taskId?: string | null;
  remindAt?: string;
  frequency?: ReminderFrequency;
  isActive?: boolean;
  metadata?: Record<string, unknown>;
}

// ─── URL Builder ────────────────────────────────────────────────────────────

function buildRemindersUrl(filters?: ReminderFilters): string {
  const params = new URLSearchParams();
  if (filters?.isActive !== undefined)
    params.set("isActive", String(filters.isActive));
  if (filters?.taskId) params.set("taskId", filters.taskId);
  if (filters?.page) params.set("page", String(filters.page));
  if (filters?.pageSize) params.set("pageSize", String(filters.pageSize));

  const qs = params.toString();
  return `/api/reminders${qs ? `?${qs}` : ""}`;
}

/** Invalidate all reminder-related SWR cache entries. */
function invalidateReminders(): Promise<unknown> {
  return mutate(
    (key) => typeof key === "string" && key.startsWith("/api/reminders")
  );
}

// ─── Hook ───────────────────────────────────────────────────────────────────

export function useReminders(filters?: ReminderFilters) {
  const url = buildRemindersUrl(filters);
  const { data, error, isLoading, isValidating } = useSWR<Reminder[]>(
    url,
    fetcher
  );

  return {
    reminders: data,
    isLoading,
    isValidating,
    error,

    async createReminder(input: CreateReminderInput): Promise<Reminder> {
      const created = await apiPost<Reminder>("/api/reminders", input);
      await invalidateReminders();
      return created;
    },

    async updateReminder(
      id: string,
      input: UpdateReminderInput
    ): Promise<Reminder> {
      const updated = await apiPut<Reminder>(`/api/reminders/${id}`, input);
      await invalidateReminders();
      return updated;
    },

    async deleteReminder(id: string): Promise<void> {
      await apiDelete(`/api/reminders/${id}`);
      await invalidateReminders();
    },

    async dismissReminder(id: string): Promise<Reminder> {
      const dismissed = await apiPatch<Reminder>(
        `/api/reminders/${id}/dismiss`,
        {}
      );
      await invalidateReminders();
      return dismissed;
    },
  };
}
