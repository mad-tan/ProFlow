"use client";

import Link from "next/link";
import { Plus, FolderPlus, Play, SmilePlus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface QuickAction {
  label: string;
  description: string;
  href: string;
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
}

const actions: QuickAction[] = [
  {
    label: "New Task",
    description: "Create a task",
    href: "/tasks?new=true",
    icon: Plus,
    iconColor: "text-blue-600 dark:text-blue-400",
    iconBg: "bg-blue-500/10 dark:bg-blue-500/15",
  },
  {
    label: "New Project",
    description: "Start a project",
    href: "/projects?new=true",
    icon: FolderPlus,
    iconColor: "text-emerald-600 dark:text-emerald-400",
    iconBg: "bg-emerald-500/10 dark:bg-emerald-500/15",
  },
  {
    label: "Start Timer",
    description: "Track your time",
    href: "/time-tracking",
    icon: Play,
    iconColor: "text-purple-600 dark:text-purple-400",
    iconBg: "bg-purple-500/10 dark:bg-purple-500/15",
  },
  {
    label: "Daily Check-in",
    description: "Log your mood",
    href: "/mental-health",
    icon: SmilePlus,
    iconColor: "text-pink-600 dark:text-pink-400",
    iconBg: "bg-pink-500/10 dark:bg-pink-500/15",
  },
];

export function QuickActions() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-2 gap-2">
          {actions.map((action) => (
            <Link
              key={action.label}
              href={action.href}
              className="group flex flex-col items-center gap-2 rounded-xl border border-transparent p-4 text-center transition-all duration-200 hover:border-border hover:bg-muted/50 hover:shadow-sm"
            >
              <div
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-110",
                  action.iconBg
                )}
              >
                <action.icon className={cn("h-5 w-5", action.iconColor)} />
              </div>
              <div>
                <p className="text-sm font-medium">{action.label}</p>
                <p className="text-[10px] text-muted-foreground">{action.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
