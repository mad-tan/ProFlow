"use client";

import { useState } from "react";
import { Plus, CheckSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { useChecklists } from "@/lib/hooks/use-checklists";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
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

const TYPE_LABELS: Record<string, string> = {
  daily: "Daily",
  weekly: "Weekly",
  project: "Project",
  custom: "Custom",
};

const TYPE_COLORS: Record<string, string> = {
  daily: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  weekly: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  project: "bg-purple-500/10 text-purple-700 dark:text-purple-400",
  custom: "bg-zinc-500/10 text-zinc-700 dark:text-zinc-400",
};

export default function ChecklistsPage() {
  const { checklists, isLoading, createChecklist } = useChecklists();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formTitle, setFormTitle] = useState("");
  const [formType, setFormType] = useState("custom");
  const [submitting, setSubmitting] = useState(false);

  async function handleCreate() {
    if (!formTitle.trim()) return;
    setSubmitting(true);
    try {
      await createChecklist({
        title: formTitle.trim(),
        metadata: { type: formType },
      });
      setDialogOpen(false);
      setFormTitle("");
      setFormType("custom");
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Checklists"
        description="Stay organized with reusable checklists"
        actions={
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Checklist
          </Button>
        }
      />

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-36" />
          ))}
        </div>
      ) : !checklists || checklists.length === 0 ? (
        <EmptyState
          icon={CheckSquare}
          title="No checklists yet"
          description="Create your first checklist to start tracking tasks."
          actionLabel="New Checklist"
          onAction={() => setDialogOpen(true)}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {checklists.map((cl) => {
            const meta = cl.metadata as any;
            const totalItems = meta?.totalItems ?? 0;
            const completedItems = meta?.completedItems ?? 0;
            const progress =
              totalItems > 0
                ? Math.round((completedItems / totalItems) * 100)
                : 0;
            const type = meta?.type ?? "custom";

            return (
              <a key={cl.id} href={`/checklists/${cl.id}`}>
                <Card className="transition-shadow hover:shadow-md cursor-pointer h-full">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-base truncate">
                        {cl.title}
                      </CardTitle>
                      <Badge
                        variant="secondary"
                        className={cn("text-xs shrink-0 ml-2", TYPE_COLORS[type])}
                      >
                        {TYPE_LABELS[type] ?? type}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {cl.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {cl.description}
                      </p>
                    )}
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>
                          {completedItems}/{totalItems} completed
                        </span>
                        <span>{progress}%</span>
                      </div>
                      <Progress value={progress} className="h-1.5" />
                    </div>
                  </CardContent>
                </Card>
              </a>
            );
          })}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Create New Checklist</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                placeholder="Checklist title"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={formType} onValueChange={setFormType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="project">Project</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
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
              {submitting ? "Creating..." : "Create Checklist"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
