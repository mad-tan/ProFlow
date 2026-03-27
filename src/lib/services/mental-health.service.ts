import {
  MentalHealthRepository,
  type CreateCheckInData,
  type CreateJournalEntryData,
  type FindJournalOptions,
  type MentalHealthAverages,
} from '@/lib/repositories/mental-health.repository';
import { AuditLogRepository } from '@/lib/repositories/audit-log.repository';
import { NotFoundError } from '@/lib/utils/errors';
import type { MentalHealthCheckIn, JournalEntry, DateRange } from '@/lib/types';

export interface BurnoutIndicators {
  isAtRisk: boolean;
  riskLevel: 'low' | 'moderate' | 'high';
  factors: string[];
  averages: MentalHealthAverages;
}

export class MentalHealthService {
  private repo = new MentalHealthRepository();
  private auditLog = new AuditLogRepository();

  // ─── Check-ins ──────────────────────────────────────────────────────────

  /**
   * Get check-ins for a user, optionally within a date range.
   */
  getCheckIns(userId: string, dateRange?: DateRange): MentalHealthCheckIn[] {
    return this.repo.findCheckInsByUserId(userId, dateRange);
  }

  /**
   * Get a check-in for a specific date.
   */
  getCheckInByDate(userId: string, date: string): MentalHealthCheckIn | undefined {
    return this.repo.findCheckInByDate(userId, date);
  }

  /**
   * Create a new check-in. Multiple check-ins per day are allowed.
   */
  createCheckIn(data: CreateCheckInData): MentalHealthCheckIn {
    const checkIn = this.repo.createCheckIn(data);

    this.auditLog.log(data.userId, 'mental_health_check_in', checkIn.id, 'create', {
      date: data.date,
      moodRating: data.moodRating,
      energyLevel: data.energyLevel,
      stressLevel: data.stressLevel,
    });

    return checkIn;
  }

  /**
   * Update an existing check-in.
   */
  updateCheckIn(
    id: string,
    data: Partial<Pick<MentalHealthCheckIn, 'moodRating' | 'energyLevel' | 'stressLevel' | 'sleepHours' | 'notes' | 'tags'>>
  ): MentalHealthCheckIn {
    const existing = this.repo.findById(id);
    if (!existing) throw new NotFoundError('MentalHealthCheckIn', id);

    const sets: string[] = [];
    const params: unknown[] = [];

    if (data.moodRating !== undefined) {
      sets.push('mood_rating = ?');
      params.push(data.moodRating);
    }
    if (data.energyLevel !== undefined) {
      sets.push('energy_level = ?');
      params.push(data.energyLevel);
    }
    if (data.stressLevel !== undefined) {
      sets.push('stress_level = ?');
      params.push(data.stressLevel);
    }
    if (data.sleepHours !== undefined) {
      sets.push('sleep_hours = ?');
      params.push(data.sleepHours);
    }
    if (data.notes !== undefined) {
      sets.push('notes = ?');
      params.push(data.notes);
    }
    if (data.tags !== undefined) {
      sets.push('tags = ?');
      params.push(JSON.stringify(data.tags));
    }

    if (sets.length > 0) {
      params.push(id);
      this.repo['execute'](
        `UPDATE mental_health_check_ins SET ${sets.join(', ')} WHERE id = ?`,
        params
      );
    }

    return this.repo.findById(id) as MentalHealthCheckIn;
  }

  // ─── Journal Entries ────────────────────────────────────────────────────

  /**
   * List journal entries for a user.
   */
  getJournalEntries(userId: string, options?: FindJournalOptions): JournalEntry[] {
    return this.repo.findJournalEntries(userId, options);
  }

  /**
   * Get a single journal entry by id.
   */
  getJournalEntryById(id: string): JournalEntry {
    const entry = this.repo.findJournalEntryById(id);
    if (!entry) throw new NotFoundError('JournalEntry', id);
    return entry;
  }

  /**
   * Create a new journal entry.
   */
  createJournalEntry(data: CreateJournalEntryData): JournalEntry {
    const entry = this.repo.createJournalEntry(data);

    this.auditLog.log(data.userId, 'journal_entry', entry.id, 'create', {
      title: entry.title,
    });

    return entry;
  }

  /**
   * Update a journal entry.
   */
  updateJournalEntry(
    id: string,
    userId: string,
    data: Partial<Pick<JournalEntry, 'title' | 'content' | 'mood' | 'tags'>>
  ): JournalEntry {
    const existing = this.getJournalEntryById(id);

    // Use the base repo's execute to update the journal_entries table directly
    const sets: string[] = ['updated_at = ?'];
    const params: unknown[] = [new Date().toISOString()];

    if (data.title !== undefined) {
      sets.push('title = ?');
      params.push(data.title);
    }
    if (data.content !== undefined) {
      sets.push('content = ?');
      params.push(data.content);
    }
    if (data.mood !== undefined) {
      sets.push('mood = ?');
      params.push(data.mood);
    }
    if (data.tags !== undefined) {
      sets.push('tags = ?');
      params.push(JSON.stringify(data.tags));
    }

    params.push(id);
    this.repo['execute'](
      `UPDATE journal_entries SET ${sets.join(', ')} WHERE id = ?`,
      params
    );

    const changes: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      if ((existing as unknown as Record<string, unknown>)[key] !== value) {
        changes[key] = { from: (existing as unknown as Record<string, unknown>)[key], to: value };
      }
    }

    this.auditLog.log(userId, 'journal_entry', id, 'update', changes);

    return this.getJournalEntryById(id);
  }

  /**
   * Delete a journal entry.
   */
  deleteJournalEntry(id: string, userId: string): boolean {
    this.getJournalEntryById(id);
    const result = this.repo['execute'](
      'DELETE FROM journal_entries WHERE id = ?',
      [id]
    );
    const deleted = result.changes > 0;
    if (deleted) {
      this.auditLog.log(userId, 'journal_entry', id, 'delete');
    }
    return deleted;
  }

  // ─── Averages & Burnout ─────────────────────────────────────────────────

  /**
   * Get averaged mood/energy/stress over a date range.
   */
  getAverages(userId: string, dateRange?: DateRange): MentalHealthAverages {
    return this.repo.getAverages(userId, dateRange);
  }

  /**
   * Calculate burnout risk indicators based on recent check-in data.
   * Uses the last 14 days of check-ins.
   */
  calculateBurnoutRisk(userId: string): BurnoutIndicators {
    const now = new Date();
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const dateRange: DateRange = {
      start: twoWeeksAgo.toISOString(),
      end: now.toISOString(),
    };

    const averages = this.repo.getAverages(userId, dateRange);
    const factors: string[] = [];

    // Evaluate risk factors
    if (averages.avgMood <= 2) {
      factors.push('Consistently low mood');
    }
    if (averages.avgEnergy <= 2) {
      factors.push('Consistently low energy');
    }
    if (averages.avgStress >= 4) {
      factors.push('Consistently high stress');
    }
    if (averages.count < 3) {
      factors.push('Infrequent check-ins (may indicate disengagement)');
    }

    // Determine risk level
    let riskLevel: 'low' | 'moderate' | 'high' = 'low';
    if (factors.length >= 3) {
      riskLevel = 'high';
    } else if (factors.length >= 1) {
      riskLevel = 'moderate';
    }

    return {
      isAtRisk: riskLevel !== 'low',
      riskLevel,
      factors,
      averages,
    };
  }
}
