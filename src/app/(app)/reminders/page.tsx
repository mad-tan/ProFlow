"use client";

import { useState, useMemo } from "react";
import {
  Plus,
  Bell,
  BellOff,
  Clock,
  Repeat,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useReminders } from "@/lib/hooks/use-reminders";
import type { ReminderFrequency } from "@/lib/types";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DateInput } from "@/components/ui/date-input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

const frequencyLabels: Record<ReminderFrequency, string> = {
  once: "Once",
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
  custom: "Custom",
};

function formatRemindAt(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function RemindersPage() {
  const { reminders, isLoading, createReminder, dismissReminder, deleteReminder } =
    useReminders();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [formTitle, setFormTitle] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formDateTime, setFormDateTime] = useState("");
  const [formFrequency, setFormFrequency] = useState<ReminderFrequency>("once");
  const [submitting, setSubmitting] = useState(false);

  const now = new Date();

  const upcoming = useMemo(
    () =>
      (reminders ?? [])
        .filter((r) => r.isActive && new Date(r.remindAt) >= now)
        .sort(
          (a, b) =>
            new Date(a.remindAt).getTime() - new Date(b.remindAt).getTime()
        ),
    [reminders, now]
  );

  const past = useMemo(
    () =>
      (reminders ?? [])
        .filter((r) => !r.isActive || new Date(r.remindAt) < now)
        .sort(
          (a, b) =>
            new Date(b.remindAt).getTime() - new Date(a.remindAt).getTime()
        ),
    [reminders, now]
  );

  const all = useMemo(
    () =>
      (reminders ?? []).sort(
        (a, b) =>
          new Date(b.remindAt).getTime() - new Date(a.remindAt).getTime()
      ),
    [reminders]
  );

  async function handleCreate() {
    if (!formTitle.trim() || !formDateTime) return;
    setSubmitting(true);
    try {
      await createReminder({
        title: formTitle.trim(),
        description: formDesc.trim() || undefined,
        remindAt: new Date(formDateTime).toISOString(),
        frequency: formFrequency,
      });
      setDialogOpen(false);
      setFormTitle("");
      setFormDesc("");
      setFormDateTime("");
      setFormFrequency("once");
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  }

  function ReminderCard({ reminder }: { reminder: (typeof all)[0] }) {
    const isPast = new Date(reminder.remindAt) < now;
    return (
      <Card
        className={cn(
          "transition-shadow hover:shadow-md",
          !reminder.isActive && "opacity-60"
        )}
      >
        <CardContent className="py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div
                className={cn(
                  "flex items-center justify-center h-9 w-9 rounded-full shrink-0 mt-0.5",
                  isPast
                    ? "bg-muted text-muted-foreground"
                    : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                )}
              >
                <Bell className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p
                  className={cn(
                    "text-sm font-medium truncate",
                    !reminder.isActive && "line-through"
                  )}
                >
                  {reminder.title}
                </p>
                {reminder.description && (
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                    {reminder.description}
                  </p>
                )}
                <div className="flex items-center gap-2 mt-1.5">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {formatRemindAt(reminder.remindAt)}
                  </div>
                  {reminder.frequency !== "once" && (
                    <Badge
                      variant="outline"
                      className="text-[10px] gap-0.5 px-1.5"
                    >
                      <Repeat className="h-2.5 w-2.5" />
                      {frequencyLabels[reminder.frequency]}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {reminder.isActive && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-foreground"
                  onClick={() => dismissReminder(reminder.id)}
                >
                  <BellOff className="h-4 w-4 mr-1" />
                  Dismiss
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                onClick={() => deleteReminder(reminder.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  function ReminderList({ items }: { items: typeof all }) {
    if (items.length === 0) {
      return (
        <EmptyState
          icon={Bell}
          title="No reminders"
          description="Create a reminder to stay on top of important tasks."
          actionLabel="New Reminder"
          onAction={() => setDialogOpen(true)}
        />
      );
    }
    return (
      <div className="space-y-3">
        {items.map((r) => (
          <ReminderCard key={r.id} reminder={r} />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reminders"
        description="Never miss an important deadline"
        actions={
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Reminder
          </Button>
        }
      />

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      ) : (
        <Tabs defaultValue="upcoming">
          <TabsList>
            <TabsTrigger value="upcoming">
              Upcoming ({upcoming.length})
            </TabsTrigger>
            <TabsTrigger value="past">Past ({past.length})</TabsTrigger>
            <TabsTrigger value="all">All ({all.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming" className="mt-4">
            <ReminderList items={upcoming} />
          </TabsContent>
          <TabsContent value="past" className="mt-4">
            <ReminderList items={past} />
          </TabsContent>
          <TabsContent value="all" className="mt-4">
            <ReminderList items={all} />
          </TabsContent>
        </Tabs>
      )}

      {/* Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle>Create Reminder</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                placeholder="Reminder title"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <Textarea
                placeholder="Additional details..."
                value={formDesc}
                onChange={(e) => setFormDesc(e.target.value)}
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date & Time</Label>
                <DateInput
                  type="datetime-local"
                  value={formDateTime}
                  onChange={(e) => setFormDateTime((e.target as HTMLInputElement).value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Frequency</Label>
                <Select
                  value={formFrequency}
                  onValueChange={(v) =>
                    setFormFrequency(v as ReminderFrequency)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="once">Once</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
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
              disabled={!formTitle.trim() || !formDateTime || submitting}
            >
              {submitting ? "Creating..." : "Create Reminder"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
