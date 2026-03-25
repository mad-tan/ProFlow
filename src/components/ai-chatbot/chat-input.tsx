"use client";

import React, { useState, useRef } from "react";
import { SendHorizontal, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useChatbot } from "@/lib/contexts/chatbot-context";
import { useTimer } from "@/lib/contexts/timer-context";
import { cn } from "@/lib/utils";
import { useSWRConfig } from "swr";

interface ChatInputProps {
  externalValue?: string;
  onExternalValueUsed?: () => void;
}

// Maps action types to SWR cache keys to revalidate
const CACHE_INVALIDATION_MAP: Record<string, string[]> = {
  create_task: ["/api/tasks", "/api/analytics/summary"],
  delete_task: ["/api/tasks", "/api/analytics/summary"],
  complete_task: ["/api/tasks", "/api/analytics/summary"],
  create_project: ["/api/projects", "/api/analytics/summary"],
  set_reminder: ["/api/reminders"],
  start_timer: ["/api/time-entries", "/api/time-entries/active"],
  stop_timer: ["/api/time-entries", "/api/time-entries/active", "/api/analytics/summary"],
  create_checklist: ["/api/checklists"],
  show_summary: ["/api/analytics/summary"],
};

export function ChatInput({ externalValue, onExternalValueUsed }: ChatInputProps) {
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { addMessage, pendingIntent, setPendingIntent } = useChatbot();
  const { startTimer: startTimerUI, stopTimer: stopTimerUI } = useTimer();
  const { mutate } = useSWRConfig();

  React.useEffect(() => {
    if (externalValue) {
      setInput(externalValue);
      onExternalValueUsed?.();
      inputRef.current?.focus();
    }
  }, [externalValue, onExternalValueUsed]);

  const invalidateCaches = (actionType: string) => {
    const keys = CACHE_INVALIDATION_MAP[actionType] || [];
    keys.forEach((key) => {
      mutate((k: string) => typeof k === "string" && k.startsWith(key), undefined, { revalidate: true });
    });
  };

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    setInput("");
    addMessage({ role: "user", content: trimmed });
    setIsLoading(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: trimmed,
          pendingIntent: pendingIntent ?? undefined,
        }),
      });

      if (!res.ok) throw new Error("Failed to get response");

      const json = await res.json();
      // Response is wrapped: { success, data: { role, content, action?, pendingIntent? } }
      const data = json.data;

      addMessage({
        role: "assistant",
        content: data?.content ?? "Sorry, I could not process that.",
      });

      // Update pending intent (null clears it, undefined means not set)
      if ("pendingIntent" in data) {
        setPendingIntent(data.pendingIntent ?? null);
      }

      // Handle completed actions
      if (data?.action) {
        const { type, success } = data.action;

        if (success) {
          invalidateCaches(type);

          // Sync timer UI context with DB state
          if (type === "start_timer" && data.action.data) {
            const entry = data.action.data as { description?: string | null };
            startTimerUI({
              taskId: "chatbot-timer",
              taskName: entry.description || "Timer",
            });
          } else if (type === "stop_timer") {
            stopTimerUI();
          }
        }
      }
    } catch {
      addMessage({
        role: "assistant",
        content: "Sorry, something went wrong. Please try again.",
      });
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Show contextual placeholder when in a conversation flow
  const placeholder = pendingIntent
    ? `Replying to: ${pendingIntent.type.replace(/_/g, " ")}...`
    : "Ask me anything...";

  return (
    <div className="flex flex-col border-t border-gray-200 bg-white/80 backdrop-blur-sm dark:border-gray-700 dark:bg-gray-900/80">
      {/* Pending intent indicator */}
      {pendingIntent && (
        <div className="flex items-center justify-between px-4 py-1.5 bg-indigo-50 dark:bg-indigo-900/20 border-b border-indigo-100 dark:border-indigo-800/30">
          <span className="text-xs text-indigo-600 dark:text-indigo-400">
            Collecting info for: <strong>{pendingIntent.type.replace(/_/g, " ")}</strong>
          </span>
          <button
            onClick={() => {
              setPendingIntent(null);
              addMessage({ role: "assistant", content: "Cancelled. What else can I help you with?" });
            }}
            className="text-xs text-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-300 underline"
          >
            cancel
          </button>
        </div>
      )}

      <div className="flex items-center gap-2 px-4 py-3">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={isLoading}
          className={cn(
            "flex-1 rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none",
            "placeholder:text-gray-400 transition-all duration-200",
            "focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-500/20",
            "dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500",
            "dark:focus:border-indigo-500 dark:focus:bg-gray-800 dark:focus:ring-indigo-500/30",
            "disabled:opacity-50"
          )}
        />
        <Button
          onClick={handleSend}
          disabled={!input.trim() || isLoading}
          size="icon"
          className={cn(
            "h-10 w-10 shrink-0 rounded-xl transition-all duration-200",
            "bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md",
            "hover:from-indigo-600 hover:to-purple-700 hover:shadow-lg hover:shadow-indigo-500/25",
            "disabled:opacity-40 disabled:shadow-none"
          )}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <SendHorizontal className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}
