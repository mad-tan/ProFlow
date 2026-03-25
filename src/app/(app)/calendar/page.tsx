"use client";

import React, { useState, useMemo } from "react";
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Bell,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { PageHeader } from "@/components/layout/page-header";
import { CalendarView } from "@/components/calendar/calendar-view";
import { useTasks } from "@/lib/hooks/use-tasks";
import { useReminders } from "@/lib/hooks/use-reminders";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const priorityLabels: Record<string, string> = {
  urgent: "Urgent",
  high: "High",
  medium: "Medium",
  low: "Low",
};

const priorityColors: Record<string, string> = {
  urgent: "bg-red-500",
  high: "bg-orange-500",
  medium: "bg-yellow-500",
  low: "bg-blue-500",
};

function formatDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function formatTime(dateStr: string) {
  try {
    const d = new Date(dateStr);
    return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  } catch {
    return "";
  }
}

export default function CalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const { tasks } = useTasks();
  const { reminders } = useReminders();

  const goToPrevMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1)
    );
  };

  const goToNextMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1)
    );
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentMonth(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelectedDate(today);
  };

  const selectedDateKey = selectedDate ? formatDateKey(selectedDate) : null;

  const selectedTasks = useMemo(() => {
    if (!selectedDateKey || !tasks) return [];
    return (tasks as any[]).filter(
      (t: any) => t.dueDate && t.dueDate.startsWith(selectedDateKey)
    );
  }, [tasks, selectedDateKey]);

  const selectedReminders = useMemo(() => {
    if (!selectedDateKey || !reminders) return [];
    return (reminders as any[]).filter(
      (r: any) => r.remindAt && r.remindAt.startsWith(selectedDateKey)
    );
  }, [reminders, selectedDateKey]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Calendar"
        description="View your tasks and reminders at a glance"
        icon={CalendarDays}
      />

      {/* Month navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-bold">
            {MONTH_NAMES[currentMonth.getMonth()]} {currentMonth.getFullYear()}
          </h2>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" onClick={goToPrevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={goToToday}>
              Today
            </Button>
            <Button variant="outline" size="icon" onClick={goToNextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Calendar */}
      <CalendarView
        tasks={(tasks as any[]) || []}
        reminders={(reminders as any[]) || []}
        currentMonth={currentMonth}
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
        onMonthChange={setCurrentMonth}
      />

      {/* Selected day detail */}
      {selectedDate && (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Tasks for selected day */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                Tasks for{" "}
                {selectedDate.toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                })}
                {selectedTasks.length > 0 && (
                  <Badge variant="secondary" className="ml-auto">
                    {selectedTasks.length}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedTasks.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  No tasks scheduled for this day
                </p>
              ) : (
                <div className="space-y-2">
                  {selectedTasks.map((task: any) => (
                    <div
                      key={task.id}
                      className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-accent/50"
                    >
                      <div
                        className={cn(
                          "h-2.5 w-2.5 rounded-full shrink-0",
                          priorityColors[task.priority] || "bg-blue-500"
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
                        {task.projectName && (
                          <p className="text-xs text-muted-foreground">
                            {task.projectName}
                          </p>
                        )}
                      </div>
                      <Badge
                        variant={
                          task.priority === "urgent"
                            ? "destructive"
                            : "secondary"
                        }
                        className="text-[10px]"
                      >
                        {priorityLabels[task.priority] || task.priority}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Reminders for selected day */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Bell className="h-4 w-4 text-amber-500" />
                Reminders for{" "}
                {selectedDate.toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                })}
                {selectedReminders.length > 0 && (
                  <Badge variant="secondary" className="ml-auto">
                    {selectedReminders.length}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedReminders.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  No reminders for this day
                </p>
              ) : (
                <div className="space-y-2">
                  {selectedReminders.map((reminder: any) => (
                    <div
                      key={reminder.id}
                      className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-accent/50"
                    >
                      <Bell className="h-4 w-4 text-amber-500 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {reminder.title}
                        </p>
                        {reminder.description && (
                          <p className="text-xs text-muted-foreground truncate">
                            {reminder.description}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                        <Clock className="h-3 w-3" />
                        {formatTime(reminder.remindAt)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
