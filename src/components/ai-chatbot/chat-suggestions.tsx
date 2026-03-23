"use client";

import React from "react";
import { cn } from "@/lib/utils";

const suggestions = [
  { emoji: "\u2795", label: "Add a task" },
  { emoji: "\u23F1\uFE0F", label: "Start timer" },
  { emoji: "\uD83D\uDCCA", label: "How was my week?" },
  { emoji: "\uD83D\uDCC5", label: "Organize my day" },
  { emoji: "\uD83D\uDD14", label: "Set a reminder" },
  { emoji: "\uD83D\uDE0A", label: "Check my mood" },
];

interface ChatSuggestionsProps {
  onSelect: (text: string) => void;
}

export function ChatSuggestions({ onSelect }: ChatSuggestionsProps) {
  return (
    <div className="flex flex-col items-center gap-4 px-4 py-6">
      <div className="text-center">
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
          How can I help you today?
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {suggestions.map((s) => (
          <button
            key={s.label}
            type="button"
            onClick={() => onSelect(`${s.emoji} ${s.label}`)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3.5 py-2 text-xs font-medium text-gray-700",
              "shadow-sm transition-all duration-200",
              "hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 hover:shadow-md hover:-translate-y-0.5",
              "active:translate-y-0 active:shadow-sm",
              "dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300",
              "dark:hover:border-indigo-500/50 dark:hover:bg-indigo-500/10 dark:hover:text-indigo-300"
            )}
          >
            <span>{s.emoji}</span>
            <span>{s.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
