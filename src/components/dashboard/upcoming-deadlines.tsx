"use client";

import { useMemo } from "react";
import Link from "next/link";
import { CalendarClock, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useTasks } from "@/lib/hooks/use-tasks";
import { isOverdue, formatDate } from "@/lib/utils/dates";
import {
  format,
  parseISO,
  isToday,
  isTomorrow,
  addDays,
  isBefore,
  endOfDay,
} from "date-fns";
import type { Task } from "@/lib/types";

function getDayLabel(dateStr: string): string {
  const date = parseISO(dateStr);
  if (isToday(date)) return "Today";
  if (isTomorrow(date)) return "Tomorrow";
  return format(date, "EEEE, MMM d");
}

interface GroupedTasks {
  label: string;
  date: string;
  overdue: boolean;
  tasks: Task[];
}

export function UpcomingDeadlines() {
  const { tasks, isLoading } = useTasks();

  const grouped = useMemo(() => {
    if (!tasks) return [];

    const now = new Date();
    const sevenDaysOut = addDays(now, 7);

    const upcoming = tasks
      .filter((t) => {
        if (!t.dueDate || t.status === "done" || t.status === "cancelled") return false;
        const due = parseISO(t.dueDate);
        return isBefore(due, endOfDay(sevenDaysOut)) || isOverdue(t.dueDate);
      })
      .sort((a, b) => {
        const dateA = new Date(a.dueDate!).getTime();
        const dateB = new Date(b.dueDate!).getTime();
        return dateA - dateB;
      });

    const groups: Record<string, GroupedTasks> = {};
    for (const task of upcoming) {
      const dateKey = task.dueDate!.split("T")[0];
      if (!groups[dateKey]) {
        groups[dateKey] = {
          label: getDayLabel(task.dueDate!),
          date: dateKey,
          overdue: isOverdue(task.dueDate!),
          tasks: [],
        };
      }
      groups[dateKey].tasks.push(task);
    }

    return Object.values(groups);
  }, [tasks]);

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <CalendarClock className="h-5 w-5 text-muted-foreground" />
          <CardTitle className="text-base font-semibold">Upcoming Deadlines</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="flex-1 pt-0">
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-full rounded-lg" />
              </div>
            ))}
          </div>
        ) : !grouped.length ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No upcoming deadlines this week.
          </p>
        ) : (
          <div className="space-y-4">
            {grouped.map((group) => (
              <div key={group.date}>
                <div className="mb-1.5 flex items-center gap-1.5">
                  {group.overdue && (
                    <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
                  )}
                  <h4
                    className={cn(
                      "text-xs font-semibold uppercase tracking-wider",
                      group.overdue
                        ? "text-red-500"
                        : "text-muted-foreground"
                    )}
                  >
                    {group.overdue ? "Overdue" : group.label}
                  </h4>
                </div>
                <div className="space-y-1">
                  {group.tasks.map((task) => (
                    <Link
                      key={task.id}
                      href={`/tasks/${task.id}`}
                      className={cn(
                        "flex items-center justify-between rounded-lg p-2.5 text-sm transition-colors hover:bg-muted/50",
                        group.overdue &&
                          "bg-red-50 hover:bg-red-100/70 dark:bg-red-950/20 dark:hover:bg-red-950/30"
                      )}
                    >
                      <span className="truncate font-medium">{task.title}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {formatDate(task.dueDate!)}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
