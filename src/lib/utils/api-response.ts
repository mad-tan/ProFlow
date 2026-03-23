import { NextResponse } from "next/server";
import type { ApiResponse, PaginatedResponse, ApiError } from "@/lib/types";
import { AppError, getErrorMessage, getErrorStatusCode } from "./errors";

/**
 * Create a successful JSON response.
 */
export function successResponse<T>(
  data: T,
  message?: string,
  status: number = 200
): NextResponse<ApiResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      data,
      message,
      timestamp: new Date().toISOString(),
    },
    { status }
  );
}

/**
 * Create a successful JSON response for a newly created resource (HTTP 201).
 */
export function createdResponse<T>(
  data: T,
  message: string = "Resource created"
): NextResponse<ApiResponse<T>> {
  return successResponse(data, message, 201);
}

/**
 * Create a paginated JSON response.
 */
export function paginatedResponse<T>(
  data: T[],
  page: number,
  pageSize: number,
  totalItems: number
): NextResponse<PaginatedResponse<T>> {
  const totalPages = Math.ceil(totalItems / pageSize);
  return NextResponse.json(
    {
      success: true,
      data,
      pagination: {
        page,
        pageSize,
        totalItems,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
      timestamp: new Date().toISOString(),
    },
    { status: 200 }
  );
}

/**
 * Create an error JSON response.
 */
export function errorResponse(
  error: unknown,
  fallbackMessage: string = "Internal server error"
): NextResponse<ApiError> {
  const statusCode = getErrorStatusCode(error);
  const message = getErrorMessage(error) || fallbackMessage;
  const code = error instanceof AppError ? error.code : "INTERNAL_ERROR";
  const details = error instanceof AppError ? error.details : undefined;

  return NextResponse.json(
    {
      success: false as const,
      error: {
        code,
        message,
        details,
      },
      timestamp: new Date().toISOString(),
    },
    { status: statusCode }
  );
}

/**
 * Create a 204 No Content response (for successful deletions).
 */
export function noContentResponse(): NextResponse {
  return new NextResponse(null, { status: 204 });
}

/**
 * Extract pagination parameters from a URL search params object.
 * Clamps page/pageSize to reasonable bounds.
 */
export function parsePaginationParams(searchParams: URLSearchParams): {
  page: number;
  pageSize: number;
  offset: number;
} {
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
  const pageSize = Math.min(
    100,
    Math.max(1, parseInt(searchParams.get("pageSize") || "20", 10) || 20)
  );
  const offset = (page - 1) * pageSize;
  return { page, pageSize, offset };
}
