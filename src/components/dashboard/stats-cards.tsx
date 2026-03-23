"use client";

import {
  FolderOpen,
  CheckCircle2,
  Trophy,
  Clock,
  Flame,
  Heart,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useSummary } from "@/lib/hooks/use-summary";

interface StatCardProps {
  icon: React.ElementType;
  label: string;
  value: string | number;
  trend?: number;
  iconColor: string;
  iconBg: string;
}

function StatCard({ icon: Icon, label, value, trend, iconColor, iconBg }: StatCardProps) {
  return (
    <Card className="group relative overflow-hidden transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{label}</p>
            <p className="text-2xl font-bold tracking-tight">{value}</p>
          </div>
          <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg", iconBg)}>
            <Icon className={cn("h-5 w-5", iconColor)} />
          </div>
        </div>
        {trend !== undefined && (
          <div className="mt-3 flex items-center gap-1 text-xs">
            {trend >= 0 ? (
              <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
            ) : (
              <TrendingDown className="h-3.5 w-3.5 text-red-500" />
            )}
            <span className={cn("font-medium", trend >= 0 ? "text-emerald-500" : "text-red-500")}>
              {trend >= 0 ? "+" : ""}
              {trend}%
            </span>
            <span className="text-muted-foreground">vs last week</span>
          </div>
        )}
      </CardContent>
      <div
        className={cn(
          "absolute bottom-0 left-0 right-0 h-0.5 opacity-0 transition-opacity duration-200 group-hover:opacity-100",
          iconBg.replace("bg-", "bg-").replace("/10", "").replace("/15", "")
        )}
      />
    </Card>
  );
}

function StatCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-16" />
          </div>
          <Skeleton className="h-10 w-10 rounded-lg" />
        </div>
        <div className="mt-3">
          <Skeleton className="h-3.5 w-32" />
        </div>
      </CardContent>
    </Card>
  );
}

function formatMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

export function StatsCards() {
  const { summary, isLoading } = useSummary();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  const stats: StatCardProps[] = [
    {
      icon: FolderOpen,
      label: "Active Projects",
      value: summary?.totalProjects ?? 0,
      trend: 12,
      iconColor: "text-blue-600 dark:text-blue-400",
      iconBg: "bg-blue-500/10 dark:bg-blue-500/15",
    },
    {
      icon: CheckCircle2,
      label: "Tasks Due Today",
      value: summary?.activeTasks ?? 0,
      trend: -5,
      iconColor: "text-orange-600 dark:text-orange-400",
      iconBg: "bg-orange-500/10 dark:bg-orange-500/15",
    },
    {
      icon: Trophy,
      label: "Completed Today",
      value: summary?.completedToday ?? 0,
      trend: 23,
      iconColor: "text-emerald-600 dark:text-emerald-400",
      iconBg: "bg-emerald-500/10 dark:bg-emerald-500/15",
    },
    {
      icon: Clock,
      label: "Time Tracked",
      value: formatMinutes(summary?.totalTimeToday ?? 0),
      trend: 8,
      iconColor: "text-purple-600 dark:text-purple-400",
      iconBg: "bg-purple-500/10 dark:bg-purple-500/15",
    },
    {
      icon: Flame,
      label: "Current Streak",
      value: `${summary?.currentStreak ?? 0}d`,
      trend: 0,
      iconColor: "text-red-600 dark:text-red-400",
      iconBg: "bg-red-500/10 dark:bg-red-500/15",
    },
    {
      icon: Heart,
      label: "Mood Score",
      value: `${(summary?.moodAverage ?? 0).toFixed(1)}/5`,
      trend: 4,
      iconColor: "text-pink-600 dark:text-pink-400",
      iconBg: "bg-pink-500/10 dark:bg-pink-500/15",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {stats.map((stat) => (
        <StatCard key={stat.label} {...stat} />
      ))}
    </div>
  );
}
