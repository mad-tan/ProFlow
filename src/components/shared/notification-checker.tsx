"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { Bell, Clock } from "lucide-react";

const NOTIFIED_KEY = "proflow_notified_ids";
const CHECK_INTERVAL = 60_000; // 1 minute

function getNotifiedIds(): Set<string> {
  try {
    const raw = localStorage.getItem(NOTIFIED_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function addNotifiedId(id: string) {
  try {
    const ids = getNotifiedIds();
    ids.add(id);
    // Keep only last 200 to avoid unbounded growth
    const arr = Array.from(ids).slice(-200);
    localStorage.setItem(NOTIFIED_KEY, JSON.stringify(arr));
  } catch {}
}

export function NotificationChecker() {
  const lastMoodPrompt = useRef<string | null>(null);

  async function checkReminders() {
    try {
      const res = await fetch("/api/reminders");
      if (!res.ok) return;
      const json = await res.json();
      const reminders: Array<{ id: string; title: string; description?: string; remindAt: string; isActive: boolean }> =
        json.data ?? [];

      const now = Date.now();
      const notified = getNotifiedIds();

      for (const r of reminders) {
        if (!r.isActive) continue;
        if (notified.has(r.id)) continue;

        const remindTime = new Date(r.remindAt).getTime();
        const diffMs = remindTime - now;

        // Fire if within next 5 minutes OR already past (up to 1h ago)
        if (diffMs <= 5 * 60 * 1000 && diffMs >= -60 * 60 * 1000) {
          addNotifiedId(r.id);
          toast(r.title, {
            description: r.description || new Date(r.remindAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            icon: <Bell className="h-4 w-4 text-amber-500" />,
            duration: 8000,
          });
        }
      }
    } catch {}
  }

  async function checkDueTasks() {
    try {
      const today = new Date().toISOString().split("T")[0];
      const res = await fetch(`/api/tasks?dueDate=${today}`);
      if (!res.ok) return;
      const json = await res.json();
      const tasks: Array<{ id: string; title: string; status: string; dueDate: string }> =
        json.data ?? [];

      const overdueTasks = tasks.filter(
        (t) => t.status !== "done" && t.status !== "cancelled" && t.dueDate <= today
      );

      if (overdueTasks.length > 0) {
        const notified = getNotifiedIds();
        const key = `due-tasks-${today}`;
        if (!notified.has(key)) {
          addNotifiedId(key);
          toast(
            overdueTasks.length === 1
              ? `"${overdueTasks[0].title}" is due today`
              : `${overdueTasks.length} tasks are due today`,
            {
              description: overdueTasks.length > 1 ? overdueTasks.slice(0, 3).map(t => t.title).join(", ") + (overdueTasks.length > 3 ? "…" : "") : undefined,
              icon: <Clock className="h-4 w-4 text-orange-500" />,
              duration: 6000,
            }
          );
        }
      }
    } catch {}
  }

  async function checkMoodPrompt() {
    // Prompt once per day if no mood logged today
    const today = new Date().toISOString().split("T")[0];
    if (lastMoodPrompt.current === today) return;

    try {
      const res = await fetch("/api/mental-health/check-ins");
      if (!res.ok) return;
      const json = await res.json();
      const checkIns: Array<{ date: string }> = json.data ?? [];
      const hasToday = checkIns.some((c) => c.date === today);

      if (!hasToday) {
        const hour = new Date().getHours();
        // Only prompt in the afternoon (after 3pm)
        if (hour >= 15) {
          lastMoodPrompt.current = today;
          toast("How are you feeling today?", {
            description: "Log your mood in Mental Health",
            icon: <span className="text-lg">😊</span>,
            duration: 8000,
            action: {
              label: "Log Mood",
              onClick: () => { window.location.href = "/mental-health"; },
            },
          });
        }
      }
    } catch {}
  }

  useEffect(() => {
    // Initial check after a short delay so the page settles first
    const initialTimer = setTimeout(() => {
      checkReminders();
      checkDueTasks();
      checkMoodPrompt();
    }, 3000);

    const interval = setInterval(() => {
      checkReminders();
      checkDueTasks();
      checkMoodPrompt();
    }, CHECK_INTERVAL);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, []);

  return null;
}
