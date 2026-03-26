"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import type { PendingIntent } from "@/app/api/ai/chat/route";

export type { PendingIntent };

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

interface ChatbotContextType {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  toggleOpen: () => void;
  messages: ChatMessage[];
  addMessage: (message: Omit<ChatMessage, "id" | "timestamp">) => void;
  clearMessages: () => void;
  pendingIntent: PendingIntent | null;
  setPendingIntent: (intent: PendingIntent | null) => void;
}

const ChatbotContext = createContext<ChatbotContextType | undefined>(undefined);

let messageIdCounter = 0;

export function ChatbotProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [pendingIntent, setPendingIntent] = useState<PendingIntent | null>(null);

  const toggleOpen = useCallback(() => setIsOpen((prev) => !prev), []);

  const addMessage = useCallback(
    (message: Omit<ChatMessage, "id" | "timestamp">) => {
      messageIdCounter += 1;
      setMessages((prev) => [
        ...prev,
        { ...message, id: `msg-${messageIdCounter}`, timestamp: Date.now() },
      ]);
    },
    []
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
    setPendingIntent(null);
  }, []);

  // Shift+C → open a fresh chatbot (ignore when typing in an input/textarea)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!e.shiftKey || e.key !== "C") return;
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement).isContentEditable) return;
      setIsOpen((prev) => {
        if (!prev) {
          // Opening fresh — clear state
          setMessages([]);
          setPendingIntent(null);
        }
        return !prev;
      });
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <ChatbotContext.Provider
      value={{ isOpen, setIsOpen, toggleOpen, messages, addMessage, clearMessages, pendingIntent, setPendingIntent }}
    >
      {children}
    </ChatbotContext.Provider>
  );
}

export function useChatbot() {
  const context = useContext(ChatbotContext);
  if (!context) throw new Error("useChatbot must be used within a ChatbotProvider");
  return context;
}
