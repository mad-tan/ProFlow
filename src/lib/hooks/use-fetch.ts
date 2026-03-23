import type { ApiError } from "@/lib/types";

// ─── SWR Fetcher ────────────────────────────────────────────────────────────

export class FetchError extends Error {
  status: number;
  code: string;
  details?: Record<string, unknown>;

  constructor(
    message: string,
    status: number,
    code: string = "FETCH_ERROR",
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "FetchError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

/**
 * SWR-compatible fetcher.
 * Expects API responses shaped as `{ success: true, data: T }` or
 * `{ success: false, error: { code, message, details? } }`.
 * Returns the unwrapped `data` value on success.
 */
export async function fetcher<T = unknown>(url: string): Promise<T> {
  const res = await fetch(url);

  if (!res.ok) {
    let errorBody: ApiError | undefined;
    try {
      errorBody = await res.json();
    } catch {
      // response body was not JSON
    }

    throw new FetchError(
      errorBody?.error?.message ?? `Request failed with status ${res.status}`,
      res.status,
      errorBody?.error?.code ?? "FETCH_ERROR",
      errorBody?.error?.details
    );
  }

  const json = await res.json();
  return json.data as T;
}

// ─── Mutation Helpers ───────────────────────────────────────────────────────

async function mutationFetch<T = unknown>(
  url: string,
  method: string,
  body?: unknown
): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: body !== undefined ? { "Content-Type": "application/json" } : {},
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  // 204 No Content (e.g. successful DELETE)
  if (res.status === 204) {
    return undefined as T;
  }

  if (!res.ok) {
    let errorBody: ApiError | undefined;
    try {
      errorBody = await res.json();
    } catch {
      // non-JSON error body
    }

    throw new FetchError(
      errorBody?.error?.message ?? `Request failed with status ${res.status}`,
      res.status,
      errorBody?.error?.code ?? "FETCH_ERROR",
      errorBody?.error?.details
    );
  }

  const json = await res.json();
  return json.data as T;
}

export async function apiPost<T = unknown>(
  url: string,
  body: unknown
): Promise<T> {
  return mutationFetch<T>(url, "POST", body);
}

export async function apiPut<T = unknown>(
  url: string,
  body: unknown
): Promise<T> {
  return mutationFetch<T>(url, "PUT", body);
}

export async function apiPatch<T = unknown>(
  url: string,
  body: unknown
): Promise<T> {
  return mutationFetch<T>(url, "PATCH", body);
}

export async function apiDelete<T = void>(url: string): Promise<T> {
  return mutationFetch<T>(url, "DELETE");
}
