"use client";

import React from "react";
import {
  BarChart3,
  CheckCircle2,
  Clock,
  Smile,
  Flame,
  Lightbulb,
  TrendingUp,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSummary } from "@/lib/hooks/use-summary";
import { useProductivity, useMentalHealthTrends } from "@/lib/hooks/use-analytics";
import type { DashboardSummary, ProductivityMetrics, MentalHealthTrends } from "@/lib/hooks/use-analytics";
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

interface Insight {
  icon: React.ElementType;
  title: string;
  text: string;
}

function generateInsights(
  summary: DashboardSummary | undefined,
  productivity: ProductivityMetrics | undefined,
  trends: MentalHealthTrends | undefined
): Insight[] {
  const insights: Insight[] = [];

  if (!summary && !productivity && !trends) return insights;

  // Task completion insight
  if (productivity) {
    const rate = productivity.tasksCreated > 0
      ? Math.round((productivity.tasksCompleted / productivity.tasksCreated) * 100)
      : 0;
    if (rate >= 70) {
      insights.push({
        icon: TrendingUp,
        title: "Strong Completion Rate",
        text: `You've completed ${productivity.tasksCompleted} of ${productivity.tasksCreated} tasks (${rate}%) in this period. Excellent consistency!`,
      });
    } else if (productivity.tasksCreated > 0) {
      insights.push({
        icon: TrendingUp,
        title: "Task Completion",
        text: `You've completed ${productivity.tasksCompleted} of ${productivity.tasksCreated} tasks (${rate}%) so far. Try closing out smaller tasks first to build momentum.`,
      });
    }
  }

  // Time tracking insight
  if (summary) {
    const hoursToday = Math.round(summary.totalTimeToday / 60 * 10) / 10;
    const hoursThisWeek = Math.round((productivity?.totalTimeTrackedMinutes ?? 0) / 60 * 10) / 10;
    if (hoursToday >= 4) {
      insights.push({
        icon: Clock,
        title: "Solid Focus Time",
        text: `You've tracked ${hoursToday}h today and ${hoursThisWeek}h this period. Strong focus sessions — remember to take regular breaks.`,
      });
    } else if (hoursToday > 0) {
      insights.push({
        icon: Clock,
        title: "Time Tracking",
        text: `You've tracked ${hoursToday}h today. Consistent time tracking helps you understand where your energy goes and spot patterns.`,
      });
    } else {
      insights.push({
        icon: Clock,
        title: "Start Tracking Time",
        text: `No time tracked today yet. Use the timer to measure focus sessions — even 25-minute blocks add up significantly.`,
      });
    }
  }

  // Mood / mental health insight
  if (trends && trends.averageMood > 0) {
    const avgMood = Math.round(trends.averageMood * 10) / 10;
    const avgEnergy = Math.round(trends.averageEnergy * 10) / 10;
    const avgStress = Math.round(trends.averageStress * 10) / 10;
    if (avgMood >= 4) {
      insights.push({
        icon: Smile,
        title: "Positive Mood Trend",
        text: `Your average mood is ${avgMood}/5 with energy at ${avgEnergy}/5. You're in a great headspace — a good time to tackle challenging work.`,
      });
    } else if (avgStress >= 4) {
      insights.push({
        icon: Smile,
        title: "High Stress Detected",
        text: `Your stress level is averaging ${avgStress}/5. Consider breaking large tasks into smaller steps and scheduling short recovery breaks.`,
      });
    } else if (avgMood > 0) {
      insights.push({
        icon: Smile,
        title: "Wellbeing Check",
        text: `Average mood: ${avgMood}/5, energy: ${avgEnergy}/5, stress: ${avgStress}/5. Keep logging daily check-ins to track your trends over time.`,
      });
    }
  } else if (summary && summary.moodAverage > 0) {
    insights.push({
      icon: Smile,
      title: "Mood Tracking",
      text: `Your average mood is ${Math.round(summary.moodAverage * 10) / 10}/5. Log daily check-ins on the Mental Health page to build a fuller picture.`,
    });
  }

  // Streak insight
  if (summary && summary.currentStreak >= 3) {
    insights.push({
      icon: Flame,
      title: `${summary.currentStreak}-Day Streak`,
      text: `You've been active ${summary.currentStreak} days in a row. Consistency compounds — keep the streak alive!`,
    });
  }

  // Overdue warning (from productivity top projects)
  if (productivity?.topProjects && productivity.topProjects.length > 0) {
    const topProject = productivity.topProjects[0];
    insights.push({
      icon: Zap,
      title: "Top Project",
      text: `Your most active project is **${topProject.projectName}** with ${topProject.tasksCompleted} tasks completed and ${Math.round(topProject.minutesTracked / 60 * 10) / 10}h tracked.`,
    });
  }

  return insights.slice(0, 4);
}

export default function AnalyticsPage() {
  const { summary, isLoading: summaryLoading } = useSummary();
  const { productivity, isLoading: productivityLoading } = useProductivity();
  const { trends, isLoading: trendsLoading } = useMentalHealthTrends();

  const isLoading = summaryLoading || productivityLoading || trendsLoading;

  // Normalized productivity score (0-100):
  // 50% = task completion rate, 30% = time tracked today (cap 8h), 20% = mood (cap 5)
  const score = summary
    ? Math.min(
        100,
        Math.round(
          (Math.min(summary.completedToday, 10) / 10) * 50 +
          (Math.min(summary.totalTimeToday, 480) / 480) * 30 +
          ((summary.moodAverage ?? 0) / 5) * 20
        )
      )
    : 0;

  const insights = generateInsights(summary, productivity, trends);

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

          {/* Insights */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-amber-500" />
                Insights
              </CardTitle>
            </CardHeader>
            <CardContent>
              {insights.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Complete some tasks, track time, and log your mood to unlock personalized insights.
                </p>
              ) : (
                <div className="space-y-4">
                  {insights.map((insight, i) => {
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
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
