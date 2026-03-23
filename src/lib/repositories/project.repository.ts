import { BaseRepository } from './base.repository';
import type { Project } from '@/lib/types';
import { getNow } from '@/lib/utils/dates';

export interface ProjectWithTaskCount extends Project {
  taskCount: number;
  completedTaskCount: number;
}

export interface FindProjectsOptions {
  status?: string;
  search?: string;
  includeArchived?: boolean;
}

export class ProjectRepository extends BaseRepository<Project> {
  constructor() {
    super('projects');
  }

  /**
   * Find all projects belonging to a user, with optional filters.
   */
  findByUserId(userId: string, options: FindProjectsOptions = {}): Project[] {
    const { status, search, includeArchived = false } = options;
    const clauses: string[] = ['p.user_id = ?'];
    const params: unknown[] = [userId];

    if (!includeArchived) {
      clauses.push("p.status != 'archived'");
    }

    if (status) {
      clauses.push('p.status = ?');
      params.push(status);
    }

    if (search) {
      clauses.push('(p.name LIKE ? OR p.description LIKE ?)');
      const pattern = `%${search}%`;
      params.push(pattern, pattern);
    }

    const sql = `
      SELECT p.*
      FROM projects p
      WHERE ${clauses.join(' AND ')}
      ORDER BY p.sort_order ASC, p.created_at DESC
    `;

    return this.query<Project>(sql, params);
  }

  /**
   * Archive a project by setting its status to 'archived'.
   */
  archive(id: string): Project {
    const now = getNow();
    this.execute(
      `UPDATE projects SET status = 'archived', updated_at = ? WHERE id = ?`,
      [now, id]
    );
    return this.findById(id) as Project;
  }

  /**
   * Unarchive a project by setting its status back to 'active'.
   */
  unarchive(id: string): Project {
    const now = getNow();
    this.execute(
      `UPDATE projects SET status = 'active', updated_at = ? WHERE id = ?`,
      [now, id]
    );
    return this.findById(id) as Project;
  }

  /**
   * Get a project along with its total and completed task counts.
   */
  getWithTaskCount(id: string): ProjectWithTaskCount | undefined {
    const sql = `
      SELECT
        p.*,
        COALESCE(COUNT(t.id), 0) AS task_count,
        COALESCE(SUM(CASE WHEN t.status = 'done' THEN 1 ELSE 0 END), 0) AS completed_task_count
      FROM projects p
      LEFT JOIN tasks t ON t.project_id = p.id
      WHERE p.id = ?
      GROUP BY p.id
    `;
    return this.queryOne<ProjectWithTaskCount>(sql, [id]);
  }
}
