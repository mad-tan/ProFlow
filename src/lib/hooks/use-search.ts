import useSWR from "swr";
import { fetcher } from "./use-fetch";
import { useDebounce } from "./use-debounce";

// ─── Response Types ─────────────────────────────────────────────────────────

export interface SearchResultItem {
  id: string;
  type: "project" | "task" | "checklist" | "journal" | "reminder";
  title: string;
  description: string | null;
  matchedField: string;
  url: string;
}

export interface SearchResults {
  results: SearchResultItem[];
  total: number;
}

// ─── Hook ───────────────────────────────────────────────────────────────────

/**
 * Global search hook. Automatically debounces the query and only
 * sends a request when the debounced query is at least 2 characters.
 */
export function useSearch(query: string, debounceMs: number = 300) {
  const debouncedQuery = useDebounce(query, debounceMs);

  const shouldFetch = debouncedQuery.length >= 2;
  const url = shouldFetch
    ? `/api/search?q=${encodeURIComponent(debouncedQuery)}`
    : null;

  const { data, error, isLoading, isValidating } = useSWR<SearchResults>(
    url,
    fetcher,
    {
      keepPreviousData: true,
    }
  );

  return {
    results: data?.results ?? [],
    total: data?.total ?? 0,
    isLoading: shouldFetch && isLoading,
    isValidating,
    error,
    /** The debounced query string currently being fetched. */
    debouncedQuery,
  };
}
