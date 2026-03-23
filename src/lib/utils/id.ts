import { createId, init, isCuid } from "@paralleldrive/cuid2";

const createShortId = init({ length: 10 });

/**
 * Generate a standard CUID2 identifier (24 characters).
 */
export function generateId(): string {
  return createId();
}

/**
 * Generate a shorter CUID2 identifier (10 characters).
 * Useful for session IDs or human-facing references.
 */
export function generateShortId(): string {
  return createShortId();
}

/**
 * Validate whether a string is a valid CUID2.
 */
export function isValidId(id: string): boolean {
  return isCuid(id);
}
