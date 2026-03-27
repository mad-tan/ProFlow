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

  // Drag-to-dismiss state (mobile only)
  const [dragY, setDragY] = useState(0);
  const dragStartY = useRef(0);
  const isDragging = useRef(false);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Reset drag offset whenever panel opens/closes
  useEffect(() => {
    setDragY(0);
  }, [isOpen]);

  const handleSuggestionSelect = useCallback((text: string) => {
    setSuggestionText(text);
  }, []);

  const handleSuggestionUsed = useCallback(() => {
    setSuggestionText("");
  }, []);

  /* ── Drag-to-dismiss (mobile full-screen only) ── */
  const onDragStart = (e: React.TouchEvent) => {
    if (window.innerWidth >= 640) return; // desktop: no drag
    isDragging.current = true;
    dragStartY.current = e.touches[0].clientY;
  };

  const onDragMove = (e: React.TouchEvent) => {
    if (!isDragging.current) return;
    const delta = e.touches[0].clientY - dragStartY.current;
    if (delta > 0) setDragY(delta);
  };

  const onDragEnd = () => {
    if (!isDragging.current) return;
    isDragging.current = false;
    if (dragY > 120) {
      setIsOpen(false);
      setTimeout(() => setDragY(0), 300);
    } else {
      setDragY(0);
    }
  };

  const dragging = isDragging.current;

  return (
    <div
      className={cn(
        "fixed z-50 flex flex-col overflow-hidden bg-white",
        "dark:bg-gray-900",
        // Mobile: full screen with safe-area padding
        "inset-0 rounded-none border-0",
        // Desktop: floating panel
        "sm:inset-auto sm:bottom-24 sm:right-6 sm:w-[400px] sm:h-[600px] sm:rounded-2xl sm:border sm:border-gray-200/80 sm:shadow-2xl sm:shadow-black/10",
        "dark:sm:border-gray-700/80 dark:sm:shadow-black/30",
        "transition-all duration-300 ease-out",
        isOpen
          ? "pointer-events-auto translate-y-0 scale-100 opacity-100"
          : "pointer-events-none translate-y-4 scale-95 opacity-0"
      )}
      style={
        dragY > 0
          ? { transform: `translateY(${dragY}px)`, transition: dragging ? "none" : "transform 0.3s ease" }
          : undefined
      }
    >
      {/* Drag handle — visible on mobile only */}
      <div
        className="sm:hidden flex justify-center pt-2 pb-1 shrink-0 cursor-grab active:cursor-grabbing"
        style={{ paddingTop: "max(0.5rem, env(safe-area-inset-top, 0.5rem))" }}
        onTouchStart={onDragStart}
        onTouchMove={onDragMove}
        onTouchEnd={onDragEnd}
      >
        <div className="w-10 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
      </div>

      {/* Header */}
      <div
        className="relative flex items-center justify-between border-b border-gray-200 bg-gradient-to-r from-indigo-500 via-indigo-600 to-purple-600 px-5 py-4 dark:border-gray-700 shrink-0"
        // Also allow dragging from the header on mobile
        onTouchStart={onDragStart}
        onTouchMove={onDragMove}
        onTouchEnd={onDragEnd}
      >
        {/* Decorative dots */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/10" />
          <div className="absolute -left-4 bottom-0 h-16 w-16 rounded-full bg-white/5" />
        </div>

        <div className="relative flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20 backdrop-blur-sm">
            <Bot className="h-4 w-4 text-white" />
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

      {/* Input — safe area bottom on mobile */}
      <div className="sm:pb-0 pb-safe">
        <ChatInput
          externalValue={suggestionText}
          onExternalValueUsed={handleSuggestionUsed}
        />
      </div>
    </div>
  );
}
