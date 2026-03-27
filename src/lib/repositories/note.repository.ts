import { BaseRepository } from './base.repository';
import type { Note } from '@/lib/types';

export interface FindNotesOptions {
  search?: string;
  pinned?: boolean;
  limit?: number;
  offset?: number;
}

export class NoteRepository extends BaseRepository<Note> {
  constructor() {
    super('notes');
  }

  findByUserId(userId: string, options: FindNotesOptions = {}): Note[] {
    const { search, pinned, limit, offset } = options;
    const clauses: string[] = ['user_id = ?'];
    const params: unknown[] = [userId];

    if (pinned !== undefined) {
      clauses.push('is_pinned = ?');
      params.push(pinned ? 1 : 0);
    }

    if (search) {
      clauses.push('(title LIKE ? OR content LIKE ?)');
      const pattern = `%${search}%`;
      params.push(pattern, pattern);
    }

    let sql = `
      SELECT * FROM notes
      WHERE ${clauses.join(' AND ')}
      ORDER BY is_pinned DESC, created_at DESC
    `;

    if (limit !== undefined) {
      sql += ` LIMIT ?`;
      params.push(limit);
    }
    if (offset !== undefined) {
      sql += ` OFFSET ?`;
      params.push(offset);
    }

    return this.query<Note>(sql, params);
  }
}
