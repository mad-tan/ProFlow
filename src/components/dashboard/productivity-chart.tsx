"use client";

import { useMemo } from "react";
import { BarChart3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useTimeEntries } from "@/lib/hooks/use-time-tracking";
import { format, subDays, parseISO, startOfDay, endOfDay } from "date-fns";

export function ProductivityChart() {
  const now = new Date();
  const weekAgo = subDays(now, 6);
  const { timeEntries, isLoading } = useTimeEntries({
    startDate: startOfDay(weekAgo).toISOString(),
    endDate: endOfDay(now).toISOString(),
  });

  const chartData = useMemo(() => {
    const days = Array.from({ length: 7 }).map((_, i) => {
      const date = subDays(now, 6 - i);
      return {
        label: format(date, "EEE"),
        dateKey: format(date, "yyyy-MM-dd"),
        hours: 0,
      };
    });

    if (timeEntries) {
      for (const entry of timeEntries) {
        if (entry.durationMinutes) {
          const entryDate = format(parseISO(entry.startTime), "yyyy-MM-dd");
          const day = days.find((d) => d.dateKey === entryDate);
          if (day) {
            day.hours += entry.durationMinutes / 60;
          }
        }
      }
    }

    return days;
  }, [timeEntries]);

  const maxHours = Math.max(...chartData.map((d) => d.hours), 1);
  const totalHours = chartData.reduce((sum, d) => sum + d.hours, 0);
  const avgHours = totalHours / 7;

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5" />
            <Skeleton className="h-5 w-32" />
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-end gap-2 h-32">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                <Skeleton className="w-full rounded-t-sm" style={{ height: `${30 + Math.random() * 70}%` }} />
                <Skeleton className="h-3 w-6" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-base font-semibold">Weekly Activity</CardTitle>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold">{totalHours.toFixed(1)}h</p>
            <p className="text-[10px] text-muted-foreground">avg {avgHours.toFixed(1)}h/day</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <TooltipProvider>
          <div className="flex items-end gap-2 h-32">
            {chartData.map((day) => {
              const heightPercent = maxHours > 0 ? (day.hours / maxHours) * 100 : 0;
              const isToday = day.dateKey === format(new Date(), "yyyy-MM-dd");

              return (
                <Tooltip key={day.dateKey}>
                  <TooltipTrigger asChild>
                    <div className="flex flex-1 flex-col items-center gap-1.5 cursor-default">
                      <div className="w-full relative flex-1 flex items-end">
                        <div
                          className={cn(
                            "w-full rounded-t-sm transition-all duration-500 min-h-[2px]",
                            isToday
                              ? "bg-gradient-to-t from-blue-600 to-blue-400 dark:from-blue-500 dark:to-blue-300"
                              : "bg-gradient-to-t from-blue-500/60 to-blue-400/40 dark:from-blue-600/50 dark:to-blue-400/30",
                            "hover:opacity-80"
                          )}
                          style={{ height: `${Math.max(heightPercent, 2)}%` }}
                        />
                      </div>
                      <span
                        className={cn(
                          "text-[10px]",
                          isToday ? "font-bold text-blue-600 dark:text-blue-400" : "text-muted-foreground"
                        )}
                      >
                        {day.label}
                      </span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">
                    <p className="font-semibold">{day.hours.toFixed(1)} hours</p>
                    <p className="text-muted-foreground">{format(parseISO(day.dateKey), "MMM d")}</p>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </TooltipProvider>
      </CardContent>
    </Card>
  );
}
