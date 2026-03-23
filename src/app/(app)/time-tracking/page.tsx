"use client";

import { useState } from "react";
import { Plus, Clock, Timer } from "lucide-react";
import { useTimeEntries, useActiveTimer } from "@/lib/hooks/use-time-tracking";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

function formatDuration(minutes: number | null): string {
  if (!minutes) return "0m";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function TimeTrackingPage() {
  const today = new Date().toISOString().split("T")[0];
  const { timeEntries, isLoading, createManualEntry } = useTimeEntries({
    startDate: today,
    endDate: today,
  });
  const {
    activeTimer,
    isLoading: timerLoading,
    startTimer,
    stopTimer,
  } = useActiveTimer();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [desc, setDesc] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [timerDesc, setTimerDesc] = useState("");

  const totalMinutes =
    timeEntries?.reduce((sum, e) => sum + (e.durationMinutes ?? 0), 0) ?? 0;
  const totalHours = (totalMinutes / 60).toFixed(1);

  async function handleStartTimer() {
    try {
      await startTimer(undefined, timerDesc || undefined);
      setTimerDesc("");
    } catch (err) {
      console.error(err);
    }
  }

  async function handleStopTimer() {
    try {
      await stopTimer();
    } catch (err) {
      console.error(err);
    }
  }

  async function handleManualEntry() {
    if (!startTime || !endTime) return;
    setSubmitting(true);
    try {
      await createManualEntry({
        description: desc.trim() || undefined,
        startTime: new Date(startTime).toISOString(),
        endTime: new Date(endTime).toISOString(),
      });
      setDialogOpen(false);
      setDesc("");
      setStartTime("");
      setEndTime("");
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Time Tracking"
        description="Track how you spend your time"
        actions={
          <Button variant="outline" onClick={() => setDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Manual Entry
          </Button>
        }
      />

      {/* Timer Widget */}
      <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardContent className="py-8">
          {timerLoading ? (
            <div className="flex flex-col items-center gap-4">
              <Skeleton className="h-16 w-48" />
              <Skeleton className="h-10 w-32" />
            </div>
          ) : activeTimer ? (
            <div className="flex flex-col items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                </span>
                Recording
              </div>
              <div className="text-5xl font-mono font-bold tabular-nums tracking-tight">
                {(() => {
                  const start = new Date(activeTimer.startTime).getTime();
                  const now = Date.now();
                  const diffMin = Math.floor((now - start) / 60000);
                  const h = Math.floor(diffMin / 60);
                  const m = diffMin % 60;
                  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
                })()}
              </div>
              {activeTimer.description && (
                <p className="text-sm text-muted-foreground">
                  {activeTimer.description}
                </p>
              )}
              <Button
                size="lg"
                variant="destructive"
                onClick={handleStopTimer}
                className="mt-2"
              >
                <Timer className="mr-2 h-5 w-5" />
                Stop Timer
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4">
              <div className="text-5xl font-mono font-bold tabular-nums tracking-tight text-muted-foreground">
                00:00
              </div>
              <div className="flex items-center gap-2 w-full max-w-sm">
                <Input
                  placeholder="What are you working on?"
                  value={timerDesc}
                  onChange={(e) => setTimerDesc(e.target.value)}
                  className="flex-1"
                />
                <Button size="lg" onClick={handleStartTimer}>
                  <Timer className="mr-2 h-5 w-5" />
                  Start
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Today's Summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Today&apos;s Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{totalHours}h</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Entries Today
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{timeEntries?.length ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Avg per Entry
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {timeEntries && timeEntries.length > 0
                ? formatDuration(
                    Math.round(totalMinutes / timeEntries.length)
                  )
                : "0m"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Today's Entries */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Today&apos;s Entries
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-14" />
              ))}
            </div>
          ) : !timeEntries || timeEntries.length === 0 ? (
            <EmptyState
              icon={Clock}
              title="No entries today"
              description="Start a timer or add a manual entry to begin tracking."
            />
          ) : (
            <div className="space-y-2">
              {timeEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-accent/50"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {entry.description || "Untitled session"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatTime(entry.startTime)}
                      {entry.endTime && ` - ${formatTime(entry.endTime)}`}
                    </p>
                  </div>
                  <Badge variant="secondary" className="text-sm font-mono">
                    {formatDuration(entry.durationMinutes)}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Manual Entry Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Add Manual Entry</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                placeholder="What were you working on?"
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Time</Label>
                <Input
                  type="datetime-local"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>End Time</Label>
                <Input
                  type="datetime-local"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                />
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
              onClick={handleManualEntry}
              disabled={!startTime || !endTime || submitting}
            >
              {submitting ? "Saving..." : "Add Entry"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
