"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";

export interface ActiveTimer {
  taskId: string;
  taskName: string;
  projectName?: string;
  startedAt: number; // timestamp ms
}

interface TimerContextType {
  activeTimer: ActiveTimer | null;
  elapsedSeconds: number;
  startTimer: (timer: Omit<ActiveTimer, "startedAt">) => void;
  stopTimer: () => void;
  isRunning: boolean;
}

const TimerContext = createContext<TimerContextType | undefined>(undefined);

export function TimerProvider({ children }: { children: React.ReactNode }) {
  const [activeTimer, setActiveTimer] = useState<ActiveTimer | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const clearTickInterval = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const startTimer = useCallback(
    (timer: Omit<ActiveTimer, "startedAt">) => {
      clearTickInterval();
      const now = Date.now();
      setActiveTimer({ ...timer, startedAt: now });
      setElapsedSeconds(0);

      intervalRef.current = setInterval(() => {
        setElapsedSeconds(Math.floor((Date.now() - now) / 1000));
      }, 1000);
    },
    [clearTickInterval]
  );

  const stopTimer = useCallback(() => {
    clearTickInterval();
    setActiveTimer(null);
    setElapsedSeconds(0);
  }, [clearTickInterval]);

  // Cleanup on unmount
  useEffect(() => {
    return () => clearTickInterval();
  }, [clearTickInterval]);

  return (
    <TimerContext.Provider
      value={{
        activeTimer,
        elapsedSeconds,
        startTimer,
        stopTimer,
        isRunning: activeTimer !== null,
      }}
    >
      {children}
    </TimerContext.Provider>
  );
}

export function useTimer() {
  const context = useContext(TimerContext);
  if (!context) {
    throw new Error("useTimer must be used within a TimerProvider");
  }
  return context;
}
