"use client";

import {
  FolderOpen,
  CheckCircle2,
  Trophy,
  Clock,
  Flame,
  Heart,
} from "lucide-react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useSummary } from "@/lib/hooks/use-summary";

interface StatCardProps {
  icon: React.ElementType;
  label: string;
  value: string | number;
  iconColor: string;
  iconBg: string;
  href: string;
}

function StatCard({ icon: Icon, label, value, iconColor, iconBg, href }: StatCardProps) {
  return (
    <Link href={href} className="block">
      <Card className="group relative overflow-hidden transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 cursor-pointer">
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
        </CardContent>
      </Card>
    </Link>
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
      value: summary?.activeProjects ?? 0,
      iconColor: "text-blue-600 dark:text-blue-400",
      iconBg: "bg-blue-500/10 dark:bg-blue-500/15",
      href: "/projects",
    },
    {
      icon: CheckCircle2,
      label: "Active Tasks",
      value: summary?.activeTasks ?? 0,
      iconColor: "text-orange-600 dark:text-orange-400",
      iconBg: "bg-orange-500/10 dark:bg-orange-500/15",
      href: "/tasks",
    },
    {
      icon: Trophy,
      label: "Completed Today",
      value: summary?.completedToday ?? 0,
      iconColor: "text-emerald-600 dark:text-emerald-400",
      iconBg: "bg-emerald-500/10 dark:bg-emerald-500/15",
      href: "/tasks?status=done",
    },
    {
      icon: Clock,
      label: "Time Today",
      value: formatMinutes(summary?.totalTimeToday ?? 0),
      iconColor: "text-purple-600 dark:text-purple-400",
      iconBg: "bg-purple-500/10 dark:bg-purple-500/15",
      href: "/time-tracking",
    },
    {
      icon: Flame,
      label: "Current Streak",
      value: `${summary?.currentStreak ?? 0}d`,
      iconColor: "text-red-600 dark:text-red-400",
      iconBg: "bg-red-500/10 dark:bg-red-500/15",
      href: "/analytics",
    },
    {
      icon: Heart,
      label: "Mood Score",
      value: summary?.moodAverage ? `${summary.moodAverage.toFixed(1)}/5` : "—",
      iconColor: "text-pink-600 dark:text-pink-400",
      iconBg: "bg-pink-500/10 dark:bg-pink-500/15",
      href: "/mental-health",
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
