import { BaseRepository } from './base.repository';
import type { MentalHealthCheckIn, JournalEntry, MoodRating, EnergyLevel, StressLevel } from '@/lib/types';
import type { DateRange } from '@/lib/types';
import { getNow } from '@/lib/utils/dates';
import { generateId } from '@/lib/utils/id';

export interface MentalHealthAverages {
  avgMood: number;
  avgEnergy: number;
  avgStress: number;
  count: number;
}

export interface FindJournalOptions {
  search?: string;
  mood?: MoodRating;
  limit?: number;
  offset?: number;
}

export interface CreateCheckInData {
  userId: string;
  date: string;
  moodRating: MoodRating;
  energyLevel: EnergyLevel;
  stressLevel: StressLevel;
  sleepHours?: number | null;
  notes?: string | null;
  tags?: string[];
}

export interface CreateJournalEntryData {
  userId: string;
  title?: string | null;
  content: string;
  tags?: string[];
  mood?: MoodRating | null;
}

export class MentalHealthRepository extends BaseRepository<MentalHealthCheckIn> {
  constructor() {
    super('mental_health_check_ins');
  }

  /**
   * Find check-ins for a user within a date range.
   */
  findCheckInsByUserId(userId: string, dateRange?: DateRange): MentalHealthCheckIn[] {
    const clauses: string[] = ['user_id = ?'];
    const params: unknown[] = [userId];

    if (dateRange) {
      clauses.push('date >= ? AND date <= ?');
      params.push(dateRange.start, dateRange.end);
    }

    const sql = `
      SELECT * FROM mental_health_check_ins
      WHERE ${clauses.join(' AND ')}
      ORDER BY date DESC
    `;
    return this.query<MentalHealthCheckIn>(sql, params);
  }

  /**
   * Find a check-in for a specific date.
   */
  findCheckInByDate(userId: string, date: string): MentalHealthCheckIn | undefined {
    const sql = `
      SELECT * FROM mental_health_check_ins
      WHERE user_id = ? AND DATE(date) = DATE(?)
      LIMIT 1
    `;
    return this.queryOne<MentalHealthCheckIn>(sql, [userId, date]);
  }

  /**
   * Create a new mental health check-in.
   */
  createCheckIn(data: CreateCheckInData): MentalHealthCheckIn {
    const now = getNow();
    const id = generateId();
    const tags = JSON.stringify(data.tags ?? []);
    const metadata = JSON.stringify({});

    this.execute(
      `INSERT INTO mental_health_check_ins
         (id, user_id, date, mood_rating, energy_level, stress_level, sleep_hours, notes, tags, metadata, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        data.userId,
        data.date,
        data.moodRating,
        data.energyLevel,
        data.stressLevel,
        data.sleepHours ?? null,
        data.notes ?? null,
        tags,
        metadata,
        now,
      ]
    );

    return this.findById(id) as MentalHealthCheckIn;
  }

  /**
   * Find journal entries for a user with optional filters.
   */
  findJournalEntries(userId: string, options: FindJournalOptions = {}): JournalEntry[] {
    const { search, mood, limit, offset } = options;
    const clauses: string[] = ['user_id = ?'];
    const params: unknown[] = [userId];

    if (search) {
      clauses.push('(title LIKE ? OR content LIKE ?)');
      const pattern = `%${search}%`;
      params.push(pattern, pattern);
    }

    if (mood !== undefined) {
      clauses.push('mood = ?');
      params.push(mood);
    }

    let sql = `
      SELECT * FROM journal_entries
      WHERE ${clauses.join(' AND ')}
      ORDER BY created_at DESC
    `;

    if (limit !== undefined) {
      sql += ' LIMIT ?';
      params.push(limit);
    }
    if (offset !== undefined) {
      sql += ' OFFSET ?';
      params.push(offset);
    }

    return this.query<JournalEntry>(sql, params);
  }

  /**
   * Create a new journal entry.
   */
  createJournalEntry(data: CreateJournalEntryData): JournalEntry {
    const now = getNow();
    const id = generateId();
    const tags = JSON.stringify(data.tags ?? []);
    const metadata = JSON.stringify({});

    this.execute(
      `INSERT INTO journal_entries
         (id, user_id, title, content, tags, mood, metadata, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        data.userId,
        data.title ?? null,
        data.content,
        tags,
        data.mood ?? null,
        metadata,
        now,
        now,
      ]
    );

    return this.queryOne<JournalEntry>(
      'SELECT * FROM journal_entries WHERE id = ?',
      [id]
    ) as JournalEntry;
  }

  /**
   * Find a single journal entry by id.
   */
  findJournalEntryById(id: string): JournalEntry | undefined {
    return this.queryOne<JournalEntry>(
      'SELECT * FROM journal_entries WHERE id = ?',
      [id]
    );
  }

  /**
   * Get average mood, energy, and stress for a user within a date range.
   */
  getAverages(userId: string, dateRange?: DateRange): MentalHealthAverages {
    const clauses: string[] = ['user_id = ?'];
    const params: unknown[] = [userId];

    if (dateRange) {
      clauses.push('date >= ? AND date <= ?');
      params.push(dateRange.start, dateRange.end);
    }

    const sql = `
      SELECT
        COALESCE(AVG(mood_rating), 0) AS avg_mood,
        COALESCE(AVG(energy_level), 0) AS avg_energy,
        COALESCE(AVG(stress_level), 0) AS avg_stress,
        COUNT(*) AS count
      FROM mental_health_check_ins
      WHERE ${clauses.join(' AND ')}
    `;

    const row = this.db.prepare(sql).get(...params) as {
      avg_mood: number;
      avg_energy: number;
      avg_stress: number;
      count: number;
    };

    return {
      avgMood: Math.round(row.avg_mood * 100) / 100,
      avgEnergy: Math.round(row.avg_energy * 100) / 100,
      avgStress: Math.round(row.avg_stress * 100) / 100,
      count: row.count,
    };
  }
}
