"use client";

import React from "react";
import { Bot, X } from "lucide-react";
import { useChatbot } from "@/lib/contexts/chatbot-context";
import { cn } from "@/lib/utils";

export function ChatFAB() {
  const { isOpen, toggleOpen } = useChatbot();

  return (
    <button
      type="button"
      onClick={toggleOpen}
      className={cn(
        "fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full",
        "bg-gradient-to-br from-indigo-500 to-purple-600 text-white",
        "shadow-lg shadow-indigo-500/30",
        "transition-all duration-300 ease-out",
        "hover:shadow-xl hover:shadow-indigo-500/40 hover:scale-105",
        "active:scale-95",
        "focus:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/50"
      )}
      aria-label={isOpen ? "Close AI assistant" : "Open AI assistant"}
    >
      {/* Pulse animation ring */}
      {!isOpen && (
        <span className="absolute inset-0 animate-ping rounded-full bg-indigo-400 opacity-20" />
      )}

      {/* Subtle outer glow */}
      <span className="absolute inset-0 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 opacity-0 transition-opacity duration-300 hover:opacity-20" />

      {/* Icon */}
      <span className="relative transition-transform duration-300">
        {isOpen ? (
          <X className="h-5 w-5 rotate-0 transition-transform duration-300" />
        ) : (
          <Bot className="h-5 w-5 rotate-0 transition-transform duration-300" />
        )}
      </span>
    </button>
  );
}
