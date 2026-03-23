"use client";

import React from "react";
import {
  Circle,
  ArrowRightCircle,
  Eye,
  CheckCircle2,
  XCircle,
  Clock,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { TaskStatus } from "@/lib/types";

interface TaskStatusSelectProps {
  status: TaskStatus;
  onStatusChange: (status: TaskStatus) => void;
  disabled?: boolean;
  size?: "sm" | "md";
  className?: string;
}

export const statusConfig: Record<
  TaskStatus,
  { label: string; icon: React.ElementType; dotColor: string; bgColor: string; textColor: string }
> = {
  backlog: {
    label: "Backlog",
    icon: Clock,
    dotColor: "bg-slate-400",
    bgColor: "bg-slate-100 dark:bg-slate-800",
    textColor: "text-slate-700 dark:text-slate-300",
  },
  todo: {
    label: "To Do",
    icon: Circle,
    dotColor: "bg-gray-400",
    bgColor: "bg-gray-100 dark:bg-gray-800",
    textColor: "text-gray-700 dark:text-gray-300",
  },
  in_progress: {
    label: "In Progress",
    icon: ArrowRightCircle,
    dotColor: "bg-blue-500",
    bgColor: "bg-blue-100 dark:bg-blue-900",
    textColor: "text-blue-700 dark:text-blue-300",
  },
  in_review: {
    label: "In Review",
    icon: Eye,
    dotColor: "bg-purple-500",
    bgColor: "bg-purple-100 dark:bg-purple-900",
    textColor: "text-purple-700 dark:text-purple-300",
  },
  done: {
    label: "Done",
    icon: CheckCircle2,
    dotColor: "bg-emerald-500",
    bgColor: "bg-emerald-100 dark:bg-emerald-900",
    textColor: "text-emerald-700 dark:text-emerald-300",
  },
  cancelled: {
    label: "Cancelled",
    icon: XCircle,
    dotColor: "bg-red-400",
    bgColor: "bg-red-100 dark:bg-red-900",
    textColor: "text-red-700 dark:text-red-300",
  },
};

const statusOrder: TaskStatus[] = [
  "backlog",
  "todo",
  "in_progress",
  "in_review",
  "done",
  "cancelled",
];

export function TaskStatusSelect({
  status,
  onStatusChange,
  disabled = false,
  size = "sm",
  className,
}: TaskStatusSelectProps) {
  const current = statusConfig[status];
  const Icon = current.icon;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild disabled={disabled}>
        <Button
          variant="ghost"
          size={size}
          className={cn(
            "gap-1.5 font-medium",
            current.bgColor,
            current.textColor,
            "hover:opacity-80",
            size === "sm" ? "h-7 px-2 text-xs" : "h-8 px-3 text-sm",
            className
          )}
        >
          <span
            className={cn("h-2 w-2 rounded-full shrink-0", current.dotColor)}
          />
          {current.label}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-44">
        {statusOrder.map((s) => {
          const cfg = statusConfig[s];
          const StatusIcon = cfg.icon;
          return (
            <DropdownMenuItem
              key={s}
              onClick={() => onStatusChange(s)}
              className={cn(
                "gap-2 cursor-pointer",
                s === status && "bg-accent"
              )}
            >
              <span
                className={cn("h-2 w-2 rounded-full shrink-0", cfg.dotColor)}
              />
              <span className="flex-1">{cfg.label}</span>
              {s === status && (
                <CheckCircle2 className="h-3.5 w-3.5 text-muted-foreground" />
              )}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export { statusOrder };
