import { BaseRepository } from './base.repository';
import type { Resume } from '@/lib/types';

export class ResumeRepository extends BaseRepository<Resume> {
  constructor() {
    super('resumes');
  }

  findByUserId(userId: string): Resume | undefined {
    const results = this.query<Resume>(
      `SELECT * FROM resumes WHERE user_id = ? ORDER BY created_at DESC LIMIT 1`,
      [userId]
    );
    return results[0];
  }

  findAllByUserId(userId: string): Resume[] {
    return this.query<Resume>(
      `SELECT * FROM resumes WHERE user_id = ? ORDER BY created_at DESC`,
      [userId]
    );
  }
}
