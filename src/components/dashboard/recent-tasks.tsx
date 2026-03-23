"use client";

import Link from "next/link";
import { ListTodo } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useTasks } from "@/lib/hooks/use-tasks";
import { formatRelative } from "@/lib/utils/dates";
import { TASK_STATUS_LABELS, TASK_PRIORITY_LABELS } from "@/lib/utils/constants";
import type { TaskPriority, TaskStatus } from "@/lib/types";

const statusStyles: Record<TaskStatus, string> = {
  backlog: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  todo: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  in_progress: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  in_review: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  done: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  cancelled: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
};

const priorityDotColors: Record<TaskPriority, string> = {
  urgent: "bg-red-500",
  high: "bg-orange-500",
  medium: "bg-yellow-500",
  low: "bg-blue-500",
  none: "bg-gray-400",
};

export function RecentTasks() {
  const { tasks, isLoading } = useTasks({ pageSize: 5 });

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <ListTodo className="h-5 w-5 text-muted-foreground" />
          <CardTitle className="text-base font-semibold">Recent Tasks</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="flex-1 pt-0">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-2.5 w-2.5 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
            ))}
          </div>
        ) : !tasks?.length ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No tasks yet. Create your first task to get started.
          </p>
        ) : (
          <div className="space-y-1">
            {tasks.slice(0, 5).map((task) => (
              <Link
                key={task.id}
                href={`/tasks/${task.id}`}
                className="group flex items-center gap-3 rounded-lg p-2.5 transition-colors hover:bg-muted/50"
              >
                <span
                  className={cn(
                    "h-2.5 w-2.5 shrink-0 rounded-full",
                    priorityDotColors[task.priority]
                  )}
                  title={TASK_PRIORITY_LABELS[task.priority]}
                />
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-medium group-hover:text-foreground">
                    {task.title}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatRelative(task.updatedAt)}
                  </p>
                </div>
                <Badge
                  variant="secondary"
                  className={cn(
                    "shrink-0 text-[10px] font-medium border-0",
                    statusStyles[task.status]
                  )}
                >
                  {TASK_STATUS_LABELS[task.status]}
                </Badge>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
