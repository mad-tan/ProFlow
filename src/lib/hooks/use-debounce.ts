import { useEffect, useState } from "react";

/**
 * Debounce a value by the specified delay (in milliseconds).
 * The returned value only updates once the input has stopped changing
 * for at least `delay` ms.
 */
export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}
