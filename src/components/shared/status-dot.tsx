import React from "react";
import { cn } from "@/lib/utils";

type StatusColor = "green" | "yellow" | "red" | "blue" | "gray" | "orange" | "purple";

interface StatusDotProps {
  color: StatusColor;
  size?: "sm" | "md" | "lg";
  pulse?: boolean;
  label?: string;
  className?: string;
}

const colorClasses: Record<StatusColor, string> = {
  green: "bg-emerald-500",
  yellow: "bg-yellow-500",
  red: "bg-red-500",
  blue: "bg-blue-500",
  gray: "bg-gray-400",
  orange: "bg-orange-500",
  purple: "bg-purple-500",
};

const pulseClasses: Record<StatusColor, string> = {
  green: "bg-emerald-400",
  yellow: "bg-yellow-400",
  red: "bg-red-400",
  blue: "bg-blue-400",
  gray: "bg-gray-300",
  orange: "bg-orange-400",
  purple: "bg-purple-400",
};

const sizeClasses = {
  sm: "h-2 w-2",
  md: "h-2.5 w-2.5",
  lg: "h-3 w-3",
};

export function StatusDot({
  color,
  size = "md",
  pulse = false,
  label,
  className,
}: StatusDotProps) {
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <span className="relative inline-flex">
        <span
          className={cn(
            "rounded-full",
            sizeClasses[size],
            colorClasses[color]
          )}
        />
        {pulse && (
          <span
            className={cn(
              "absolute inset-0 rounded-full animate-ping opacity-75",
              sizeClasses[size],
              pulseClasses[color]
            )}
          />
        )}
      </span>
      {label && (
        <span className="text-sm text-muted-foreground">{label}</span>
      )}
    </span>
  );
}
