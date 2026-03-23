"use client";

import {
  BarChart3,
  CheckCircle2,
  Clock,
  Smile,
  Flame,
  Lightbulb,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSummary } from "@/lib/hooks/use-summary";
import { useProductivity } from "@/lib/hooks/use-analytics";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

function getScoreColor(score: number): string {
  if (score >= 80) return "text-emerald-600 dark:text-emerald-400";
  if (score >= 60) return "text-blue-600 dark:text-blue-400";
  if (score >= 40) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

function getScoreBg(score: number): string {
  if (score >= 80)
    return "from-emerald-500/10 to-emerald-500/5 border-emerald-500/20";
  if (score >= 60)
    return "from-blue-500/10 to-blue-500/5 border-blue-500/20";
  if (score >= 40)
    return "from-amber-500/10 to-amber-500/5 border-amber-500/20";
  return "from-red-500/10 to-red-500/5 border-red-500/20";
}

const MOCK_INSIGHTS = [
  {
    icon: TrendingUp,
    title: "Productivity Trend",
    text: "Your task completion rate has increased by 15% compared to last week. Keep up the momentum!",
  },
  {
    icon: Clock,
    title: "Focus Time",
    text: "You're most productive between 9 AM and 12 PM. Consider scheduling deep work during these hours.",
  },
  {
    icon: Smile,
    title: "Mood Correlation",
    text: "Higher sleep hours correlate with better mood ratings. Aim for 7-8 hours of sleep consistently.",
  },
];

export default function AnalyticsPage() {
  const { summary, isLoading: summaryLoading } = useSummary();
  const { productivity, isLoading: productivityLoading } = useProductivity();

  const isLoading = summaryLoading || productivityLoading;

  // Calculate a productivity score from available data
  const score = summary
    ? Math.min(
        100,
        Math.round(
          ((summary.completedToday ?? 0) * 10 +
            (summary.currentStreak ?? 0) * 5 +
            (summary.moodAverage ?? 3) * 8) /
            1
        )
      )
    : 0;

  // Weekly task data for bar chart
  const weeklyData =
    productivity?.dailyBreakdown?.slice(-56) ?? [];

  // Group by week
  const weeks: { label: string; tasks: number }[] = [];
  for (let i = 0; i < 8; i++) {
    const weekSlice = weeklyData.slice(i * 7, (i + 1) * 7);
    const total = weekSlice.reduce((s, d) => s + d.tasksCompleted, 0);
    const label = weekSlice.length > 0
      ? `W${i + 1}`
      : `W${i + 1}`;
    weeks.push({ label, tasks: total });
  }
  const maxTasks = Math.max(...weeks.map((w) => w.tasks), 1);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics"
        description="Insights into your productivity and well-being"
      />

      {isLoading ? (
        <div className="space-y-6">
          <Skeleton className="h-48" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
          <Skeleton className="h-64" />
        </div>
      ) : (
        <>
          {/* Productivity Score */}
          <Card
            className={cn(
              "bg-gradient-to-br border-2",
              getScoreBg(score)
            )}
          >
            <CardContent className="py-8 flex flex-col items-center">
              <p className="text-sm font-medium text-muted-foreground mb-2">
                Productivity Score
              </p>
              <p className={cn("text-6xl font-bold tabular-nums", getScoreColor(score))}>
                {score}
              </p>
              <p className="text-sm text-muted-foreground mt-1">out of 100</p>
            </CardContent>
          </Card>

          {/* Stats Grid */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  Tasks Completed
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {summary?.completedToday ?? 0}
                </p>
                <p className="text-xs text-muted-foreground">today</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Clock className="h-4 w-4 text-blue-500" />
                  Hours Tracked
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {((summary?.totalTimeToday ?? 0) / 60).toFixed(1)}h
                </p>
                <p className="text-xs text-muted-foreground">today</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Smile className="h-4 w-4 text-amber-500" />
                  Avg Mood
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {(summary?.moodAverage ?? 0).toFixed(1)}
                </p>
                <p className="text-xs text-muted-foreground">out of 5</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Flame className="h-4 w-4 text-orange-500" />
                  Streak
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {summary?.currentStreak ?? 0}
                </p>
                <p className="text-xs text-muted-foreground">days</p>
              </CardContent>
            </Card>
          </div>

          {/* Weekly Bar Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Tasks Completed per Week
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-3 h-48">
                {weeks.map((week, i) => (
                  <div
                    key={i}
                    className="flex-1 flex flex-col items-center gap-1"
                  >
                    <span className="text-xs font-medium tabular-nums">
                      {week.tasks}
                    </span>
                    <div className="w-full relative">
                      <div
                        className="w-full rounded-t-md bg-primary/80 hover:bg-primary transition-colors"
                        style={{
                          height: `${Math.max((week.tasks / maxTasks) * 160, 4)}px`,
                        }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {week.label}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* AI Insights */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-amber-500" />
                AI Insights
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {MOCK_INSIGHTS.map((insight, i) => {
                  const Icon = insight.icon;
                  return (
                    <div
                      key={i}
                      className="flex gap-3 rounded-lg border p-4 bg-muted/30"
                    >
                      <div className="flex items-center justify-center h-8 w-8 rounded-full bg-primary/10 shrink-0">
                        <Icon className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{insight.title}</p>
                        <p className="text-sm text-muted-foreground mt-0.5">
                          {insight.text}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
