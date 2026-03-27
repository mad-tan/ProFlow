"use client";

import { useEffect, useRef } from "react";

interface UseSwipeOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeDown?: () => void;
  onSwipeUp?: () => void;
  /** Minimum px distance to register as a swipe (default: 60) */
  threshold?: number;
  /** Only fire onSwipeRight when touch starts within this many px from the left edge */
  leftEdgeSize?: number;
  /** If true, onSwipeRight only fires from the left edge */
  requireLeftEdge?: boolean;
  /** Element to attach listeners to — defaults to window */
  element?: EventTarget | null;
}

export function useSwipe({
  onSwipeLeft,
  onSwipeRight,
  onSwipeDown,
  onSwipeUp,
  threshold = 60,
  leftEdgeSize = 30,
  requireLeftEdge = false,
  element,
}: UseSwipeOptions) {
  const startRef = useRef<{ x: number; y: number; fromEdge: boolean } | null>(null);

  useEffect(() => {
    const target = element ?? window;
    if (!target) return;

    const handleTouchStart = (e: TouchEvent) => {
      const t = e.touches[0];
      startRef.current = {
        x: t.clientX,
        y: t.clientY,
        fromEdge: t.clientX <= leftEdgeSize,
      };
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (!startRef.current) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - startRef.current.x;
      const dy = t.clientY - startRef.current.y;
      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);
      const { fromEdge } = startRef.current;
      startRef.current = null;

      // Horizontal swipe wins
      if (absDx > absDy && absDx >= threshold) {
        if (dx > 0) {
          if (!requireLeftEdge || fromEdge) onSwipeRight?.();
        } else {
          onSwipeLeft?.();
        }
      }
      // Vertical swipe wins
      else if (absDy > absDx && absDy >= threshold) {
        if (dy > 0) onSwipeDown?.();
        else onSwipeUp?.();
      }
    };

    target.addEventListener("touchstart", handleTouchStart as EventListener, { passive: true });
    target.addEventListener("touchend", handleTouchEnd as EventListener, { passive: true });

    return () => {
      target.removeEventListener("touchstart", handleTouchStart as EventListener);
      target.removeEventListener("touchend", handleTouchEnd as EventListener);
    };
  }, [onSwipeLeft, onSwipeRight, onSwipeDown, onSwipeUp, threshold, leftEdgeSize, requireLeftEdge, element]);
}
