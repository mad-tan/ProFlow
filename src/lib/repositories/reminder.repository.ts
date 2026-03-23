import { BaseRepository } from './base.repository';
import type { Reminder } from '@/lib/types';
import { getNow } from '@/lib/utils/dates';

export interface FindRemindersOptions {
  upcoming?: boolean;
  dismissed?: boolean;
}

export class ReminderRepository extends BaseRepository<Reminder> {
  constructor() {
    super('reminders');
  }

  /**
   * Find reminders for a user with optional filters.
   */
  findByUserId(userId: string, options: FindRemindersOptions = {}): Reminder[] {
    const { upcoming, dismissed } = options;
    const clauses: string[] = ['user_id = ?'];
    const params: unknown[] = [userId];

    if (upcoming) {
      const now = getNow();
      clauses.push('remind_at >= ?');
      params.push(now);
    }

    if (dismissed !== undefined) {
      clauses.push('is_active = ?');
      // is_active is the inverse of dismissed in the schema
      params.push(dismissed ? 0 : 1);
    }

    const sql = `
      SELECT * FROM reminders
      WHERE ${clauses.join(' AND ')}
      ORDER BY remind_at ASC
    `;

    return this.query<Reminder>(sql, params);
  }

  /**
   * Find reminders that are due (remind_at <= now and still active).
   */
  findDue(userId: string): Reminder[] {
    const now = getNow();
    const sql = `
      SELECT * FROM reminders
      WHERE user_id = ?
        AND remind_at <= ?
        AND is_active = 1
      ORDER BY remind_at ASC
    `;
    return this.query<Reminder>(sql, [userId, now]);
  }

  /**
   * Dismiss a reminder by marking it as inactive.
   */
  dismiss(id: string): Reminder {
    const now = getNow();
    this.execute(
      `UPDATE reminders SET is_active = 0, last_triggered_at = ?, updated_at = ? WHERE id = ?`,
      [now, now, id]
    );
    return this.findById(id) as Reminder;
  }
}
