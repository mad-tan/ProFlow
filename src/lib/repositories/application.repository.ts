import { BaseRepository } from './base.repository';
import type { Application } from '@/lib/types';

export interface FindApplicationsOptions {
  status?: string;
  listingId?: string;
  limit?: number;
  offset?: number;
}

export class ApplicationRepository extends BaseRepository<Application> {
  constructor() {
    super('applications');
  }

  findByUserId(userId: string, options: FindApplicationsOptions = {}): Application[] {
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
      SELECT * FROM applications
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

    return this.query<Application>(sql, params);
  }

  findByListingId(userId: string, listingId: string): Application[] {
    return this.query<Application>(
      `SELECT * FROM applications WHERE user_id = ? AND listing_id = ? ORDER BY created_at DESC`,
      [userId, listingId]
    );
  }

  countByStatus(userId: string): Record<string, number> {
    const rows = this.query<{ status: string; count: number }>(
      `SELECT status, COUNT(*) as count FROM applications WHERE user_id = ? GROUP BY status`,
      [userId]
    );
    const result: Record<string, number> = {};
    for (const row of rows) {
      result[row.status] = row.count;
    }
    return result;
  }
}
