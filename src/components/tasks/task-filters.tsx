"use client";

import React from "react";
import { Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SearchInput } from "@/components/shared/search-input";
import { cn } from "@/lib/utils";
import { statusConfig } from "./task-status-select";
import { priorityConfig } from "./task-priority-badge";
import type { TaskStatus, TaskPriority, Project } from "@/lib/types";

interface TaskFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  status?: TaskStatus;
  onStatusChange: (status: TaskStatus | undefined) => void;
  priority?: TaskPriority;
  onPriorityChange: (priority: TaskPriority | undefined) => void;
  projectId?: string;
  onProjectChange: (projectId: string | undefined) => void;
  projects?: Project[];
  className?: string;
}

const statusTabs: { value: string; label: string }[] = [
  { value: "all", label: "All" },
  { value: "todo", label: "To Do" },
  { value: "in_progress", label: "In Progress" },
  { value: "in_review", label: "In Review" },
  { value: "done", label: "Done" },
];

const priorityOptions: { value: string; label: string }[] = [
  { value: "all", label: "All Priorities" },
  { value: "urgent", label: "Urgent" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
  { value: "none", label: "None" },
];

export function TaskFilters({
  search,
  onSearchChange,
  status,
  onStatusChange,
  priority,
  onPriorityChange,
  projectId,
  onProjectChange,
  projects,
  className,
}: TaskFiltersProps) {
  const hasActiveFilters = status || priority || projectId || search;

  const clearFilters = () => {
    onSearchChange("");
    onStatusChange(undefined);
    onPriorityChange(undefined);
    onProjectChange(undefined);
  };

  return (
    <div className={cn("space-y-3", className)}>
      {/* Top row: search + filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchInput
          value={search}
          onChange={onSearchChange}
          placeholder="Search tasks..."
          className="sm:w-64"
        />

        <div className="flex items-center gap-2 flex-wrap">
          {/* Priority filter */}
          <Select
            value={priority ?? "all"}
            onValueChange={(v) =>
              onPriorityChange(v === "all" ? undefined : (v as TaskPriority))
            }
          >
            <SelectTrigger className="w-[140px] h-8 text-xs">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              {priorityOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  <span className="flex items-center gap-2">
                    {opt.value !== "all" && (
                      <span
                        className={cn(
                          "h-2 w-2 rounded-full shrink-0",
                          priorityConfig[opt.value as TaskPriority]?.dotClass
                        )}
                      />
                    )}
                    {opt.label}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Project filter */}
          {projects && projects.length > 0 && (
            <Select
              value={projectId ?? "all"}
              onValueChange={(v) =>
                onProjectChange(v === "all" ? undefined : v)
              }
            >
              <SelectTrigger className="w-[160px] h-8 text-xs">
                <SelectValue placeholder="Project" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Projects</SelectItem>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    <span className="flex items-center gap-2">
                      {project.color && (
                        <span
                          className="h-2 w-2 rounded-full shrink-0"
                          style={{ backgroundColor: project.color }}
                        />
                      )}
                      {project.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Clear filters */}
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1 text-xs text-muted-foreground"
              onClick={clearFilters}
            >
              <X className="h-3 w-3" />
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Status tabs */}
      <Tabs
        value={status ?? "all"}
        onValueChange={(v) =>
          onStatusChange(v === "all" ? undefined : (v as TaskStatus))
        }
      >
        <TabsList className="h-8">
          {statusTabs.map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="text-xs px-3 h-7"
            >
              {tab.value !== "all" && (
                <span
                  className={cn(
                    "h-1.5 w-1.5 rounded-full mr-1.5 shrink-0",
                    statusConfig[tab.value as TaskStatus]?.dotColor
                  )}
                />
              )}
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
    </div>
  );
}
