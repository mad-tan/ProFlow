"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  Clock,
  ListTodo,
  Save,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTask } from "@/lib/hooks/use-tasks";
import { useTimeEntries } from "@/lib/hooks/use-time-tracking";
import type { TaskStatus, TaskPriority } from "@/lib/types";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const priorityColors: Record<TaskPriority, string> = {
  urgent: "bg-red-500/10 text-red-700 dark:text-red-400",
  high: "bg-orange-500/10 text-orange-700 dark:text-orange-400",
  medium: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
  low: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  none: "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400",
};

function formatDuration(minutes: number | null): string {
  if (!minutes) return "0m";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export default function TaskDetailPage() {
  const params = useParams();
  const router = useRouter();
  const taskId = params.taskId as string;

  const { task, isLoading, updateTask, deleteTask } = useTask(taskId);
  const { timeEntries, isLoading: timeLoading } = useTimeEntries({
    taskId,
  });

  const [editTitle, setEditTitle] = useState<string | null>(null);
  const [editDesc, setEditDesc] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleStatusChange(status: TaskStatus) {
    try {
      await updateTask({ status });
    } catch (err) {
      console.error(err);
    }
  }

  async function handlePriorityChange(priority: TaskPriority) {
    try {
      await updateTask({ priority });
    } catch (err) {
      console.error(err);
    }
  }

  async function handleSaveTitle() {
    if (editTitle === null || !editTitle.trim()) return;
    setSaving(true);
    try {
      await updateTask({ title: editTitle.trim() });
      setEditTitle(null);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveDescription() {
    if (editDesc === null) return;
    setSaving(true);
    try {
      await updateTask({ description: editDesc.trim() || null });
      setEditDesc(null);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    try {
      await deleteTask();
      router.push("/tasks");
    } catch (err) {
      console.error(err);
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </div>
    );
  }

  if (!task) {
    return (
      <EmptyState
        icon={ListTodo}
        title="Task not found"
        description="This task may have been deleted."
        actionLabel="Back to Tasks"
        onAction={() => router.push("/tasks")}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/tasks")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <PageHeader
            title=""
            actions={
              <Button
                variant="outline"
                size="sm"
                className="text-destructive"
                onClick={handleDelete}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            }
          />
        </div>
      </div>

      {/* Title - Editable */}
      <div>
        {editTitle !== null ? (
          <div className="flex items-center gap-2">
            <Input
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="text-xl font-bold"
              autoFocus
            />
            <Button size="sm" onClick={handleSaveTitle} disabled={saving}>
              <Save className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setEditTitle(null)}
            >
              Cancel
            </Button>
          </div>
        ) : (
          <h1
            className={cn(
              "text-2xl font-bold tracking-tight cursor-pointer hover:text-muted-foreground transition-colors",
              task.status === "done" && "line-through"
            )}
            onClick={() => setEditTitle(task.title)}
          >
            {task.title}
          </h1>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Description</CardTitle>
            </CardHeader>
            <CardContent>
              {editDesc !== null ? (
                <div className="space-y-2">
                  <Textarea
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                    rows={5}
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={handleSaveDescription}
                      disabled={saving}
                    >
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditDesc(null)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <p
                  className="text-sm text-muted-foreground cursor-pointer hover:text-foreground transition-colors min-h-[60px]"
                  onClick={() => setEditDesc(task.description ?? "")}
                >
                  {task.description || "Click to add a description..."}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Time Entries */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Time Entries
              </CardTitle>
            </CardHeader>
            <CardContent>
              {timeLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-10" />
                  ))}
                </div>
              ) : !timeEntries || timeEntries.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No time entries recorded for this task.
                </p>
              ) : (
                <div className="space-y-2">
                  {timeEntries.map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-center justify-between rounded-md border p-3"
                    >
                      <div>
                        <p className="text-sm font-medium">
                          {entry.description || "Untitled session"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(entry.startTime).toLocaleString()}
                        </p>
                      </div>
                      <Badge variant="secondary">
                        {formatDuration(entry.durationMinutes)}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Status</Label>
                <Select
                  value={task.status}
                  onValueChange={(v) => handleStatusChange(v as TaskStatus)}
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
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">
                  Priority
                </Label>
                <Select
                  value={task.priority}
                  onValueChange={(v) =>
                    handlePriorityChange(v as TaskPriority)
                  }
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

              <Separator />

              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">
                  Due Date
                </Label>
                <p className="text-sm">
                  {task.dueDate
                    ? new Date(task.dueDate).toLocaleDateString()
                    : "No due date"}
                </p>
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">
                  Estimated Time
                </Label>
                <p className="text-sm">
                  {formatDuration(task.estimatedMinutes)}
                </p>
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">
                  Actual Time
                </Label>
                <p className="text-sm">
                  {formatDuration(task.actualMinutes)}
                </p>
              </div>

              <Separator />

              {task.tags.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Tags</Label>
                  <div className="flex flex-wrap gap-1">
                    {task.tags.map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-1 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Created {new Date(task.createdAt).toLocaleDateString()}
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Updated {new Date(task.updatedAt).toLocaleDateString()}
                </div>
                {task.completedAt && (
                  <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                    Completed{" "}
                    {new Date(task.completedAt).toLocaleDateString()}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
