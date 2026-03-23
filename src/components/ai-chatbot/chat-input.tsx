"use client";

import React, { useState, useRef } from "react";
import { SendHorizontal, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useChatbot } from "@/lib/contexts/chatbot-context";
import { cn } from "@/lib/utils";

interface ChatInputProps {
  externalValue?: string;
  onExternalValueUsed?: () => void;
}

export function ChatInput({ externalValue, onExternalValueUsed }: ChatInputProps) {
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { addMessage } = useChatbot();

  // If an external value is provided (from suggestions), use it
  React.useEffect(() => {
    if (externalValue) {
      setInput(externalValue);
      onExternalValueUsed?.();
      inputRef.current?.focus();
    }
  }, [externalValue, onExternalValueUsed]);

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
        body: JSON.stringify({ message: trimmed }),
      });

      if (!res.ok) throw new Error("Failed to get response");

      const data = await res.json();
      addMessage({
        role: "assistant",
        content: data.reply ?? data.message ?? "Sorry, I could not process that.",
      });
    } catch {
      addMessage({
        role: "assistant",
        content: "Sorry, something went wrong. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex items-center gap-2 border-t border-gray-200 bg-white/80 px-4 py-3 backdrop-blur-sm dark:border-gray-700 dark:bg-gray-900/80">
      <input
        ref={inputRef}
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Ask me anything..."
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
  );
}
