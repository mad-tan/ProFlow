import useSWR, { mutate } from "swr";
import type { Project, ProjectStatus } from "@/lib/types";
import { fetcher, apiPost, apiPut, apiDelete, apiPatch } from "./use-fetch";

// ─── Filter Types ───────────────────────────────────────────────────────────

export interface ProjectFilters {
  status?: ProjectStatus;
  search?: string;
}

// ─── Input Types ────────────────────────────────────────────────────────────

export interface CreateProjectInput {
  name: string;
  description?: string;
  color?: string;
  status?: ProjectStatus;
  metadata?: Record<string, unknown>;
}

export interface UpdateProjectInput {
  name?: string;
  description?: string | null;
  color?: string | null;
  status?: ProjectStatus;
  sortOrder?: number;
  metadata?: Record<string, unknown>;
}

// ─── URL Builder ────────────────────────────────────────────────────────────

function buildProjectsUrl(filters?: ProjectFilters): string {
  const params = new URLSearchParams();
  if (filters?.status) params.set("status", filters.status);
  if (filters?.search) params.set("search", filters.search);

  const qs = params.toString();
  return `/api/projects${qs ? `?${qs}` : ""}`;
}

// ─── Hooks ──────────────────────────────────────────────────────────────────

export function useProjects(filters?: ProjectFilters) {
  const url = buildProjectsUrl(filters);
  const { data, error, isLoading, isValidating } = useSWR<Project[]>(
    url,
    fetcher
  );

  return {
    projects: data,
    isLoading,
    isValidating,
    error,

    async createProject(input: CreateProjectInput): Promise<Project> {
      const created = await apiPost<Project>("/api/projects", input);
      await mutate((key) => typeof key === "string" && key.startsWith("/api/projects"));
      return created;
    },

    async updateProject(id: string, input: UpdateProjectInput): Promise<Project> {
      const updated = await apiPut<Project>(`/api/projects/${id}`, input);
      await mutate((key) => typeof key === "string" && key.startsWith("/api/projects"));
      return updated;
    },

    async deleteProject(id: string): Promise<void> {
      await apiDelete(`/api/projects/${id}`);
      await mutate((key) => typeof key === "string" && key.startsWith("/api/projects"));
    },

    async archiveProject(id: string): Promise<Project> {
      const archived = await apiPatch<Project>(`/api/projects/${id}`, {
        status: "archived",
      });
      await mutate((key) => typeof key === "string" && key.startsWith("/api/projects"));
      return archived;
    },
  };
}

export function useProject(id: string | undefined) {
  const { data, error, isLoading, isValidating } = useSWR<Project>(
    id ? `/api/projects/${id}` : null,
    fetcher
  );

  return {
    project: data,
    isLoading,
    isValidating,
    error,

    async updateProject(input: UpdateProjectInput): Promise<Project> {
      if (!id) throw new Error("Project ID is required");
      const updated = await apiPut<Project>(`/api/projects/${id}`, input);
      await mutate((key) => typeof key === "string" && key.startsWith("/api/projects"));
      return updated;
    },

    async deleteProject(): Promise<void> {
      if (!id) throw new Error("Project ID is required");
      await apiDelete(`/api/projects/${id}`);
      await mutate((key) => typeof key === "string" && key.startsWith("/api/projects"));
    },

    async archiveProject(): Promise<Project> {
      if (!id) throw new Error("Project ID is required");
      const archived = await apiPatch<Project>(`/api/projects/${id}`, {
        status: "archived",
      });
      await mutate((key) => typeof key === "string" && key.startsWith("/api/projects"));
      return archived;
    },
  };
}
