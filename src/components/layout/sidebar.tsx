"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FolderKanban,
  CheckSquare,
  Timer,
  Brain,
  ListChecks,
  Calendar,
  BarChart3,
  Bell,
  ScrollText,
  Settings,
  ChevronsLeft,
  ChevronsRight,
  Zap,
  StickyNote,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/lib/contexts/sidebar-context";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Projects", href: "/projects", icon: FolderKanban },
  { label: "Tasks", href: "/tasks", icon: CheckSquare },
  { label: "Time Tracking", href: "/time-tracking", icon: Timer },
  { label: "Mental Health", href: "/mental-health", icon: Brain },
  { label: "Checklists", href: "/checklists", icon: ListChecks },
  { label: "Calendar", href: "/calendar", icon: Calendar },
  { label: "Analytics", href: "/analytics", icon: BarChart3 },
  { label: "Notes", href: "/notes", icon: StickyNote },
  { label: "Reminders", href: "/reminders", icon: Bell },
  { label: "Audit Log", href: "/audit-log", icon: ScrollText },
  { label: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { isCollapsed, toggleCollapsed } = useSidebar();

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          "hidden lg:flex flex-col h-screen bg-slate-900 text-slate-300 border-r border-slate-800 transition-all duration-300 ease-in-out",
          isCollapsed ? "w-[68px]" : "w-[240px]"
        )}
      >
        {/* Logo — taller on iOS to clear the status bar */}
        <div
          className={cn(
            "flex items-center px-4 border-b border-slate-800 shrink-0",
            isCollapsed ? "justify-center" : "gap-3"
          )}
          style={{
            paddingTop: "env(safe-area-inset-top, 0px)",
            minHeight: "calc(4rem + env(safe-area-inset-top, 0px))",
          }}
        >
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 shrink-0">
            <Zap className="h-4 w-4 text-white" />
          </div>
          {!isCollapsed && (
            <span className="text-lg font-bold text-white tracking-tight">
              ProFlow
            </span>
          )}
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1 py-4">
          <nav className="flex flex-col gap-1 px-3">
            {navItems.map((item) => {
              const isActive =
                pathname === item.href ||
                pathname.startsWith(item.href + "/");
              const Icon = item.icon;

              const linkContent = (
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                    "hover:bg-slate-800 hover:text-white",
                    isActive
                      ? "bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 shadow-sm shadow-indigo-500/10"
                      : "text-slate-400 border border-transparent",
                    isCollapsed && "justify-center px-2"
                  )}
                >
                  <Icon
                    className={cn(
                      "h-5 w-5 shrink-0 transition-colors",
                      isActive ? "text-indigo-400" : "text-slate-500"
                    )}
                  />
                  {!isCollapsed && <span>{item.label}</span>}
                </Link>
              );

              if (isCollapsed) {
                return (
                  <Tooltip key={item.href}>
                    <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                    <TooltipContent side="right" className="font-medium">
                      {item.label}
                    </TooltipContent>
                  </Tooltip>
                );
              }

              return (
                <React.Fragment key={item.href}>{linkContent}</React.Fragment>
              );
            })}
          </nav>
        </ScrollArea>

        {/* Collapse Toggle */}
        <div className="shrink-0 border-t border-slate-800 p-3">
          <button
            onClick={toggleCollapsed}
            className="flex items-center justify-center w-full gap-2 rounded-lg px-3 py-2 text-sm text-slate-500 hover:bg-slate-800 hover:text-slate-300 transition-colors"
          >
            {isCollapsed ? (
              <ChevronsRight className="h-4 w-4" />
            ) : (
              <>
                <ChevronsLeft className="h-4 w-4" />
                <span>Collapse</span>
              </>
            )}
          </button>
        </div>
      </aside>
    </TooltipProvider>
  );
}
