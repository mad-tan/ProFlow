"use client";

import { useMemo, useEffect, useState } from "react";
import { StatsCards } from "@/components/dashboard/stats-cards";
import { RecentTasks } from "@/components/dashboard/recent-tasks";
import { UpcomingDeadlines } from "@/components/dashboard/upcoming-deadlines";
import { ActiveTimer } from "@/components/dashboard/active-timer";
import { MoodSnapshot } from "@/components/dashboard/mood-snapshot";
import { ProductivityChart } from "@/components/dashboard/productivity-chart";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { AIInsightsCard } from "@/components/dashboard/ai-insights-card";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default function DashboardPage() {
  const greeting = useMemo(() => getGreeting(), []);
  const [userName, setUserName] = useState("");

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((json) => { if (json.success) setUserName(json.data.name); })
      .catch(() => {});
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {greeting}{userName ? `, ${userName}` : ""}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Here&apos;s what&apos;s happening with your work today.
        </p>
      </div>

      {/* Stats Overview */}
      <StatsCards />

      {/* Main Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column */}
        <div className="space-y-6 lg:col-span-8">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <ProductivityChart />
            <ActiveTimer />
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <RecentTasks />
            <UpcomingDeadlines />
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6 lg:col-span-4">
          <QuickActions />
          <MoodSnapshot />
          <AIInsightsCard />
        </div>
      </div>
    </div>
  );
}
