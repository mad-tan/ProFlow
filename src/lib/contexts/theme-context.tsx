"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";

type Theme = "light" | "dark";

export type BackgroundPreset = "default" | "gradient-blue" | "gradient-purple" | "gradient-sunset" | "gradient-ocean" | "gradient-forest" | "dots" | "grid";

export const BACKGROUND_PRESETS: { id: BackgroundPreset; label: string; style: React.CSSProperties }[] = [
  { id: "default", label: "Default", style: {} },
  { id: "gradient-blue", label: "Blue Sky", style: { background: "linear-gradient(135deg, rgba(59,130,246,0.08) 0%, rgba(147,197,253,0.12) 100%)" } },
  { id: "gradient-purple", label: "Lavender", style: { background: "linear-gradient(135deg, rgba(139,92,246,0.08) 0%, rgba(196,181,253,0.12) 100%)" } },
  { id: "gradient-sunset", label: "Sunset", style: { background: "linear-gradient(135deg, rgba(251,146,60,0.08) 0%, rgba(244,114,182,0.1) 100%)" } },
  { id: "gradient-ocean", label: "Ocean", style: { background: "linear-gradient(135deg, rgba(6,182,212,0.08) 0%, rgba(59,130,246,0.1) 100%)" } },
  { id: "gradient-forest", label: "Forest", style: { background: "linear-gradient(135deg, rgba(34,197,94,0.08) 0%, rgba(16,185,129,0.1) 100%)" } },
  { id: "dots", label: "Dots", style: { backgroundImage: "radial-gradient(circle, currentColor 0.5px, transparent 0.5px)", backgroundSize: "24px 24px", opacity: 0.03 } },
  { id: "grid", label: "Grid", style: { backgroundImage: "linear-gradient(currentColor 1px, transparent 1px), linear-gradient(to right, currentColor 1px, transparent 1px)", backgroundSize: "32px 32px", opacity: 0.03 } },
];

export const AVATAR_COLORS = [
  "#6366f1", "#8b5cf6", "#a855f7", "#ec4899", "#ef4444",
  "#f97316", "#eab308", "#22c55e", "#06b6d4", "#3b82f6",
  "#64748b", "#1e293b",
];

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
  background: BackgroundPreset;
  setBackground: (bg: BackgroundPreset) => void;
  avatarColor: string;
  setAvatarColor: (color: string) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("light");
  const [background, setBackgroundState] = useState<BackgroundPreset>("default");
  const [avatarColor, setAvatarColorState] = useState<string>(AVATAR_COLORS[0]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem("proflow-theme") as Theme | null;
    if (stored === "light" || stored === "dark") {
      setThemeState(stored);
    } else if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      setThemeState("dark");
    }
    const storedBg = localStorage.getItem("proflow-background") as BackgroundPreset | null;
    if (storedBg) setBackgroundState(storedBg);
    const storedAvatar = localStorage.getItem("proflow-avatar-color");
    if (storedAvatar) setAvatarColorState(storedAvatar);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(theme);
    localStorage.setItem("proflow-theme", theme);
  }, [theme, mounted]);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => (prev === "light" ? "dark" : "light"));
  }, []);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
  }, []);

  const setBackground = useCallback((bg: BackgroundPreset) => {
    setBackgroundState(bg);
    localStorage.setItem("proflow-background", bg);
  }, []);

  const setAvatarColor = useCallback((color: string) => {
    setAvatarColorState(color);
    localStorage.setItem("proflow-avatar-color", color);
  }, []);

  // Prevent flash of wrong theme
  if (!mounted) {
    return (
      <ThemeContext.Provider value={{ theme: "light", toggleTheme, setTheme, background: "default", setBackground, avatarColor: AVATAR_COLORS[0], setAvatarColor }}>
        <div style={{ visibility: "hidden" }}>{children}</div>
      </ThemeContext.Provider>
    );
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme, background, setBackground, avatarColor, setAvatarColor }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
