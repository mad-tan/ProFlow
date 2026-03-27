"use client";

import { useState, useEffect, useCallback } from "react";

/**
 * Like useState but persists the value to localStorage.
 * SSR-safe: returns defaultValue on first render, then syncs from storage.
 */
export function usePersistedState<T>(
  key: string,
  defaultValue: T
): [T, (value: T | ((prev: T) => T)) => void] {
  const [value, setValue] = useState<T>(defaultValue);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(key);
      if (stored !== null) {
        setValue(JSON.parse(stored));
      }
    } catch {
      // ignore parse errors
    }
    setHydrated(true);
  }, [key]);

  // Persist to localStorage on change (skip initial hydration)
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // ignore quota errors
    }
  }, [key, value, hydrated]);

  const setPersistedValue = useCallback(
    (newValue: T | ((prev: T) => T)) => {
      setValue(newValue);
    },
    []
  );

  return [value, setPersistedValue];
}
