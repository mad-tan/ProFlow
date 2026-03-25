import useSWR, { mutate } from "swr";
import type { TimeEntry } from "@/lib/types";
import { fetcher, apiPost, apiPut, apiDelete } from "./use-fetch";

// ─── Filter Types ───────────────────────────────────────────────────────────

export interface TimeEntryFilters {
  taskId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
}

// ─── Input Types ────────────────────────────────────────────────────────────

export interface CreateManualEntryInput {
  taskId?: string;
  description?: string;
  startTime: string;
  endTime: string;
  metadata?: Record<string, unknown>;
}

// ─── URL Builder ────────────────────────────────────────────────────────────

function buildTimeEntriesUrl(filters?: TimeEntryFilters): string {
  const params = new URLSearchParams();
  if (filters?.taskId) params.set("taskId", filters.taskId);
  if (filters?.startDate) params.set("startDate", filters.startDate);
  if (filters?.endDate) params.set("endDate", filters.endDate);
  if (filters?.page) params.set("page", String(filters.page));
  if (filters?.pageSize) params.set("pageSize", String(filters.pageSize));

  const qs = params.toString();
  return `/api/time-entries${qs ? `?${qs}` : ""}`;
}

/** Invalidate all time-entry-related SWR cache entries. */
async function invalidateTimeEntries(): Promise<void> {
  await mutate(
    (key) => typeof key === "string" && key.startsWith("/api/time-entries")
  );
}

// ─── Hooks ──────────────────────────────────────────────────────────────────

export function useTimeEntries(filters?: TimeEntryFilters) {
  const url = buildTimeEntriesUrl(filters);
  const { data, error, isLoading, isValidating } = useSWR<TimeEntry[]>(
    url,
    fetcher
  );

  return {
    timeEntries: data,
    isLoading,
    isValidating,
    error,

    async createManualEntry(input: CreateManualEntryInput): Promise<TimeEntry> {
      const created = await apiPost<TimeEntry>("/api/time-entries", input);
      await invalidateTimeEntries();
      return created;
    },
  };
}

export function useActiveTimer() {
  const { data, error, isLoading, isValidating } = useSWR<TimeEntry | null>(
    "/api/time-entries/active",
    fetcher,
    {
      // Poll for active timer every 30 seconds to keep UI in sync
      refreshInterval: 30_000,
    }
  );

  return {
    activeTimer: data ?? null,
    isLoading,
    isValidating,
    error,

    async startTimer(
      taskId?: string,
      description?: string
    ): Promise<TimeEntry> {
      const started = await apiPost<TimeEntry>("/api/time-entries/start", {
        taskId,
        description,
      });
      await invalidateTimeEntries();
      return started;
    },

    async stopTimer(): Promise<TimeEntry> {
      const stopped = await apiPost<TimeEntry>("/api/time-entries/stop", {});
      await invalidateTimeEntries();
      return stopped;
    },
  };
}
