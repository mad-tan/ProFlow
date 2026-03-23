import { TimeEntryRepository, type FindTimeEntriesOptions, type DurationByTask } from '@/lib/repositories/time-entry.repository';
import { AuditLogRepository } from '@/lib/repositories/audit-log.repository';
import { NotFoundError, ConflictError, ValidationError } from '@/lib/utils/errors';
import { getNow } from '@/lib/utils/dates';
import type { TimeEntry } from '@/lib/types';

export interface CreateTimeEntryInput {
  userId: string;
  taskId?: string | null;
  description?: string | null;
  startTime: string;
  endTime: string;
}

export interface TimeTrackingStats {
  totalMinutes: number;
  byTask: DurationByTask[];
  averageDailyMinutes: number;
}

export class TimeTrackingService {
  private repo = new TimeEntryRepository();
  private auditLog = new AuditLogRepository();

  /**
   * Get a time entry by id. Throws if not found.
   */
  getById(id: string): TimeEntry {
    const entry = this.repo.findById(id);
    if (!entry) throw new NotFoundError('TimeEntry', id);
    return entry;
  }

  /**
   * List time entries for a user.
   */
  listByUser(userId: string, options?: FindTimeEntriesOptions): TimeEntry[] {
    return this.repo.findByUserId(userId, options);
  }

  /**
   * Get the currently active timer for a user, or undefined.
   */
  getActiveTimer(userId: string): TimeEntry | undefined {
    return this.repo.findActive(userId);
  }

  /**
   * Start a timer. Ensures only one timer is active at a time.
   */
  startTimer(userId: string, taskId?: string, description?: string): TimeEntry {
    const active = this.repo.findActive(userId);
    if (active) {
      throw new ConflictError(
        'A timer is already running. Stop the current timer before starting a new one.'
      );
    }

    const entry = this.repo.startTimer(userId, taskId, description);

    this.auditLog.log(userId, 'time_entry', entry.id, 'create', {
      action: 'start_timer',
      taskId: taskId ?? null,
    });

    return entry;
  }

  /**
   * Stop the active timer for a user.
   */
  stopTimer(userId: string): TimeEntry {
    const active = this.repo.findActive(userId);
    if (!active) {
      throw new NotFoundError('No active timer found');
    }

    const entry = this.repo.stopTimer(active.id);

    this.auditLog.log(userId, 'time_entry', entry.id, 'update', {
      action: 'stop_timer',
      durationMinutes: entry.durationMinutes,
    });

    return entry;
  }

  /**
   * Create a manual time entry (with explicit start and end times).
   */
  createManualEntry(input: CreateTimeEntryInput): TimeEntry {
    const start = new Date(input.startTime);
    const end = new Date(input.endTime);

    if (end <= start) {
      throw new ValidationError('End time must be after start time', {
        endTime: ['Must be after start time'],
      });
    }

    const durationMinutes = Math.round((end.getTime() - start.getTime()) / 60000);

    const entry = this.repo.create({
      userId: input.userId,
      taskId: input.taskId ?? null,
      description: input.description ?? null,
      startTime: input.startTime,
      endTime: input.endTime,
      durationMinutes,
      metadata: {},
    } as Omit<TimeEntry, 'id' | 'createdAt' | 'updatedAt'>);

    this.auditLog.log(input.userId, 'time_entry', entry.id, 'create', {
      action: 'manual_entry',
      durationMinutes,
    });

    return entry;
  }

  /**
   * Update a time entry.
   */
  update(id: string, userId: string, data: Partial<Pick<TimeEntry, 'description' | 'taskId'>>): TimeEntry {
    this.getById(id);
    const entry = this.repo.update(id, data as Partial<TimeEntry>);

    this.auditLog.log(userId, 'time_entry', id, 'update', data as Record<string, unknown>);
    return entry;
  }

  /**
   * Delete a time entry.
   */
  delete(id: string, userId: string): boolean {
    this.getById(id);
    const deleted = this.repo.delete(id);
    if (deleted) {
      this.auditLog.log(userId, 'time_entry', id, 'delete');
    }
    return deleted;
  }

  /**
   * Get time tracking statistics for a user within a date range.
   */
  getStats(userId: string, startDate: string, endDate: string): TimeTrackingStats {
    const totalMinutes = this.repo.getTotalDuration(userId, startDate, endDate);
    const byTask = this.repo.getDurationByTask(userId, startDate, endDate);

    // Calculate average daily minutes
    const startMs = new Date(startDate).getTime();
    const endMs = new Date(endDate).getTime();
    const days = Math.max(1, Math.ceil((endMs - startMs) / (1000 * 60 * 60 * 24)));
    const averageDailyMinutes = Math.round(totalMinutes / days);

    return {
      totalMinutes,
      byTask,
      averageDailyMinutes,
    };
  }
}
