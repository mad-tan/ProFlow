"use client";

import React, { useMemo, useState } from "react";
import { ArrowUpDown, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { TaskCard } from "./task-card";
import type { Task, TaskStatus, Project } from "@/lib/types";

interface TaskListProps {
  tasks: Task[];
  projects?: Project[];
  onEdit?: (task: Task) => void;
  onDelete?: (task: Task) => void;
  onStatusChange?: (taskId: string, status: TaskStatus) => void;
  groupBy?: "none" | "status" | "priority" | "project";
  className?: string;
}

type SortField = "priority" | "dueDate" | "title" | "createdAt";
type SortDirection = "asc" | "desc";

const priorityOrder: Record<string, number> = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3,
  none: 4,
};

const statusOrder: Record<string, number> = {
  in_progress: 0,
  todo: 1,
  backlog: 2,
  in_review: 3,
  done: 4,
  cancelled: 5,
};

const statusLabels: Record<string, string> = {
  backlog: "Backlog",
  todo: "To Do",
  in_progress: "In Progress",
  in_review: "In Review",
  done: "Done",
  cancelled: "Cancelled",
};

const priorityLabels: Record<string, string> = {
  urgent: "Urgent",
  high: "High",
  medium: "Medium",
  low: "Low",
  none: "No Priority",
};

const sortLabels: Record<SortField, string> = {
  priority: "Priority",
  dueDate: "Due Date",
  title: "Title",
  createdAt: "Date Created",
};

function sortTasks(
  tasks: Task[],
  field: SortField,
  direction: SortDirection
): Task[] {
  const sorted = [...tasks].sort((a, b) => {
    let cmp = 0;
    switch (field) {
      case "priority":
        cmp = priorityOrder[a.priority] - priorityOrder[b.priority];
        break;
      case "dueDate": {
        const aDate = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
        const bDate = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
        cmp = aDate - bDate;
        break;
      }
      case "title":
        cmp = a.title.localeCompare(b.title);
        break;
      case "createdAt":
        cmp =
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        break;
    }
    return direction === "asc" ? cmp : -cmp;
  });
  return sorted;
}

function getProjectMap(projects?: Project[]): Map<string, Project> {
  const map = new Map<string, Project>();
  projects?.forEach((p) => map.set(p.id, p));
  return map;
}

export function TaskList({
  tasks,
  projects,
  onEdit,
  onDelete,
  onStatusChange,
  groupBy = "none",
  className,
}: TaskListProps) {
  const [sortField, setSortField] = useState<SortField>("priority");
  const [sortDir, setSortDir] = useState<SortDirection>("asc");

  const projectMap = useMemo(() => getProjectMap(projects), [projects]);

  const sortedTasks = useMemo(
    () => sortTasks(tasks, sortField, sortDir),
    [tasks, sortField, sortDir]
  );

  const groups = useMemo(() => {
    if (groupBy === "none") return [{ key: "all", label: "", tasks: sortedTasks }];

    const map = new Map<string, { label: string; tasks: Task[] }>();

    sortedTasks.forEach((task) => {
      let key: string;
      let label: string;

      switch (groupBy) {
        case "status":
          key = task.status;
          label = statusLabels[task.status] ?? task.status;
          break;
        case "priority":
          key = task.priority;
          label = priorityLabels[task.priority] ?? task.priority;
          break;
        case "project":
          key = task.projectId ?? "no-project";
          label = task.projectId
            ? projectMap.get(task.projectId)?.name ?? "Unknown Project"
            : "No Project";
          break;
        default:
          key = "all";
          label = "";
      }

      if (!map.has(key)) map.set(key, { label, tasks: [] });
      map.get(key)!.tasks.push(task);
    });

    const groups = Array.from(map.entries()).map(([key, val]) => ({
      key,
      label: val.label,
      tasks: val.tasks,
    }));

    if (groupBy === "status") {
      groups.sort(
        (a, b) =>
          (statusOrder[a.key] ?? 99) - (statusOrder[b.key] ?? 99)
      );
    } else if (groupBy === "priority") {
      groups.sort(
        (a, b) =>
          (priorityOrder[a.key] ?? 99) - (priorityOrder[b.key] ?? 99)
      );
    }

    return groups;
  }, [sortedTasks, groupBy, projectMap]);

  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Sort controls */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          {tasks.length} task{tasks.length !== 1 ? "s" : ""}
        </span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs">
              <ArrowUpDown className="h-3.5 w-3.5" />
              Sort: {sortLabels[sortField]}
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            {(Object.keys(sortLabels) as SortField[]).map((field) => (
              <DropdownMenuItem
                key={field}
                onClick={() => handleSort(field)}
                className={cn(
                  "cursor-pointer",
                  field === sortField && "bg-accent"
                )}
              >
                {sortLabels[field]}
                {field === sortField && (
                  <span className="ml-auto text-[10px] text-muted-foreground">
                    {sortDir === "asc" ? "ASC" : "DESC"}
                  </span>
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Task groups */}
      {groups.map((group) => (
        <div key={group.key} className="space-y-2">
          {group.label && (
            <div className="flex items-center gap-2 py-1">
              <h3 className="text-sm font-semibold text-muted-foreground">
                {group.label}
              </h3>
              <span className="text-xs text-muted-foreground">
                ({group.tasks.length})
              </span>
              <div className="flex-1 h-px bg-border" />
            </div>
          )}
          <div className="space-y-2">
            {group.tasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                project={
                  task.projectId ? projectMap.get(task.projectId) : null
                }
                onEdit={onEdit}
                onDelete={onDelete}
                onStatusChange={onStatusChange}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
