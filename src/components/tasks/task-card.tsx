"use client";

import React, { useState } from "react";
import {
  Calendar,
  Clock,
  MoreHorizontal,
  Pencil,
  Trash2,
  FolderOpen,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { TaskPriorityBadge } from "./task-priority-badge";
import { TaskStatusSelect } from "./task-status-select";
import type { Task, TaskStatus, Project } from "@/lib/types";

interface TaskCardProps {
  task: Task;
  project?: Project | null;
  onEdit?: (task: Task) => void;
  onDelete?: (task: Task) => void;
  onStatusChange?: (taskId: string, status: TaskStatus) => void;
  className?: string;
}

const priorityBorderColors: Record<string, string> = {
  urgent: "border-l-red-500",
  high: "border-l-orange-500",
  medium: "border-l-yellow-500",
  low: "border-l-blue-500",
  none: "border-l-gray-300 dark:border-l-gray-600",
};

function formatDueDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (target.getTime() === today.getTime()) return "Today";
  if (target.getTime() === tomorrow.getTime()) return "Tomorrow";

  const diffDays = Math.ceil(
    (target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );
  if (diffDays === -1) return "Yesterday";
  if (diffDays < -1) return `${Math.abs(diffDays)}d overdue`;
  if (diffDays <= 7) return `In ${diffDays}d`;

  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function isOverdue(dateStr: string): boolean {
  const date = new Date(dateStr);
  const now = new Date();
  return date < new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export function TaskCard({
  task,
  project,
  onEdit,
  onDelete,
  onStatusChange,
  className,
}: TaskCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const isDone = task.status === "done" || task.status === "cancelled";
  const overdue = task.dueDate && !isDone && isOverdue(task.dueDate);

  const handleCheckboxClick = () => {
    if (!onStatusChange) return;
    onStatusChange(task.id, isDone ? "todo" : "done");
  };

  return (
    <Card
      className={cn(
        "group relative border-l-[3px] transition-all duration-150",
        "hover:shadow-md hover:border-l-[3px]",
        priorityBorderColors[task.priority],
        isDone && "opacity-60",
        className
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex items-start gap-3 p-3">
        {/* Checkbox */}
        <button
          onClick={handleCheckboxClick}
          className={cn(
            "mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border-2 transition-colors",
            isDone
              ? "border-emerald-500 bg-emerald-500 text-white"
              : "border-gray-300 hover:border-gray-400 dark:border-gray-600 dark:hover:border-gray-500"
          )}
        >
          {isDone && (
            <svg
              className="h-3 w-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={3}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
              />
            </svg>
          )}
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3
              className={cn(
                "text-sm font-medium leading-snug",
                isDone && "line-through text-muted-foreground"
              )}
            >
              {task.title}
            </h3>

            {/* Actions - visible on hover */}
            <div
              className={cn(
                "flex items-center gap-0.5 shrink-0 transition-opacity duration-150",
                isHovered ? "opacity-100" : "opacity-0"
              )}
            >
              {onEdit && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => onEdit(task)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Edit task</TooltipContent>
                </Tooltip>
              )}
              {onDelete && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                    >
                      <MoreHorizontal className="h-3.5 w-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-40">
                    {onEdit && (
                      <DropdownMenuItem onClick={() => onEdit(task)}>
                        <Pencil className="h-3.5 w-3.5 mr-2" />
                        Edit
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => onDelete(task)}
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>

          {/* Meta row */}
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            {task.priority !== "none" && (
              <TaskPriorityBadge priority={task.priority} size="sm" />
            )}

            {onStatusChange && (
              <TaskStatusSelect
                status={task.status}
                onStatusChange={(status) =>
                  onStatusChange(task.id, status)
                }
                size="sm"
              />
            )}

            {task.dueDate && (
              <span
                className={cn(
                  "inline-flex items-center gap-1 text-[11px]",
                  overdue
                    ? "text-red-600 dark:text-red-400 font-medium"
                    : "text-muted-foreground"
                )}
              >
                <Calendar className="h-3 w-3" />
                {formatDueDate(task.dueDate)}
              </span>
            )}

            {task.estimatedMinutes && (
              <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                <Clock className="h-3 w-3" />
                {formatMinutes(task.estimatedMinutes)}
              </span>
            )}

            {project && (
              <Badge
                variant="secondary"
                className="text-[11px] px-1.5 py-0 gap-1 font-normal"
              >
                <FolderOpen className="h-3 w-3" />
                {project.name}
              </Badge>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
