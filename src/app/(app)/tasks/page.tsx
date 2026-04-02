"use client";

import { useState, useCallback, useMemo } from "react";
import { toast } from "sonner";
import { Plus, ListTodo, LayoutGrid, Check, ArrowUpDown, ChevronDown, FolderOpen } from "lucide-react";
import { usePersistedState } from "@/lib/hooks/use-persisted-state";
import { cn } from "@/lib/utils";
import { useTasks } from "@/lib/hooks/use-tasks";
import { useProjects } from "@/lib/hooks/use-projects";
import type { TaskStatus, TaskPriority } from "@/lib/types";
import type { TaskFilters } from "@/lib/hooks/use-tasks";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { DateInput } from "@/components/ui/date-input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const BOARD_COLUMNS: { status: TaskStatus; label: string; color: string }[] = [
  { status: "todo", label: "To Do", color: "border-t-blue-500" },
  { status: "in_progress", label: "In Progress", color: "border-t-amber-500" },
  { status: "in_review", label: "In Review", color: "border-t-purple-500" },
  { status: "done", label: "Done", color: "border-t-emerald-500" },
];

const priorityColors: Record<TaskPriority, string> = {
  urgent: "bg-red-500/10 text-red-700 dark:text-red-400",
  high: "bg-orange-500/10 text-orange-700 dark:text-orange-400",
  medium: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
  low: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  none: "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400",
};

const priorityDots: Record<string, string> = {
  urgent: "bg-red-500",
  high: "bg-orange-500",
  medium: "bg-yellow-500",
  low: "bg-blue-500",
  none: "bg-zinc-400",
};

const statusLabels: Record<string, string> = {
  backlog: "Backlog",
  todo: "To Do",
  in_progress: "In Progress",
  in_review: "In Review",
  done: "Done",
  cancelled: "Cancelled",
};

