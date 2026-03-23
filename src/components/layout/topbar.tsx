"use client";

import React from "react";
import { Menu, Search, Sun, Moon, Timer } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useSidebar } from "@/lib/contexts/sidebar-context";
import { useTheme } from "@/lib/contexts/theme-context";
import { useTimer } from "@/lib/contexts/timer-context";
import { Breadcrumbs } from "./breadcrumbs";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";

function formatTime(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

export function Topbar() {
  const { setIsOpen } = useSidebar();
  const { theme, toggleTheme } = useTheme();
  const { activeTimer, elapsedSeconds, isRunning, stopTimer } = useTimer();

  return (
    <TooltipProvider delayDuration={0}>
      <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 lg:px-6">
        {/* Mobile menu button */}
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden shrink-0"
          onClick={() => setIsOpen(true)}
        >
          <Menu className="h-5 w-5" />
          <span className="sr-only">Open menu</span>
        </Button>

        {/* Breadcrumbs */}
        <div className="hidden md:flex">
          <Breadcrumbs />
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Right actions */}
        <div className="flex items-center gap-2">
          {/* Search trigger */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="sm" className="hidden sm:flex gap-2 text-muted-foreground">
                <Search className="h-4 w-4" />
                <span className="text-xs">Search...</span>
                <kbd className="pointer-events-none hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
                  <span className="text-xs">⌘</span>K
                </kbd>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Search (Cmd+K)</TooltipContent>
          </Tooltip>

          <Button variant="ghost" size="icon" className="sm:hidden">
            <Search className="h-5 w-5" />
          </Button>

          {/* Active timer */}
          {isRunning && activeTimer && (
            <button
              onClick={stopTimer}
              className={cn(
                "flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium",
                "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20",
                "hover:bg-emerald-500/20 transition-colors animate-pulse"
              )}
            >
              <Timer className="h-3.5 w-3.5" />
              <span className="hidden sm:inline max-w-[120px] truncate">
                {activeTimer.taskName}
              </span>
              <span className="font-mono tabular-nums">
                {formatTime(elapsedSeconds)}
              </span>
            </button>
          )}

          {/* Theme toggle */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={toggleTheme}>
                {theme === "light" ? (
                  <Moon className="h-5 w-5" />
                ) : (
                  <Sun className="h-5 w-5" />
                )}
                <span className="sr-only">Toggle theme</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {theme === "light" ? "Dark mode" : "Light mode"}
            </TooltipContent>
          </Tooltip>

          {/* User avatar */}
          <Avatar className="h-8 w-8 cursor-pointer">
            <AvatarImage src="" alt="User" />
            <AvatarFallback className="bg-indigo-600 text-white text-xs font-semibold">
              TJ
            </AvatarFallback>
          </Avatar>
        </div>
      </header>
    </TooltipProvider>
  );
}
