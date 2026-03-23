"use client";

import { useState, useEffect, useCallback } from "react";
import { Play, Square, Clock, Timer } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useActiveTimer } from "@/lib/hooks/use-time-tracking";

function formatElapsed(startTime: string): string {
  const start = new Date(startTime).getTime();
  const now = Date.now();
  const diffSec = Math.max(0, Math.floor((now - start) / 1000));

  const hours = Math.floor(diffSec / 3600);
  const minutes = Math.floor((diffSec % 3600) / 60);
  const seconds = diffSec % 60;

  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

export function ActiveTimer() {
  const { activeTimer, isLoading, startTimer, stopTimer } = useActiveTimer();
  const [elapsed, setElapsed] = useState("00:00:00");
  const [isStopping, setIsStopping] = useState(false);

  useEffect(() => {
    if (!activeTimer?.startTime) {
      setElapsed("00:00:00");
      return;
    }

    setElapsed(formatElapsed(activeTimer.startTime));
    const interval = setInterval(() => {
      setElapsed(formatElapsed(activeTimer.startTime));
    }, 1000);

    return () => clearInterval(interval);
  }, [activeTimer?.startTime]);

  const handleStop = useCallback(async () => {
    setIsStopping(true);
    try {
      await stopTimer();
    } finally {
      setIsStopping(false);
    }
  }, [stopTimer]);

  const handleStart = useCallback(async () => {
    await startTimer();
  }, [startTimer]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5" />
            <Skeleton className="h-5 w-28" />
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <Skeleton className="h-12 w-full" />
        </CardContent>
      </Card>
    );
  }

  const isRunning = !!activeTimer?.startTime && !activeTimer.endTime;

  return (
    <Card className={cn(isRunning && "ring-2 ring-emerald-500/20 dark:ring-emerald-500/30")}>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Timer className={cn("h-5 w-5", isRunning ? "text-emerald-500" : "text-muted-foreground")} />
          <CardTitle className="text-base font-semibold">Time Tracker</CardTitle>
          {isRunning && (
            <span className="relative ml-auto flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {isRunning ? (
          <div className="space-y-4">
            {activeTimer.description && (
              <p className="text-sm text-muted-foreground truncate">
                {activeTimer.description}
              </p>
            )}
            <div className="flex items-center justify-between">
              <p className="text-3xl font-mono font-bold tracking-wider tabular-nums">
                {elapsed}
              </p>
              <Button
                size="sm"
                variant="destructive"
                onClick={handleStop}
                disabled={isStopping}
                className="gap-1.5"
              >
                <Square className="h-3.5 w-3.5" />
                Stop
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-4 text-center">
            <Clock className="h-8 w-8 text-muted-foreground/40 mb-2" />
            <p className="text-sm text-muted-foreground mb-3">
              No timer running
            </p>
            <Button size="sm" onClick={handleStart} className="gap-1.5">
              <Play className="h-3.5 w-3.5" />
              Start Timer
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
