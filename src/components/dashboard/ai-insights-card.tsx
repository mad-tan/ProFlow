"use client";

import { Brain, Sparkles, TrendingUp, AlertCircle, Lightbulb } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface Insight {
  icon: React.ElementType;
  text: string;
  type: "positive" | "warning" | "suggestion";
}

const insights: Insight[] = [
  {
    icon: TrendingUp,
    text: "Your productivity peaks on Tuesdays and Thursdays. Schedule deep work on those days.",
    type: "positive",
  },
  {
    icon: AlertCircle,
    text: "Stress levels have been rising this week. Consider taking short breaks between tasks.",
    type: "warning",
  },
  {
    icon: Lightbulb,
    text: "You complete 40% more tasks when you start with a daily check-in. Keep the habit going!",
    type: "suggestion",
  },
];

const typeStyles: Record<Insight["type"], { dot: string; bg: string }> = {
  positive: {
    dot: "bg-emerald-500",
    bg: "bg-emerald-50 dark:bg-emerald-950/20",
  },
  warning: {
    dot: "bg-amber-500",
    bg: "bg-amber-50 dark:bg-amber-950/20",
  },
  suggestion: {
    dot: "bg-blue-500",
    bg: "bg-blue-50 dark:bg-blue-950/20",
  },
};

export function AIInsightsCard() {
  return (
    <Card className="relative overflow-hidden">
      <div className="absolute top-0 right-0 h-32 w-32 bg-gradient-to-bl from-purple-500/5 to-transparent dark:from-purple-500/10 rounded-bl-full" />
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-purple-500 to-indigo-600">
            <Brain className="h-3.5 w-3.5 text-white" />
          </div>
          <CardTitle className="text-base font-semibold">AI Insights</CardTitle>
          <Sparkles className="ml-auto h-4 w-4 text-purple-500/60" />
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-3">
          {insights.map((insight, index) => {
            const styles = typeStyles[insight.type];
            return (
              <div
                key={index}
                className={cn(
                  "flex items-start gap-3 rounded-lg p-3 transition-colors",
                  styles.bg
                )}
              >
                <span className={cn("mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full", styles.dot)} />
                <p className="text-sm leading-relaxed text-foreground/80">{insight.text}</p>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
