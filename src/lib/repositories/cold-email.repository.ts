import { BaseRepository } from './base.repository';
import type { ColdEmail } from '@/lib/types';

export interface FindColdEmailsOptions {
  status?: string;
  listingId?: string;
  limit?: number;
  offset?: number;
}

export class ColdEmailRepository extends BaseRepository<ColdEmail> {
  constructor() {
    super('cold_emails');
  }

  findByUserId(userId: string, options: FindColdEmailsOptions = {}): ColdEmail[] {
    const { status, listingId, limit, offset } = options;
    const clauses: string[] = ['user_id = ?'];
    const params: unknown[] = [userId];

    if (status) {
      clauses.push('status = ?');
      params.push(status);
    }

    if (listingId) {
      clauses.push('listing_id = ?');
      params.push(listingId);
    }

    let sql = `
      SELECT * FROM cold_emails
      WHERE ${clauses.join(' AND ')}
      ORDER BY created_at DESC
    `;

    if (limit !== undefined) {
      sql += ` LIMIT ?`;
      params.push(limit);
    }
    if (offset !== undefined) {
      sql += ` OFFSET ?`;
      params.push(offset);
    }

    return this.query<ColdEmail>(sql, params);
  }
}
