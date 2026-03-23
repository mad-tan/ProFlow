import {
  format,
  formatDistanceToNow,
  parseISO,
  startOfDay as fnsStartOfDay,
  endOfDay as fnsEndOfDay,
  startOfWeek as fnsStartOfWeek,
  endOfWeek as fnsEndOfWeek,
  startOfMonth as fnsStartOfMonth,
  endOfMonth as fnsEndOfMonth,
  addDays as fnsAddDays,
  addWeeks as fnsAddWeeks,
  addMonths as fnsAddMonths,
  subDays as fnsSubDays,
  differenceInMinutes,
  differenceInHours,
  differenceInDays,
  isAfter,
  isBefore,
  isToday as fnsIsToday,
  isTomorrow as fnsIsTomorrow,
  isPast as fnsIsPast,
  isValid,
} from "date-fns";

// ─── Parsing ─────────────────────────────────────────────────────────────────

/**
 * Parse an ISO date string into a Date object.
 * Returns null if the string is invalid.
 */
export function parseDate(dateString: string): Date | null {
  try {
    const parsed = parseISO(dateString);
    return isValid(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Safely coerce a Date or ISO string into a Date object.
 */
function toDate(input: string | Date): Date {
  return typeof input === "string" ? parseISO(input) : input;
}

// ─── Formatting ──────────────────────────────────────────────────────────────

/**
 * Format a date as "Mar 19, 2026".
 */
export function formatDate(input: string | Date): string {
  return format(toDate(input), "MMM d, yyyy");
}

/**
 * Format a date as "2026-03-19" (ISO date only).
 */
export function formatDateISO(input: string | Date): string {
  return format(toDate(input), "yyyy-MM-dd");
}

/**
 * Format a time as "2:30 PM".
 */
export function formatTime(input: string | Date): string {
  return format(toDate(input), "h:mm a");
}

/**
 * Format a date and time as "Mar 19, 2026, 2:30 PM".
 */
export function formatDateTime(input: string | Date): string {
  return format(toDate(input), "MMM d, yyyy, h:mm a");
}

/**
 * Format a date as a relative string like "3 hours ago" or "in 2 days".
 */
export function formatRelative(input: string | Date): string {
  return formatDistanceToNow(toDate(input), { addSuffix: true });
}

/**
 * Format a duration in minutes into a human-readable string.
 * Examples: "45m", "1h 30m", "2h".
 */
export function formatDuration(minutes: number): string {
  if (minutes < 0) return "0m";
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

// ─── Current Date/Time ───────────────────────────────────────────────────────

/**
 * Get the current ISO timestamp.
 */
export function getNow(): string {
  return new Date().toISOString();
}

/**
 * Get today's date as an ISO date string (yyyy-MM-dd).
 */
export function getToday(): string {
  return formatDateISO(new Date());
}

// ─── Date Boundaries ─────────────────────────────────────────────────────────

export function startOfDay(input: string | Date): Date {
  return fnsStartOfDay(toDate(input));
}

export function endOfDay(input: string | Date): Date {
  return fnsEndOfDay(toDate(input));
}

export function startOfWeek(input: string | Date): Date {
  return fnsStartOfWeek(toDate(input), { weekStartsOn: 1 });
}

export function endOfWeek(input: string | Date): Date {
  return fnsEndOfWeek(toDate(input), { weekStartsOn: 1 });
}

export function startOfMonth(input: string | Date): Date {
  return fnsStartOfMonth(toDate(input));
}

export function endOfMonth(input: string | Date): Date {
  return fnsEndOfMonth(toDate(input));
}

// ─── Arithmetic ──────────────────────────────────────────────────────────────

export function addDays(input: string | Date, days: number): Date {
  return fnsAddDays(toDate(input), days);
}

export function subtractDays(input: string | Date, days: number): Date {
  return fnsSubDays(toDate(input), days);
}

export function addWeeks(input: string | Date, weeks: number): Date {
  return fnsAddWeeks(toDate(input), weeks);
}

export function addMonths(input: string | Date, months: number): Date {
  return fnsAddMonths(toDate(input), months);
}

// ─── Differences ─────────────────────────────────────────────────────────────

export function minutesBetween(
  start: string | Date,
  end: string | Date
): number {
  return differenceInMinutes(toDate(end), toDate(start));
}

export function hoursBetween(
  start: string | Date,
  end: string | Date
): number {
  return differenceInHours(toDate(end), toDate(start));
}

export function daysBetween(
  start: string | Date,
  end: string | Date
): number {
  return differenceInDays(toDate(end), toDate(start));
}

// ─── Checks ──────────────────────────────────────────────────────────────────

export function isDateAfter(a: string | Date, b: string | Date): boolean {
  return isAfter(toDate(a), toDate(b));
}

export function isDateBefore(a: string | Date, b: string | Date): boolean {
  return isBefore(toDate(a), toDate(b));
}

export function isToday(input: string | Date): boolean {
  return fnsIsToday(toDate(input));
}

export function isTomorrow(input: string | Date): boolean {
  return fnsIsTomorrow(toDate(input));
}

export function isPast(input: string | Date): boolean {
  return fnsIsPast(toDate(input));
}

export function isOverdue(dueDate: string | Date): boolean {
  return fnsIsPast(fnsEndOfDay(toDate(dueDate)));
}
