import useSWR, { mutate } from "swr";
import type {
  MentalHealthCheckIn,
  JournalEntry,
  MoodRating,
  EnergyLevel,
  StressLevel,
} from "@/lib/types";
import { fetcher, apiPost, apiPut, apiDelete } from "./use-fetch";

// ─── Filter / Input Types ───────────────────────────────────────────────────

export interface CheckInDateRange {
  startDate?: string;
  endDate?: string;
}

export interface CreateCheckInInput {
  date?: string;
  moodRating: MoodRating;
  energyLevel: EnergyLevel;
  stressLevel: StressLevel;
  sleepHours?: number;
  notes?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface UpdateCheckInInput {
  moodRating?: MoodRating;
  energyLevel?: EnergyLevel;
  stressLevel?: StressLevel;
  sleepHours?: number | null;
  notes?: string | null;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface CreateJournalEntryInput {
  title?: string;
  content: string;
  tags?: string[];
  mood?: MoodRating;
  metadata?: Record<string, unknown>;
}

export interface UpdateJournalEntryInput {
  title?: string | null;
  content?: string;
  tags?: string[];
  mood?: MoodRating | null;
  metadata?: Record<string, unknown>;
}

// ─── URL Builder ────────────────────────────────────────────────────────────

function buildCheckInsUrl(dateRange?: CheckInDateRange): string {
  const params = new URLSearchParams();
  if (dateRange?.startDate) params.set("startDate", dateRange.startDate);
  if (dateRange?.endDate) params.set("endDate", dateRange.endDate);

  const qs = params.toString();
  return `/api/mental-health/check-ins${qs ? `?${qs}` : ""}`;
}

/** Invalidate mental-health cache entries. */
function invalidateCheckIns(): Promise<unknown> {
  return mutate(
    (key) =>
      typeof key === "string" &&
      key.startsWith("/api/mental-health/check-ins")
  );
}

function invalidateJournals(): Promise<unknown> {
  return mutate(
    (key) =>
      typeof key === "string" &&
      key.startsWith("/api/mental-health/journal")
  );
}

// ─── Hooks ──────────────────────────────────────────────────────────────────

export function useCheckIns(dateRange?: CheckInDateRange) {
  const url = buildCheckInsUrl(dateRange);
  const { data, error, isLoading, isValidating } = useSWR<
    MentalHealthCheckIn[]
  >(url, fetcher);

  return {
    checkIns: data,
    isLoading,
    isValidating,
    error,

    async createCheckIn(
      input: CreateCheckInInput
    ): Promise<MentalHealthCheckIn> {
      const created = await apiPost<MentalHealthCheckIn>(
        "/api/mental-health/check-ins",
        input
      );
      await invalidateCheckIns();
      return created;
    },

    async updateCheckIn(
      id: string,
      input: UpdateCheckInInput
    ): Promise<MentalHealthCheckIn> {
      const updated = await apiPut<MentalHealthCheckIn>(
        `/api/mental-health/check-ins/${id}`,
        input
      );
      await invalidateCheckIns();
      return updated;
    },
  };
}

export function useJournalEntries() {
  const { data, error, isLoading, isValidating } = useSWR<JournalEntry[]>(
    "/api/mental-health/journal",
    fetcher
  );

  return {
    journalEntries: data,
    isLoading,
    isValidating,
    error,

    async createJournalEntry(
      input: CreateJournalEntryInput
    ): Promise<JournalEntry> {
      const created = await apiPost<JournalEntry>(
        "/api/mental-health/journal",
        input
      );
      await invalidateJournals();
      return created;
    },

    async updateJournalEntry(
      id: string,
      input: UpdateJournalEntryInput
    ): Promise<JournalEntry> {
      const updated = await apiPut<JournalEntry>(
        `/api/mental-health/journal/${id}`,
        input
      );
      await invalidateJournals();
      return updated;
    },

    async deleteJournalEntry(id: string): Promise<void> {
      await apiDelete(`/api/mental-health/journal/${id}`);
      await invalidateJournals();
    },
  };
}

export function useJournalEntry(id: string | undefined) {
  const { data, error, isLoading, isValidating } = useSWR<JournalEntry>(
    id ? `/api/mental-health/journal/${id}` : null,
    fetcher
  );

  return {
    journalEntry: data,
    isLoading,
    isValidating,
    error,

    async updateJournalEntry(
      input: UpdateJournalEntryInput
    ): Promise<JournalEntry> {
      if (!id) throw new Error("Journal entry ID is required");
      const updated = await apiPut<JournalEntry>(
        `/api/mental-health/journal/${id}`,
        input
      );
      await invalidateJournals();
      return updated;
    },

    async deleteJournalEntry(): Promise<void> {
      if (!id) throw new Error("Journal entry ID is required");
      await apiDelete(`/api/mental-health/journal/${id}`);
      await invalidateJournals();
    },
  };
}
