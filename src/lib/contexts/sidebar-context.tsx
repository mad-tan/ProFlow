"use client";

import React, { createContext, useContext, useState, useCallback } from "react";

interface SidebarContextType {
  isOpen: boolean;
  isCollapsed: boolean;
  setIsOpen: (open: boolean) => void;
  toggleCollapsed: () => void;
  setCollapsed: (collapsed: boolean) => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false); // mobile sheet
  const [isCollapsed, setIsCollapsed] = useState(false); // desktop collapse

  const toggleCollapsed = useCallback(() => {
    setIsCollapsed((prev) => !prev);
  }, []);

  const setCollapsed = useCallback((collapsed: boolean) => {
    setIsCollapsed(collapsed);
  }, []);

  return (
    <SidebarContext.Provider
      value={{ isOpen, isCollapsed, setIsOpen, toggleCollapsed, setCollapsed }}
    >
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  return context;
}
