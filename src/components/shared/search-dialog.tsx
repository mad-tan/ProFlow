"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Search, FileText, CheckSquare, FolderOpen, BookOpen, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

interface SearchResult {
  type: "project" | "task" | "checklist" | "journal_entry";
  id: string;
  title: string;
  snippet: string;
  matchedField: string;
}

interface SearchResults {
  results: SearchResult[];
  total: number;
  query: string;
}

const TYPE_CONFIG = {
  task: { icon: CheckSquare, label: "Task", href: (id: string) => `/tasks/${id}` },
  project: { icon: FolderOpen, label: "Project", href: (id: string) => `/projects/${id}` },
  checklist: { icon: FileText, label: "Checklist", href: (id: string) => `/checklists/${id}` },
  journal_entry: { icon: BookOpen, label: "Journal", href: () => `/mental-health` },
};

interface SearchDialogProps {
  open: boolean;
  onClose: () => void;
}

export function SearchDialog({ open, onClose }: SearchDialogProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setQuery("");
      setResults([]);
      setSelected(0);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  // Debounced search
  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}&limit=10`);
        const json = await res.json();
        const data = json.data as SearchResults;
        setResults(data.results ?? []);
        setSelected(0);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  const navigate = useCallback((result: SearchResult) => {
    const config = TYPE_CONFIG[result.type];
    router.push(config.href(result.id));
    onClose();
  }, [router, onClose]);

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") { onClose(); return; }
      if (e.key === "ArrowDown") { e.preventDefault(); setSelected(s => Math.min(s + 1, results.length - 1)); }
      if (e.key === "ArrowUp") { e.preventDefault(); setSelected(s => Math.max(s - 1, 0)); }
      if (e.key === "Enter" && results[selected]) { navigate(results[selected]); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, results, selected, navigate, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      {/* Dialog */}
      <div
        className="relative w-full max-w-lg mx-4 rounded-xl border border-border bg-background shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tasks, projects, checklists, journal..."
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          {query && (
            <button onClick={() => setQuery("")} className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          )}
          <kbd className="hidden sm:flex h-5 items-center rounded border bg-muted px-1.5 font-mono text-[10px] text-muted-foreground">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto">
          {loading && (
            <div className="py-8 text-center text-sm text-muted-foreground">Searching...</div>
          )}
          {!loading && query && results.length === 0 && (
            <div className="py-8 text-center text-sm text-muted-foreground">No results for &ldquo;{query}&rdquo;</div>
          )}
          {!loading && !query && (
            <div className="py-8 text-center text-sm text-muted-foreground">Type to search across your workspace</div>
          )}
          {!loading && results.length > 0 && (
            <ul className="py-1">
              {results.map((result, i) => {
                const config = TYPE_CONFIG[result.type];
                const Icon = config.icon;
                return (
                  <li key={result.id}>
                    <button
                      className={cn(
                        "w-full flex items-start gap-3 px-4 py-2.5 text-left transition-colors",
                        i === selected ? "bg-accent" : "hover:bg-accent/50"
                      )}
                      onMouseEnter={() => setSelected(i)}
                      onClick={() => navigate(result)}
                    >
                      <Icon className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{result.title}</p>
                        {result.snippet && (
                          <p className="text-xs text-muted-foreground truncate">{result.snippet}</p>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0 mt-0.5">{config.label}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {results.length > 0 && (
          <div className="px-4 py-2 border-t border-border flex items-center gap-3 text-[11px] text-muted-foreground">
            <span>↑↓ navigate</span>
            <span>↵ open</span>
            <span>ESC close</span>
          </div>
        )}
      </div>
    </div>
  );
}
