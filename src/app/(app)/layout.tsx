"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { useSidebar } from "@/lib/contexts/sidebar-context";
import { ChatFAB } from "@/components/ai-chatbot/chat-fab";
import { ChatPanel } from "@/components/ai-chatbot/chat-panel";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { isCollapsed } = useSidebar();

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop sidebar */}
      <Sidebar />

      {/* Mobile sidebar */}
      <MobileNav />

      {/* Main content area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
      </div>

      {/* AI Chatbot */}
      <ChatPanel />
      <ChatFAB />
    </div>
  );
}
