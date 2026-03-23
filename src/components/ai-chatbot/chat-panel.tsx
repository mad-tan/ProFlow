"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import { Bot, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useChatbot } from "@/lib/contexts/chatbot-context";
import { ChatMessage } from "./chat-message";
import { ChatInput } from "./chat-input";
import { ChatSuggestions } from "./chat-suggestions";
import { cn } from "@/lib/utils";

export function ChatPanel() {
  const { isOpen, setIsOpen, messages } = useChatbot();
  const bottomRef = useRef<HTMLDivElement>(null);
  const [suggestionText, setSuggestionText] = useState("");

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleSuggestionSelect = useCallback((text: string) => {
    setSuggestionText(text);
  }, []);

  const handleSuggestionUsed = useCallback(() => {
    setSuggestionText("");
  }, []);

  return (
    <div
      className={cn(
        "fixed bottom-24 right-6 z-50 flex flex-col overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-2xl shadow-black/10",
        "w-[400px] h-[600px]",
        "dark:border-gray-700/80 dark:bg-gray-900 dark:shadow-black/30",
        "transition-all duration-300 ease-out",
        isOpen
          ? "pointer-events-auto translate-y-0 scale-100 opacity-100"
          : "pointer-events-none translate-y-4 scale-95 opacity-0"
      )}
    >
      {/* Header */}
      <div className="relative flex items-center justify-between border-b border-gray-200 bg-gradient-to-r from-indigo-500 via-indigo-600 to-purple-600 px-5 py-4 dark:border-gray-700">
        {/* Decorative dots */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/10" />
          <div className="absolute -left-4 bottom-0 h-16 w-16 rounded-full bg-white/5" />
        </div>

        <div className="relative flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20 backdrop-blur-sm">
            <Bot className="h-4.5 w-4.5 text-white" />
          </div>
          <div>
            <h3 className="flex items-center gap-1.5 text-sm font-semibold text-white">
              AI Assistant
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
            </h3>
            <p className="text-[11px] text-indigo-100">Always here to help</p>
          </div>
        </div>

        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setIsOpen(false)}
          className="relative text-white/80 hover:bg-white/20 hover:text-white"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1">
        <div className="flex flex-col gap-3 p-4">
          {messages.length === 0 && (
            <ChatSuggestions onSelect={handleSuggestionSelect} />
          )}
          {messages.map((msg) => (
            <ChatMessage key={msg.id} message={msg} />
          ))}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      <ChatInput
        externalValue={suggestionText}
        onExternalValueUsed={handleSuggestionUsed}
      />
    </div>
  );
}
