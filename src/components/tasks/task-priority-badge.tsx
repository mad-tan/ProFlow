"use client";

import React from "react";
import {
  AlertTriangle,
  ArrowUp,
  ArrowRight,
  ArrowDown,
  Minus,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { TaskPriority } from "@/lib/types";

interface TaskPriorityBadgeProps {
  priority: TaskPriority;
  size?: "sm" | "md";
  showLabel?: boolean;
  className?: string;
}

const priorityConfig: Record<
  TaskPriority,
  { label: string; icon: React.ElementType; className: string; dotClass: string }
> = {
  urgent: {
    label: "Urgent",
    icon: AlertTriangle,
    className:
      "bg-red-100 text-red-700 border-red-200 hover:bg-red-100 dark:bg-red-950 dark:text-red-400 dark:border-red-900",
    dotClass: "bg-red-500",
  },
  high: {
    label: "High",
    icon: ArrowUp,
    className:
      "bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-100 dark:bg-orange-950 dark:text-orange-400 dark:border-orange-900",
    dotClass: "bg-orange-500",
  },
  medium: {
    label: "Medium",
    icon: ArrowRight,
    className:
      "bg-yellow-100 text-yellow-700 border-yellow-200 hover:bg-yellow-100 dark:bg-yellow-950 dark:text-yellow-400 dark:border-yellow-900",
    dotClass: "bg-yellow-500",
  },
  low: {
    label: "Low",
    icon: ArrowDown,
    className:
      "bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-900",
    dotClass: "bg-blue-500",
  },
  none: {
    label: "None",
    icon: Minus,
    className:
      "bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700",
    dotClass: "bg-gray-400",
  },
};

export function TaskPriorityBadge({
  priority,
  size = "sm",
  showLabel = true,
  className,
}: TaskPriorityBadgeProps) {
  const config = priorityConfig[priority];
  const Icon = config.icon;

  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1 font-medium",
        size === "sm" ? "text-[11px] px-1.5 py-0" : "text-xs px-2 py-0.5",
        config.className,
        className
      )}
    >
      <Icon className={cn(size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5")} />
      {showLabel && config.label}
    </Badge>
  );
}

export function PriorityDot({
  priority,
  className,
}: {
  priority: TaskPriority;
  className?: string;
}) {
  const config = priorityConfig[priority];
  return (
    <span
      className={cn("inline-block h-2 w-2 rounded-full", config.dotClass, className)}
      title={config.label}
    />
  );
}

export { priorityConfig };
