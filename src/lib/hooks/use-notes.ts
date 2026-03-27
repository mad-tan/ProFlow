import useSWR, { mutate } from "swr";
import type { Note } from "@/lib/types";
import { fetcher, apiPost, apiPatch, apiDelete } from "./use-fetch";

export interface NoteFilters {
  search?: string;
  pinned?: boolean;
}

export interface CreateNoteInput {
  title: string;
  content?: string;
  isPinned?: boolean;
  tags?: string[];
}

export interface UpdateNoteInput {
  title?: string;
  content?: string;
  isPinned?: boolean;
  tags?: string[];
}

function buildNotesUrl(filters?: NoteFilters): string {
  const params = new URLSearchParams();
  if (filters?.search) params.set("search", filters.search);
  if (filters?.pinned !== undefined) params.set("pinned", String(filters.pinned));
  const qs = params.toString();
  return `/api/notes${qs ? `?${qs}` : ""}`;
}

function invalidateNotes(): Promise<unknown> {
  return mutate((key) => typeof key === "string" && key.startsWith("/api/notes"));
}

export function useNotes(filters?: NoteFilters) {
  const url = buildNotesUrl(filters);
  const { data, error, isLoading, isValidating } = useSWR<Note[]>(url, fetcher);

  return {
    notes: data,
    isLoading,
    isValidating,
    error,

    async createNote(input: CreateNoteInput): Promise<Note> {
      const created = await apiPost<Note>("/api/notes", input);
      await invalidateNotes();
      return created;
    },

    async updateNote(id: string, input: UpdateNoteInput): Promise<Note> {
      const updated = await apiPatch<Note>(`/api/notes/${id}`, input);
      await invalidateNotes();
      return updated;
    },

    async deleteNote(id: string): Promise<void> {
      await apiDelete(`/api/notes/${id}`);
      await invalidateNotes();
    },

    async togglePin(id: string, currentPinned: boolean): Promise<Note> {
      const updated = await apiPatch<Note>(`/api/notes/${id}`, { isPinned: !currentPinned });
      await invalidateNotes();
      return updated;
    },
  };
}
