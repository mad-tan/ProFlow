import useSWR from "swr";
import { fetcher } from "./use-fetch";

// ─── Response Types ─────────────────────────────────────────────────────────

export interface DashboardSummary {
  totalProjects: number;
  activeProjects: number;
  totalTasks: number;
  completedTasks: number;
  overdueTasks: number;
  todayTimeMinutes: number;
  weekTimeMinutes: number;
  latestMood: number | null;
  upcomingReminders: number;
}

export interface ProductivityMetrics {
  tasksCompleted: number;
  tasksCreated: number;
  averageCompletionTimeMinutes: number;
  totalTimeTrackedMinutes: number;
  dailyBreakdown: Array<{
    date: string;
    tasksCompleted: number;
    minutesTracked: number;
  }>;
  topProjects: Array<{
    projectId: string;
    projectName: string;
    tasksCompleted: number;
    minutesTracked: number;
  }>;
}

export interface MentalHealthTrends {
  averageMood: number;
  averageEnergy: number;
  averageStress: number;
  averageSleep: number | null;
  dailyBreakdown: Array<{
    date: string;
    moodRating: number;
    energyLevel: number;
    stressLevel: number;
    sleepHours: number | null;
  }>;
  moodDistribution: Record<string, number>;
}

// ─── Date Range ─────────────────────────────────────────────────────────────

export interface AnalyticsDateRange {
  startDate?: string;
  endDate?: string;
}

// ─── URL Builders ───────────────────────────────────────────────────────────

function buildProductivityUrl(dateRange?: AnalyticsDateRange): string {
  const params = new URLSearchParams();
  if (dateRange?.startDate) params.set("startDate", dateRange.startDate);
  if (dateRange?.endDate) params.set("endDate", dateRange.endDate);

  const qs = params.toString();
  return `/api/analytics/productivity${qs ? `?${qs}` : ""}`;
}

function buildMentalHealthTrendsUrl(dateRange?: AnalyticsDateRange): string {
  const params = new URLSearchParams();
  if (dateRange?.startDate) params.set("startDate", dateRange.startDate);
  if (dateRange?.endDate) params.set("endDate", dateRange.endDate);

  const qs = params.toString();
  return `/api/analytics/mental-health${qs ? `?${qs}` : ""}`;
}

// ─── Hooks ──────────────────────────────────────────────────────────────────

export function useSummary() {
  const { data, error, isLoading, isValidating } = useSWR<DashboardSummary>(
    "/api/analytics/summary",
    fetcher
  );

  return {
    summary: data,
    isLoading,
    isValidating,
    error,
  };
}

export function useProductivity(dateRange?: AnalyticsDateRange) {
  const url = buildProductivityUrl(dateRange);
  const { data, error, isLoading, isValidating } =
    useSWR<ProductivityMetrics>(url, fetcher);

  return {
    productivity: data,
    isLoading,
    isValidating,
    error,
  };
}

export function useMentalHealthTrends(dateRange?: AnalyticsDateRange) {
  const url = buildMentalHealthTrendsUrl(dateRange);
  const { data, error, isLoading, isValidating } =
    useSWR<MentalHealthTrends>(url, fetcher);

  return {
    trends: data,
    isLoading,
    isValidating,
    error,
  };
}
