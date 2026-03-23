"use client";

import { cn } from "@/lib/utils";

interface TimerDisplayProps {
  seconds: number;
  className?: string;
  size?: "sm" | "md" | "lg";
}

function formatTime(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;
  return [hours, minutes, secs].map((v) => String(v).padStart(2, "0")).join(":");
}

export function TimerDisplay({ seconds, className, size = "lg" }: TimerDisplayProps) {
  const formatted = formatTime(seconds);
  const [hh, mm, ss] = formatted.split(":");

  const sizeClasses = {
    sm: "text-2xl",
    md: "text-4xl",
    lg: "text-6xl lg:text-7xl",
  };

  return (
    <div className={cn("font-mono tabular-nums tracking-wider select-none", sizeClasses[size], className)}>
      <span className="text-foreground">{hh}</span>
      <span className="text-muted-foreground/60 animate-pulse">:</span>
      <span className="text-foreground">{mm}</span>
      <span className="text-muted-foreground/60 animate-pulse">:</span>
      <span className="text-foreground">{ss}</span>
    </div>
  );
}
