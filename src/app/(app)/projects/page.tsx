"use client";

import { useState, useMemo } from "react";
import { toast } from "sonner";
import {
  Plus,
  Search,
  FolderKanban,
  MoreHorizontal,
  Archive,
  Trash2,
  ArrowUpDown,
  Download,
} from "lucide-react";
import { usePersistedState } from "@/lib/hooks/use-persisted-state";
import { cn } from "@/lib/utils";
import { useProjects } from "@/lib/hooks/use-projects";
import type { ProjectStatus } from "@/lib/types";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const STATUS_OPTIONS: { value: ProjectStatus | "all"; label: string }[] = [
  { value: "all", label: "All Statuses" },
  { value: "active", label: "Active" },
  { value: "on_hold", label: "On Hold" },
  { value: "completed", label: "Completed" },
  { value: "archived", label: "Archived" },
];

const statusColors: Record<ProjectStatus, string> = {
  active: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  on_hold: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  completed: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  archived: "bg-zinc-500/10 text-zinc-700 dark:text-zinc-400",
};

const PROJECT_COLORS = [
  "#ef4444", "#f97316", "#eab308", "#22c55e",
  "#06b6d4", "#3b82f6", "#8b5cf6", "#ec4899",
];

export default function ProjectsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = usePersistedState<ProjectStatus | "all">("proflow-projects-status-filter", "all");
  const [showArchived, setShowArchived] = usePersistedState<boolean>("proflow-projects-show-archived", false);
  const [sortBy, setSortBy] = usePersistedState<string>("proflow-projects-sort", "created");
  const [dialogOpen, setDialogOpen] = useState(false);

  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formStatus, setFormStatus] = useState<ProjectStatus>("active");
  const [formColor, setFormColor] = useState(PROJECT_COLORS[5]);
  const [submitting, setSubmitting] = useState(false);

  const filters: Record<string, string | undefined> = {};
  if (statusFilter !== "all") filters.status = statusFilter;
  if (search) filters.search = search;

  const { projects, isLoading, createProject, archiveProject, deleteProject } =
    useProjects(filters as any);

  const filteredProjects = useMemo(() => {
    let list = (projects ?? []).filter((p) => {
      if (!showArchived && p.status === "archived") return false;
      return true;
    });
    switch (sortBy) {
      case "name":
        return list.sort((a, b) => a.name.localeCompare(b.name));
      case "status":
        return list.sort((a, b) => a.status.localeCompare(b.status));
      default:
        return list;
    }
  }, [projects, showArchived, sortBy]);

  async function handleCreate() {
    if (!formName.trim()) return;
    setSubmitting(true);
    try {
      await createProject({
        name: formName.trim(),
        description: formDescription.trim() || undefined,
        status: formStatus,
        color: formColor,
      });
      setDialogOpen(false);
      resetForm();
      toast.success("Project created");
    } catch (err) {
      console.error(err);
      toast.error("Failed to create project");
    } finally {
      setSubmitting(false);
    }
  }

  function resetForm() {
    setFormName("");
    setFormDescription("");
    setFormStatus("active");
    setFormColor(PROJECT_COLORS[5]);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Projects"
        description="Manage your projects and track progress"
        actions={
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Project
          </Button>
        }
      />

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search projects..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as ProjectStatus | "all")}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={(v) => setSortBy(v)}>
          <SelectTrigger className="w-[160px]">
            <div className="flex items-center gap-1.5">
              <ArrowUpDown className="h-3.5 w-3.5 shrink-0" />
              <SelectValue placeholder="Sort" />
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="created">Date Created</SelectItem>
            <SelectItem value="name">Name</SelectItem>
            <SelectItem value="status">Status</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2">
          <Switch
            id="show-archived"
            checked={showArchived}
            onCheckedChange={setShowArchived}
          />
          <Label htmlFor="show-archived" className="text-sm cursor-pointer">
            Show archived
          </Label>
        </div>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-3/4" />
              </CardHeader>
              <CardContent className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-2 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredProjects.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title="No projects yet"
          description="Create your first project to start organizing your work."
          actionLabel="New Project"
          onAction={() => setDialogOpen(true)}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredProjects.map((project) => {
            const taskCount = (project as any).taskCount ?? 0;
            const completedCount = (project as any).completedTaskCount ?? 0;
            const progress =
              taskCount > 0
                ? Math.round((completedCount / taskCount) * 100)
                : 0;

            return (
              <Card
                key={project.id}
                className="group relative transition-shadow hover:shadow-md"
              >
                <div
                  className="absolute top-0 left-0 right-0 h-1 rounded-t-lg"
                  style={{ backgroundColor: project.color ?? "#3b82f6" }}
                />
                <CardHeader className="flex flex-row items-start justify-between pb-2">
                  <a
                    href={`/projects/${project.id}`}
                    className="flex-1 min-w-0"
                  >
                    <CardTitle className="text-base truncate hover:underline">
                      {project.name}
                    </CardTitle>
                  </a>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={async () => {
                          try {
                            const res = await fetch(`/api/export/project/${project.id}`);
                            if (!res.ok) throw new Error("Export failed");
                            const blob = await res.blob();
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement("a");
                            a.href = url;
                            const slug = project.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
                            a.download = `proflow-project-${slug}-${new Date().toISOString().split("T")[0]}.json`;
                            a.click();
                            URL.revokeObjectURL(url);
                            toast.success("Project exported");
                          } catch (err) {
                            console.error(err);
                            toast.error("Failed to export project");
                          }
                        }}
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Export
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={async () => {
                          try {
                            await archiveProject(project.id);
                            toast.success("Project archived");
                          } catch (err) {
                            console.error(err);
                            toast.error("Failed to archive project");
                          }
                        }}
                      >
                        <Archive className="mr-2 h-4 w-4" />
                        Archive
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={async () => {
                          try {
                            await deleteProject(project.id);
                            toast.success("Project deleted");
                          } catch (err) {
                            console.error(err);
                            toast.error("Failed to delete project");
                          }
                        }}
                        className="text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardHeader>
                <CardContent className="space-y-3">
                  {project.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {project.description}
                    </p>
                  )}
                  <div className="flex items-center justify-between">
                    <Badge
                      variant="secondary"
                      className={cn(
                        "text-xs",
                        statusColors[project.status]
                      )}
                    >
                      {project.status.replace("_", " ")}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {taskCount} task{taskCount !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Progress</span>
                      <span>{progress}%</span>
                    </div>
                    <Progress value={progress} className="h-1.5" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) { setFormName(""); setFormDescription(""); setFormStatus("active"); setFormColor(PROJECT_COLORS[5]); } }}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="project-name">Name</Label>
              <Input
                id="project-name"
                placeholder="Project name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="project-desc">Description</Label>
              <Textarea
                id="project-desc"
                placeholder="What is this project about?"
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
                  onValueChange={(v) => setFormStatus(v as ProjectStatus)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="on_hold">On Hold</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Color</Label>
                <div className="flex flex-wrap gap-2 pt-1">
                  {PROJECT_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setFormColor(color)}
                      className={cn(
                        "h-7 w-7 rounded-full border-2 transition-transform hover:scale-110",
                        formColor === color
                          ? "border-foreground scale-110"
                          : "border-transparent"
                      )}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
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
              disabled={!formName.trim() || submitting}
            >
              {submitting ? "Creating..." : "Create Project"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
