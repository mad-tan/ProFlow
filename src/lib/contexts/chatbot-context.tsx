"use client";

import React, { createContext, useContext, useState, useCallback } from "react";

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
}

const ChatbotContext = createContext<ChatbotContextType | undefined>(undefined);

let messageIdCounter = 0;

export function ChatbotProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const toggleOpen = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  const addMessage = useCallback(
    (message: Omit<ChatMessage, "id" | "timestamp">) => {
      messageIdCounter += 1;
      setMessages((prev) => [
        ...prev,
        {
          ...message,
          id: `msg-${messageIdCounter}`,
          timestamp: Date.now(),
        },
      ]);
    },
    []
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return (
    <ChatbotContext.Provider
      value={{ isOpen, setIsOpen, toggleOpen, messages, addMessage, clearMessages }}
    >
      {children}
    </ChatbotContext.Provider>
  );
}

export function useChatbot() {
  const context = useContext(ChatbotContext);
  if (!context) {
    throw new Error("useChatbot must be used within a ChatbotProvider");
  }
  return context;
}
