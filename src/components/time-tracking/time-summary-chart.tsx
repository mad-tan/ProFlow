"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTimeEntries } from "@/lib/hooks/use-time-tracking";

function getLast7Days(): { label: string; dateKey: string }[] {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push({
      label: d.toLocaleDateString(undefined, { weekday: "short" }),
      dateKey: d.toISOString().slice(0, 10),
    });
  }
  return days;
}

export function TimeSummaryChart() {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 6);
  const { timeEntries: entries } = useTimeEntries({
    startDate: startDate.toISOString().slice(0, 10),
    endDate: new Date().toISOString().slice(0, 10),
  });

  const days = getLast7Days();

  // Aggregate duration by day
  const hoursPerDay: Record<string, number> = {};
  days.forEach((d) => (hoursPerDay[d.dateKey] = 0));

  entries?.forEach((entry: any) => {
    const key = new Date(entry.startTime).toISOString().slice(0, 10);
    if (hoursPerDay[key] !== undefined) {
      hoursPerDay[key] += (entry.duration || 0) / 60;
    }
  });

  const maxHours = Math.max(...Object.values(hoursPerDay), 1);
  const totalHours = Object.values(hoursPerDay).reduce((sum, h) => sum + h, 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <BarChart3 className="h-5 w-5 text-muted-foreground" />
            Weekly Summary
          </CardTitle>
          <span className="text-sm font-medium text-muted-foreground">
            {totalHours.toFixed(1)}h total
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {days.map((day) => {
            const hours = hoursPerDay[day.dateKey] || 0;
            const pct = maxHours > 0 ? (hours / maxHours) * 100 : 0;
            const isToday = day.dateKey === new Date().toISOString().slice(0, 10);

            return (
              <div key={day.dateKey} className="flex items-center gap-3">
                <span
                  className={cn(
                    "w-10 text-xs font-medium text-right shrink-0",
                    isToday ? "text-foreground font-semibold" : "text-muted-foreground"
                  )}
                >
                  {day.label}
                </span>
                <div className="flex-1 h-7 bg-muted/50 rounded-md overflow-hidden relative">
                  <div
                    className={cn(
                      "h-full rounded-md transition-all duration-700 ease-out",
                      isToday
                        ? "bg-gradient-to-r from-purple-500 to-purple-600 dark:from-purple-400 dark:to-purple-500"
                        : "bg-gradient-to-r from-blue-400 to-blue-500 dark:from-blue-500 dark:to-blue-600"
                    )}
                    style={{ width: `${Math.max(pct, 2)}%` }}
                  />
                  {hours > 0 && (
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-mono font-medium text-muted-foreground">
                      {hours.toFixed(1)}h
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Scale */}
        <div className="flex justify-between mt-3 px-[52px]">
          <span className="text-[10px] text-muted-foreground">0h</span>
          <span className="text-[10px] text-muted-foreground">{(maxHours / 2).toFixed(1)}h</span>
          <span className="text-[10px] text-muted-foreground">{maxHours.toFixed(1)}h</span>
        </div>
      </CardContent>
    </Card>
  );
}
