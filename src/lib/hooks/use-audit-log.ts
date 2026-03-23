import useSWR from "swr";
import type { AuditLogEntry, AuditAction } from "@/lib/types";
import { fetcher } from "./use-fetch";

// ─── Filter Types ───────────────────────────────────────────────────────────

export interface AuditLogFilters {
  action?: AuditAction;
  entityType?: string;
  entityId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
}

// ─── Response Type ──────────────────────────────────────────────────────────

export interface PaginatedAuditLog {
  entries: AuditLogEntry[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

// ─── URL Builder ────────────────────────────────────────────────────────────

function buildAuditLogUrl(filters?: AuditLogFilters): string {
  const params = new URLSearchParams();
  if (filters?.action) params.set("action", filters.action);
  if (filters?.entityType) params.set("entityType", filters.entityType);
  if (filters?.entityId) params.set("entityId", filters.entityId);
  if (filters?.startDate) params.set("startDate", filters.startDate);
  if (filters?.endDate) params.set("endDate", filters.endDate);
  if (filters?.page) params.set("page", String(filters.page));
  if (filters?.pageSize) params.set("pageSize", String(filters.pageSize));

  const qs = params.toString();
  return `/api/audit-log${qs ? `?${qs}` : ""}`;
}

// ─── Hook ───────────────────────────────────────────────────────────────────

export function useAuditLog(filters?: AuditLogFilters) {
  const url = buildAuditLogUrl(filters);
  const { data, error, isLoading, isValidating } = useSWR<PaginatedAuditLog>(
    url,
    fetcher
  );

  return {
    entries: data?.entries,
    pagination: data?.pagination,
    isLoading,
    isValidating,
    error,
  };
}
