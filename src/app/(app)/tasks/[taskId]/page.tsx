"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  Clock,
  FolderOpen,
  ListTodo,
  Save,
  Trash2,
  Plus,
  Check,
  MessageSquare,
  Send,
  Play,
  Square,
  Timer,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTask } from "@/lib/hooks/use-tasks";
import { useTimeEntries, useActiveTimer } from "@/lib/hooks/use-time-tracking";
import { useProjects } from "@/lib/hooks/use-projects";
import { useSubtasks, useTaskComments } from "@/lib/hooks/use-subtasks";
import type { TaskStatus, TaskPriority } from "@/lib/types";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DateInput } from "@/components/ui/date-input";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

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

function formatElapsed(startTime: string): string {
  const elapsed = Math.floor((Date.now() - new Date(startTime).getTime()) / 1000);
  const h = Math.floor(elapsed / 3600);
  const m = Math.floor((elapsed % 3600) / 60);
  const s = elapsed % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function TaskDetailPage() {
  const params = useParams();
  const router = useRouter();
  const taskId = params.taskId as string;

  const { task, isLoading, updateTask, deleteTask } = useTask(taskId);
  const { timeEntries, isLoading: timeLoading, createManualEntry } = useTimeEntries({ taskId });
  const { activeTimer, startTimer, stopTimer } = useActiveTimer();
  const { projects } = useProjects();
  const project = task?.projectId ? projects?.find(p => p.id === task.projectId) : null;
  const { subtasks, addSubtask, toggleSubtask, deleteSubtask } = useSubtasks(taskId);
  const { comments, addComment, deleteComment } = useTaskComments(taskId);

  const [editTitle, setEditTitle] = useState<string | null>(null);
  const [editDesc, setEditDesc] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [newSubtask, setNewSubtask] = useState("");
  const [addingSubtask, setAddingSubtask] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [addingComment, setAddingComment] = useState(false);

  // Timer state
  const [timerLoading, setTimerLoading] = useState(false);
  const isTimerActiveForThisTask = activeTimer?.taskId === taskId;

  // Log time dialog state
  const [logTimeOpen, setLogTimeOpen] = useState(false);
  const [logDesc, setLogDesc] = useState("");
  const [logStart, setLogStart] = useState("");
  const [logEnd, setLogEnd] = useState("");
  const [logSubmitting, setLogSubmitting] = useState(false);

  async function handleStartTimer() {
    setTimerLoading(true);
    try {
      if (activeTimer && !isTimerActiveForThisTask) {
        // Stop current timer first, then start for this task
        await stopTimer();
      }
      await startTimer(taskId, task?.title);
      toast.success("Timer started");
    } catch (err) {
      console.error(err);
      toast.error("Failed to start timer");
    } finally {
      setTimerLoading(false);
    }
  }

  async function handleStopTimer() {
    setTimerLoading(true);
    try {
      await stopTimer();
      toast.success("Timer stopped");
    } catch (err) {
      console.error(err);
      toast.error("Failed to stop timer");
    } finally {
      setTimerLoading(false);
    }
  }

  function openLogTime() {
    const now = new Date();
    const endISO = now.toISOString().slice(0, 16); // datetime-local format
    const startISO = new Date(now.getTime() - 30 * 60 * 1000).toISOString().slice(0, 16);
    setLogStart(startISO);
    setLogEnd(endISO);
    setLogDesc("");
    setLogTimeOpen(true);
  }

  async function handleLogTime() {
    if (!logStart || !logEnd) return;
    const startMs = new Date(logStart).getTime();
    const endMs = new Date(logEnd).getTime();
    if (endMs <= startMs) {
      toast.error("End time must be after start time");
      return;
    }
    setLogSubmitting(true);
    try {
      await createManualEntry({
        taskId,
        description: logDesc.trim() || undefined,
        startTime: new Date(logStart).toISOString(),
        endTime: new Date(logEnd).toISOString(),
      });
      setLogTimeOpen(false);
      toast.success("Time entry logged");
    } catch (err) {
      console.error(err);
      toast.error("Failed to log time");
    } finally {
      setLogSubmitting(false);
    }
  }

  async function handleAddSubtask() {
    if (!newSubtask.trim()) return;
    setAddingSubtask(true);
    try {
      await addSubtask(newSubtask.trim());
      setNewSubtask("");
    } catch (err) { console.error(err); toast.error("Failed to add subtask"); }
    finally { setAddingSubtask(false); }
  }

  async function handleAddComment() {
    if (!newComment.trim()) return;
    setAddingComment(true);
    try {
      await addComment(newComment.trim());
      setNewComment("");
    } catch (err) { console.error(err); toast.error("Failed to add comment"); }
    finally { setAddingComment(false); }
  }

  async function handleStatusChange(status: TaskStatus) {
    try {
      await updateTask({ status });
    } catch (err) {
      console.error(err);
      toast.error("Failed to update status");
    }
  }

  async function handlePriorityChange(priority: TaskPriority) {
    try {
      await updateTask({ priority });
    } catch (err) {
      console.error(err);
      toast.error("Failed to update priority");
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
      toast.error("Failed to save title");
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
      toast.error("Failed to save description");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    try {
      await deleteTask();
      toast.success("Task deleted");
      router.push("/tasks");
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete task");
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

  const totalMinutes = (timeEntries ?? []).reduce((sum, e) => sum + (e.durationMinutes ?? 0), 0);

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

          {/* Subtasks */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Check className="h-4 w-4" />
                Subtasks
                {subtasks.length > 0 && (
                  <span className="text-xs text-muted-foreground font-normal">
                    {subtasks.filter(s => s.isCompleted).length}/{subtasks.length}
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {subtasks.map((sub) => (
                <div key={sub.id} className="flex items-center gap-2 group rounded-md px-2 py-1.5 hover:bg-accent/50">
                  <button
                    type="button"
                    onClick={() => toggleSubtask(sub.id, sub.isCompleted)}
                    className={cn(
                      "flex items-center justify-center h-4 w-4 rounded border-2 shrink-0 transition-colors",
                      sub.isCompleted
                        ? "bg-emerald-500 border-emerald-500 text-white"
                        : "border-muted-foreground/30 hover:border-primary"
                    )}
                  >
                    {sub.isCompleted && <Check className="h-2.5 w-2.5" />}
                  </button>
                  <span className={cn("flex-1 text-sm", sub.isCompleted && "line-through text-muted-foreground")}>
                    {sub.title}
                  </span>
                  <button
                    type="button"
                    onClick={() => deleteSubtask(sub.id)}
                    className="sm:opacity-0 sm:group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity text-xs"
                    aria-label="Delete subtask"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              <div className="flex items-center gap-2 pt-2">
                <Input
                  placeholder="Add subtask..."
                  value={newSubtask}
                  onChange={(e) => setNewSubtask(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleAddSubtask(); }}
                  disabled={addingSubtask}
                  className="h-8 text-sm"
                  autoComplete="off"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleAddSubtask}
                  disabled={!newSubtask.trim() || addingSubtask}
                  className="h-8 px-2"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Comments */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Comments
                {comments.length > 0 && (
                  <span className="text-xs text-muted-foreground font-normal">{comments.length}</span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {comments.map((comment) => (
                <div key={comment.id} className="group rounded-lg border p-3 text-sm space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="whitespace-pre-wrap flex-1">{comment.content}</p>
                    <button
                      type="button"
                      onClick={() => deleteComment(comment.id)}
                      className="sm:opacity-0 sm:group-hover:opacity-100 text-muted-foreground hover:text-destructive shrink-0 transition-opacity"
                      aria-label="Delete comment"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {new Date(comment.createdAt).toLocaleString()}
                  </p>
                </div>
              ))}
              <div className="flex items-start gap-2 pt-1">
                <Textarea
                  placeholder="Add a comment..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  disabled={addingComment}
                  rows={2}
                  className="text-sm"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleAddComment();
                  }}
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleAddComment}
                  disabled={!newComment.trim() || addingComment}
                  className="mt-0.5"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">⌘↵ to submit</p>
            </CardContent>
          </Card>

          {/* Time Entries */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Time Entries
                  {totalMinutes > 0 && (
                    <span className="text-xs text-muted-foreground font-normal">
                      {formatDuration(totalMinutes)} total
                    </span>
                  )}
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={openLogTime}
                    className="h-7 px-2 text-xs"
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    Log Time
                  </Button>
                  {isTimerActiveForThisTask ? (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={handleStopTimer}
                      disabled={timerLoading}
                      className="h-7 px-2 text-xs"
                    >
                      <Square className="h-3 w-3 mr-1 fill-current" />
                      Stop {formatElapsed(activeTimer!.startTime)}
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      onClick={handleStartTimer}
                      disabled={timerLoading}
                      className="h-7 px-2 text-xs"
                    >
                      <Play className="h-3.5 w-3.5 mr-1 fill-current" />
                      {activeTimer ? "Switch Timer" : "Start Timer"}
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Active timer banner */}
              {isTimerActiveForThisTask && activeTimer && (
                <div className="mb-3 flex items-center gap-2 rounded-md bg-emerald-500/10 border border-emerald-500/20 px-3 py-2">
                  <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                    Timer running — {formatElapsed(activeTimer.startTime)}
                  </span>
                </div>
              )}
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
                          {entry.endTime && (
                            <> — {new Date(entry.endTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</>
                          )}
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

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Project</Label>
                <Select
                  value={task.projectId ?? "none"}
                  onValueChange={async (v) => {
                    try {
                      await updateTask({ projectId: v === "none" ? null : v });
                    } catch (err) { console.error(err); toast.error("Failed to update project"); }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue>
                      {project ? (
                        <div className="flex items-center gap-1.5">
                          <FolderOpen className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">{project.name}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">No project</span>
                      )}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No project</SelectItem>
                    {(projects ?? []).map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">
                  Due Date
                </Label>
                <DateInput
                  type="date"
                  value={task.dueDate ?? ""}
                  onChange={async (e) => {
                    try {
                      await updateTask({ dueDate: (e.target as HTMLInputElement).value || null });
                    } catch (err) {
                      console.error(err);
                      toast.error("Failed to update due date");
                    }
                  }}
                  className="h-8 text-sm"
                />
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

          {/* Quick Timer Card */}
          <Card className={cn(isTimerActiveForThisTask && "border-emerald-500/40 bg-emerald-500/5")}>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <Timer className={cn("h-4 w-4", isTimerActiveForThisTask ? "text-emerald-500" : "text-muted-foreground")} />
                <div className="flex-1">
                  <p className="text-xs font-medium">
                    {isTimerActiveForThisTask ? "Timer Running" : "Time Tracking"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {isTimerActiveForThisTask
                      ? formatElapsed(activeTimer!.startTime)
                      : totalMinutes > 0
                        ? `${formatDuration(totalMinutes)} logged`
                        : "No time logged yet"}
                  </p>
                </div>
                {isTimerActiveForThisTask ? (
                  <Button size="sm" variant="destructive" onClick={handleStopTimer} disabled={timerLoading} className="h-7 px-2 text-xs">
                    <Square className="h-3 w-3 fill-current" />
                  </Button>
                ) : (
                  <Button size="sm" onClick={handleStartTimer} disabled={timerLoading} className="h-7 px-2 text-xs">
                    <Play className="h-3.5 w-3.5 fill-current" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Log Time Dialog */}
      <Dialog open={logTimeOpen} onOpenChange={setLogTimeOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Log Time Entry</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <Input
                placeholder="What did you work on?"
                value={logDesc}
                onChange={(e) => setLogDesc(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Start Time</Label>
                <input
                  type="datetime-local"
                  value={logStart}
                  onChange={(e) => setLogStart(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>
              <div className="space-y-2">
                <Label>End Time</Label>
                <input
                  type="datetime-local"
                  value={logEnd}
                  onChange={(e) => setLogEnd(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>
            </div>
            {logStart && logEnd && new Date(logEnd) > new Date(logStart) && (
              <p className="text-xs text-muted-foreground">
                Duration: {formatDuration(Math.round((new Date(logEnd).getTime() - new Date(logStart).getTime()) / 60000))}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLogTimeOpen(false)} disabled={logSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleLogTime} disabled={!logStart || !logEnd || logSubmitting}>
              {logSubmitting ? "Saving..." : "Log Time"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