export default function TasksPage() {
  const [statusFilter, setStatusFilter] = usePersistedState<TaskStatus | "all">("proflow-tasks-status-filter", "all");
  const [priorityFilter, setPriorityFilter] = usePersistedState<TaskPriority | "all">(
    "proflow-tasks-priority-filter", "all"
  );
  const [projectIds, setProjectIds] = usePersistedState<string[]>("proflow-tasks-project-filter", []);
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formStatus, setFormStatus] = useState<TaskStatus>("todo");
  const [formPriority, setFormPriority] = useState<TaskPriority>("medium");
  const [formDueDate, setFormDueDate] = useState("");
  const [formProjectId, setFormProjectId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [viewMode, setViewMode] = usePersistedState<string>("proflow-tasks-view", "list");
  const [sortBy, setSortBy] = usePersistedState<string>("proflow-tasks-sort", "created");

  const filters: TaskFilters = {};
  if (statusFilter !== "all") filters.status = statusFilter as TaskStatus;
  if (priorityFilter !== "all") filters.priority = priorityFilter as TaskPriority;
  if (searchQuery) filters.search = searchQuery;

  const { tasks, isLoading, createTask, updateTask } = useTasks(filters);
  const { projects } = useProjects();

  const priorityOrder: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3, none: 4 };

  const allTasks = useMemo(() => {
    let list = [...(tasks ?? [])];
    if (projectIds.length > 0) {
      const idSet = new Set(projectIds);
      list = list.filter((t) => t.projectId != null && idSet.has(t.projectId));
    }
    switch (sortBy) {
      case "due_date":
        return list.sort((a, b) => {
          if (!a.dueDate && !b.dueDate) return 0;
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return a.dueDate.localeCompare(b.dueDate);
        });
      case "priority":
        return list.sort((a, b) => (priorityOrder[a.priority] ?? 4) - (priorityOrder[b.priority] ?? 4));
      case "title":
        return list.sort((a, b) => a.title.localeCompare(b.title));
      default:
        return list;
    }
  }, [tasks, sortBy, projectIds]);

  async function handleCreate() {
    if (!formTitle.trim()) return;
    setSubmitting(true);
    try {
      await createTask({
        title: formTitle.trim(),
        description: formDescription.trim() || undefined,
        status: formStatus,
        priority: formPriority,
        dueDate: formDueDate || undefined,
        projectId: formProjectId || undefined,
      });
      setDialogOpen(false);
      resetForm();
      toast.success("Task created");
    } catch (err) {
      console.error(err);
      toast.error("Failed to create task");
    } finally {
      setSubmitting(false);
    }
  }

  function resetForm() {
    setFormTitle("");
    setFormDescription("");
    setFormStatus("todo");
    setFormPriority("medium");
    setFormDueDate("");
    setFormProjectId("");
  }

  const handleDragStart = useCallback(
    (e: React.DragEvent, taskId: string) => {
      setDraggedTaskId(taskId);
      e.dataTransfer.effectAllowed = "move";
    },
    []
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent, targetStatus: TaskStatus) => {
      e.preventDefault();
      if (!draggedTaskId) return;
      try {
        await updateTask(draggedTaskId, { status: targetStatus });
      } catch (err) {
        console.error(err);
      }
      setDraggedTaskId(null);
    },
    [draggedTaskId, updateTask]
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tasks"
        description="Organize and track all your tasks"
        actions={
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Task
          </Button>
        }
      />

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Input
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as TaskStatus | "all")}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="backlog">Backlog</SelectItem>
            <SelectItem value="todo">To Do</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="in_review">In Review</SelectItem>
            <SelectItem value="done">Done</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={priorityFilter}
          onValueChange={(v) => setPriorityFilter(v as TaskPriority | "all")}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priorities</SelectItem>
            <SelectItem value="urgent">Urgent</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="none">None</SelectItem>
          </SelectContent>
        </Select>
        {projects && projects.length > 0 && (
          <Popover>
            <PopoverTrigger asChild>
              <button
                className={cn(
                  "flex h-10 items-center gap-1.5 rounded-md border px-3 text-sm transition-colors",
                  "bg-background hover:bg-accent hover:text-accent-foreground",
                  projectIds.length > 0
                    ? "border-indigo-400 text-indigo-600 dark:text-indigo-400"
                    : "border-input text-muted-foreground"
                )}
              >
                <FolderOpen className="h-3.5 w-3.5 shrink-0" />
                {projectIds.length === 0
                  ? "All Projects"
                  : projectIds.length === 1
                  ? projects.find((p) => p.id === projectIds[0])?.name ?? "1 Project"
                  : `${projectIds.length} Projects`}
                <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-50" />
              </button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-56 p-1">
              <button
                onClick={() => setProjectIds([])}
                className={cn(
                  "flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm transition-colors hover:bg-accent",
                  projectIds.length === 0 && "font-medium text-indigo-600 dark:text-indigo-400"
                )}
              >
                <Check className={cn("h-3.5 w-3.5 shrink-0", projectIds.length === 0 ? "opacity-100" : "opacity-0")} />
                All Projects
              </button>
              <div className="my-1 h-px bg-border" />
              {projects.map((project) => {
                const selected = projectIds.includes(project.id);
                return (
                  <button
                    key={project.id}
                    onClick={() =>
                      setProjectIds(
                        selected
                          ? projectIds.filter((id) => id !== project.id)
                          : [...projectIds, project.id]
                      )
                    }
                    className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm transition-colors hover:bg-accent"
                  >
                    <Check className={cn("h-3.5 w-3.5 shrink-0 text-indigo-500", selected ? "opacity-100" : "opacity-0")} />
                    {project.color && (
                      <span
                        className="h-2 w-2 rounded-full shrink-0"
                        style={{ backgroundColor: project.color }}
                      />
                    )}
                    <span className="truncate">{project.name}</span>
                  </button>
                );
              })}
            </PopoverContent>
          </Popover>
        )}
        <Select value={sortBy} onValueChange={(v) => setSortBy(v)}>
          <SelectTrigger className="w-[150px]">
            <div className="flex items-center gap-1.5">
              <ArrowUpDown className="h-3.5 w-3.5 shrink-0" />
              <SelectValue placeholder="Sort" />
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="created">Date Created</SelectItem>
            <SelectItem value="due_date">Due Date</SelectItem>
            <SelectItem value="priority">Priority</SelectItem>
            <SelectItem value="title">Title</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Tabs value={viewMode} onValueChange={setViewMode}>
        <TabsList>
          <TabsTrigger value="list" className="gap-1.5">
            <ListTodo className="h-4 w-4" />
            List
          </TabsTrigger>
          <TabsTrigger value="board" className="gap-1.5">
            <LayoutGrid className="h-4 w-4" />
            Board
          </TabsTrigger>
        </TabsList>

        {/* List View */}
        <TabsContent value="list" className="mt-4">
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : allTasks.length === 0 ? (
            <EmptyState
              icon={ListTodo}
              title="No tasks found"
              description="Create your first task to get started."
              actionLabel="New Task"
              onAction={() => setDialogOpen(true)}
            />
          ) : (
            <div className="space-y-2">
              {allTasks.map((task) => (
                <a
                  key={task.id}
                  href={`/tasks/${task.id}`}
                  className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-accent/50"
                >
                  {/* Quick-done tick */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      updateTask(task.id, {
                        status: task.status === "done" ? "todo" : "done",
                      });
                    }}
                    className={cn(
                      "flex items-center justify-center h-5 w-5 rounded-full border-2 shrink-0 transition-colors",
                      task.status === "done"
                        ? "bg-emerald-500 border-emerald-500 text-white"
                        : "border-muted-foreground/40 hover:border-emerald-500"
                    )}
                    aria-label={task.status === "done" ? "Mark as to-do" : "Mark as done"}
                  >
                    {task.status === "done" && <Check className="h-3 w-3" />}
                  </button>

                  <div
                    className={cn(
                      "h-2 w-2 rounded-full shrink-0",
                      priorityDots[task.priority] ?? "bg-zinc-400"
                    )}
                  />
                  <div className="flex-1 min-w-0">
                    <p
                      className={cn(
                        "text-sm font-medium truncate",
                        task.status === "done" &&
                          "line-through text-muted-foreground"
                      )}
                    >
                      {task.title}
                    </p>
                    {task.dueDate && (
                      <p className="text-xs text-muted-foreground">
                        Due {new Date(task.dueDate + 'T12:00:00').toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <Badge
                    variant="secondary"
                    className={cn(
                      "text-xs shrink-0",
                      priorityColors[task.priority]
                    )}
                  >
                    {task.priority}
                  </Badge>
                  <Badge variant="outline" className="text-xs shrink-0">
                    {statusLabels[task.status] ?? task.status}
                  </Badge>
                </a>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Board View */}
        <TabsContent value="board" className="mt-4">
          {isLoading ? (
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-64" />
              ))}
            </div>
          ) : (
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-4">
              {BOARD_COLUMNS.map((col) => {
                const columnTasks = allTasks.filter(
                  (t) => t.status === col.status
                );
                return (
                  <Card
                    key={col.status}
                    className={cn("border-t-2", col.color)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, col.status)}
                  >
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium flex items-center justify-between">
                        {col.label}
                        <Badge variant="secondary" className="text-xs">
                          {columnTasks.length}
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 min-h-[100px]">
                      {columnTasks.length === 0 ? (
                        <p className="text-xs text-muted-foreground text-center py-4">
                          Drop tasks here
                        </p>
                      ) : (
                        columnTasks.map((task) => (
                          <div
                            key={task.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, task.id)}
                            className={cn(
                              "rounded-md border bg-card p-3 cursor-grab active:cursor-grabbing transition-shadow hover:shadow-sm",
                              draggedTaskId === task.id && "opacity-50"
                            )}
                          >
                            <div className="flex items-start gap-2">
                              {/* Quick-done tick */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  updateTask(task.id, {
                                    status: task.status === "done" ? "todo" : "done",
                                  });
                                }}
                                className={cn(
                                  "flex items-center justify-center h-4 w-4 rounded-full border-2 shrink-0 mt-0.5 transition-colors",
                                  task.status === "done"
                                    ? "bg-emerald-500 border-emerald-500 text-white"
                                    : "border-muted-foreground/40 hover:border-emerald-500"
                                )}
                                aria-label={task.status === "done" ? "Mark as to-do" : "Mark as done"}
                              >
                                {task.status === "done" && <Check className="h-2.5 w-2.5" />}
                              </button>
                              <a
                                href={`/tasks/${task.id}`}
                                className="flex-1 min-w-0"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <p className={cn(
                                  "text-sm font-medium truncate hover:underline",
                                  task.status === "done" && "line-through text-muted-foreground"
                                )}>
                                  {task.title}
                                </p>
                              </a>
                            </div>
                            <div className="flex items-center gap-2 mt-2 flex-wrap">
                              <Badge
                                variant="secondary"
                                className={cn(
                                  "text-[10px]",
                                  priorityColors[task.priority]
                                )}
                              >
                                {task.priority}
                              </Badge>
                              {task.projectId && (() => {
                                const proj = (projects ?? []).find(p => p.id === task.projectId);
                                return proj ? (
                                  <span className="text-[10px] text-muted-foreground border rounded px-1 truncate max-w-[80px]">
                                    {proj.name}
                                  </span>
                                ) : null;
                              })()}
                              {task.dueDate && (
                                <span className="text-[10px] text-muted-foreground">
                                  {new Date(
                                    task.dueDate
                                  ).toLocaleDateString()}
                                </span>
                              )}
                              {/* Touch-friendly status move (visible on mobile only) */}
                              <select
                                className="md:hidden text-[10px] bg-transparent border rounded px-1 py-0.5 text-muted-foreground appearance-none cursor-pointer"
                                value={task.status}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  updateTask(task.id, { status: e.target.value as TaskStatus });
                                }}
                                onClick={(e) => e.stopPropagation()}
                                aria-label="Change status"
                              >
                                <option value="todo">To Do</option>
                                <option value="in_progress">In Progress</option>
                                <option value="in_review">In Review</option>
                                <option value="done">Done</option>
                              </select>
                            </div>
                          </div>
                        ))
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Create New Task</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                placeholder="Task title"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                autoComplete="off"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                placeholder="Describe the task..."
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={formStatus}
                  onValueChange={(v) => setFormStatus(v as TaskStatus)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="backlog">Backlog</SelectItem>
                    <SelectItem value="todo">To Do</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="in_review">In Review</SelectItem>
                    <SelectItem value="done">Done</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select
                  value={formPriority}
                  onValueChange={(v) => setFormPriority(v as TaskPriority)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="urgent">Urgent</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="none">None</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Due Date</Label>
                <DateInput
                  type="date"
                  value={formDueDate}
                  onChange={(e) => setFormDueDate((e.target as HTMLInputElement).value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Project (optional)</Label>
                <Select value={formProjectId || "none"} onValueChange={(v) => setFormProjectId(v === "none" ? "" : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="No project" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No project</SelectItem>
                    {(projects ?? []).map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!formTitle.trim() || submitting}
            >
              {submitting ? "Creating..." : "Create Task"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
