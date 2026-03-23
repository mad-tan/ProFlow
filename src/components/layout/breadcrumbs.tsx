"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";
import { cn } from "@/lib/utils";

const labelMap: Record<string, string> = {
  dashboard: "Dashboard",
  projects: "Projects",
  tasks: "Tasks",
  "time-tracking": "Time Tracking",
  "mental-health": "Mental Health",
  checklists: "Checklists",
  calendar: "Calendar",
  analytics: "Analytics",
  reminders: "Reminders",
  "audit-log": "Audit Log",
  settings: "Settings",
  new: "New",
  edit: "Edit",
};

function formatSegment(segment: string): string {
  return (
    labelMap[segment] ??
    segment
      .replace(/-/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase())
  );
}

export function Breadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  if (segments.length === 0) return null;

  const crumbs = segments.map((segment, index) => {
    const href = "/" + segments.slice(0, index + 1).join("/");
    const label = formatSegment(segment);
    const isLast = index === segments.length - 1;

    return { href, label, isLast };
  });

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm">
      <Link
        href="/dashboard"
        className="text-muted-foreground hover:text-foreground transition-colors"
      >
        <Home className="h-4 w-4" />
      </Link>
      {crumbs.map((crumb) => (
        <React.Fragment key={crumb.href}>
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />
          {crumb.isLast ? (
            <span className="font-medium text-foreground">{crumb.label}</span>
          ) : (
            <Link
              href={crumb.href}
              className={cn(
                "text-muted-foreground hover:text-foreground transition-colors"
              )}
            >
              {crumb.label}
            </Link>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
}
