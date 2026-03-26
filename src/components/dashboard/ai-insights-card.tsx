"use client";

import { Brain, Sparkles, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import useSWR from "swr";

interface Insight {
  type: "positive" | "warning" | "suggestion";
  title: string;
  message: string;
}

interface InsightsResponse {
  insights: Insight[];
  source: "ai" | "computed";
}

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

const fetcher = (url: string) =>
  fetch(url).then((res) => {
    if (!res.ok) throw new Error("Failed to fetch insights");
    return res.json().then((d) => d.data as InsightsResponse);
  });

export function AIInsightsCard() {
  const { data, isLoading, error, mutate } = useSWR<InsightsResponse>(
    "/api/ai/insights",
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 5 * 60 * 1000 }
  );

  return (
    <Card className="relative overflow-hidden">
      <div className="absolute top-0 right-0 h-32 w-32 bg-gradient-to-bl from-purple-500/5 to-transparent dark:from-purple-500/10 rounded-bl-full" />
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-purple-500 to-indigo-600">
            <Brain className="h-3.5 w-3.5 text-white" />
          </div>
          <CardTitle className="text-base font-semibold">AI Insights</CardTitle>
          <div className="ml-auto flex items-center gap-1.5">
            {data?.source === "ai" && (
              <span className="text-xs text-purple-500/70 font-medium">AI</span>
            )}
            <Sparkles className="h-4 w-4 text-purple-500/60" />
            <button
              onClick={() => mutate()}
              className="rounded p-0.5 text-muted-foreground hover:text-foreground transition-colors"
              title="Refresh insights"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", isLoading && "animate-spin")} />
            </button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-14 rounded-lg bg-muted/40 animate-pulse" />
            ))}
          </div>
        )}
        {error && !isLoading && (
          <p className="text-sm text-muted-foreground text-center py-4">
            Could not load insights.{" "}
            <button
              onClick={() => mutate()}
              className="underline hover:text-foreground"
            >
              Retry
            </button>
          </p>
        )}
        {data && !isLoading && (
          <div className="space-y-3">
            {data.insights.map((insight, index) => {
              const styles = typeStyles[insight.type];
              return (
                <div
                  key={index}
                  className={cn(
                    "flex items-start gap-3 rounded-lg p-3 transition-colors",
                    styles.bg
                  )}
                >
                  <span
                    className={cn(
                      "mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full",
                      styles.dot
                    )}
                  />
                  <div className="space-y-0.5">
                    <p className="text-xs font-semibold text-foreground/70 uppercase tracking-wide">
                      {insight.title}
                    </p>
                    <p className="text-sm leading-relaxed text-foreground/80">
                      {insight.message}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
