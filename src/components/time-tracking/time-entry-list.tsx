"use client";

import React, { useState } from "react";
import { Clock, Edit2, Trash2, Timer, Keyboard } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useTimeEntries } from "@/lib/hooks/use-time-tracking";
import { apiDelete } from "@/lib/hooks/use-fetch";
import { EmptyState } from "@/components/shared/empty-state";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

interface TimeEntryListProps {
  date?: string;
  onEdit?: (entry: any) => void;
}

export function TimeEntryList({ date, onEdit }: TimeEntryListProps) {
  const { timeEntries: entries, isLoading } = useTimeEntries(date ? { startDate: date, endDate: date } : undefined);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleDelete = async () => {
    if (deleteId) {
      await apiDelete(`/api/time-entries/${deleteId}`);
      setDeleteId(null);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Time Entries</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="h-10 w-10 rounded-lg" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Clock className="h-5 w-5 text-muted-foreground" />
            Time Entries
            {(entries?.length ?? 0) > 0 && (
              <Badge variant="secondary" className="ml-auto">
                {entries!.length}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!entries || entries.length === 0 ? (
            <EmptyState
              icon={Clock}
              title="No entries yet"
              description="Start the timer or add a manual entry to track your time."
            />
          ) : (
            <div className="space-y-2">
              {entries.map((entry: any, index: number) => (
                <div
                  key={entry.id}
                  className={cn(
                    "group flex items-center gap-4 rounded-lg p-3 transition-colors hover:bg-muted/50",
                    index < entries.length - 1 && "border-b border-border/50"
                  )}
                >
                  {/* Source icon */}
                  <div
                    className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                      entry.source === "timer"
                        ? "bg-emerald-500/10 dark:bg-emerald-500/15"
                        : "bg-blue-500/10 dark:bg-blue-500/15"
                    )}
                  >
                    {entry.source === "timer" ? (
                      <Timer className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <Keyboard className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    )}
                  </div>

                  {/* Entry details */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{entry.taskName || "Untitled"}</p>
                    {entry.description && (
                      <p className="text-sm text-muted-foreground truncate">
                        {entry.description}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatTime(entry.startTime)} - {formatTime(entry.endTime)}
                    </p>
                  </div>

                  {/* Duration */}
                  <div className="text-right shrink-0">
                    <p className="font-mono text-sm font-semibold">
                      {formatDuration(entry.duration)}
                    </p>
                    <Badge variant="outline" className="text-xs mt-1">
                      {entry.source === "timer" ? "Timer" : "Manual"}
                    </Badge>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    {onEdit && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => onEdit(entry)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => setDeleteId(entry.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Delete time entry"
        description="Are you sure you want to delete this time entry? This action cannot be undone."
        onConfirm={handleDelete}
        variant="destructive"
      />
    </>
  );
}
