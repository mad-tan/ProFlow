"use client";

import { useState } from "react";
import { FileText, Clock, Trash2, CheckCircle, Archive, RotateCcw, Plus, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuditLog } from "@/lib/hooks/use-audit-log";
import type { AuditAction, AuditLogEntry } from "@/lib/types";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// ─── Config ──────────────────────────────────────────────────────────────────

const ACTION_STYLES: Record<AuditAction, { color: string; icon: React.ElementType; label: string }> = {
  create:  { color: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800", icon: Plus,        label: "Created" },
  update:  { color: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800",               icon: Pencil,      label: "Updated" },
  delete:  { color: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800",                    icon: Trash2,      label: "Deleted" },
  complete:{ color: "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800",     icon: CheckCircle, label: "Completed" },
  archive: { color: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800",          icon: Archive,     label: "Archived" },
  restore: { color: "bg-teal-500/10 text-teal-700 dark:text-teal-400 border-teal-200 dark:border-teal-800",               icon: RotateCcw,   label: "Restored" },
};

const ENTITY_TYPES = [
  { value: "all", label: "All Entities" },
  { value: "project", label: "Projects" },
  { value: "task", label: "Tasks" },
  { value: "time_entry", label: "Time Entries" },
  { value: "checklist", label: "Checklists" },
  { value: "reminder", label: "Reminders" },
  { value: "check_in", label: "Check-ins" },
  { value: "journal", label: "Journal" },
];

const ACTION_TYPES: { value: AuditAction | "all"; label: string }[] = [
  { value: "all", label: "All Actions" },
  { value: "create", label: "Created" },
  { value: "update", label: "Updated" },
  { value: "delete", label: "Deleted" },
  { value: "complete", label: "Completed" },
  { value: "archive", label: "Archived" },
  { value: "restore", label: "Restored" },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatTime(dateStr: string): { date: string; time: string } {
  const d = new Date(dateStr);
  return {
    date: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    time: d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
  };
}

function getEntityTitle(entry: AuditLogEntry): string {
  const c = entry.changes as Record<string, unknown>;
  // _name is explicitly set by services to carry the entity title
  if (c._name && typeof c._name === "string") return c._name;
  // For create actions, title/name is set directly
  if (c.title && typeof c.title === "string") return c.title;
  if (c.name && typeof c.name === "string") return c.name;
  // For updates where title changed, check the { from, to } on the title key
  const titleChange = c.title as Record<string, unknown> | undefined;
  if (titleChange?.to && typeof titleChange.to === "string") return titleChange.to;
  // Fallback to truncated entity ID
  return entry.entityId.slice(0, 8) + "…";
}

function describeChanges(entry: AuditLogEntry): string {
  const c = entry.changes as Record<string, unknown>;
  const keys = Object.keys(c).filter(k => !["action", "_name"].includes(k));

  if (keys.length === 0) {
    if (entry.action === "delete") return "Permanently removed";
    if (entry.action === "complete") return "Marked as done";
    if (entry.action === "archive") return "Moved to archive";
    return "—";
  }

  // Describe each changed field
  const parts: string[] = [];
  for (const key of keys.slice(0, 3)) {
    const val = c[key];
    if (val && typeof val === "object" && !Array.isArray(val)) {
      const v = val as Record<string, unknown>;
      if (v.from !== undefined && v.to !== undefined) {
        parts.push(`${key}: **${v.from}** → **${v.to}**`);
        continue;
      }
    }
    if (key === "title" && typeof val === "string") {
      parts.push(`"${val}"`);
      continue;
    }
    if (key === "durationMinutes" && typeof val === "number") {
      parts.push(`${val}min tracked`);
      continue;
    }
    if (typeof val === "string" || typeof val === "number") {
      parts.push(`${key}: ${val}`);
    }
  }

  return parts.join(" · ") || "—";
}

function entityTypeLabel(type: string): string {
  const map: Record<string, string> = {
    task: "Task",
    project: "Project",
    time_entry: "Time Entry",
    checklist: "Checklist",
    reminder: "Reminder",
    check_in: "Check-in",
    journal: "Journal",
  };
  return map[type] ?? type;
}

// ─── Entry Row ────────────────────────────────────────────────────────────────

function AuditRow({ entry }: { entry: AuditLogEntry }) {
  const style = ACTION_STYLES[entry.action] ?? ACTION_STYLES.update;
  const Icon = style.icon;
  const { date, time } = formatTime(entry.createdAt);
  const title = getEntityTitle(entry);
  const changes = describeChanges(entry);

  return (
    <div className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50/70 dark:hover:bg-gray-800/40 transition-colors border-b border-gray-100 dark:border-gray-800 last:border-b-0">
      {/* Action icon */}
      <div className={cn("mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border", style.color)}>
        <Icon className="h-3.5 w-3.5" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <Badge variant="secondary" className={cn("text-[11px] px-1.5 py-0 h-5 border font-medium", style.color)}>
            {style.label}
          </Badge>
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
            {entityTypeLabel(entry.entityType)}
          </span>
          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate max-w-[200px]" title={title}>
            {title}
          </span>
        </div>
        {changes !== "—" && (
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400 truncate">{changes}</p>
        )}
      </div>

      {/* Timestamp */}
      <div className="shrink-0 text-right">
        <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400">{time}</p>
        <p className="text-[11px] text-gray-400 dark:text-gray-500">{date}</p>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AuditLogPage() {
  const [entityType, setEntityType] = useState<string>("all");
  const [action, setAction] = useState<AuditAction | "all">("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [page, setPage] = useState(1);

  const filters: Record<string, unknown> = { page, pageSize: 30 };
  if (entityType !== "all") filters.entityType = entityType;
  if (action !== "all") filters.action = action;
  if (startDate) filters.startDate = startDate;
  if (endDate) filters.endDate = endDate;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { entries, pagination, isLoading } = useAuditLog(filters as any);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit Log"
        description="A complete history of all changes in your workspace"
      />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={entityType} onValueChange={(v) => { setEntityType(v); setPage(1); }}>
          <SelectTrigger className="w-[160px] h-9 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ENTITY_TYPES.map((et) => (
              <SelectItem key={et.value} value={et.value}>{et.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={action} onValueChange={(v) => { setAction(v as AuditAction | "all"); setPage(1); }}>
          <SelectTrigger className="w-[150px] h-9 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ACTION_TYPES.map((at) => (
              <SelectItem key={at.value} value={at.value}>{at.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={startDate}
            onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
            className="w-[140px] h-9 text-sm"
          />
          <span className="text-muted-foreground text-xs">to</span>
          <Input
            type="date"
            value={endDate}
            onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
            className="w-[140px] h-9 text-sm"
          />
        </div>

        {(entityType !== "all" || action !== "all" || startDate || endDate) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setEntityType("all"); setAction("all"); setStartDate(""); setEndDate(""); setPage(1); }}
            className="text-xs text-muted-foreground"
          >
            Clear filters
          </Button>
        )}
      </div>

      {/* Log entries */}
      {isLoading ? (
        <Card>
          <CardContent className="p-0">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3 border-b last:border-b-0">
                <Skeleton className="h-7 w-7 rounded-full shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-48" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <Skeleton className="h-3 w-12 shrink-0" />
              </div>
            ))}
          </CardContent>
        </Card>
      ) : !entries || entries.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No activity yet"
          description="Actions you take — creating tasks, completing projects, tracking time — will appear here."
        />
      ) : (
        <>
          <Card>
            <CardContent className="p-0">
              {entries.map((entry) => (
                <AuditRow key={entry.id} entry={entry} />
              ))}
            </CardContent>
          </Card>

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                <span className="font-medium">{pagination.totalItems}</span> total entries · Page {pagination.page} of {pagination.totalPages}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={!pagination.hasPreviousPage} onClick={() => setPage((p) => p - 1)}>
                  Previous
                </Button>
                <Button variant="outline" size="sm" disabled={!pagination.hasNextPage} onClick={() => setPage((p) => p + 1)}>
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-3 pt-2">
        {Object.entries(ACTION_STYLES).map(([key, val]) => {
          const Icon = val.icon;
          return (
            <div key={key} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <div className={cn("flex h-5 w-5 items-center justify-center rounded-full border", val.color)}>
                <Icon className="h-3 w-3" />
              </div>
              {val.label}
            </div>
          );
        })}
      </div>
    </div>
  );
}
