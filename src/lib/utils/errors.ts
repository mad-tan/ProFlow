/**
 * Base class for all application errors.
 * Carries an HTTP-compatible status code and a machine-readable error code.
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: Record<string, unknown>;

  constructor(
    message: string,
    statusCode: number,
    code: string,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;

    // Maintain proper prototype chain in TypeScript
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * 404 - The requested resource does not exist.
 */
export class NotFoundError extends AppError {
  constructor(entity: string, id?: string) {
    const message = id
      ? `${entity} with id '${id}' was not found`
      : `${entity} was not found`;
    super(message, 404, "NOT_FOUND", { entity, id });
  }
}

/**
 * 400 - The request payload failed validation.
 */
export class ValidationError extends AppError {
  public readonly fieldErrors: Record<string, string[]>;

  constructor(
    message: string = "Validation failed",
    fieldErrors: Record<string, string[]> = {}
  ) {
    super(message, 400, "VALIDATION_ERROR", { fieldErrors });
    this.fieldErrors = fieldErrors;
  }

  /**
   * Create a ValidationError from a Zod error result.
   */
  static fromZodError(zodError: {
    issues: Array<{ path: PropertyKey[]; message: string }>;
  }): ValidationError {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of zodError.issues) {
      const field = issue.path.map(String).join(".") || "_root";
      if (!fieldErrors[field]) {
        fieldErrors[field] = [];
      }
      fieldErrors[field].push(issue.message);
    }
    return new ValidationError("Validation failed", fieldErrors);
  }
}

/**
 * 409 - The operation conflicts with the current state (e.g. duplicate entry).
 */
export class ConflictError extends AppError {
  constructor(message: string = "Resource conflict", entity?: string) {
    super(message, 409, "CONFLICT", { entity });
  }
}

/**
 * 401 - The request lacks valid authentication credentials.
 */
export class UnauthorizedError extends AppError {
  constructor(message: string = "Unauthorized") {
    super(message, 401, "UNAUTHORIZED");
  }
}

/**
 * 403 - The authenticated user does not have permission for this action.
 */
export class ForbiddenError extends AppError {
  constructor(message: string = "Forbidden") {
    super(message, 403, "FORBIDDEN");
  }
}

/**
 * Type guard to check if an unknown value is an AppError.
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

/**
 * Extract a user-safe error message from any thrown value.
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "An unexpected error occurred";
}

/**
 * Extract the HTTP status code from an error, defaulting to 500.
 */
export function getErrorStatusCode(error: unknown): number {
  if (isAppError(error)) return error.statusCode;
  return 500;
}
