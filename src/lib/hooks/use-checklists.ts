import useSWR, { mutate } from "swr";
import type { Checklist, ChecklistItem } from "@/lib/types";
import { fetcher, apiPost, apiPut, apiPatch, apiDelete } from "./use-fetch";

// ─── Filter / Input Types ───────────────────────────────────────────────────

export interface ChecklistFilters {
  isTemplate?: boolean;
  search?: string;
}

export interface CreateChecklistInput {
  title: string;
  description?: string;
  isTemplate?: boolean;
  metadata?: Record<string, unknown>;
}

export interface UpdateChecklistInput {
  title?: string;
  description?: string | null;
  isTemplate?: boolean;
  sortOrder?: number;
  metadata?: Record<string, unknown>;
}

export interface AddChecklistItemInput {
  content: string;
  sortOrder?: number;
}

export interface UpdateChecklistItemInput {
  content?: string;
  isCompleted?: boolean;
  sortOrder?: number;
}

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ChecklistWithItems extends Checklist {
  items: ChecklistItem[];
}

// ─── URL Builder ────────────────────────────────────────────────────────────

function buildChecklistsUrl(filters?: ChecklistFilters): string {
  const params = new URLSearchParams();
  if (filters?.isTemplate !== undefined)
    params.set("isTemplate", String(filters.isTemplate));
  if (filters?.search) params.set("search", filters.search);

  const qs = params.toString();
  return `/api/checklists${qs ? `?${qs}` : ""}`;
}

/** Invalidate all checklist-related SWR cache entries. */
function invalidateChecklists(): Promise<unknown> {
  return mutate(
    (key) => typeof key === "string" && key.startsWith("/api/checklists")
  );
}

// ─── Hooks ──────────────────────────────────────────────────────────────────

export function useChecklists(filters?: ChecklistFilters) {
  const url = buildChecklistsUrl(filters);
  const { data, error, isLoading, isValidating } = useSWR<Checklist[]>(
    url,
    fetcher
  );

  return {
    checklists: data,
    isLoading,
    isValidating,
    error,

    async createChecklist(input: CreateChecklistInput): Promise<Checklist> {
      const created = await apiPost<Checklist>("/api/checklists", input);
      await invalidateChecklists();
      return created;
    },

    async updateChecklist(
      id: string,
      input: UpdateChecklistInput
    ): Promise<Checklist> {
      const updated = await apiPut<Checklist>(`/api/checklists/${id}`, input);
      await invalidateChecklists();
      return updated;
    },

    async deleteChecklist(id: string): Promise<void> {
      await apiDelete(`/api/checklists/${id}`);
      await invalidateChecklists();
    },
  };
}

export function useChecklist(id: string | undefined) {
  const { data, error, isLoading, isValidating } = useSWR<ChecklistWithItems>(
    id ? `/api/checklists/${id}` : null,
    fetcher
  );

  return {
    checklist: data,
    isLoading,
    isValidating,
    error,

    async updateChecklist(input: UpdateChecklistInput): Promise<Checklist> {
      if (!id) throw new Error("Checklist ID is required");
      const updated = await apiPut<Checklist>(`/api/checklists/${id}`, input);
      await invalidateChecklists();
      return updated;
    },

    async deleteChecklist(): Promise<void> {
      if (!id) throw new Error("Checklist ID is required");
      await apiDelete(`/api/checklists/${id}`);
      await invalidateChecklists();
    },

    async addItem(input: AddChecklistItemInput): Promise<ChecklistItem> {
      if (!id) throw new Error("Checklist ID is required");
      const item = await apiPost<ChecklistItem>(
        `/api/checklists/${id}/items`,
        input
      );
      await invalidateChecklists();
      return item;
    },

    async updateItem(
      itemId: string,
      input: UpdateChecklistItemInput
    ): Promise<ChecklistItem> {
      if (!id) throw new Error("Checklist ID is required");
      const updated = await apiPut<ChecklistItem>(
        `/api/checklists/${id}/items/${itemId}`,
        input
      );
      await invalidateChecklists();
      return updated;
    },

    async deleteItem(itemId: string): Promise<void> {
      if (!id) throw new Error("Checklist ID is required");
      await apiDelete(`/api/checklists/${id}/items/${itemId}`);
      await invalidateChecklists();
    },

    async toggleItem(itemId: string): Promise<ChecklistItem> {
      if (!id) throw new Error("Checklist ID is required");
      const toggled = await apiPatch<ChecklistItem>(
        `/api/checklists/${id}/items/${itemId}/toggle`,
        {}
      );
      await invalidateChecklists();
      return toggled;
    },
  };
}
