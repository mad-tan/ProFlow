"use client";

import React, { useState, useMemo } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Circle,
  Bell,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface Task {
  id: string;
  title: string;
  priority: "urgent" | "high" | "medium" | "low";
  status: string;
  dueDate?: string;
}

interface Reminder {
  id: string;
  title: string;
  remindAt: string;
  isDismissed?: boolean;
}

interface CalendarViewProps {
  tasks: Task[];
  reminders: Reminder[];
  currentMonth: Date;
  selectedDate: Date | null;
  onSelectDate: (date: Date) => void;
  onMonthChange: (date: Date) => void;
}

const priorityColors: Record<string, string> = {
  urgent: "bg-red-500",
  high: "bg-orange-500",
  medium: "bg-yellow-500",
  low: "bg-blue-500",
};

function getDaysInMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

function getFirstDayOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function CalendarView({
  tasks,
  reminders,
  currentMonth,
  selectedDate,
  onSelectDate,
  onMonthChange,
}: CalendarViewProps) {
  const today = new Date();
  const daysInMonth = getDaysInMonth(currentMonth);
  const firstDay = getFirstDayOfMonth(currentMonth);

  const tasksByDate = useMemo(() => {
    const map: Record<string, Task[]> = {};
    tasks.forEach((task) => {
      if (task.dueDate) {
        const key = task.dueDate.split("T")[0];
        if (!map[key]) map[key] = [];
        map[key].push(task);
      }
    });
    return map;
  }, [tasks]);

  const remindersByDate = useMemo(() => {
    const map: Record<string, Reminder[]> = {};
    reminders.forEach((reminder) => {
      if (reminder.remindAt) {
        const key = reminder.remindAt.split("T")[0];
        if (!map[key]) map[key] = [];
        map[key].push(reminder);
      }
    });
    return map;
  }, [reminders]);

  // Previous month trailing days
  const prevMonthDays = getDaysInMonth(
    new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1)
  );

  const cells: Array<{
    day: number;
    date: Date;
    isCurrentMonth: boolean;
  }> = [];

  // Previous month
  for (let i = firstDay - 1; i >= 0; i--) {
    const d = prevMonthDays - i;
    cells.push({
      day: d,
      date: new Date(
        currentMonth.getFullYear(),
        currentMonth.getMonth() - 1,
        d
      ),
      isCurrentMonth: false,
    });
  }

  // Current month
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({
      day: d,
      date: new Date(currentMonth.getFullYear(), currentMonth.getMonth(), d),
      isCurrentMonth: true,
    });
  }

  // Next month
  const remaining = 42 - cells.length;
  for (let d = 1; d <= remaining; d++) {
    cells.push({
      day: d,
      date: new Date(
        currentMonth.getFullYear(),
        currentMonth.getMonth() + 1,
        d
      ),
      isCurrentMonth: false,
    });
  }

  return (
    <div className="rounded-lg border bg-card">
      {/* Weekday headers */}
      <div className="grid grid-cols-7 border-b">
        {WEEKDAYS.map((day) => (
          <div
            key={day}
            className="px-2 py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7">
        {cells.map((cell, idx) => {
          const dateKey = formatDateKey(cell.date);
          const dayTasks = tasksByDate[dateKey] || [];
          const dayReminders = remindersByDate[dateKey] || [];
          const isToday = isSameDay(cell.date, today);
          const isSelected = selectedDate
            ? isSameDay(cell.date, selectedDate)
            : false;
          const hasItems = dayTasks.length > 0 || dayReminders.length > 0;

          return (
            <Popover key={idx}>
              <PopoverTrigger asChild>
                <button
                  onClick={() => onSelectDate(cell.date)}
                  className={cn(
                    "relative flex min-h-[80px] flex-col items-start border-b border-r p-2 text-left transition-colors hover:bg-accent/50",
                    !cell.isCurrentMonth && "bg-muted/30 text-muted-foreground",
                    isSelected && "bg-accent",
                    "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-inset"
                  )}
                >
                  <span
                    className={cn(
                      "flex h-7 w-7 items-center justify-center rounded-full text-sm font-medium",
                      isToday &&
                        "bg-primary text-primary-foreground shadow-sm",
                      isSelected &&
                        !isToday &&
                        "bg-accent-foreground/10 font-bold"
                    )}
                  >
                    {cell.day}
                  </span>

                  {/* Task dots */}
                  {dayTasks.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {dayTasks.slice(0, 4).map((task) => (
                        <div
                          key={task.id}
                          className={cn(
                            "h-1.5 w-1.5 rounded-full",
                            priorityColors[task.priority] || "bg-blue-500"
                          )}
                          title={task.title}
                        />
                      ))}
                      {dayTasks.length > 4 && (
                        <span className="text-[10px] text-muted-foreground">
                          +{dayTasks.length - 4}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Reminder indicator */}
                  {dayReminders.length > 0 && (
                    <div className="mt-auto">
                      <Bell className="h-3 w-3 text-amber-500" />
                    </div>
                  )}
                </button>
              </PopoverTrigger>

              {hasItems && (
                <PopoverContent
                  className="w-72 p-0"
                  align="start"
                  side="right"
                >
                  <div className="p-3 border-b">
                    <p className="font-semibold text-sm">
                      {cell.date.toLocaleDateString("en-US", {
                        weekday: "long",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                  <div className="max-h-64 overflow-y-auto p-2 space-y-1">
                    {dayTasks.map((task) => (
                      <div
                        key={task.id}
                        className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent"
                      >
                        <div
                          className={cn(
                            "h-2 w-2 rounded-full shrink-0",
                            priorityColors[task.priority]
                          )}
                        />
                        <span className="truncate">{task.title}</span>
                        {task.status === "done" && (
                          <CheckCircle2 className="ml-auto h-3.5 w-3.5 text-emerald-500 shrink-0" />
                        )}
                      </div>
                    ))}
                    {dayReminders.map((reminder) => (
                      <div
                        key={reminder.id}
                        className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent"
                      >
                        <Bell className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                        <span className="truncate">{reminder.title}</span>
                      </div>
                    ))}
                  </div>
                </PopoverContent>
              )}
            </Popover>
          );
        })}
      </div>
    </div>
  );
}
