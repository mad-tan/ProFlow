"use client";

import { useCallback } from "react";
import { useSwipe } from "@/lib/hooks/use-swipe";
import { useSidebar } from "@/lib/contexts/sidebar-context";
import { useChatbot } from "@/lib/contexts/chatbot-context";

/**
 * Invisible component that registers global touch-swipe gestures for mobile navigation:
 *  - Swipe right from left edge  → open the mobile nav drawer
 *  - Swipe left (anywhere)       → close the nav drawer
 *  - Swipe left (anywhere)       → close the full-screen chatbot on mobile
 *
 * Must be rendered inside both SidebarProvider and ChatbotProvider.
 */
export function SwipeHandler() {
  const { isOpen: navOpen, setIsOpen: setNavOpen } = useSidebar();
  const { isOpen: chatOpen, setIsOpen: setChatOpen } = useChatbot();

  const isMobile = () =>
    typeof window !== "undefined" && window.innerWidth < 1024;

  const handleSwipeRight = useCallback(() => {
    if (!isMobile()) return;
    // Don't open nav if chatbot is already open full-screen
    if (!navOpen && !chatOpen) setNavOpen(true);
  }, [navOpen, chatOpen, setNavOpen]);

  const handleSwipeLeft = useCallback(() => {
    if (!isMobile()) return;
    if (navOpen) {
      setNavOpen(false);
      return;
    }
    // Close full-screen chatbot on small screens
    if (chatOpen && window.innerWidth < 640) {
      setChatOpen(false);
    }
  }, [navOpen, chatOpen, setNavOpen, setChatOpen]);

  useSwipe({
    onSwipeRight: handleSwipeRight,
    onSwipeLeft: handleSwipeLeft,
    requireLeftEdge: true,  // right-swipe only fires from left edge
    leftEdgeSize: 30,
    threshold: 60,
  });

  return null;
}
