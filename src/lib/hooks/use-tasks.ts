import useSWR, { mutate } from "swr";
import type { Task, TaskStatus, TaskPriority } from "@/lib/types";
import { fetcher, apiPost, apiPut, apiPatch, apiDelete } from "./use-fetch";

// ─── Filter Types ───────────────────────────────────────────────────────────

export interface TaskFilters {
  status?: TaskStatus;
  priority?: TaskPriority;
  projectId?: string;
  search?: string;
  dueDate?: string;
  page?: number;
  pageSize?: number;
}

// ─── Input Types ────────────────────────────────────────────────────────────

export interface CreateTaskInput {
  title: string;
  description?: string;
  projectId?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  dueDate?: string;
  estimatedMinutes?: number;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string | null;
  projectId?: string | null;
  status?: TaskStatus;
  priority?: TaskPriority;
  dueDate?: string | null;
  estimatedMinutes?: number | null;
  actualMinutes?: number | null;
  tags?: string[];
  sortOrder?: number;
  metadata?: Record<string, unknown>;
}

// ─── URL Builder ────────────────────────────────────────────────────────────

function buildTasksUrl(filters?: TaskFilters): string {
  const params = new URLSearchParams();
  if (filters?.status) params.set("status", filters.status);
  if (filters?.priority) params.set("priority", filters.priority);
  if (filters?.projectId) params.set("projectId", filters.projectId);
  if (filters?.search) params.set("search", filters.search);
  if (filters?.dueDate) params.set("dueDate", filters.dueDate);
  if (filters?.page) params.set("page", String(filters.page));
  if (filters?.pageSize) params.set("pageSize", String(filters.pageSize));

  const qs = params.toString();
  return `/api/tasks${qs ? `?${qs}` : ""}`;
}

/** Invalidate all task-related SWR cache entries. */
async function invalidateTasks(): Promise<void> {
  await Promise.all([
    mutate((key) => typeof key === "string" && key.startsWith("/api/tasks")),
    // Also invalidate project caches since task counts may change
    mutate((key) => typeof key === "string" && key.startsWith("/api/projects")),
  ]);
}

// ─── Hooks ──────────────────────────────────────────────────────────────────

export function useTasks(filters?: TaskFilters) {
  const url = buildTasksUrl(filters);
  const { data, error, isLoading, isValidating } = useSWR<Task[]>(
    url,
    fetcher
  );

  return {
    tasks: data,
    isLoading,
    isValidating,
    error,

    async createTask(input: CreateTaskInput): Promise<Task> {
      const created = await apiPost<Task>("/api/tasks", input);
      await invalidateTasks();
      return created;
    },

    async updateTask(id: string, input: UpdateTaskInput): Promise<Task> {
      const updated = await apiPut<Task>(`/api/tasks/${id}`, input);
      await invalidateTasks();
      return updated;
    },

    async deleteTask(id: string): Promise<void> {
      await apiDelete(`/api/tasks/${id}`);
      await invalidateTasks();
    },

    async updateTaskStatus(id: string, status: TaskStatus): Promise<Task> {
      const updated = await apiPatch<Task>(`/api/tasks/${id}`, { status });
      await invalidateTasks();
      return updated;
    },
  };
}

export function useTask(id: string | undefined) {
  const { data, error, isLoading, isValidating } = useSWR<Task>(
    id ? `/api/tasks/${id}` : null,
    fetcher
  );

  return {
    task: data,
    isLoading,
    isValidating,
    error,

    async updateTask(input: UpdateTaskInput): Promise<Task> {
      if (!id) throw new Error("Task ID is required");
      const updated = await apiPut<Task>(`/api/tasks/${id}`, input);
      await invalidateTasks();
      return updated;
    },

    async deleteTask(): Promise<void> {
      if (!id) throw new Error("Task ID is required");
      await apiDelete(`/api/tasks/${id}`);
      await invalidateTasks();
    },

    async updateTaskStatus(status: TaskStatus): Promise<Task> {
      if (!id) throw new Error("Task ID is required");
      const updated = await apiPatch<Task>(`/api/tasks/${id}`, { status });
      await invalidateTasks();
      return updated;
    },
  };
}
