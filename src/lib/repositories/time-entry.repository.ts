import { BaseRepository } from './base.repository';
import type { TimeEntry } from '@/lib/types';
import { getNow } from '@/lib/utils/dates';
import { generateId } from '@/lib/utils/id';

export interface FindTimeEntriesOptions {
  startDate?: string;
  endDate?: string;
  taskId?: string;
}

export interface DurationByTask {
  taskId: string | null;
  taskTitle: string | null;
  totalMinutes: number;
}

export class TimeEntryRepository extends BaseRepository<TimeEntry> {
  constructor() {
    super('time_entries');
  }

  /**
   * Find time entries for a user with optional date range and task filter.
   */
  findByUserId(userId: string, options: FindTimeEntriesOptions = {}): TimeEntry[] {
    const { startDate, endDate, taskId } = options;
    const clauses: string[] = ['te.user_id = ?'];
    const params: unknown[] = [userId];

    if (startDate) {
      clauses.push('te.start_time >= ?');
      params.push(startDate);
    }

    if (endDate) {
      clauses.push('te.start_time <= ?');
      params.push(endDate);
    }

    if (taskId) {
      clauses.push('te.task_id = ?');
      params.push(taskId);
    }

    const sql = `
      SELECT te.*
      FROM time_entries te
      WHERE ${clauses.join(' AND ')}
      ORDER BY te.start_time DESC
    `;

    return this.query<TimeEntry>(sql, params);
  }

  /**
   * Find the currently active (running) timer for a user.
   */
  findActive(userId: string): TimeEntry | undefined {
    const sql = `
      SELECT * FROM time_entries
      WHERE user_id = ? AND end_time IS NULL
      ORDER BY start_time DESC
      LIMIT 1
    `;
    return this.queryOne<TimeEntry>(sql, [userId]);
  }

  /**
   * Start a new timer for a user.
   */
  startTimer(userId: string, taskId?: string, description?: string): TimeEntry {
    const now = getNow();
    const id = generateId();

    this.execute(
      `INSERT INTO time_entries (id, user_id, task_id, description, start_time, end_time, duration_minutes, metadata, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, NULL, NULL, '{}', ?, ?)`,
      [id, userId, taskId ?? null, description ?? null, now, now, now]
    );

    return this.findById(id) as TimeEntry;
  }

  /**
   * Stop a running timer by setting its end_time and computing duration.
   */
  stopTimer(entryId: string): TimeEntry {
    const entry = this.findById(entryId);
    if (!entry) {
      throw new Error(`TimeEntry '${entryId}' not found`);
    }
    if (entry.endTime !== null) {
      throw new Error(`TimeEntry '${entryId}' is already stopped`);
    }

    const now = getNow();
    const startMs = new Date(entry.startTime).getTime();
    const endMs = new Date(now).getTime();
    const durationMinutes = Math.round((endMs - startMs) / 60000);

    this.execute(
      `UPDATE time_entries SET end_time = ?, duration_minutes = ?, updated_at = ? WHERE id = ?`,
      [now, durationMinutes, now, entryId]
    );

    return this.findById(entryId) as TimeEntry;
  }

  /**
   * Get the total tracked duration (in minutes) for a user within a date range.
   */
  getTotalDuration(userId: string, startDate: string, endDate: string): number {
    const sql = `
      SELECT COALESCE(SUM(duration_minutes), 0) AS total
      FROM time_entries
      WHERE user_id = ?
        AND start_time >= ?
        AND start_time <= ?
        AND duration_minutes IS NOT NULL
    `;
    const row = this.db.prepare(sql).get(userId, startDate, endDate) as { total: number };
    return row.total;
  }

  /**
   * Get duration grouped by task for a user within a date range.
   */
  getDurationByTask(userId: string, startDate: string, endDate: string): DurationByTask[] {
    const sql = `
      SELECT
        te.task_id,
        t.title AS task_title,
        COALESCE(SUM(te.duration_minutes), 0) AS total_minutes
      FROM time_entries te
      LEFT JOIN tasks t ON t.id = te.task_id
      WHERE te.user_id = ?
        AND te.start_time >= ?
        AND te.start_time <= ?
        AND te.duration_minutes IS NOT NULL
      GROUP BY te.task_id
      ORDER BY total_minutes DESC
    `;
    return this.query<DurationByTask>(sql, [userId, startDate, endDate]);
  }
}
