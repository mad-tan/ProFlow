"use client";

import React, { useState } from "react";
import { Play, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useTimer } from "@/lib/contexts/timer-context";
import { useTasks } from "@/lib/hooks/use-tasks";
import { useActiveTimer } from "@/lib/hooks/use-time-tracking";
import { TimerDisplay } from "./timer-display";

export function TimerWidget() {
  const { activeTimer, elapsedSeconds, startTimer, stopTimer, isRunning } = useTimer();
  const { activeTimer: apiTimer, stopTimer: stopTimerApi } = useActiveTimer();
  const { tasks } = useTasks();
  const [selectedTaskId, setSelectedTaskId] = useState<string>("");

  const handleStart = () => {
    if (!selectedTaskId) return;
    const task = tasks?.find((t: any) => t.id === selectedTaskId);
    if (!task) return;
    startTimer({ taskId: task.id, taskName: task.title });
  };

  const handleStop = async () => {
    if (activeTimer) {
      await stopTimerApi?.();
    }
    stopTimer();
  };

  return (
    <Card
      className={cn(
        "relative overflow-hidden transition-all duration-500",
        isRunning && "ring-2 ring-red-500/30 dark:ring-red-400/20"
      )}
    >
      {/* Animated gradient background when running */}
      {isRunning && (
        <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 via-transparent to-orange-500/5 dark:from-red-500/10 dark:to-orange-500/10 animate-pulse" />
      )}

      <CardContent className="relative p-6 lg:p-8">
        <div className="flex flex-col items-center gap-6">
          {/* Timer Display */}
          <div className="flex items-center gap-3">
            {isRunning && (
              <span className="relative flex h-3 w-3">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex h-3 w-3 rounded-full bg-red-500" />
              </span>
            )}
            <TimerDisplay seconds={elapsedSeconds} size={isRunning ? "lg" : "md"} />
          </div>

          {/* Task name when running */}
          {isRunning && activeTimer && (
            <div className="text-center space-y-1 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <p className="text-lg font-semibold">{activeTimer.taskName}</p>
              {activeTimer.projectName && (
                <p className="text-sm text-muted-foreground">{activeTimer.projectName}</p>
              )}
            </div>
          )}

          {/* Controls */}
          {isRunning ? (
            <Button
              onClick={handleStop}
              size="lg"
              variant="destructive"
              className="h-14 w-14 rounded-full p-0 shadow-lg transition-transform hover:scale-110 active:scale-95"
            >
              <Square className="h-6 w-6 fill-current" />
            </Button>
          ) : (
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full max-w-md">
              <Select value={selectedTaskId} onValueChange={setSelectedTaskId}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select a task..." />
                </SelectTrigger>
                <SelectContent>
                  {tasks?.map((task: any) => (
                    <SelectItem key={task.id} value={task.id}>
                      {task.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                onClick={handleStart}
                size="lg"
                disabled={!selectedTaskId}
                className="h-14 w-14 rounded-full p-0 shadow-lg transition-transform hover:scale-110 active:scale-95 bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600"
              >
                <Play className="h-6 w-6 fill-current ml-0.5" />
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
