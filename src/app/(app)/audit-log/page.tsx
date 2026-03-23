"use client";

import { useState } from "react";
import { FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuditLog } from "@/lib/hooks/use-audit-log";
import type { AuditAction } from "@/lib/types";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

const actionColors: Record<AuditAction, string> = {
  create: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  update: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  delete: "bg-red-500/10 text-red-700 dark:text-red-400",
  complete: "bg-purple-500/10 text-purple-700 dark:text-purple-400",
  archive: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  restore: "bg-teal-500/10 text-teal-700 dark:text-teal-400",
};

const ENTITY_TYPES = [
  { value: "all", label: "All Entities" },
  { value: "project", label: "Project" },
  { value: "task", label: "Task" },
  { value: "time_entry", label: "Time Entry" },
  { value: "checklist", label: "Checklist" },
  { value: "reminder", label: "Reminder" },
  { value: "check_in", label: "Check-in" },
  { value: "journal", label: "Journal" },
];

const ACTION_TYPES: { value: AuditAction | "all"; label: string }[] = [
  { value: "all", label: "All Actions" },
  { value: "create", label: "Create" },
  { value: "update", label: "Update" },
  { value: "delete", label: "Delete" },
  { value: "complete", label: "Complete" },
  { value: "archive", label: "Archive" },
  { value: "restore", label: "Restore" },
];

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function summarizeChanges(changes: Record<string, unknown>): string {
  const keys = Object.keys(changes);
  if (keys.length === 0) return "-";
  if (keys.length <= 3) return keys.join(", ");
  return `${keys.slice(0, 3).join(", ")} +${keys.length - 3} more`;
}

export default function AuditLogPage() {
  const [entityType, setEntityType] = useState<string>("all");
  const [action, setAction] = useState<AuditAction | "all">("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [page, setPage] = useState(1);

  const filters: Record<string, unknown> = { page, pageSize: 25 };
  if (entityType !== "all") filters.entityType = entityType;
  if (action !== "all") filters.action = action;
  if (startDate) filters.startDate = startDate;
  if (endDate) filters.endDate = endDate;

  const { entries, pagination, isLoading } = useAuditLog(filters as any);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit Log"
        description="Track all changes across your workspace"
      />

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-wrap">
        <Select
          value={entityType}
          onValueChange={(v) => {
            setEntityType(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ENTITY_TYPES.map((et) => (
              <SelectItem key={et.value} value={et.value}>
                {et.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={action}
          onValueChange={(v) => {
            setAction(v as AuditAction | "all");
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ACTION_TYPES.map((at) => (
              <SelectItem key={at.value} value={at.value}>
                {at.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value);
              setPage(1);
            }}
            className="w-[150px]"
            placeholder="Start date"
          />
          <span className="text-muted-foreground text-sm">to</span>
          <Input
            type="date"
            value={endDate}
            onChange={(e) => {
              setEndDate(e.target.value);
              setPage(1);
            }}
            className="w-[150px]"
            placeholder="End date"
          />
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="h-12" />
          ))}
        </div>
      ) : !entries || entries.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No log entries"
          description="Activity will appear here as you use the platform."
        />
      ) : (
        <>
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[140px]">Time</TableHead>
                      <TableHead className="w-[100px]">Action</TableHead>
                      <TableHead className="w-[120px]">Entity</TableHead>
                      <TableHead>Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {entries.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatTime(entry.createdAt)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className={cn(
                              "text-xs capitalize",
                              actionColors[entry.action]
                            )}
                          >
                            {entry.action}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm capitalize">
                          {entry.entityType.replace("_", " ")}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[300px] truncate">
                          {summarizeChanges(entry.changes)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Page {pagination.page} of {pagination.totalPages} ({pagination.totalItems} entries)
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!pagination.hasPreviousPage}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!pagination.hasNextPage}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
