import useSWR from "swr";
import { fetcher } from "./use-fetch";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface DashboardSummary {
  totalProjects: number;
  activeTasks: number;
  completedToday: number;
  totalTimeToday: number;
  currentStreak: number;
  moodAverage: number;
}

// ─── Hook ───────────────────────────────────────────────────────────────────

export function useSummary() {
  const { data, error, isLoading, isValidating } = useSWR<DashboardSummary>(
    "/api/dashboard/summary",
    fetcher,
    { refreshInterval: 60_000 }
  );

  return {
    summary: data,
    isLoading,
    isValidating,
    error,
  };
}
