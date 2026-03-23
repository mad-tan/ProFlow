"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

interface SearchInputProps {
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  debounceMs?: number;
  className?: string;
}

export function SearchInput({
  value: controlledValue,
  onChange,
  placeholder = "Search...",
  debounceMs = 300,
  className,
}: SearchInputProps) {
  const [internalValue, setInternalValue] = useState(controlledValue ?? "");

  useEffect(() => {
    if (controlledValue !== undefined) {
      setInternalValue(controlledValue);
    }
  }, [controlledValue]);

  useEffect(() => {
    const timer = setTimeout(() => {
      onChange(internalValue);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [internalValue, debounceMs, onChange]);

  const handleClear = useCallback(() => {
    setInternalValue("");
    onChange("");
  }, [onChange]);

  return (
    <div className={cn("relative", className)}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
      <Input
        type="text"
        value={internalValue}
        onChange={(e) => setInternalValue(e.target.value)}
        placeholder={placeholder}
        className="pl-9 pr-8"
      />
      {internalValue && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
