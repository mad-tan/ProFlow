import { BaseRepository } from './base.repository';
import type { LinkedInOutreach } from '@/lib/types';

export interface FindLinkedInOutreachesOptions {
  status?: string;
  listingId?: string;
  limit?: number;
  offset?: number;
}

export class LinkedInOutreachRepository extends BaseRepository<LinkedInOutreach> {
  constructor() {
    super('linkedin_outreaches');
  }

  findByUserId(userId: string, options: FindLinkedInOutreachesOptions = {}): LinkedInOutreach[] {
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
      SELECT * FROM linkedin_outreaches
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

    return this.query<LinkedInOutreach>(sql, params);
  }
}
