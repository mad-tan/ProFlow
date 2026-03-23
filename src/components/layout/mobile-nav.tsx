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
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/lib/contexts/sidebar-context";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Projects", href: "/projects", icon: FolderKanban },
  { label: "Tasks", href: "/tasks", icon: CheckSquare },
  { label: "Time Tracking", href: "/time-tracking", icon: Timer },
  { label: "Mental Health", href: "/mental-health", icon: Brain },
  { label: "Checklists", href: "/checklists", icon: ListChecks },
  { label: "Calendar", href: "/calendar", icon: Calendar },
  { label: "Analytics", href: "/analytics", icon: BarChart3 },
  { label: "Reminders", href: "/reminders", icon: Bell },
  { label: "Audit Log", href: "/audit-log", icon: ScrollText },
  { label: "Settings", href: "/settings", icon: Settings },
];

export function MobileNav() {
  const pathname = usePathname();
  const { isOpen, setIsOpen } = useSidebar();

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetContent side="left" className="w-[280px] p-0 bg-slate-900 border-slate-800">
        <SheetHeader className="px-4 h-16 flex flex-row items-center gap-3 border-b border-slate-800">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 shrink-0">
            <Zap className="h-4 w-4 text-white" />
          </div>
          <SheetTitle className="text-white text-lg font-bold tracking-tight">
            ProFlow
          </SheetTitle>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-64px)]">
          <nav className="flex flex-col gap-1 p-3">
            {navItems.map((item) => {
              const isActive =
                pathname === item.href ||
                pathname.startsWith(item.href + "/");
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                    "hover:bg-slate-800 hover:text-white",
                    isActive
                      ? "bg-indigo-600/20 text-indigo-400 border border-indigo-500/30"
                      : "text-slate-400 border border-transparent"
                  )}
                >
                  <Icon
                    className={cn(
                      "h-5 w-5 shrink-0",
                      isActive ? "text-indigo-400" : "text-slate-500"
                    )}
                  />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
