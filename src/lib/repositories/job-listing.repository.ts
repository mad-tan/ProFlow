import { BaseRepository } from './base.repository';
import type { JobListing } from '@/lib/types';

export interface FindJobListingsOptions {
  search?: string;
  status?: string;
  source?: string;
  limit?: number;
  offset?: number;
}

export class JobListingRepository extends BaseRepository<JobListing> {
  constructor() {
    super('job_listings');
  }

  findByUserId(userId: string, options: FindJobListingsOptions = {}): JobListing[] {
    const { search, status, source, limit, offset } = options;
    const clauses: string[] = ['user_id = ?'];
    const params: unknown[] = [userId];

    if (status) {
      clauses.push('status = ?');
      params.push(status);
    }

    if (source) {
      clauses.push('source = ?');
      params.push(source);
    }

    if (search) {
      clauses.push('(title LIKE ? OR company LIKE ? OR description LIKE ?)');
      const pattern = `%${search}%`;
      params.push(pattern, pattern, pattern);
    }

    let sql = `
      SELECT * FROM job_listings
      WHERE ${clauses.join(' AND ')}
      ORDER BY score DESC NULLS LAST, created_at DESC
    `;

    if (limit !== undefined) {
      sql += ` LIMIT ?`;
      params.push(limit);
    }
    if (offset !== undefined) {
      sql += ` OFFSET ?`;
      params.push(offset);
    }

    return this.query<JobListing>(sql, params);
  }

  countByStatus(userId: string): Record<string, number> {
    const rows = this.query<{ status: string; count: number }>(
      `SELECT status, COUNT(*) as count FROM job_listings WHERE user_id = ? GROUP BY status`,
      [userId]
    );
    const result: Record<string, number> = {};
    for (const row of rows) {
      result[row.status] = row.count;
    }
    return result;
  }
}
