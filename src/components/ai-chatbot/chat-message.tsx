"use client";

import React from "react";
import { Bot } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChatMessage as ChatMessageType } from "@/lib/contexts/chatbot-context";

function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = Math.floor((now - timestamp) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function renderContent(content: string) {
  const parts = content.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-semibold">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

interface ChatMessageProps {
  message: ChatMessageType;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user";

  return (
    <div
      className={cn(
        "flex w-full gap-2.5 animate-in fade-in slide-in-from-bottom-2 duration-300",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      {/* Assistant avatar */}
      {!isUser && (
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 shadow-md shadow-indigo-500/20">
          <Bot className="h-3.5 w-3.5 text-white" />
        </div>
      )}

      <div
        className={cn(
          "group relative max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed shadow-sm",
          isUser
            ? "bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-br-md"
            : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100 rounded-bl-md"
        )}
      >
        <p className="whitespace-pre-wrap break-words">
          {renderContent(message.content)}
        </p>
        <span
          className={cn(
            "mt-1 block text-[10px] opacity-0 transition-opacity duration-200 group-hover:opacity-100",
            isUser
              ? "text-right text-indigo-100"
              : "text-left text-gray-400 dark:text-gray-500"
          )}
        >
          {formatRelativeTime(message.timestamp)}
        </span>
      </div>
    </div>
  );
}
