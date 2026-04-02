"use client";

import React, { useState, useRef } from "react";
import { SendHorizontal, Loader2, Paperclip, X } from "lucide-react";
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
  update_task: ["/api/tasks", "/api/analytics/summary"],
  delete_task: ["/api/tasks", "/api/analytics/summary"],
  complete_task: ["/api/tasks", "/api/analytics/summary"],
  create_project: ["/api/projects", "/api/analytics/summary"],
  delete_project: ["/api/projects", "/api/analytics/summary"],
  set_reminder: ["/api/reminders"],
  delete_reminder: ["/api/reminders"],
  start_timer: ["/api/time-entries", "/api/time-entries/active"],
  stop_timer: ["/api/time-entries", "/api/time-entries/active", "/api/analytics/summary"],
  create_checklist: ["/api/checklists"],
  add_checklist_item: ["/api/checklists"],
  log_mood: ["/api/mental-health/check-ins", "/api/analytics/summary"],
  write_journal: ["/api/mental-health/journal"],
  show_summary: ["/api/analytics/summary"],
  bulk_create_tasks: ["/api/tasks", "/api/analytics/summary"],
};

export function ChatInput({ externalValue, onExternalValueUsed }: ChatInputProps) {
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [attachedFile, setAttachedFile] = useState<{ name: string; content: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { addMessage, pendingIntent, setPendingIntent, isOpen } = useChatbot();
  const { startTimer: startTimerUI, stopTimer: stopTimerUI } = useTimer();
  const { mutate } = useSWRConfig();

  React.useEffect(() => {
    if (externalValue) {
      setInput(externalValue);
      onExternalValueUsed?.();
      inputRef.current?.focus();
    }
  }, [externalValue, onExternalValueUsed]);

  // Auto-focus input whenever the chatbot opens
  React.useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const invalidateCaches = (actionType: string) => {
    const keys = CACHE_INVALIDATION_MAP[actionType] || [];
    keys.forEach((key) => {
      mutate((k: string) => typeof k === "string" && k.startsWith(key), undefined, { revalidate: true });
    });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Accept text-based files up to 5MB
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      addMessage({ role: "assistant", content: "File is too large. Please upload files under 5MB." });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setAttachedFile({ name: file.name, content: reader.result as string });
    };
    reader.readAsText(file);
    // Reset input so same file can be re-selected
    e.target.value = "";
  };

  const handleSend = async () => {
    const trimmed = input.trim();
    if ((!trimmed && !attachedFile) || isLoading) return;

    const displayMsg = attachedFile
      ? `${trimmed || "Generate tasks from this"}\n📎 ${attachedFile.name}`
      : trimmed;

    setInput("");
    const fileContent = attachedFile?.content ?? undefined;
    const fileName = attachedFile?.name ?? undefined;
    setAttachedFile(null);
    addMessage({ role: "user", content: displayMsg });
    setIsLoading(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: trimmed || "Generate tasks from the attached file",
          pendingIntent: pendingIntent ?? undefined,
          fileContent,
          fileName,
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
      // Defer focus so React re-enables the input first (it's disabled during loading)
      setTimeout(() => inputRef.current?.focus(), 50);
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

      {/* Attached file indicator */}
      {attachedFile && (
        <div className="flex items-center justify-between px-4 py-1.5 bg-emerald-50 dark:bg-emerald-900/20 border-b border-emerald-100 dark:border-emerald-800/30">
          <span className="text-xs text-emerald-600 dark:text-emerald-400 truncate">
            <Paperclip className="inline h-3 w-3 mr-1" />
            {attachedFile.name}
          </span>
          <button
            onClick={() => setAttachedFile(null)}
            className="text-xs text-emerald-400 hover:text-emerald-600 dark:hover:text-emerald-300 ml-2"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      <div className="flex items-center gap-2 px-4 py-3">
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".txt,.md,.csv,.json,.sql,.log,.xml,.html,.js,.ts,.py,.doc,.docx,.pdf"
          onChange={handleFileSelect}
          className="hidden"
        />
        {/* Attach file button */}
        <Button
          onClick={() => fileInputRef.current?.click()}
          disabled={isLoading}
          size="icon"
          variant="ghost"
          className="h-10 w-10 shrink-0 rounded-xl text-gray-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all duration-200 disabled:opacity-40"
          title="Attach a file"
        >
          <Paperclip className="h-4 w-4" />
        </Button>
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
          disabled={(!input.trim() && !attachedFile) || isLoading}
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
