import { BaseRepository } from './base.repository';
import type { SearchSession } from '@/lib/types';

export class SearchSessionRepository extends BaseRepository<SearchSession> {
  constructor() {
    super('search_sessions');
  }

  findByUserId(userId: string, limit: number = 10): SearchSession[] {
    return this.query<SearchSession>(
      `SELECT * FROM search_sessions WHERE user_id = ? ORDER BY created_at DESC LIMIT ?`,
      [userId, limit]
    );
  }

  findLatest(userId: string): SearchSession | undefined {
    return this.queryOne<SearchSession>(
      `SELECT * FROM search_sessions WHERE user_id = ? ORDER BY created_at DESC LIMIT 1`,
      [userId]
    );
  }
}
