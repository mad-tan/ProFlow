"use client";

import { useRef } from "react";
import { Calendar } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface DateInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  wrapperClassName?: string;
}

/**
 * A date/datetime-local input with a calendar icon button that opens the native picker.
 * Drop-in replacement for <Input type="date"> or <Input type="datetime-local">.
 */
export function DateInput({ className, wrapperClassName, ...props }: DateInputProps) {
  const ref = useRef<HTMLInputElement>(null);

  return (
    <div className={cn("relative", wrapperClassName)}>
      <Input
        ref={ref}
        {...props}
        className={cn("pr-8", className)}
      />
      <button
        type="button"
        tabIndex={-1}
        onClick={() => (ref.current as HTMLInputElement & { showPicker?: () => void })?.showPicker?.()}
        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Open calendar"
      >
        <Calendar className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
